/**
 * Predictive caching system based on usage patterns
 * Pre-processes common receipts and learns from user behavior
 */

interface UsagePattern {
  userId?: string
  receiptType: string
  venue: string
  timeOfDay: number
  dayOfWeek: number
  frequency: number
  lastUsed: number
  successRate: number
}

interface PredictiveCacheEntry {
  pattern: UsagePattern
  preprocessedResult: any
  confidence: number
  createdAt: number
  accessCount: number
}

interface CachePrediction {
  shouldPreprocess: boolean
  confidence: number
  estimatedUsage: number
  priority: 'high' | 'medium' | 'low'
}

class PredictiveCache {
  private patterns = new Map<string, UsagePattern>()
  private predictions = new Map<string, PredictiveCacheEntry>()
  private maxPatterns = 1000
  private maxPredictions = 100
  private learningRate = 0.1

  // Track usage pattern
  recordUsage(
    userId: string | undefined,
    receiptType: string,
    venue: string,
    success: boolean
  ): void {
    const now = Date.now()
    const timeOfDay = new Date().getHours()
    const dayOfWeek = new Date().getDay()
    
    const patternKey = `${userId || 'anonymous'}:${venue}:${timeOfDay}:${dayOfWeek}`
    
    const existingPattern = this.patterns.get(patternKey)
    if (existingPattern) {
      // Update existing pattern
      existingPattern.frequency += 1
      existingPattern.lastUsed = now
      existingPattern.successRate = this.updateSuccessRate(
        existingPattern.successRate,
        success,
        existingPattern.frequency
      )
    } else {
      // Create new pattern
      const newPattern: UsagePattern = {
        userId,
        receiptType,
        venue,
        timeOfDay,
        dayOfWeek,
        frequency: 1,
        lastUsed: now,
        successRate: success ? 1 : 0
      }
      
      this.patterns.set(patternKey, newPattern)
    }
    
    // Cleanup old patterns
    this.cleanupPatterns()
    
    console.log(`[predictive_cache] Recorded usage: ${patternKey} (freq: ${this.patterns.get(patternKey)?.frequency})`)
  }

  // Predict if we should preprocess a receipt
  predictPreprocessing(
    userId: string | undefined,
    venue: string,
    receiptType: string
  ): CachePrediction {
    const now = Date.now()
    const timeOfDay = new Date().getHours()
    const dayOfWeek = new Date().getDay()
    
    // Look for matching patterns
    const matchingPatterns = Array.from(this.patterns.values()).filter(pattern => {
      const userMatch = !userId || !pattern.userId || pattern.userId === userId
      const venueMatch = pattern.venue.toLowerCase().includes(venue.toLowerCase()) ||
                        venue.toLowerCase().includes(pattern.venue.toLowerCase())
      const timeMatch = Math.abs(pattern.timeOfDay - timeOfDay) <= 2 // Within 2 hours
      const dayMatch = pattern.dayOfWeek === dayOfWeek
      
      return userMatch && venueMatch && (timeMatch || dayMatch)
    })
    
    if (matchingPatterns.length === 0) {
      return {
        shouldPreprocess: false,
        confidence: 0,
        estimatedUsage: 0,
        priority: 'low'
      }
    }
    
    // Calculate prediction metrics
    const totalFrequency = matchingPatterns.reduce((sum, p) => sum + p.frequency, 0)
    const avgSuccessRate = matchingPatterns.reduce((sum, p) => sum + p.successRate, 0) / matchingPatterns.length
    const recentUsage = matchingPatterns.filter(p => now - p.lastUsed < 7 * 24 * 60 * 60 * 1000).length
    
    const confidence = Math.min(1, (totalFrequency / 10) * avgSuccessRate)
    const estimatedUsage = totalFrequency * (recentUsage / matchingPatterns.length)
    
    let priority: 'high' | 'medium' | 'low' = 'low'
    if (confidence > 0.7 && estimatedUsage > 5) priority = 'high'
    else if (confidence > 0.4 && estimatedUsage > 2) priority = 'medium'
    
    return {
      shouldPreprocess: confidence > 0.3,
      confidence,
      estimatedUsage,
      priority
    }
  }

  // Preprocess and cache a receipt
  async preprocessReceipt(
    userId: string | undefined,
    venue: string,
    receiptType: string,
    processor: () => Promise<any>
  ): Promise<void> {
    const prediction = this.predictPreprocessing(userId, venue, receiptType)
    
    if (!prediction.shouldPreprocess) {
      return
    }
    
    try {
      const result = await processor()
      const cacheKey = `${userId || 'anonymous'}:${venue}:${receiptType}`
      
      const entry: PredictiveCacheEntry = {
        pattern: {
          userId,
          receiptType,
          venue,
          timeOfDay: new Date().getHours(),
          dayOfWeek: new Date().getDay(),
          frequency: 1,
          lastUsed: Date.now(),
          successRate: 1
        },
        preprocessedResult: result,
        confidence: prediction.confidence,
        createdAt: Date.now(),
        accessCount: 0
      }
      
      this.predictions.set(cacheKey, entry)
      this.cleanupPredictions()
      
      console.log(`[predictive_cache] Preprocessed receipt for ${venue} (confidence: ${prediction.confidence})`)
      
    } catch (error) {
      console.warn('[predictive_cache] Preprocessing failed:', error)
    }
  }

  // Get preprocessed result
  getPreprocessedResult(
    userId: string | undefined,
    venue: string,
    receiptType: string
  ): any | null {
    const cacheKey = `${userId || 'anonymous'}:${venue}:${receiptType}`
    const entry = this.predictions.get(cacheKey)
    
    if (!entry) {
      return null
    }
    
    // Check if entry is still valid (within 1 hour)
    const now = Date.now()
    if (now - entry.createdAt > 60 * 60 * 1000) {
      this.predictions.delete(cacheKey)
      return null
    }
    
    // Update access count
    entry.accessCount += 1
    entry.pattern.lastUsed = now
    
    console.log(`[predictive_cache] Cache hit for ${venue} (access count: ${entry.accessCount})`)
    
    return entry.preprocessedResult
  }

  // Get learning insights
  getInsights(): {
    totalPatterns: number
    totalPredictions: number
    topVenues: Array<{ venue: string; frequency: number }>
    topTimes: Array<{ time: string; frequency: number }>
    successRate: number
  } {
    const patterns = Array.from(this.patterns.values())
    const predictions = Array.from(this.predictions.values())
    
    // Top venues
    const venueFreq = new Map<string, number>()
    patterns.forEach(p => {
      venueFreq.set(p.venue, (venueFreq.get(p.venue) || 0) + p.frequency)
    })
    const topVenues = Array.from(venueFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([venue, frequency]) => ({ venue, frequency }))
    
    // Top times
    const timeFreq = new Map<string, number>()
    patterns.forEach(p => {
      const timeKey = `${p.timeOfDay}:00`
      timeFreq.set(timeKey, (timeFreq.get(timeKey) || 0) + p.frequency)
    })
    const topTimes = Array.from(timeFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([time, frequency]) => ({ time, frequency }))
    
    // Overall success rate
    const totalSuccess = patterns.reduce((sum, p) => sum + (p.successRate * p.frequency), 0)
    const totalFrequency = patterns.reduce((sum, p) => sum + p.frequency, 0)
    const successRate = totalFrequency > 0 ? totalSuccess / totalFrequency : 0
    
    return {
      totalPatterns: patterns.length,
      totalPredictions: predictions.length,
      topVenues,
      topTimes,
      successRate
    }
  }

  private updateSuccessRate(currentRate: number, success: boolean, frequency: number): number {
    // Exponential moving average
    const alpha = this.learningRate / Math.sqrt(frequency)
    return currentRate * (1 - alpha) + (success ? 1 : 0) * alpha
  }

  private cleanupPatterns(): void {
    if (this.patterns.size <= this.maxPatterns) return
    
    const patterns = Array.from(this.patterns.entries())
      .sort((a, b) => b[1].lastUsed - a[1].lastUsed) // Sort by last used
    
    this.patterns.clear()
    patterns.slice(0, this.maxPatterns).forEach(([key, pattern]) => {
      this.patterns.set(key, pattern)
    })
  }

  private cleanupPredictions(): void {
    if (this.predictions.size <= this.maxPredictions) return
    
    const predictions = Array.from(this.predictions.entries())
      .sort((a, b) => b[1].accessCount - a[1].accessCount) // Sort by access count
    
    this.predictions.clear()
    predictions.slice(0, this.maxPredictions).forEach(([key, entry]) => {
      this.predictions.set(key, entry)
    })
  }
}

// Singleton instance
export const predictiveCache = new PredictiveCache()

// Helper function to extract venue from receipt
export function extractVenueFromReceipt(receiptData: any): string {
  if (receiptData.venue?.name) {
    return receiptData.venue.name.toLowerCase()
  }
  if (receiptData.place) {
    return receiptData.place.toLowerCase()
  }
  return 'unknown'
}

// Helper function to determine receipt type
export function determineReceiptType(receiptData: any): string {
  const venue = extractVenueFromReceipt(receiptData)
  const items = receiptData.items || []
  
  // Simple heuristics
  if (venue.includes('restaurant') || venue.includes('cafe') || venue.includes('diner')) {
    return 'restaurant'
  }
  if (venue.includes('grocery') || venue.includes('market') || venue.includes('store')) {
    return 'grocery'
  }
  if (venue.includes('gas') || venue.includes('fuel')) {
    return 'gas_station'
  }
  if (items.some((item: any) => item.label?.toLowerCase().includes('coffee'))) {
    return 'coffee_shop'
  }
  
  return 'general'
}
