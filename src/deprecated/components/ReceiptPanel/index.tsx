import React, { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { ReceiptList } from '@/features/receipt/ReceiptList'
import { ReceiptBanner } from '@/features/receipt/ReceiptBanner'
import { getReceiptState, hasReceipt, isProcessing } from '@/lib/receipt'
import { getBillByToken } from '@/lib/billUtils'

interface ReceiptPanelProps {
  billToken?: string
  editorToken?: string
  selectedItems: string[]
  onItemSelect: (itemId: string) => void
  onItemDeselect: (itemId: string) => void
  onClearSelection: () => void
  onAssignItems?: (itemIds: string[], personId: string) => void
}



export const ReceiptPanel: React.FC<ReceiptPanelProps> = ({ 
  billToken, 
  editorToken,
  selectedItems,
  onItemSelect,
  onItemDeselect,
  onClearSelection,
  onAssignItems
}) => {
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Get bill data for receipt state
  const { data: bill } = useQuery({
    queryKey: ['bill', billToken],
    queryFn: async () => {
      if (!billToken) return null;
      return await getBillByToken(billToken);
    },
    enabled: !!billToken
  });

  // Determine receipt state
  const receiptState = getReceiptState(bill);
  const hasReceiptUploaded = hasReceipt(bill);
  const isReceiptProcessing = isProcessing(bill);



  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    handleFiles(files)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    handleFiles(files)
  }

  const handleFiles = (files: File[]) => {
    // TODO: Implement file processing
    console.log('Files to process:', files)
  }

  const handleScanOCR = () => {
    // TODO: Implement OCR scanning
    console.log('Scanning with OCR...')
  }





  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <motion.h2 
          className="text-xl font-semibold text-ink mb-2"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          📄 Receipt Items
        </motion.h2>
        <motion.p 
          className="text-sm text-ink-dim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          Billy's Cafe • Aug 24, 2025
        </motion.p>
      </div>

      {/* Upload Section or Receipt Banner */}
      {hasReceiptUploaded ? (
        <motion.div 
          className="rounded-2xl bg-card shadow-soft border-line p-5"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <ReceiptBanner
            receiptState={receiptState}
            fileName={bill?.receipt_url ? 'receipt.jpg' : undefined}
            onView={() => {
              // TODO: Implement view receipt
              console.log('View receipt');
            }}
            onReplace={() => {
              // TODO: Implement replace receipt
              console.log('Replace receipt');
            }}
            onRescan={() => {
              // TODO: Implement rescan receipt
              console.log('Rescan receipt');
            }}
          />
        </motion.div>
      ) : (
        <motion.div 
          className="rounded-2xl bg-card shadow-soft border-line p-5"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div
            className={`border-2 border-dashed border-line rounded-2xl p-8 text-center transition-all duration-200 ${
              isDragOver ? 'bg-paper/80 scale-105 shadow-soft' : 'bg-paper/60 hover:bg-paper/80 hover:scale-[1.02]'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            role="button"
            tabIndex={0}
            aria-label="Upload receipt dropzone"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                fileInputRef.current?.click()
              }
            }}
          >
            <motion.div 
              className="text-4xl mb-4"
              animate={{ rotate: isDragOver ? 5 : 0 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              📄
            </motion.div>
            <p className="text-ink-dim mb-4">
              Drag and drop your receipt here, or click to browse
            </p>
            <div className="flex gap-3 justify-center">
              <motion.button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand/90 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Upload Photo/PDF
              </motion.button>
              <motion.button
                onClick={handleScanOCR}
                className="px-4 py-2 bg-paper text-ink text-sm font-medium rounded-lg border border-line hover:bg-paper/80 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Scan with OCR
              </motion.button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </motion.div>
      )}

      {/* Items List */}
      <div className="rounded-2xl bg-card shadow-soft border-line p-5">
        <ReceiptList
          billToken={billToken}
          editorToken={editorToken}
          onAssignItems={onAssignItems || (() => {})}
        />
      </div>
    </div>
  )
}
