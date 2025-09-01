import React, { useState, useEffect } from 'react'
import { apiFetch } from '@/lib/apiClient'

interface ApiError {
  timestamp: string
  endpoint: string
  status: number
  message: string
}

type HealthStatus = 'checking' | 'healthy' | 'error'

export const DevBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true)
  const [isDismissed, setIsDismissed] = useState(() => {
    return localStorage.getItem('dev-banner-dismissed') === 'true'
  })
  const [healthStatus, setHealthStatus] = useState<HealthStatus>('checking')
  const [lastErrors, setLastErrors] = useState<ApiError[]>([])
  const [lastCheck, setLastCheck] = useState<Date | null>(null)

  // Show banner if not dismissed OR if there are errors
  const shouldShow = isVisible && (!isDismissed || healthStatus === 'error')

  // Don't render in production or if disabled
  if (import.meta.env.PROD || import.meta.env.VITE_SHOW_DEV_BANNER !== '1') {
    return null
  }

  const checkApiHealth = async () => {
    try {
      setHealthStatus('checking')
      const response = await apiFetch('/api/scan-receipt?health=1')
      
      // apiFetch returns the raw response data, so check if it has the expected structure
      if (response && typeof response === 'object' && 'ok' in response && response.ok) {
        setHealthStatus('healthy')
        setLastCheck(new Date())
      } else {
        setHealthStatus('error')
        const error: ApiError = {
          timestamp: new Date().toISOString(),
          endpoint: '/api/scan-receipt?health=1',
          status: 0,
          message: 'Health check failed - invalid response format'
        }
        setLastErrors(prev => [error, ...prev.slice(0, 2)]) // Keep last 3
        
        // Auto-show banner on errors
        setIsDismissed(false)
        localStorage.removeItem('dev-banner-dismissed')
      }
    } catch (error) {
      setHealthStatus('error')
      const apiError: ApiError = {
        timestamp: new Date().toISOString(),
        endpoint: '/api/scan-receipt?health=1',
        status: 0,
        message: error instanceof Error ? error.message : 'Network error'
      }
      setLastErrors(prev => [apiError, ...prev.slice(0, 2)])
      
      // Auto-show banner on errors
      setIsDismissed(false)
      localStorage.removeItem('dev-banner-dismissed')
    }
  }

  const handleDismiss = () => {
    if (healthStatus !== 'error') {
      setIsDismissed(true)
      localStorage.setItem('dev-banner-dismissed', 'true')
    }
  }

  // Check health on mount and periodically
  useEffect(() => {
    checkApiHealth()
    const interval = setInterval(checkApiHealth, 10000) // Every 10 seconds
    return () => clearInterval(interval)
  }, [])

  // Listen for API errors from other parts of the app
  useEffect(() => {
    const handleApiError = (event: CustomEvent<ApiError>) => {
      const error = event.detail
      setLastErrors(prev => [error, ...prev.slice(0, 2)])
      setHealthStatus('error')
      setIsDismissed(false)
      localStorage.removeItem('dev-banner-dismissed')
    }

    window.addEventListener('api-error', handleApiError as EventListener)
    return () => window.removeEventListener('api-error', handleApiError as EventListener)
  }, [])

  if (!shouldShow) return null

  const getHealthColor = () => {
    switch (healthStatus) {
      case 'healthy': return 'bg-green-100 border-green-300 text-green-800'
      case 'error': return 'bg-red-100 border-red-300 text-red-800'
      case 'checking': return 'bg-yellow-100 border-yellow-300 text-yellow-800'
      default: return 'bg-gray-100 border-gray-300 text-gray-800'
    }
  }

  const getHealthIcon = () => {
    switch (healthStatus) {
      case 'healthy': return '✅'
      case 'error': return '❌'
      case 'checking': return '🔄'
      default: return '⚪'
    }
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 border-b-2 px-4 py-2 ${getHealthColor()}`}>
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {getHealthIcon()} API Health
            </span>
            <span className="text-xs opacity-75">
              {lastCheck && `Last: ${formatTimestamp(lastCheck.toISOString())}`}
            </span>
          </div>
          
          {healthStatus === 'error' && lastErrors.length > 0 && (
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium mb-1">Recent Errors:</div>
              <div className="space-y-1 max-h-16 overflow-y-auto">
                {lastErrors.map((error, idx) => (
                  <div key={idx} className="text-xs font-mono truncate">
                    [{formatTimestamp(error.timestamp)}] {error.endpoint}: {error.status} {error.message}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={checkApiHealth}
            disabled={healthStatus === 'checking'}
            className="text-xs px-2 py-1 rounded bg-white/50 hover:bg-white/75 transition-colors disabled:opacity-50"
          >
            {healthStatus === 'checking' ? 'Checking...' : 'Refresh'}
          </button>
          
          {healthStatus !== 'error' && (
            <button
              onClick={handleDismiss}
              className="text-xs px-2 py-1 rounded bg-white/50 hover:bg-white/75 transition-colors"
            >
              Dismiss
            </button>
          )}
          
          <button
            onClick={() => setIsVisible(false)}
            className="text-xs px-2 py-1 rounded bg-white/50 hover:bg-white/75 transition-colors"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  )
}