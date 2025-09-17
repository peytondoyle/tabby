import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import html2canvas from 'html2canvas'
import { ShareCard } from '../ShareCard'
import { X, Download, Copy, Printer, QrCode } from '@/lib/icons'
// TODO: DEPRECATED - This component uses custom modal shell
// For new modals, use: import { Modal } from '@/components/ui/Modal'

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  billToken: string
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  billToken
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'breakdown'>('summary')
  const [isExporting, setIsExporting] = useState(false)
  const shareCardRef = useRef<HTMLDivElement>(null)

  const handleExportPNG = async () => {
    if (!shareCardRef.current) return
    
    setIsExporting(true)
    try {
      const canvas = await html2canvas(shareCardRef.current, {
        scale: 2,
        backgroundColor: null,
        useCORS: true,
        allowTaint: true
      })
      
      const link = document.createElement('a')
      link.download = `tabby-receipt-${activeTab}-${Date.now()}.png`
      link.href = canvas.toDataURL()
      link.click()
    } catch (error) {
      console.error('Error exporting PNG:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const handleCopyPNG = async () => {
    if (!shareCardRef.current) return
    
    setIsExporting(true)
    try {
      const canvas = await html2canvas(shareCardRef.current, {
        scale: 2,
        backgroundColor: null,
        useCORS: true,
        allowTaint: true
      })
      
      canvas.toBlob(async (blob) => {
        if (blob) {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({
                'image/png': blob
              })
            ])
          } catch (error) {
            console.error('Error copying to clipboard:', error)
          }
        }
      })
    } catch (error) {
      console.error('Error copying PNG:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const shareUrl = `${window.location.origin}/share/${billToken}`

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-card border border-line rounded-2xl shadow-pop max-w-4xl w-full max-h-[90vh] overflow-hidden"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-line">
              <h2 className="text-xl font-semibold text-ink">Share Receipt</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-paper rounded-lg transition-colors"
              >
                <X size={20} className="text-ink-dim" />
              </button>
            </div>

            {/* Content */}
            <div className="flex flex-col lg:flex-row h-[calc(90vh-120px)]">
              {/* Preview */}
              <div className="flex-1 p-6 overflow-auto">
                <div className="flex justify-center">
                  <div ref={shareCardRef}>
                    <ShareCard
                      billToken={billToken}
                      mode={activeTab}
                      isExport={true}
                    />
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-line p-6 space-y-6">
                {/* Tabs */}
                <div>
                  <h3 className="text-sm font-medium text-ink mb-3">View Mode</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setActiveTab('summary')}
                      className={`flex-1 px-3 py-2 text-sm rounded-lg transition-colors ${
                        activeTab === 'summary'
                          ? 'bg-brand text-white'
                          : 'bg-paper text-ink hover:bg-paper/80'
                      }`}
                    >
                      Summary
                    </button>
                    <button
                      onClick={() => setActiveTab('breakdown')}
                      className={`flex-1 px-3 py-2 text-sm rounded-lg transition-colors ${
                        activeTab === 'breakdown'
                          ? 'bg-brand text-white'
                          : 'bg-paper text-ink hover:bg-paper/80'
                      }`}
                    >
                      Breakdown
                    </button>
                  </div>
                </div>

                {/* Export Options */}
                <div>
                  <h3 className="text-sm font-medium text-ink mb-3">Export</h3>
                  <div className="space-y-2">
                    <button
                      onClick={handleCopyPNG}
                      disabled={isExporting}
                      className="w-full flex items-center gap-3 px-4 py-3 bg-paper text-ink rounded-lg hover:bg-paper/80 transition-colors disabled:opacity-50"
                    >
                      <Copy size={16} />
                      <span className="text-sm">Copy PNG</span>
                    </button>
                    <button
                      onClick={handleExportPNG}
                      disabled={isExporting}
                      className="w-full flex items-center gap-3 px-4 py-3 bg-paper text-ink rounded-lg hover:bg-paper/80 transition-colors disabled:opacity-50"
                    >
                      <Download size={16} />
                      <span className="text-sm">Download PNG</span>
                    </button>
                    <button
                      onClick={handlePrint}
                      className="w-full flex items-center gap-3 px-4 py-3 bg-paper text-ink rounded-lg hover:bg-paper/80 transition-colors"
                    >
                      <Printer size={16} />
                      <span className="text-sm">Print PDF</span>
                    </button>
                  </div>
                </div>

                {/* Share Link */}
                <div>
                  <h3 className="text-sm font-medium text-ink mb-3">Share Link</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-3 bg-paper rounded-lg">
                      <QrCode size={16} className="text-ink-dim" />
                      <input
                        type="text"
                        value={shareUrl}
                        readOnly
                        className="flex-1 text-sm bg-transparent text-ink outline-none"
                      />
                    </div>
                    <button
                      onClick={() => navigator.clipboard.writeText(shareUrl)}
                      className="w-full px-4 py-2 text-sm bg-brand text-white rounded-lg hover:bg-brand/90 transition-colors"
                    >
                      Copy Link
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
