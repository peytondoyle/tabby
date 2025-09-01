import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { parseReceipt } from '@/lib/receiptScanning'
import type { ParseResult } from '@/lib/receiptScanning'
import { logServer } from '@/lib/errorLogger'

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
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Handle external errors (from bill creation)
  React.useEffect(() => {
    if (externalError) {
      setErrorMessage(externalError)
      setState('error')
    }
  }, [externalError])

  const onClose = () => onOpenChange(false)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    console.log('[scan_start]', { file_name: file.name, file_size: file.size })

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select an image file')
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

    try {
      // Analyzing - parse the receipt
      setState('analyzing')
      const parseResult = await parseReceipt(file)
      console.log('[scan_success]', { items_count: parseResult.items.length, total: parseResult.total })
      onParsed(parseResult)
      onClose()
    } catch (err) {
      setErrorMessage('Failed to scan receipt. Please try again.')
      setState('error')
      console.error('[scan_api_error]', err)
      console.error('Receipt scanning error:', err)
      logServer('error', 'Receipt scanning failed', { error: err, context: 'ReceiptScanner' })
    }
  }

  const handleRetry = () => {
    setState('idle')
    setErrorMessage(undefined)
    fileInputRef.current?.click()
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
            className="bg-card text-ink rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto border-2 border-line shadow-pop retro-shadow mx-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b-2 border-line bg-paper">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold retro-text-shadow">📷 Scan Receipt</h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-line rounded-full transition-opacity duration-150 ease-out hover:opacity-75 motion-reduce:transition-none pixel-perfect"
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
                  <div className="text-6xl mb-8">
                    🔍
                  </div>
                  
                  <h3 className="text-2xl font-bold mb-2">Analyzing Receipt</h3>
                  <p className="text-ink-dim mb-8">
                    AI is reading your receipt and extracting items...
                  </p>

                  {/* Loading indicator */}
                  <motion.div
                    className="w-16 h-16 border-4 border-brand border-t-transparent rounded-full mx-auto mb-8"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />

                  {/* Progress steps */}
                  <div className="space-y-4 max-w-md mx-auto">
                    <div className="flex items-center gap-3 text-left">
                      <div className="w-6 h-6 bg-brand rounded-full flex items-center justify-center text-white text-sm">
                        ✓
                      </div>
                      <span className="text-ink-dim">Reading receipt image</span>
                    </div>
                    
                    <div className="flex items-center gap-3 text-left">
                      <div className="w-6 h-6 bg-brand rounded-full flex items-center justify-center text-white text-sm">
                        ✓
                      </div>
                      <span className="text-ink-dim">Extracting items and prices</span>
                    </div>
                    
                    <div className="flex items-center gap-3 text-left">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full"
                      />
                      <span className="text-ink-dim">Preparing your items</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Upload State */}
              {state === 'idle' && (
                <div className="text-center">
                  <div className="border-2 border-dashed border-line rounded-2xl p-12 mb-6 bg-paper">
                    <div className="text-6xl mb-4">
                      📷
                    </div>
                    <h3 className="text-xl font-bold mb-2">Take Photo</h3>
                    <p className="text-ink-dim mb-4">
                      AI will automatically extract items and prices
                    </p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-brand hover:bg-brand/90 text-white px-8 py-3 rounded-xl font-bold transition-all duration-200"
                    >
                      📸 Choose Image
                    </button>
                  </div>
                  
                  <div className="text-sm text-ink-dim space-y-1">
                    <p>Supports: JPG, PNG, WebP</p>
                    <p>Max size: 10MB</p>
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
                  <p className="text-ink-dim mb-6">{errorMessage}</p>
                  <button
                    onClick={handleRetry}
                    className="bg-brand hover:bg-brand/90 text-white px-8 py-3 rounded-xl font-bold transition-all duration-200"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}