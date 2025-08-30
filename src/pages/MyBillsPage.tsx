import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { supabase, isSupabaseAvailable } from '@/lib/supabaseClient'
import { ReceiptScanner } from '@/components/ReceiptScanner'
import { getCurrentDate } from '@/lib/receiptScanning'
import { fetchBills, type BillSummary } from '@/lib/bills'

// Use BillSummary as the main type for bills
type Bill = BillSummary

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
  const [showNewBillModal, setShowNewBillModal] = useState(false)
  const [showReceiptScanner, setShowReceiptScanner] = useState(false)
  const [billToDelete, setBillToDelete] = useState<Bill | null>(null)

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
      navigate(`/bill/${data.token}`)
    }
  })

  const handleCreateBill = (title: string, place: string) => {
    createBillMutation.mutate({ title, place })
  }

  const handleBillCreated = (billToken: string) => {
    // Force query refresh to get updated bills list from RPC
    queryClient.invalidateQueries({ queryKey: ['my-bills'] })
    
    // Small delay to ensure localStorage is written before navigation
    setTimeout(() => {
      navigate(`/bill/${billToken}`)
    }, 100)
  }

  const exportBill = async (bill: Bill) => {
    try {
      if (!isSupabaseAvailable()) {
        // For mock mode, just export the basic bill data
        const exportData = {
          version: '1.0',
          bill: {
            title: bill.title,
            place: bill.place,
            date: bill.date,
            created_at: bill.created_at,
            total_amount: bill.total_amount
          },
          exported_at: new Date().toISOString(),
          source: 'tabby_app'
        }
        
        const dataStr = JSON.stringify(exportData, null, 2)
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)
        
        const exportFileDefaultName = `${bill.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${bill.date}.json`
        
        const linkElement = document.createElement('a')
        linkElement.setAttribute('href', dataUri)
        linkElement.setAttribute('download', exportFileDefaultName)
        linkElement.click()
        return
      }

      // Get full bill data including items, people, and shares
      const [billData, itemsData, peopleData, sharesData] = await Promise.all([
        supabase!.from('bills').select('*').eq('id', bill.id).single(),
        supabase!.from('items').select('*').eq('bill_id', bill.id),
        supabase!.from('people').select('*').eq('bill_id', bill.id),
        supabase!.from('shares').select('*').eq('bill_id', bill.id)
      ])

      const exportData = {
        version: '1.0',
        bill: billData.data,
        items: itemsData.data,
        people: peopleData.data,
        shares: sharesData.data,
        exported_at: new Date().toISOString(),
        source: 'tabby_app'
      }

      const dataStr = JSON.stringify(exportData, null, 2)
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)
      
      const exportFileDefaultName = `${bill.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${bill.date}.json`
      
      const linkElement = document.createElement('a')
      linkElement.setAttribute('href', dataUri)
      linkElement.setAttribute('download', exportFileDefaultName)
      linkElement.click()
      
    } catch (error) {
      console.error('Export failed:', error)
      alert('Failed to export bill. Please try again.')
    }
  }


  // Mutation to delete bill
  const deleteBillMutation = useMutation({
    mutationFn: async (bill: Bill) => {
      if (!isSupabaseAvailable()) {
        console.warn('Supabase not available - simulating bill deletion')
        return { success: true }
      }

      const { error } = await supabase!.rpc('delete_bill', {
        bill_id: bill.id
      })

      if (error) throw error
      return { success: true }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-bills'] })
      setBillToDelete(null)
    },
    onError: (error) => {
      console.error('Delete bill error:', error)
      alert('Failed to delete bill. Please try again.')
    }
  })

  const handleDeleteBill = (bill: Bill) => {
    setBillToDelete(bill)
  }

  const confirmDeleteBill = () => {
    if (billToDelete) {
      deleteBillMutation.mutate(billToDelete)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
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
          
          <div className="flex gap-3">
            <motion.button
              onClick={() => setShowReceiptScanner(true)}
              className="flex items-center gap-2 px-6 py-3 bg-brand hover:bg-brand/90 text-white rounded-2xl font-bold transition-all shadow-pop retro-shadow pixel-perfect"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              📷 Scan or Import
            </motion.button>
            <motion.button
              onClick={() => setShowNewBillModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-card hover:bg-card/80 border-2 border-line hover:border-brand/50 text-ink rounded-2xl font-bold transition-all shadow-soft retro-shadow"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              ➕ New Bill
            </motion.button>
          </div>
        </div>

        {/* Bills Grid */}
        {bills.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bills.map((bill, index) => (
              <motion.div
                key={bill.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-card rounded-2xl p-6 border-2 border-line hover:border-brand/50 hover:shadow-pop transition-all cursor-pointer group retro-shadow"
                onClick={() => navigate(`/bill/${bill.token}`)}
                whileHover={{ scale: 1.05, y: -4 }}
                whileTap={{ scale: 0.98 }}
              >
                {/* Bill Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-1 group-hover:text-brand transition-colors retro-text-shadow">
                      🧾 {bill.title}
                    </h3>
                    {bill.place && (
                      <p className="text-ink-dim text-sm">📍 {bill.place}</p>
                    )}
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <motion.button
                      onClick={(e) => {
                        e.stopPropagation()
                        exportBill(bill)
                      }}
                      className="opacity-0 group-hover:opacity-100 p-2 hover:bg-accent/20 rounded-lg transition-all pixel-perfect"
                      title="Export Bill"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <svg className="w-4 h-4 text-ink-dim hover:text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 12l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </motion.button>
                    <motion.button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteBill(bill)
                      }}
                      className="opacity-0 group-hover:opacity-100 p-2 hover:bg-danger/20 rounded-lg transition-all pixel-perfect"
                      title="Delete Bill"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <svg className="w-4 h-4 text-ink-dim hover:text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </motion.button>
                    <div className="text-sm text-ink-dim font-mono pixel-perfect">📅 {formatDate(bill.date)}</div>
                  </div>
                </div>

                {/* Bill Stats */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <motion.div 
                    className="text-center bg-paper rounded-xl p-3 retro-shadow pixel-perfect"
                    whileHover={{ scale: 1.05 }}
                  >
                    <div className="text-2xl font-bold text-brand retro-text-shadow">
                      🍽️ {bill.item_count || 0}
                    </div>
                    <div className="text-xs text-ink-dim font-mono">Items</div>
                  </motion.div>
                  <motion.div 
                    className="text-center bg-paper rounded-xl p-3 retro-shadow pixel-perfect"
                    whileHover={{ scale: 1.05 }}
                  >
                    <div className="text-2xl font-bold text-accent retro-text-shadow">
                      👥 {bill.people_count || 0}
                    </div>
                    <div className="text-xs text-ink-dim font-mono">People</div>
                  </motion.div>
                </div>

                {/* Total Amount */}
                {bill.total_amount && (
                  <motion.div 
                    className="text-center py-4 bg-accent/10 border-2 border-accent/30 rounded-xl retro-shadow"
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="text-lg font-bold text-accent currency retro-text-shadow">
                      💰 {formatCurrency(bill.total_amount)}
                    </div>
                    <div className="text-xs text-ink-dim font-mono">Total</div>
                  </motion.div>
                )}

                {!bill.total_amount && (
                  <motion.div 
                    className="text-center py-4 bg-paper border-2 border-dashed border-line rounded-xl"
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="text-sm text-ink-dim font-mono pixel-perfect">⚠️ In Progress</div>
                  </motion.div>
                )}
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
            
            <div className="flex gap-4 justify-center">
              <motion.button
                onClick={() => setShowReceiptScanner(true)}
                className="flex items-center gap-3 px-8 py-4 bg-brand hover:bg-brand/90 text-white rounded-2xl font-bold transition-all shadow-pop retro-shadow pixel-perfect"
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                📷 Scan or Import
              </motion.button>
              <motion.button
                onClick={() => setShowNewBillModal(true)}
                className="flex items-center gap-3 px-8 py-4 bg-card hover:bg-card/80 border-2 border-line hover:border-brand/50 text-ink rounded-2xl font-bold transition-all shadow-soft retro-shadow"
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                ✨ Create Manually
              </motion.button>
            </div>
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
        isOpen={showReceiptScanner}
        onClose={() => setShowReceiptScanner(false)}
        onBillCreated={handleBillCreated}
      />

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {billToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
            onClick={() => setBillToDelete(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card text-ink rounded-3xl w-full max-w-md p-6 border-2 border-line shadow-pop retro-shadow"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="text-red-500 text-4xl mb-4">⚠️</div>
                <h2 className="text-2xl font-bold mb-2 retro-text-shadow">🗑️ Delete Bill?</h2>
                <p className="text-ink mb-2">
                  Are you sure you want to delete <strong>"{billToDelete.title}"</strong>?
                </p>
                <p className="text-sm text-ink-dim mb-6 font-mono">
                  ⚠️ This action cannot be undone. All bill data, items, and splits will be permanently removed.
                </p>
                
                <div className="flex gap-3">
                  <motion.button
                    onClick={() => setBillToDelete(null)}
                    className="flex-1 py-3 border-2 border-line text-ink-dim rounded-xl font-bold hover:bg-paper transition-all disabled:opacity-50 retro-shadow pixel-perfect"
                    disabled={deleteBillMutation.isPending}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    ❌ Cancel
                  </motion.button>
                  <motion.button
                    onClick={confirmDeleteBill}
                    disabled={deleteBillMutation.isPending}
                    className="flex-1 py-3 bg-danger hover:bg-danger/90 disabled:bg-danger/50 text-white rounded-xl font-bold transition-all shadow-pop retro-shadow pixel-perfect"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {deleteBillMutation.isPending ? '⏳ Deleting...' : '🗑️ Delete Bill'}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}