import React, { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ReceiptUploadModal } from '../components/ReceiptUploadModal'

// Sample bill token for development
const SAMPLE_BILL_TOKEN = 'e047f028995f1775e49463406db9943d'

export const LandingPage: React.FC = () => {
  const navigate = useNavigate()
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)

  // In development, redirect to sample bill
  if (import.meta.env.DEV) {
    return <Navigate to={`/bill/${SAMPLE_BILL_TOKEN}`} replace />
  }
  
  // In production, show landing page with create bill option
  return (
    <div className="min-h-screen flex items-center justify-center bg-paper">
      <div className="text-center max-w-md mx-auto p-6">
        <div className="text-6xl mb-6">🍕📊</div>
        <h1 className="text-3xl font-bold text-ink mb-4">
          Tabby
        </h1>
        <p className="text-ink-dim mb-8">
          Split restaurant bills with friends easily. Upload receipts, assign items, and calculate fair totals.
        </p>
        
        <div className="space-y-4">
          <button 
            onClick={() => window.location.href = '/bill/new'}
            className="w-full bg-brand text-white py-3 px-6 rounded-xl font-medium hover:bg-brand/90 transition-colors"
          >
            🧾 Split a Bill
          </button>
          
          <button 
            onClick={() => setIsUploadModalOpen(true)}
            className="w-full bg-card border border-line text-ink py-3 px-6 rounded-xl font-medium hover:bg-paper transition-colors"
          >
            📷 Upload Receipt
          </button>
        </div>
        
        <div className="mt-8 text-xs text-ink-dim">
          No signup required • Free to use
        </div>
      </div>

      <ReceiptUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onBillCreated={(token) => navigate(`/bill/${token}`)}
      />
    </div>
  )
}