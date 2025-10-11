/**
 * iOS-Inspired Icon Button Component
 * Clean, minimal icon-only button
 */

import React from 'react'
import { designTokens } from '../../lib/styled'

export interface IconButtonProps {
  icon: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: 'default' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  'aria-label'?: string
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  onClick,
  disabled = false,
  variant = 'default',
  size = 'md',
  className = '',
  'aria-label': ariaLabel,
}) => {
  const sizeStyles = {
    sm: {
      width: '32px',
      height: '32px',
      iconSize: '16px',
    },
    md: {
      width: '40px',
      height: '40px',
      iconSize: '20px',
    },
    lg: {
      width: '48px',
      height: '48px',
      iconSize: '24px',
    },
  }

  const variantStyles = {
    default: {
      backgroundColor: designTokens.semantic.background.elevated,
      border: `1px solid ${designTokens.semantic.border.default}`,
      color: designTokens.semantic.text.primary,
      hoverBackgroundColor: `${designTokens.semantic.text.primary}${designTokens.alpha[5]}`,
    },
    ghost: {
      backgroundColor: 'transparent',
      border: 'none',
      color: designTokens.semantic.text.secondary,
      hoverBackgroundColor: `${designTokens.semantic.text.primary}${designTokens.alpha[10]}`,
    },
    danger: {
      backgroundColor: designTokens.semantic.background.elevated,
      border: `1px solid ${designTokens.semantic.error}`,
      color: designTokens.semantic.error,
      hoverBackgroundColor: `${designTokens.semantic.error}${designTokens.alpha[10]}`,
    },
  }

  const currentSize = sizeStyles[size]
  const currentVariant = variantStyles[variant]

  return (
    <button
      style={{
        width: currentSize.width,
        height: currentSize.height,
        borderRadius: designTokens.borderRadius.md,
        backgroundColor: currentVariant.backgroundColor,
        border: currentVariant.border,
        color: currentVariant.color,
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: designTokens.transitions.fast,
        opacity: disabled ? 0.6 : 1,
        ...(className && { className }),
      }}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = currentVariant.hoverBackgroundColor
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = currentVariant.backgroundColor
        }
      }}
    >
      <div style={{
        fontSize: currentSize.iconSize,
        lineHeight: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {icon}
      </div>
    </button>
  )
}
