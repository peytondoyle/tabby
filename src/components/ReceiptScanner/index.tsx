import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { parseReceipt, parseMultipleReceipts } from '@/lib/receiptScanning'
import type { ParseResult } from '@/lib/receiptScanning'
import { logServer } from '@/lib/errorLogger'
import { testIds } from '@/lib/testIds'

export type { ParseResult }

interface ReceiptScannerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onParsed: (result: ParseResult) => void
  externalError?: string
}

export const ReceiptScanner: React.FC<ReceiptScannerProps> = ({
  open,
  onOpenChange,
  onParsed,
  externalError
}) => {
  const [state, setState] = useState<'idle' | 'selecting' | 'analyzing' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | undefined>()
  const [currentStep, setCurrentStep] = useState<string>('')
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [scanProgress, setScanProgress] = useState({ current: 0, total: 0 })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Handle external errors (from bill creation)
  React.useEffect(() => {
    if (externalError) {
      setErrorMessage(externalError)
      setState('error')
    }
  }, [externalError])


  // Add paste handler for files
  React.useEffect(() => {
    if (!open) return

    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      for (const item of items) {
        if (item.kind === 'file') {
          const file = item.getAsFile()
          if (file) {
            console.log('[Paste] File pasted:', file.name, file.type)
            await processFile(file)
            break
          }
        }
      }
    }

    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [open])

  // Cleanup AbortController when component unmounts or modal closes
  React.useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  const onClose = () => {
    // Abort any ongoing scan when modal closes
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    onOpenChange(false)
  }

  // Add files to the selection (for multi-image support)
  const addFiles = (files: File[]) => {
    const validFiles = files.filter(file => {
      const isImage = file.type.startsWith('image/') || file.name.match(/\.(jpg|jpeg|png|gif|webp|heic|heif)$/i)
      const isPDF = file.type === 'application/pdf' || file.name.match(/\.pdf$/i)
      const isValidSize = file.size <= 10 * 1024 * 1024
      return (isImage || isPDF) && isValidSize
    })

    if (validFiles.length === 0) return

    // Limit to 5 files total
    setSelectedFiles(prev => [...prev, ...validFiles].slice(0, 5))
    setState('selecting')
  }

  // Remove a file from selection
  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
    if (selectedFiles.length <= 1) {
      setState('idle')
    }
  }

  // Start scanning all selected files
  const startScan = async () => {
    if (selectedFiles.length === 0) return

    setErrorMessage(undefined)
    setCurrentStep('')
    setScanProgress({ current: 0, total: selectedFiles.length })

    try {
      abortControllerRef.current = new AbortController()
      setState('analyzing')

      const parseResult = await parseMultipleReceipts(
        selectedFiles,
        (step, current, total) => {
          setCurrentStep(step)
          setScanProgress({ current, total })
        },
        abortControllerRef.current.signal
      )

      console.log('[scan_success]', { items_count: parseResult.items.length, total: parseResult.total, files: selectedFiles.length })
      onParsed(parseResult)
      setSelectedFiles([])
      onClose()
    } catch (err) {
      handleScanError(err)
    }
  }

  const processFile = async (file: File) => {
    console.log('[scan_start]', { file_name: file.name, file_size: file.size, file_type: file.type })

    // Validate file type (images and PDFs) - be more lenient
    const isImage = file.type.startsWith('image/') || file.name.match(/\.(jpg|jpeg|png|gif|webp|heic|heif)$/i)
    const isPDF = file.type === 'application/pdf' || file.name.match(/\.pdf$/i)

    if (!isImage && !isPDF) {
      setErrorMessage('Please select an image or PDF file')
      setState('error')
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('File size must be less than 10MB')
      setState('error')
      return
    }

    setErrorMessage(undefined)
    setCurrentStep('')

    try {
      // Create new AbortController for this scan
      abortControllerRef.current = new AbortController()

      // Analyzing - parse the receipt with progress callback and AbortSignal
      setState('analyzing')
      const parseResult = await parseReceipt(file, (step) => {
        setCurrentStep(step)
      }, abortControllerRef.current.signal)

      console.log('[scan_success]', { items_count: parseResult.items.length, total: parseResult.total })
      onParsed(parseResult)
      onClose()
    } catch (err) {
      handleScanError(err)
    }
  }

  const handleScanError = (err: unknown) => {
    // Don't show error if scan was aborted (user closed modal)
    if (err instanceof Error && err.name === 'AbortError') {
      console.log('[scan_aborted] Scan was cancelled by user')
      return
    }

    // Check if it's a specific error message from the API
    const errorMsg = err instanceof Error ? err.message : 'Failed to scan receipt. Please try again.'

    // Show specific error message for common issues
    if (errorMsg.includes('No items found') || errorMsg.includes('Invalid response format')) {
      setErrorMessage('Couldn\'t read that receipt—try a clearer photo or type it in')
    } else if (errorMsg.includes('API_OFFLINE')) {
      setErrorMessage('Service temporarily unavailable. Please try again later.')
    } else if (errorMsg.includes('Request timeout exceeded')) {
      setErrorMessage('Scan timed out. Please try with a smaller image.')
    } else if (errorMsg.includes('Unsupported image format') || errorMsg.includes('corrupted file')) {
      setErrorMessage('This image format isn\'t supported. Please try a JPG or PNG file instead.')
    } else if (errorMsg.includes('Worker error')) {
      setErrorMessage('Image processing failed. Please try a different image format.')
    } else {
      setErrorMessage(errorMsg)
    }

    setState('error')
    console.error('[scan_api_error]', err)
    console.error('Receipt scanning error:', err)
    logServer('error', 'Receipt scanning failed', { error: err, context: 'ReceiptScanner' })
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    // If single file and no files already selected, scan immediately
    if (files.length === 1 && selectedFiles.length === 0) {
      await processFile(files[0])
    } else {
      // Multi-file: add to selection
      addFiles(files)
    }

    // Reset the input
    if (e.target) e.target.value = ''
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length === 0) return

    // If single file and no files already selected, scan immediately
    if (files.length === 1 && selectedFiles.length === 0) {
      await processFile(files[0])
    } else {
      // Multi-file: add to selection
      addFiles(files)
    }
  }

  const handleRetry = () => {
    setState('idle')
    setSelectedFiles([])
    setErrorMessage(undefined)
    setCurrentStep('')
    fileInputRef.current?.click()
  }

  const handleManualEntry = () => {
    // Close the scanner and let the parent handle manual entry
    onClose()
    // You might want to emit an event or call a callback here for manual entry
  }

  const handleAddMore = () => {
    fileInputRef.current?.click()
  }

  const handleClearFiles = () => {
    setSelectedFiles([])
    setState('idle')
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="fixed inset-0 z-50 bg-black/70 grid place-items-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="w-full max-w-md max-h-[90vh] overflow-y-auto border-2 mx-auto"
            style={{background: 'var(--ui-panel)', color: 'var(--ui-text)', borderRadius: 'var(--ui-radius)', border: '2px solid var(--ui-border)', boxShadow: 'var(--ui-elev-shadow)'}}
            onClick={(e) => e.stopPropagation()}
            data-testid={testIds.receiptScannerModal}
          >
            {/* Header */}
            <div className="p-6 border-b-2 border-border bg-surface">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold retro-text-shadow">📷 Scan Receipt</h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-line rounded-full transition-opacity duration-150 ease-out hover:opacity-75 motion-reduce:transition-none pixel-perfect"
                  data-testid={testIds.closeModalButton}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">


              {/* Analyzing State */}
              {state === 'analyzing' && (
                <div className="text-center py-12">
                  {/* Show instant success if cached */}
                  {currentStep === 'Loaded from cache!' ? (
                    <>
                      <div className="text-6xl mb-8">
                        ⚡
                      </div>
                      <h3 className="text-2xl font-bold mb-2 text-green-400">Loaded from Cache!</h3>
                      <p className="text-text-primary-dim mb-8">
                        Found previous scan result - instant load
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="text-6xl mb-8">
                        🔍
                      </div>

                      <h3 className="text-2xl font-bold mb-2">
                        {scanProgress.total > 1 ? `Analyzing ${scanProgress.current}/${scanProgress.total} Images` : 'Analyzing Receipt'}
                      </h3>
                      <p className="text-text-primary-dim mb-8">
                        {currentStep?.includes('Scanning image') && currentStep}
                        {currentStep === 'Merging results...' && 'Combining all items...'}
                        {currentStep === 'Selecting…' && 'Checking file...'}
                        {currentStep === 'Converting PDF…' && 'Converting PDF to image...'}
                        {currentStep === 'Normalizing…' && 'Optimizing image for AI...'}
                        {currentStep === 'Analyzing…' && 'AI reading receipt...'}
                        {currentStep === 'Mapping…' && 'Extracting items and prices...'}
                        {!currentStep && 'Processing your receipt...'}
                      </p>

                      {/* Multi-image progress bar */}
                      {scanProgress.total > 1 && (
                        <div className="w-full bg-gray-700 rounded-full h-2 mb-4">
                          <div
                            className="bg-brand h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(scanProgress.current / scanProgress.total) * 100}%` }}
                          />
                        </div>
                      )}

                      {/* Loading indicator */}
                      <motion.div
                        className="w-16 h-16 border-4 border-brand border-t-transparent rounded-full mx-auto mb-8"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      />
                    </>
                  )}

                  {/* Progress steps */}
                  <div className="space-y-3 max-w-md mx-auto">
                    {['Selecting…', 'Normalizing…', 'Analyzing…', 'Mapping…'].map((step, index) => {
                      const steps = ['Selecting…', 'Normalizing…', 'Analyzing…', 'Mapping…']
                      const currentIndex = steps.indexOf(currentStep)
                      const stepIndex = index
                      const isComplete = stepIndex < currentIndex || currentStep === 'Loaded from cache!'
                      const isActive = stepIndex === currentIndex && currentStep !== 'Loaded from cache!'
                      const isPending = stepIndex > currentIndex && currentStep !== 'Loaded from cache!'

                      const stepDescriptions: Record<string, string> = {
                        'Selecting…': 'Validating file',
                        'Normalizing…': 'Optimizing image (1024px, JPEG)',
                        'Analyzing…': 'AI reading receipt (GPT-4o-mini)',
                        'Mapping…': 'Extracting items & prices'
                      }

                      return (
                        <div key={step} className="flex items-center gap-3 text-left">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm transition-all ${
                            isComplete ? 'bg-green-600 text-white' :
                            isActive ? 'bg-blue-600 text-white' :
                            'bg-gray-700 text-gray-400'
                          }`}>
                            {isComplete ? (
                              '✓'
                            ) : isActive ? (
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                className="w-3 h-3 border-2 border-white border-t-transparent rounded-full"
                              />
                            ) : (
                              <span className="text-xs">{index + 1}</span>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className={`transition-colors ${
                              isComplete ? 'text-gray-400' :
                              isActive ? 'text-white font-medium' :
                              'text-gray-500'
                            }`}>
                              {step.replace('…', '')}
                            </div>
                            <div className="text-xs text-gray-500">
                              {stepDescriptions[step]}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* File Selection State - Multiple images ready to scan */}
              {state === 'selecting' && selectedFiles.length > 0 && (
                <div className="text-center">
                  <div className="mb-4">
                    <h3 className="text-xl font-bold mb-2">📸 {selectedFiles.length} Image{selectedFiles.length > 1 ? 's' : ''} Selected</h3>
                    <p className="text-text-primary-dim text-sm">
                      {selectedFiles.length > 1 ? 'Long receipt? We\'ll merge all images automatically!' : 'Ready to scan'}
                    </p>
                  </div>

                  {/* Thumbnail Grid */}
                  <div className="grid grid-cols-3 gap-2 mb-4 max-h-48 overflow-y-auto p-2 bg-white/5 rounded-lg">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Receipt ${index + 1}`}
                          className="w-full h-20 object-cover rounded-lg border border-white/20"
                        />
                        <button
                          onClick={() => removeFile(index)}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        >
                          ×
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-1 rounded-b-lg truncate">
                          {index + 1}. {file.name.substring(0, 15)}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={startScan}
                      className="w-full bg-brand hover:bg-brand/90 text-white px-8 py-3 rounded-xl font-bold transition-all duration-200"
                    >
                      🔍 Scan {selectedFiles.length > 1 ? `All ${selectedFiles.length} Images` : 'Receipt'}
                    </button>

                    <div className="flex gap-2">
                      {selectedFiles.length < 5 && (
                        <button
                          onClick={handleAddMore}
                          className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm transition-all duration-200"
                        >
                          + Add More
                        </button>
                      )}
                      <button
                        onClick={handleClearFiles}
                        className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition-all duration-200"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  <p className="text-text-primary-dim text-xs mt-3">
                    Tip: Add multiple photos for long receipts that don't fit in one image
                  </p>
                </div>
              )}

              {/* Upload State */}
              {state === 'idle' && (
                <div className="text-center">
                  <div
                    className={`border-2 ${isDragging ? 'border-brand bg-brand/10 border-dashed' : 'border-white/14 bg-white/6'} rounded-2xl p-12 mb-6 transition-all duration-200`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <div className="text-6xl mb-4">
                      {isDragging ? '📥' : '📷'}
                    </div>
                    <h3 className="text-xl font-bold mb-2">
                      {isDragging ? 'Drop your file here!' : 'Upload Receipt'}
                    </h3>
                    <p className="text-text-primary-dim mb-4">
                      {isDragging ? 'Release to upload your receipt' : 'AI will automatically extract items and prices'}
                    </p>
                    <div className="flex flex-col gap-3">
                      {!isDragging && (
                        <>
                          {/* Use label wrapper as primary method - works better with Safari */}
                          <label className="bg-brand hover:bg-brand/90 text-white px-8 py-3 rounded-xl font-bold transition-all duration-200 cursor-pointer inline-block">
                            📸 Choose Image or PDF
                            <input
                              type="file"
                              onChange={handleFileSelect}
                              style={{ display: 'none' }}
                            />
                          </label>

                          {/* Fallback button for programmatic click */}
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg text-sm transition-all duration-200"
                          >
                            Alternative: Click Here if Above Doesn't Work
                          </button>

                          <div className="text-sm text-text-primary-dim">
                            Or drag and drop a file here
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-sm text-text-primary-dim space-y-1">
                    <p>Supports: JPG, PNG, WebP, HEIC, HEIF, PDF</p>
                    <p>Max size: 10MB • Multi-page PDFs supported (up to 5 pages)</p>
                    <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                      <p className="text-yellow-400 text-xs">
                        <strong>PDF Selection Issue?</strong> If PDFs are greyed out, try these methods:
                      </p>
                      <ul className="text-yellow-400/80 text-xs mt-1 list-disc list-inside">
                        <li>Drag and drop the PDF file directly onto this window</li>
                        <li>Copy the PDF file (Cmd+C) then paste here (Cmd+V)</li>
                        <li>Use the visible file input below if buttons don't work</li>
                      </ul>

                      {/* Last resort: completely visible file input */}
                      <div className="mt-3 pt-3 border-t border-yellow-500/30">
                        <p className="text-yellow-400 text-xs mb-2">Emergency fallback (if nothing else works):</p>
                        <input
                          type="file"
                          onChange={handleFileSelect}
                          className="text-xs"
                          style={{
                            display: 'block',
                            width: '100%',
                            padding: '4px',
                            background: 'white',
                            color: 'black',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Error State */}
              {state === 'error' && (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">
                    ❌
                  </div>
                  <h3 className="text-xl font-bold mb-2">
                    {externalError ? "Couldn't save your bill" : "Scanning Failed"}
                  </h3>
                  <p className="text-text-primary-dim mb-6">{errorMessage}</p>
                  
                  {/* Action buttons */}
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={handleRetry}
                      className="bg-brand hover:bg-brand/90 text-white px-6 py-3 rounded-xl font-bold transition-all duration-200"
                    >
                      📸 Retake
                    </button>
                    <button
                      onClick={handleManualEntry}
                      className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-xl font-bold transition-all duration-200"
                    >
                      ✏️ Add manually
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Hidden file input using position absolute instead of display none for better Safari compatibility */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,application/pdf"
              onChange={handleFileSelect}
              style={{
                position: 'absolute',
                left: '-9999px',
                opacity: 0.01,
                pointerEvents: 'none'
              }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}