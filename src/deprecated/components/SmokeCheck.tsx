import React, { useEffect, useState } from 'react'
import { supabase, isSupabaseAvailable } from '../lib/supabaseClient'
import { showSuccess } from '../lib/toast'

interface SmokeCheckProps {
  billToken: string
}

export const SmokeCheck: React.FC<SmokeCheckProps> = ({ billToken }) => {
  const [billData, setBillData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isHidden, setIsHidden] = useState(false)

  useEffect(() => {
    const fetchBill = async () => {
      try {
        setLoading(true)
        setError(null)
        setIsHidden(false)
        
        if (!isSupabaseAvailable()) {
          // Use mock data for development
          console.warn('Supabase not available - using mock bill data')
          setBillData({
            title: 'Coffee & Lunch',
            place: 'Starbucks Downtown',
            date: '2024-12-15',
            subtotal: 45.67,
            sales_tax: 3.65,
            tip: 9.13
          })
          return
        }
        
        // Call the RPC function to get bill data
        const { data, error } = await supabase!.rpc('get_bill_by_token', {
          bill_token: billToken
        })

        if (error) {
          throw error
        }

        setBillData(data && data.length > 0 ? data[0] : null)
        
        // Show success toast when bill loads successfully
        if (data && data.length > 0) {
          showSuccess('Bill loaded ✓')
          // Auto-hide success state after 3 seconds
          setTimeout(() => setIsHidden(true), 3000)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    if (billToken) {
      fetchBill()
    }
  }, [billToken])

  // Only render in development mode
  if (!import.meta.env.DEV) {
    return null
  }

  // Hide if manually hidden or auto-hidden on success
  if (isHidden) {
    return null
  }

  if (loading) {
    return (
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="text-sm text-blue-700">
          🔍 SmokeCheck: Loading bill data...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="text-sm text-red-700">
          ❌ SmokeCheck Error: {error}
        </div>
      </div>
    )
  }

  if (!billData) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="text-sm text-yellow-700">
          ⚠️ SmokeCheck: No bill data found for token: {billToken}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
      <div className="flex justify-between items-start">
        <div className="text-sm text-green-700">
          ✅ SmokeCheck: Live bill loaded successfully!
        </div>
        <button 
          onClick={() => setIsHidden(true)}
          className="text-green-500 hover:text-green-700 text-xs ml-2"
        >
          ✕
        </button>
      </div>
      <div className="mt-2 text-xs text-green-600">
        <strong>Title:</strong> {billData.title}<br/>
        <strong>Place:</strong> {billData.place}<br/>
        <strong>Date:</strong> {billData.date}<br/>
        <strong>Subtotal:</strong> ${billData.subtotal}<br/>
        <strong>Tax:</strong> ${billData.sales_tax}<br/>
        <strong>Tip:</strong> ${billData.tip}
      </div>
    </div>
  )
}
