import { showSuccess, showError } from './exportUtils'

export interface AssignmentShare {
  itemId: string
  personId: string
  weight: number
}

export interface UndoData {
  itemIds: string[]
  personId: string
  previousShares: AssignmentShare[]
  timestamp: number
}

export interface MultiSelectDropResult {
  success: boolean
  assignedCount: number
  personName: string
  undoData: UndoData | null
}

/**
 * Handle multi-select drop to a person
 * @param selectedItemIds Array of selected item IDs
 * @param personId Target person ID
 * @param personName Person's name for display
 * @param existingShares Current shares for the items
 * @param onAssign Callback to assign items
 * @param onUnassign Callback to unassign items
 * @returns Result with success status and undo data
 */
export function handleMultiSelectDrop(
  selectedItemIds: string[],
  personId: string,
  personName: string,
  existingShares: AssignmentShare[],
  onAssign: (itemId: string, personId: string, weight?: number) => void,





): MultiSelectDropResult {
  if (selectedItemIds.length === 0) {
    return {
      success: false,
      assignedCount: 0,
      personName,
      undoData: null
    }
  }

  // Store previous state for undo
  const previousShares: AssignmentShare[] = []
  const assignedCount = selectedItemIds.length

  // Process each selected item
  for (const itemId of selectedItemIds) {
    // Find existing share for this item-person combination
    const existingShare = existingShares.find(
      share => share.itemId === itemId && share.personId === personId
    )

    if (existingShare) {
      // Store previous state
      previousShares.push({
        itemId,
        personId,
        weight: existingShare.weight
      })
      
      // Update existing assignment: increment weight by 1
      onAssign(itemId, personId, existingShare.weight + 1)
    } else {
      // Store previous state (no existing share)
      previousShares.push({
        itemId,
        personId,
        weight: 0
      })
      
      // Create new assignment with weight 1
      onAssign(itemId, personId, 1)
    }
  }

  // Create undo data
  const undoData: UndoData = {
    itemIds: selectedItemIds,
    personId,
    previousShares,
    timestamp: Date.now()
  }

  // Show success message
  showSuccess(`Assigned ${assignedCount} item${assignedCount === 1 ? '' : 's'} to ${personName}`)

  return {
    success: true,
    assignedCount,
    personName,
    undoData
  }
}

/**
 * Undo a multi-select assignment
 * @param undoData Undo data from the original assignment
 * @param onAssign Callback to assign items
 * @param onUnassign Callback to unassign items
 * @returns Success status
 */
export function undoMultiSelectAssignment(
  undoData: UndoData,
  onAssign: (itemId: string, personId: string, weight?: number) => void,
  onUnassign: (itemId: string, personId: string) => void





): boolean {
  try {
    for (const share of undoData.previousShares) {
      if (share.weight === 0) {
        // Was not assigned before, so unassign now
        onUnassign(share.itemId, share.personId)
      } else {
        // Was assigned before, restore previous weight
        onAssign(share.itemId, share.personId, share.weight)
      }
    }

    showSuccess(`Undid assignment of ${undoData.itemIds.length} item${undoData.itemIds.length === 1 ? '' : 's'}`)
    return true
  } catch (error) {
    console.error('Error undoing assignment:', error)
    showError('Failed to undo assignment')
    return false
  }
}

/**
 * Check if an item is selected
 * @param itemId Item ID to check
 * @param selectedItems Set of selected item IDs
 * @returns True if item is selected
 */
export function isItemSelected(itemId: string, selectedItems: Set<string>): boolean {
  return selectedItems.has(itemId)
}

/**
 * Toggle item selection
 * @param itemId Item ID to toggle
 * @param selectedItems Current selected items
 * @param setSelectedItems State setter for selected items
 * @param lastSelectedIndex Last selected index for range selection
 * @param setLastSelectedIndex State setter for last selected index
 * @param items All items for range calculation
 * @param event Mouse event for modifier keys
 */
export function toggleItemSelection(
  itemId: string,
  index: number,
  selectedItems: Set<string>,
  setSelectedItems: React.Dispatch<React.SetStateAction<Set<string>>>,
  setLastSelectedIndex: React.Dispatch<React.SetStateAction<number | null>>,
  items: Array<{ id: string }>,
  event: React.MouseEvent
): void {
  const isShiftClick = event.shiftKey
  const isCommandClick = event.metaKey || event.ctrlKey

  if (isShiftClick && selectedItems.size > 0) {
    // Range selection - select all items between last selected and current
    const lastSelected = Array.from(selectedItems).reduce((last, id) => {
      const itemIndex = items.findIndex(item => item.id === id)
      return itemIndex > last ? itemIndex : last
    }, -1)
    
    const start = Math.min(lastSelected, index)
    const end = Math.max(lastSelected, index)
    const rangeItems = items.slice(start, end + 1).map(item => item.id)
    
    setSelectedItems(prev => {
      const newSet = new Set(prev)
      rangeItems.forEach(id => newSet.add(id))
      return newSet
    })
  } else if (isCommandClick) {
    // Toggle selection
    setSelectedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
    setLastSelectedIndex(index)
  } else {
    // Single selection
    setSelectedItems(new Set([itemId]))
    setLastSelectedIndex(index)
  }
}

/**
 * Clear all selections
 * @param setSelectedItems State setter for selected items
 * @param setLastSelectedIndex State setter for last selected index
 */
export function clearSelection(
  setSelectedItems: React.Dispatch<React.SetStateAction<Set<string>>>,
  setLastSelectedIndex: React.Dispatch<React.SetStateAction<number | null>>
): void {
  setSelectedItems(new Set())
  setLastSelectedIndex(null)
}
