import React, { useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShareCard } from '../components/ShareCard'
import { ExternalLink } from 'lucide-react'

export const SharePage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const [mode, setMode] = useState<'summary' | 'breakdown'>('summary')
  const token = searchParams.get('token')
  const isEditor = token?.startsWith('e_')

  if (!id) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-ink mb-2">Invalid Share Link</h1>
          <p className="text-ink-dim">This receipt link is not valid.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl font-bold text-ink mb-2">Receipt</h1>
          <p className="text-ink-dim">View and share your bill split</p>
        </motion.div>

        {/* Mode Toggle */}
        <motion.div
          className="flex justify-center mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="flex gap-2 bg-paper rounded-lg p-1">
            <button
              onClick={() => setMode('summary')}
              className={`px-4 py-2 text-sm rounded-md transition-colors ${
                mode === 'summary'
                  ? 'bg-brand text-white'
                  : 'text-ink hover:bg-paper/80'
              }`}
            >
              Summary
            </button>
            <button
              onClick={() => setMode('breakdown')}
              className={`px-4 py-2 text-sm rounded-md transition-colors ${
                mode === 'breakdown'
                  ? 'bg-brand text-white'
                  : 'text-ink hover:bg-paper/80'
              }`}
            >
              Breakdown
            </button>
          </div>
        </motion.div>

        {/* Share Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <ShareCard
            billToken={id}
            mode={mode}
            isExport={true}
          />
        </motion.div>

        {/* Editor CTA */}
        {isEditor && (
          <motion.div
            className="mt-8 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Link
              to={`/bill/${id}`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand text-white rounded-lg hover:bg-brand/90 transition-colors"
            >
              <ExternalLink size={16} />
              <span>Open in Tabby</span>
            </Link>
          </motion.div>
        )}

        {/* Footer */}
        <motion.div
          className="mt-12 text-center text-sm text-ink-dim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <p>Powered by Tabby • Split bills with ease</p>
        </motion.div>
      </div>
    </div>
  )
}
