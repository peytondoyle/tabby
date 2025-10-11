/**
 * Receipt History Management
 * 
 * Tracks receipts that users have created or accessed on their device using localStorage.
 * This provides a simple "user system" without requiring login.
 */

export interface ReceiptHistoryItem {
  token: string
  title: string
  place?: string
  date: string // ISO date
  lastAccessed: string // ISO timestamp
  totalAmount?: number
  isLocal?: boolean // true for receipts created locally
}

const STORAGE_KEY = 'tabby-receipt-history'
const MAX_HISTORY_ITEMS = 50 // Prevent localStorage from growing too large

/**
 * Get all receipts from history, sorted by last accessed (most recent first)
 */
export function getReceiptHistory(): ReceiptHistoryItem[] {
  try {
    const historyJson = localStorage.getItem(STORAGE_KEY)
    if (!historyJson) return []
    
    const history = JSON.parse(historyJson) as ReceiptHistoryItem[]
    
    // Sort by lastAccessed descending (most recent first)
    return history.sort((a, b) => 
      new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime()
    )
  } catch (error) {
    console.error('Error loading receipt history:', error)
    return []
  }
}

/**
 * Track a receipt access (create or view)
 */
export function trackReceiptAccess(bill: {
  token: string
  title: string
  place?: string
  date?: string
  totalAmount?: number
  isLocal?: boolean
}): void {
  try {
    const history = getReceiptHistory()
    
    // Remove existing entry if it exists (to update lastAccessed)
    const filteredHistory = history.filter(item => item.token !== bill.token)
    
    // Create new history item
    const historyItem: ReceiptHistoryItem = {
      token: bill.token,
      title: bill.title,
      place: bill.place,
      date: bill.date || new Date().toISOString().split('T')[0],
      lastAccessed: new Date().toISOString(),
      totalAmount: bill.totalAmount,
      isLocal: bill.isLocal || false
    }
    
    // Add to beginning of array
    const updatedHistory = [historyItem, ...filteredHistory]
    
    // Limit to MAX_HISTORY_ITEMS to prevent localStorage bloat
    const trimmedHistory = updatedHistory.slice(0, MAX_HISTORY_ITEMS)
    
    // Save back to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedHistory))
    
    console.info(`[receiptHistory] Tracked receipt access: ${bill.title} (${bill.token})`)
  } catch (error) {
    console.error('Error tracking receipt access:', error)
  }
}

/**
 * Remove a receipt from history
 */
export function removeReceiptFromHistory(token: string): void {
  try {
    const history = getReceiptHistory()
    const filteredHistory = history.filter(item => item.token !== token)
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredHistory))
    
    console.info(`[receiptHistory] Removed receipt from history: ${token}`)
  } catch (error) {
    console.error('Error removing receipt from history:', error)
  }
}

/**
 * Clear all receipt history
 */
export function clearReceiptHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
    console.info('[receiptHistory] Cleared all receipt history')
  } catch (error) {
    console.error('Error clearing receipt history:', error)
  }
}

/**
 * Get history item by token
 */
export function getReceiptFromHistory(token: string): ReceiptHistoryItem | null {
  const history = getReceiptHistory()
  return history.find(item => item.token === token) || null
}
