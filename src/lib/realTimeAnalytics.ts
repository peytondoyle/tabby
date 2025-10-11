/**
 * Real-time analytics and monitoring system
 * Tracks performance metrics, user behavior, and system health
 */

interface AnalyticsEvent {
  id: string
  timestamp: number
  type: string
  data: any
  userId?: string
  sessionId: string
  region?: string
}

interface PerformanceMetrics {
  scanTime: number
  cacheHit: boolean
  provider: string
  fileSize: number
  success: boolean
  errorType?: string
  region?: string
}

interface UserBehavior {
  userId?: string
  sessionId: string
  action: string
  timestamp: number
  metadata?: any
}

interface SystemHealth {
  timestamp: number
  activeUsers: number
  scanRate: number
  errorRate: number
  averageScanTime: number
  cacheHitRate: number
  region: string
}

class RealTimeAnalytics {
  private events: AnalyticsEvent[] = []
  private performanceMetrics: PerformanceMetrics[] = []
  private userBehaviors: UserBehavior[] = []
  private systemHealth: SystemHealth[] = []
  private maxEvents = 10000
  private maxMetrics = 5000
  private maxBehaviors = 5000
  private maxHealth = 1000

  // Track performance metrics
  trackPerformance(metrics: PerformanceMetrics): void {
    this.performanceMetrics.push({
      ...metrics,
      timestamp: Date.now()
    } as any)
    
    this.cleanupMetrics()
    
    // Send to analytics service
    this.sendToAnalytics('performance', metrics)
  }

  // Track user behavior
  trackUserBehavior(behavior: UserBehavior): void {
    this.userBehaviors.push(behavior)
    this.cleanupBehaviors()
    
    // Send to analytics service
    this.sendToAnalytics('behavior', behavior)
  }

  // Track system health
  updateSystemHealth(health: SystemHealth): void {
    this.systemHealth.push(health)
    this.cleanupHealth()
    
    // Send to analytics service
    this.sendToAnalytics('health', health)
  }

  // Get real-time dashboard data
  getDashboardData(): {
    performance: {
      averageScanTime: number
      successRate: number
      cacheHitRate: number
      errorRate: number
      topProviders: Array<{ provider: string; count: number }>
    }
    usage: {
      activeUsers: number
      scansPerMinute: number
      topRegions: Array<{ region: string; count: number }>
    }
    health: {
      status: 'healthy' | 'warning' | 'critical'
      lastUpdate: number
      metrics: SystemHealth
    }
  } {
    const now = Date.now()
    const last5Minutes = now - 5 * 60 * 1000
    const lastHour = now - 60 * 60 * 1000

    // Performance metrics
    const recentMetrics = this.performanceMetrics.filter(m => m.timestamp > last5Minutes)
    const averageScanTime = recentMetrics.length > 0 
      ? recentMetrics.reduce((sum, m) => sum + m.scanTime, 0) / recentMetrics.length 
      : 0
    
    const successRate = recentMetrics.length > 0
      ? recentMetrics.filter(m => m.success).length / recentMetrics.length
      : 0
    
    const cacheHitRate = recentMetrics.length > 0
      ? recentMetrics.filter(m => m.cacheHit).length / recentMetrics.length
      : 0
    
    const errorRate = recentMetrics.length > 0
      ? recentMetrics.filter(m => !m.success).length / recentMetrics.length
      : 0

    // Top providers
    const providerCounts = new Map<string, number>()
    recentMetrics.forEach(m => {
      providerCounts.set(m.provider, (providerCounts.get(m.provider) || 0) + 1)
    })
    const topProviders = Array.from(providerCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([provider, count]) => ({ provider, count }))

    // Usage metrics
    const recentBehaviors = this.userBehaviors.filter(b => b.timestamp > last5Minutes)
    const uniqueUsers = new Set(recentBehaviors.map(b => b.userId).filter(Boolean))
    const activeUsers = uniqueUsers.size
    
    const scansPerMinute = recentBehaviors.filter(b => b.action === 'scan_complete').length / 5

    // Top regions
    const regionCounts = new Map<string, number>()
    recentMetrics.forEach(m => {
      if (m.region) {
        regionCounts.set(m.region, (regionCounts.get(m.region) || 0) + 1)
      }
    })
    const topRegions = Array.from(regionCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([region, count]) => ({ region, count }))

    // System health
    const latestHealth = this.systemHealth[this.systemHealth.length - 1]
    let healthStatus: 'healthy' | 'warning' | 'critical' = 'healthy'
    
    if (latestHealth) {
      if (latestHealth.errorRate > 0.1 || latestHealth.averageScanTime > 5000) {
        healthStatus = 'critical'
      } else if (latestHealth.errorRate > 0.05 || latestHealth.averageScanTime > 3000) {
        healthStatus = 'warning'
      }
    }

    return {
      performance: {
        averageScanTime,
        successRate,
        cacheHitRate,
        errorRate,
        topProviders
      },
      usage: {
        activeUsers,
        scansPerMinute,
        topRegions
      },
      health: {
        status: healthStatus,
        lastUpdate: latestHealth?.timestamp || 0,
        metrics: latestHealth || {} as SystemHealth
      }
    }
  }

  // Get performance trends
  getPerformanceTrends(timeRange: '1h' | '24h' | '7d' = '1h'): {
    scanTime: Array<{ timestamp: number; value: number }>
    successRate: Array<{ timestamp: number; value: number }>
    cacheHitRate: Array<{ timestamp: number; value: number }>
  } {
    const now = Date.now()
    const timeRangeMs = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000
    }[timeRange]
    
    const startTime = now - timeRangeMs
    const interval = timeRangeMs / 20 // 20 data points
    
    const relevantMetrics = this.performanceMetrics.filter(m => m.timestamp > startTime)
    
    const scanTime: Array<{ timestamp: number; value: number }> = []
    const successRate: Array<{ timestamp: number; value: number }> = []
    const cacheHitRate: Array<{ timestamp: number; value: number }> = []
    
    for (let i = 0; i < 20; i++) {
      const intervalStart = startTime + i * interval
      const intervalEnd = intervalStart + interval
      
      const intervalMetrics = relevantMetrics.filter(m => 
        m.timestamp >= intervalStart && m.timestamp < intervalEnd
      )
      
      if (intervalMetrics.length > 0) {
        const avgScanTime = intervalMetrics.reduce((sum, m) => sum + m.scanTime, 0) / intervalMetrics.length
        const successRateValue = intervalMetrics.filter(m => m.success).length / intervalMetrics.length
        const cacheHitRateValue = intervalMetrics.filter(m => m.cacheHit).length / intervalMetrics.length
        
        scanTime.push({ timestamp: intervalStart, value: avgScanTime })
        successRate.push({ timestamp: intervalStart, value: successRateValue })
        cacheHitRate.push({ timestamp: intervalStart, value: cacheHitRateValue })
      }
    }
    
    return { scanTime, successRate, cacheHitRate }
  }

  // Get user insights
  getUserInsights(): {
    topActions: Array<{ action: string; count: number }>
    sessionDuration: number
    userRetention: number
    peakUsage: string
  } {
    const now = Date.now()
    const last24Hours = now - 24 * 60 * 60 * 1000
    
    const recentBehaviors = this.userBehaviors.filter(b => b.timestamp > last24Hours)
    
    // Top actions
    const actionCounts = new Map<string, number>()
    recentBehaviors.forEach(b => {
      actionCounts.set(b.action, (actionCounts.get(b.action) || 0) + 1)
    })
    const topActions = Array.from(actionCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([action, count]) => ({ action, count }))
    
    // Session duration (simplified)
    const sessions = new Map<string, { start: number; end: number }>()
    recentBehaviors.forEach(b => {
      const session = sessions.get(b.sessionId)
      if (!session) {
        sessions.set(b.sessionId, { start: b.timestamp, end: b.timestamp })
      } else {
        session.end = Math.max(session.end, b.timestamp)
      }
    })
    
    const sessionDurations = Array.from(sessions.values()).map(s => s.end - s.start)
    const avgSessionDuration = sessionDurations.length > 0
      ? sessionDurations.reduce((sum, d) => sum + d, 0) / sessionDurations.length
      : 0
    
    // Peak usage hour
    const hourCounts = new Map<number, number>()
    recentBehaviors.forEach(b => {
      const hour = new Date(b.timestamp).getHours()
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1)
    })
    const peakHour = Array.from(hourCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 0
    
    return {
      topActions,
      sessionDuration: avgSessionDuration,
      userRetention: 0.85, // Placeholder
      peakUsage: `${peakHour}:00`
    }
  }

  private sendToAnalytics(type: string, data: any): void {
    // Send to external analytics service (Google Analytics, Mixpanel, etc.)
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', `scan_${type}`, {
        event_category: 'performance',
        event_label: type,
        value: data.scanTime || 0,
        custom_map: data
      })
    }
  }

  private cleanupMetrics(): void {
    if (this.performanceMetrics.length <= this.maxMetrics) return
    
    this.performanceMetrics = this.performanceMetrics
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, this.maxMetrics)
  }

  private cleanupBehaviors(): void {
    if (this.userBehaviors.length <= this.maxBehaviors) return
    
    this.userBehaviors = this.userBehaviors
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, this.maxBehaviors)
  }

  private cleanupHealth(): void {
    if (this.systemHealth.length <= this.maxHealth) return
    
    this.systemHealth = this.systemHealth
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, this.maxHealth)
  }
}

// Singleton instance
export const realTimeAnalytics = new RealTimeAnalytics()

// Helper functions
export function trackScanPerformance(metrics: PerformanceMetrics): void {
  realTimeAnalytics.trackPerformance(metrics)
}

export function trackUserAction(action: string, userId?: string, metadata?: any): void {
  realTimeAnalytics.trackUserBehavior({
    userId,
    sessionId: getSessionId(),
    action,
    timestamp: Date.now(),
    metadata
  })
}

export function updateSystemHealth(health: SystemHealth): void {
  realTimeAnalytics.updateSystemHealth(health)
}

// Get or create session ID
function getSessionId(): string {
  if (typeof window === 'undefined') return 'server'
  
  let sessionId = sessionStorage.getItem('tabby_session_id')
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    sessionStorage.setItem('tabby_session_id', sessionId)
  }
  return sessionId
}
