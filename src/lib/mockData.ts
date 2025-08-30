// Mock data store for development mode
// This allows us to simulate real database operations

interface MockShare {
  item_id: string
  person_id: string
  weight: number
}

class MockDataStore {
  private shares: MockShare[] = [
    { item_id: '1', person_id: 'p1', weight: 0.5 },
    { item_id: '1', person_id: 'p2', weight: 0.5 },
    { item_id: '2', person_id: 'p2', weight: 1 },
    { item_id: '3', person_id: 'p3', weight: 1 }
  ]

  getShares(): MockShare[] {
    return [...this.shares]
  }

  addShare(itemId: string, personId: string, weight: number = 1) {
    // Remove existing share if it exists
    this.removeShare(itemId, personId)
    
    // Add new share
    this.shares.push({ item_id: itemId, person_id: personId, weight })
    console.log('Mock: Added share', { itemId, personId, weight }, 'Current shares:', this.shares)
  }

  removeShare(itemId: string, personId: string) {
    const initialLength = this.shares.length
    console.log('Mock: BEFORE removal - shares:', this.shares)
    console.log('Mock: Attempting to remove share for', { itemId, personId })
    
    this.shares = this.shares.filter(s => {
      const shouldKeep = !(s.item_id === itemId && s.person_id === personId)
      if (!shouldKeep) {
        console.log('Mock: Removing share:', s)
      }
      return shouldKeep
    })
    
    const removed = initialLength - this.shares.length
    console.log('Mock: AFTER removal - shares:', this.shares)
    console.log('Mock: Removed', removed, 'share(s) for', { itemId, personId })
    return removed > 0
  }

  reset() {
    this.shares = [
      { item_id: '1', person_id: 'p1', weight: 0.5 },
      { item_id: '1', person_id: 'p2', weight: 0.5 },
      { item_id: '2', person_id: 'p2', weight: 1 },
      { item_id: '3', person_id: 'p3', weight: 1 }
    ]
    console.log('Mock: Reset shares to default:', this.shares)
  }
}

export const mockDataStore = new MockDataStore()