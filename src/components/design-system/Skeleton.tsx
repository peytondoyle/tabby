/**
 * iOS-Inspired Skeleton Components
 * Clean, minimal loading placeholders
 */

import React from 'react'
import { designTokens } from '../../lib/styled'

export interface SkeletonProps {
  width?: string | number
  height?: string | number
  borderRadius?: string
  className?: string
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '20px',
  borderRadius = designTokens.borderRadius.sm,
  className = ''
}) => {
  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: `${designTokens.semantic.text.primary}${designTokens.alpha[10]}`,
        animation: 'skeleton-pulse 1.5s ease-in-out infinite',
        ...(className && { className }),
      }}
    />
  )
}

export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({
  lines = 1,
  className = ''
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: designTokens.spacing[2] }}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          width={index === lines - 1 ? '75%' : '100%'}
          height="16px"
          className={className}
        />
      ))}
    </div>
  )
}

export const SkeletonPill: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <Skeleton
      width="80px"
      height="32px"
      borderRadius={designTokens.borderRadius.full}
      className={className}
    />
  )
}

export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div style={{
      padding: designTokens.spacing[4],
      borderRadius: designTokens.borderRadius.lg,
      backgroundColor: designTokens.semantic.background.elevated,
      border: `1px solid ${designTokens.semantic.border.default}`,
      ...(className && { className }),
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: designTokens.spacing[3] }}>
        <Skeleton width="60%" height="20px" />
        <SkeletonText lines={2} />
        <div style={{ display: 'flex', gap: designTokens.spacing[2] }}>
          <SkeletonPill />
          <SkeletonPill />
        </div>
      </div>
    </div>
  )
}

// Add the pulse animation
const style = document.createElement('style')
style.textContent = `
  @keyframes skeleton-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`
document.head.appendChild(style)
