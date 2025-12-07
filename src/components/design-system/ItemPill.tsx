/**
 * iOS-Inspired Item Pill Component
 * Clean, minimal item selection pill with edit support
 */

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { designTokens } from '../../lib/styled'

export interface ItemPillProps {
  id?: string
  name: string
  price: number
  icon?: string
  selected?: boolean
  assigned?: boolean
  isMine?: boolean
  showPrice?: boolean // Hide price on unassigned items (Billy-style)
  onClick?: (id?: string) => void
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  disabled?: boolean
  className?: string
}

export const ItemPill: React.FC<ItemPillProps> = ({
  id,
  name,
  price,
  icon,
  selected = false,
  assigned = false,
  isMine = false,
  showPrice = true,
  onClick,
  onEdit,
  onDelete,
  disabled = false,
  className = ''
}) => {
  const [isHovered, setIsHovered] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMenu])

  const handleLongPressStart = useCallback(() => {
    if (disabled || (!onEdit && !onDelete)) return
    longPressTimer.current = setTimeout(() => {
      setShowMenu(true)
    }, 500) // 500ms long press
  }, [disabled, onEdit, onDelete])

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  const handleEditClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setShowMenu(false)
    if (id && onEdit) onEdit(id)
  }, [id, onEdit])

  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setShowMenu(false)
    if (id && onDelete) onDelete(id)
  }, [id, onDelete])

  const handleMenuToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setShowMenu(prev => !prev)
  }, [])

  const hasEditActions = onEdit || onDelete
  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  // Billy pill styling logic - using design tokens
  const getPillStyles = () => {
    if (isMine) {
      // Brownish filled style for "mine" items - using design tokens
      return {
        backgroundColor: designTokens.semantic.pill.mine.background,
        border: `1px solid ${designTokens.semantic.pill.mine.border}`,
        color: designTokens.semantic.text.primary,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
      }
    } else if (assigned) {
      // Assigned items - using design tokens
      return {
        backgroundColor: designTokens.semantic.pill.assigned.background,
        border: `1px solid ${designTokens.semantic.pill.assigned.border}`,
        color: designTokens.semantic.text.primary,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
      }
    } else {
      // Unassigned items - using design tokens
      return {
        backgroundColor: designTokens.semantic.pill.unassigned.background,
        border: `1px solid ${designTokens.semantic.pill.unassigned.border}`,
        color: designTokens.semantic.text.primary,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
      }
    }
  }

  const pillStyles = getPillStyles()

  return (
    <div
      ref={menuRef}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
      onMouseEnter={() => !disabled && setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false)
        handleLongPressEnd()
      }}
    >
      <button
        className="pill-touch-target focus-ring hover-lift"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: designTokens.spacing[2],
          padding: `${designTokens.spacing[2]} ${designTokens.spacing[3]}`,
          borderRadius: designTokens.borderRadius['2xl'],
          border: selected
            ? `2px solid ${designTokens.semantic.interactive.primary}`
            : pillStyles.border,
          backgroundColor: selected
            ? `${designTokens.semantic.interactive.primary}${designTokens.alpha[10]}`
            : pillStyles.backgroundColor,
          color: selected ? designTokens.semantic.text.primary : pillStyles.color,
          boxShadow: selected
            ? `0 0 0 2px rgba(10,132,255,0.25), ${pillStyles.boxShadow || 'none'}`
            : pillStyles.boxShadow,
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: designTokens.transitions.fast,
          opacity: disabled ? 0.6 : 1,
        }}
        onClick={() => onClick?.(id)}
        disabled={disabled}
        onTouchStart={handleLongPressStart}
        onTouchEnd={handleLongPressEnd}
        onTouchCancel={handleLongPressEnd}
      >
        {/* Icon if provided */}
        {icon && (
          <span style={{ fontSize: designTokens.typography.fontSize.base }}>
            {icon}
          </span>
        )}

        {/* Item name */}
        <span style={{
          fontSize: designTokens.typography.fontSize.sm,
          fontWeight: designTokens.typography.fontWeight.medium,
          color: selected ? designTokens.semantic.text.primary : pillStyles.color,
          whiteSpace: 'nowrap',
        }}>
          {name}
        </span>

        {/* Price - conditionally shown based on showPrice prop */}
        {showPrice && (
          <span style={{
            fontSize: designTokens.typography.fontSize.xs,
            fontWeight: designTokens.typography.fontWeight.semibold,
            color: selected ? designTokens.semantic.text.secondary : pillStyles.color,
            backgroundColor: selected
              ? `${designTokens.semantic.text.primary}${designTokens.alpha[10]}`
              : 'rgba(255,255,255,0.1)',
            padding: `${designTokens.spacing[1]} ${designTokens.spacing[2]}`,
            borderRadius: designTokens.borderRadius.sm,
          }}>
            {formatPrice(price)}
          </span>
        )}
      </button>

      {/* Edit icon - always visible when edit actions available, brighter on hover */}
      {hasEditActions && !showMenu && (
        <button
          onClick={handleMenuToggle}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            padding: 0,
            border: 'none',
            borderRadius: designTokens.borderRadius.full,
            backgroundColor: isHovered ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)',
            color: isHovered ? designTokens.semantic.text.primary : designTokens.semantic.text.tertiary,
            cursor: 'pointer',
            transition: designTokens.transitions.fast,
          }}
          aria-label="Edit item"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="2.5" />
            <circle cx="12" cy="5" r="2.5" />
            <circle cx="12" cy="19" r="2.5" />
          </svg>
        </button>
      )}

      {/* Dropdown menu */}
      {showMenu && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: designTokens.spacing[1],
            backgroundColor: designTokens.semantic.surface.elevated,
            border: `1px solid ${designTokens.semantic.border.subtle}`,
            borderRadius: designTokens.borderRadius.lg,
            boxShadow: designTokens.shadows.lg,
            overflow: 'hidden',
            zIndex: 50,
            minWidth: '120px',
          }}
        >
          {onEdit && (
            <button
              onClick={handleEditClick}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: designTokens.spacing[2],
                width: '100%',
                padding: `${designTokens.spacing[2]} ${designTokens.spacing[3]}`,
                border: 'none',
                backgroundColor: 'transparent',
                color: designTokens.semantic.text.primary,
                fontSize: designTokens.typography.fontSize.sm,
                textAlign: 'left',
                cursor: 'pointer',
                transition: designTokens.transitions.fast,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit price
            </button>
          )}
          {onDelete && (
            <button
              onClick={handleDeleteClick}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: designTokens.spacing[2],
                width: '100%',
                padding: `${designTokens.spacing[2]} ${designTokens.spacing[3]}`,
                border: 'none',
                backgroundColor: 'transparent',
                color: designTokens.semantic.status.error,
                fontSize: designTokens.typography.fontSize.sm,
                textAlign: 'left',
                cursor: 'pointer',
                transition: designTokens.transitions.fast,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,59,48,0.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  )
}
