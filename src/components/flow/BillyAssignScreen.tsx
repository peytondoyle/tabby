import React, { useState, useCallback, useRef, useEffect } from 'react'
import { usePeople, useItems, useItemAssignments, usePersonTotal, useAssignmentActions, usePersonActions, useMultiSelectActions, useWeightUpdateActions } from '@/lib/flowStoreSelectors'
import type { PersonId } from '@/types/flow'
import { AddPeopleModal } from '@/components/AddPeopleModal'
import { BillyShareSheet } from './BillyShareSheet'
import { PageContainer } from '@/components/PageContainer'
import { Button } from "@/components/ui/Button"
import { showError } from '@/lib/exportUtils'
import { VirtualizedPersonItems } from '@/components/VirtualizedItemList/VirtualizedPersonItems'
import { WeightStepper } from '@/components/ui/WeightStepper'
import { toggleItemSelection, clearSelection } from '@/lib/multiSelectDrop'
import type { UndoData } from '@/lib/multiSelectDrop'
import { flowItemToItem } from '@/lib/types'

interface BillyAssignScreenProps {
  onNext: () => void
  onBack: () => void
}

export const BillyAssignScreen: React.FC<BillyAssignScreenProps> = ({ onNext, onBack }) => {
  // Use optimized selectors instead of broad store access
  const people = usePeople()
  const items = useItems()
  const getItemAssignments = useItemAssignments
  const getTotalForPerson = usePersonTotal
  const { assign, unassign } = useAssignmentActions()
  const { setPeople, deduplicatePeople } = usePersonActions()
  const { handleMultiSelectDropToPerson, undoAssignment } = useMultiSelectActions()

  const [showPeopleSheet, setShowPeopleSheet] = useState(false)
  const [showShareSheet, setShowShareSheet] = useState(false)
  
  // Multi-select state
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [, setLastSelectedIndex] = useState<number | null>(null)
  const [, setIsLongPressing] = useState(false)
  const [undoData, setUndoData] = useState<UndoData | null>(null)
  
  // Long press state for mobile
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  
  // Weight update functionality with batch API
  const handleWeightUpdateSuccess = useCallback((result: any) => {
    console.log('Weight updates successful:', result)
    // Optionally show success message
  }, [])

  const handleWeightUpdateError = useCallback((error: Error) => {
    console.error('Weight update failed:', error)
    showError('Failed to update weights')
  }, [])

  const { updateWeight } = useWeightUpdateActions(
    'editor-token', // TODO: Get actual editor token
    handleWeightUpdateSuccess,
    handleWeightUpdateError
  )
  
  // Clean up duplicates on mount and when people change
  React.useEffect(() => {
    deduplicatePeople()
  }, [deduplicatePeople, people.length])

  // Clear selection when items change
  useEffect(() => {
    setSelectedItems(new Set())
    setLastSelectedIndex(null)
  }, [items])

  // Handle item selection with Shift/Command support
  const handleItemSelect = useCallback((itemId: string, index: number, event: React.MouseEvent) => {
    toggleItemSelection(
      itemId,
      index,
      selectedItems,
      setSelectedItems,
      setLastSelectedIndex,
      items,
      event
    )
  }, [selectedItems, items])

  // Long press handlers for mobile
  const handleItemMouseDown = useCallback((itemId: string, index: number) => {
    longPressTimer.current = setTimeout(() => {
      setIsLongPressing(true)
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
    }, 500) // 500ms long press
  }, [])

  const handleItemMouseUp = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    setIsLongPressing(false)
  }, [])

  const handleItemMouseLeave = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    setIsLongPressing(false)
  }, [])

  // Cleanup long press timer
  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
      }
    }
  }, [])

  const handleAssignItem = useCallback((itemId: string, personId: PersonId) => {
    // Remove any existing assignments first
    const existingAssignments = getItemAssignments(itemId)
    existingAssignments.forEach(existingPersonId => {
      unassign(itemId, existingPersonId)
    })
    // Assign to new person
    assign(itemId, personId, 1)
  }, [assign, unassign, getItemAssignments])

  const handleUnassignItem = useCallback((itemId: string, personId: string) => {
    unassign(itemId, personId)
  }, [unassign])

  // Handle multi-assignment
  const handleMultiAssign = useCallback((itemIds: string[], personId: PersonId) => {
    const person = people.find(p => p.id === personId)
    if (!person) return

    const result = handleMultiSelectDropToPerson(itemIds, personId, person.name)
    if (result.success) {
      setUndoData(result.undoData)
      setSelectedItems(new Set())
      setLastSelectedIndex(null)
    }
  }, [handleMultiSelectDropToPerson, people])

  // Handle undo
  const handleUndo = useCallback(() => {
    if (undoData) {
      const success = undoAssignment(undoData)
      if (success) {
        setUndoData(null)
      }
    }
  }, [undoData, undoAssignment])

  const handleClearSelection = useCallback(() => {
    clearSelection(setSelectedItems, setLastSelectedIndex)
  }, [])

  const handleAddPeople = (newPeople: Array<{id: string, name: string, avatar?: string, color: string}>) => {
    const flowPeople = newPeople.map(person => ({
      id: person.id,
      name: person.name,
      avatar: person.avatar
    }))
    setPeople([...people, ...flowPeople])
    setShowPeopleSheet(false)
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  const getUnassignedItemsCount = () => {
    return items.filter(item => getItemAssignments(item.id).length === 0).length
  }

  const autoAssignUnassignedItems = () => {
    const unassignedItems = items.filter(item => getItemAssignments(item.id).length === 0)
    
    if (unassignedItems.length > 0 && people.length > 0) {
      unassignedItems.forEach((item, index) => {
        const personIndex = index % people.length
        const person = people[personIndex]
        assign(item.id, person.id, 1)
      })
    }
  }

  const handleSplitBill = async () => {
    if (getUnassignedItemsCount() > 0) {
      autoAssignUnassignedItems()
    }
    setShowShareSheet(true)
  }

  const handleShareDone = () => {
    setShowShareSheet(false)
    onNext()
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  if (items.length === 0) {
    return (
      <PageContainer variant="hero">
        <div className="text-center">
          <div className="text-6xl mb-6">📋</div>
          <h2 className="text-3xl font-bold mb-4 text-text-primary">No Items Found</h2>
          <p className="text-text-secondary mb-8">No items were parsed from the receipt. Try scanning again or add items manually.</p>
          <Button
            onClick={onBack}
            size="lg"
          >
            Go Back
          </Button>
        </div>
      </PageContainer>
    )
  }

  if (people.length === 0) {
    return (
      <PageContainer variant="hero">
        <div className="text-center">
          <div className="text-6xl mb-6">👥</div>
          <h2 className="text-3xl font-bold mb-4 text-text-primary">Add People First</h2>
          <p className="text-text-secondary mb-8">Add people to split this bill with</p>
          <Button
            onClick={() => setShowPeopleSheet(true)}
            size="lg"
          >
            Add People
          </Button>
        </div>

        <AddPeopleModal
          isOpen={showPeopleSheet}
          onClose={() => setShowPeopleSheet(false)}
          onAddPeople={handleAddPeople}
          existingPeople={people.map(p => ({...p, color: 'bg-blue-500'}))}
        />
      </PageContainer>
    )
  }

  const billTotal = items.reduce((sum, item) => sum + item.price, 0)
  const unassignedCount = getUnassignedItemsCount()

  return (
    <>
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-6 py-6">
          
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-text-primary mb-2">Split Your Bill</h1>
            <p className="text-text-secondary">Assign items to people to split the cost</p>
          </div>

          {/* Bill Summary */}
          <div className="bg-surface-elevated rounded-xl p-6 mb-8 border border-border shadow-sm">
            <div className="text-center">
              <p className="text-text-secondary text-sm mb-2">Bill Total</p>
              <p className="text-4xl font-bold text-primary mb-2">
                {formatPrice(billTotal)}
              </p>
              {unassignedCount > 0 && (
                <p className="text-text-muted text-sm">
                  {unassignedCount} unassigned item{unassignedCount !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>

          {/* People and Items - Compact Layout */}
          <div className="space-y-6">
            {people.map((person) => {
              const personTotal = getTotalForPerson(person.id)
              const personItems = items.filter(item => 
                getItemAssignments(item.id).some(personId => personId === person.id)
              )
              const unassignedItems = items.filter(item => getItemAssignments(item.id).length === 0)
              
              return (
                <div 
                  key={person.id} 
                  className="bg-surface-elevated rounded-xl p-6 border border-border shadow-sm"
                >
                  {items.length > 40 ? (
                    // Use virtualized component for large lists
                    <VirtualizedPersonItems
                      person={person}
                      items={items.map(item => flowItemToItem(item, 'bill-id'))}
                      assignedItems={personItems.map(item => flowItemToItem(item, 'bill-id'))}
                      unassignedItems={unassignedItems.map(item => flowItemToItem(item, 'bill-id'))}
                      selectedItems={selectedItems}
                      onItemSelect={handleItemSelect}
                      onItemMouseDown={handleItemMouseDown}
                      onItemMouseUp={handleItemMouseUp}
                      onItemMouseLeave={handleItemMouseLeave}
                      onItemTouchStart={handleItemMouseDown}
                      onItemTouchEnd={handleItemMouseUp}
                      onAssignItem={handleAssignItem}
                      onUnassignItem={handleUnassignItem}
                      onMultiAssign={handleMultiAssign}
                      getItemAssignments={getItemAssignments}
                      formatPrice={formatPrice}
                      getInitials={getInitials}
                      height={300}
                      virtualizationThreshold={40}
                      estimatedItemSize={80}
                      overscan={8}
                    />
                  ) : (
                    // Use regular layout for small lists
                    <>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-primary-light text-primary flex items-center justify-center text-lg font-bold">
                            {person.avatar ? '👤' : getInitials(person.name)}
                          </div>
                          <div>
                            <h3 className="text-xl font-semibold text-text-primary">{person.name}</h3>
                            <p className="text-text-muted">{personItems.length} item{personItems.length !== 1 ? 's' : ''}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-primary">{formatPrice(personTotal)}</p>
                        </div>
                      </div>
                      
                      {/* Person's Items */}
                      <div className="space-y-2 mb-4">
                        {personItems.map((item) => {
                          const isSelected = selectedItems.has(item.id)
                          const itemIndex = items.findIndex(i => i.id === item.id)
                          
                          return (
                            <div 
                              key={item.id} 
                              className={`flex items-center justify-between p-3 rounded-lg transition-all cursor-pointer ${
                                isSelected 
                                  ? 'bg-primary/10 border-2 border-primary ring-2 ring-primary/20' 
                                  : 'bg-surface hover:bg-surface-elevated'
                              }`}
                              onClick={(e) => handleItemSelect(item.id, itemIndex, e)}
                              onMouseDown={() => handleItemMouseDown(item.id, itemIndex)}
                              onMouseUp={handleItemMouseUp}
                              onMouseLeave={handleItemMouseLeave}
                              onTouchStart={() => handleItemMouseDown(item.id, itemIndex)}
                              onTouchEnd={handleItemMouseUp}
                            >
                              <div className="flex items-center gap-3">
                                {isSelected && (
                                  <div className="w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center text-xs">
                                    ✓
                                  </div>
                                )}
                                <span className="text-xl">{item.emoji || '🍽️'}</span>
                                <span className="text-text-primary">{item.label}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-medium text-text-primary">{formatPrice(item.price)}</span>
                                
                                {/* Weight stepper */}
                                <WeightStepper
                                  value={1} // TODO: Get actual weight from assignments
                                  onChange={(newWeight) => updateWeight(item.id, person.id, newWeight)}
                                  min={1}
                                  max={100}
                                  size="sm"
                                  className="ml-2"
                                />
                                
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleUnassignItem(item.id, person.id)
                                  }}
                                  className="p-1 hover:bg-error/10 rounded text-error hover:text-error/80 transition-colors"
                                  title={`Remove ${item.label} from ${person.name}`}
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          )
                        })}
                        {personItems.length === 0 && (
                          <p className="text-text-muted italic text-center py-4">No items assigned yet</p>
                        )}
                      </div>

                      {/* Multi-assign selected items */}
                      {selectedItems.size > 0 && (
                        <div className="border-t border-border pt-4">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-sm text-text-secondary">
                              {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected
                            </p>
                            <div className="flex items-center gap-2">
                              {undoData && (
                                <button
                                  onClick={handleUndo}
                                  className="text-xs text-accent hover:text-accent/80 transition-colors font-medium"
                                >
                                  Undo
                                </button>
                              )}
                              <button
                                onClick={handleClearSelection}
                                className="text-xs text-text-muted hover:text-text-primary transition-colors"
                              >
                                Clear selection
                              </button>
                            </div>
                          </div>
                          <button
                            onClick={() => handleMultiAssign(Array.from(selectedItems), person.id)}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
                          >
                            <span>Assign {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} to {person.name}</span>
                          </button>
                        </div>
                      )}

                      {/* Quick Assign Unassigned Items */}
                      {unassignedCount > 0 && selectedItems.size === 0 && (
                        <div className="border-t border-border pt-4">
                          <p className="text-sm text-text-secondary mb-3">Quick assign unassigned items:</p>
                          <div className="flex flex-wrap gap-2">
                            {items
                              .filter(item => getItemAssignments(item.id).length === 0)
                              .slice(0, 5) // Limit to 5 items to avoid clutter
                              .map((item) => {
                                const itemIndex = items.findIndex(i => i.id === item.id)
                                const isSelected = selectedItems.has(item.id)
                                
                                return (
                                  <button
                                    key={item.id}
                                    onClick={(e) => handleItemSelect(item.id, itemIndex, e)}
                                    onMouseDown={() => handleItemMouseDown(item.id, itemIndex)}
                                    onMouseUp={handleItemMouseUp}
                                    onMouseLeave={handleItemMouseLeave}
                                    onTouchStart={() => handleItemMouseDown(item.id, itemIndex)}
                                    onTouchEnd={handleItemMouseUp}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text-primary transition-colors ${
                                      isSelected
                                        ? 'bg-primary text-white'
                                        : 'bg-primary-light/20 hover:bg-primary-light/30 border border-primary/30'
                                    }`}
                                  >
                                    {isSelected && <span>✓</span>}
                                    <span>{item.emoji || '🍽️'}</span>
                                    <span className="truncate max-w-24">{item.label}</span>
                                    <span className="font-medium">{formatPrice(item.price)}</span>
                                  </button>
                                )
                              })}
                            {unassignedCount > 5 && (
                              <span className="text-text-muted text-sm px-3 py-2">
                                +{unassignedCount - 5} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mt-8">
            <Button
              variant="secondary"
              onClick={onBack}
              size="lg"
              full
            >
              ← Back
            </Button>
            {undoData && (
              <Button
                variant="secondary"
                onClick={handleUndo}
                size="lg"
                full
                className="border-orange-300 text-orange-700 hover:bg-orange-50"
              >
                ↶ Undo Last Assignment
              </Button>
            )}
            <Button
              onClick={handleSplitBill}
              disabled={items.length === 0}
              size="lg"
              full
            >
              Split Bill →
            </Button>
          </div>

          {/* Add People Button */}
          <div className="text-center mt-6">
            <Button
              variant="ghost"
              onClick={() => setShowPeopleSheet(true)}
            >
              + Add More People
            </Button>
          </div>
        </div>
      </div>

      <AddPeopleModal
        isOpen={showPeopleSheet}
        onClose={() => setShowPeopleSheet(false)}
        onAddPeople={handleAddPeople}
        existingPeople={people.map(p => ({...p, color: 'bg-blue-500'}))}
      />

      <BillyShareSheet
        isOpen={showShareSheet}
        onClose={() => setShowShareSheet(false)}
        onDone={handleShareDone}
        selectedItems={Array.from(selectedItems)}
        onAssignSelected={(selectedItems, personId) => {
          if (personId) {
            handleMultiAssign(selectedItems, personId)
          }
        }}
      />
    </>
  )
}
