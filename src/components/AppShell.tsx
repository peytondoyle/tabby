import React from 'react'
import { Outlet, useLocation, useParams } from 'react-router-dom'
import { Share, Download, Settings } from 'lucide-react'
import { motion } from 'framer-motion'

// DEV-only component to confirm CSS is loaded
const StyleSmoke: React.FC = () => {
  if (!import.meta.env.DEV) return null
  
  return (
    <div 
      className="fixed top-4 right-4 w-3 h-3 bg-brand rounded-full z-[9999] opacity-80"
      title="CSS Loaded ✓"
    />
  )
}

export const AppShell: React.FC = () => {
  const location = useLocation()
  const { id } = useParams<{ id: string }>()
  
  // Determine if we're on a bill page
  const isBillPage = location.pathname.startsWith('/bill/') && id && id !== 'new'
  
  // Mock data for title lockup - in real app, this would come from bill data
  const billTitle = isBillPage ? "Coffee & Lunch" : null
  const billLocation = isBillPage ? "Starbucks Downtown" : null
  const billDate = isBillPage ? "Dec 15, 2024" : null

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      {/* DEV-only CSS smoke test */}
      <StyleSmoke />
      
      {/* Sticky Header with Blur - Hidden on bill pages */}
      <motion.header 
        className={`sticky top-0 z-50 bg-paper/80 backdrop-blur-md border-b border-line ${isBillPage ? 'hidden' : ''}`}
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center h-16">
            {/* Title Lockup */}
            <div className="flex items-center">
              <motion.h1 
                className="text-xl font-semibold text-ink"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                Tabby
              </motion.h1>
              {isBillPage && billTitle && (
                <motion.div 
                  className="ml-4 flex items-center"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <span className="text-ink-dim">•</span>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-ink">{billTitle}</div>
                    <div className="text-xs text-ink-dim">
                      {billLocation} • {billDate}
                    </div>
                  </div>
                </motion.div>
              )}
              {!isBillPage && (
                <motion.span 
                  className="ml-4 text-sm text-ink-dim"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  Split bills with friends
                </motion.span>
              )}
            </div>

            {/* Primary Actions */}
            <div className="flex items-center space-x-2">
              {isBillPage && (
                <>
                  <motion.button 
                    onClick={() => {/* TODO: Add share functionality */}}
                    className="hidden sm:flex items-center px-3 py-2 text-sm font-medium text-ink hover:text-brand transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Share className="w-4 h-4 mr-2" />
                    Share
                  </motion.button>
                  <motion.button 
                    onClick={() => {/* TODO: Add export functionality */}}
                    className="hidden sm:flex items-center px-3 py-2 text-sm font-medium text-ink hover:text-brand transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </motion.button>
                </>
              )}
              <motion.button 
                className="p-2 text-ink hover:text-brand transition-colors"
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <Settings className="w-5 h-5" />
              </motion.button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>


    </div>
  )
}
