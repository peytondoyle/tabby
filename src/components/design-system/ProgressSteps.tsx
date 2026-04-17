import React from 'react'

export interface ProgressStepsProps {
  current: number
  labels?: string[]
  onStepClick?: (step: number) => void
  className?: string
}

const defaultLabels = ['Upload', 'Scanning', 'Assign', 'Review']

/**
 * Progress breadcrumb for the scan → people → assign flow.
 * Uses Tabby brand tokens (coral + butter + ink) directly so it can't drift
 * back to iOS blue when the old design-system tokens wander.
 */
export const ProgressSteps: React.FC<ProgressStepsProps> = ({
  current,
  labels = defaultLabels,
  onStepClick,
  className = ''
}) => {
  const progressPct = (current / Math.max(1, labels.length - 1)) * 100

  return (
    <nav className={`tb-progress ${className}`} role="list" aria-label="Progress">
      <div className="tb-progress__track-wrap">
        <div className="tb-progress__track" />
        <div className="tb-progress__fill" style={{ width: `${progressPct}%` }} />

        <div className="tb-progress__steps">
          {labels.map((label, index) => {
            const isActive = index === current
            const isPast = index < current
            const isFuture = index > current
            const state = isPast ? 'past' : isActive ? 'active' : 'future'

            return (
              <button
                key={index}
                type="button"
                className={`tb-progress__step tb-progress__step--${state}`}
                aria-current={isActive ? 'step' : undefined}
                aria-label={`Step ${index + 1}: ${label}${isActive ? ' (current)' : ''}${isPast ? ' (completed)' : ''}`}
                onClick={() => onStepClick?.(index)}
                disabled={!onStepClick || isFuture}
              >
                <span className="tb-progress__dot" aria-hidden="true">
                  {isPast ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20,6 9,17 4,12" />
                    </svg>
                  ) : null}
                </span>
                <span className="tb-progress__label">{label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
