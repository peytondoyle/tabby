import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useDraggable } from '@dnd-kit/core'

interface ReceiptItem {
  id: string
  emoji: string
  label: string
  price: number
}

interface ReceiptItemRowProps {
  item: ReceiptItem
  index: number
  onDelete: (id: string) => void
}

export const ReceiptItemRow: React.FC<ReceiptItemRowProps> = ({
  item,
  index,
  onDelete
}) => {
  const [isHovered, setIsHovered] = useState(false)
  
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    data: item,
  })

  return (
    <motion.div
      ref={setNodeRef}
      {...attributes}
      className={`px-3 py-1.5 rounded-lg hover:bg-paper/60 flex items-center justify-between transition-all duration-200 ${
        isDragging ? 'opacity-90 scale-98' : ''
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      tabIndex={0}
      whileHover={{ scale: isDragging ? 1 : 1.01 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
      }}
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
        <span className="font-medium text-ink text-[14px]">
          {item.label}
        </span>
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
            onClick={() => onDelete(item.id)}
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

          {/* Drag Handle */}
          <motion.button
            {...listeners}
            className="text-ink-dim hover:text-ink transition-colors p-1 rounded hover:bg-paper cursor-grab active:cursor-grabbing touch-action-manipulation opacity-40 hover:opacity-80"
            title="Drag to assign to person"
            aria-label={`Drag ${item.label} to assign to person`}
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
              <circle cx="9" cy="5" r="1" />
              <circle cx="9" cy="12" r="1" />
              <circle cx="9" cy="19" r="1" />
              <circle cx="15" cy="5" r="1" />
              <circle cx="15" cy="12" r="1" />
              <circle cx="15" cy="19" r="1" />
            </svg>
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}
