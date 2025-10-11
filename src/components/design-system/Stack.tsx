/**
 * Stack Component - Vertical/horizontal spacing
 * iOS-inspired layout component for consistent spacing
 */

import React from 'react'
import { styled, designTokens } from '../../lib/styled'

// ============================================================================
// TYPES
// ============================================================================

export interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: 'vertical' | 'horizontal'
  spacing?: keyof typeof designTokens.spacing
  align?: 'start' | 'center' | 'end' | 'stretch'
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'
  wrap?: boolean
  children?: React.ReactNode
}

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const StyledStack = styled('div')

// ============================================================================
// COMPONENT
// ============================================================================

export const Stack = React.forwardRef<HTMLDivElement, StackProps>(
  ({
    direction = 'vertical',
    spacing = 4,
    align = 'start',
    justify = 'start',
    wrap = false,
    className = '',
    children,
    style,
    ...rest
  }, ref) => {
    // Base styles
    const baseStyles: React.CSSProperties = {
      display: 'flex',
      flexWrap: wrap ? 'wrap' : 'nowrap',
    }

    // Direction styles
    const directionStyles: React.CSSProperties = {
      flexDirection: direction === 'vertical' ? 'column' : 'row',
    }

    // Spacing styles
    const spacingValue = designTokens.spacing[spacing]
    const spacingStyles: React.CSSProperties = direction === 'vertical' 
      ? {
          gap: spacingValue,
        }
      : {
          gap: spacingValue,
        }

    // Alignment styles
    const alignMap = {
      start: 'flex-start',
      center: 'center',
      end: 'flex-end',
      stretch: 'stretch',
    }
    const alignStyles: React.CSSProperties = {
      alignItems: alignMap[align],
    }

    // Justify styles
    const justifyMap = {
      start: 'flex-start',
      center: 'center',
      end: 'flex-end',
      between: 'space-between',
      around: 'space-around',
      evenly: 'space-evenly',
    }
    const justifyStyles: React.CSSProperties = {
      justifyContent: justifyMap[justify],
    }

    // Combine all styles
    const combinedStyles: React.CSSProperties = {
      ...baseStyles,
      ...directionStyles,
      ...spacingStyles,
      ...alignStyles,
      ...justifyStyles,
      ...style,
    }

    return (
      <StyledStack
        ref={ref}
        className={className}
        style={combinedStyles}
        {...rest}
      >
        {children}
      </StyledStack>
    )
  }
)

Stack.displayName = 'Stack'
