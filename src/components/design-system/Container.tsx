/**
 * Container Component - Max-width content wrapper
 * iOS-inspired layout component for consistent content width
 */

import React from 'react'
import { styled, designTokens } from '../../lib/styled'

// ============================================================================
// TYPES
// ============================================================================

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  center?: boolean
  padding?: boolean
  children?: React.ReactNode
}

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const StyledContainer = styled('div')

// ============================================================================
// COMPONENT
// ============================================================================

export const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({
    size = 'lg',
    center = true,
    padding = true,
    className = '',
    children,
    style,
    ...rest
  }, ref) => {
    // Size styles - More responsive for desktop
    const sizeStyles: Record<string, React.CSSProperties> = {
      sm: {
        maxWidth: '640px',
      },
      md: {
        maxWidth: '768px',
      },
      lg: {
        maxWidth: '1200px', // Increased from 1024px
      },
      xl: {
        maxWidth: '1400px', // Increased from 1280px
      },
      full: {
        maxWidth: '100%',
      },
    }

    // Base styles (Billy dark theme)
    const baseStyles: React.CSSProperties = {
      width: '100%',
      backgroundColor: designTokens.semantic.background.primary,
      color: designTokens.semantic.text.primary,
      minHeight: '100vh',
      ...sizeStyles[size],
    }

    // Center styles
    const centerStyles: React.CSSProperties = center ? {
      marginLeft: 'auto',
      marginRight: 'auto',
    } : {}

    // Padding styles - More generous padding for desktop
    const paddingStyles: React.CSSProperties = padding ? {
      paddingLeft: designTokens.spacing[6], // Increased from 4 to 6
      paddingRight: designTokens.spacing[6], // Increased from 4 to 6
    } : {}

    // Combine all styles
    const combinedStyles: React.CSSProperties = {
      ...baseStyles,
      ...centerStyles,
      ...paddingStyles,
      ...style,
    }

    return (
      <StyledContainer
        ref={ref}
        className={className}
        style={combinedStyles}
        {...rest}
      >
        {children}
      </StyledContainer>
    )
  }
)

Container.displayName = 'Container'
