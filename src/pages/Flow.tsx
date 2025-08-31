import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useFlowStore } from '@/lib/flowStore'
import { ReceiptScanner, type ParseResult } from '@/components/ReceiptScanner'
import { AssignStep } from '@/components/flow/AssignStep'
import { ShareStep } from '@/components/flow/ShareStep'

type FlowState = 'start' | 'scanning' | 'assign' | 'share'

export const Flow: React.FC = () => {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [state, setState] = useState<FlowState>('start')
  const [scannerOpen, setScannerOpen] = useState(false)
  
  // Bootstrap draft on mount
  useEffect(() => {
    if (token && currentDraft?.token !== token) {
      hydrateDraft(token)
    }
  }, [token, currentDraft?.token, hydrateDraft])
  
  // Determine initial state based on draft
  useEffect(() => {
    if (currentDraft && currentDraft.items.length > 0) {
      // Convert draft items to flow items
      const flowItems = currentDraft.items.map(item => ({
        id: item.id,
        label: item.label,
        price: item.price,
        emoji: '🍽️' // Default emoji for draft items
      }))
      setItems(flowItems)
      
      // Set bill info from draft
      setBill({
        token: currentDraft.token,
        id: currentDraft.token,
        title: currentDraft.place,
        place: currentDraft.place,
        date: currentDraft.date
      })
      
      // Ensure at least one person exists for assignment
      if (people.length === 0) {
        addPerson({
          id: 'you',
          name: 'You',
          avatar: undefined
        })
      }
      
      // Jump straight to assign state
      setState('assign')
    }
  }, [currentDraft, setItems, setBill, people.length, addPerson])
  
  const {
    setItems,
    setBill,
    currentDraft,
    hydrateDraft,
    people,
    addPerson
  } = useFlowStore()

  const handleScanPress = () => {
    setState('scanning')
    setScannerOpen(true)
  }

  const handleManualPress = () => {
    // Add a blank item and go to assign step
    const newItem = {
      id: `item-${Date.now()}`,
      label: '',
      price: 0,
      emoji: '🍽️'
    }
    setItems([newItem])
    setState('assign')
  }

  const handleParsed = (result: ParseResult) => {
    // Set items from scan result
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
    
    // Close scanner and advance to assign
    setScannerOpen(false)
    setState('assign')
  }

  const handleBack = () => {
    navigate('/bills')
  }

  const handleNext = () => {
    if (state === 'assign') {
      setState('share')
    }
  }

  const handlePrev = () => {
    if (state === 'assign') {
      setState('start')
    } else if (state === 'share') {
      setState('assign')
    }
  }

  const renderContent = () => {
    switch (state) {
      case 'start':
        return (
          <div className="flex-1 flex flex-col items-center justify-center px-6 pb-safe">
            <div className="w-full max-w-md mx-auto text-center space-y-8">
              {/* Title */}
              <h1 className="text-3xl font-bold text-ink">Split Your Bill</h1>
              
              {/* Primary CTA */}
              <button
                onClick={handleScanPress}
                className="w-[90vw] max-w-[480px] min-h-[56px] bg-brand hover:bg-brand/90 text-white rounded-2xl font-semibold text-lg flex items-center justify-center gap-3 transition-colors px-6 py-4"
              >
                📷 Scan Receipt
              </button>
              
              {/* Secondary CTA */}
              <button
                onClick={handleManualPress}
                className="w-[90vw] max-w-[480px] min-h-[56px] bg-transparent hover:bg-paper text-ink-dim hover:text-ink border border-line hover:border-brand/50 rounded-2xl font-medium text-base transition-all px-6 py-4"
              >
                Enter Manually
              </button>
            </div>
          </div>
        )
      case 'assign':
        return <AssignStep onNext={handleNext} onPrev={handlePrev} />
      case 'share':
        return <ShareStep onPrev={handlePrev} onBack={handleBack} />
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col">
      {/* Simple header - only show back button when not on start */}
      {state !== 'start' && (
        <div className="bg-card border-b border-line">
          <div className="max-w-4xl mx-auto p-4">
            <button
              onClick={handleBack}
              className="p-2 text-ink-dim hover:text-ink bg-paper rounded-full border border-line hover:border-brand/50 transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      {renderContent()}

      {/* Receipt Scanner Modal */}
      <ReceiptScanner
        open={scannerOpen}
        onOpenChange={(open) => {
          setScannerOpen(open)
          if (!open && state === 'scanning') {
            setState('start') // Return to start if scanner closed without completing
          }
        }}
        onParsed={handleParsed}
      />
    </div>
  )
}