import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Edit2, Trash2, Plus, DollarSign } from '@/lib/icons'
import type { OcrResult } from '../../lib/ocr'

interface OcrEditorProps {
  ocrResults: (OcrResult & { file: File })[]
  onResultsChange: (updatedResults: (OcrResult & { file: File })[]) => void
  className?: string
}

interface EditableItem {
  name: string
  price: number
  quantity: number
}

export const OcrEditor: React.FC<OcrEditorProps> = ({
  ocrResults,
  onResultsChange,
  className = ''
}) => {
  const [editingItemIndex, setEditingItemIndex] = useState<{ resultIndex: number; itemIndex: number } | null>(null)
  const [editingTotals, setEditingTotals] = useState<number | null>(null)

  const updateItem = (resultIndex: number, itemIndex: number, updates: Partial<EditableItem>) => {
    const newResults = [...ocrResults]
    const result = newResults[resultIndex]
    if (result.success && result.items) {
      result.items[itemIndex] = { ...result.items[itemIndex], ...updates }
      onResultsChange(newResults)
    }
  }

  const deleteItem = (resultIndex: number, itemIndex: number) => {
    const newResults = [...ocrResults]
    const result = newResults[resultIndex]
    if (result.success && result.items) {
      result.items.splice(itemIndex, 1)
      onResultsChange(newResults)
    }
  }

  const addItem = (resultIndex: number) => {
    const newResults = [...ocrResults]
    const result = newResults[resultIndex]
    if (result.success && result.items) {
      result.items.push({
        name: 'New Item',
        price: 0,
        quantity: 1
      })
      onResultsChange(newResults)
      setEditingItemIndex({ resultIndex, itemIndex: result.items.length - 1 })
    }
  }

  const updateTotals = (resultIndex: number, field: 'subtotal' | 'tax' | 'tip', value: number) => {
    const newResults = [...ocrResults]
    const result = newResults[resultIndex]
    if (result.success) {
      result[field] = value
      onResultsChange(newResults)
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <Edit2 className="w-5 h-5 text-brand" />
        <h2 className="text-xl font-bold text-ink">Review & Edit Items</h2>
        <span className="text-sm text-ink-dim">Make any corrections before creating your bill</span>
      </div>

      {ocrResults.map((result, resultIndex) => (
        <motion.div
          key={resultIndex}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: resultIndex * 0.1 }}
          className="bg-card rounded-lg border border-line p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <h3 className="font-medium text-ink">{result.file.name}</h3>
            {result.success && (
              <span className="text-xs bg-brand/10 text-brand px-2 py-1 rounded-full">
                {Math.round(result.confidence * 100)}% confidence
              </span>
            )}
          </div>

          {result.success ? (
            <div className="space-y-4">
              {/* Items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-ink">Items</h4>
                  <motion.button
                    onClick={() => addItem(resultIndex)}
                    className="text-xs bg-brand/10 text-brand px-2 py-1 rounded-md hover:bg-brand/20 transition-colors flex items-center gap-1"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Plus className="w-3 h-3" />
                    Add Item
                  </motion.button>
                </div>

                {result.items.map((item, itemIndex) => (
                  <div
                    key={itemIndex}
                    className="flex items-center gap-3 p-2 rounded-lg border border-line hover:border-brand/30 transition-colors group"
                  >
                    {editingItemIndex?.resultIndex === resultIndex && editingItemIndex?.itemIndex === itemIndex ? (
                      <>
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => updateItem(resultIndex, itemIndex, { name: e.target.value })}
                          className="flex-1 px-2 py-1 border border-line rounded text-sm bg-paper"
                          autoFocus
                          onBlur={() => setEditingItemIndex(null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') setEditingItemIndex(null)
                            if (e.key === 'Escape') setEditingItemIndex(null)
                          }}
                        />
                        <input
                          type="number"
                          value={item.quantity || 1}
                          onChange={(e) => updateItem(resultIndex, itemIndex, { quantity: parseFloat(e.target.value) || 1 })}
                          className="w-16 px-2 py-1 border border-line rounded text-sm bg-paper text-center"
                          min="0.1"
                          step="0.1"
                        />
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4 text-ink-dim" />
                          <input
                            type="number"
                            value={item.price}
                            onChange={(e) => updateItem(resultIndex, itemIndex, { price: parseFloat(e.target.value) || 0 })}
                            className="w-20 px-2 py-1 border border-line rounded text-sm bg-paper text-right"
                            min="0"
                            step="0.01"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm text-ink">{item.name}</span>
                        <span className="w-16 text-sm text-ink-dim text-center">
                          {item.quantity && item.quantity !== 1 ? `${item.quantity}×` : ''}
                        </span>
                        <span className="w-20 text-sm font-medium text-ink text-right">
                          ${item.price.toFixed(2)}
                        </span>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          <motion.button
                            onClick={() => setEditingItemIndex({ resultIndex, itemIndex })}
                            className="p-1 text-brand hover:bg-brand/10 rounded"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <Edit2 className="w-3 h-3" />
                          </motion.button>
                          <motion.button
                            onClick={() => deleteItem(resultIndex, itemIndex)}
                            className="p-1 text-danger hover:bg-danger/10 rounded"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </motion.button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {/* Totals */}
              {(result.subtotal || result.tax || result.tip) && (
                <div className="pt-4 border-t border-line">
                  <h4 className="text-sm font-medium text-ink mb-2">Totals</h4>
                  <div className="space-y-1 text-sm">
                    {result.subtotal !== undefined && (
                      <div className="flex justify-between items-center group">
                        <span className="text-ink-dim">Subtotal</span>
                        {editingTotals === resultIndex ? (
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4 text-ink-dim" />
                            <input
                              type="number"
                              value={result.subtotal}
                              onChange={(e) => updateTotals(resultIndex, 'subtotal', parseFloat(e.target.value) || 0)}
                              className="w-20 px-2 py-1 border border-line rounded text-sm bg-paper text-right"
                              min="0"
                              step="0.01"
                              onBlur={() => setEditingTotals(null)}
                              autoFocus
                            />
                          </div>
                        ) : (
                          <span
                            className="text-ink cursor-pointer hover:text-brand"
                            onClick={() => setEditingTotals(resultIndex)}
                          >
                            ${result.subtotal.toFixed(2)}
                          </span>
                        )}
                      </div>
                    )}
                    {result.tax !== undefined && (
                      <div className="flex justify-between items-center">
                        <span className="text-ink-dim">Tax</span>
                        <span
                          className="text-ink cursor-pointer hover:text-brand"
                          onClick={() => setEditingTotals(resultIndex)}
                        >
                          ${result.tax.toFixed(2)}
                        </span>
                      </div>
                    )}
                    {result.tip !== undefined && (
                      <div className="flex justify-between items-center">
                        <span className="text-ink-dim">Tip</span>
                        <span
                          className="text-ink cursor-pointer hover:text-brand"
                          onClick={() => setEditingTotals(resultIndex)}
                        >
                          ${result.tip.toFixed(2)}
                        </span>
                      </div>
                    )}
                    {result.total && (
                      <div className="flex justify-between font-medium pt-1 border-t border-line">
                        <span className="text-ink">Total</span>
                        <span className="text-ink">${result.total.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-danger">
              Failed to process: {result.error || 'Unknown error'}
            </div>
          )}
        </motion.div>
      ))}
    </div>
  )
}