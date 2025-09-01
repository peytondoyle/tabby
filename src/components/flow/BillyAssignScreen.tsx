import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useFlowStore } from '@/lib/flowStore'
import { AddPeopleModal } from '@/components/AddPeopleModal'
import { BillyShareSheet } from './BillyShareSheet'
import { PageContainer } from '@/components/PageContainer'

interface BillyAssignScreenProps {
  onNext: () => void
  onBack: () => void
}

export const BillyAssignScreen: React.FC<BillyAssignScreenProps> = ({ onNext, onBack }) => {
  const { 
    people, 
    items, 
    getItemAssignments, 
    assign, 
    unassign,
    getTotalForPerson,
    setPeople,
    deduplicatePeople
  } = useFlowStore()

  const [showPeopleSheet, setShowPeopleSheet] = useState(false)
  const [showShareSheet, setShowShareSheet] = useState(false)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])
  
  // Clean up duplicates on mount and when people change
  React.useEffect(() => {
    deduplicatePeople()
  }, [deduplicatePeople, people.length])

  // Initialize item refs
  useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, items.length)
  }, [items.length])

  // New 2-step assignment system
  const handleItemToggle = useCallback((itemId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }, [])

  const handleAssignToPerson = useCallback((personId: string) => {
    if (selectedItems.size === 0) return

    // Assign all selected items to the person
    selectedItems.forEach(itemId => {
      // Remove any existing assignments first
      const existingAssignments = getItemAssignments(itemId)
      existingAssignments.forEach(assignment => {
        unassign(itemId, assignment)
      })
      // Assign to new person
      assign(itemId, personId)
    })

    // Clear selection after assignment
    setSelectedItems(new Set())
  }, [selectedItems, assign, unassign, getItemAssignments])

  const handleMultiSelect = useCallback((e: React.MouseEvent, itemId: string) => {
    if (e.shiftKey || e.metaKey || e.ctrlKey) {
      // Multi-select mode
      handleItemToggle(itemId)
    } else {
      // Single select mode
      setSelectedItems(new Set([itemId]))
    }
  }, [handleItemToggle])

  const handleKeyDown = useCallback((e: React.KeyboardEvent, itemId: string, itemIndex: number) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault()
        handleItemToggle(itemId)
        break
      case 'ArrowRight':
        e.preventDefault()
        const nextIndex = Math.min(itemIndex + 1, items.length - 1)
        itemRefs.current[nextIndex]?.focus()
        break
      case 'ArrowLeft':
        e.preventDefault()
        const prevIndex = Math.max(itemIndex - 1, 0)
        itemRefs.current[prevIndex]?.focus()
        break
      case 'ArrowDown':
        e.preventDefault()
        const downIndex = Math.min(itemIndex + 4, items.length - 1) // Assuming 4 columns
        itemRefs.current[downIndex]?.focus()
        break
      case 'ArrowUp':
        e.preventDefault()
        const upIndex = Math.max(itemIndex - 4, 0) // Assuming 4 columns
        itemRefs.current[upIndex]?.focus()
        break
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
      case '9':
        if (selectedItems.size > 0) {
          e.preventDefault()
          const personIndex = parseInt(e.key) - 1
          if (people[personIndex]) {
            handleAssignToPerson(people[personIndex].id)
          }
        }
        break
    }
  }, [handleItemToggle, items.length, people, selectedItems.size, handleAssignToPerson])

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
        assign(item.id, person.id)
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

  const getAssignmentBadges = (itemId: string) => {
    const assignments = getItemAssignments(itemId)
    if (assignments.length === 0) return null

    const assignedPeople = assignments.map(personId => 
      people.find(p => p.id === personId)
    ).filter(Boolean)

    if (assignedPeople.length === 1) {
      const person = assignedPeople[0]!
      return (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-text-inverse text-xs font-bold shadow-md">
          {person.name.charAt(0)}
        </div>
      )
    }

    if (assignedPeople.length === 2) {
      return (
        <div className="absolute -top-2 -right-2 flex gap-1">
          <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center text-text-inverse text-xs font-bold shadow-sm">
            {assignedPeople[0]!.name.charAt(0)}
          </div>
          <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center text-text-inverse text-xs font-bold shadow-sm">
            {assignedPeople[1]!.name.charAt(0)}
          </div>
        </div>
      )
    }

    // 3+ people - show first two + count
    return (
      <div className="absolute -top-2 -right-2 flex gap-1">
        <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center text-text-inverse text-xs font-bold shadow-sm">
          {assignedPeople[0]!.name.charAt(0)}
        </div>
        <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center text-text-inverse text-xs font-bold shadow-sm">
          {assignedPeople[1]!.name.charAt(0)}
        </div>
        <div className="w-5 h-5 bg-primary/80 rounded-full flex items-center justify-center text-text-inverse text-xs font-bold shadow-sm">
          +{assignedPeople.length - 2}
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <PageContainer variant="hero">
        <div className="text-center">
          <div className="text-6xl mb-6">📋</div>
          <h2 className="text-3xl font-bold mb-4 text-text-primary">No Items Found</h2>
          <p className="text-text-secondary mb-8">No items were parsed from the receipt. Try scanning again or add items manually.</p>
          <button
            onClick={onBack}
            className="px-8 py-4 bg-primary hover:bg-primary-hover text-text-inverse rounded-lg font-semibold text-lg transition-all duration-200 hover:opacity-90 shadow-md"
          >
            Go Back
          </button>
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
          <button
            onClick={() => setShowPeopleSheet(true)}
            className="px-8 py-4 bg-primary hover:bg-primary-hover text-text-inverse rounded-lg font-semibold text-lg transition-all duration-200 hover:opacity-90 shadow-md"
          >
            Add People
          </button>
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
        <div className="max-w-7xl mx-auto px-6 py-6">
          {/* Desktop: Two Column Layout, Mobile: Stacked */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: People & Totals (Desktop) / Top Section (Mobile) */}
            <div className="lg:col-span-1 space-y-6">
              
              {/* People Summary Cards */}
              <div>
                <h2 className="text-lg font-semibold mb-4 text-text-primary">People</h2>
                <div className="space-y-3">
                  {people.map((person) => {
                    const personTotal = getTotalForPerson(person.id)
                    const personItems = items.filter(item => 
                      getItemAssignments(item.id).includes(person.id)
                    )
                    
                    return (
                      <div 
                        key={person.id} 
                        className="bg-surface-elevated rounded-lg p-4 border border-border shadow-sm"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-primary-light text-primary flex items-center justify-center text-sm font-bold">
                            {person.avatar ? '👤' : getInitials(person.name)}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-text-primary">{person.name}</h3>
                            <p className="text-lg font-bold text-primary">{formatPrice(personTotal)}</p>
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          {personItems.slice(0, 3).map(item => (
                            <div key={item.id} className="flex items-center gap-2 text-sm">
                              <span className="text-lg">{item.emoji || '🍽️'}</span>
                              <span className="flex-1 truncate text-text-primary">{item.label}</span>
                              <span className="font-medium text-text-primary">{formatPrice(item.price)}</span>
                            </div>
                          ))}
                          {personItems.length > 3 && (
                            <p className="text-text-muted text-sm">+{personItems.length - 3} more items</p>
                          )}
                          {personItems.length === 0 && (
                            <p className="text-text-muted italic text-sm">No items assigned</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Bill Total Summary */}
              <div className="bg-surface-elevated rounded-lg p-4 border border-border shadow-sm">
                <div className="text-center">
                  <p className="text-text-secondary text-sm mb-1">Bill Total</p>
                  <p className="text-2xl font-bold text-primary">
                    {formatPrice(billTotal)}
                  </p>
                  {unassignedCount > 0 && (
                    <p className="text-text-muted text-sm mt-1">
                      {unassignedCount} unassigned item{unassignedCount !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>

              {/* Primary Action Button */}
              <div className="lg:hidden">
                <button
                  onClick={handleSplitBill}
                  disabled={items.length === 0}
                  className={`w-full py-4 rounded-lg font-bold text-lg transition-all duration-200 shadow-md ${
                    items.length > 0
                      ? 'bg-primary hover:bg-primary-hover text-text-inverse hover:opacity-90'
                      : 'bg-primary-light text-primary cursor-not-allowed'
                  }`}
                >
                  Split Bill
                </button>
              </div>
            </div>

            {/* Right Column: Items Grid (Desktop) / Bottom Section (Mobile) */}
            <div className="lg:col-span-2">
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-4 text-text-primary">Items</h2>
                
                {/* Assignee Bar - Desktop */}
                {selectedItems.size > 0 && (
                  <div className="hidden lg:block mb-4 p-3 bg-surface-elevated rounded-lg border border-border shadow-sm">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-text-secondary">
                        Assign {selectedItems.size} selected item{selectedItems.size !== 1 ? 's' : ''} to:
                      </span>
                      <div className="flex gap-2">
                        {people.map((person, index) => (
                          <button
                            key={person.id}
                            onClick={() => handleAssignToPerson(person.id)}
                            className="px-3 py-2 bg-primary-light hover:bg-primary-medium text-primary rounded-lg font-medium text-sm transition-all duration-200 hover:shadow-md"
                            title={`Press ${index + 1} to assign to ${person.name}`}
                          >
                            {person.name}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => setSelectedItems(new Set())}
                        className="ml-auto px-3 py-2 text-text-secondary hover:text-text-primary transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                  {items.map((item, index) => {
                    const isSelected = selectedItems.has(item.id)
                    const assignments = getItemAssignments(item.id)
                    const isAssigned = assignments.length > 0
                    
                    return (
                      <button
                        key={item.id}
                        ref={el => { itemRefs.current[index] = el }}
                        onClick={(e) => handleMultiSelect(e, item.id)}
                        onKeyDown={(e) => handleKeyDown(e, item.id, index)}
                        className={`group relative flex flex-col items-center gap-2 p-4 rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                          isSelected
                            ? 'border-primary bg-primary-light shadow-md'
                            : isAssigned
                            ? 'border-primary/30 bg-primary-light/50 shadow-sm'
                            : 'border-border bg-surface-elevated hover:border-primary/50 hover:bg-primary-light/30 hover:shadow-sm'
                        }`}
                        aria-label={`${isSelected ? 'Deselect' : 'Select'} ${item.label}`}
                        tabIndex={0}
                      >
                        <span className="text-3xl group-hover:scale-105 transition-transform duration-200">
                          {item.emoji || '🍽️'}
                        </span>
                        <span className="text-sm font-medium text-center line-clamp-2 text-text-primary">
                          {item.label}
                        </span>
                        <span className="text-lg font-bold text-primary">{formatPrice(item.price)}</span>
                        
                        {/* Assignment Badges */}
                        {getAssignmentBadges(item.id)}
                        
                        {/* Selection Indicator */}
                        {isSelected && (
                          <div className="absolute inset-0 bg-primary/10 rounded-lg border-2 border-primary" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Desktop Split Button */}
              <div className="hidden lg:block text-center">
                <button
                  onClick={handleSplitBill}
                  disabled={items.length === 0}
                  className={`px-10 py-4 rounded-lg font-bold text-lg transition-all duration-200 shadow-md ${
                    items.length > 0
                      ? 'bg-primary hover:bg-primary-hover text-text-inverse hover:opacity-90'
                      : 'bg-primary-light text-primary cursor-not-allowed'
                  }`}
                >
                  Split Bill
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Assignee Bar - Bottom Sheet */}
      {selectedItems.size > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-surface-elevated border-t border-border shadow-lg z-40">
          <div className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-sm font-medium text-text-secondary">
                Assign {selectedItems.size} selected item{selectedItems.size !== 1 ? 's' : ''} to:
              </span>
              <button
                onClick={() => setSelectedItems(new Set())}
                className="ml-auto px-3 py-2 text-text-secondary hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {people.map((person) => (
                <button
                  key={person.id}
                  onClick={() => handleAssignToPerson(person.id)}
                  className="px-4 py-3 bg-primary-light hover:bg-primary-medium text-primary rounded-lg font-medium transition-all duration-200 hover:shadow-md"
                >
                  {person.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

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
      />
    </>
  )
}