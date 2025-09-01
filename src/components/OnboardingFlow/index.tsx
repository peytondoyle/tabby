import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { SplashScreen } from '@/components/SplashScreen'
import { ReceiptAnalysis } from '@/components/ReceiptAnalysis'
import { AddPeopleModal } from '@/components/AddPeopleModal'
import { scanReceipt, createBillFromReceipt } from '@/lib/receiptScanning'
import type { ReceiptScanResult } from '@/lib/receiptScanning'
import { logServer } from '@/lib/errorLogger'

interface Person {
  id: string
  name: string
  avatar?: string
  color: string
}

interface OnboardingFlowProps {
  isOpen: boolean
  onClose: () => void
  onComplete: (billToken: string) => void
}

type FlowStep = 'splash' | 'capture' | 'analyzing' | 'add-people' | 'complete'

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  isOpen,
  onClose,
  onComplete
}) => {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState<FlowStep>('splash')
  const [receiptImage, setReceiptImage] = useState<File | null>(null)
  const [scanResult, setScanResult] = useState<ReceiptScanResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const handleScanReceipt = async (mode?: 'camera' | 'gallery') => {
    setCurrentStep('capture')
    
    // Trigger file input based on mode, default to camera
    const inputRef = mode === 'gallery' ? fileInputRef : cameraInputRef
    inputRef.current?.click()
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB')
      return
    }

    setReceiptImage(file)
    setCurrentStep('analyzing')
    setError(null)

    try {
      // Scan the receipt
      const result = await scanReceipt(file)
      setScanResult(result)
      
      // After successful scan, move to add people
      setTimeout(() => {
        setCurrentStep('add-people')
      }, 500)
    } catch (err) {
      setError('Failed to scan receipt. Please try again.')
      console.error('Receipt scanning error:', err)
      logServer('error', 'Receipt scanning failed in onboarding', { error: err, context: 'OnboardingFlow.handleScanReceipt' })
      setCurrentStep('splash')
    }
  }

  const handleAddPeople = async (addedPeople: Person[]) => {
    
    if (scanResult) {
      try {
        // Create the bill with people
        const billData = {
          ...scanResult,
          people: addedPeople.map(p => ({
            id: p.id,
            name: p.name,
            avatar: p.avatar || null
          }))
        }
        
        const billToken = await createBillFromReceipt(billData)
        
        // Add celebration animation
        setCurrentStep('complete')
        
        // Navigate to the bill after a short delay
        setTimeout(() => {
          onComplete(billToken)
          navigate(`/bill/${billToken}`)
        }, 1500)
      } catch (err) {
        setError('Failed to create bill. Please try again.')
        console.error('Bill creation error:', err)
        logServer('error', 'Bill creation failed in onboarding', { error: err, context: 'OnboardingFlow.handleAddPeople' })
      }
    }
  }

  const handleSkip = () => {
    onClose()
  }

  if (!isOpen) return null

  return (
    <AnimatePresence mode="wait">
      {/* Splash Screen */}
      {currentStep === 'splash' && (
        <SplashScreen
          key="splash"
          onScanReceipt={handleScanReceipt}
          onClose={handleSkip}
        />
      )}

      {/* Receipt Analysis */}
      {currentStep === 'analyzing' && (
        <ReceiptAnalysis
          key="analyzing"
          isAnalyzing={true}
          receiptImage={receiptImage || undefined}
          onComplete={() => setCurrentStep('add-people')}
        />
      )}

      {/* Add People Modal */}
      {currentStep === 'add-people' && (
        <AddPeopleModal
          key="add-people"
          isOpen={true}
          onClose={() => setCurrentStep('splash')}
          onAddPeople={handleAddPeople}
        />
      )}

      {/* Completion Animation */}
      {currentStep === 'complete' && (
        <motion.div
          key="complete"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="text-center"
          >
            {/* Confetti Animation */}
            <motion.div
              className="text-8xl mb-6"
              animate={{ 
                rotate: [0, -10, 10, -10, 10, 0],
                scale: [1, 1.2, 1]
              }}
              transition={{ duration: 0.5 }}
            >
              🎉
            </motion.div>
            
            <motion.h2
              className="text-4xl font-bold text-white mb-4"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              Bill Created!
            </motion.h2>
            
            <motion.p
              className="text-xl text-gray-300"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Let's split it up!
            </motion.p>

            {/* Animated dots */}
            <motion.div className="flex justify-center gap-2 mt-8">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-3 h-3 bg-blue-500 rounded-full"
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
          </motion.div>
        </motion.div>
      )}

      {/* Error Modal */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setError(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-red-900/90 text-white rounded-2xl p-6 max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-4xl mb-4 text-center">⚠️</div>
            <h3 className="text-xl font-bold mb-2">Oops!</h3>
            <p className="mb-4">{error}</p>
            <button
              onClick={() => setError(null)}
              className="w-full bg-red-700 hover:bg-red-600 text-white py-3 rounded-xl font-bold"
            >
              Try Again
            </button>
          </motion.div>
        </motion.div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />
    </AnimatePresence>
  )
}