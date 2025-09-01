import React, { useState, useCallback } from 'react'
import { useFlowStore } from '@/lib/flowStore'
import type { PersonId } from '@/types/flow'
import { AddPeopleModal } from '@/components/AddPeopleModal'
import { BillyShareSheet } from './BillyShareSheet'
import { PageContainer } from '@/components/PageContainer'
import { Button } from "@/components/ui/Button";

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
  
  // Clean up duplicates on mount and when people change
  React.useEffect(() => {
    deduplicatePeople()
  }, [deduplicatePeople, people.length])

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
              
              return (
                <div 
                  key={person.id} 
                  className="bg-surface-elevated rounded-xl p-6 border border-border shadow-sm"
                >
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
                    {personItems.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-surface rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{item.emoji || '🍽️'}</span>
                          <span className="text-text-primary">{item.label}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-text-primary">{formatPrice(item.price)}</span>
                          <button
                            onClick={() => handleUnassignItem(item.id, person.id)}
                            className="p-1 hover:bg-error/10 rounded text-error hover:text-error/80 transition-colors"
                            title={`Remove ${item.label} from ${person.name}`}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                    {personItems.length === 0 && (
                      <p className="text-text-muted italic text-center py-4">No items assigned yet</p>
                    )}
                  </div>

                  {/* Quick Assign Unassigned Items */}
                  {unassignedCount > 0 && (
                    <div className="border-t border-border pt-4">
                      <p className="text-sm text-text-secondary mb-3">Quick assign unassigned items:</p>
                      <div className="flex flex-wrap gap-2">
                        {items
                          .filter(item => getItemAssignments(item.id).length === 0)
                          .slice(0, 5) // Limit to 5 items to avoid clutter
                          .map(item => (
                            <button
                              key={item.id}
                              onClick={() => handleAssignItem(item.id, person.id)}
                              className="flex items-center gap-2 px-3 py-2 bg-primary-light/20 hover:bg-primary-light/30 border border-primary/30 rounded-lg text-sm text-text-primary transition-colors"
                            >
                              <span>{item.emoji || '🍽️'}</span>
                              <span className="truncate max-w-24">{item.label}</span>
                              <span className="font-medium">{formatPrice(item.price)}</span>
                            </button>
                          ))}
                        {unassignedCount > 5 && (
                          <span className="text-text-muted text-sm px-3 py-2">
                            +{unassignedCount - 5} more
                          </span>
                        )}
                      </div>
                    </div>
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
      />
    </>
  )
}
