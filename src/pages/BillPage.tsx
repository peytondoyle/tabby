import React, { useState, useCallback, useRef } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { getBillByToken } from '@/lib/billUtils'
import { ReceiptPanel } from '../components/ReceiptPanel'
import { PeopleDock } from '../components/PeopleDock'
import { CompactTotals } from '../components/TotalsPanel/CompactTotals'
import { SmokeCheck } from '../components/SmokeCheck'
import { DnDProvider } from '../components/DnDProvider'
import { showSuccess } from '../lib/toast'


// DEBUG flag for development
const DEBUG = import.meta.env.DEV

// Sample bill token from seed data
const SAMPLE_BILL_TOKEN = 'e047f028995f1775e49463406db9943d'

export const BillPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const peopleDockRef = useRef<{ handleDropSuccess: (personId: string) => void } | null>(null)

  // Show toast on load in production
  React.useEffect(() => {
    if (!import.meta.env.DEV && id && id !== 'new') {
      showSuccess('Bill loaded ✓')
    }
  }, [id])

  // Get editor token from bill data
  const { data: bill } = useQuery({
    queryKey: ['bill', id],
    queryFn: async () => {
      if (!id || id === 'new') return null
      return await getBillByToken(id)
    },
    enabled: !!id && id !== 'new'
  })

  const handleItemAssigned = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  const handleDropSuccess = useCallback((personId: string) => {
    // Forward the drop success to the PeopleDock component
    peopleDockRef.current?.handleDropSuccess(personId)
  }, [])

  // For testing: redirect 'new' to sample bill
  if (id === 'new' && DEBUG) {
    return <Navigate to={`/bill/${SAMPLE_BILL_TOKEN}`} replace />
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  }

  return (
    <DnDProvider 
      editorToken={bill?.editor_token || ''} 
      onItemAssigned={handleItemAssigned}
      onDropSuccess={handleDropSuccess}
    >
      <div className="flex flex-col h-[calc(100vh-64px)]">
        {/* DEBUG: SmokeCheck component for live data verification */}
        {DEBUG && id && id !== 'new' && (
          <SmokeCheck billToken={id} />
        )}

        {/* Dock: Sticky people row */}
        <PeopleDock 
          ref={peopleDockRef}
          billToken={id} 
          editorToken={bill?.editor_token || ''} 
        />

        {/* Content: Receipt list + totals */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Receipt Panel - fills available space */}
          <div className="flex-1 overflow-y-auto">
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <motion.div variants={itemVariants}>
                <ReceiptPanel billToken={id} key={`receipt-${refreshTrigger}`} />
              </motion.div>
            </motion.div>
          </div>

          {/* Compact Totals - sticky bottom */}
          <CompactTotals billId={id} />
        </div>
      </div>
    </DnDProvider>
  )
}
