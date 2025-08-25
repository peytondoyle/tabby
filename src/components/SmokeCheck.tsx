import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

interface SmokeCheckProps {
  billToken: string
}

export const SmokeCheck: React.FC<SmokeCheckProps> = ({ billToken }) => {
  const [billData, setBillData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchBill = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Call the RPC function to get bill data
        const { data, error } = await supabase.rpc('get_bill_by_token', {
          bill_token: billToken
        })

        if (error) {
          throw error
        }

        setBillData(data && data.length > 0 ? data[0] : null)
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
      <div className="text-sm text-green-700">
        ✅ SmokeCheck: Live bill loaded successfully!
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
