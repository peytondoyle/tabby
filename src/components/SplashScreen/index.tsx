import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface SplashScreenProps {
  onScanReceipt: (mode: 'camera' | 'gallery') => void
  onClose: () => void
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onScanReceipt, onClose }) => {
  const [showOptions, setShowOptions] = useState(false)

  const handleScanClick = () => {
    setShowOptions(true)
  }

  const handleSelectMode = (mode: 'camera' | 'gallery') => {
    onScanReceipt(mode)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="w-full max-w-md"
      >
        {/* Logo and Welcome */}
        <motion.div 
          className="text-center mb-12"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {/* Tabby Logo */}
          <motion.div
            className="inline-block mb-6"
            animate={{ 
              rotate: [0, -5, 5, 0],
              scale: [1, 1.05, 1]
            }}
            transition={{ 
              duration: 3,
              repeat: Infinity,
              repeatType: "reverse"
            }}
          >
            <div className="text-8xl mb-4">🐱</div>
            <h1 className="text-5xl font-bold text-white mb-2 retro-text-shadow">
              Tabby
            </h1>
          </motion.div>
          
          <motion.p 
            className="text-xl text-gray-300 font-mono"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Split bills with ease ✨
          </motion.p>
        </motion.div>

        {/* Main CTA or Options */}
        <AnimatePresence mode="wait">
          {!showOptions ? (
            <motion.div
              key="main-cta"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ delay: 0.5 }}
            >
              <motion.button
                onClick={handleScanClick}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-6 rounded-2xl font-bold text-xl transition-all shadow-2xl relative overflow-hidden group"
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <motion.div
                  className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity"
                />
                <div className="relative flex items-center justify-center gap-3">
                  <span className="text-3xl">📷</span>
                  <span>Scan Receipt</span>
                </div>
              </motion.button>

              {/* Skip button */}
              <motion.button
                onClick={onClose}
                className="w-full mt-4 text-gray-400 hover:text-white py-3 font-mono text-sm transition-colors"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Skip for now →
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              key="options"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="space-y-4"
            >
              {/* Take Photo */}
              <motion.button
                onClick={() => handleSelectMode('camera')}
                className="w-full bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white px-8 py-6 rounded-2xl font-bold text-lg transition-all shadow-2xl relative overflow-hidden group"
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <motion.div
                  className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity"
                />
                <div className="relative flex items-center justify-center gap-3">
                  <span className="text-2xl">📸</span>
                  <span>Take Photo</span>
                </div>
              </motion.button>

              {/* Select from Gallery */}
              <motion.button
                onClick={() => handleSelectMode('gallery')}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white px-8 py-6 rounded-2xl font-bold text-lg transition-all shadow-2xl relative overflow-hidden group"
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <motion.div
                  className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity"
                />
                <div className="relative flex items-center justify-center gap-3">
                  <span className="text-2xl">🖼️</span>
                  <span>Select Image</span>
                </div>
              </motion.button>

              {/* Back button */}
              <motion.button
                onClick={() => setShowOptions(false)}
                className="w-full text-gray-400 hover:text-white py-3 font-mono text-sm transition-colors"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                ← Back
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom decorative element */}
        <motion.div
          className="mt-12 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 1 }}
        >
          <div className="inline-flex items-center gap-2 text-gray-500 text-xs font-mono">
            <span>Made with</span>
            <motion.span
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              ❤️
            </motion.span>
            <span>for easy splits</span>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}