import { Page } from '@playwright/test'

export interface FrameMetrics {
  timestamp: number
  duration: number
}

export interface PerformanceBudget {
  minFps: number
  maxSlowFrames: number
  maxFrameTime: number
  maxAverageFrameTime: number
}

export const PERFORMANCE_BUDGETS = {
  // 60fps budget for smooth interactions
  SMOOTH: {
    minFps: 60,
    maxSlowFrames: 0,
    maxFrameTime: 16.67, // 60fps = 16.67ms per frame
    maxAverageFrameTime: 16.67
  },
  
  // 30fps budget for acceptable performance
  ACCEPTABLE: {
    minFps: 30,
    maxSlowFrames: 2,
    maxFrameTime: 33.33, // 30fps = 33.33ms per frame
    maxAverageFrameTime: 25
  },
  
  // Critical budget for large datasets
  CRITICAL: {
    minFps: 20,
    maxSlowFrames: 5,
    maxFrameTime: 50, // 20fps = 50ms per frame
    maxAverageFrameTime: 40
  }
} as const

/**
 * Start frame rate monitoring
 */
export async function startFrameMonitoring(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as any).frameMetrics = {
      frames: [],
      startTime: performance.now(),
      monitoring: true
    }
    
    let lastTime = performance.now()
    
    function measureFrame() {
      if (!(window as any).frameMetrics?.monitoring) return
      
      const currentTime = performance.now()
      const frameTime = currentTime - lastTime
      
      (window as any).frameMetrics.frames.push({
        timestamp: currentTime,
        duration: frameTime
      })
      
      lastTime = currentTime
      requestAnimationFrame(measureFrame)
    }
    
    requestAnimationFrame(measureFrame)
  })
}

/**
 * Stop frame rate monitoring and get results
 */
export async function stopFrameMonitoring(page: Page): Promise<{
  fps: number
  slowFrames: number
  totalFrames: number
  averageFrameTime: number
  maxFrameTime: number
  frameMetrics: FrameMetrics[]
}> {
  const result = await page.evaluate(() => {
    const data = (window as any).frameMetrics
    if (!data || !data.frames.length) {
      return {
        fps: 0,
        slowFrames: 0,
        totalFrames: 0,
        averageFrameTime: 0,
        maxFrameTime: 0,
        frameMetrics: []
      }
    }
    
    // Stop monitoring
    data.monitoring = false
    
    const frames = data.frames
    const totalFrames = frames.length
    const frameTimes = frames.map(f => f.duration)
    const averageFrameTime = frameTimes.reduce((a, b) => a + b, 0) / totalFrames
    const maxFrameTime = frameTimes.length > 0 ? Math.max(...frameTimes) : 0
    const slowFrames = frameTimes.filter(t => t > 50).length
    const totalTime = performance.now() - data.startTime
    const fps = totalFrames / (totalTime / 1000)
    
    return {
      fps,
      slowFrames,
      totalFrames,
      averageFrameTime,
      maxFrameTime,
      frameMetrics: frames
    }
  })
  
  return result
}

/**
 * Measure performance during an action
 */
export async function measureActionPerformance(
  page: Page,
  action: () => Promise<void>,
  budget: PerformanceBudget = PERFORMANCE_BUDGETS.SMOOTH
): Promise<{
  metrics: Awaited<ReturnType<typeof stopFrameMonitoring>>
  passed: boolean
  violations: string[]
}> {
  // Start monitoring
  await startFrameMonitoring(page)
  
  // Wait for monitoring to stabilize
  await page.waitForTimeout(100)
  
  // Perform the action
  await action()
  
  // Wait for any animations to complete
  await page.waitForTimeout(500)
  
  // Stop monitoring and get results
  const metrics = await stopFrameMonitoring(page)
  
  // Check against budget
  const violations: string[] = []
  
  if (metrics.fps < budget.minFps) {
    violations.push(`FPS ${metrics.fps.toFixed(2)} below minimum ${budget.minFps}`)
  }
  
  if (metrics.slowFrames > budget.maxSlowFrames) {
    violations.push(`${metrics.slowFrames} slow frames exceed maximum ${budget.maxSlowFrames}`)
  }
  
  if (metrics.maxFrameTime > budget.maxFrameTime) {
    violations.push(`Max frame time ${metrics.maxFrameTime.toFixed(2)}ms exceeds ${budget.maxFrameTime}ms`)
  }
  
  if (metrics.averageFrameTime > budget.maxAverageFrameTime) {
    violations.push(`Average frame time ${metrics.averageFrameTime.toFixed(2)}ms exceeds ${budget.maxAverageFrameTime}ms`)
  }
  
  return {
    metrics,
    passed: violations.length === 0,
    violations
  }
}

/**
 * Assert performance meets budget requirements
 */
export function assertPerformanceBudget(
  metrics: Awaited<ReturnType<typeof stopFrameMonitoring>>,
  budget: PerformanceBudget,
  context: string = 'Performance test'
): void {
  const violations: string[] = []
  
  if (metrics.fps < budget.minFps) {
    violations.push(`FPS ${metrics.fps.toFixed(2)} below minimum ${budget.minFps}`)
  }
  
  if (metrics.slowFrames > budget.maxSlowFrames) {
    violations.push(`${metrics.slowFrames} slow frames exceed maximum ${budget.maxSlowFrames}`)
  }
  
  if (metrics.maxFrameTime > budget.maxFrameTime) {
    violations.push(`Max frame time ${metrics.maxFrameTime.toFixed(2)}ms exceeds ${budget.maxFrameTime}ms`)
  }
  
  if (metrics.averageFrameTime > budget.maxAverageFrameTime) {
    violations.push(`Average frame time ${metrics.averageFrameTime.toFixed(2)}ms exceeds ${budget.maxAverageFrameTime}ms`)
  }
  
  if (violations.length > 0) {
    throw new Error(`${context} failed:\n${violations.join('\n')}\n\nMetrics: ${JSON.stringify(metrics, null, 2)}`)
  }
}

/**
 * Get memory usage information
 */
export async function getMemoryUsage(page: Page): Promise<{
  usedJSHeapSize: number
  totalJSHeapSize: number
  jsHeapSizeLimit: number
}> {
  return await page.evaluate(() => {
    const memory = (performance as any).memory
    return {
      usedJSHeapSize: memory?.usedJSHeapSize || 0,
      totalJSHeapSize: memory?.totalJSHeapSize || 0,
      jsHeapSizeLimit: memory?.jsHeapSizeLimit || 0
    }
  })
}

/**
 * Measure bundle size from network requests
 */
export async function measureBundleSize(page: Page): Promise<{
  totalSize: number
  scriptSize: number
  styleSize: number
  scriptCount: number
  styleCount: number
  files: Array<{ url: string; size: number; type: string }>
}> {
  const requests: Array<{ url: string; size: number; type: string }> = []
  
  page.on('response', async (response) => {
    const url = response.url()
    const contentType = response.headers()['content-type'] || ''
    
    if (url.includes('localhost:5173') && (contentType.includes('javascript') || contentType.includes('css'))) {
      const contentLength = response.headers()['content-length']
      if (contentLength) {
        requests.push({
          url,
          size: parseInt(contentLength),
          type: contentType.includes('javascript') ? 'script' : 'stylesheet'
        })
      }
    }
  })
  
  // Wait for all requests to complete
  await page.waitForLoadState('networkidle')
  
  const scripts = requests.filter(r => r.type === 'script')
  const styles = requests.filter(r => r.type === 'stylesheet')
  
  return {
    totalSize: requests.reduce((sum, r) => sum + r.size, 0),
    scriptSize: scripts.reduce((sum, r) => sum + r.size, 0),
    styleSize: styles.reduce((sum, r) => sum + r.size, 0),
    scriptCount: scripts.length,
    styleCount: styles.length,
    files: requests
  }
}
