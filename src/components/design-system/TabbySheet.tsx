/**
 * Tabby Sheet Component
 * Bottom-sheet that spans width on mobile and centers on desktop
 * Replaces web modals with native iOS-style sheets
 */

import React, { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FocusTrap, getSpringConfig } from '../../lib/accessibility'

export interface TabbySheetProps {
  open: boolean
  onClose: () => void
  variant?: 'sheet' | 'center'
  children?: React.ReactNode
  title?: string
  showCloseButton?: boolean
  closeOnBackdropClick?: boolean
  closeOnEscape?: boolean
}

export const TabbySheet: React.FC<TabbySheetProps> = ({
  open,
  onClose,
  variant = 'sheet',
  children,
  title,
  showCloseButton = true,
  closeOnBackdropClick = true,
  closeOnEscape = true,
}) => {
  const sheetRef = useRef<HTMLDivElement>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)
  const focusTrapRef = useRef<FocusTrap | null>(null)

  // Handle escape key
  useEffect(() => {
    if (!open || !closeOnEscape) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open, closeOnEscape, onClose])

  // Handle focus management and focus trap
  useEffect(() => {
    if (open) {
      previousActiveElement.current = document.activeElement as HTMLElement
      if (sheetRef.current) {
        focusTrapRef.current = new FocusTrap(sheetRef.current)
        focusTrapRef.current.activate()
      }
    } else {
      focusTrapRef.current?.deactivate()
      previousActiveElement.current?.focus()
    }
  }, [open])

  // Handle body scroll lock
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!open) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={handleBackdropClick}
      >
        {/* Mobile: Bottom sheet */}
        <div className="block md:hidden">
          <motion.div
            ref={sheetRef}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={getSpringConfig()}
            className="fixed bottom-0 left-0 right-0 bg-[#121317] border border-white/10 rounded-t-[28px] shadow-[0_24px_48px_rgba(0,0,0,0.45)] max-h-[85vh] overflow-hidden"
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'sheet-title' : undefined}
          >
            {/* Handle bar */}
            <div className="flex justify-center my-3">
              <div className="w-12 h-1.5 bg-white/20 rounded-full" />
            </div>

            {/* Header */}
            {(title || showCloseButton) && (
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                {title && (
                  <h2 id="sheet-title" className="text-lg font-semibold text-white">
                    {title}
                  </h2>
                )}
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    aria-label="Close sheet"
                  >
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L6 6M18 6L18 18" />
                    </svg>
                  </button>
                )}
              </div>
            )}

            {/* Content */}
            <div className="overflow-y-auto max-h-[calc(85vh-80px)]">
              {children}
            </div>
          </motion.div>
        </div>

        {/* Desktop: Centered modal */}
        <div className="hidden md:grid place-items-center p-4">
          <motion.div
            ref={sheetRef}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={getSpringConfig()}
            className="max-w-[420px] w-full rounded-[24px] bg-[#121317] border border-white/10 shadow-[0_24px_48px_rgba(0,0,0,0.45)] max-h-[80vh] overflow-hidden"
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'sheet-title' : undefined}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            {(title || showCloseButton) && (
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                {title && (
                  <h2 id="sheet-title" className="text-lg font-semibold text-white">
                    {title}
                  </h2>
                )}
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    aria-label="Close sheet"
                  >
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L6 6M18 6L18 18" />
                    </svg>
                  </button>
                )}
              </div>
            )}

            {/* Content */}
            <div className="overflow-y-auto max-h-[calc(80vh-80px)]">
              {children}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

TabbySheet.displayName = 'TabbySheet'
