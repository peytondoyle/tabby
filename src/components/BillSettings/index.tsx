import React from 'react'
import { motion } from 'framer-motion'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { showSuccess, showError } from '@/lib/toast'
import type { Bill } from '@/lib/billUtils'

interface BillSettingsProps {
  bill: Bill
  editorToken: string
  onUpdate?: () => void
}

export const BillSettings: React.FC<BillSettingsProps> = ({ bill, editorToken, onUpdate }) => {
  const queryClient = useQueryClient()
  
  const updateBillMutation = useMutation({
    mutationFn: async (updates: Partial<Bill>) => {
      const { data, error } = await supabase!.rpc('update_bill_fields_with_editor_token', {
        etoken: editorToken,
        bill_id: bill.id,
        p_tax_split_method: updates.tax_split_method,
        p_tip_split_method: updates.tip_split_method,
        p_include_zero: updates.include_zero_item_people
      })
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bill'] })
      showSuccess('Settings updated')
      onUpdate?.()
    },
    onError: (error) => {
      console.error('Error updating bill settings:', error)
      showError('Failed to update settings')
    }
  })
  
  const handleTaxSplitChange = (method: 'proportional' | 'even') => {
    updateBillMutation.mutate({ tax_split_method: method })
  }
  
  const handleTipSplitChange = (method: 'proportional' | 'even') => {
    updateBillMutation.mutate({ tip_split_method: method })
  }
  
  const handleIncludeZeroChange = (include: boolean) => {
    updateBillMutation.mutate({ include_zero_item_people: include })
  }
  
  return (
    <div className="space-y-4 p-4 bg-card rounded-lg border border-line">
      <h3 className="text-lg font-semibold text-ink flex items-center gap-2">
        ⚙️ Split Settings
      </h3>
      
      {/* Tax Split Mode */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-ink-dim">Tax Split</label>
        <div className="rounded-full bg-paper p-1 flex">
          <motion.button
            onClick={() => handleTaxSplitChange('even')}
            disabled={updateBillMutation.isPending}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-full transition-all ${
              bill.tax_split_method === 'even' 
                ? 'bg-card text-ink shadow-soft' 
                : 'text-ink-dim hover:text-ink'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Even
          </motion.button>
          <motion.button
            onClick={() => handleTaxSplitChange('proportional')}
            disabled={updateBillMutation.isPending}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-full transition-all ${
              bill.tax_split_method === 'proportional' 
                ? 'bg-card text-ink shadow-soft' 
                : 'text-ink-dim hover:text-ink'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Proportional
          </motion.button>
        </div>
      </div>
      
      {/* Tip Split Mode */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-ink-dim">Tip Split</label>
        <div className="rounded-full bg-paper p-1 flex">
          <motion.button
            onClick={() => handleTipSplitChange('even')}
            disabled={updateBillMutation.isPending}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-full transition-all ${
              bill.tip_split_method === 'even' 
                ? 'bg-card text-ink shadow-soft' 
                : 'text-ink-dim hover:text-ink'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Even
          </motion.button>
          <motion.button
            onClick={() => handleTipSplitChange('proportional')}
            disabled={updateBillMutation.isPending}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-full transition-all ${
              bill.tip_split_method === 'proportional' 
                ? 'bg-card text-ink shadow-soft' 
                : 'text-ink-dim hover:text-ink'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Proportional
          </motion.button>
        </div>
      </div>
      
      {/* Include Zero Items Toggle */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <label className="text-sm font-medium text-ink-dim">
            Include people with 0 items
          </label>
          <p className="text-xs text-ink-dim/70">
            In even splits, include people who haven't been assigned any items
          </p>
        </div>
        <motion.button
          onClick={() => handleIncludeZeroChange(!bill.include_zero_item_people)}
          disabled={updateBillMutation.isPending}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            bill.include_zero_item_people ? 'bg-brand' : 'bg-line'
          }`}
          whileTap={{ scale: 0.95 }}
        >
          <motion.span
            className="inline-block h-4 w-4 rounded-full bg-white shadow-sm"
            animate={{ x: bill.include_zero_item_people ? 20 : 4 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          />
        </motion.button>
      </div>
    </div>
  )
}