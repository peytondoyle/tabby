import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { scanReceipt } from '@/lib/receiptScanning'
import type { ReceiptScanResult } from '@/lib/receiptScanning'

export interface ParseResult {
  items: Array<{
    id: string
    label: string
    price: number
    emoji?: string
  }>
  restaurant?: string
  location?: string
  date?: string
}

interface ReceiptScannerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onParsed: (result: ParseResult) => void
}

export const ReceiptScanner: React.FC<ReceiptScannerProps> = ({
  open,
  onOpenChange,
  onParsed
}) => {
  const [state, setState] = useState<'idle' | 'analyzing' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | undefined>()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const onClose = () => onOpenChange(false)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

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

    setState('analyzing')
    setErrorMessage(undefined)

    try {
      const scanResult = await scanReceipt(file)
      
      // Convert to ParseResult format
      const parseResult: ParseResult = {
        items: scanResult.items.map((item, index) => ({
          id: `item-${index}`,
          label: item.label,
          price: item.price,
          emoji: item.emoji
        })),
        restaurant: scanResult.restaurant_name,
        location: scanResult.location,
        date: scanResult.date
      }
      
      onParsed(parseResult)
      onClose()
    } catch (err) {
      setErrorMessage('Failed to scan receipt. Please try again.')
      setState('error')
      console.error('Receipt scanning error:', err)
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
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-card text-ink rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto border-2 border-line shadow-pop retro-shadow"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b-2 border-line bg-paper">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold retro-text-shadow">📷 Scan Receipt</h2>
                <motion.button
                  onClick={onClose}
                  className="p-2 hover:bg-line rounded-full transition-colors pixel-perfect"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </motion.button>
              </div>
            </div>

            <div className="p-6">
              {/* Analyzing State */}
              {state === 'analyzing' && (
                <div className="text-center py-12">
                  <motion.div
                    className="text-8xl mb-8"
                    animate={{ 
                      scale: [1, 1.1, 1],
                      rotate: [0, 5, -5, 0]
                    }}
                    transition={{ 
                      duration: 2,
                      repeat: Infinity,
                      repeatType: "reverse"
                    }}
                  >
                    🔍✨
                  </motion.div>
                  
                  <h3 className="text-2xl font-bold mb-2 retro-text-shadow">Analyzing Receipt</h3>
                  <p className="text-ink-dim mb-8 font-mono">
                    AI is reading your receipt and extracting items...
                  </p>

                  {/* Loading indicator */}
                  <motion.div
                    className="w-16 h-16 border-4 border-brand border-t-transparent rounded-full mx-auto mb-8"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />

                  {/* Progress steps */}
                  <motion.div 
                    className="space-y-4 max-w-md mx-auto"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    <motion.div 
                      className="flex items-center gap-3 text-left"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 }}
                    >
                      <motion.div
                        className="w-6 h-6 bg-brand rounded-full flex items-center justify-center text-white text-sm"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 1 }}
                      >
                        ✓
                      </motion.div>
                      <span className="text-ink-dim">Reading receipt image</span>
                    </motion.div>
                    
                    <motion.div 
                      className="flex items-center gap-3 text-left"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.2 }}
                    >
                      <motion.div
                        className="w-6 h-6 bg-brand rounded-full flex items-center justify-center text-white text-sm"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 1.5 }}
                      >
                        ✓
                      </motion.div>
                      <span className="text-ink-dim">Extracting items and prices</span>
                    </motion.div>
                    
                    <motion.div 
                      className="flex items-center gap-3 text-left"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.6 }}
                    >
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full"
                      />
                      <span className="text-ink-dim">Preparing your items</span>
                    </motion.div>
                  </motion.div>
                </div>
              )}

              {/* Upload State */}
              {state === 'idle' && (
                <div className="text-center">
                  <motion.div 
                    className="border-2 border-dashed border-line rounded-2xl p-12 mb-6 bg-paper retro-shadow"
                    whileHover={{ scale: 1.02 }}
                  >
                    <motion.div 
                      className="text-6xl mb-4"
                      animate={{ 
                        rotate: [0, 5, -5, 0],
                        scale: [1, 1.1, 1]
                      }}
                      transition={{ 
                        duration: 2,
                        repeat: Infinity,
                        repeatType: "reverse"
                      }}
                    >
                      📄✨
                    </motion.div>
                    <h3 className="text-xl font-bold mb-2 retro-text-shadow">📷 Upload Receipt</h3>
                    <p className="text-ink-dim mb-4 font-mono">
                      🤖 AI will automatically extract items and prices
                    </p>
                    <motion.button
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-brand hover:bg-brand/90 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-pop retro-shadow pixel-perfect"
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      📸 Choose Image
                    </motion.button>
                  </motion.div>
                  
                  <div className="text-sm text-ink-dim font-mono space-y-1">
                    <p>💾 Supports: JPG, PNG, WebP</p>
                    <p>📏 Max size: 10MB</p>
                  </div>
                </div>
              )}



              {/* Error State */}
              {state === 'error' && (
                <motion.div 
                  className="text-center py-8"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <motion.div 
                    className="text-6xl mb-4"
                    animate={{ 
                      rotate: [0, -10, 10, 0],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{ 
                      duration: 2,
                      repeat: Infinity,
                      repeatType: "reverse"
                    }}
                  >
                    ❌🔄
                  </motion.div>
                  <h3 className="text-xl font-bold mb-2 retro-text-shadow">⚠️ Scanning Failed</h3>
                  <p className="text-ink-dim mb-6 font-mono">{errorMessage}</p>
                  <motion.button
                    onClick={handleRetry}
                    className="bg-brand hover:bg-brand/90 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-pop retro-shadow pixel-perfect"
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    🔄 Try Again
                  </motion.button>
                </motion.div>
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