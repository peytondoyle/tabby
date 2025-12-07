import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ParseResult } from '@/lib/receiptScanning'

interface ValidationWarningsProps {
  validation?: ParseResult['validation']
  fieldConfidence?: ParseResult['fieldConfidence']
  handwrittenFields?: string[]
  suggestedCorrections?: ParseResult['suggestedCorrections']
  confidence?: number
  onApplyCorrection?: (field: string, value: number | string) => void
  onDismissWarning?: (index: number) => void
  className?: string
}

export const ValidationWarnings: React.FC<ValidationWarningsProps> = ({
  validation,
  fieldConfidence,
  handwrittenFields,
  suggestedCorrections,
  confidence,
  onApplyCorrection,
  onDismissWarning,
  className = ''
}) => {
  const hasWarnings = validation?.warnings && validation.warnings.length > 0
  const hasCorrections = suggestedCorrections && suggestedCorrections.length > 0
  const hasHandwritten = handwrittenFields && handwrittenFields.length > 0
  const hasLowConfidence = confidence !== undefined && confidence < 0.7

  if (!hasWarnings && !hasCorrections && !hasHandwritten && !hasLowConfidence) {
    return null
  }

  const getConfidenceColor = (level: 'high' | 'medium' | 'low' | undefined) => {
    switch (level) {
      case 'high': return 'text-green-400'
      case 'medium': return 'text-yellow-400'
      case 'low': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  const getConfidenceIcon = (level: 'high' | 'medium' | 'low' | undefined) => {
    switch (level) {
      case 'high': return '✓'
      case 'medium': return '?'
      case 'low': return '!'
      default: return '•'
    }
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Overall Confidence Banner */}
      {hasLowConfidence && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3"
        >
          <div className="flex items-center gap-2">
            <span className="text-yellow-400 text-lg">⚠️</span>
            <div>
              <p className="text-yellow-400 font-medium text-sm">
                Low Confidence Scan ({Math.round((confidence || 0) * 100)}%)
              </p>
              <p className="text-yellow-400/70 text-xs">
                Some values may need manual verification
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Handwritten Fields Notice */}
      {hasHandwritten && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3"
        >
          <div className="flex items-center gap-2">
            <span className="text-blue-400 text-lg">✍️</span>
            <div>
              <p className="text-blue-400 font-medium text-sm">
                Handwritten Values Detected
              </p>
              <p className="text-blue-400/70 text-xs">
                {handwrittenFields.map(f => f.charAt(0).toUpperCase() + f.slice(1)).join(', ')} appear to be handwritten
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Warnings */}
      <AnimatePresence>
        {hasWarnings && validation.warnings.map((warning, index) => (
          <motion.div
            key={`warning-${index}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ delay: index * 0.1 }}
            className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <span className="text-orange-400 text-lg mt-0.5">⚡</span>
                <p className="text-orange-400 text-sm">{warning}</p>
              </div>
              {onDismissWarning && (
                <button
                  onClick={() => onDismissWarning(index)}
                  className="text-orange-400/50 hover:text-orange-400 text-sm"
                >
                  ✕
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Suggested Corrections */}
      {hasCorrections && (
        <div className="space-y-2">
          <p className="text-sm text-text-primary-dim font-medium">Suggested Fixes:</p>
          {suggestedCorrections.map((correction, index) => (
            <motion.div
              key={`correction-${index}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="bg-green-500/10 border border-green-500/30 rounded-lg p-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-green-400 font-medium text-sm">
                    {correction.field.charAt(0).toUpperCase() + correction.field.slice(1)}
                  </p>
                  <p className="text-green-400/70 text-xs">
                    {correction.currentValue !== null && correction.currentValue !== undefined
                      ? `$${typeof correction.currentValue === 'number' ? correction.currentValue.toFixed(2) : correction.currentValue}`
                      : 'Not set'
                    }
                    {' → '}
                    <span className="font-medium text-green-400">
                      ${typeof correction.suggestedValue === 'number'
                        ? correction.suggestedValue.toFixed(2)
                        : correction.suggestedValue
                      }
                    </span>
                  </p>
                  <p className="text-green-400/50 text-xs mt-1">{correction.reason}</p>
                </div>
                {onApplyCorrection && (
                  <button
                    onClick={() => onApplyCorrection(correction.field, correction.suggestedValue)}
                    className="bg-green-500/20 hover:bg-green-500/30 text-green-400 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    Apply
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Field Confidence Breakdown (collapsible) */}
      {fieldConfidence && (
        <details className="text-sm">
          <summary className="text-text-primary-dim cursor-pointer hover:text-text-primary">
            Field Confidence Details
          </summary>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            {Object.entries(fieldConfidence).map(([field, level]) => (
              <div key={field} className="flex items-center justify-between bg-white/5 rounded px-2 py-1">
                <span className="text-text-primary-dim capitalize">{field}</span>
                <span className={getConfidenceColor(level)}>
                  {getConfidenceIcon(level)} {level}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

export default ValidationWarnings
