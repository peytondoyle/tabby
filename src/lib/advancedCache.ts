/**
 * Advanced caching system with persistence and smart invalidation
 * Uses IndexedDB for client-side persistence and memory for fast access
 */

interface CacheEntry {
  result: any
  timestamp: number
  imageHash: string
  fileSize: number
  fileType: string
  processingTime: number
  provider: string
  confidence?: number
  accessCount: number
  lastAccessed: number
}

interface CacheStats {
  size: number
  hitRate: number
  totalHits: number
  totalMisses: number
  averageProcessingTime: number
  providers: Record<string, number>
}

class AdvancedCache {
  private memoryCache = new Map<string, CacheEntry>()
  private dbName = 'tabby-receipt-cache'
  private dbVersion = 1
  private db: IDBDatabase | null = null
  private maxMemorySize = 100 // Maximum entries in memory
  private maxTotalSize = 1000 // Maximum entries in IndexedDB
  private ttl = 7 * 24 * 60 * 60 * 1000 // 7 days
  private stats = {
    hits: 0,
    misses: 0,
    totalProcessingTime: 0,
    providerCounts: {} as Record<string, number>
  }

  async initialize(): Promise<void> {
    if (typeof window === 'undefined') return

    try {
      this.db = await this.openDatabase()
      await this.loadFromIndexedDB()
      console.log('[advanced_cache] Initialized with', this.memoryCache.size, 'entries')
    } catch (error) {
      console.warn('[advanced_cache] Failed to initialize:', error)
    }
  }

  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains('cache')) {
          const store = db.createObjectStore('cache', { keyPath: 'imageHash' })
          store.createIndex('timestamp', 'timestamp', { unique: false })
          store.createIndex('lastAccessed', 'lastAccessed', { unique: false })
        }
      }
    })
  }

  private async loadFromIndexedDB(): Promise<void> {
    if (!this.db) return

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readonly')
      const store = transaction.objectStore('cache')
      const request = store.getAll()

      request.onsuccess = () => {
        const entries = request.result as CacheEntry[]
        const now = Date.now()
        
        // Load recent entries into memory
        const recentEntries = entries
          .filter(entry => now - entry.timestamp < this.ttl)
          .sort((a, b) => b.lastAccessed - a.lastAccessed)
          .slice(0, this.maxMemorySize)

        recentEntries.forEach(entry => {
          this.memoryCache.set(entry.imageHash, entry)
        })

        console.log(`[advanced_cache] Loaded ${recentEntries.length} entries from IndexedDB`)
        resolve()
      }

      request.onerror = () => reject(request.error)
    })
  }

  private generateImageHash(file: File): string {
    // More sophisticated hashing based on file properties
    const hashInput = `${file.size}-${file.name}-${file.lastModified}-${file.type}`
    return btoa(hashInput).replace(/[^a-zA-Z0-9]/g, '').substring(0, 20)
  }

  private async saveToIndexedDB(entry: CacheEntry): Promise<void> {
    if (!this.db) return

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readwrite')
      const store = transaction.objectStore('cache')
      const request = store.put(entry)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  private async cleanupIndexedDB(): Promise<void> {
    if (!this.db) return

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readwrite')
      const store = transaction.objectStore('cache')
      const index = store.index('timestamp')
      const request = index.getAll()

      request.onsuccess = () => {
        const entries = request.result as CacheEntry[]
        const now = Date.now()
        const expiredEntries = entries.filter(entry => now - entry.timestamp > this.ttl)
        
        if (expiredEntries.length > 0) {
          const deleteTransaction = this.db!.transaction(['cache'], 'readwrite')
          const deleteStore = deleteTransaction.objectStore('cache')
          
          expiredEntries.forEach(entry => {
            deleteStore.delete(entry.imageHash)
          })
          
          console.log(`[advanced_cache] Cleaned up ${expiredEntries.length} expired entries`)
        }
        resolve()
      }

      request.onerror = () => reject(request.error)
    })
  }

  async get(file: File): Promise<any | null> {
    const hash = this.generateImageHash(file)
    
    // Check memory cache first
    let entry = this.memoryCache.get(hash)
    
    if (!entry && this.db) {
      // Check IndexedDB
      try {
        entry = await new Promise<CacheEntry | null>((resolve, reject) => {
          const transaction = this.db!.transaction(['cache'], 'readonly')
          const store = transaction.objectStore('cache')
          const request = store.get(hash)

          request.onsuccess = () => resolve(request.result || null)
          request.onerror = () => reject(request.error)
        })

        if (entry) {
          // Move to memory cache
          this.memoryCache.set(hash, entry)
        }
      } catch (error) {
        console.warn('[advanced_cache] Failed to read from IndexedDB:', error)
      }
    }

    if (!entry) {
      this.stats.misses++
      return null
    }

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.memoryCache.delete(hash)
      this.stats.misses++
      return null
    }

    // Check file size similarity (within 15% tolerance)
    const sizeTolerance = 0.15
    const sizeDiff = Math.abs(entry.fileSize - file.size) / file.size
    if (sizeDiff > sizeTolerance) {
      this.stats.misses++
      return null
    }

    // Update access statistics
    entry.accessCount++
    entry.lastAccessed = Date.now()
    this.stats.hits++
    this.stats.providerCounts[entry.provider] = (this.stats.providerCounts[entry.provider] || 0) + 1

    console.log(`[advanced_cache] Cache hit for ${file.name} (${file.size} bytes) - provider: ${entry.provider}, confidence: ${entry.confidence}`)
    return entry.result
  }

  async set(file: File, result: any, processingTime: number, provider: string, confidence?: number): Promise<void> {
    const hash = this.generateImageHash(file)
    const now = Date.now()

    const entry: CacheEntry = {
      result,
      timestamp: now,
      imageHash: hash,
      fileSize: file.size,
      fileType: file.type,
      processingTime,
      provider,
      confidence,
      accessCount: 0,
      lastAccessed: now
    }

    // Add to memory cache
    this.memoryCache.set(hash, entry)

    // Save to IndexedDB
    if (this.db) {
      try {
        await this.saveToIndexedDB(entry)
      } catch (error) {
        console.warn('[advanced_cache] Failed to save to IndexedDB:', error)
      }
    }

    // Update statistics
    this.stats.totalProcessingTime += processingTime

    // Cleanup if needed
    if (this.memoryCache.size > this.maxMemorySize) {
      const entries = Array.from(this.memoryCache.entries())
        .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed)
      
      // Remove oldest entries
      const toRemove = entries.slice(0, this.memoryCache.size - this.maxMemorySize)
      toRemove.forEach(([key]) => this.memoryCache.delete(key))
    }

    console.log(`[advanced_cache] Cached result for ${file.name} (${file.size} bytes) - provider: ${provider}, time: ${processingTime}ms`)
  }

  async clear(): Promise<void> {
    this.memoryCache.clear()
    
    if (this.db) {
      try {
        const transaction = this.db.transaction(['cache'], 'readwrite')
        const store = transaction.objectStore('cache')
        await new Promise<void>((resolve, reject) => {
          const request = store.clear()
          request.onsuccess = () => resolve()
          request.onerror = () => reject(request.error)
        })
      } catch (error) {
        console.warn('[advanced_cache] Failed to clear IndexedDB:', error)
      }
    }

    this.stats = {
      hits: 0,
      misses: 0,
      totalProcessingTime: 0,
      providerCounts: {}
    }

    console.log('[advanced_cache] Cache cleared')
  }

  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0
    const averageProcessingTime = this.stats.hits > 0 ? this.stats.totalProcessingTime / this.stats.hits : 0

    return {
      size: this.memoryCache.size,
      hitRate,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      averageProcessingTime,
      providers: { ...this.stats.providerCounts }
    }
  }

  async cleanup(): Promise<void> {
    await this.cleanupIndexedDB()
  }
}

// Singleton instance
export const advancedCache = new AdvancedCache()

// Initialize cache on module load
if (typeof window !== 'undefined') {
  advancedCache.initialize().catch(console.error)
}

// Helper function to check if we should use cache
export function shouldUseAdvancedCache(file: File): boolean {
  // Don't use cache for very small files (likely test images)
  if (file.size < 5 * 1024) { // 5KB
    return false
  }

  // Don't use cache for very large files (likely high-res photos)
  if (file.size > 20 * 1024 * 1024) { // 20MB
    return false
  }

  return true
}
