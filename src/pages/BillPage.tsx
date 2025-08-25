import React from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { ReceiptPanel } from '../components/ReceiptPanel'
import { PeopleGrid } from '../components/PeopleGrid'
import { TotalsPanel } from '../components/TotalsPanel'
import { SmokeCheck } from '../components/SmokeCheck'

// DEBUG flag for development
const DEBUG = import.meta.env.DEV

// Sample bill token from seed data
const SAMPLE_BILL_TOKEN = 'e047f028995f1775e49463406db9943d'

export const BillPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()

  // For testing: redirect 'new' to sample bill
  if (id === 'new' && DEBUG) {
    return <Navigate to={`/bill/${SAMPLE_BILL_TOKEN}`} replace />
  }

  return (
    <div className="space-y-6 lg:space-y-0">
      {/* DEBUG: SmokeCheck component for live data verification */}
      {DEBUG && id && id !== 'new' && (
        <SmokeCheck billToken={id} />
      )}

      {/* Mobile: Stacked layout */}
      <div className="lg:hidden space-y-6">
        <ReceiptPanel billId={id} />
        <PeopleGrid billId={id} />
        <TotalsPanel billId={id} />
      </div>

      {/* Desktop: 3-column grid */}
      <div className="hidden lg:grid lg:grid-cols-3 lg:gap-6">
        <ReceiptPanel billId={id} />
        <PeopleGrid billId={id} />
        <TotalsPanel billId={id} />
      </div>
    </div>
  )
}
