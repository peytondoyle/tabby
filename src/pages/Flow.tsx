import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useFlowStore } from '@/lib/flowStore'
import { LazyReceiptScanner } from '@/components/ReceiptScanner/LazyReceiptScanner'
import type { ParseResult } from '@/lib/receiptScanning'
import { SimpleTabbyScreen } from '@/components/flow/SimpleTabbyScreen'
import { KeyboardFlow } from '@/components/flow/KeyboardFlow'
import { ShareStep } from '@/components/flow/ShareStep'
import { AddPeopleModal } from '@/components/AddPeopleModal'
import { PeopleDock } from '@/components/PeopleDock'
import { HomeButton } from '@/components/HomeButton'
// Removed PageContainer import - using full-width layout
import { SplashScreen } from '@/components/SplashScreen'
import { fetchReceiptByToken, createReceipt, buildCreatePayload } from '@/lib/receipts'
import { isLocalId } from '@/lib/id'
import { Button } from "@/components/design-system";
import { logServer } from '@/lib/errorLogger'
// import { useReducedMotion } from '@/lib/accessibility'
import { flowItemToItem } from '@/lib/types'
// import { cleanupOldFlowStates } from '@/lib/flowPersistence' // DISABLED

// Performance optimization imports
import VirtualizedListErrorBoundary from '@/components/ErrorBoundary/VirtualizedListErrorBoundary'
import ListSuspenseWrapper from '@/components/Suspense/ListSuspenseWrapper'
import { deviceDetector } from '@/lib/deviceCapabilities'

export const Flow: React.FC = () => {
  const { token, step } = useParams<{ token: string, step?: string }>()
  const navigate = useNavigate()
  const [scannerOpen, setScannerOpen] = useState(false)
  const [scannerError, setScannerError] = useState<string>()
  const [addPeopleOpen, setAddPeopleOpen] = useState(false)
  const [isProcessingReceipt, setIsProcessingReceipt] = useState(false)
  const [isLoadingBill, setIsLoadingBill] = useState(false)
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [useKeyboardNavigation, setUseKeyboardNavigation] = useState(false)

  // Device capability detection for performance optimization
  const device = deviceDetector.detect()

  // DISABLED - Clean up old states on component mount
  // useEffect(() => {
  //   cleanupOldFlowStates()
  // }, [])

  // const _prefersReducedMotion = useReducedMotion()

  // Use shallow comparison for objects to prevent unnecessary re-renders
  const bill = useFlowStore(state => state.bill)
  const items = useFlowStore(state => state.items)
  const people = useFlowStore(state => state.people)
  const currentStep = useFlowStore(state => state.currentStep)

  // Get functions separately (they're stable references)
  const setStep = useFlowStore(state => state.setStep)
  const setBillMeta = useFlowStore(state => state.setBillMeta)
  const replaceItems = useFlowStore(state => state.replaceItems)
  const addPerson = useFlowStore(state => state.addPerson)
  const setPeople = useFlowStore(state => state.setPeople)
  const assign = useFlowStore(state => state.assign)
  const getItemAssignments = useFlowStore(state => state.getItemAssignments)
  const computeTotals = useFlowStore(state => state.computeTotals)
  // DISABLED - Persistence functions
  // const saveState = useFlowStore(state => state.saveState)
  // const loadState = useFlowStore(state => state.loadState)
  // const clearSavedState = useFlowStore(state => state.clearSavedState)

  // Keyboard navigation handlers
  const handleToggleItemSelection = (item: any, _index: number) => {
    setSelectedItems(prev => {
      const isSelected = prev.includes(item.id)
      if (isSelected) {
        return prev.filter(id => id !== item.id)
      } else {
        return [...prev, item.id]
      }
    })
  }

  const handleClearSelection = () => {
    setSelectedItems([])
  }

  const handleAssignItem = (itemId: string, personId: string) => {
    assign(itemId, personId, 1)
  }

  const handleUnassignItem = (itemId: string, personId: string) => {
    // This would need to be implemented in the store
    console.log('Unassign item', itemId, personId)
  }

  const handlePersonClick = (person: any) => {
    console.log('Person clicked', person)
  }

  const handlePersonTotalClick = (person: any) => {
    console.log('Person total clicked', person)
  }

  // Compute totals for keyboard flow
  const billTotals = computeTotals()
  const personTotals = people.map(person => ({
    personId: person.id,
    personName: person.name,
    name: person.name,
    total: billTotals.personTotals[person.id] || 0,
    subtotal: billTotals.personTotals[person.id] || 0,
    tax_share: 0,
    tip_share: 0
  }))

  // COMPLETELY DISABLED - All persistence and URL sync
  // Focus on just getting the app working without infinite loops

  // Load existing bill only if we have a token and no items
  useEffect(() => {
    if (token && items.length === 0 && !bill) {
      loadExistingBill(token)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]) // Only run when token changes



  const loadExistingBill = async (billToken: string) => {
    // Guard against local IDs
    if (!billToken || isLocalId(billToken)) {
      console.log('[flow] Skipping local ID:', billToken)
      return
    }
    
    setIsLoadingBill(true)
    try {
      console.log('[flow] Loading existing bill:', billToken)
      const responseData = await fetchReceiptByToken(billToken)
      
      if (responseData && typeof responseData === 'object' && 'bill' in responseData && responseData.bill) {
        const billData = responseData.bill as any
        const items = (responseData as any).items || []
        const people = (responseData as any).people || []
        const shares = (responseData as any).shares || []
        
        console.log('[flow] Bill data loaded:', {
          bill: billData.title,
          itemsCount: items.length,
          peopleCount: people.length,
          sharesCount: shares.length
        })
        
        // Clear existing data first
        replaceItems([])
        setPeople([])
        
        // Set bill metadata
        setBillMeta({
          token: String(billData.token || ''),
          title: String(billData.title || 'Untitled Bill'),
          place: billData.place ? String(billData.place) : undefined,
          date: billData.date ? String(billData.date) : undefined,
          total: typeof billData.total_amount === 'number' ? billData.total_amount : undefined
        })

        // Load items
        if (items.length > 0) {
          const flowItems = items.map((item: any) => ({
            id: item.id,
            label: item.label,
            price: item.price,
            emoji: item.emoji || '🍽️',
            quantity: item.quantity || 1
          }))
          console.log('[flow] Loading items:', flowItems)
          replaceItems(flowItems)
        } else {
          console.warn('[flow] No items found in bill data')
        }

        // Load people
        if (people.length > 0) {
          const flowPeople = people.map((person: any) => ({
            id: person.id,
            name: person.name,
            avatar: person.avatar_url
          }))
          console.log('[flow] Loading people:', flowPeople)
          setPeople(flowPeople)
        } else {
          console.warn('[flow] No people found in bill data')
        }

        // Load assignments
        shares.forEach((share: any) => {
          assign(share.item_id, share.person_id)
        })

        // Simply set the step without navigating
        setStep('assign')
        console.log('[flow] Bill loaded successfully, moved to assign step')
      } else {
        console.error('Bill not found:', billToken)
        // Navigate back to bills list if bill not found
        navigate('/bills')
      }
    } catch (error) {
      console.error('Error loading bill:', error)
      navigate('/bills')
    } finally {
      setIsLoadingBill(false)
    }
  }

  // Check if we have empty state (no bill + no items)
  // Also check if we're currently scanning or processing to avoid showing empty state during processing
  const isEmpty = !bill && items.length === 0 && !scannerOpen && !isProcessingReceipt && !isLoadingBill

  const handleScanPress = () => {
    setScannerError(undefined)
    setScannerOpen(true)
  }

  const handleParsed = async (result: ParseResult) => {
    console.info('[flow] Receipt parsed, creating bill...')
    setIsProcessingReceipt(true)
    
    try {
      // Create bill via server API using new schema-aligned functions
      const payload = buildCreatePayload(result)
      const { id: billId } = await createReceipt(payload)
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
        place: result.place || undefined,
        date: result.date || undefined,
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
      
      // Close scanner and navigate to assignment screen
      setScannerOpen(false)
      setIsProcessingReceipt(false)

      // Simply set the step, no URL navigation yet
      setStep('assign')

      // DISABLED - Save the state
      // if (!billId.startsWith('local-')) {
      //   setTimeout(() => {
      //     saveState(billId)
      //     // Navigate after saving
      //     navigate(`/bill/${billId}/assign`)
      //   }, 100)
      // }
      
    } catch (error) {
      setIsProcessingReceipt(false)
      const msg = error instanceof Error ? error.message : 'Request validation failed'
      logServer('warn', 'bill_create_failed', { msg })
      setScannerError(`Bill creation failed: ${msg}`)
      console.error('[flow] Bill creation failed:', error)
      logServer('error', 'Failed to create bill', { error, context: 'Flow.handleParsed' })
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

    // DISABLED - Save state after navigation
    // if (token) {
    //   setTimeout(() => saveState(token), 100)
    // }
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
    // Simple step progression
    if (currentStep === 'start') {
      setStep('people')
    } else if (currentStep === 'people') {
      setStep('review')
    } else if (currentStep === 'review') {
      setStep('assign')
    } else if (currentStep === 'assign') {
      setStep('share')
    }

    // DISABLED - Save state after navigation
    // if (token) {
    //   setTimeout(() => saveState(token), 100)
    // }
  }

  const handlePrev = () => {
    // Simple step navigation backwards
    if (currentStep === 'people') {
      setStep('start')
    } else if (currentStep === 'review') {
      setStep('people')
    } else if (currentStep === 'assign') {
      setStep('review')
    } else if (currentStep === 'share') {
      setStep('assign')
    }

    // DISABLED - Save state after navigation
    // if (token) {
    //   setTimeout(() => saveState(token), 100)
    // }
  }

  const renderContent = () => {
    // Show loading state while processing receipt
    if (isProcessingReceipt) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-text-primary">
          <div className="text-center space-y-6">
            <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
            <h2 className="text-xl font-bold text-text-primary">Processing your receipt...</h2>
            <p className="text-text-secondary">Preparing your items for assignment</p>
          </div>
        </div>
      )
    }

    // Show loading state while loading existing bill
    if (isLoadingBill) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-text-primary">
          <div className="text-center space-y-6">
            <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
            <h2 className="text-xl font-bold text-text-primary">Loading your bill...</h2>
            <p className="text-text-secondary">Getting your items and people ready</p>
          </div>
        </div>
      )
    }
    
    // Show Tabby welcome screen if no bill + no items
    if (isEmpty) {
      return <SplashScreen onScanReceipt={handleScanPress} />
    }
    
    // Show step-based flow when we have data
    switch (currentStep) {
      case 'start':
        // Skip the old Items view and go directly to Assign
        return (
          <div className="space-y-4">
            {/* Keyboard Navigation Toggle */}
            <div className="flex justify-center">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setUseKeyboardNavigation(!useKeyboardNavigation)}
                className="mb-4"
              >
                {useKeyboardNavigation ? 'Switch to Mouse Mode' : 'Switch to Keyboard Mode'}
              </Button>
            </div>
            
            {/* Wrap assignment components with error boundaries and suspense */}
            <VirtualizedListErrorBoundary 
              listType="item-list"
              onError={(error, errorInfo) => {
                console.error('[flow] Assignment step error:', error, errorInfo)
                logServer('error', 'Assignment step error', { 
                  error: error.message, 
                  stack: error.stack,
                  device: device,
                  step: 'assign'
                })
              }}
            >
              <ListSuspenseWrapper listType="item-list">
                {useKeyboardNavigation ? (
                  <KeyboardFlow
                    items={items.map(item => flowItemToItem(item, 'bill-id'))}
                    people={people}
                    personTotals={personTotals}
                    billTotals={billTotals}
                    selectedItems={selectedItems}
                    onToggleItemSelection={handleToggleItemSelection}
                    onClearSelection={handleClearSelection}
                    onAssignItem={handleAssignItem}
                    onUnassignItem={handleUnassignItem}
                    onPersonClick={handlePersonClick}
                    onPersonTotalClick={handlePersonTotalClick}
                    getItemAssignments={getItemAssignments}
                  />
                ) : (
                  <SimpleTabbyScreen onNext={handleNext} onBack={handleBack} />
                )}
              </ListSuspenseWrapper>
            </VirtualizedListErrorBoundary>
          </div>
        )
      case 'people':
        return (
          <div className="w-full py-8">
            <div className="text-center space-y-8">
              <h1 className="text-3xl font-bold text-text-primary">Add People</h1>
              <Button onClick={() => setAddPeopleOpen(true)}>
                Add People
              </Button>
            
              {people.length > 0 && (
                <div className="w-full">
                  <PeopleDock billToken={bill?.token} />
                </div>
              )}
            
              <Button 
                onClick={handleNext}
                disabled={people.length === 0}
              >
                Continue
              </Button>
            </div>
          </div>
        )
      case 'review':
        return (
          <div className="w-full py-8">
            <div className="text-center space-y-8">
              <h1 className="text-3xl font-bold text-text-primary">Review Items</h1>
              <div className="space-y-2 w-full">
                {items.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-surface rounded-lg border border-border">
                    <span className="font-medium text-text-primary">{item.label || 'Untitled Item'}</span>
                    <span className="font-semibold text-text-primary">${item.price.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-4 justify-center">
                <Button variant="secondary" onClick={handlePrev}>
                  Back
                </Button>
                <Button onClick={handleNext}>
                  Continue to Assign
                </Button>
              </div>
            </div>
          </div>
        )
      case 'assign':
        return (
          <div className="space-y-4">
            {/* Keyboard Navigation Toggle */}
            <div className="flex justify-center">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setUseKeyboardNavigation(!useKeyboardNavigation)}
                className="mb-4"
              >
                {useKeyboardNavigation ? 'Switch to Mouse Mode' : 'Switch to Keyboard Mode'}
              </Button>
            </div>
            
            {/* Wrap assignment components with error boundaries and suspense */}
            <VirtualizedListErrorBoundary 
              listType="item-list"
              onError={(error, errorInfo) => {
                console.error('[flow] Assignment step error:', error, errorInfo)
                logServer('error', 'Assignment step error', { 
                  error: error.message, 
                  stack: error.stack,
                  device: device,
                  step: 'assign'
                })
              }}
            >
              <ListSuspenseWrapper listType="item-list">
                {useKeyboardNavigation ? (
                  <KeyboardFlow
                    items={items.map(item => flowItemToItem(item, 'bill-id'))}
                    people={people}
                    personTotals={personTotals}
                    billTotals={billTotals}
                    selectedItems={selectedItems}
                    onToggleItemSelection={handleToggleItemSelection}
                    onClearSelection={handleClearSelection}
                    onAssignItem={handleAssignItem}
                    onUnassignItem={handleUnassignItem}
                    onPersonClick={handlePersonClick}
                    onPersonTotalClick={handlePersonTotalClick}
                    getItemAssignments={getItemAssignments}
                  />
                ) : (
                  <SimpleTabbyScreen onNext={handleNext} onBack={handleBack} />
                )}
              </ListSuspenseWrapper>
            </VirtualizedListErrorBoundary>
          </div>
        )
      case 'share':
        return (
          <VirtualizedListErrorBoundary 
            listType="dnd-container"
            onError={(error, errorInfo) => {
              console.error('[flow] Share step error:', error, errorInfo)
              logServer('error', 'Share step error', { 
                error: error.message, 
                stack: error.stack,
                device: device,
                step: 'share'
              })
            }}
          >
            <ListSuspenseWrapper listType="dnd-container">
              <ShareStep onPrev={handlePrev} onBack={handleBack} />
            </ListSuspenseWrapper>
          </VirtualizedListErrorBoundary>
        )
      default:
        return null
    }
  }

  return (
    <main className="page-shell">
      <HomeButton />
      {/* Simple header - only show back button when not empty and not on start */}
      {!isEmpty && currentStep !== 'start' && (
        <div className="sticky-bar">
          <div className="w-full p-4">
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1">
        {renderContent()}
      </div>

      {/* Receipt Scanner Modal */}
      <LazyReceiptScanner
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onParsed={handleParsed}
        externalError={scannerError}
      />
      
      {/* Add People Modal */}
      <AddPeopleModal
        isOpen={addPeopleOpen}
        onClose={() => setAddPeopleOpen(false)}
        onAddPeople={handleAddPeople}
        existingPeople={people.map(p => ({...p, color: 'bg-blue-500'}))}
      />
    </main>
  )
}
