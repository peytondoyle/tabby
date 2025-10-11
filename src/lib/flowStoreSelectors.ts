import { useCallback } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useFlowStore } from './flowStore'
import type { PersonId, ItemId } from '@/types/flow'
import { handleMultiSelectDrop, undoMultiSelectAssignment, type UndoData } from './multiSelectDrop'
import { useDebouncedWeightUpdates } from './debouncedWeightUpdates'

// Optimized selectors that only read what components need

// People selectors
export const usePeople = () => useFlowStore(state => state.people)

export const usePerson = (personId: PersonId) => 
  useFlowStore(state => state.people.find(p => p.id === personId))

// Items selectors
export const useItems = () => useFlowStore(state => state.items)

export const useItem = (itemId: ItemId) => 
  useFlowStore(state => state.items.find(i => i.id === itemId))

// Assignment selectors
export const useAssignmentsForItem = (itemId: ItemId) => 
  useFlowStore(state => state.assignments.get(itemId) || [])

export const usePersonItems = (personId: PersonId) => 
  useFlowStore(state => {
    const itemIds: ItemId[] = []
    state.assignments.forEach((assignments, itemId) => {
      if (assignments.some(a => a.personId === personId)) {
        itemIds.push(itemId)
      }
    })
    return itemIds
  })

// Computed selectors with memoization
export const usePersonTotal = (personId: PersonId) => 
  useFlowStore(state => state.getTotalForPerson(personId))

export const useItemAssignments = (itemId: ItemId) => 
  useFlowStore(state => state.getItemAssignments(itemId))

// Bill selectors
export const useBill = () => useFlowStore(state => state.bill)

export const useBillTotals = () => 
  useFlowStore(state => state.computeBillTotals())

// Step selectors
export const useCurrentStep = () => useFlowStore(state => state.currentStep)

// Action selectors (these don't need shallow since they're functions)
export const useFlowActions = () => useFlowStore(state => ({
  setBill: state.setBill,
  setPeople: state.setPeople,
  addPerson: state.addPerson,
  removePerson: state.removePerson,
  deduplicatePeople: state.deduplicatePeople,
  setItems: state.setItems,
  updateItem: state.updateItem,
  removeItem: state.removeItem,
  assign: state.assign,
  unassign: state.unassign,
  clearAssignments: state.clearAssignments,
  updateAssignmentWeight: state.updateAssignmentWeight,
  setStep: state.setStep,
  nextStep: state.nextStep,
  prevStep: state.prevStep,
  setBillMeta: state.setBillMeta,
  replaceItems: state.replaceItems,
  upsertBillToken: state.upsertBillToken,
  reset: state.reset
}))

// Specific action selectors for better granularity
export const useAssignmentActions = () => useFlowStore(useShallow(state => ({
  assign: state.assign,
  unassign: state.unassign,
  clearAssignments: state.clearAssignments,
  updateAssignmentWeight: state.updateAssignmentWeight
})))

export const usePersonActions = () => useFlowStore(useShallow(state => ({
  addPerson: state.addPerson,
  removePerson: state.removePerson,
  deduplicatePeople: state.deduplicatePeople,
  setPeople: state.setPeople
})))

export const useItemActions = () => useFlowStore(useShallow(state => ({
  updateItem: state.updateItem,
  removeItem: state.removeItem
})))

// Memoized computed values
export const useAssignedHash = (itemId: ItemId) => 
  useFlowStore(state => {
    const assignments = state.assignments.get(itemId) || []
    return assignments
      .sort((a, b) => a.personId.localeCompare(b.personId))
      .map(a => `${a.personId}:${a.weight}`)
      .join(',')
  })

// Helper to create stable keys for memoization
export const createItemKey = (itemId: ItemId, price: number, assignedHash: string) => 
  `${itemId}-${price}-${assignedHash}`

export const createPersonKey = (personId: PersonId, assignedItemsCount: number) => 
  `${personId}-${assignedItemsCount}`

// Multi-select and weight update hooks
export const useMultiSelectActions = () => {
  const { assign, unassign } = useAssignmentActions()
  const getItemAssignments = useItemAssignments

  const handleMultiSelectDropToPerson = useCallback((
    selectedItemIds: string[],
    personId: PersonId,
    personName: string
  ) => {
    // Get current shares for validation
    const existingShares = selectedItemIds.flatMap(itemId => {
      const assignments = getItemAssignments(itemId)
      return assignments.map(personId => ({
        itemId,
        personId,
        weight: 1 // Default weight for existing assignments
      }))
    })

    return handleMultiSelectDrop(
      selectedItemIds,
      personId,
      personName,
      existingShares,
      assign
    )
  }, [assign, unassign, getItemAssignments])

  const undoAssignment = useCallback((undoData: UndoData) => {
    return undoMultiSelectAssignment(undoData, assign, unassign)
  }, [assign, unassign])

  return {
    handleMultiSelectDropToPerson,
    undoAssignment
  }
}

export const useWeightUpdateActions = (
  editorToken: string,
  onSuccess?: (result: any) => void,
  onError?: (error: Error) => void
) => {
  return useDebouncedWeightUpdates(editorToken, onSuccess, onError, 500)
}

// Get all assignments for an item as shares
export const useItemShares = (itemId: ItemId) => 
  useFlowStore(state => {
    const assignments = state.assignments.get(itemId) || []
    return assignments.map(assignment => ({
      itemId: assignment.itemId,
      personId: assignment.personId,
      weight: assignment.weight
    }))
  })
