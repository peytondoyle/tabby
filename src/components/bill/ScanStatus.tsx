/**
 * iOS-Inspired Scan Status Component
 * Clean, minimal receipt scanning interface
 */

import React, { useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload,
  Loader2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  FileImage,
  Sparkles
} from 'lucide-react'
import { Card, Button } from '../design-system'
import { designTokens } from '../../lib/styled'
import type { ScanStatus as ScanStatusType } from '@/lib/scanAdapter'

interface ScanStatusProps {
  state: ScanStatusType
  progress?: number
  error?: { message: string; canRetry?: boolean }
  onFileSelect?: (file: File) => void
  onRetry?: () => void
  className?: string
}

export const ScanStatus: React.FC<ScanStatusProps> = ({
  state,
  progress = 0,
  error,
  onFileSelect,
  onRetry,
  className = ''
}) => {
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    const imageFile = files.find(file => file.type.startsWith('image/'))
    
    if (imageFile && onFileSelect) {
      onFileSelect(imageFile)
    }
  }, [onFileSelect])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && onFileSelect) {
      onFileSelect(file)
    }
  }, [onFileSelect])

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const renderContent = () => {
    switch (state) {
      case 'idle':
        return (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: designTokens.spacing[4],
            padding: designTokens.spacing[8],
            textAlign: 'center',
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: designTokens.borderRadius.full,
              backgroundColor: `${designTokens.semantic.interactive.primary}${designTokens.alpha[10]}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Upload size={32} color={designTokens.semantic.interactive.primary} />
            </div>
            
            <div>
              <h3 style={{
                fontSize: designTokens.typography.fontSize.lg,
                fontWeight: designTokens.typography.fontWeight.semibold,
                color: designTokens.semantic.text.primary,
                margin: 0,
                marginBottom: designTokens.spacing[2],
              }}>
                Upload Receipt
              </h3>
              <p style={{
                fontSize: designTokens.typography.fontSize.sm,
                color: designTokens.semantic.text.secondary,
                margin: 0,
              }}>
                Drag and drop an image or click to browse
              </p>
            </div>

            <Button variant="primary" onClick={handleUploadClick}>
              Choose File
            </Button>
          </div>
        )

      case 'uploading':
        return (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: designTokens.spacing[4],
            padding: designTokens.spacing[8],
            textAlign: 'center',
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: designTokens.borderRadius.full,
              backgroundColor: `${designTokens.semantic.interactive.primary}${designTokens.alpha[10]}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <Loader2 size={32} color={designTokens.semantic.interactive.primary} />
              </motion.div>
            </div>
            
            <div>
              <h3 style={{
                fontSize: designTokens.typography.fontSize.lg,
                fontWeight: designTokens.typography.fontWeight.semibold,
                color: designTokens.semantic.text.primary,
                margin: 0,
                marginBottom: designTokens.spacing[2],
              }}>
                Uploading...
              </h3>
              <p style={{
                fontSize: designTokens.typography.fontSize.sm,
                color: designTokens.semantic.text.secondary,
                margin: 0,
              }}>
                Please wait while we process your receipt
              </p>
            </div>
          </div>
        )

      case 'processing':
        return (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: designTokens.spacing[4],
            padding: designTokens.spacing[8],
            textAlign: 'center',
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: designTokens.borderRadius.full,
              backgroundColor: `${designTokens.semantic.interactive.primary}${designTokens.alpha[10]}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <Sparkles size={32} color={designTokens.semantic.interactive.primary} />
              </motion.div>
            </div>
            
            <div>
              <h3 style={{
                fontSize: designTokens.typography.fontSize.lg,
                fontWeight: designTokens.typography.fontWeight.semibold,
                color: designTokens.semantic.text.primary,
                margin: 0,
                marginBottom: designTokens.spacing[2],
              }}>
                Analyzing Receipt
              </h3>
              <p style={{
                fontSize: designTokens.typography.fontSize.sm,
                color: designTokens.semantic.text.secondary,
                margin: 0,
                marginBottom: designTokens.spacing[4],
              }}>
                Extracting items and prices...
              </p>
              
              {/* Progress bar */}
              <div style={{
                width: '200px',
                height: '4px',
                backgroundColor: `${designTokens.semantic.text.primary}${designTokens.alpha[10]}`,
                borderRadius: designTokens.borderRadius.sm,
                overflow: 'hidden',
              }}>
                <motion.div
                  style={{
                    height: '100%',
                    backgroundColor: designTokens.semantic.interactive.primary,
                    borderRadius: designTokens.borderRadius.sm,
                  }}
                  initial={{ width: '0%' }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          </div>
        )

      case 'success':
        return (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: designTokens.spacing[4],
            padding: designTokens.spacing[8],
            textAlign: 'center',
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: designTokens.borderRadius.full,
              backgroundColor: `${designTokens.semantic.success}${designTokens.alpha[10]}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <CheckCircle size={32} color={designTokens.semantic.success} />
            </div>
            
            <div>
              <h3 style={{
                fontSize: designTokens.typography.fontSize.lg,
                fontWeight: designTokens.typography.fontWeight.semibold,
                color: designTokens.semantic.text.primary,
                margin: 0,
                marginBottom: designTokens.spacing[2],
              }}>
                Receipt Processed!
              </h3>
              <p style={{
                fontSize: designTokens.typography.fontSize.sm,
                color: designTokens.semantic.text.secondary,
                margin: 0,
              }}>
                Your receipt has been successfully analyzed
              </p>
            </div>
          </div>
        )

      case 'error':
        return (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: designTokens.spacing[4],
            padding: designTokens.spacing[8],
            textAlign: 'center',
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: designTokens.borderRadius.full,
              backgroundColor: `${designTokens.semantic.error}${designTokens.alpha[10]}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <AlertCircle size={32} color={designTokens.semantic.error} />
            </div>
            
            <div>
              <h3 style={{
                fontSize: designTokens.typography.fontSize.lg,
                fontWeight: designTokens.typography.fontWeight.semibold,
                color: designTokens.semantic.text.primary,
                margin: 0,
                marginBottom: designTokens.spacing[2],
              }}>
                Processing Failed
              </h3>
              <p style={{
                fontSize: designTokens.typography.fontSize.sm,
                color: designTokens.semantic.text.secondary,
                margin: 0,
                marginBottom: designTokens.spacing[4],
              }}>
                {error?.message || 'Something went wrong while processing your receipt'}
              </p>
              
              {error?.canRetry && (
                <Button variant="secondary" onClick={onRetry}>
                  <RefreshCw size={16} style={{ marginRight: designTokens.spacing[2] }} />
                  Try Again
                </Button>
              )}
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div style={{ ...(className && { className }) }}>
      <Card
        variant="elevated"
        style={{
          border: isDragOver ? `2px dashed ${designTokens.semantic.interactive.primary}` : 'none',
          backgroundColor: isDragOver 
            ? `${designTokens.semantic.interactive.primary}${designTokens.alpha[5]}` 
            : undefined,
          transition: designTokens.transitions.fast,
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {renderContent()}
      </Card>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInput}
        style={{ display: 'none' }}
      />
    </div>
  )
}