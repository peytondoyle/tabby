import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useFlowStore } from '@/lib/flowStore'
import { ReceiptScanner, type ParseResult } from '@/components/ReceiptScanner'
import { PeopleStep } from '@/components/flow/PeopleStep'
import { AssignStep } from '@/components/flow/AssignStep'
import { ShareStep } from '@/components/flow/ShareStep'

type AppStep = 'start' | 'people' | 'assign' | 'share'

const stepTitles: Record<AppStep, string> = {
  start: 'Split Your Bill',
  people: 'Add People',
  assign: 'Assign Items',
  share: 'Share the Bill'
}

const stepOrder: AppStep[] = ['start', 'people', 'assign', 'share']

export const Flow: React.FC = () => {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState<AppStep>('start')
  const [scannerOpen, setScannerOpen] = useState(false)
  
  const {
    items,
    setItems,
    updateItem,
    setBill
  } = useFlowStore()

  const navigateToStep = (step: AppStep) => {
    setCurrentStep(step)
  }

  const handleNext = () => {
    const currentIndex = stepOrder.indexOf(currentStep)
    if (currentIndex < stepOrder.length - 1) {
      const nextStep = stepOrder[currentIndex + 1]
      navigateToStep(nextStep)
    }
  }

  const handlePrev = () => {
    const currentIndex = stepOrder.indexOf(currentStep)
    if (currentIndex > 0) {
      const prevStep = stepOrder[currentIndex - 1]
      navigateToStep(prevStep)
    }
  }

  const handleParsed = (result: ParseResult) => {
    // Set items from scan result, converting to FlowItem format
    const flowItems = result.items.map(item => ({
      id: item.id,
      label: item.label,
      price: item.price,
      emoji: item.emoji || undefined
    }))
    setItems(flowItems)
    
    // Set bill info if available
    if (result.place || result.date) {
      setBill({
        token,
        id: token,
        title: result.place || undefined,
        place: result.place || undefined,
        date: result.date || undefined
      })
    }
  }

  const handleAddItem = () => {
    const newItem = {
      id: `item-${Date.now()}`,
      label: '',
      price: 0,
      emoji: '🍽️'
    }
    setItems([...items, newItem])
  }

  const handleRemoveItem = (itemId: string) => {
    setItems(items.filter(item => item.id !== itemId))
  }

  const handleBack = () => {
    navigate('/bills')
  }

  const renderStep = () => {
    switch (currentStep) {
      case 'start':
        return (
          <div className="max-w-2xl mx-auto">
            {/* Hero section */}
            <motion.div 
              className="text-center mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="text-8xl mb-6">🧾</div>
              <h1 className="text-4xl font-bold mb-4">Split Your Bill</h1>
              <p className="text-lg text-ink-dim mb-8">
                Scan a receipt or add items manually to get started
              </p>
            </motion.div>

            {/* Scan Receipt Button */}
            <motion.div 
              className="mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <motion.button
                onClick={() => setScannerOpen(true)}
                className="w-full flex items-center justify-center gap-3 px-8 py-6 bg-brand hover:bg-brand/90 text-white rounded-2xl font-bold text-lg shadow-lg transition-all"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Scan Receipt
              </motion.button>
            </motion.div>

            {/* Inline Results */}
            <AnimatePresence>
              {items.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-card rounded-2xl border border-line p-6 mb-8"
                >
                  <h2 className="text-xl font-bold mb-4">Items ({items.length})</h2>
                  <div className="space-y-3 mb-6">
                    {items.map((item, index) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center gap-3 p-3 bg-paper rounded-xl border border-line"
                      >
                        <span className="text-2xl">{item.emoji}</span>
                        <input
                          type="text"
                          value={item.label}
                          onChange={(e) => updateItem(item.id, { label: e.target.value })}
                          placeholder="Item name"
                          className="flex-1 bg-transparent border-none outline-none font-medium"
                        />
                        <input
                          type="number"
                          value={item.price}
                          onChange={(e) => updateItem(item.id, { price: parseFloat(e.target.value) || 0 })}
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                          className="w-20 bg-transparent border-none outline-none text-right font-bold"
                        />
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-2 text-ink-dim hover:text-red-500 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </motion.div>
                    ))}
                  </div>
                  
                  <div className="flex gap-4">
                    <motion.button
                      onClick={handleAddItem}
                      className="flex items-center gap-2 px-4 py-2 border border-line hover:border-brand/50 text-ink-dim hover:text-ink rounded-xl transition-all"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Add Item
                    </motion.button>
                    
                    <motion.button
                      onClick={handleNext}
                      className="flex-1 px-6 py-3 bg-brand hover:bg-brand/90 text-white rounded-xl font-bold transition-all"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Assign Items →
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Features */}
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="text-center p-6 bg-card rounded-2xl border border-line">
                <div className="text-3xl mb-3">⚡</div>
                <h3 className="font-bold mb-2">Quick & Easy</h3>
                <p className="text-sm text-ink-dim">
                  Scan receipts instantly or add items manually
                </p>
              </div>
              
              <div className="text-center p-6 bg-card rounded-2xl border border-line">
                <div className="text-3xl mb-3">👥</div>
                <h3 className="font-bold mb-2">Fair Splitting</h3>
                <p className="text-sm text-ink-dim">
                  Assign items to people for accurate cost sharing
                </p>
              </div>
              
              <div className="text-center p-6 bg-card rounded-2xl border border-line">
                <div className="text-3xl mb-3">📱</div>
                <h3 className="font-bold mb-2">Easy Sharing</h3>
                <p className="text-sm text-ink-dim">
                  Share payment links and summaries instantly
                </p>
              </div>
            </motion.div>
          </div>
        )
      case 'people':
        return <PeopleStep onNext={handleNext} onPrev={handlePrev} />
      case 'assign':
        return <AssignStep onNext={handleNext} onPrev={handlePrev} />
      case 'share':
        return <ShareStep onPrev={handlePrev} onBack={handleBack} />
      default:
        return null
    }
  }

  const currentStepIndex = stepOrder.indexOf(currentStep)
  const progress = ((currentStepIndex + 1) / stepOrder.length) * 100

  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* Header with progress */}
      <div className="bg-card border-b border-line">
        <div className="max-w-4xl mx-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBack}
                className="p-2 text-ink-dim hover:text-ink bg-paper rounded-full border border-line hover:border-brand/50 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold">{stepTitles[currentStep]}</h1>
            </div>
            
            {/* Step indicators - only show when not on start step */}
            {currentStep !== 'start' && (
              <div className="hidden sm:flex items-center gap-2">
                {stepOrder.slice(1).map((step, index) => {
                  const adjustedIndex = index + 1
                  return (
                    <div
                      key={step}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        adjustedIndex <= currentStepIndex
                          ? 'bg-brand text-white'
                          : 'bg-paper border border-line text-ink-dim'
                      }`}
                    >
                      {adjustedIndex}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          
          {/* Progress bar */}
          <div className="w-full bg-paper rounded-full h-2 border border-line">
            <motion.div
              className="bg-brand h-full rounded-full transition-all duration-300"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Step content */}
      <div className="max-w-4xl mx-auto p-6">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {renderStep()}
        </motion.div>
      </div>

      {/* Receipt Scanner Modal */}
      <ReceiptScanner
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onParsed={handleParsed}
      />
    </div>
  )
}