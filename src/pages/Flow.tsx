import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useFlowStore } from '@/lib/flowStore'
import { ReceiptScanner, type ParseResult } from '@/components/ReceiptScanner'
import { BillyAssignScreen } from '@/components/flow/BillyAssignScreen'
import { ShareStep } from '@/components/flow/ShareStep'
import { AddPeopleModal } from '@/components/AddPeopleModal'
import { PeopleDock } from '@/components/PeopleDock'
import { PageContainer } from '@/components/PageContainer'
import { SplashScreen } from '@/components/SplashScreen'
import { createBillFromParse, fetchBillByToken } from '@/lib/bills'

export const Flow: React.FC = () => {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [scannerOpen, setScannerOpen] = useState(false)
  const [scannerError, setScannerError] = useState<string>()
  const [addPeopleOpen, setAddPeopleOpen] = useState(false)
  const [isProcessingReceipt, setIsProcessingReceipt] = useState(false)
  const [isLoadingBill, setIsLoadingBill] = useState(false)
  
  const {
    bill,
    items,
    people,
    currentStep,
    setStep,
    setBillMeta,
    replaceItems,
    addPerson,
    setPeople,
    assign
  } = useFlowStore()

  // Load existing bill data when token is provided
  useEffect(() => {
    if (token && !bill && items.length === 0) {
      loadExistingBill(token)
    }
  }, [token, bill, items.length])

  const loadExistingBill = async (billToken: string) => {
    setIsLoadingBill(true)
    try {
      console.log('[flow] Loading existing bill:', billToken)
      const responseData = await fetchBillByToken(billToken)
      
      if (responseData && responseData.bill) {
        const billData = responseData.bill
        const items = responseData.items || []
        const people = responseData.people || []
        const shares = responseData.shares || []
        
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
          token: billData.token,
          title: billData.title || 'Untitled Bill',
          place: billData.place || undefined,
          date: billData.date || undefined,
          total: billData.total_amount || undefined
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

        // Go to assignment step
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
      // Create bill via server API (respects VITE_ALLOW_LOCAL_FALLBACK)
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
      
      // Close scanner and immediately go to assignment screen
      setScannerOpen(false)
      setStep('assign')
      setIsProcessingReceipt(false)
      
      // Navigate to the bill assignment route if we have a real bill ID
      if (!billId.startsWith('local-')) {
        navigate(`/bill/${billId}`)
      }
      
    } catch (error) {
      setIsProcessingReceipt(false)
      console.error('[flow] Failed to create bill:', error)
      // Set scanner error instead of throwing - show safe substring
      let errorMessage = 'Failed to save your bill. Please try again.'
      
      if (error instanceof Error) {
        // Extract safe substring from server error message
        const serverMessage = error.message
        if (serverMessage.includes('not configured')) {
          errorMessage = 'Service not configured. Please try again later.'
        } else if (serverMessage.includes('network') || serverMessage.includes('timeout')) {
          errorMessage = 'Network error. Please check your connection.'
        } else if (serverMessage.length > 0 && serverMessage.length < 100) {
          // Use server message if it's reasonable length and looks safe
          errorMessage = serverMessage
        }
      }
      
      setScannerError(errorMessage)
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
    // Show loading state while processing receipt
    if (isProcessingReceipt) {
      return (
        <PageContainer variant="hero">
          <div className="text-center space-y-6">
            <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
            <h2 className="text-xl font-bold text-text-primary">Processing your receipt...</h2>
            <p className="text-text-secondary">Preparing your items for assignment</p>
          </div>
        </PageContainer>
      )
    }

    // Show loading state while loading existing bill
    if (isLoadingBill) {
      return (
        <PageContainer variant="hero">
          <div className="text-center space-y-6">
            <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
            <h2 className="text-xl font-bold text-text-primary">Loading your bill...</h2>
            <p className="text-text-secondary">Getting your items and people ready</p>
          </div>
        </PageContainer>
      )
    }
    
    // Show Billy welcome screen if no bill + no items
    if (isEmpty) {
      return <SplashScreen onScanReceipt={handleScanPress} />
    }
    
    // Show step-based flow when we have data
    switch (currentStep) {
      case 'start':
        return (
          <PageContainer className="py-8">
            <div className="text-center space-y-8">
              <h1 className="text-3xl font-bold text-text-primary">Items</h1>
              <div className="space-y-2 max-w-md mx-auto">
                {items.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-surface rounded-lg border border-border">
                    <span className="font-medium text-text-primary">{item.label || 'Untitled Item'}</span>
                    <span className="font-semibold text-text-primary">${item.price.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={handleAssignPress}
                className="px-8 py-3 bg-primary hover:bg-primary-hover text-white rounded-xl font-semibold transition-all duration-200 hover:opacity-90"
              >
                Assign Items
              </button>
            </div>
          </PageContainer>
        )
      case 'people':
        return (
          <PageContainer className="py-8">
            <div className="text-center space-y-8">
              <h1 className="text-3xl font-bold text-text-primary">Add People</h1>
              <button
                onClick={() => setAddPeopleOpen(true)}
                className="px-6 py-3 bg-primary hover:bg-primary-hover text-white rounded-xl font-semibold transition-all duration-200 hover:opacity-90"
              >
                Add People
              </button>
            
              {people.length > 0 && (
                <div className="max-w-md mx-auto">
                  <PeopleDock billToken={bill?.token} />
                </div>
              )}
            
              <button
                onClick={handleNext}
                disabled={people.length === 0}
                className={`px-8 py-3 rounded-xl font-semibold transition-all duration-200 ${
                  people.length > 0 
                    ? 'bg-primary hover:bg-primary-hover text-white hover:opacity-90' 
                    : 'bg-primary/30 text-white/70 cursor-not-allowed'
                }`}
              >
                Continue
              </button>
            </div>
          </PageContainer>
        )
      case 'assign':
        return <BillyAssignScreen onNext={handleNext} onBack={handleBack} />
      case 'share':
        return <ShareStep onPrev={handlePrev} onBack={handleBack} />
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-col">
      {/* Simple header - only show back button when not empty and not on start */}
      {!isEmpty && currentStep !== 'start' && (
        <div className="bg-surface border-b border-border">
          <div className="max-w-4xl mx-auto p-4">
            <button
              onClick={handleBack}
              className="p-2 text-text-secondary hover:text-text-primary bg-background rounded-full border border-border hover:border-primary/50 transition-opacity duration-150 ease-out hover:opacity-75 motion-reduce:transition-none"
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
        externalError={scannerError}
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