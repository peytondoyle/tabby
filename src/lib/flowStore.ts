import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { DraftBill } from './draft'
import { createDraftFromParseResult, saveDraftToLocal, loadDraftFromLocal } from './draft'
import type { ParseResult } from './receiptScanning'

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
  id: string
  name: string
  avatar?: string
  venmo_handle?: string
}

export interface FlowItem {
  id: string
  label: string
  price: number
  quantity?: number
  emoji?: string
}

export type FlowStep = 'start' | 'people' | 'review' | 'assign' | 'share'

interface FlowState {
  // Core data
  bill: FlowBill | null
  people: FlowPerson[]
  items: FlowItem[]
  assignments: Map<string, string[]> // itemId -> personIds[]
  
  // Current step
  currentStep: FlowStep
  
  // Draft state
  currentDraft: DraftBill | null
  
  // Actions
  setBill: (bill: FlowBill) => void
  setPeople: (people: FlowPerson[]) => void
  addPerson: (person: FlowPerson) => void
  removePerson: (personId: string) => void
  
  setItems: (items: FlowItem[]) => void
  updateItem: (itemId: string, updates: Partial<FlowItem>) => void
  removeItem: (itemId: string) => void
  
  assign: (itemId: string, personId: string) => void
  unassign: (itemId: string, personId: string) => void
  clearAssignments: (itemId: string) => void
  
  setStep: (step: FlowStep) => void
  nextStep: () => void
  prevStep: () => void
  
  // Computed getters
  getItemAssignments: (itemId: string) => string[]
  getPersonItems: (personId: string) => string[]
  getTotalForPerson: (personId: string) => number
  computeBillTotals: () => { 
    personTotals: Array<{ personId: string; subtotal: number; taxShare: number; tipShare: number; total: number }>
    billTotal: number
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
        set((state) => ({ 
          people: [...state.people, person] 
        }), false, 'addPerson'),
      removePerson: (personId) => 
        set((state) => ({ 
          people: state.people.filter(p => p.id !== personId),
          assignments: new Map(
            Array.from(state.assignments.entries()).map(([itemId, personIds]) => [
              itemId,
              personIds.filter(id => id !== personId)
            ])
          )
        }), false, 'removePerson'),
      
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
      assign: (itemId, personId) => 
        set((state) => {
          const newAssignments = new Map(state.assignments)
          const currentAssignments = newAssignments.get(itemId) || []
          if (!currentAssignments.includes(personId)) {
            newAssignments.set(itemId, [...currentAssignments, personId])
          }
          return { assignments: newAssignments }
        }, false, 'assign'),
        
      unassign: (itemId, personId) => 
        set((state) => {
          const newAssignments = new Map(state.assignments)
          const currentAssignments = newAssignments.get(itemId) || []
          newAssignments.set(itemId, currentAssignments.filter(id => id !== personId))
          return { assignments: newAssignments }
        }, false, 'unassign'),
        
      clearAssignments: (itemId) => 
        set((state) => {
          const newAssignments = new Map(state.assignments)
          newAssignments.delete(itemId)
          return { assignments: newAssignments }
        }, false, 'clearAssignments'),
      
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
      getItemAssignments: (itemId) => get().assignments.get(itemId) || [],
      getPersonItems: (personId) => {
        const { assignments } = get()
        const itemIds: string[] = []
        assignments.forEach((personIds, itemId) => {
          if (personIds.includes(personId)) {
            itemIds.push(itemId)
          }
        })
        return itemIds
      },
      getTotalForPerson: (personId) => {
        const { items, assignments } = get()
        let total = 0
        
        assignments.forEach((personIds, itemId) => {
          if (personIds.includes(personId)) {
            const item = items.find(i => i.id === itemId)
            if (item) {
              // Split the item cost evenly among assigned people
              const splitCost = item.price / personIds.length
              total += splitCost
            }
          }
        })
        
        return total
      },

      computeBillTotals: () => {
        const { people, items, assignments: _assignments } = get()
        const billTotal = items.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0)
        
        const personTotals = people.map(person => {
          const subtotal = get().getTotalForPerson(person.id)
          // For v1, tax and tip shares are 0 (will be added in later pass)
          const taxShare = 0
          const tipShare = 0
          const total = subtotal + taxShare + tipShare
          
          return {
            personId: person.id,
            subtotal,
            taxShare,
            tipShare,
            total
          }
        })
        
        return { personTotals, billTotal }
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
      
      replaceItems: (items) => 
        set({ items, assignments: new Map() }, false, 'replaceItems'),
      
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