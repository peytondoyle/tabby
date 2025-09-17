import React, { Profiler, type ProfilerOnRenderCallback } from 'react'

/**
 * Performance monitoring utilities for profiling large item lists
 */

export interface PerformanceMetrics {
  renderTime: number
  componentName: string
  timestamp: number
  phase: 'mount' | 'update'
  actualDuration: number
  baseDuration: number
  startTime: number
  commitTime: number
}

export interface PerformanceMarker {
  name: string
  startTime: number
  endTime?: number
  duration?: number
  metadata?: Record<string, any>
}

class PerformanceMonitor {
  private markers: Map<string, PerformanceMarker> = new Map()
  private metrics: PerformanceMetrics[] = []
  private isEnabled: boolean = false

  constructor() {
    this.isEnabled = import.meta.env.MODE === 'profile' || import.meta.env.DEV || import.meta.env.PROFILE_MODE
  }

  /**
   * Start a performance marker
   */
  startMarker(name: string, metadata?: Record<string, any>): void {
    if (!this.isEnabled) return

    const marker: PerformanceMarker = {
      name,
      startTime: performance.now(),
      metadata
    }
    
    this.markers.set(name, marker)
    
    // Also use the Performance API if available
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(`${name}-start`)
    }
  }

  /**
   * End a performance marker
   */
  endMarker(name: string): PerformanceMarker | null {
    if (!this.isEnabled) return null

    const marker = this.markers.get(name)
    if (!marker) {
      console.warn(`Performance marker "${name}" not found`)
      return null
    }

    const endTime = performance.now()
    const duration = endTime - marker.startTime

    marker.endTime = endTime
    marker.duration = duration

    // Also use the Performance API if available
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(`${name}-end`)
      performance.measure(name, `${name}-start`, `${name}-end`)
    }

    console.log(`⏱️  Performance marker "${name}": ${duration.toFixed(2)}ms`, marker.metadata)
    return marker
  }

  /**
   * Record React Profiler metrics
   */
  recordMetrics(metrics: PerformanceMetrics): void {
    if (!this.isEnabled) return

    this.metrics.push(metrics)
    
    // Log significant render times
    if (metrics.actualDuration > 16) { // More than one frame at 60fps
      console.warn(`🐌 Slow render detected: ${metrics.componentName} took ${metrics.actualDuration.toFixed(2)}ms`)
    }
  }

  /**
   * Get all performance metrics
   */
  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics]
  }

  /**
   * Get all markers
   */
  getMarkers(): PerformanceMarker[] {
    return Array.from(this.markers.values())
  }

  /**
   * Clear all performance data
   */
  clear(): void {
    this.markers.clear()
    this.metrics = []
  }

  /**
   * Generate a performance report
   */
  generateReport(): string {
    const totalRenders = this.metrics.length
    const slowRenders = this.metrics.filter(m => m.actualDuration > 16).length
    const averageRenderTime = this.metrics.reduce((sum, m) => sum + m.actualDuration, 0) / totalRenders || 0
    const maxRenderTime = Math.max(...this.metrics.map(m => m.actualDuration), 0)

    const markers = this.getMarkers()
    const totalMarkerTime = markers.reduce((sum, m) => sum + (m.duration || 0), 0)

    return `
📊 Performance Report
====================
Total Renders: ${totalRenders}
Slow Renders (>16ms): ${slowRenders}
Average Render Time: ${averageRenderTime.toFixed(2)}ms
Max Render Time: ${maxRenderTime.toFixed(2)}ms
Total Marker Time: ${totalMarkerTime.toFixed(2)}ms

Markers:
${markers.map(m => `  ${m.name}: ${m.duration?.toFixed(2)}ms`).join('\n')}

Slowest Components:
${this.metrics
  .sort((a, b) => b.actualDuration - a.actualDuration)
  .slice(0, 5)
  .map(m => `  ${m.componentName}: ${m.actualDuration.toFixed(2)}ms`)
  .join('\n')}
    `.trim()
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor()

/**
 * React Profiler wrapper component
 */
export interface ProfilerWrapperProps {
  id: string
  children: React.ReactNode
  onRender?: ProfilerOnRenderCallback
  enabled?: boolean
}

export function ProfilerWrapper({ 
  id, 
  children, 
  onRender,
  enabled = true 
}: ProfilerWrapperProps) {
  const isProfilingEnabled = enabled && (import.meta.env.MODE === 'profile' || import.meta.env.DEV)

  const handleRender: ProfilerOnRenderCallback = (id, phase, actualDuration, baseDuration, startTime, commitTime) => {
    const metrics: PerformanceMetrics = {
      renderTime: actualDuration,
      componentName: id,
      timestamp: Date.now(),
      phase: phase as 'mount' | 'update',
      actualDuration,
      baseDuration,
      startTime,
      commitTime
    }

    performanceMonitor.recordMetrics(metrics)
    onRender?.(id, phase, actualDuration, baseDuration, startTime, commitTime)
  }

  if (!isProfilingEnabled) {
    return <>{children}</>
  }

  return (
    <Profiler id={id} onRender={handleRender}>
      {children}
    </Profiler>
  )
}

/**
 * Hook for performance monitoring
 */
export function usePerformanceMonitor() {
  return {
    startMarker: performanceMonitor.startMarker.bind(performanceMonitor),
    endMarker: performanceMonitor.endMarker.bind(performanceMonitor),
    getMetrics: performanceMonitor.getMetrics.bind(performanceMonitor),
    getMarkers: performanceMonitor.getMarkers.bind(performanceMonitor),
    clear: performanceMonitor.clear.bind(performanceMonitor),
    generateReport: performanceMonitor.generateReport.bind(performanceMonitor)
  }
}

/**
 * Performance measurement decorator for functions
 */
export function measurePerformance<T extends (...args: any[]) => any>(
  fn: T,
  name: string
): T {
  return ((...args: Parameters<T>) => {
    performanceMonitor.startMarker(name)
    const result = fn(...args)
    
    // Handle both sync and async functions
    if (result instanceof Promise) {
      return result.finally(() => {
        performanceMonitor.endMarker(name)
      })
    } else {
      performanceMonitor.endMarker(name)
      return result
    }
  }) as T
}

/**
 * Auto-open React DevTools Profiler in profile mode
 */
export function autoOpenProfiler() {
  if ((import.meta.env.MODE === 'profile' || import.meta.env.PROFILE_MODE) && typeof window !== 'undefined') {
    // Try to open React DevTools Profiler
    const openProfiler = () => {
      // This is a best-effort attempt to open the profiler
      // The actual implementation depends on the browser and React DevTools
      console.log('🔍 Profile mode enabled - Open React DevTools and go to the Profiler tab')
      console.log('📊 Performance markers will be logged to the console')
    }

    // Try to open after a short delay to ensure React is loaded
    setTimeout(openProfiler, 1000)
  }
}
