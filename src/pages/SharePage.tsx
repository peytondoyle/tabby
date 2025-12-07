import React, { useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShareCard } from '../components/ShareCard'
import { ExternalLink } from '@/lib/icons'

// Performance optimization imports
import VirtualizedListErrorBoundary from '@/components/ErrorBoundary/VirtualizedListErrorBoundary'
import ListSuspenseWrapper from '@/components/Suspense/ListSuspenseWrapper'
import { deviceDetector } from '@/lib/deviceCapabilities'

export const SharePage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const [mode, setMode] = useState<'summary' | 'breakdown'>('summary')
  const token = searchParams.get('token')
  const isEditor = token?.startsWith('e_')
  
  // Device capability detection for performance optimization
  const device = deviceDetector.detect()

  if (!id) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-text-primary mb-2">Invalid Share Link</h1>
          <p className="text-text-secondary">This receipt link is not valid.</p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen w-full flex flex-col bg-background text-text-primary">
      <div className="w-full flex-1">
        {/* Header */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ 
            duration: device.processingPower === 'low' ? 0.3 : 0.5,
            ease: device.processingPower === 'low' ? 'easeOut' : 'easeInOut'
          }}
        >
          <h1 className="text-3xl font-bold text-text-primary mb-2">Receipt</h1>
          <p className="text-text-secondary">View and share your bill split</p>
        </motion.div>

        {/* Mode Toggle */}
        <motion.div
          className="flex justify-center mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ 
            duration: device.processingPower === 'low' ? 0.3 : 0.5, 
            delay: 0.1,
            ease: device.processingPower === 'low' ? 'easeOut' : 'easeInOut'
          }}
        >
          <div className="flex gap-2 bg-surface rounded-lg p-1">
            <button
              onClick={() => setMode('summary')}
              className={`px-4 py-2 text-sm rounded-md transition-colors ${
                mode === 'summary'
                  ? 'bg-primary text-white'
                  : 'text-text-primary hover:bg-white/10'
              }`}
            >
              Summary
            </button>
            <button
              onClick={() => setMode('breakdown')}
              className={`px-4 py-2 text-sm rounded-md transition-colors ${
                mode === 'breakdown'
                  ? 'bg-primary text-white'
                  : 'text-text-primary hover:bg-white/10'
              }`}
            >
              Breakdown
            </button>
          </div>
        </motion.div>

        {/* Share Card with Error Boundaries */}
        <VirtualizedListErrorBoundary 
          listType="dnd-container"
          onError={(error, errorInfo) => {
            console.error('[share_page] ShareCard error:', error, errorInfo)
            // Could send to analytics here
          }}
        >
          <ListSuspenseWrapper listType="dnd-container">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ 
                duration: device.processingPower === 'low' ? 0.3 : 0.5, 
                delay: 0.2 
              }}
            >
              <ShareCard
                billToken={id}
                mode={mode}
                isExport={true}
              />
            </motion.div>
          </ListSuspenseWrapper>
        </VirtualizedListErrorBoundary>

        {/* Editor CTA */}
        {isEditor && (
          <motion.div
            className="mt-8 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Link
              to={`/receipt/${id}/edit`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
            >
              <ExternalLink size={16} />
              <span>Open in Tabby</span>
            </Link>
          </motion.div>
        )}

        {/* Footer */}
        <motion.div
          className="mt-12 text-center text-sm text-text-secondary"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <p>Powered by Tabby • Split bills with ease</p>
        </motion.div>
      </div>
    </main>
  )
}
