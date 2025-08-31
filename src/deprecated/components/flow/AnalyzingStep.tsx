import React, { useEffect } from 'react'
import { motion } from 'framer-motion'

interface AnalyzingStepProps {
  onComplete: () => void
  duration?: number
}

export const AnalyzingStep: React.FC<AnalyzingStepProps> = ({ onComplete, duration = 3000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete()
    }, duration)

    return () => clearTimeout(timer)
  }, [onComplete, duration])

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div 
        className="text-center py-20"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <motion.div
          className="text-8xl mb-8"
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            repeatType: "reverse"
          }}
        >
          🔍✨
        </motion.div>
        
        <h1 className="text-4xl font-bold mb-4">Analyzing Receipt</h1>
        <p className="text-lg text-ink-dim mb-8">
          Our AI is reading your receipt and extracting items...
        </p>

        {/* Loading indicator */}
        <motion.div
          className="w-16 h-16 border-4 border-brand border-t-transparent rounded-full mx-auto mb-8"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />

        {/* Progress steps */}
        <motion.div 
          className="space-y-4 max-w-md mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <motion.div 
            className="flex items-center gap-3 text-left"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 }}
          >
            <motion.div
              className="w-6 h-6 bg-brand rounded-full flex items-center justify-center text-white text-sm"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 1 }}
            >
              ✓
            </motion.div>
            <span className="text-ink-dim">Reading receipt image</span>
          </motion.div>
          
          <motion.div 
            className="flex items-center gap-3 text-left"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.2 }}
          >
            <motion.div
              className="w-6 h-6 bg-brand rounded-full flex items-center justify-center text-white text-sm"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 1.5 }}
            >
              ✓
            </motion.div>
            <span className="text-ink-dim">Extracting items and prices</span>
          </motion.div>
          
          <motion.div 
            className="flex items-center gap-3 text-left"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.6 }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full"
            />
            <span className="text-ink-dim">Preparing your bill</span>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  )
}