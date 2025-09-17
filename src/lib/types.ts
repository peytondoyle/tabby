export type Money = number; // dollars as number (2dp)

export function toMoney(n: unknown): Money {
  const v = typeof n === "string" ? parseFloat(n) : typeof n === "number" ? n : 0;
  return Math.round(v * 100) / 100;
}

// Import types first
import type { Item, Bill } from '@/types/domain'
// import type { PersonId, ItemId, FlowAssignment, AssignmentMap } from '@/types/flow'
import type { FlowItem } from '@/lib/flowStore'

// Re-export domain types for convenience
export type { Item, Person, Bill } from '@/types/domain'
export type { PersonId, ItemId, FlowAssignment, AssignmentMap, GetItemAssignments } from '@/types/flow'

// Alias for BillMeta
export type BillMeta = Bill

// Extended Item interface for the application
export interface AppItem extends Item {
  quantity: number
  unit_price: number
}

// Extended FlowItem interface to include missing properties
export interface ExtendedFlowItem {
  id: string
  label: string
  price: number
  quantity: number
  unit_price: number
  emoji?: string
  bill_id: string
  created_at: string
  updated_at: string
}

// Re-export FlowItem and FlowPerson for compatibility
export type { FlowItem, FlowPerson } from '@/lib/flowStore'

// Helper function to convert FlowItem to Item format
export function flowItemToItem(flowItem: FlowItem, billId: string): Item {
  return {
    id: flowItem.id,
    bill_id: billId,
    label: flowItem.label,
    price: flowItem.price,
    quantity: 1,
    unit_price: flowItem.price,
    emoji: flowItem.emoji || undefined,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
}

// Additional types needed for the application
export interface PersonTotal {
  personId: string
  personName: string
  name: string
  total: number
  subtotal: number
  tax_share: number
  tip_share: number
}

export interface BillTotals {
  subtotal: number
  tax: number
  tip: number
  total: number
  personTotals: Record<string, number>
  distributed: number
}
