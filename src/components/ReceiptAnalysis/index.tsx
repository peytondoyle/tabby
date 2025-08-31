import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface ReceiptAnalysisProps {
  isAnalyzing: boolean
  receiptImage?: string | File
  onComplete?: () => void
}

export const ReceiptAnalysis: React.FC<ReceiptAnalysisProps> = ({ 
  isAnalyzing, 
  receiptImage,
  onComplete 
}) => {
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState(0)
  const [imageUrl, setImageUrl] = useState<string>('')

  const analysisSteps = [
    { emoji: '👀', text: 'Reading receipt...' },
    { emoji: '🔍', text: 'Finding items...' },
    { emoji: '💰', text: 'Calculating prices...' },
    { emoji: '✨', text: 'Almost done...' }
  ]

  useEffect(() => {
    if (receiptImage) {
      if (typeof receiptImage === 'string') {
        setImageUrl(receiptImage)
      } else if (receiptImage instanceof File) {
        const url = URL.createObjectURL(receiptImage)
        setImageUrl(url)
        return () => URL.revokeObjectURL(url)
      }
    }
  }, [receiptImage])

  useEffect(() => {
    if (!isAnalyzing) {
      setProgress(0)
      setCurrentStep(0)
      return
    }

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval)
          if (onComplete) {
            setTimeout(onComplete, 500)
          }
          return 100
        }
        return prev + 2
      })
    }, 50)

    // Update steps
    const stepInterval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= analysisSteps.length - 1) {
          clearInterval(stepInterval)
          return prev
        }
        return prev + 1
      })
    }, 1000)

    return () => {
      clearInterval(progressInterval)
      clearInterval(stepInterval)
    }
  }, [isAnalyzing, onComplete])

  if (!isAnalyzing) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-lg"
      >
        {/* Receipt Preview with Overlay */}
        <div className="relative mb-8">
          {imageUrl && (
            <motion.div
              className="relative rounded-2xl overflow-hidden shadow-2xl"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {/* Receipt Image */}
              <img 
                src={imageUrl} 
                alt="Receipt being analyzed" 
                className="w-full h-64 object-cover opacity-30"
              />
              
              {/* Scanning Overlay Effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-b from-blue-500/20 via-purple-500/20 to-transparent"
                animate={{ 
                  y: ['0%', '100%', '0%'] 
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity,
                  ease: "linear"
                }}
              />

              {/* Scanning Line */}
              <motion.div
                className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
                animate={{ 
                  top: ['0%', '100%'] 
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity,
                  ease: "linear"
                }}
                style={{ boxShadow: '0 0 20px 5px rgba(6, 182, 212, 0.5)' }}
              />

              {/* Corner Brackets */}
              <div className="absolute inset-4 pointer-events-none">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-400"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-400"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-400"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-400"></div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Analysis Status */}
        <motion.div 
          className="text-center"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {/* Animated Icon */}
          <motion.div
            className="text-6xl mb-6"
            animate={{ 
              rotate: [0, 360],
              scale: [1, 1.1, 1]
            }}
            transition={{ 
              rotate: { duration: 2, repeat: Infinity, ease: "linear" },
              scale: { duration: 1, repeat: Infinity, repeatType: "reverse" }
            }}
          >
            {analysisSteps[currentStep].emoji}
          </motion.div>

          {/* Status Text */}
          <AnimatePresence mode="wait">
            <motion.h2
              key={currentStep}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-2xl font-bold text-white mb-2"
            >
              Analyzing Receipt
            </motion.h2>
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.p
              key={currentStep}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-gray-300 font-mono mb-8"
            >
              {analysisSteps[currentStep].text}
            </motion.p>
          </AnimatePresence>

          {/* Progress Bar */}
          <div className="relative">
            {/* Background */}
            <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
              {/* Progress Fill */}
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full relative"
                initial={{ width: '0%' }}
                animate={{ width: `${progress}%` }}
                transition={{ type: "spring", stiffness: 50, damping: 20 }}
              >
                {/* Shimmer Effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ 
                    duration: 1.5, 
                    repeat: Infinity,
                    ease: "linear"
                  }}
                />
              </motion.div>
            </div>
            
            {/* Progress Text */}
            <motion.div 
              className="mt-3 text-sm text-gray-400 font-mono"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {progress}% complete
            </motion.div>
          </div>

          {/* AI Processing Indicators */}
          <motion.div 
            className="mt-8 flex justify-center gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 bg-cyan-400 rounded-full"
                animate={{ 
                  scale: [1, 1.5, 1],
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{ 
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.2
                }}
              />
            ))}
          </motion.div>

          {/* Fun fact or tip */}
          <motion.div
            className="mt-8 text-xs text-gray-500 font-mono"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            transition={{ delay: 1 }}
          >
            💡 Tip: Double-tap items to split them between multiple people
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}