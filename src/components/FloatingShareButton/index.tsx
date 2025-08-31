import React from 'react'
import { motion } from 'framer-motion'

interface FloatingShareButtonProps {
  onClick: () => void
  isVisible: boolean
  className?: string
}

export const FloatingShareButton: React.FC<FloatingShareButtonProps> = ({
  onClick,
  isVisible,
  className = ''
}) => {
  if (!isVisible) return null

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      className={`fixed bottom-6 right-6 z-40 ${className}`}
    >
      <motion.button
        onClick={onClick}
        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all"
        whileHover={{ scale: 1.1, y: -2 }}
        whileTap={{ scale: 0.9 }}
        animate={{
          boxShadow: [
            '0 10px 30px rgba(147, 51, 234, 0.3)',
            '0 10px 40px rgba(147, 51, 234, 0.5)',
            '0 10px 30px rgba(147, 51, 234, 0.3)'
          ]
        }}
        transition={{
          boxShadow: {
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }
        }}
      >
        <motion.svg 
          className="w-8 h-8" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
        </motion.svg>
      </motion.button>

      {/* Tooltip */}
      <motion.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1 }}
        className="absolute right-full mr-3 top-1/2 transform -translate-y-1/2 bg-gray-900 text-white text-sm px-3 py-2 rounded-lg whitespace-nowrap pointer-events-none"
      >
        Share & Export
        <div className="absolute left-full top-1/2 transform -translate-y-1/2 w-0 h-0 border-l-4 border-l-gray-900 border-t-2 border-t-transparent border-b-2 border-b-transparent"></div>
      </motion.div>
    </motion.div>
  )
}