import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { parseReceipt } from '@/lib/receiptScanning'
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
  const [state, setState] = useState<'idle' | 'analyzing' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | undefined>()
  const [currentStep, setCurrentStep] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Handle external errors (from bill creation)
  React.useEffect(() => {
    if (externalError) {
      setErrorMessage(externalError)
      setState('error')
    }
  }, [externalError])

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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    console.log('[scan_start]', { file_name: file.name, file_size: file.size })

    // Validate file type (images and PDFs)
    const isImage = file.type.startsWith('image/')
    const isPDF = file.type === 'application/pdf'

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
      // Don't show error if scan was aborted (user closed modal)
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('[scan_aborted] Scan was cancelled by user')
        return
      }
      
      // Check if it's a specific error message from the API
      const errorMessage = err instanceof Error ? err.message : 'Failed to scan receipt. Please try again.'
      
      // Show specific error message for common issues
      if (errorMessage.includes('No items found') || errorMessage.includes('Invalid response format')) {
        setErrorMessage('Couldn\'t read that receipt—try a clearer photo or type it in')
      } else if (errorMessage.includes('API_OFFLINE')) {
        setErrorMessage('Service temporarily unavailable. Please try again later.')
      } else if (errorMessage.includes('Request timeout exceeded')) {
        setErrorMessage('Scan timed out. Please try with a smaller image.')
      } else if (errorMessage.includes('Unsupported image format') || errorMessage.includes('corrupted file')) {
        setErrorMessage('This image format isn\'t supported. Please try a JPG or PNG file instead.')
      } else if (errorMessage.includes('Worker error')) {
        setErrorMessage('Image processing failed. Please try a different image format.')
      } else {
        setErrorMessage(errorMessage)
      }
      
      setState('error')
      console.error('[scan_api_error]', err)
      console.error('Receipt scanning error:', err)
      logServer('error', 'Receipt scanning failed', { error: err, context: 'ReceiptScanner' })
    }
  }

  const handleRetry = () => {
    setState('idle')
    setErrorMessage(undefined)
    setCurrentStep('')
    fileInputRef.current?.click()
  }

  const handleManualEntry = () => {
    // Close the scanner and let the parent handle manual entry
    onClose()
    // You might want to emit an event or call a callback here for manual entry
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

                      <h3 className="text-2xl font-bold mb-2">Analyzing Receipt</h3>
                      <p className="text-text-primary-dim mb-8">
                        {currentStep === 'Selecting…' && 'Checking file...'}
                        {currentStep === 'Converting PDF…' && 'Converting PDF to image...'}
                        {currentStep === 'Normalizing…' && 'Optimizing image for AI...'}
                        {currentStep === 'Analyzing…' && 'AI reading receipt...'}
                        {currentStep === 'Mapping…' && 'Extracting items and prices...'}
                        {!currentStep && 'Processing your receipt...'}
                      </p>

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

              {/* Upload State */}
              {state === 'idle' && (
                <div className="text-center">
                  <div className="border border-white/14 rounded-2xl p-12 mb-6 bg-white/6">
                    <div className="text-6xl mb-4">
                      📷
                    </div>
                    <h3 className="text-xl font-bold mb-2">Take Photo</h3>
                    <p className="text-text-primary-dim mb-4">
                      AI will automatically extract items and prices
                    </p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-brand hover:bg-brand/90 text-white px-8 py-3 rounded-xl font-bold transition-all duration-200"
                    >
                      📸 Choose Image
                    </button>
                  </div>
                  
                  <div className="text-sm text-text-primary-dim space-y-1">
                    <p>Supports: JPG, PNG, WebP, HEIC, HEIF, PDF</p>
                    <p>Max size: 10MB (auto-optimized)</p>
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

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf,image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}