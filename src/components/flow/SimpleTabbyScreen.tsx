/**
 * iOS-Inspired Simple Tabby Screen
 * Migrated to use new design system components
 */

import React, { useState, useEffect } from 'react'
import { usePeople, useItems, useAssignmentActions, usePersonActions } from '@/lib/flowStoreSelectors'
import { useFlowStore } from '@/lib/flowStore'
import type { PersonId } from '@/types/flow'
import { Button, Card, Avatar, Container, Stack, Spacer, ItemPill } from '@/components/design-system'
import { designTokens } from '@/lib/styled'

interface SimpleTabbyScreenProps {
  onNext: () => void
  onBack: () => void
}

export const SimpleTabbyScreen: React.FC<SimpleTabbyScreenProps> = ({ onNext, onBack }) => {
  const people = usePeople()
  const items = useItems()
  const getTotalForPerson = useFlowStore(state => state.getTotalForPerson)
  const getItemAssignments = useFlowStore(state => state.getItemAssignments)
  const { assign, unassign } = useAssignmentActions()
  const { setPeople } = usePersonActions()

  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null)

  // Initialize with "You" if no people exist
  useEffect(() => {
    if (people.length === 0) {
      setPeople([{ id: 'you', name: 'You' }])
    }
  }, [])

  const handleAssignItem = (itemId: string, personId: PersonId) => {
    // Remove existing assignments
    const existingAssignments = getItemAssignments(itemId)
    existingAssignments.forEach(id => unassign(itemId, id))
    // Assign to new person
    assign(itemId, personId, 1)
  }

  const handleAddPerson = () => {
    const name = prompt('Enter person name:')
    if (name && name.trim()) {
      setPeople([...people, {
        id: Date.now().toString(),
        name: name.trim()
      }])
    }
  }

  const getUnassignedItems = () => {
    return items.filter(item => getItemAssignments(item.id).length === 0)
  }

  const getPersonItems = (personId: PersonId) => {
    return items.filter(item =>
      getItemAssignments(item.id).includes(personId)
    )
  }

  const total = items.reduce((sum, item) => sum + item.price, 0)

  return (
    <div style={{
      height: '100vh',
      backgroundColor: designTokens.semantic.background.primary,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header - Super Simple */}
      <div style={{
        padding: `${designTokens.spacing[3]} ${designTokens.spacing[4]}`,
        borderBottom: `1px solid ${designTokens.semantic.border.subtle}`,
      }}>
        <Stack direction="horizontal" justify="between" align="center" spacing={0}>
          <h1 style={{
            color: designTokens.semantic.text.primary,
            fontSize: designTokens.typography.fontSize.lg,
            fontWeight: designTokens.typography.fontWeight.medium,
            margin: 0,
          }}>
            Split Bill
          </h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            style={{
              color: designTokens.semantic.text.secondary,
            }}
          >
            ✕
          </Button>
        </Stack>
      </div>

      {/* Main Content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
      }}>
        {/* People */}
        <Stack direction="vertical" spacing={3}>
          {people.map((person) => {
            const personTotal = getTotalForPerson(person.id)
            const personItems = getPersonItems(person.id)
            const isSelected = selectedPersonId === person.id

            return (
              <Card
                key={person.id}
                variant="default"
                padding="md"
                style={{
                  cursor: 'pointer',
                  backgroundColor: '#1C1F27',
                  border: isSelected 
                    ? `2px solid ${designTokens.semantic.border.focus}` 
                    : '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '20px',
                  boxShadow: designTokens.shadows.md,
                  transition: designTokens.transitions.base,
                }}
                onClick={() => setSelectedPersonId(isSelected ? null : person.id)}
              >
                {/* Person Header */}
                <Stack direction="horizontal" justify="between" align="center" spacing={0}>
                  <Stack direction="horizontal" align="center" spacing={2}>
                    <Avatar
                      size="md"
                      fallback={person.name[0].toUpperCase()}
                      style={{
                        backgroundColor: designTokens.semantic.interactive.primary,
                        color: designTokens.semantic.text.inverse,
                      }}
                    />
                    <span style={{
                      color: designTokens.semantic.text.primary,
                      fontWeight: designTokens.typography.fontWeight.medium,
                    }}>
                      {person.name}
                    </span>
                  </Stack>
                  <span style={{
                    color: designTokens.semantic.text.tertiary,
                    fontWeight: designTokens.typography.fontWeight.medium,
                    fontSize: designTokens.typography.fontSize.sm,
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    ${personTotal.toFixed(2)}
                  </span>
                </Stack>

                <Spacer size={3} />

                {/* Person's Items */}
                {personItems.length > 0 ? (
                  <Stack direction="vertical" spacing={1}>
                    {personItems.map(item => (
                      <div key={item.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: `${designTokens.spacing[1]} 0`,
                        fontSize: designTokens.typography.fontSize.sm,
                      }}>
                        <span style={{ color: designTokens.semantic.text.secondary }}>
                          {item.emoji} {item.label}
                        </span>
                        <span style={{ color: designTokens.semantic.text.secondary }}>
                          ${item.price.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </Stack>
                ) : (
                  <div style={{
                    color: designTokens.semantic.text.tertiary,
                    fontSize: designTokens.typography.fontSize.sm,
                    textAlign: 'center',
                    padding: designTokens.spacing[2],
                  }}>
                    No items assigned
                  </div>
                )}
              </Card>
            )
          })}

          {/* Add Person Button */}
          <Button
            variant="secondary"
            fullWidth
            onClick={handleAddPerson}
            style={{
              padding: designTokens.spacing[4],
              border: `1px solid ${designTokens.semantic.border.default}`,
              backgroundColor: 'rgba(255,255,255,0.08)',
            }}
          >
            <Stack direction="horizontal" align="center" spacing={2}>
              <span style={{
                fontSize: designTokens.typography.fontSize['2xl'],
                color: designTokens.semantic.text.secondary,
              }}>
                +
              </span>
              <span style={{ color: designTokens.semantic.text.secondary }}>
                Add Person
              </span>
            </Stack>
          </Button>
        </Stack>

        {/* Unassigned Items */}
        {getUnassignedItems().length > 0 && (
          <div style={{ marginTop: designTokens.spacing[6] }}>
            <h2 style={{
              color: designTokens.semantic.text.secondary,
              fontSize: designTokens.typography.fontSize.sm,
              margin: 0,
              marginBottom: designTokens.spacing[3],
            }}>
              Unassigned Items
            </h2>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: designTokens.spacing[2],
            }}>
              {getUnassignedItems().map(item => (
                <ItemPill
                  key={item.id}
                  name={item.label}
                  price={item.price}
                  selected={false}
                  onClick={() => {
                    if (selectedPersonId) {
                      handleAssignItem(item.id, selectedPersonId)
                    }
                  }}
                  disabled={!selectedPersonId}
                />
              ))}
            </div>
            {!selectedPersonId && (
              <p style={{
                color: designTokens.semantic.text.tertiary,
                fontSize: designTokens.typography.fontSize.xs,
                margin: 0,
                marginTop: designTokens.spacing[2],
                textAlign: 'center',
              }}>
                Select a person above to assign items
              </p>
            )}
          </div>
        )}
      </div>

      {/* Bottom Bar */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: `${designTokens.semantic.background.primary}85`,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderTop: `1px solid ${designTokens.semantic.border.subtle}`,
        padding: designTokens.spacing[4],
        display: 'flex',
        justifyContent: 'center',
      }}>
        <Button
          variant="primary"
          onClick={onNext}
          disabled={getUnassignedItems().length > 0}
          style={{
            height: '56px',
            padding: `0 ${designTokens.spacing[8]}`,
            fontSize: designTokens.typography.fontSize.lg,
            fontWeight: designTokens.typography.fontWeight.semibold,
          }}
        >
          {getUnassignedItems().length > 0
            ? `${getUnassignedItems().length} items left`
            : 'Split Bill'
          }
        </Button>
      </div>
    </div>
  )
}