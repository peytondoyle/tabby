import type { FlowBill, FlowPerson, FlowItem, FlowAssignment, FlowStep } from './flowStore'

const FLOW_STORAGE_KEY = 'tabby_flow_state'

export interface PersistedFlowState {
  bill: FlowBill | null
  people: FlowPerson[]
  items: FlowItem[]
  assignments: [string, FlowAssignment[]][] // Array of tuples for Map serialization
  currentStep: FlowStep
  billId: string
  lastUpdated: string
}

export function saveFlowState(
  bill: FlowBill | null,
  people: FlowPerson[],
  items: FlowItem[],
  assignments: Map<string, FlowAssignment[]>,
  currentStep: FlowStep,
  billId: string
): void {
  try {
    const state: PersistedFlowState = {
      bill,
      people,
      items,
      assignments: Array.from(assignments.entries()),
      currentStep,
      billId,
      lastUpdated: new Date().toISOString()
    }

    const key = `${FLOW_STORAGE_KEY}_${billId}`
    localStorage.setItem(key, JSON.stringify(state))
  } catch (error) {
    console.error('Failed to save flow state:', error)
  }
}

export function loadFlowState(billId: string): PersistedFlowState | null {
  try {
    const key = `${FLOW_STORAGE_KEY}_${billId}`
    const saved = localStorage.getItem(key)

    if (!saved) return null

    const state = JSON.parse(saved) as PersistedFlowState

    // Check if state is stale (older than 24 hours)
    const lastUpdated = new Date(state.lastUpdated)
    const now = new Date()
    const hoursSince = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60)

    if (hoursSince > 24) {
      localStorage.removeItem(key)
      return null
    }

    return state
  } catch (error) {
    console.error('Failed to load flow state:', error)
    return null
  }
}

export function clearFlowState(billId: string): void {
  try {
    const key = `${FLOW_STORAGE_KEY}_${billId}`
    localStorage.removeItem(key)
  } catch (error) {
    console.error('Failed to clear flow state:', error)
  }
}

// Clean up old flow states (older than 7 days)
export function cleanupOldFlowStates(): void {
  try {
    const now = new Date()
    const keys = Object.keys(localStorage)

    keys.forEach(key => {
      if (key.startsWith(FLOW_STORAGE_KEY)) {
        try {
          const state = JSON.parse(localStorage.getItem(key) || '{}') as PersistedFlowState
          if (state.lastUpdated) {
            const lastUpdated = new Date(state.lastUpdated)
            const daysSince = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24)

            if (daysSince > 7) {
              localStorage.removeItem(key)
            }
          }
        } catch {
          // Invalid state, remove it
          localStorage.removeItem(key)
        }
      }
    })
  } catch (error) {
    console.error('Failed to cleanup old flow states:', error)
  }
}