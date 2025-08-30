import React, { useState } from 'react'
import { motion } from 'framer-motion'

interface ReceiptItem {
  id: string
  emoji: string
  label: string
  price: number
  quantity: number
  unit_price: number
}

interface ReceiptItemRowProps {
  item: ReceiptItem
  index: number
  onDelete: (id: string) => void
  isSelected?: boolean
  onClick?: () => void
  assignedTo?: string[] // Array of person names this item is assigned to
}

export const ReceiptItemRow: React.FC<ReceiptItemRowProps> = ({
  item,
  index,
  onDelete,
  isSelected = false,
  onClick,
  assignedTo = []
}) => {
  const [isHovered, setIsHovered] = useState(false)

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClick?.()
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete(item.id)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick?.()
    }
  }

  return (
    <motion.div
      className={`px-3 py-1.5 rounded-lg flex items-center justify-between transition-all duration-200 cursor-pointer ${
        isSelected 
          ? 'ring-2 ring-brand/40 bg-brand/5' 
          : assignedTo.length > 0
            ? 'bg-success/5 border border-success/20 hover:bg-success/10'
            : 'hover:bg-paper/60'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`${isSelected ? 'Deselect' : 'Select'} ${item.label}`}
      aria-pressed={isSelected}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      {/* Left side: Emoji + Label */}
      <div className="flex items-center gap-3 flex-1">
        {/* Emoji */}
        <motion.div 
          className="text-[20px]"
          whileHover={{ scale: 1.1, rotate: 5 }}
          transition={{ type: "spring", stiffness: 400 }}
        >
          {item.emoji}
        </motion.div>

        {/* Item Label */}
        <div className="flex flex-col">
          <span className="font-medium text-ink text-[14px]">
            {item.label}
          </span>
          {assignedTo.length > 0 && (
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-xs text-success">Assigned to:</span>
              <span className="text-xs text-success font-medium">
                {assignedTo.join(', ')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Right side: Price + Actions */}
      <div className="flex items-center gap-2">
        {/* Leaders */}
        <div className="flex-1 min-w-0">
          <div className="border-b border-dotted border-ink-dim/30" />
        </div>
        
        {/* Price - Right aligned mono */}
        <span className="currency tracking-tight text-ink text-[14px] font-semibold">
          ${item.price.toFixed(2)}
        </span>

        {/* Action Buttons */}
        <div className={`flex gap-1 transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-40'}`}>
          {/* Delete Button */}
          <motion.button
            className="text-ink-dim hover:text-danger transition-colors p-1 rounded hover:bg-danger/10"
            onClick={handleDelete}
            title="Delete item"
            aria-label={`Delete ${item.label}`}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}
