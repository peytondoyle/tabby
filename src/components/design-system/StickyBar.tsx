/**
 * iOS-Inspired Sticky Bar Component
 * Clean, minimal sticky bar with glass effect
 */

import React from 'react'
import { designTokens } from '../../lib/styled'

export interface StickyBarProps {
  children: React.ReactNode
  show?: boolean
  position?: 'top' | 'bottom'
  className?: string
}

export const StickyBar: React.FC<StickyBarProps> = ({
  children,
  show = true,
  position = 'bottom',
  className = ''
}) => {
  if (!show) return null

  const positionStyles: React.CSSProperties = position === 'bottom'
    ? {
        bottom: 0,
        borderTop: `1px solid ${designTokens.semantic.border.subtle}`,
      }
    : {
        top: 0,
        borderBottom: `1px solid ${designTokens.semantic.border.subtle}`,
      }

  return (
    <>
      {/* Gradient scrim for better visibility */}
      {position === 'bottom' && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            height: '128px',
            pointerEvents: 'none',
            zIndex: designTokens.zIndex.sticky - 1,
            background: `linear-gradient(to top, ${designTokens.semantic.background.primary}95 0%, transparent 100%)`,
          }}
        />
      )}

      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          backgroundColor: `${designTokens.semantic.background.elevated}${designTokens.alpha[80]}`,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          zIndex: designTokens.zIndex.sticky,
          boxShadow: designTokens.shadows.lg,
          ...positionStyles,
          ...(className && { className }),
        }}
      >
        <div style={{
          margin: '0 auto',
          maxWidth: '1400px',
          padding: `0 ${designTokens.spacing[4]}`,
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: designTokens.spacing[3],
        }}>
          {children}
        </div>
      </div>
    </>
  )
}

// ActionBar component - specialized version of StickyBar for bottom actions
export interface ActionBarProps {
  children: React.ReactNode
  helperText?: string
  show?: boolean
  className?: string
}

export const ActionBar: React.FC<ActionBarProps> = ({
  children,
  helperText,
  show = true,
  className = ''
}) => {
  return (
    <StickyBar show={show} position="bottom" className={className}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: designTokens.spacing[4],
        width: '100%',
      }}>
        {helperText && (
          <span style={{
            fontSize: designTokens.typography.fontSize.sm,
            color: designTokens.semantic.text.secondary,
            display: 'none', // Hidden on mobile, shown on larger screens
          }}>
            {helperText}
          </span>
        )}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: designTokens.spacing[3],
          marginLeft: 'auto',
        }}>
          {children}
        </div>
      </div>
    </StickyBar>
  )
}
