/**
 * iOS-Inspired Person Card Component
 * Migrated to use new design system components
 */

import React, { useState, useEffect } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { supabase, isSupabaseAvailable } from '../../lib/supabaseClient'
import { showError, showSuccess } from '@/lib/exportUtils'
import { logServer } from '@/lib/errorLogger'
import { Card, Avatar, Button, Input, Stack, Spacer } from '@/components/design-system'
import { designTokens } from '@/lib/styled'
import { testIds } from '@/lib/testIds'

interface PersonCardProps {
  person: {
    id: string
    name: string
    avatar_url?: string
    venmo_handle?: string
    is_archived?: boolean
  }
  editorToken: string
  onUpdate: () => void
  assignedItems?: Array<{
    item_id: string
    emoji: string
    label: string
    price: number
    quantity: number
    weight: number
    share_amount: number
  }>
  totals?: {
    subtotal: number
    tax_share: number
    tip_share: number
    total: number
  }
  isDragOver?: boolean
  onDragOver?: (e: React.DragEvent) => void
  onDragLeave?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent) => void
  isAddPerson?: boolean
  onAddPerson?: () => void
}

export const PersonCard: React.FC<PersonCardProps> = ({ 
  person, 
  editorToken, 
  onUpdate,
  assignedItems = [],
  totals,
  isDragOver = false,
  onDragOver,
  onDragLeave,
  onDrop,
  isAddPerson = false,
  onAddPerson
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDropSuccess, setIsDropSuccess] = useState(false)
  const [formData, setFormData] = useState({
    name: person.name,
    avatar_url: person.avatar_url || '',
    venmo: person.venmo_handle || ''
  })

  const { setNodeRef, isOver: _isOver } = useDroppable({
    id: person.id,
  })

  // Animation for drop success
  useEffect(() => {
    if (isDropSuccess) {
      const timer = setTimeout(() => setIsDropSuccess(false), 300)
      return () => clearTimeout(timer)
    }
  }, [isDropSuccess])

  const handleSave = async () => {
    try {
      if (!isSupabaseAvailable()) {
        // Mock update for development
        console.warn('Supabase not available - mocking person update')
        setIsEditing(false)
        showSuccess('Person updated successfully')
        onUpdate()
        return
      }

      const { error } = await supabase!.rpc('update_person_with_editor_token', {
        etoken: editorToken,
        person_id: person.id,
        p_name: formData.name,
        p_avatar_url: formData.avatar_url || null,
        p_venmo: formData.venmo || null
      })

      if (error) throw error
      
      setIsEditing(false)
      showSuccess('Person updated successfully')
      onUpdate()
    } catch (error) {
      console.error('Error updating person:', error)
      logServer('error', 'Failed to update person', { error, context: 'PersonCard.handleSave' })
      showError('Failed to update person')
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this person?')) return
    
    setIsDeleting(true)
    try {
      if (!isSupabaseAvailable()) {
        // Mock delete for development
        console.warn('Supabase not available - mocking person delete')
        showSuccess('Person deleted successfully')
        onUpdate()
        return
      }

      const { error } = await supabase!.rpc('delete_person_with_editor_token', {
        etoken: editorToken,
        person_id: person.id
      })

      if (error) throw error
      
      showSuccess('Person deleted successfully')
      onUpdate()
    } catch (error) {
      console.error('Error deleting person:', error)
      logServer('error', 'Failed to delete person', { error, context: 'PersonCard.handleDelete' })
      showError('Failed to delete person')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      name: person.name,
      avatar_url: person.avatar_url || '',
      venmo: person.venmo_handle || ''
    })
    setIsEditing(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    if (onDrop) {
      onDrop(e)
      setIsDropSuccess(true)
    }
  }

  // Add Person ghost card
  if (isAddPerson) {
    return (
      <Card
        variant="elevated"
        padding="lg"
        style={{
          height: '100%',
          minHeight: '200px',
          display: 'flex',
          flexDirection: 'column',
          border: `2px dashed ${designTokens.semantic.border.default}`,
          cursor: 'pointer',
          transition: designTokens.transitions.base,
        }}
        onClick={onAddPerson}
        data-testid={testIds.addPersonChip}
      >
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: designTokens.semantic.text.secondary,
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            backgroundColor: designTokens.semantic.background.secondary,
            borderRadius: designTokens.borderRadius.full,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: designTokens.spacing[3],
          }}>
            <span style={{ fontSize: designTokens.typography.fontSize.xl }}>+</span>
          </div>
          <p style={{
            fontWeight: designTokens.typography.fontWeight.medium,
            fontSize: designTokens.typography.fontSize.base,
            margin: 0,
          }}>
            Add Person
          </p>
          <p style={{
            fontSize: designTokens.typography.fontSize.sm,
            textAlign: 'center',
            margin: 0,
            marginTop: designTokens.spacing[1],
          }}>
            Click to add someone to split with
          </p>
        </div>
      </Card>
    )
  }

  if (isEditing) {
    return (
      <Card variant="elevated" padding="md">
        <Stack direction="vertical" spacing={4}>
          <Stack direction="horizontal" align="center" spacing={3}>
            <Input
              value={formData.avatar_url}
              onChange={(e) => setFormData(prev => ({ ...prev, avatar_url: e.target.value }))}
              style={{
                width: '48px',
                height: '48px',
                textAlign: 'center',
                fontSize: designTokens.typography.fontSize.lg,
                borderRadius: designTokens.borderRadius.full,
              }}
              placeholder="👤"
            />
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              style={{ flex: 1 }}
              placeholder="Name"
              autoFocus
            />
          </Stack>
          <Input
            value={formData.venmo}
            onChange={(e) => setFormData(prev => ({ ...prev, venmo: e.target.value }))}
            placeholder="Venmo handle (optional)"
          />
          <Stack direction="horizontal" spacing={4}>
            <Button
              variant="primary"
              fullWidth
              onClick={handleSave}
            >
              Save
            </Button>
            <Button
              variant="secondary"
              fullWidth
              onClick={handleCancel}
            >
              Cancel
            </Button>
          </Stack>
        </Stack>
      </Card>
    )
  }

  return (
    <Card
      variant="elevated"
      padding="md"
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: designTokens.transitions.base,
        border: isDragOver ? `2px solid ${designTokens.semantic.border.focus}` : undefined,
        transform: isDropSuccess ? 'scale(1.02)' : 'scale(1)',
      }}
      ref={setNodeRef}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={handleDrop}
      role="button"
      tabIndex={0}
      aria-label={`Drop items here to assign to ${person.name}`}
      data-testid={`${testIds.personCard}-${person.id}`}
    >
      {/* Header: Avatar + Name + Venmo */}
      <Stack direction="horizontal" justify="between" align="start" spacing={0}>
        <Stack direction="horizontal" align="center" spacing={4}>
          <Avatar
            size="lg"
            src={person.avatar_url}
            fallback={person.avatar_url || '👤'}
            style={{
              fontSize: designTokens.typography.fontSize.xl,
            }}
            data-testid={`${testIds.personAvatar}-${person.id}`}
          />
          <div>
            <h3 style={{
              fontWeight: designTokens.typography.fontWeight.bold,
              color: designTokens.semantic.text.primary,
              fontSize: designTokens.typography.fontSize.base,
              margin: 0,
            }} data-testid={`${testIds.personName}-${person.id}`}>
              {person.name.length > 15 ? `${person.name.substring(0, 15)}...` : person.name}
            </h3>
            {person.venmo_handle && (
              <p style={{
                fontSize: designTokens.typography.fontSize.sm,
                color: designTokens.semantic.text.secondary,
                margin: 0,
              }} data-testid={`${testIds.personHandle}-${person.id}`}>
                @{person.venmo_handle}
              </p>
            )}
          </div>
        </Stack>
        
        {/* Action buttons - appears on hover */}
        <div style={{
          display: 'flex',
          gap: designTokens.spacing[1],
          opacity: isDragOver ? 1 : 0,
          transition: designTokens.transitions.fast,
        }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            style={{
              padding: `${designTokens.spacing[1]} ${designTokens.spacing[2]}`,
              fontSize: designTokens.typography.fontSize.xs,
            }}
            data-testid={`${testIds.editPersonButton}-${person.id}`}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
            style={{
              padding: `${designTokens.spacing[1]} ${designTokens.spacing[2]}`,
              fontSize: designTokens.typography.fontSize.xs,
              color: designTokens.semantic.status.error,
            }}
            data-testid={`${testIds.deletePersonButton}-${person.id}`}
          >
            {isDeleting ? '...' : 'Delete'}
          </Button>
        </div>
      </Stack>

      <Spacer size={3} />

      {/* Assigned Items List */}
      <div style={{ flex: 1 }}>
        {assignedItems.length === 0 ? (
          <div style={{
            fontSize: designTokens.typography.fontSize.sm,
            color: designTokens.semantic.text.secondary,
            fontStyle: 'italic',
          }}>
            No items assigned yet
          </div>
        ) : (
          <Stack direction="vertical" spacing={2}>
            {assignedItems.map((item) => (
              <div key={item.item_id} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: designTokens.typography.fontSize.sm,
              }}>
                <Stack direction="horizontal" align="center" spacing={2}>
                  <span style={{ fontSize: designTokens.typography.fontSize.base }}>
                    {item.emoji}
                  </span>
                  <span style={{ color: designTokens.semantic.text.primary }}>
                    {item.label}
                  </span>
                  {item.weight < 1 && (
                    <span style={{
                      padding: `${designTokens.spacing[1]} ${designTokens.spacing[2]}`,
                      backgroundColor: designTokens.semantic.background.secondary,
                      fontSize: designTokens.typography.fontSize.xs,
                      borderRadius: designTokens.borderRadius.full,
                      color: designTokens.semantic.text.secondary,
                    }}>
                      {item.weight === 0.5 ? '½' : `${Math.round(item.weight * 100)}%`}
                    </span>
                  )}
                </Stack>
                <span style={{
                  fontFamily: designTokens.typography.fontFamily.mono,
                  fontSize: designTokens.typography.fontSize.xs,
                  color: designTokens.semantic.text.primary,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  ${item.share_amount.toFixed(2)}
                </span>
              </div>
            ))}
          </Stack>
        )}
      </div>

      <Spacer size={3} />

      {/* Totals Footer */}
      {totals && (
        <div style={{
          borderTop: `1px solid ${designTokens.semantic.border.subtle}`,
          paddingTop: designTokens.spacing[3],
          marginTop: 'auto',
        }}>
          <Stack direction="vertical" spacing={1}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: designTokens.typography.fontSize.sm,
            }}>
              <span style={{ color: designTokens.semantic.text.secondary }}>
                Subtotal
              </span>
              <span style={{
                fontFamily: designTokens.typography.fontFamily.mono,
                fontSize: designTokens.typography.fontSize.xs,
                color: designTokens.semantic.text.primary,
                fontVariantNumeric: 'tabular-nums',
              }}>
                ${totals.subtotal.toFixed(2)}
              </span>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: designTokens.typography.fontSize.base,
              fontWeight: designTokens.typography.fontWeight.semibold,
            }}>
              <span style={{ color: designTokens.semantic.text.primary }}>
                Total
              </span>
              <span style={{
                color: designTokens.semantic.text.primary,
                fontVariantNumeric: 'tabular-nums',
              }}>
                ${totals.total.toFixed(2)}
              </span>
            </div>
          </Stack>
        </div>
      )}
    </Card>
  )
}