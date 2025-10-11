/**
 * Spacer Component - Flexible spacing
 * iOS-inspired layout component for consistent spacing
 */

import React from 'react'
import { styled, designTokens } from '../../lib/styled'

// ============================================================================
// TYPES
// ============================================================================

export interface SpacerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: keyof typeof designTokens.spacing
  axis?: 'vertical' | 'horizontal' | 'both'
  children?: React.ReactNode
}

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const StyledSpacer = styled('div')

// ============================================================================
// COMPONENT
// ============================================================================

export const Spacer = React.forwardRef<HTMLDivElement, SpacerProps>(
  ({
    size = 4,
    axis = 'vertical',
    className = '',
    children,
    style,
    ...rest
  }, ref) => {
    // Base styles
    const baseStyles: React.CSSProperties = {
      flexShrink: 0,
    }

    // Size value
    const sizeValue = designTokens.spacing[size]

    // Axis styles
    const axisStyles: React.CSSProperties = {
      vertical: {
        height: sizeValue,
        width: '100%',
      },
      horizontal: {
        width: sizeValue,
        height: '100%',
      },
      both: {
        width: sizeValue,
        height: sizeValue,
      },
    }[axis]

    // Combine all styles
    const combinedStyles: React.CSSProperties = {
      ...baseStyles,
      ...axisStyles,
      ...style,
    }

    return (
      <StyledSpacer
        ref={ref}
        className={className}
        style={combinedStyles}
        {...rest}
      >
        {children}
      </StyledSpacer>
    )
  }
)

Spacer.displayName = 'Spacer'
