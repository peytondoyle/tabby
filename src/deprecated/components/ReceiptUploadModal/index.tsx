import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowLeft } from '@/lib/icons'
import { ReceiptUpload } from '../ReceiptUpload'
import { OcrEditor } from '../OcrEditor'
import { processReceiptOcr } from '../../lib/ocr'
import { createBillFromOcr } from '../../lib/billUtils'
import type { OcrResult } from '../../lib/ocr'

interface ReceiptUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onBillCreated: (editorToken: string) => void
}

export const ReceiptUploadModal: React.FC<ReceiptUploadModalProps> = ({
  isOpen,
  onClose,
  onBillCreated
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [ocrResults, setOcrResults] = useState<(OcrResult & { file: File })[]>([])
  const [processingProgress, setProcessingProgress] = useState('')
  const [step, setStep] = useState<'upload' | 'review'>('upload')

  const handleFileSelect = (files: File[]) => {
    setSelectedFiles(files)
  }

  const handleProcessReceipts = async () => {
    if (selectedFiles.length === 0) return
    
    setIsProcessing(true)
    setOcrResults([])
    
    try {
      const results = []
      
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i]
        setProcessingProgress(`Processing ${file.name}... (${i + 1}/${selectedFiles.length})`)
        
        const result = await processReceiptOcr(file)
        results.push({ file, ...result })
      }
      
      setOcrResults(results)
      setStep('review')
      setProcessingProgress('')
      
    } catch (error) {
      console.error('Error processing receipts:', error)
      setProcessingProgress('Processing failed')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCreateBill = async () => {
    const result = await createBillFromOcr(ocrResults)
    if (result) {
      onBillCreated(result.editor_token)
      handleClose()
    }
  }

  const handleClose = () => {
    setSelectedFiles([])
    setOcrResults([])
    setStep('upload')
    setIsProcessing(false)
    setProcessingProgress('')
    onClose()
  }

  const handleBackToUpload = () => {
    setStep('upload')
    setOcrResults([])
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />
        
        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-4xl max-h-[90vh] mx-4 bg-paper rounded-xl shadow-xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-line">
            <div className="flex items-center gap-3">
              {step === 'review' && (
                <motion.button
                  onClick={handleBackToUpload}
                  className="p-1 text-ink-dim hover:text-ink transition-colors rounded-lg hover:bg-line"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <ArrowLeft className="w-5 h-5" />
                </motion.button>
              )}
              <div>
                <h2 className="text-xl font-bold text-ink">
                  {step === 'upload' ? 'Upload Receipt' : 'Review Items'}
                </h2>
                <p className="text-sm text-ink-dim">
                  {step === 'upload' 
                    ? 'Upload photos or PDFs of your receipts and let AI extract the items'
                    : 'Review and edit the extracted items before creating your bill'
                  }
                </p>
              </div>
            </div>
            
            <motion.button
              onClick={handleClose}
              className="p-2 text-ink-dim hover:text-ink transition-colors rounded-lg hover:bg-line"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <X className="w-5 h-5" />
            </motion.button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[70vh]">
            {step === 'upload' ? (
              <div className="space-y-6">
                <ReceiptUpload
                  onFileSelect={handleFileSelect}
                  maxFiles={3}
                />

                {/* Process Button */}
                {selectedFiles.length > 0 && (
                  <div className="flex justify-center">
                    <motion.button
                      onClick={handleProcessReceipts}
                      disabled={isProcessing}
                      className="bg-brand text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-brand/90 transition-colors disabled:opacity-50"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {isProcessing 
                        ? processingProgress || 'Processing with AI...' 
                        : `Process ${selectedFiles.length} Receipt${selectedFiles.length > 1 ? 's' : ''}`
                      }
                    </motion.button>
                  </div>
                )}

                {/* Info */}
                <div className="bg-card rounded-lg p-4 border border-line text-sm text-ink-dim">
                  <p className="font-medium text-ink mb-2">What happens next?</p>
                  <p>AI will scan your receipts and extract items, prices, tax, and tip. You can review and edit before creating your bill.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <OcrEditor
                  ocrResults={ocrResults}
                  onResultsChange={setOcrResults}
                />
                
                <div className="flex justify-center">
                  <motion.button
                    onClick={handleCreateBill}
                    className="bg-success text-white px-6 py-2 rounded-lg font-medium hover:bg-success/90 transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Create Bill with These Items
                  </motion.button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}