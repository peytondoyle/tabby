import React from 'react'
import { useParams } from 'react-router-dom'
import { ReceiptPanel } from '../components/ReceiptPanel'
import { PeopleGrid } from '../components/PeopleGrid'
import { TotalsPanel } from '../components/TotalsPanel'

export const BillPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()

  return (
    <div className="space-y-6 lg:space-y-0">
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
