import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

// Local fallback store for development. Vercel dev can isolate API handlers, so
// globals alone are not enough for cross-route create/fetch/assign flows.

interface Receipt {
  id: string
  token: string
  title: string | null
  place: string | null
  date: string | null
  created_at: string
  subtotal?: number | null
  sales_tax?: number | null
  tip?: number | null
  discount?: number | null
  service_fee?: number | null
  item_count: number
  people_count: number
  total_amount: number | null
  user_id?: string | null
  items?: any[]
  people?: MemoryPerson[]
  shares?: MemoryShare[]
}

export interface MemoryPerson {
  id: string
  client_id?: string | null
  name: string
  avatar_url: string | null
  venmo_handle?: string | null
  headcount?: number
  personal_credit: number
  credit_note?: string | null
}

export interface MemoryShare {
  item_id: string
  person_id: string
  weight: number
}

interface MemoryPersonInput {
  id?: string
  name: string
  avatar_url?: string | null
  headcount?: number | string | null
  venmo_handle?: string | null
  personal_credit?: number | null
  credit_note?: string | null
}

interface MemoryShareInput {
  item_id: string
  person_id: string
  weight?: number
}

const memoryDb = global as any
if (!memoryDb.__tabby_receipts) {
  memoryDb.__tabby_receipts = new Map<string, Receipt>()
}

export const receipts = memoryDb.__tabby_receipts as Map<string, Receipt>
const dbPath = process.env.TABBY_MEMORY_DB_PATH || join(tmpdir(), 'tabby-dev-receipts.json')

function hydrateReceipts() {
  if (!existsSync(dbPath)) return

  try {
    const raw = readFileSync(dbPath, 'utf8')
    const storedReceipts = JSON.parse(raw) as Receipt[]
    receipts.clear()
    storedReceipts.forEach(receipt => receipts.set(receipt.id, receipt))
  } catch (error) {
    console.error('[memory_db] Failed to load local receipt store:', error)
  }
}

function persistReceipts() {
  try {
    mkdirSync(dirname(dbPath), { recursive: true })
    writeFileSync(dbPath, JSON.stringify(Array.from(receipts.values())))
  } catch (error) {
    console.error('[memory_db] Failed to save local receipt store:', error)
  }
}

export function createReceipt(receipt: Receipt): Receipt {
  hydrateReceipts()
  receipts.set(receipt.id, receipt)
  persistReceipts()
  return receipt
}

export function getReceipt(id: string): Receipt | undefined {
  hydrateReceipts()
  return receipts.get(id) ?? Array.from(receipts.values()).find(receipt => receipt.token === id)
}

export function listReceipts(): Receipt[] {
  hydrateReceipts()
  return Array.from(receipts.values()).sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
}

export function deleteReceipt(id: string): boolean {
  hydrateReceipts()
  const deleted = receipts.delete(id)
  if (deleted) persistReceipts()
  return deleted
}

export function saveReceiptAssignments(
  id: string,
  people: MemoryPersonInput[],
  shares: MemoryShareInput[]
) {
  const receipt = getReceipt(id)
  if (!receipt) return null

  const normalizedPeople = people.map((person, index): MemoryPerson => {
    const personId = person.id || `local_person_${Date.now()}_${index}`
    return {
      id: personId,
      client_id: person.id ?? personId,
      name: person.name,
      avatar_url: person.avatar_url ?? null,
      headcount: normalizePersonHeadcount(person.headcount),
      venmo_handle: person.venmo_handle ?? null,
      personal_credit: Number(person.personal_credit ?? 0) || 0,
      credit_note: person.credit_note ?? null
    }
  })

  const personIdByClientId = new Map(
    normalizedPeople.map(person => [person.client_id || person.id, person.id])
  )
  const validPersonIds = new Set(normalizedPeople.map(person => person.id))
  const itemIds = new Set((receipt.items || []).map(item => item.id))

  const normalizedShares = shares
    .map((share): MemoryShare => ({
      item_id: share.item_id,
      person_id: personIdByClientId.get(share.person_id) || share.person_id,
      weight: Number.isFinite(Number(share.weight)) && Number(share.weight) > 0
        ? Number(share.weight)
        : 1
    }))
    .filter(share => validPersonIds.has(share.person_id))
    .filter(share => itemIds.size === 0 || itemIds.has(share.item_id))

  receipt.people = normalizedPeople
  receipt.shares = normalizedShares
  receipt.people_count = normalizedPeople.length
  receipts.set(receipt.id, receipt)
  persistReceipts()

  return {
    people: normalizedPeople,
    peopleCount: normalizedPeople.length,
    shares: normalizedShares,
    sharesCount: normalizedShares.length
  }
}

function normalizePersonHeadcount(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(1, Math.floor(parsed));
}
