import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ReceiptItemRow } from './ReceiptItemRow'

interface ReceiptPanelProps {
  billToken?: string
}

interface ReceiptItem {
  id: string
  emoji: string
  label: string
  price: number
}

export const ReceiptPanel: React.FC<ReceiptPanelProps> = () => {
  const [items, setItems] = useState<ReceiptItem[]>([
    {
      id: '1',
      emoji: '☕',
      label: 'Cappuccino',
      price: 4.50
    },
    {
      id: '2',
      emoji: '🥐',
      label: 'Croissant',
      price: 3.25
    },
    {
      id: '3',
      emoji: '🥗',
      label: 'Caesar Salad',
      price: 12.99
    }
  ])
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const handleItemDelete = (id: string) => {
    setItems(items.filter(item => item.id !== id))
  }

  const total = items.reduce((sum, item) => sum + item.price, 0)

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

      {/* Upload Section */}
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

      {/* Items List */}
      <div className="rounded-2xl bg-card shadow-soft border-line p-5">
        <AnimatePresence>
          {items.length > 0 ? (
            <motion.div 
              className="space-y-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {/* Scanned Items Section */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-ink-dim uppercase tracking-wide">Scanned Items</h3>
                {items.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <ReceiptItemRow
                      item={item}
                      index={index}
                      onDelete={handleItemDelete}
                    />
                  </motion.div>
                ))}
              </div>

              {/* Manual Items Section */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-ink-dim uppercase tracking-wide">Manual Items</h3>
                {/* Add Item ghost row */}
                <motion.div
                  className="px-3 py-2 rounded-lg border-2 border-dashed border-line hover:border-brand/50 hover:bg-brand/5 transition-all cursor-pointer flex items-center gap-3"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => {
                    // TODO: Open add item modal/form
                    console.log('Add item clicked')
                  }}
                >
                  <span className="text-[20px] text-ink-dim">+</span>
                  <span className="font-medium text-ink-dim text-[14px]">Add Item</span>
                </motion.div>
              </div>
              
              {/* Section Total */}
              <motion.div 
                className="flex items-center justify-between py-4 border-t border-line mt-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <span className="font-medium text-ink">Subtotal</span>
                <div className="flex items-center">
                  <span className="leaders"></span>
                  <span className="currency tracking-tight text-ink ml-2 text-lg">
                    ${total.toFixed(2)}
                  </span>
                </div>
              </motion.div>
            </motion.div>
          ) : (
            /* Empty State */
            <motion.div 
              className="text-center py-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <motion.div 
                className="text-6xl mb-4"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
              >
                🍽️
              </motion.div>
              <p className="text-ink-dim text-lg mb-2">No items yet</p>
              <p className="text-sm text-ink-dim">Upload a receipt to get started</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
