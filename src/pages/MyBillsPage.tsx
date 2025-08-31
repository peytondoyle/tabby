import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { supabase, isSupabaseAvailable } from '@/lib/supabaseClient'
import { ReceiptScanner } from '@/components/ReceiptScanner'
import type { ParseResult } from '@/lib/receiptScanning'
import { useFlowStore } from '@/lib/flowStore'
// import { OnboardingFlow } from '@/components/OnboardingFlow'
import { getCurrentDate } from '@/lib/receiptScanning'
import { fetchBills } from '@/lib/bills'

// Use BillSummary as the main type for bills

interface NewBillModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (title: string, place: string) => void
}

const NewBillModal: React.FC<NewBillModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [title, setTitle] = useState('')
  const [place, setPlace] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (title.trim()) {
      onCreate(title.trim(), place.trim())
      setTitle('')
      setPlace('')
      onClose()
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-card text-ink rounded-3xl w-full max-w-md p-6 border-2 border-line shadow-pop retro-shadow"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold mb-6 text-center retro-text-shadow">✨ Create New Bill</h2>
            
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-ink-dim mb-2 font-mono">
                    🏪 Restaurant/Place *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Chick-fil-A, Mom's Kitchen"
                    className="w-full p-3 bg-paper border-2 border-line text-ink rounded-xl focus:ring-2 focus:ring-brand/30 focus:border-brand placeholder-ink-dim pixel-perfect"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-ink-dim mb-2 font-mono">
                    📍 Location (Optional)
                  </label>
                  <input
                    type="text"
                    value={place}
                    onChange={(e) => setPlace(e.target.value)}
                    placeholder="e.g., Downtown, 123 Main St"
                    className="w-full p-3 bg-paper border-2 border-line text-ink rounded-xl focus:ring-2 focus:ring-brand/30 focus:border-brand placeholder-ink-dim pixel-perfect"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <motion.button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 border-2 border-line text-ink-dim rounded-xl font-bold hover:bg-paper transition-all retro-shadow pixel-perfect"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  ❌ Cancel
                </motion.button>
                <motion.button
                  type="submit"
                  className="flex-1 py-3 bg-brand hover:bg-brand/90 text-white rounded-xl font-bold transition-all shadow-pop retro-shadow pixel-perfect"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  ✨ Create Bill
                </motion.button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export const MyBillsPage: React.FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { setItems, setBill } = useFlowStore()
  const [showNewBillModal, setShowNewBillModal] = useState(false)
  const [showReceiptScanner, setShowReceiptScanner] = useState(false)
  const [showSyncBanner, setShowSyncBanner] = useState(false)


  // Query to fetch all bills using the centralized fetchBills utility
  const { data: bills = [], isLoading } = useQuery({
    queryKey: ['my-bills'],
    queryFn: async () => {
      if (!isSupabaseAvailable()) {
        // Load bills from localStorage (for scanned receipts) and include mock bills
        const localBillsJson = localStorage.getItem('local-bills')
        const localBills = JSON.parse(localBillsJson || '[]')
        
        const mockBills = [
          {
            id: '1',
            token: 'e047f028995f1775e49463406db9943d',
            title: 'Tabby Test Bill',
            place: 'Billy\'s Cafe',
            date: '2025-08-24',
            created_at: '2025-08-24T12:00:00Z',
            item_count: 6,
            total_amount: 78.36,
            people_count: 3
          }
        ]
        
        // Combine local bills (scanned) with mock bills  
        const allBills = [...localBills, ...mockBills]
        return allBills
      }

      // Use the centralized fetchBills utility
      return await fetchBills(supabase!)
    }
  })

  // Mutation to create new bill
  const createBillMutation = useMutation({
    mutationFn: async ({ title, place }: { title: string, place: string }) => {
      if (!isSupabaseAvailable()) {
        console.warn('Supabase not available - returning mock token')
        return { token: 'mock-' + Date.now() }
      }

      const { data, error } = await supabase!.rpc('create_bill', {
        title,
        place: place || null,
        date: getCurrentDate().iso,
        sales_tax: 0,
        tip: 0,
        tax_split_method: 'proportional',
        tip_split_method: 'proportional'
      })

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['my-bills'] })
      navigate(`/bill/${data.token}/flow`)
    }
  })

  const handleCreateBill = (title: string, place: string) => {
    createBillMutation.mutate({ title, place })
  }


  const handleParsed = (result: ParseResult) => {
    // Set items from scan result in flow store, converting to FlowItem format
    const flowItems = result.items.map(item => ({
      id: item.id,
      label: item.label,
      price: item.price,
      emoji: item.emoji || undefined
    }))
    setItems(flowItems)
    
    // Set bill info if available
    if (result.place || result.date) {
      const token = `scanned-${Date.now()}`
      setBill({
        token,
        id: token,
        title: result.place || undefined,
        place: result.place || undefined,
        date: result.date || undefined
      })
      // Navigate to the flow with the new token
      navigate(`/bill/${token}`)
    } else {
      // Navigate to flow with temporary token
      const token = `temp-${Date.now()}`
      setBill({
        token,
        id: token
      })
      navigate(`/bill/${token}`)
    }
  }




  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }


  if (isLoading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-ink font-semibold">Loading your bills...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2 retro-text-shadow">My Bills</h1>
            <p className="text-ink-dim">Manage your bill splitting sessions</p>
          </div>
          
          <motion.button
            onClick={() => setShowReceiptScanner(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-2xl font-bold transition-all shadow-pop retro-shadow pixel-perfect"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            + New Receipt
          </motion.button>
        </div>

        {/* Sync Banner */}
        <AnimatePresence>
          {showSyncBanner && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-6 p-4 bg-yellow-100 border-2 border-yellow-300 rounded-2xl"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div className="flex-1">
                  <p className="text-yellow-800 font-semibold">You're viewing a local copy. Cloud sync will resume automatically.</p>
                </div>
                <button
                  onClick={() => setShowSyncBanner(false)}
                  className="text-yellow-600 hover:text-yellow-800 p-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bills List */}
        {bills.length > 0 ? (
          <div className="space-y-2">
            {bills.map((bill, index) => (
              <motion.div
                key={bill.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-card rounded-xl p-4 border border-line hover:border-brand/50 hover:shadow-md transition-all cursor-pointer group"
                onClick={() => navigate(`/bill/${bill.token}/flow`)}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-ink group-hover:text-brand transition-colors">
                      {bill.title}
                    </h3>
                    <p className="text-sm text-ink-dim">
                      {formatDate(bill.date)}
                    </p>
                  </div>
                  <svg 
                    className="w-5 h-5 text-ink-dim group-hover:text-brand transition-colors" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          // Empty State
          <motion.div 
            className="text-center py-16"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div 
              className="text-8xl mb-6"
              animate={{ 
                rotate: [0, 10, -10, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                repeatType: "reverse"
              }}
            >
              🎮📋✨
            </motion.div>
            <h2 className="text-3xl font-bold mb-3 retro-text-shadow">No Bills Yet</h2>
            <p className="text-ink-dim mb-8 text-lg font-mono">Create your first bill to start splitting costs with friends!</p>
            
            <motion.button
              onClick={() => setShowReceiptScanner(true)}
              className="flex items-center gap-3 px-8 py-4 bg-brand hover:bg-brand/90 text-white rounded-2xl font-bold transition-all shadow-pop retro-shadow pixel-perfect mx-auto"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0118.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              + New Receipt
            </motion.button>
          </motion.div>
        )}
      </div>

      {/* New Bill Modal */}
      <NewBillModal
        isOpen={showNewBillModal}
        onClose={() => setShowNewBillModal(false)}
        onCreate={handleCreateBill}
      />

      {/* Receipt Scanner */}
      <ReceiptScanner
        open={showReceiptScanner}
        onOpenChange={setShowReceiptScanner}
        onParsed={handleParsed}
      />

      {/* Onboarding Flow - temporarily commented out for debugging */}
      {/*
      <OnboardingFlow
        isOpen={showOnboarding}
        onClose={() => {
          setShowOnboarding(false)
          localStorage.setItem('tabby-onboarding-seen', 'true')
          setHasSeenOnboarding(true)
        }}
        onComplete={() => console.log('TODO')}
      />
      */}


    </div>
  )
}