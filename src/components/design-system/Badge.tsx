/**
 * iOS-Inspired Badge Component
 * Pill-shaped, minimal with subtle backgrounds
 */

import React from 'react'
import { styled, designTokens } from '../../lib/styled'

// ============================================================================
// TYPES
// ============================================================================

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error'
  size?: 'sm' | 'md'
  children?: React.ReactNode
}

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const StyledBadge = styled('span')

// ============================================================================
// COMPONENT
// ============================================================================

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({
    variant = 'default',
    size = 'md',
    className = '',
    children,
    style,
    ...rest
  }, ref) => {
    // Base styles
    const baseStyles: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: designTokens.typography.fontWeight.medium,
      borderRadius: designTokens.borderRadius.full,
      whiteSpace: 'nowrap',
      flexShrink: 0,
    }

    // Size styles
    const sizeStyles: Record<string, React.CSSProperties> = {
      sm: {
        height: '20px',
        paddingLeft: designTokens.spacing[2],
        paddingRight: designTokens.spacing[2],
        fontSize: designTokens.typography.fontSize.xs,
        lineHeight: designTokens.typography.lineHeight.tight,
      },
      md: {
        height: '24px',
        paddingLeft: designTokens.spacing[3],
        paddingRight: designTokens.spacing[3],
        fontSize: designTokens.typography.fontSize.sm,
        lineHeight: designTokens.typography.lineHeight.tight,
      },
    }

    // Variant styles
    const variantStyles: Record<string, React.CSSProperties> = {
      default: {
        backgroundColor: designTokens.semantic.background.secondary,
        color: designTokens.semantic.text.secondary,
        border: `1px solid ${designTokens.semantic.border.subtle}`,
      },
      primary: {
        backgroundColor: `${designTokens.semantic.interactive.primary}${designTokens.alpha[10]}`,
        color: designTokens.semantic.interactive.primary,
        border: `1px solid ${designTokens.semantic.interactive.primary}${designTokens.alpha[20]}`,
      },
      success: {
        backgroundColor: `${designTokens.semantic.status.success}${designTokens.alpha[10]}`,
        color: designTokens.semantic.status.success,
        border: `1px solid ${designTokens.semantic.status.success}${designTokens.alpha[20]}`,
      },
      warning: {
        backgroundColor: `${designTokens.semantic.status.warning}${designTokens.alpha[10]}`,
        color: designTokens.semantic.status.warning,
        border: `1px solid ${designTokens.semantic.status.warning}${designTokens.alpha[20]}`,
      },
      error: {
        backgroundColor: `${designTokens.semantic.status.error}${designTokens.alpha[10]}`,
        color: designTokens.semantic.status.error,
        border: `1px solid ${designTokens.semantic.status.error}${designTokens.alpha[20]}`,
      },
    }

    // Combine all styles
    const combinedStyles: React.CSSProperties = {
      ...baseStyles,
      ...sizeStyles[size],
      ...variantStyles[variant],
      ...style,
    }

    return (
      <StyledBadge
        ref={ref}
        className={className}
        style={combinedStyles}
        {...rest}
      >
        {children}
      </StyledBadge>
    )
  }
)

Badge.displayName = 'Badge'
