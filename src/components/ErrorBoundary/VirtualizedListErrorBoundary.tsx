import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { deviceDetector } from '@/lib/deviceCapabilities'

interface VirtualizedListErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  listType?: 'item-list' | 'person-items' | 'dnd-container'
  className?: string
}

interface State {
  hasError: boolean
  error: Error | null
  retryCount: number
}

class VirtualizedListErrorBoundary extends React.Component<
  VirtualizedListErrorBoundaryProps,
  State
> {
  private retryTimeoutId: NodeJS.Timeout | null = null

  constructor(props: VirtualizedListErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null, retryCount: 0 }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { onError, listType } = this.props
    const errorMessage = error.message || 'Unknown virtualization error'
    const firstLine = errorMessage.split('\n')[0]

    // Log error details
    console.error(`[virtualized_list_error] ${listType || 'unknown'} list error:`, error)
    console.error(`[virtualized_list_error] Error info:`, errorInfo)

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo)
    }

    // Send error to analytics/logging service
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'virtualized_list_error', {
        list_type: listType || 'unknown',
        error_message: firstLine,
        retry_count: this.state.retryCount,
        device_capabilities: deviceDetector.detect()
      })
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId)
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  handleRetry = () => {
    const { retryCount } = this.state
    const maxRetries = 3

    if (retryCount < maxRetries) {
      // Exponential backoff for retries
      const delay = Math.pow(2, retryCount) * 1000
      
      this.retryTimeoutId = setTimeout(() => {
        this.setState(prevState => ({
          hasError: false,
          error: null,
          retryCount: prevState.retryCount + 1
        }))
      }, delay)
    } else {
      // After max retries, fall back to non-virtualized rendering
      this.handleFallback()
    }
  }

  handleFallback = () => {
    // This would trigger a fallback to non-virtualized rendering
    // For now, we'll just reset the error state
    this.setState({ hasError: false, error: null, retryCount: 0 })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const { fallback: Fallback, listType, className } = this.props
      const { error, retryCount } = this.state
      const device = deviceDetector.detect()

      if (Fallback) {
        return <Fallback error={error} resetError={this.handleReset} />
      }

      return (
        <div className={`virtualized-list-error-boundary ${className || ''}`}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-surface border border-danger/20 rounded-lg p-4 m-2"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-danger/10 rounded-full flex items-center justify-center">
                  <span className="text-danger text-sm">⚠️</span>
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-danger mb-1">
                  List Rendering Error
                </h3>
                <p className="text-xs text-text-secondary mb-3">
                  The {listType || 'virtualized'} list encountered an error. 
                  {retryCount > 0 && ` (Retry ${retryCount}/3)`}
                </p>

                <div className="flex items-center gap-2">
                  {retryCount < 3 ? (
                    <button
                      onClick={this.handleRetry}
                      className="text-xs bg-danger text-white px-3 py-1 rounded hover:bg-danger/80 transition-colors"
                    >
                      Retry
                    </button>
                  ) : (
                    <button
                      onClick={this.handleFallback}
                      className="text-xs bg-warning text-white px-3 py-1 rounded hover:bg-warning/80 transition-colors"
                    >
                      Use Simple List
                    </button>
                  )}
                  
                  <button
                    onClick={this.handleReset}
                    className="text-xs text-text-secondary hover:text-text-primary underline-offset-2 hover:underline"
                  >
                    Dismiss
                  </button>
                </div>

                {/* Device info for debugging */}
                {import.meta.env.DEV && (
                  <details className="mt-3">
                    <summary className="text-xs text-text-tertiary cursor-pointer">
                      Device Info (Dev)
                    </summary>
                    <div className="text-xs text-text-tertiary mt-1 font-mono">
                      <div>Processing Power: {device.processingPower}</div>
                      <div>Cores: {device.cores}</div>
                      <div>Memory: {Math.round(device.memory / 1024 / 1024 / 1024)}GB</div>
                      <div>Mobile: {device.isMobile ? 'Yes' : 'No'}</div>
                    </div>
                  </details>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )
    }

    return this.props.children
  }
}

export default VirtualizedListErrorBoundary
