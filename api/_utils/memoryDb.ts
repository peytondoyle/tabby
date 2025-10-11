// In-memory database for development
// This will persist data for the lifetime of the server

interface Bill {
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
if (!memoryDb.__tabby_bills) {
  memoryDb.__tabby_bills = new Map<string, Bill>()
}

export const bills = memoryDb.__tabby_bills as Map<string, Bill>

export function createBill(bill: Bill): Bill {
  bills.set(bill.id, bill)
  return bill
}

export function getBill(id: string): Bill | undefined {
  return bills.get(id)
}

export function listBills(): Bill[] {
  return Array.from(bills.values()).sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
}

export function deleteBill(id: string): boolean {
  return bills.delete(id)
}