/**
 * iOS-Inspired Button Component
 * Single, minimal component with subtle press states
 */

import React from 'react'
import { styled, designTokens } from '../../lib/styled'

// ============================================================================
// TYPES
// ============================================================================

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
  children?: React.ReactNode
}

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const StyledButton = styled('button')

// ============================================================================
// COMPONENT
// ============================================================================

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    variant = 'primary',
    size = 'md',
    loading = false,
    leftIcon,
    rightIcon,
    fullWidth = false,
    className = '',
    children,
    disabled,
    style,
    ...rest
  }, ref) => {
    // Base styles
    const baseStyles: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: designTokens.typography.fontFamily.sans,
      fontWeight: designTokens.typography.fontWeight.medium,
      border: 'none',
      cursor: 'pointer',
      transition: designTokens.transitions.fast,
      userSelect: 'none',
      textDecoration: 'none',
      outline: 'none',
      position: 'relative',
      overflow: 'hidden',
    }

    // Size styles
    const sizeStyles: Record<string, React.CSSProperties> = {
      sm: {
        height: '32px',
        paddingLeft: designTokens.spacing[3],
        paddingRight: designTokens.spacing[3],
        fontSize: designTokens.typography.fontSize.sm,
        borderRadius: designTokens.borderRadius.md,
      },
      md: {
        height: '40px',
        paddingLeft: designTokens.spacing[4],
        paddingRight: designTokens.spacing[4],
        fontSize: designTokens.typography.fontSize.base,
        borderRadius: designTokens.borderRadius.lg,
      },
      lg: {
        height: '48px',
        paddingLeft: designTokens.spacing[5],
        paddingRight: designTokens.spacing[5],
        fontSize: designTokens.typography.fontSize.lg,
        borderRadius: designTokens.borderRadius.lg,
      },
    }

    // Variant styles (Billy dark theme)
    const variantStyles: Record<string, React.CSSProperties> = {
      primary: {
        backgroundColor: designTokens.semantic.interactive.primary,
        color: 'white',
        boxShadow: designTokens.shadows.md,
      },
      secondary: {
        backgroundColor: 'rgba(255,255,255,0.08)',
        color: designTokens.semantic.text.primary,
        border: `1px solid rgba(255,255,255,0.14)`,
        boxShadow: designTokens.shadows.sm,
      },
      ghost: {
        backgroundColor: 'transparent',
        color: designTokens.semantic.text.primary,
      },
    }

    // Hover styles (Billy dark theme)
    const hoverStyles: Record<string, React.CSSProperties> = {
      primary: {
        backgroundColor: designTokens.semantic.interactive.primaryHover,
        transform: 'translateY(-1px)',
        boxShadow: designTokens.shadows.lg,
      },
      secondary: {
        backgroundColor: 'rgba(255,255,255,0.12)',
        transform: 'translateY(-1px)',
        boxShadow: designTokens.shadows.md,
      },
      ghost: {
        backgroundColor: 'rgba(255,255,255,0.08)',
      },
    }

    // Active styles (Billy dark theme)
    const activeStyles: Record<string, React.CSSProperties> = {
      primary: {
        backgroundColor: designTokens.semantic.interactive.primaryActive,
        transform: 'scale(0.98)',
        boxShadow: designTokens.shadows.sm,
      },
      secondary: {
        backgroundColor: 'rgba(255,255,255,0.18)',
        transform: 'scale(0.98)',
        boxShadow: designTokens.shadows.sm,
      },
      ghost: {
        transform: 'scale(0.98)',
      },
    }

    // Disabled styles
    const disabledStyles: React.CSSProperties = {
      opacity: 0.5,
      cursor: 'not-allowed',
      transform: 'none',
    }

    // Full width
    const fullWidthStyles: React.CSSProperties = fullWidth ? {
      width: '100%',
    } : {}

    // Combine all styles
    const combinedStyles: React.CSSProperties = {
      ...baseStyles,
      ...sizeStyles[size],
      ...variantStyles[variant],
      ...fullWidthStyles,
      ...(disabled ? disabledStyles : {}),
      ...style,
    }

    // Handle interactions
    const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!disabled && !loading) {
        Object.assign(e.currentTarget.style, hoverStyles[variant])
      }
    }

    const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!disabled && !loading) {
        Object.assign(e.currentTarget.style, {
          ...variantStyles[variant],
          transform: 'none',
        })
      }
    }

    const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!disabled && !loading) {
        Object.assign(e.currentTarget.style, activeStyles[variant])
      }
    }

    const handleMouseUp = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!disabled && !loading) {
        Object.assign(e.currentTarget.style, hoverStyles[variant])
      }
    }

    return (
      <StyledButton
        ref={ref}
        className={className}
        style={combinedStyles}
        disabled={disabled || loading}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        {...rest}
      >
        {leftIcon && (
          <span style={{ marginRight: designTokens.spacing[2] }}>
            {leftIcon}
          </span>
        )}
        
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: designTokens.spacing[2] }}>
            <div
              style={{
                width: '16px',
                height: '16px',
                border: `2px solid currentColor`,
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
            <span>{children}</span>
          </div>
        ) : (
          children
        )}
        
        {rightIcon && (
          <span style={{ marginLeft: designTokens.spacing[2] }}>
            {rightIcon}
          </span>
        )}
      </StyledButton>
    )
  }
)

Button.displayName = 'Button'

// ============================================================================
// CSS ANIMATION
// ============================================================================

const style = document.createElement('style')
style.textContent = `
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`
document.head.appendChild(style)
