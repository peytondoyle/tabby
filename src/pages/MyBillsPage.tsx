import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { isSupabaseAvailable } from '@/lib/supabaseClient'
import { ReceiptScanner } from '@/components/ReceiptScanner'
import type { ParseResult } from '@/lib/receiptScanning'
import { useFlowStore } from '@/lib/flowStore'
import { apiFetch } from '@/lib/apiClient'
// import { OnboardingFlow } from '@/components/OnboardingFlow'
import { getCurrentDate } from '@/lib/receiptScanning'
import { fetchBills, deleteBill, type BillListItem } from '@/lib/bills'
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";

// Toast notification component
const Toast: React.FC<{ message: string; type: 'success' | 'error'; onClose: () => void }> = ({ message, type, onClose }) => (
  <motion.div
    initial={{ opacity: 0, y: -50, scale: 0.9 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: -50, scale: 0.9 }}
    className={`fixed top-4 right-4 z-50 p-4 rounded-xl border border-border transition-all ${
      type === 'success' 
        ? 'bg-success/10 border-success/30 text-success' 
        : 'bg-error/10 border-error/30 text-error'
    }`}
  >
    <div className="flex items-center gap-3">
      <span className="text-xl">{type === 'success' ? '✅' : '❌'}</span>
      <span className="font-semibold font-mono">{message}</span>
      <button onClick={onClose} className="ml-2 text-text-secondary hover:text-text-primary transition-colors">×</button>
    </div>
  </motion.div>
)

// Delete confirmation modal
const DeleteConfirmModal: React.FC<{ 
  isOpen: boolean; 
  billTitle: string; 
  onConfirm: () => void; 
  onCancel: () => void;
  isDeleting: boolean;
}> = ({ isOpen, billTitle, onConfirm, onCancel, isDeleting }) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
        onClick={onCancel}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-surface rounded-2xl w-full max-w-md p-6 border border-border hover:border-primary/50 hover:shadow-md transition-all"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">🗑️</div>
            <h2 className="text-2xl font-bold text-text-primary mb-3">Delete Bill?</h2>
            <p className="text-text-secondary mb-2">
              Are you sure you want to delete <span className="font-semibold text-text-primary">"{billTitle}"</span>?
            </p>
            <p className="text-sm text-error font-mono">⚠️ This action cannot be undone.</p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={isDeleting}
              className="flex-1 py-3 border-2 border-border text-text-secondary rounded-xl font-bold hover:bg-background transition-colors pixel-perfect disabled:opacity-50"
            >
              ❌ Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex-1 py-3 bg-error hover:bg-error/80 text-white rounded-xl font-bold transition-colors pixel-perfect disabled:opacity-50"
            >
              {isDeleting ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Deleting...
                </span>
              ) : (
                '🗑️ Delete'
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
)

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
            className="bg-surface text-text-primary rounded-3xl w-full max-w-md p-6 border-2 border-border shadow-pop retro-shadow"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold mb-6 text-center retro-text-shadow">✨ Create New Bill</h2>
            
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-text-secondary mb-2 font-mono">
                    🏪 Restaurant/Place *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Chick-fil-A, Mom's Kitchen"
                    className="w-full p-3 bg-background border-2 border-border text-text-primary rounded-xl focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder-text-secondary pixel-perfect"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-text-secondary mb-2 font-mono">
                    📍 Location (Optional)
                  </label>
                  <input
                    type="text"
                    value={place}
                    onChange={(e) => setPlace(e.target.value)}
                    placeholder="e.g., Downtown, 123 Main St"
                    className="w-full p-3 bg-background border-2 border-border text-text-primary rounded-xl focus:ring-2 focus:ring-primary/30 focus:border-brand placeholder-text-secondary pixel-perfect"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 border-2 border-border text-text-secondary rounded-xl font-bold hover:bg-background transition-colors retro-shadow pixel-perfect"
                >
                  ❌ Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold transition-colors shadow-pop retro-shadow pixel-perfect"
                >
                  ✨ Create Bill
                </button>
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

  const [showNewBillModal, setShowNewBillModal] = useState(false)
  const [showReceiptScanner, setShowReceiptScanner] = useState(false)
  const [showSyncBanner, setShowSyncBanner] = useState(false)
  
  // Delete functionality state
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; billTitle: string; billToken: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)


  // Query to fetch all bills using the centralized fetchBills utility
  const { data: bills = [], isLoading } = useQuery<BillListItem[]>({
    queryKey: ['my-bills'],
    queryFn: async () => {
      if (!isSupabaseAvailable()) {
        // Only return scanned receipts from localStorage, no mock data
        const localBillsJson = localStorage.getItem('local-bills')
        const localBills = JSON.parse(localBillsJson || '[]')
        
        // Filter to only include scanned receipts (no mock bills)
        return localBills.filter((bill: any) => bill.scanned === true)
      }

      // Use the centralized fetchBills utility
      return await fetchBills()
    }
  })

  // Mutation to create new bill via server API
  const createBillMutation = useMutation({
    mutationFn: async ({ title, place }: { title: string, place: string }) => {
      // Create a ParseResult-like object for the new bill
      const parsed = {
        place: place || title,
        date: getCurrentDate().iso,
        items: [], // Empty items for now
        subtotal: 0,
        tax: 0,
        tip: 0,
        total: 0
      }

      const response = await apiFetch('/api/bills/create', {
        method: 'POST',
        body: JSON.stringify({ parsed })
      })

      if (!response.ok) {
        throw new Error(response.error || 'Failed to create bill')
      }

      return (response.data as { bill: Record<string, unknown> }).bill
    },
    onSuccess: (bill) => {
      queryClient.invalidateQueries({ queryKey: ['my-bills'] })
              // Navigate using the bill's editor token
        navigate(`/bill/${(bill as any).editor_token}`)
    }
  })

  const handleCreateBill = (title: string, place: string) => {
    createBillMutation.mutate({ title, place })
  }

  // Handle bill deletion
  const handleDeleteBill = async (billToken: string) => {
    setIsDeleting(true)
    try {
      const success = await deleteBill(billToken)
      if (success) {
        setToast({ message: 'Bill deleted successfully!', type: 'success' })
        queryClient.invalidateQueries({ queryKey: ['my-bills'] })
        // Auto-hide toast after 3 seconds
        setTimeout(() => setToast(null), 3000)
      } else {
        setToast({ message: 'Failed to delete bill. Please try again.', type: 'error' })
        // Auto-hide error toast after 5 seconds
        setTimeout(() => setToast(null), 5000)
      }
    } catch (_error) {
      setToast({ message: 'Error deleting bill. Please try again.', type: 'error' })
      setTimeout(() => setToast(null), 5000)
    } finally {
      setIsDeleting(false)
      setDeleteModal(null)
    }
  }


  // Inline draft helper - creates bill and items from parse result
  const createDraftFromScan = async (result: ParseResult): Promise<string> => {
    const flowStore = useFlowStore.getState()
    
    try {
      // Use the server API to create the bill
      const response = await apiFetch('/api/bills/create', {
        method: 'POST',
        body: JSON.stringify({ parsed: result })
      })
      
      if (response.ok && response.data && typeof response.data === 'object' && 'bill' in response.data && response.data.bill) {
        const bill = response.data.bill
        
        // Set bill metadata using helper
        flowStore.setBillMeta({
          token: (bill as any).editor_token,
          title: result.place || 'Scanned Receipt',
          place: result.place || undefined,
          date: result.date || undefined,
          subtotal: result.subtotal || undefined,
          tax: result.tax || undefined,
          tip: result.tip || undefined,
          total: result.total || undefined
        })
        
        // Replace items using helper
        const flowItems = result.items.map(item => ({
          id: item.id,
          label: item.label,
          price: item.price,
          emoji: item.emoji || '🍽️'
        }))
        flowStore.replaceItems(flowItems)
        
        return (bill as any).editor_token
      }
      
      // If response not ok, throw error for fallback handling
      throw new Error(response.error || 'Failed to create bill via server API')
      
    } catch (error) {
      console.error('[scan_api_error] Failed to create bill via server API:', error)
      
      // Check if local fallback is allowed
      const allowLocalFallback = import.meta.env.VITE_ALLOW_LOCAL_FALLBACK === '1'
      
      if (!allowLocalFallback) {
        // Re-throw the error for the UI to handle
        throw error
      }
      
      console.warn('Creating local fallback token...')
    }
    
    // Fallback: create local token and store locally (only if allowed)
    const localToken = `local-${Date.now()}`
    
    // Set bill metadata using helper
    flowStore.setBillMeta({
      token: localToken,
      title: result.place || 'Scanned Receipt',
      place: result.place || undefined,
      date: result.date || undefined,
      subtotal: result.subtotal || undefined,
      tax: result.tax || undefined,
      tip: result.tip || undefined,
      total: result.total || undefined
    })
    
    // Replace items using helper
    const flowItems = result.items.map(item => ({
      id: item.id,
      label: item.label,
      price: item.price,
      emoji: item.emoji || '🍽️'
    }))
    flowStore.replaceItems(flowItems)
    
    return localToken
  }

  const handleParsed = async (result: ParseResult) => {
    // Create draft bill and get token
    const token = await createDraftFromScan(result)
    
    // Navigate to bill flow
    navigate(`/bill/${token}`)
    
    // Close the scanner modal
    setShowReceiptScanner(false)
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-text-primary font-semibold">Loading your bills...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-text-primary">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2 retro-text-shadow">My Bills</h1>
            <p className="text-text-secondary">Manage your bill splitting sessions</p>
          </div>
          
          <Button leftIcon={"➕"} onClick={() => setShowReceiptScanner(true)}>New Receipt</Button>
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
          <div className="space-y-3">
            {bills.map((bill: BillListItem) => (
              <div
                key={bill.token || bill.id}
                className="bg-surface rounded-xl p-4 border border-border hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group"
                onClick={() => navigate(`/bill/${bill.token}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <span className="text-xl">🧾</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-text-primary group-hover:text-primary transition-colors">
                        {bill.title}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-text-secondary">
                        <span>{formatDate(String(bill.date))}</span>
                        {bill.people_count > 0 && (
                          <span>👥 {bill.people_count} people</span>
                        )}
                        <span>${Number(bill.total_amount).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <IconButton
                    tone="danger"
                    aria-label="Delete bill"
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeleteModal({ isOpen: true, billTitle: bill.title || 'Untitled Bill', billToken: bill.token })
                    }}
                    className="opacity-0 group-hover:opacity-100"
                  >
                    🗑️
                  </IconButton>
                </div>
              </div>
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
            <div className="text-8xl mb-6">
              🎮📋✨
            </div>
            <h2 className="text-3xl font-bold mb-3 retro-text-shadow">No Bills Yet</h2>
            <p className="text-text-secondary mb-8 text-lg font-mono">Create your first bill to start splitting costs with friends!</p>
            
            <Button leftIcon={"➕"} onClick={() => setShowReceiptScanner(true)}>New Receipt</Button>
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

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <DeleteConfirmModal
          isOpen={deleteModal.isOpen}
          billTitle={deleteModal.billTitle}
          onConfirm={() => handleDeleteBill(deleteModal.billToken)}
          onCancel={() => setDeleteModal(null)}
          isDeleting={isDeleting}
        />
      )}

      {/* Toast Notifications */}
      <AnimatePresence>
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </AnimatePresence>

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