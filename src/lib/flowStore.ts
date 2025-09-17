import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { DraftBill } from './draft'
import { createDraftFromParseResult, saveDraftToLocal, loadDraftFromLocal } from './draft'
import type { ParseResult } from './receiptScanning'
import type { PersonId, ItemId } from '@/types/flow'

export interface FlowBill {
  id?: string
  token?: string
  title?: string
  place?: string
  date?: string
  subtotal?: number
  tax?: number
  tip?: number
  total?: number
}

export interface FlowPerson {
  id: PersonId
  name: string
  avatar?: string
  venmo_handle?: string
}

export interface FlowItem {
  id: ItemId
  label: string
  price: number
  quantity?: number
  emoji?: string
}

export interface FlowAssignment {
  itemId: ItemId
  personId: PersonId
  weight: number // For splitting items across multiple people
}

export type FlowStep = 'start' | 'people' | 'review' | 'assign' | 'share'

interface FlowState {
  // Core data
  bill: FlowBill | null
  people: FlowPerson[]
  items: FlowItem[]
  assignments: Map<ItemId, FlowAssignment[]> // itemId -> assignments[]
  
  // Current step
  currentStep: FlowStep
  
  // Draft state
  currentDraft: DraftBill | null
  
  // Actions
  setBill: (bill: FlowBill) => void
  setPeople: (people: FlowPerson[]) => void
  addPerson: (person: FlowPerson) => void
  removePerson: (personId: PersonId) => void
  deduplicatePeople: () => void
  
  setItems: (items: FlowItem[]) => void
  updateItem: (itemId: ItemId, updates: Partial<FlowItem>) => void
  removeItem: (itemId: ItemId) => void
  
  assign: (itemId: ItemId, personId: PersonId, weight?: number) => void
  unassign: (itemId: ItemId, personId: PersonId) => void
  clearAssignments: (itemId: ItemId) => void
  updateAssignmentWeight: (itemId: ItemId, personId: PersonId, weight: number) => void
  
  setStep: (step: FlowStep) => void
  nextStep: () => void
  prevStep: () => void
  
  // Computed getters
  getItemAssignments: (itemId: ItemId) => PersonId[]
  getPersonItems: (personId: PersonId) => ItemId[]
  getTotalForPerson: (personId: PersonId) => number
  computeBillTotals: () => { 
    personTotals: Array<{ personId: PersonId; subtotal: number; taxShare: number; tipShare: number; total: number }>
    billTotal: number
  }
  computeTotals: () => {
    subtotal: number
    tax: number
    tip: number
    total: number
    personTotals: Record<string, number>
    distributed: number
  }
  
  // Draft actions
  startDraft: (parse: ParseResult) => string
  hydrateDraft: (token: string) => void
  clearDraft: () => void
  
  // Minimal helpers for existing architecture
  setBillMeta: (meta: Partial<FlowBill>) => void
  replaceItems: (items: FlowItem[]) => void
  upsertBillToken: (token: string) => void
  
  // Reset
  reset: () => void
}

const stepOrder: FlowStep[] = ['start', 'people', 'review', 'assign', 'share']

export const useFlowStore = create<FlowState>()(
  devtools(
    (set, get) => ({
      // Initial state
      bill: null,
      people: [],
      items: [],
      assignments: new Map(),
      currentStep: 'start',
      currentDraft: null,
      
      // Bill actions
      setBill: (bill) => set({ bill }, false, 'setBill'),
      
      // People actions
      setPeople: (people) => set({ people }, false, 'setPeople'),
      addPerson: (person) => 
        set((state) => {
          // Check for duplicates by name (case-insensitive)
          const isDuplicate = state.people.some(p => 
            p.name.toLowerCase() === person.name.toLowerCase()
          )
          
          if (isDuplicate) {
            console.warn(`[flow_store] Person "${person.name}" already exists, skipping`)
            return state
          }
          
          return { 
            people: [...state.people, person] 
          }
        }, false, 'addPerson'),
      removePerson: (personId) => 
        set((state) => ({ 
          people: state.people.filter(p => p.id !== personId),
          assignments: new Map(
            Array.from(state.assignments.entries()).map(([itemId, assignments]) => [
              itemId,
              assignments.filter(assignment => assignment.personId !== personId)
            ])
          )
        }), false, 'removePerson'),
      
      // Clean up duplicate people
      deduplicatePeople: () => 
        set((state) => {
          const seen = new Set<string>()
          const uniquePeople = state.people.filter(person => {
            const nameKey = person.name.toLowerCase()
            if (seen.has(nameKey)) {
              console.warn(`[flow_store] Removing duplicate person: "${person.name}"`)
              return false
            }
            seen.add(nameKey)
            return true
          })
          
          if (uniquePeople.length !== state.people.length) {
            console.info(`[flow_store] Removed ${state.people.length - uniquePeople.length} duplicate people`)
          }
          
          return { people: uniquePeople }
        }, false, 'deduplicatePeople'),
      
      // Items actions  
      setItems: (items) => set({ items }, false, 'setItems'),
      updateItem: (itemId, updates) => 
        set((state) => ({ 
          items: state.items.map(item => 
            item.id === itemId ? { ...item, ...updates } : item
          )
        }), false, 'updateItem'),
      removeItem: (itemId) => 
        set((state) => {
          const newAssignments = new Map(state.assignments)
          newAssignments.delete(itemId)
          return { 
            items: state.items.filter(item => item.id !== itemId),
            assignments: newAssignments
          }
        }, false, 'removeItem'),
      
      // Assignment actions
      assign: (itemId, personId, weight = 1) => 
        set((state) => {
          const newAssignments = new Map(state.assignments)
          const currentAssignments = newAssignments.get(itemId) || []
          const existingIndex = currentAssignments.findIndex(a => a.personId === personId)
          
          if (existingIndex >= 0) {
            // Update existing assignment weight
            const updatedAssignments = [...currentAssignments]
            updatedAssignments[existingIndex] = { ...updatedAssignments[existingIndex], weight }
            newAssignments.set(itemId, updatedAssignments)
          } else {
            // Add new assignment
            newAssignments.set(itemId, [...currentAssignments, { itemId, personId, weight }])
          }
          return { assignments: newAssignments }
        }, false, 'assign'),
        
      unassign: (itemId, personId) => 
        set((state) => {
          const newAssignments = new Map(state.assignments)
          const currentAssignments = newAssignments.get(itemId) || []
          newAssignments.set(itemId, currentAssignments.filter(a => a.personId !== personId))
          return { assignments: newAssignments }
        }, false, 'unassign'),
        
      clearAssignments: (itemId) => 
        set((state) => {
          const newAssignments = new Map(state.assignments)
          newAssignments.delete(itemId)
          return { assignments: newAssignments }
        }, false, 'clearAssignments'),
        
      updateAssignmentWeight: (itemId, personId, weight) => 
        set((state) => {
          const newAssignments = new Map(state.assignments)
          const currentAssignments = newAssignments.get(itemId) || []
          const updatedAssignments = currentAssignments.map(a => 
            a.personId === personId ? { ...a, weight } : a
          )
          newAssignments.set(itemId, updatedAssignments)
          return { assignments: newAssignments }
        }, false, 'updateAssignmentWeight'),
      
      // Step navigation
      setStep: (step) => set({ currentStep: step }, false, 'setStep'),
      nextStep: () => 
        set((state) => {
          const currentIndex = stepOrder.indexOf(state.currentStep)
          const nextIndex = Math.min(currentIndex + 1, stepOrder.length - 1)
          return { currentStep: stepOrder[nextIndex] }
        }, false, 'nextStep'),
      prevStep: () => 
        set((state) => {
          const currentIndex = stepOrder.indexOf(state.currentStep)
          const prevIndex = Math.max(currentIndex - 1, 0)
          return { currentStep: stepOrder[prevIndex] }
        }, false, 'prevStep'),
      
      // Getters
      getItemAssignments: (itemId) => {
        const assignments = get().assignments.get(itemId) || []
        return assignments.map(a => a.personId)
      },
      getPersonItems: (personId) => {
        const { assignments } = get()
        const itemIds: ItemId[] = []
        assignments.forEach((assignments, itemId) => {
          if (assignments.some(a => a.personId === personId)) {
            itemIds.push(itemId)
          }
        })
        return itemIds
      },
      getTotalForPerson: (personId) => {
        const { items, assignments, bill } = get()
        let subtotal = 0
        
        assignments.forEach((assignments, itemId) => {
          const personAssignment = assignments.find(a => a.personId === personId)
          if (personAssignment) {
            const item = items.find(i => i.id === itemId)
            if (item) {
              // Calculate cost based on weight
              const totalWeight = assignments.reduce((sum, a) => sum + a.weight, 0)
              const personShare = (personAssignment.weight / totalWeight) * item.price
              subtotal += personShare
            }
          }
        })
        
        // Add proportional tax and tip
        const totalSubtotal = items.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0)
        const tax = bill?.tax || 0
        const tip = bill?.tip || 0
        
        const taxShare = totalSubtotal > 0 ? (subtotal / totalSubtotal) * tax : 0
        const tipShare = totalSubtotal > 0 ? (subtotal / totalSubtotal) * tip : 0
        
        return subtotal + taxShare + tipShare
      },

      computeBillTotals: () => {
        const { people, items, bill, assignments: _assignments } = get()
        const subtotal = items.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0)
        const tax = bill?.tax || 0
        const tip = bill?.tip || 0
        const billTotal = subtotal + tax + tip
        
        const personTotals = people.map(person => {
          const personSubtotal = get().getTotalForPerson(person.id)
          
          // Calculate proportional tax and tip shares
          const taxShare = subtotal > 0 ? (personSubtotal / subtotal) * tax : 0
          const tipShare = subtotal > 0 ? (personSubtotal / subtotal) * tip : 0
          const total = personSubtotal + taxShare + tipShare
          
          return {
            personId: person.id,
            subtotal: personSubtotal,
            taxShare,
            tipShare,
            total
          }
        })
        
        return { personTotals, billTotal }
      },

      computeTotals: () => {
        const { people, items, bill } = get()
        const subtotal = items.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0)
        const tax = bill?.tax || 0
        const tip = bill?.tip || 0
        const total = subtotal + tax + tip
        
        const personTotals: Record<string, number> = {}
        people.forEach(person => {
          personTotals[person.id] = get().getTotalForPerson(person.id)
        })
        
        const personTotalsSum = Object.values(personTotals).reduce((sum, total) => sum + total, 0)
        const distributed = total - personTotalsSum
        
        return {
          subtotal,
          tax,
          tip,
          total,
          personTotals,
          distributed
        }
      },

      // Draft actions
      startDraft: (parse: ParseResult) => {
        const draft = createDraftFromParseResult(parse)
        saveDraftToLocal(draft)
        set({ currentDraft: draft }, false, 'startDraft')
        return draft.token
      },

      hydrateDraft: (token: string) => {
        const draft = loadDraftFromLocal(token)
        if (draft) {
          set({ currentDraft: draft }, false, 'hydrateDraft')
        }
      },

      clearDraft: () => {
        set({ currentDraft: null }, false, 'clearDraft')
      },
      
      // Minimal helpers for existing architecture
      setBillMeta: (meta) => 
        set((state) => ({ 
          bill: state.bill ? { ...state.bill, ...meta } : meta as FlowBill 
        }), false, 'setBillMeta'),
      
      replaceItems: (items) => {
        console.log('[flow_store] replaceItems called with:', items.length, 'items')
        set({ items, assignments: new Map() }, false, 'replaceItems')
      },
      
      upsertBillToken: (token) => 
        set((state) => ({ 
          bill: state.bill ? { ...state.bill, token } : { token } 
        }), false, 'upsertBillToken'),
      
      // Reset
      reset: () => set({
        bill: null,
        people: [],
        items: [],
        assignments: new Map(),
        currentStep: 'start',
        currentDraft: null
      }, false, 'reset')
    }),
    {
      name: 'flow-store'
    }
  )
)