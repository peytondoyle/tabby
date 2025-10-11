/**
 * Simple in-memory cache for receipt scanning results
 * Helps reduce API calls for similar receipts
 */

interface CacheEntry {
  result: any
  timestamp: number
  imageHash: string
  fileSize: number
}

class ReceiptCache {
  private cache = new Map<string, CacheEntry>()
  private maxSize = 50 // Maximum number of cached entries
  private ttl = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

  /**
   * Generate a simple hash for image comparison
   * This is a basic implementation - in production, you'd want a more sophisticated image hashing
   */
  private generateImageHash(file: File): string {
    // Simple hash based on file size, name, and last modified
    const hashInput = `${file.size}-${file.name}-${file.lastModified}`
    return btoa(hashInput).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16)
  }

  /**
   * Get cached result for a file
   */
  get(file: File): any | null {
    const hash = this.generateImageHash(file)
    const entry = this.cache.get(hash)

    if (!entry) {
      return null
    }

    // Check if entry is expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(hash)
      return null
    }

    // Check if file size is similar (within 10% tolerance)
    const sizeTolerance = 0.1
    const sizeDiff = Math.abs(entry.fileSize - file.size) / file.size
    if (sizeDiff > sizeTolerance) {
      return null
    }

    console.log(`[cache] Cache hit for ${file.name} (${file.size} bytes)`)
    return entry.result
  }

  /**
   * Store result in cache
   */
  set(file: File, result: any): void {
    const hash = this.generateImageHash(file)
    
    // Clean up expired entries
    this.cleanup()
    
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value
      this.cache.delete(oldestKey)
    }

    this.cache.set(hash, {
      result,
      timestamp: Date.now(),
      imageHash: hash,
      fileSize: file.size
    })

    console.log(`[cache] Cached result for ${file.name} (${file.size} bytes)`)
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear()
    console.log('[cache] Cache cleared')
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxSize: number; ttl: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttl: this.ttl
    }
  }
}

// Singleton instance
export const receiptCache = new ReceiptCache()

// Helper function to check if we should use cache
export function shouldUseCache(file: File): boolean {
  // Don't use cache for very small files (likely test images)
  if (file.size < 10 * 1024) { // 10KB
    return false
  }

  // Don't use cache for very large files (likely high-res photos)
  if (file.size > 10 * 1024 * 1024) { // 10MB
    return false
  }

  return true
}
