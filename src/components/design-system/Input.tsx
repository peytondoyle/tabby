/**
 * iOS-Inspired Input Component
 * Clean borders, subtle shadows, focus state with blue outline
 */

import React from 'react'
import { styled, designTokens } from '../../lib/styled'

// ============================================================================
// TYPES
// ============================================================================

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'filled'
  size?: 'sm' | 'md' | 'lg'
  error?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const StyledInput = styled('input')
const InputContainer = styled('div')

// ============================================================================
// COMPONENT
// ============================================================================

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({
    variant = 'default',
    size = 'md',
    error = false,
    leftIcon,
    rightIcon,
    className = '',
    style,
    ...rest
  }, ref) => {
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

    // Base styles
    const baseStyles: React.CSSProperties = {
      width: '100%',
      fontFamily: designTokens.typography.fontFamily.sans,
      fontWeight: designTokens.typography.fontWeight.normal,
      lineHeight: designTokens.typography.lineHeight.normal,
      border: 'none',
      outline: 'none',
      transition: designTokens.transitions.fast,
      backgroundColor: 'transparent',
      color: designTokens.semantic.text.primary,
    }

    // Variant styles
    const variantStyles: Record<string, React.CSSProperties> = {
      default: {
        border: `1px solid ${designTokens.semantic.border.default}`,
        backgroundColor: designTokens.semantic.background.elevated,
        boxShadow: designTokens.shadows.sm,
      },
      filled: {
        backgroundColor: designTokens.semantic.background.secondary,
        border: `1px solid transparent`,
      },
    }

    // Error styles
    const errorStyles: React.CSSProperties = error ? {
      borderColor: designTokens.semantic.status.error,
      boxShadow: `0 0 0 3px ${designTokens.semantic.status.error}${designTokens.alpha[10]}`,
    } : {}

    // Focus styles
    const focusStyles: React.CSSProperties = {
      borderColor: designTokens.semantic.border.focus,
      boxShadow: `0 0 0 3px ${designTokens.semantic.border.focus}${designTokens.alpha[10]}`,
    }

    // Placeholder styles
    const placeholderStyles: React.CSSProperties = {
      color: designTokens.semantic.text.tertiary,
    }

    // Combine all styles
    const combinedStyles: React.CSSProperties = {
      ...baseStyles,
      ...sizeStyles[size],
      ...variantStyles[variant],
      ...errorStyles,
      ...style,
    }

    // Container styles (for icons)
    const containerStyles: React.CSSProperties = {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      width: '100%',
    }

    // Icon styles
    const iconStyles: React.CSSProperties = {
      position: 'absolute',
      top: '50%',
      transform: 'translateY(-50%)',
      color: designTokens.semantic.text.tertiary,
      pointerEvents: 'none',
      zIndex: 1,
    }

    const leftIconStyles: React.CSSProperties = {
      ...iconStyles,
      left: designTokens.spacing[3],
    }

    const rightIconStyles: React.CSSProperties = {
      ...iconStyles,
      right: designTokens.spacing[3],
    }

    // Adjust padding for icons
    const inputWithIconsStyles: React.CSSProperties = {
      ...combinedStyles,
      ...(leftIcon ? { paddingLeft: designTokens.spacing[10] } : {}),
      ...(rightIcon ? { paddingRight: designTokens.spacing[10] } : {}),
    }

    // Handle focus
    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      if (!error) {
        Object.assign(e.currentTarget.style, focusStyles)
      }
      rest.onFocus?.(e)
    }

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      if (!error) {
        Object.assign(e.currentTarget.style, {
          ...variantStyles[variant],
          borderColor: designTokens.semantic.border.default,
          boxShadow: variant === 'default' ? designTokens.shadows.sm : 'none',
        })
      }
      rest.onBlur?.(e)
    }

    const inputElement = (
      <StyledInput
        ref={ref}
        className={className}
        style={inputWithIconsStyles}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...rest}
      />
    )

    // If no icons, return simple input
    if (!leftIcon && !rightIcon) {
      return inputElement
    }

    // Return input with icons
    return (
      <InputContainer style={containerStyles}>
        {leftIcon && (
          <span style={leftIconStyles}>
            {leftIcon}
          </span>
        )}
        {inputElement}
        {rightIcon && (
          <span style={rightIconStyles}>
            {rightIcon}
          </span>
        )}
      </InputContainer>
    )
  }
)

Input.displayName = 'Input'
