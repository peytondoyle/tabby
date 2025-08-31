import { nanoid } from 'nanoid'
import type { ParseResult } from './receiptScanning'

export interface DraftBill {
  token: string
  place?: string
  date?: string
  items: Array<{
    id: string
    label: string
    price: number
  }>
  subtotal?: number
  tax?: number
  tip?: number
  total?: number
}

export function createDraftFromParseResult(parse: ParseResult): DraftBill {
  const token = nanoid()
  
  // Normalize items to ensure they have required fields
  const items = parse.items.map(item => ({
    id: item.id,
    label: item.label || '',
    price: item.price || 0
  }))

  return {
    token,
    place: parse.place || undefined,
    date: parse.date || undefined,
    items,
    subtotal: parse.subtotal || undefined,
    tax: parse.tax || undefined,
    tip: parse.tip || undefined,
    total: parse.total || undefined
  }
}

export function saveDraftToLocal(draft: DraftBill): void {
  localStorage.setItem(`draft:${draft.token}`, JSON.stringify(draft))
}

export function loadDraftFromLocal(token: string): DraftBill | null {
  try {
    const stored = localStorage.getItem(`draft:${token}`)
    if (!stored) return null
    return JSON.parse(stored) as DraftBill
  } catch (error) {
    console.warn('Failed to load draft from localStorage:', error)
    return null
  }
}