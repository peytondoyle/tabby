import React, { useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useFlowStore, type FlowStep } from '@/lib/flowStore'

// Step components (to be created)
import { StartStep } from '@/components/flow/StartStep'
import { PeopleStep } from '@/components/flow/PeopleStep'
import { ReviewItemsStep } from '@/components/flow/ReviewItemsStep'
import { AssignStep } from '@/components/flow/AssignStep'
import { ShareStep } from '@/components/flow/ShareStep'

const stepTitles: Record<FlowStep, string> = {
  start: 'Scan Receipt',
  people: 'Add People',
  review: 'Review Items', 
  assign: 'Assign Items',
  share: 'Share the Bill'
}

const stepOrder: FlowStep[] = ['start', 'people', 'review', 'assign', 'share']

export const Flow: React.FC = () => {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  
  const {
    currentStep,
    setStep,
    setBill
  } = useFlowStore()

  // Get step from URL query or default to 'start'
  const urlStep = searchParams.get('step') as FlowStep || 'start'

  // Sync store step with URL step
  useEffect(() => {
    if (stepOrder.includes(urlStep)) {
      setStep(urlStep)
    } else {
      // Invalid step, redirect to start
      setSearchParams({ step: 'start' })
    }
  }, [urlStep, setStep, setSearchParams])

  // Initialize bill data when component mounts
  useEffect(() => {
    if (token) {
      setBill({ token, id: token })
    }
    
    // Clean up when component unmounts or token changes
    return () => {
      // Don't reset on unmount to preserve state during navigation
    }
  }, [token, setBill])

  const navigateToStep = (step: FlowStep) => {
    setSearchParams({ step })
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

  const handleBack = () => {
    navigate('/bills')
  }

  const renderStep = () => {
    switch (currentStep) {
      case 'start':
        return <StartStep onNext={handleNext} />
      case 'people':
        return <PeopleStep onNext={handleNext} onPrev={handlePrev} />
      case 'review':
        return <ReviewItemsStep onNext={handleNext} onPrev={handlePrev} />
      case 'assign':
        return <AssignStep onNext={handleNext} onPrev={handlePrev} />
      case 'share':
        return <ShareStep onPrev={handlePrev} onBack={handleBack} />
      default:
        return <StartStep onNext={handleNext} />
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
            
            {/* Step indicators */}
            <div className="hidden sm:flex items-center gap-2">
              {stepOrder.map((step, index) => (
                <div
                  key={step}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    index <= currentStepIndex
                      ? 'bg-brand text-white'
                      : 'bg-paper border border-line text-ink-dim'
                  }`}
                >
                  {index + 1}
                </div>
              ))}
            </div>
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
    </div>
  )
}