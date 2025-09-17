// Define local types for testing
type PersonId = string
type ItemId = string

interface FlowPerson {
  id: PersonId
  name: string
  avatar?: string
  venmo_handle?: string
}

interface FlowItem {
  id: ItemId
  label: string
  price: number
  quantity?: number
  emoji?: string
}

interface FlowAssignment {
  itemId: ItemId
  personId: PersonId
  weight: number
}

// Create a simple vanilla store implementation for testing assignment logic
class TestAssignStore {
  people: FlowPerson[] = []
  items: FlowItem[] = []
  assignments: Map<ItemId, FlowAssignment[]> = new Map()
  
  setPeople = (people: FlowPerson[]) => {
    this.people = people
  }
  
  setItems = (items: FlowItem[]) => {
    this.items = items
  }
  
  assign = (itemId: ItemId, personId: PersonId, weight: number = 1) => {
    const currentAssignments = this.assignments.get(itemId) || []
    const existingIndex = currentAssignments.findIndex(a => a.personId === personId)
    
    if (existingIndex >= 0) {
      // Update existing assignment weight
      const updatedAssignments = [...currentAssignments]
      updatedAssignments[existingIndex] = { ...updatedAssignments[existingIndex], weight }
      this.assignments.set(itemId, updatedAssignments)
    } else {
      // Add new assignment
      this.assignments.set(itemId, [...currentAssignments, { itemId, personId, weight }])
    }
  }
  
  unassign = (itemId: ItemId, personId: PersonId) => {
    const currentAssignments = this.assignments.get(itemId) || []
    this.assignments.set(itemId, currentAssignments.filter(a => a.personId !== personId))
  }
  
  clearAssignments = (itemId: ItemId) => {
    this.assignments.delete(itemId)
  }
  
  updateAssignmentWeight = (itemId: ItemId, personId: PersonId, weight: number) => {
    const currentAssignments = this.assignments.get(itemId) || []
    const updatedAssignments = currentAssignments.map(a => 
      a.personId === personId ? { ...a, weight } : a
    )
    this.assignments.set(itemId, updatedAssignments)
  }
  
  getItemAssignments = (itemId: ItemId): PersonId[] => {
    const assignments = this.assignments.get(itemId) || []
    return assignments.map(a => a.personId)
  }
  
  getPersonItems = (personId: PersonId): ItemId[] => {
    const itemIds: ItemId[] = []
    this.assignments.forEach((assignments, itemId) => {
      if (assignments.some(a => a.personId === personId)) {
        itemIds.push(itemId)
      }
    })
    return itemIds
  }
  
  reset = () => {
    this.people = []
    this.items = []
    this.assignments = new Map()
  }
}

// Initialize test store
const getTestStore = () => new TestAssignStore()

describe('Assign Reducer (Flow Store)', () => {
  let store: ReturnType<typeof getTestStore>
  
  const mockPeople: FlowPerson[] = [
    { id: 'person-1', name: 'Alice', avatar: '👩' },
    { id: 'person-2', name: 'Bob', avatar: '👨' },
    { id: 'person-3', name: 'Charlie', avatar: '🧑' }
  ]
  
  const mockItems: FlowItem[] = [
    { id: 'item-1', label: 'Pizza', price: 20.00, emoji: '🍕' },
    { id: 'item-2', label: 'Beer', price: 8.00, emoji: '🍺' },
    { id: 'item-3', label: 'Salad', price: 12.00, emoji: '🥗' }
  ]

  beforeEach(() => {
    store = getTestStore()
    store.setPeople(mockPeople)
    store.setItems(mockItems)
  })

  describe('assign function', () => {
    it('should assign an item to a person with default weight of 1', () => {
      store.assign('item-1', 'person-1')
      
      const assignments = store.getItemAssignments('item-1')
      expect(assignments).toEqual(['person-1'])
    })

    it('should assign an item to a person with custom weight', () => {
      store.assign('item-1', 'person-1', 0.5)
      
      const assignments = store.assignments.get('item-1')
      expect(assignments).toHaveLength(1)
      expect(assignments![0]).toEqual({
        itemId: 'item-1',
        personId: 'person-1',
        weight: 0.5
      })
    })

    it('should update weight when assigning same item-person combination', () => {
      // First assignment with weight 1
      store.assign('item-1', 'person-1', 1)
      let assignments = store.assignments.get('item-1')
      expect(assignments![0].weight).toBe(1)
      
      // Second assignment with weight 0.5 should update
      store.assign('item-1', 'person-1', 0.5)
      assignments = store.assignments.get('item-1')
      expect(assignments).toHaveLength(1)
      expect(assignments![0].weight).toBe(0.5)
    })

    it('should allow multiple people to be assigned to same item', () => {
      store.assign('item-1', 'person-1', 0.5)
      store.assign('item-1', 'person-2', 0.5)
      
      const assignments = store.getItemAssignments('item-1')
      expect(assignments).toEqual(['person-1', 'person-2'])
    })

    it('should handle assignment to non-existent person', () => {
      store.assign('item-1', 'non-existent-person')
      
      const assignments = store.getItemAssignments('item-1')
      expect(assignments).toEqual(['non-existent-person'])
    })

    it('should handle assignment of non-existent item', () => {
      store.assign('non-existent-item', 'person-1')
      
      const assignments = store.getItemAssignments('non-existent-item')
      expect(assignments).toEqual(['person-1'])
    })
  })

  describe('unassign function', () => {
    beforeEach(() => {
      // Setup some assignments
      store.assign('item-1', 'person-1')
      store.assign('item-1', 'person-2')
      store.assign('item-2', 'person-1')
    })

    it('should remove specific person assignment from item', () => {
      store.unassign('item-1', 'person-1')
      
      const assignments = store.getItemAssignments('item-1')
      expect(assignments).toEqual(['person-2'])
    })

    it('should remove all assignments when last person is unassigned', () => {
      store.unassign('item-2', 'person-1')
      
      const assignments = store.getItemAssignments('item-2')
      expect(assignments).toEqual([])
    })

    it('should handle unassigning non-existent assignment', () => {
      store.unassign('item-1', 'person-3')
      
      const assignments = store.getItemAssignments('item-1')
      expect(assignments).toEqual(['person-1', 'person-2'])
    })

    it('should handle unassigning from non-existent item', () => {
      expect(() => {
        store.unassign('non-existent-item', 'person-1')
      }).not.toThrow()
      
      const assignments = store.getItemAssignments('non-existent-item')
      expect(assignments).toEqual([])
    })
  })

  describe('clearAssignments function', () => {
    beforeEach(() => {
      store.assign('item-1', 'person-1')
      store.assign('item-1', 'person-2')
      store.assign('item-2', 'person-1')
    })

    it('should remove all assignments for an item', () => {
      store.clearAssignments('item-1')
      
      const assignments = store.getItemAssignments('item-1')
      expect(assignments).toEqual([])
    })

    it('should not affect other items assignments', () => {
      store.clearAssignments('item-1')
      
      const item2Assignments = store.getItemAssignments('item-2')
      expect(item2Assignments).toEqual(['person-1'])
    })

    it('should handle clearing non-existent item assignments', () => {
      expect(() => {
        store.clearAssignments('non-existent-item')
      }).not.toThrow()
    })
  })

  describe('updateAssignmentWeight function', () => {
    beforeEach(() => {
      store.assign('item-1', 'person-1', 1)
      store.assign('item-1', 'person-2', 0.5)
    })

    it('should update weight for existing assignment', () => {
      store.updateAssignmentWeight('item-1', 'person-1', 0.75)
      
      const assignments = store.assignments.get('item-1')
      const person1Assignment = assignments!.find(a => a.personId === 'person-1')
      expect(person1Assignment!.weight).toBe(0.75)
    })

    it('should not affect other assignments', () => {
      store.updateAssignmentWeight('item-1', 'person-1', 0.75)
      
      const assignments = store.assignments.get('item-1')
      const person2Assignment = assignments!.find(a => a.personId === 'person-2')
      expect(person2Assignment!.weight).toBe(0.5)
    })

    it('should handle updating non-existent assignment', () => {
      expect(() => {
        store.updateAssignmentWeight('item-1', 'person-3', 0.25)
      }).not.toThrow()
      
      // Should not create a new assignment
      const assignments = store.getItemAssignments('item-1')
      expect(assignments).toEqual(['person-1', 'person-2'])
    })
  })

  describe('getItemAssignments function', () => {
    beforeEach(() => {
      store.assign('item-1', 'person-1')
      store.assign('item-1', 'person-3')
      store.assign('item-2', 'person-2')
    })

    it('should return array of person IDs assigned to item', () => {
      const assignments = store.getItemAssignments('item-1')
      expect(assignments).toEqual(['person-1', 'person-3'])
    })

    it('should return empty array for item with no assignments', () => {
      const assignments = store.getItemAssignments('item-3')
      expect(assignments).toEqual([])
    })

    it('should return empty array for non-existent item', () => {
      const assignments = store.getItemAssignments('non-existent-item')
      expect(assignments).toEqual([])
    })
  })

  describe('getPersonItems function', () => {
    beforeEach(() => {
      store.assign('item-1', 'person-1')
      store.assign('item-2', 'person-1')
      store.assign('item-1', 'person-2')
      store.assign('item-3', 'person-3')
    })

    it('should return array of item IDs assigned to person', () => {
      const items = store.getPersonItems('person-1')
      expect(items).toEqual(['item-1', 'item-2'])
    })

    it('should return empty array for person with no assignments', () => {
      const items = store.getPersonItems('non-existent-person')
      expect(items).toEqual([])
    })

    it('should handle shared items correctly', () => {
      const items = store.getPersonItems('person-2')
      expect(items).toEqual(['item-1'])
    })
  })


  describe('complex assignment scenarios', () => {
    it('should handle multiple people sharing multiple items with different weights', () => {
      // Alice gets full pizza
      store.assign('item-1', 'person-1', 1.0)
      
      // Bob and Charlie split beer
      store.assign('item-2', 'person-2', 0.5)
      store.assign('item-2', 'person-3', 0.5)
      
      // All three split salad equally  
      store.assign('item-3', 'person-1', 0.33)
      store.assign('item-3', 'person-2', 0.33)
      store.assign('item-3', 'person-3', 0.34)
      
      // Verify assignments
      expect(store.getItemAssignments('item-1')).toEqual(['person-1'])
      expect(store.getItemAssignments('item-2')).toEqual(['person-2', 'person-3'])
      expect(store.getItemAssignments('item-3')).toEqual(['person-1', 'person-2', 'person-3'])
      
      // Verify person items
      expect(store.getPersonItems('person-1')).toEqual(['item-1', 'item-3'])
      expect(store.getPersonItems('person-2')).toEqual(['item-2', 'item-3'])
      expect(store.getPersonItems('person-3')).toEqual(['item-2', 'item-3'])
    })
  })
})