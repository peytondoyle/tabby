/**
 * iOS-Inspired Progress Steps Component
 * Clean, minimal progress indicator with subtle animations
 */

import React from 'react'
import { designTokens } from '../../lib/styled'

export interface ProgressStepsProps {
  current: number
  labels?: string[]
  onStepClick?: (step: number) => void
  className?: string
}

const defaultLabels = ['Upload', 'Scanning', 'Assign', 'Review']

export const ProgressSteps: React.FC<ProgressStepsProps> = ({
  current,
  labels = defaultLabels,
  onStepClick,
  className = ''
}) => {
  return (
    <div 
      style={{
        width: '100%',
        ...(className && { className }),
      }}
      role="list"
    >
      <div style={{ position: 'relative' }}>
        {/* Background line */}
        <div style={{
          position: 'absolute',
          top: designTokens.spacing[3],
          left: 0,
          right: 0,
          height: '2px',
          backgroundColor: `${designTokens.semantic.text.primary}${designTokens.alpha[10]}`,
        }} />

        {/* Progress line */}
        <div
          style={{
            position: 'absolute',
            top: designTokens.spacing[3],
            left: 0,
            height: '2px',
            backgroundColor: designTokens.semantic.interactive.primary,
            width: `${(current / (labels.length - 1)) * 100}%`,
            transition: designTokens.transitions.base,
          }}
        />

        {/* Steps */}
        <div style={{
          position: 'relative',
          display: 'flex',
          justifyContent: 'space-between',
        }}>
          {labels.map((label, index) => {
            const isActive = index === current
            const isPast = index < current
            const isFuture = index > current

            return (
              <button
                key={index}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  background: 'none',
                  border: 'none',
                  cursor: onStepClick && !isFuture ? 'pointer' : 'default',
                  padding: designTokens.spacing[2],
                  transition: designTokens.transitions.fast,
                }}
                aria-current={isActive ? 'step' : undefined}
                aria-label={`Step ${index + 1}: ${label}${isActive ? ' (current)' : ''}${isPast ? ' (completed)' : ''}`}
                onClick={() => onStepClick?.(index)}
                disabled={!onStepClick || isFuture}
                type="button"
                onMouseEnter={(e) => {
                  if (onStepClick && !isFuture) {
                    e.currentTarget.style.transform = 'scale(1.05)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (onStepClick && !isFuture) {
                    e.currentTarget.style.transform = 'scale(1)'
                  }
                }}
              >
                {/* Step dot/check */}
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: designTokens.borderRadius.full,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    zIndex: 10,
                    transition: designTokens.transitions.base,
                    backgroundColor: isActive || isPast 
                      ? designTokens.semantic.interactive.primary
                      : designTokens.semantic.background.elevated,
                    border: isFuture ? `2px solid ${designTokens.semantic.border.default}` : 'none',
                    boxShadow: isActive ? designTokens.shadows.md : 'none',
                    transform: isActive ? 'scale(1.05)' : 'scale(1)',
                  }}
                >
                  {isPast ? (
                    <svg 
                      width="14" 
                      height="14" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2.5"
                      style={{ color: designTokens.semantic.text.inverse }}
                    >
                      <polyline points="20,6 9,17 4,12" />
                    </svg>
                  ) : isActive ? (
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        backgroundColor: designTokens.semantic.text.inverse,
                        borderRadius: designTokens.borderRadius.full,
                        animation: 'pulse 2s infinite',
                      }}
                    />
                  ) : (
                    <div style={{
                      width: '8px',
                      height: '8px',
                      backgroundColor: `${designTokens.semantic.text.primary}${designTokens.alpha[30]}`,
                      borderRadius: designTokens.borderRadius.full,
                    }} />
                  )}
                </div>

                {/* Label */}
                <span
                  style={{
                    marginTop: designTokens.spacing[2],
                    fontSize: designTokens.typography.fontSize.xs,
                    fontWeight: designTokens.typography.fontWeight.medium,
                    whiteSpace: 'nowrap',
                    transition: designTokens.transitions.fast,
                    color: isActive 
                      ? designTokens.semantic.interactive.primary
                      : isPast 
                        ? designTokens.semantic.text.primary
                        : designTokens.semantic.text.secondary,
                  }}
                >
                  {label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Add pulse animation */}
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}
      </style>
    </div>
  )
}
