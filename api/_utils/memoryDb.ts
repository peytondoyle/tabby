// In-memory database for development
// This will persist data for the lifetime of the server

interface Receipt {
  id: string
  token: string
  title: string | null
  place: string | null
  date: string | null
  created_at: string
  item_count: number
  people_count: number
  total_amount: number
  user_id?: string | null
  items?: any[]
}

const memoryDb = global as any
if (!memoryDb.__tabby_receipts) {
  memoryDb.__tabby_receipts = new Map<string, Receipt>()
}

export const receipts = memoryDb.__tabby_receipts as Map<string, Receipt>

export function createReceipt(receipt: Receipt): Receipt {
  receipts.set(receipt.id, receipt)
  return receipt
}

export function getReceipt(id: string): Receipt | undefined {
  return receipts.get(id)
}

export function listReceipts(): Receipt[] {
  return Array.from(receipts.values()).sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
}

export function deleteReceipt(id: string): boolean {
  return receipts.delete(id)
}