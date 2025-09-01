import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useFlowStore } from '@/lib/flowStore'
import { ReceiptScanner, type ParseResult } from '@/components/ReceiptScanner'
import { AssignStep } from '@/components/flow/AssignStep'
import { ShareStep } from '@/components/flow/ShareStep'
import { AddPeopleModal } from '@/components/AddPeopleModal'
import { PeopleDock } from '@/components/PeopleDock'
import { createBillFromParse } from '@/lib/bills'

type FlowState = 'start' | 'people' | 'assign' | 'share'

export const Flow: React.FC = () => {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [scannerOpen, setScannerOpen] = useState(false)
  const [addPeopleOpen, setAddPeopleOpen] = useState(false)
  
  const {
    bill,
    items,
    people,
    currentStep,
    setStep,
    setBillMeta,
    replaceItems,
    upsertBillToken,
    addPerson,
    setPeople
  } = useFlowStore()

  // Check if we have empty state (no bill + no items)
  const isEmpty = !bill && items.length === 0

  const handleScanPress = () => {
    setScannerOpen(true)
  }

  const handleParsed = async (result: ParseResult) => {
    console.info('[flow] Receipt parsed, creating bill...')
    
    try {
      // Create bill in Supabase/localStorage
      const billId = await createBillFromParse(result)
      console.info(`[flow] Bill created with ID: ${billId}`)
      
      // Replace store items and set meta using helpers
      const flowItems = result.items.map(item => ({
        id: item.id,
        label: item.label,
        price: item.price,
        emoji: item.emoji || '🍽️'
      }))
      replaceItems(flowItems)
      
      // Set bill metadata using helper
      setBillMeta({
        token: billId,
        title: result.place || 'Scanned Receipt',
        place: result.place || null,
        date: result.date || null,
        subtotal: result.subtotal || undefined,
        tax: result.tax || undefined,
        tip: result.tip || undefined,
        total: result.total || undefined
      })
      
      // Ensure at least one person for assignment
      if (people.length === 0) {
        addPerson({
          id: 'you',
          name: 'You'
        })
      }
      
      // Close scanner and navigate to the assignment screen
      setScannerOpen(false)
      
      // Navigate to the bill assignment route
      navigate(`/bill/${billId}`)
      setStep('assign')
      
    } catch (error) {
      console.error('[flow] Failed to create bill:', error)
      
      // Fallback to local flow without navigation
      const flowItems = result.items.map(item => ({
        id: item.id,
        label: item.label,
        price: item.price,
        emoji: item.emoji || '🍽️'
      }))
      replaceItems(flowItems)
      
      setBillMeta({
        token: token || `local-${Date.now()}`,
        title: result.place || 'Scanned Receipt',
        place: result.place || null,
        date: result.date || null,
        subtotal: result.subtotal || undefined,
        tax: result.tax || undefined,
        tip: result.tip || undefined,
        total: result.total || undefined
      })
      
      if (people.length === 0) {
        addPerson({
          id: 'you',
          name: 'You'
        })
      }
      
      setScannerOpen(false)
      setStep('assign')
    }
  }
  
  const handleAssignPress = () => {
    if (people.length === 0) {
      addPerson({
        id: 'you',
        name: 'You'
      })
    }
    setStep('assign')
  }
  
  const handleAddPeople = (newPeople: Array<{id: string, name: string, avatar?: string, color: string}>) => {
    // Convert to FlowPerson format and add to store
    const flowPeople = newPeople.map(person => ({
      id: person.id,
      name: person.name,
      avatar: person.avatar
    }))
    setPeople([...people, ...flowPeople])
    setAddPeopleOpen(false)
  }

  const handleBack = () => {
    navigate('/bills')
  }

  const handleNext = () => {
    if (currentStep === 'start') {
      setStep('people')
    } else if (currentStep === 'people') {
      setStep('assign')
    } else if (currentStep === 'assign') {
      setStep('share')
    }
  }

  const handlePrev = () => {
    if (currentStep === 'people') {
      setStep('start')
    } else if (currentStep === 'assign') {
      setStep('people')
    } else if (currentStep === 'share') {
      setStep('assign')
    }
  }

  const renderContent = () => {
    // Show empty state hero if no bill + no items
    if (isEmpty) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-safe">
          <div className="w-full max-w-md mx-auto text-center space-y-6">
            <h1 className="text-2xl font-semibold">Split Your Bill</h1>
            <button
              onClick={handleScanPress}
              className="w-full max-w-[320px] py-4 bg-brand hover:bg-brand/90 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
            >
              Scan Receipt
            </button>
          </div>
        </div>
      )
    }
    
    // Show step-based flow when we have data
    switch (currentStep) {
      case 'start':
        return (
          <div className="max-w-2xl mx-auto p-6">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-semibold mb-6">Items</h1>
              <div className="space-y-2 mb-8">
                {items.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-card rounded-lg">
                    <span className="font-medium">{item.label || 'Untitled Item'}</span>
                    <span className="font-semibold">${item.price.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={handleAssignPress}
                className="px-8 py-3 bg-brand hover:bg-brand/90 text-white rounded-lg font-medium transition-colors"
              >
                Assign Items
              </button>
            </div>
          </div>
        )
      case 'people':
        return (
          <div className="max-w-2xl mx-auto p-6">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-semibold mb-6">Add People</h1>
              <button
                onClick={() => setAddPeopleOpen(true)}
                className="px-6 py-3 bg-brand hover:bg-brand/90 text-white rounded-lg font-medium transition-colors mb-6"
              >
                Add People
              </button>
            </div>
            
            {people.length > 0 && (
              <div className="mb-8">
                <PeopleDock billToken={bill?.token} />
              </div>
            )}
            
            <div className="text-center">
              <button
                onClick={handleNext}
                disabled={people.length === 0}
                className={`px-8 py-3 rounded-lg font-medium transition-colors ${
                  people.length > 0 
                    ? 'bg-brand hover:bg-brand/90 text-white' 
                    : 'bg-brand/30 text-white/70 cursor-not-allowed'
                }`}
              >
                Continue
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
      {/* Simple header - only show back button when not empty and not on start */}
      {!isEmpty && currentStep !== 'start' && (
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
        onOpenChange={setScannerOpen}
        onParsed={handleParsed}
      />
      
      {/* Add People Modal */}
      <AddPeopleModal
        isOpen={addPeopleOpen}
        onClose={() => setAddPeopleOpen(false)}
        onAddPeople={handleAddPeople}
        existingPeople={people.map(p => ({...p, color: 'bg-blue-500'}))}
      />
    </div>
  )
}