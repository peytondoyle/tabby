/**
 * iOS-Inspired Tabby Assign Screen
 * Migrated to use new design system components
 */

import React, { useState, useEffect } from 'react'
import { usePeople, useItems, useAssignmentActions, usePersonActions, useMultiSelectActions } from '@/lib/flowStoreSelectors'
import { useFlowStore } from '@/lib/flowStore'
import type { PersonId } from '@/types/flow'
import { AddPeopleModal } from '@/components/AddPeopleModal'
import { Button, Card, Avatar, Badge, Container, Stack, Spacer } from '@/components/design-system'
import { designTokens } from '@/lib/styled'

interface TabbyAssignScreenProps {
  onNext: () => void
  onBack: () => void
}

export const TabbyAssignScreen: React.FC<TabbyAssignScreenProps> = ({ onNext, onBack }) => {
  const people = usePeople()
  const items = useItems()
  const getItemAssignments = useFlowStore(state => state.getItemAssignments)
  const getTotalForPerson = useFlowStore(state => state.getTotalForPerson)
  const { assign, unassign } = useAssignmentActions()
  const { setPeople } = usePersonActions()
  const bill = useFlowStore(state => state.bill)

  const [showPeopleModal, setShowPeopleModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState<string | null>(null)
  const [draggedItem, setDraggedItem] = useState<string | null>(null)

  // Initialize with "You" if no people exist
  useEffect(() => {
    if (people.length === 0) {
      setPeople([{ id: 'you', name: 'You' }])
    }
  }, [])

  // Get initials for avatar
  const getInitials = (name: string) => {
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    }
    return name.slice(0, 1).toUpperCase()
  }

  // Get avatar color based on person index
  const getAvatarColor = (index: number) => {
    const colors = [
      designTokens.colors.blue.primary,
      designTokens.colors.blue[600],
      designTokens.colors.blue[500],
      designTokens.colors.blue[400],
      designTokens.colors.gray[600],
      designTokens.colors.gray[500],
      designTokens.colors.gray[400],
      designTokens.colors.gray[300]
    ]
    return colors[index % colors.length]
  }

  const handleAssignItem = (itemId: string, personId: PersonId) => {
    // Remove existing assignments first
    const existingAssignments = getItemAssignments(itemId)
    existingAssignments.forEach(existingPersonId => {
      unassign(itemId, existingPersonId)
    })
    // Assign to new person
    assign(itemId, personId, 1)
    setSelectedItem(null)
    setDraggedItem(null)
  }

  const handleUnassignItem = (itemId: string, personId: string) => {
    unassign(itemId, personId)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.style.borderWidth = '2px'
    e.currentTarget.style.borderStyle = 'solid'
    e.currentTarget.style.borderColor = designTokens.semantic.border.focus
    e.currentTarget.style.boxShadow = `0 0 0 2px ${designTokens.semantic.border.focus}${designTokens.alpha[20]}`
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.style.borderWidth = '1px'
    e.currentTarget.style.borderStyle = 'solid'
    e.currentTarget.style.borderColor = designTokens.semantic.border.subtle
    e.currentTarget.style.boxShadow = designTokens.shadows.sm
  }

  const handleDrop = (e: React.DragEvent, personId: PersonId) => {
    e.preventDefault()
    e.currentTarget.style.borderWidth = '1px'
    e.currentTarget.style.borderStyle = 'solid'
    e.currentTarget.style.borderColor = designTokens.semantic.border.subtle
    e.currentTarget.style.boxShadow = designTokens.shadows.sm

    if (draggedItem) {
      handleAssignItem(draggedItem, personId)
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

  const handleAddPeople = (newPeople: any[]) => {
    setPeople([...people, ...newPeople])
  }

  const formatPrice = (price: number) => {
    return `$${price.toFixed(2)}`
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: designTokens.semantic.background.primary,
      color: designTokens.semantic.text.primary,
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: designTokens.semantic.background.primary,
        borderBottom: `1px solid ${designTokens.semantic.border.subtle}`,
      }}>
        <Container padding={false}>
          <div style={{
            padding: designTokens.spacing[3],
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <h1 style={{
              fontSize: designTokens.typography.fontSize.xl,
              fontWeight: designTokens.typography.fontWeight.semibold,
              color: designTokens.semantic.text.primary,
              margin: 0,
            }}>
              Split Bill
            </h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              style={{
                padding: designTokens.spacing[2],
                marginRight: `-${designTokens.spacing[2]}`,
                borderRadius: designTokens.borderRadius.lg,
              }}
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>
        </Container>
      </div>

      {/* Main Content */}
      <Container padding={false}>
        <div style={{ padding: designTokens.spacing[4], paddingBottom: '128px' }}>
          {/* People Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: designTokens.spacing[4],
            marginTop: designTokens.spacing[6],
          }}>
            {people.map((person, personIndex) => {
              const personItems = getPersonItems(person.id)
              const personTotal = getTotalForPerson(person.id)

              return (
                <Card
                  key={person.id}
                  variant="elevated"
                  padding="md"
                  style={{
                    transition: designTokens.transitions.base,
                  }}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, person.id)}
                >
                  {/* Person Header */}
                  <Stack direction="horizontal" justify="between" align="center" spacing={0}>
                    <Stack direction="horizontal" align="center" spacing={2}>
                      <Avatar
                        size="md"
                        fallback={getInitials(person.name).charAt(0)}
                        style={{
                          backgroundColor: getAvatarColor(personIndex),
                          color: designTokens.semantic.text.inverse,
                        }}
                      />
                      <h3 style={{
                        fontSize: designTokens.typography.fontSize.base,
                        fontWeight: designTokens.typography.fontWeight.medium,
                        color: designTokens.semantic.text.primary,
                        margin: 0,
                      }}>
                        {person.name}
                      </h3>
                    </Stack>
                    <p style={{
                      fontSize: designTokens.typography.fontSize.lg,
                      fontWeight: designTokens.typography.fontWeight.bold,
                      color: designTokens.semantic.text.primary,
                      margin: 0,
                    }}>
                      {formatPrice(personTotal)}
                    </p>
                  </Stack>

                  <Spacer size={3} />

                  {/* Person's Items */}
                  <div style={{ minHeight: '80px' }}>
                    <Stack direction="vertical" spacing={2}>
                      {personItems.map((item) => (
                        <div
                          key={item.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: designTokens.spacing[2],
                            backgroundColor: designTokens.semantic.background.secondary,
                            borderRadius: designTokens.borderRadius.lg,
                            padding: designTokens.spacing[3],
                            transition: designTokens.transitions.fast,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = designTokens.semantic.background.tertiary
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = designTokens.semantic.background.secondary
                          }}
                        >
                          <span style={{ fontSize: designTokens.typography.fontSize.lg }}>
                            {item.emoji || '🍽️'}
                          </span>
                          <span style={{
                            flex: 1,
                            fontSize: designTokens.typography.fontSize.sm,
                            color: designTokens.semantic.text.primary,
                          }}>
                            {item.label}
                          </span>
                          <span style={{
                            fontSize: designTokens.typography.fontSize.sm,
                            color: designTokens.semantic.text.secondary,
                          }}>
                            {formatPrice(item.price)}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUnassignItem(item.id, person.id)}
                            style={{
                              opacity: 0,
                              padding: designTokens.spacing[1],
                              marginRight: `-${designTokens.spacing[1]}`,
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.opacity = '1'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.opacity = '0'
                            }}
                          >
                            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </Button>
                        </div>
                      ))}
                      {personItems.length === 0 && (
                        <div style={{
                          textAlign: 'center',
                          padding: designTokens.spacing[6],
                          color: designTokens.semantic.text.tertiary,
                        }}>
                          <p style={{
                            fontSize: designTokens.typography.fontSize.xs,
                            margin: 0,
                          }}>
                            No items assigned
                          </p>
                          <p style={{
                            fontSize: designTokens.typography.fontSize.xs,
                            margin: 0,
                            marginTop: designTokens.spacing[1],
                          }}>
                            Drag items here
                          </p>
                        </div>
                      )}
                    </Stack>
                  </div>
                </Card>
              )
            })}

            {/* Add People Card */}
            <Button
              variant="secondary"
              fullWidth
              onClick={() => setShowPeopleModal(true)}
              style={{
                minHeight: '150px',
                padding: designTokens.spacing[4],
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: designTokens.spacing[2],
              }}
            >
              <div style={{
                width: '48px',
                height: '48px',
                backgroundColor: designTokens.semantic.interactive.primary,
                borderRadius: designTokens.borderRadius.full,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: designTokens.spacing[2],
              }}>
                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <p style={{
                color: designTokens.semantic.text.primary,
                fontWeight: designTokens.typography.fontWeight.medium,
                fontSize: designTokens.typography.fontSize.sm,
                margin: 0,
              }}>
                Add Person
              </p>
              <p style={{
                color: designTokens.semantic.text.tertiary,
                fontSize: designTokens.typography.fontSize.xs,
                margin: 0,
              }}>
                Split with someone else
              </p>
            </Button>
          </div>

          {/* Unassigned Items */}
          {getUnassignedItems().length > 0 && (
            <div style={{ marginTop: designTokens.spacing[6] }}>
              <h2 style={{
                fontSize: designTokens.typography.fontSize.sm,
                fontWeight: designTokens.typography.fontWeight.medium,
                color: designTokens.semantic.text.secondary,
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
                {getUnassignedItems().map((item) => (
                  <Badge
                    key={item.id}
                    variant={draggedItem === item.id ? 'primary' : 'default'}
                    size="md"
                    style={{
                      cursor: 'move',
                      display: 'flex',
                      alignItems: 'center',
                      gap: designTokens.spacing[2],
                      transform: draggedItem === item.id ? 'scale(1.05)' : 'scale(1)',
                      transition: designTokens.transitions.fast,
                    }}
                    onClick={() => setSelectedItem(item.id === selectedItem ? null : item.id)}
                    draggable
                    onDragStart={(e) => {
                      setDraggedItem(item.id)
                      e.dataTransfer.effectAllowed = 'move'
                    }}
                    onDragEnd={() => setDraggedItem(null)}
                  >
                    <span>{item.emoji || '🍽️'}</span>
                    <span>{item.label}</span>
                    <span style={{ color: designTokens.semantic.text.tertiary }}>
                      {formatPrice(item.price)}
                    </span>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </Container>

      {/* Bottom Action Bar */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: designTokens.semantic.background.primary,
        borderTop: `1px solid ${designTokens.semantic.border.subtle}`,
        padding: designTokens.spacing[4],
      }}>
        <Container>
          <Stack direction="horizontal" justify="between" align="center" spacing={0}>
            <div>
              <p style={{
                fontSize: designTokens.typography.fontSize.xs,
                color: designTokens.semantic.text.secondary,
                margin: 0,
              }}>
                Total
              </p>
              <p style={{
                fontSize: designTokens.typography.fontSize.xl,
                fontWeight: designTokens.typography.fontWeight.bold,
                color: designTokens.semantic.text.primary,
                margin: 0,
              }}>
                {formatPrice(bill?.total || items.reduce((sum, item) => sum + item.price, 0))}
              </p>
            </div>
            <Stack direction="horizontal" spacing={2}>
              <Button
                variant="secondary"
                onClick={() => setShowPeopleModal(true)}
              >
                Add People
              </Button>
              <Button
                variant="primary"
                onClick={onNext}
                disabled={getUnassignedItems().length > 0}
              >
                {getUnassignedItems().length > 0
                  ? `Assign ${getUnassignedItems().length} items`
                  : 'Continue'
                }
              </Button>
            </Stack>
          </Stack>
        </Container>
      </div>

      {/* Add People Modal */}
      <AddPeopleModal
        isOpen={showPeopleModal}
        onClose={() => setShowPeopleModal(false)}
        onAddPeople={handleAddPeople}
        existingPeople={people.map((p, i) => ({ ...p, color: getAvatarColor(i) }))}
      />

      {/* Item Assignment Sheet */}
      {selectedItem && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: designTokens.zIndex.modal,
            backgroundColor: `${designTokens.colors.black}${designTokens.alpha[60]}`,
            display: 'flex',
            alignItems: 'flex-end',
          }}
          onClick={() => setSelectedItem(null)}
        >
          <Card
            variant="elevated"
            padding="lg"
            style={{
              width: '100%',
              borderTopLeftRadius: designTokens.borderRadius['2xl'],
              borderTopRightRadius: designTokens.borderRadius['2xl'],
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
              paddingBottom: designTokens.spacing[8],
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              width: '40px',
              height: '4px',
              backgroundColor: designTokens.semantic.border.default,
              borderRadius: designTokens.borderRadius.full,
              margin: '0 auto',
              marginBottom: designTokens.spacing[4],
            }} />
            <h3 style={{
              fontSize: designTokens.typography.fontSize.base,
              fontWeight: designTokens.typography.fontWeight.medium,
              color: designTokens.semantic.text.primary,
              margin: 0,
              marginBottom: designTokens.spacing[3],
            }}>
              Assign to:
            </h3>
            <Stack direction="vertical" spacing={2}>
              {people.map((person, index) => (
                <Button
                  key={person.id}
                  variant="secondary"
                  fullWidth
                  onClick={() => handleAssignItem(selectedItem, person.id)}
                  style={{
                    justifyContent: 'flex-start',
                    padding: designTokens.spacing[3],
                  }}
                >
                  <Stack direction="horizontal" align="center" spacing={3}>
                    <Avatar
                      size="md"
                      fallback={getInitials(person.name).charAt(0)}
                      style={{
                        backgroundColor: getAvatarColor(index),
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
                </Button>
              ))}
            </Stack>
          </Card>
        </div>
      )}
    </div>
  )
}