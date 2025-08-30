import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { scanReceipt, createBillFromReceipt, getCurrentDate } from '@/lib/receiptScanning'
import type { ReceiptScanResult } from '@/lib/receiptScanning'
import { useQueryClient } from '@tanstack/react-query'

interface ReceiptScannerProps {
  isOpen: boolean
  onClose: () => void
  onBillCreated: (billToken: string) => void
}

export const ReceiptScanner: React.FC<ReceiptScannerProps> = ({
  isOpen,
  onClose,
  onBillCreated
}) => {
  const [isScanning, setIsScanning] = useState(false)
  const [scanResult, setScanResult] = useState<ReceiptScanResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentMode, setCurrentMode] = useState<'scan' | 'import'>('scan')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const importFileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB')
      return
    }

    setError(null)
    setIsScanning(true)

    try {
      const result = await scanReceipt(file)
      setScanResult(result)
    } catch (err) {
      setError('Failed to scan receipt. Please try again.')
      console.error('Receipt scanning error:', err)
    } finally {
      setIsScanning(false)
    }
  }

  const handleCreateBill = async () => {
    if (!scanResult) return

    setIsScanning(true)
    setError(null)
    
    try {
      console.log('Creating bill from receipt:', scanResult)
      const billToken = await createBillFromReceipt(scanResult)
      console.log('Bill created with token:', billToken)
      
      onBillCreated(billToken)
      onClose()
      // Reset state
      setScanResult(null)
      setError(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(`Failed to create bill: ${errorMessage}`)
      console.error('Bill creation error:', err)
    } finally {
      setIsScanning(false)
    }
  }

  const handleRetry = () => {
    setScanResult(null)
    setError(null)
    if (currentMode === 'scan') {
      fileInputRef.current?.click()
    } else {
      importFileInputRef.current?.click()
    }
  }

  const importBills = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const importData = JSON.parse(e.target?.result as string)
        
        if (!importData.version || !importData.bill) {
          throw new Error('Invalid bill export format')
        }

        // For now, just show an alert with the import data
        // In a real implementation, you would recreate the bill, items, people, and shares
        alert(`Import functionality is not yet fully implemented. 
Bill to import: ${importData.bill.title}
Date: ${importData.bill.date}
Items: ${importData.items?.length || 0}
People: ${importData.people?.length || 0}`)
        
        queryClient.invalidateQueries({ queryKey: ['my-bills'] })
        onClose()
        
      } catch (error) {
        console.error('Import failed:', error)
        setError('Failed to import bill. Please check the file format.')
      }
    }
    reader.readAsText(file)
  }

  const currentDate = getCurrentDate()

  return (
    <AnimatePresence>
      {isOpen && (
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
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold retro-text-shadow">📷 Import or Scan Receipt</h2>
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
              
              {/* Mode Toggle */}
              <div className="flex bg-paper rounded-xl p-2 border-2 border-line retro-shadow">
                <motion.button
                  onClick={() => setCurrentMode('scan')}
                  className={`flex-1 py-3 px-4 rounded-lg font-bold transition-all pixel-perfect ${
                    currentMode === 'scan'
                      ? 'bg-brand text-white shadow-pop retro-shadow'
                      : 'text-ink-dim hover:text-ink hover:bg-line/50'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  📷 Scan Receipt
                </motion.button>
                <motion.button
                  onClick={() => setCurrentMode('import')}
                  className={`flex-1 py-3 px-4 rounded-lg font-bold transition-all pixel-perfect ${
                    currentMode === 'import'
                      ? 'bg-accent text-white shadow-pop retro-shadow'
                      : 'text-ink-dim hover:text-ink hover:bg-line/50'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                  📁 Import Bill
                </motion.button>
              </div>
            </div>

            <div className="p-6">
              {/* Scanning State */}
              {isScanning && (
                <div className="text-center py-12">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-16 h-16 border-4 border-brand border-t-transparent rounded-full mx-auto mb-4"
                  />
                  <h3 className="text-xl font-bold mb-2 retro-text-shadow">
                    {scanResult ? '✨ Creating Bill...' : currentMode === 'scan' ? '🔍 Scanning Receipt...' : '⚡ Processing Import...'}
                  </h3>
                  <p className="text-ink-dim font-mono">
                    {scanResult ? 'Setting up your bill' : currentMode === 'scan' ? 'AI is reading your receipt' : 'Processing exported data'}
                  </p>
                </div>
              )}

              {/* Upload State */}
              {!isScanning && !scanResult && !error && currentMode === 'scan' && (
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
                      🤖 AI will automatically extract items, prices, and details
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
                    <p>📅 Date: {currentDate.formatted}</p>
                  </div>
                </div>
              )}

              {/* Import State */}
              {!isScanning && !scanResult && !error && currentMode === 'import' && (
                <div className="text-center">
                  <motion.div 
                    className="border-2 border-dashed border-line rounded-2xl p-12 mb-6 bg-paper retro-shadow"
                    whileHover={{ scale: 1.02 }}
                  >
                    <motion.div 
                      className="text-6xl mb-4"
                      animate={{ 
                        rotate: [0, 5, -5, 0],
                        scale: [1, 1.05, 1]
                      }}
                      transition={{ 
                        duration: 2,
                        repeat: Infinity,
                        repeatType: "reverse"
                      }}
                    >
                      📁🔄
                    </motion.div>
                    <h3 className="text-xl font-bold mb-2 retro-text-shadow">📥 Import Exported Bill</h3>
                    <p className="text-ink-dim mb-4 font-mono">
                      📂 Import a previously exported bill from Tabby
                    </p>
                    <motion.button
                      onClick={() => importFileInputRef.current?.click()}
                      className="bg-accent hover:bg-accent/90 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-pop retro-shadow pixel-perfect"
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      📄 Choose JSON File
                    </motion.button>
                  </motion.div>
                  
                  <div className="text-sm text-ink-dim font-mono space-y-1">
                    <p>📄 Supports: JSON files from Tabby exports</p>
                    <p>🔄 Restores bills, items, people, and splits</p>
                  </div>
                </div>
              )}

              {/* Scan Result */}
              {scanResult && !isScanning && (
                <div>
                  <motion.div 
                    className="bg-paper rounded-2xl p-6 mb-6 border-2 border-line retro-shadow"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="text-center mb-6">
                      <h3 className="text-2xl font-bold retro-text-shadow">🏪 {scanResult.restaurant_name}</h3>
                      <p className="text-ink-dim font-mono">📍 {scanResult.location}</p>
                      <p className="text-sm text-ink-dim font-mono">📅 {new Date(scanResult.date).toLocaleDateString()}</p>
                    </div>

                    <div className="space-y-3 mb-6">
                      {scanResult.items.map((item, index) => (
                        <motion.div 
                          key={index} 
                          className="flex items-center justify-between py-3 px-4 bg-card rounded-xl border border-line hover:border-brand/30 transition-all retro-shadow pixel-perfect"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          whileHover={{ scale: 1.02 }}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{item.emoji}</span>
                            <div>
                              <span className="font-bold text-ink">{item.label}</span>
                              {item.quantity > 1 && (
                                <span className="text-sm text-ink-dim font-mono ml-2">×{item.quantity}</span>
                              )}
                            </div>
                          </div>
                          <span className="font-bold text-lg currency text-brand">${item.price.toFixed(2)}</span>
                        </motion.div>
                      ))}
                    </div>

                    <motion.div 
                      className="border-t-2 border-line pt-4 space-y-2 font-mono bg-card rounded-xl p-4"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      <div className="flex justify-between text-ink-dim">
                        <span>💰 Subtotal:</span>
                        <span className="currency">${scanResult.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-ink-dim">
                        <span>📊 Tax:</span>
                        <span className="currency">${scanResult.tax.toFixed(2)}</span>
                      </div>
                      {scanResult.tip && scanResult.tip > 0 && (
                        <div className="flex justify-between text-ink-dim">
                          <span>💡 Tip:</span>
                          <span className="currency">${scanResult.tip.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-xl border-t-2 border-line pt-2 text-accent retro-text-shadow">
                        <span>🎯 Total:</span>
                        <span className="currency">${scanResult.total.toFixed(2)}</span>
                      </div>
                    </motion.div>
                  </motion.div>

                  <div className="flex gap-4">
                    <motion.button
                      onClick={handleRetry}
                      className="flex-1 py-4 border-2 border-line text-ink-dim rounded-xl font-bold hover:bg-paper transition-all retro-shadow pixel-perfect"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      🔄 Retry Scan
                    </motion.button>
                    <motion.button
                      onClick={handleCreateBill}
                      className="flex-1 py-4 bg-accent hover:bg-accent/90 text-white rounded-xl font-bold transition-all shadow-pop retro-shadow pixel-perfect"
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      ✨ Create Bill
                    </motion.button>
                  </div>
                </div>
              )}

              {/* Error State */}
              {error && !isScanning && (
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
                  <p className="text-ink-dim mb-6 font-mono">{error}</p>
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

            {/* Hidden file inputs */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <input
              ref={importFileInputRef}
              type="file"
              accept=".json"
              onChange={importBills}
              className="hidden"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}