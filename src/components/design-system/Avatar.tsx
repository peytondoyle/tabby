/**
 * iOS-Inspired Avatar Component
 * Circular or rounded square with gradient fallbacks
 */

import React from 'react'
import { styled, designTokens } from '../../lib/styled'

// ============================================================================
// TYPES
// ============================================================================

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string
  alt?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  shape?: 'circle' | 'square'
  fallback?: string
  children?: React.ReactNode
}

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const StyledAvatar = styled('div')
const StyledImage = styled('img')

// ============================================================================
// COMPONENT
// ============================================================================

export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({
    src,
    alt = '',
    size = 'md',
    shape = 'circle',
    fallback,
    children,
    className = '',
    style,
    ...rest
  }, ref) => {
    // Size styles
    const sizeStyles: Record<string, React.CSSProperties> = {
      sm: {
        width: '32px',
        height: '32px',
        fontSize: designTokens.typography.fontSize.sm,
      },
      md: {
        width: '40px',
        height: '40px',
        fontSize: designTokens.typography.fontSize.base,
      },
      lg: {
        width: '56px',
        height: '56px',
        fontSize: designTokens.typography.fontSize.lg,
      },
      xl: {
        width: '80px',
        height: '80px',
        fontSize: designTokens.typography.fontSize['2xl'],
      },
    }

    // Base styles
    const baseStyles: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: designTokens.semantic.background.secondary,
      color: designTokens.semantic.text.primary,
      fontWeight: designTokens.typography.fontWeight.semibold,
      overflow: 'hidden',
      flexShrink: 0,
      ...sizeStyles[size],
      borderRadius: shape === 'circle' ? designTokens.borderRadius.full : designTokens.borderRadius.lg,
    }

    // Gradient fallback styles
    const gradientStyles: React.CSSProperties = {
      background: `linear-gradient(135deg, ${designTokens.colors.blue[400]}, ${designTokens.colors.blue[600]})`,
      color: designTokens.semantic.text.inverse,
    }

    // Image styles
    const imageStyles: React.CSSProperties = {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
    }

    // Combine all styles
    const combinedStyles: React.CSSProperties = {
      ...baseStyles,
      ...(src ? {} : gradientStyles),
      ...style,
    }

    // Generate fallback text
    const getFallbackText = () => {
      if (fallback) return fallback
      if (children) return children
      return '?'
    }

    return (
      <StyledAvatar
        ref={ref}
        className={className}
        style={combinedStyles}
        {...rest}
      >
        {src ? (
          <StyledImage
            src={src}
            alt={alt}
            style={imageStyles}
            onError={(e) => {
              // Hide image on error and show fallback
              e.currentTarget.style.display = 'none'
            }}
          />
        ) : null}
        
        {(!src || fallback || children) && (
          <span style={{ 
            display: src ? 'none' : 'block',
            textTransform: 'uppercase',
            letterSpacing: designTokens.typography.letterSpacing.wide,
          }}>
            {getFallbackText()}
          </span>
        )}
      </StyledAvatar>
    )
  }
)

Avatar.displayName = 'Avatar'
