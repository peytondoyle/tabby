import React, { useCallback, useEffect, useRef, useState } from 'react'

export interface RovingTabIndexOptions {
  /**
   * Whether the roving tabindex is currently active
   */
  active: boolean
  /**
   * The currently focused index
   */
  focusedIndex: number
  /**
   * Set the focused index
   */
  setFocusedIndex: (index: number) => void
  /**
   * Move focus to the next item
   */
  focusNext: () => void
  /**
   * Move focus to the previous item
   */
  focusPrevious: () => void
  /**
   * Move focus to the first item
   */
  focusFirst: () => void
  /**
   * Move focus to the last item
   */
  focusLast: () => void
  /**
   * Handle keyboard events for roving tabindex
   */
  handleKeyDown: (event: React.KeyboardEvent) => void
  /**
   * Get the tabIndex for an item at the given index
   */
  getTabIndex: (index: number) => number
  /**
   * Get the ref for an item at the given index
   */
  getItemRef: (index: number) => React.RefObject<HTMLElement>
}

/**
 * Hook for implementing roving tabindex navigation
 * @param items Array of items to navigate
 * @param options Configuration options
 * @returns Roving tabindex utilities
 */
export function useRovingTabIndex<T>(
  items: T[],
  options: {
    /**
     * Whether navigation should wrap around
     */
    wrap?: boolean
    /**
     * Whether to start with the first item focused
     */
    autoFocus?: boolean
    /**
     * Custom key handlers
     */
    onKeyDown?: (event: React.KeyboardEvent, index: number) => void
  } = {}
): RovingTabIndexOptions {
  const { wrap = true, autoFocus = false, onKeyDown } = options
  const [focusedIndex, setFocusedIndex] = useState<number>(autoFocus ? 0 : -1)
  const [active, setActive] = useState(false)
  const itemRefs = useRef<Map<number, React.RefObject<HTMLElement>>>(new Map())

  // Create refs for each item
  useEffect(() => {
    itemRefs.current.clear()
    for (let i = 0; i < items.length; i++) {
      if (!itemRefs.current.has(i)) {
        itemRefs.current.set(i, { current: null as unknown as HTMLElement })
      }
    }
  }, [items.length])

  const focusNext = useCallback(() => {
    if (items.length === 0) return
    
    setFocusedIndex(prev => {
      if (prev === -1) return 0
      const next = prev + 1
      return wrap ? next % items.length : Math.min(next, items.length - 1)
    })
  }, [items.length, wrap])

  const focusPrevious = useCallback(() => {
    if (items.length === 0) return
    
    setFocusedIndex(prev => {
      if (prev === -1) return items.length - 1
      const prevIndex = prev - 1
      return wrap ? (prevIndex + items.length) % items.length : Math.max(prevIndex, 0)
    })
  }, [items.length, wrap])

  const focusFirst = useCallback(() => {
    if (items.length > 0) {
      setFocusedIndex(0)
    }
  }, [items.length])

  const focusLast = useCallback(() => {
    if (items.length > 0) {
      setFocusedIndex(items.length - 1)
    }
  }, [items.length])

  const getTabIndex = useCallback((index: number) => {
    return focusedIndex === index ? 0 : -1
  }, [focusedIndex])

  const getItemRef = useCallback((index: number) => {
    if (!itemRefs.current.has(index)) {
      itemRefs.current.set(index, { current: null as unknown as HTMLElement })
    }
    return itemRefs.current.get(index)!
  }, [])

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (items.length === 0) return

    // Call custom key handler first
    if (onKeyDown) {
      onKeyDown(event, focusedIndex)
      if (event.defaultPrevented) return
    }

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        event.preventDefault()
        focusNext()
        break
      case 'ArrowUp':
      case 'ArrowLeft':
        event.preventDefault()
        focusPrevious()
        break
      case 'Home':
        event.preventDefault()
        focusFirst()
        break
      case 'End':
        event.preventDefault()
        focusLast()
        break
      case 'Tab':
        // Allow normal tab behavior
        setActive(false)
        break
    }
  }, [focusedIndex, focusNext, focusPrevious, focusFirst, focusLast, onKeyDown, items.length])

  // Focus the current item when focusedIndex changes
  useEffect(() => {
    if (focusedIndex >= 0 && focusedIndex < items.length) {
      const ref = itemRefs.current.get(focusedIndex)
      if (ref?.current) {
        ref.current.focus()
      }
    }
  }, [focusedIndex, items.length])

  return {
    active,
    focusedIndex,
    setFocusedIndex,
    focusNext,
    focusPrevious,
    focusFirst,
    focusLast,
    handleKeyDown,
    getTabIndex,
    getItemRef,
  }
}

/**
 * Hook for managing keyboard selection state
 */
export function useKeyboardSelection<T>(
  _items: T[],
  options: {
    multiSelect?: boolean
    onSelectionChange?: (selected: T[]) => void
  } = {}
) {
  const { multiSelect = false, onSelectionChange } = options
  const [selectedItems, setSelectedItems] = useState<T[]>([])
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number>(-1)

  const toggleSelection = useCallback((item: T, index: number) => {
    setSelectedItems(prev => {
      const isSelected = prev.includes(item)
      let newSelection: T[]

      if (multiSelect) {
        if (isSelected) {
          newSelection = prev.filter(i => i !== item)
        } else {
          newSelection = [...prev, item]
        }
      } else {
        newSelection = isSelected ? [] : [item]
      }

      setLastSelectedIndex(index)
      onSelectionChange?.(newSelection)
      return newSelection
    })
  }, [multiSelect, onSelectionChange])

  const clearSelection = useCallback(() => {
    setSelectedItems([])
    setLastSelectedIndex(-1)
    onSelectionChange?.([])
  }, [onSelectionChange])

  const isSelected = useCallback((item: T) => {
    return selectedItems.includes(item)
  }, [selectedItems])

  return {
    selectedItems,
    lastSelectedIndex,
    toggleSelection,
    clearSelection,
    isSelected,
  }
}

/**
 * Hook for managing assign mode state
 */
export function useAssignMode() {
  const [isAssignMode, setIsAssignMode] = useState(false)
  const [assignTarget, setAssignTarget] = useState<string | null>(null)

  const enterAssignMode = useCallback((targetId: string) => {
    setIsAssignMode(true)
    setAssignTarget(targetId)
  }, [])

  const exitAssignMode = useCallback(() => {
    setIsAssignMode(false)
    setAssignTarget(null)
  }, [])

  return {
    isAssignMode,
    assignTarget,
    enterAssignMode,
    exitAssignMode,
  }
}

/**
 * Keyboard navigation constants
 */
export const KEYBOARD_NAVIGATION = {
  KEYS: {
    ENTER: 'Enter',
    SPACE: ' ',
    ESCAPE: 'Escape',
    ARROW_UP: 'ArrowUp',
    ARROW_DOWN: 'ArrowDown',
    ARROW_LEFT: 'ArrowLeft',
    ARROW_RIGHT: 'ArrowRight',
    HOME: 'Home',
    END: 'End',
    TAB: 'Tab',
  },
  ROLES: {
    GRID: 'grid',
    GRIDCELL: 'gridcell',
    BUTTON: 'button',
    LIST: 'list',
    LISTITEM: 'listitem',
  },
  ARIA_LABELS: {
    ITEMS_GRID: 'Items grid - use arrow keys to navigate, Enter to select, Space for assign mode',
    PEOPLE_DOCK: 'People dock - use arrow keys to navigate, Enter to assign selected items',
    ASSIGN_MODE: 'Assign mode - select a person to assign items',
  },
} as const
