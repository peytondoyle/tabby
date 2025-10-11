/**
 * iOS-Inspired Card Component
 * Clean white background with subtle shadows and rounded corners
 */

import React from 'react'
import { styled, designTokens } from '../../lib/styled'

// ============================================================================
// TYPES
// ============================================================================

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'glass'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  children?: React.ReactNode
}

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const StyledCard = styled('div')

// ============================================================================
// COMPONENT
// ============================================================================

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({
    variant = 'default',
    padding = 'md',
    className = '',
    children,
    style,
    ...rest
  }, ref) => {
    // Base styles (Billy dark theme)
    const baseStyles: React.CSSProperties = {
      backgroundColor: designTokens.semantic.background.elevated,
      borderRadius: designTokens.borderRadius['2xl'],
      border: `1px solid ${designTokens.semantic.border.subtle}`,
      boxShadow: designTokens.shadows.md,
      transition: designTokens.transitions.fast,
    }

    // Variant styles (Billy dark theme)
    const variantStyles: Record<string, React.CSSProperties> = {
      default: {
        boxShadow: designTokens.shadows.md,
      },
      elevated: {
        boxShadow: designTokens.shadows.lg,
        borderColor: designTokens.semantic.border.default,
      },
      glass: {
        backgroundColor: 'rgba(28,31,39,0.9)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderColor: designTokens.semantic.border.subtle,
        boxShadow: designTokens.shadows.lg,
      },
    }

    // Padding styles
    const paddingStyles: Record<string, React.CSSProperties> = {
      none: {},
      sm: {
        padding: designTokens.spacing[3],
      },
      md: {
        padding: designTokens.spacing[4],
      },
      lg: {
        padding: designTokens.spacing[6],
      },
    }

    // Hover styles (Billy dark theme)
    const hoverStyles: React.CSSProperties = {
      transform: 'translateY(-1px)',
      boxShadow: designTokens.shadows.lg,
    }

    // Combine all styles
    const combinedStyles: React.CSSProperties = {
      ...baseStyles,
      ...variantStyles[variant],
      ...paddingStyles[padding],
      ...style,
    }

    // Handle hover
    const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
      if (variant !== 'glass') {
        Object.assign(e.currentTarget.style, hoverStyles)
      }
    }

    const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
      if (variant !== 'glass') {
        Object.assign(e.currentTarget.style, {
          ...variantStyles[variant],
          transform: 'none',
        })
      }
    }

    return (
      <StyledCard
        ref={ref}
        className={className}
        style={combinedStyles}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...rest}
      >
        {children}
      </StyledCard>
    )
  }
)

Card.displayName = 'Card'
