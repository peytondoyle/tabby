/**
 * Bill History Management
 * 
 * Tracks bills that users have created or accessed on their device using localStorage.
 * This provides a simple "user system" without requiring login.
 */

export interface BillHistoryItem {
  token: string
  title: string
  place?: string
  date: string // ISO date
  lastAccessed: string // ISO timestamp
  totalAmount?: number
  isLocal?: boolean // true for bills created locally
}

const STORAGE_KEY = 'tabby-bill-history'
const MAX_HISTORY_ITEMS = 50 // Prevent localStorage from growing too large

/**
 * Get all bills from history, sorted by last accessed (most recent first)
 */
export function getBillHistory(): BillHistoryItem[] {
  try {
    const historyJson = localStorage.getItem(STORAGE_KEY)
    if (!historyJson) return []
    
    const history = JSON.parse(historyJson) as BillHistoryItem[]
    
    // Sort by lastAccessed descending (most recent first)
    return history.sort((a, b) => 
      new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime()
    )
  } catch (error) {
    console.error('Error loading bill history:', error)
    return []
  }
}

/**
 * Track a bill access (create or view)
 */
export function trackBillAccess(bill: {
  token: string
  title: string
  place?: string
  date?: string
  totalAmount?: number
  isLocal?: boolean
}): void {
  try {
    const history = getBillHistory()
    
    // Remove existing entry if it exists (to update lastAccessed)
    const filteredHistory = history.filter(item => item.token !== bill.token)
    
    // Create new history item
    const historyItem: BillHistoryItem = {
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
    
    console.info(`[billHistory] Tracked bill access: ${bill.title} (${bill.token})`)
  } catch (error) {
    console.error('Error tracking bill access:', error)
  }
}

/**
 * Remove a bill from history
 */
export function removeBillFromHistory(token: string): void {
  try {
    const history = getBillHistory()
    const filteredHistory = history.filter(item => item.token !== token)
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredHistory))
    
    console.info(`[billHistory] Removed bill from history: ${token}`)
  } catch (error) {
    console.error('Error removing bill from history:', error)
  }
}

/**
 * Clear all bill history
 */
export function clearBillHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
    console.info('[billHistory] Cleared all bill history')
  } catch (error) {
    console.error('Error clearing bill history:', error)
  }
}

/**
 * Get history item by token
 */
export function getBillFromHistory(token: string): BillHistoryItem | null {
  const history = getBillHistory()
  return history.find(item => item.token === token) || null
}
