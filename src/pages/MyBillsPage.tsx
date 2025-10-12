import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { isSupabaseAvailable } from '@/lib/supabaseClient'
import { ReceiptScanner } from '@/components/ReceiptScanner'
import type { ParseResult } from '@/lib/receiptScanning'
import { useFlowStore } from '@/lib/flowStore'
import { apiFetch } from '@/lib/apiClient'
import { logServer } from '@/lib/errorLogger'
// import { OnboardingFlow } from '@/components/OnboardingFlow'
import { getCurrentDate } from '@/lib/receiptScanning'
import { fetchReceipts, deleteReceipt, createReceipt, buildCreatePayload, type ReceiptListItem } from '@/lib/receipts'
import { getReceiptHistory, removeReceiptFromHistory, type ReceiptHistoryItem } from '@/lib/receiptHistory'
import { Button, IconButton, Container, Stack, Card, TabbySheet } from "@/components/design-system";
import { designTokens } from "@/lib/styled";
import { testIds } from "@/lib/testIds";
import StepErrorBoundary from '@/components/StepErrorBoundary';
import { HomeButton } from '@/components/HomeButton';

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
      <span style={{ fontWeight: designTokens.typography.fontWeight.semibold }}>{message}</span>
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
            className="bg-white text-text-primary rounded-2xl w-full max-w-md p-6 border border-border hover:border-primary/50 hover:shadow-lg transition-all"
            onClick={(e) => e.stopPropagation()}
          >
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">🗑️</div>
            <h2 className="text-2xl font-bold text-text-primary mb-3">Delete Bill?</h2>
            <p className="text-text-secondary mb-2">
              Are you sure you want to delete <span className="font-semibold text-text-primary">"{billTitle}"</span>?
            </p>
            <p style={{ 
              fontSize: designTokens.typography.fontSize.sm,
              color: designTokens.semantic.text.error,
            }}>⚠️ This action cannot be undone.</p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={isDeleting}
              className="flex-1 py-3 border border-border text-text-secondary rounded-xl font-bold hover:bg-white transition-colors pixel-perfect disabled:opacity-50"
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

// Use ReceiptSummary as the main type for bills

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
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white text-text-primary rounded-3xl w-full max-w-md p-6 border border-border shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{
              fontSize: designTokens.typography.fontSize['2xl'],
              fontWeight: designTokens.typography.fontWeight.bold,
              color: designTokens.semantic.text.primary,
              margin: 0,
              marginBottom: designTokens.spacing[6],
              textAlign: 'center',
            }}>Create New Bill</h2>
            
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: designTokens.typography.fontSize.sm,
                    fontWeight: designTokens.typography.fontWeight.semibold,
                    color: designTokens.semantic.text.secondary,
                    marginBottom: designTokens.spacing[2],
                  }}>
                    Restaurant/Place *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Chick-fil-A, Mom's Kitchen"
                    className="w-full p-3 bg-white border-2 border-border text-text-primary rounded-xl focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder-text-secondary"
                    required
                  />
                </div>
                
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: designTokens.typography.fontSize.sm,
                    fontWeight: designTokens.typography.fontWeight.semibold,
                    color: designTokens.semantic.text.secondary,
                    marginBottom: designTokens.spacing[2],
                  }}>
                    Location (Optional)
                  </label>
                  <input
                    type="text"
                    value={place}
                    onChange={(e) => setPlace(e.target.value)}
                    placeholder="e.g., Downtown, 123 Main St"
                    className="w-full p-3 bg-white border-2 border-border text-text-primary rounded-xl focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder-text-secondary"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 border-2 border-border text-text-secondary rounded-xl font-bold hover:bg-white transition-colors"
                >
                  ❌ Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold transition-colors shadow-pop"
                >
                  Create Bill
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


  // Query to fetch bills from history
  const { data: bills = [], isLoading } = useQuery<ReceiptHistoryItem[]>({
    queryKey: ['my-bills'],
    queryFn: async () => {
      // Always use bill history for consistency
      return getReceiptHistory()
    }
  })

  // Mutation to create new bill via server API
  const createReceiptMutation = useMutation({
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

      const response = await apiFetch('/api/receipts/create', {
        method: 'POST',
        body: JSON.stringify({ parsed })
      })

      // apiFetch returns the raw response data directly
      if (!response || typeof response !== 'object' || !('receipt' in response)) {
        throw new Error('Invalid response from server')
      }

      return response.receipt
    },
    onSuccess: (receipt) => {
      queryClient.invalidateQueries({ queryKey: ['my-bills'] })
              // Navigate using the receipt's editor token
        navigate(`/bill/${(receipt as any).editor_token}`)
    }
  })

  const handleCreateBill = (title: string, place: string) => {
    createReceiptMutation.mutate({ title, place })
  }

  // Handle bill deletion
  const handleDeleteBill = async (billToken: string) => {
    setIsDeleting(true)
    try {
      const success = await deleteReceipt(billToken)
      if (success) {
        // Remove from bill history
        removeReceiptFromHistory(billToken)
        
        setToast({ message: 'Bill deleted successfully!', type: 'success' })
        queryClient.invalidateQueries({ queryKey: ['my-bills'] })
        // Auto-hide toast after 3 seconds
        setTimeout(() => setToast(null), 3000)
      } else {
        setToast({ message: 'Failed to delete bill. Please try again.', type: 'error' })
        // Auto-hide error toast after 5 seconds
        setTimeout(() => setToast(null), 5000)
      }
    } catch (error: any) {
      const msg = error?.message || 'Failed to delete bill'
      logServer('warn', 'bill_delete_failed', { msg })
      setToast({ message: `Error deleting bill: ${msg}`, type: 'error' })
      setTimeout(() => setToast(null), 5000)
    } finally {
      setIsDeleting(false)
      setDeleteModal(null)
    }
  }


  // Inline draft helper - creates bill and items from parse result
  const createDraftFromScan = async (result: ParseResult): Promise<string> => {
    // Use getState() to access store outside of React component context
    // This is safe because it doesn't use React hooks
    const flowStore = useFlowStore.getState()

    try {
      // Use the new schema-aligned createReceipt function
      const payload = buildCreatePayload(result)
      const created = await createReceipt(payload) as any

      // The API returns {receipt: {id, ...}, items: [...]}
      const billId = created.receipt?.id || created.id

      // Set bill metadata using helper
      flowStore.setBillMeta({
        token: billId,
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
      
      return billId
      
    } catch (error) {
      console.error('[scan_api_error] Failed to create bill via server API:', error)
      logServer('error', 'Failed to create bill via server API', { error, context: 'MyBillsPage.createDraftFromScan' })
      
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
    try {
      // Create draft bill and get token
      const token = await createDraftFromScan(result)

      // Close the scanner modal BEFORE navigating to prevent unmount issues
      setShowReceiptScanner(false)

      // Small delay to ensure modal is closed before navigation
      setTimeout(() => {
        // Navigate to bill flow
        navigate(`/bill/${token}`)
      }, 100)
    } catch (error) {
      console.error('Error handling parsed receipt:', error)
      logServer('error', 'receipt_parse_handler_failed', { error })
      setToast({ message: 'Failed to process receipt. Please try again.', type: 'error' })
      setTimeout(() => setToast(null), 5000)
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
    <StepErrorBoundary stepName="MyBillsPage">
      <HomeButton />
      <div className="min-h-screen w-full flex flex-col bg-background text-text-primary">
        <div className="w-full">
          <Stack direction="vertical" spacing={8}>
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div>
                <h1 style={{
                  fontSize: designTokens.typography.fontSize['3xl'],
                  fontWeight: designTokens.typography.fontWeight.bold,
                  color: designTokens.semantic.text.primary,
                  margin: 0,
                  marginBottom: designTokens.spacing[2],
                }}>My Bills</h1>
                <p style={{
                  fontSize: designTokens.typography.fontSize.base,
                  color: designTokens.semantic.text.secondary,
                  margin: 0,
                }}>Manage your bill splitting sessions</p>
              </div>
              
              <Button variant="primary" onClick={() => setShowReceiptScanner(true)} data-testid={testIds.scanReceiptButton}>
                New Receipt
              </Button>
            </div>


        {/* Bills List */}
        {bills.length > 0 ? (
          <div className="space-y-3">
            {bills.map((bill: ReceiptHistoryItem) => (
              <div
                key={bill.token}
                className="bg-white rounded-xl p-4 border border-border hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer group"
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
                        <span>{formatDate(bill.date)}</span>
                        {bill.place && (
                          <span>📍 {bill.place}</span>
                        )}
                        {bill.totalAmount && (
                          <span>${Number(bill.totalAmount).toFixed(2)}</span>
                        )}
                        {bill.isLocal && (
                          <span className="text-xs bg-white/10 border border-white/10 rounded px-2 py-1 text-white">Local</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <IconButton
                      variant="default"
                      icon="🔗"
                      aria-label="Share bill"
                      onClick={async (e) => {
                        e.stopPropagation()
                        const shareUrl = `${window.location.origin}/bill/${bill.token}`
                        try {
                          if (navigator.share) {
                            await navigator.share({
                              title: bill.title || 'Split Bill',
                              text: `Check out this bill split from ${bill.title || 'Tabby'}`,
                              url: shareUrl
                            })
                          } else {
                            await navigator.clipboard.writeText(shareUrl)
                            setToast({ message: 'Link copied to clipboard!', type: 'success' })
                            setTimeout(() => setToast(null), 3000)
                          }
                        } catch (error) {
                          console.error('Error sharing:', error)
                        }
                      }}
                    />

                    <IconButton
                      variant="danger"
                      icon="🗑️"
                      aria-label="Delete bill"
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeleteModal({ isOpen: true, billTitle: bill.title || 'Untitled Bill', billToken: bill.token })
                      }}
                    />
                  </div>
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
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: designTokens.borderRadius.full,
              backgroundColor: `${designTokens.semantic.interactive.primary}${designTokens.alpha[10]}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: designTokens.spacing[6],
            }}>
              <span style={{ fontSize: '32px' }}>📄</span>
            </div>
            <h2 style={{
              fontSize: designTokens.typography.fontSize['3xl'],
              fontWeight: designTokens.typography.fontWeight.bold,
              color: designTokens.semantic.text.primary,
              margin: 0,
              marginBottom: designTokens.spacing[3],
            }}>No Bills Yet</h2>
            <p style={{
              fontSize: designTokens.typography.fontSize.lg,
              color: designTokens.semantic.text.secondary,
              margin: 0,
              marginBottom: designTokens.spacing[8],
            }}>Create your first bill to start splitting costs with friends!</p>
            
            <Button variant="primary" onClick={() => setShowReceiptScanner(true)} data-testid={testIds.scanReceiptButton}>
              New Receipt
            </Button>
          </motion.div>
        )}
          </Stack>
        </div>
      </div>

      {/* New Bill Modal */}
      <NewBillModal
        isOpen={showNewBillModal}
        onClose={() => setShowNewBillModal(false)}
        onCreate={handleCreateBill}
      />

      {/* Receipt Scanner */}
      <TabbySheet
        open={showReceiptScanner}
        onClose={() => setShowReceiptScanner(false)}
        variant="sheet"
        showCloseButton={false}
      >
        <div className="p-6 text-center">
          <div className="text-6xl mb-6">📷</div>
          <h2 className="text-2xl font-bold text-white mb-4">Scan Receipt</h2>
          <p className="text-white/70 mb-8">
            Take a photo or select an image from your gallery
          </p>
          
          <div className="space-y-4">
            <Button 
              primary 
              onClick={() => {/* TODO: Implement file selection */}}
              className="w-full h-14 text-lg"
            >
              📷 Take Photo
            </Button>
            <Button 
              onClick={() => {/* TODO: Implement file selection */}}
              className="w-full h-14 text-lg bg-white/10 text-white border border-white/20"
            >
              🖼️ Choose from Gallery
            </Button>
          </div>
        </div>
      </TabbySheet>

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

    </StepErrorBoundary>
  )
}
