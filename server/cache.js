/**
 * Deterministic Result Cache Module
 * Phase 3 Enhancement: Production-grade caching system
 *
 * Features:
 * - SHA-256 based cache keys for deterministic lookups
 * - TTL (Time To Live) expiration
 * - LRU (Least Recently Used) eviction
 * - Size limits with automatic cleanup
 * - Hit/miss rate tracking
 * - Cache statistics and monitoring
 */

import crypto from 'crypto';

// ═══════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════

const CACHE_CONFIG = {
  MAX_SIZE: parseInt(process.env.CACHE_MAX_SIZE, 10) || 100,        // Maximum cached items
  TTL_MS: parseInt(process.env.CACHE_TTL_MS, 10) || 3600000,       // 1 hour default
  CLEANUP_INTERVAL_MS: parseInt(process.env.CACHE_CLEANUP_MS, 10) || 300000, // 5 minutes
  ENABLED: process.env.CACHE_ENABLED !== 'false'                     // Enable by default
};

// ═══════════════════════════════════════════════════════════
// CACHE ENTRY STRUCTURE
// ═══════════════════════════════════════════════════════════

class CacheEntry {
  constructor(key, data) {
    this.key = key;
    this.data = data;
    this.createdAt = Date.now();
    this.lastAccessedAt = Date.now();
    this.accessCount = 0;
    this.size = JSON.stringify(data).length; // Approximate size in bytes
  }

  /**
   * Update access metadata
   */
  touch() {
    this.lastAccessedAt = Date.now();
    this.accessCount++;
  }

  /**
   * Check if entry has expired
   */
  isExpired(ttl = CACHE_CONFIG.TTL_MS) {
    return Date.now() - this.createdAt > ttl;
  }

  /**
   * Get age in milliseconds
   */
  getAge() {
    return Date.now() - this.createdAt;
  }

  /**
   * Get time since last access in milliseconds
   */
  getIdleTime() {
    return Date.now() - this.lastAccessedAt;
  }
}

// ═══════════════════════════════════════════════════════════
// CACHE MANAGER
// ═══════════════════════════════════════════════════════════

class CacheManager {
  constructor(config = CACHE_CONFIG) {
    this.config = config;
    this.cache = new Map(); // Key -> CacheEntry
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0,
      expirations: 0,
      clearCount: 0
    };

    // Start automatic cleanup if enabled
    if (this.config.ENABLED) {
      this.startCleanup();
    }

    console.log('[Cache] Initialized with config:', {
      maxSize: this.config.MAX_SIZE,
      ttlMs: this.config.TTL_MS,
      cleanupIntervalMs: this.config.CLEANUP_INTERVAL_MS,
      enabled: this.config.ENABLED
    });
  }

  /**
   * Generate deterministic cache key from inputs
   * @param {string} prompt - User prompt
   * @param {string} research - Research text
   * @param {Object} options - Additional options (temperature, etc.)
   * @returns {string} SHA-256 hash
   */
  generateKey(prompt, research, options = {}) {
    // Create deterministic key by combining all inputs
    const keyParts = [
      'v1', // Cache version (increment to invalidate all caches)
      prompt || '',
      research || '',
      JSON.stringify(options) // Include generation options
    ];

    const combined = keyParts.join('::');
    const hash = crypto.createHash('sha256').update(combined, 'utf8').digest('hex');

    return hash;
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {Object|null} Cached data or null if not found/expired
   */
  get(key) {
    if (!this.config.ENABLED) {
      return null;
    }

    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      console.log(`[Cache] MISS: ${key.substring(0, 16)}...`);
      return null;
    }

    // Check expiration
    if (entry.isExpired(this.config.TTL_MS)) {
      console.log(`[Cache] EXPIRED: ${key.substring(0, 16)}... (age: ${Math.round(entry.getAge() / 1000)}s)`);
      this.cache.delete(key);
      this.stats.expirations++;
      this.stats.misses++;
      return null;
    }

    // Update access metadata
    entry.touch();
    this.stats.hits++;

    console.log(`[Cache] HIT: ${key.substring(0, 16)}... (age: ${Math.round(entry.getAge() / 1000)}s, accessed: ${entry.accessCount} times)`);

    return entry.data;
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {Object} data - Data to cache
   * @returns {boolean} True if cached successfully
   */
  set(key, data) {
    if (!this.config.ENABLED) {
      return false;
    }

    // Check if we need to evict entries
    if (this.cache.size >= this.config.MAX_SIZE) {
      this.evictLRU();
    }

    const entry = new CacheEntry(key, data);
    this.cache.set(key, entry);
    this.stats.sets++;

    console.log(`[Cache] SET: ${key.substring(0, 16)}... (size: ${Math.round(entry.size / 1024)}KB, total entries: ${this.cache.size})`);

    return true;
  }

  /**
   * Evict least recently used entry
   * Uses LRU (Least Recently Used) algorithm
   */
  evictLRU() {
    let oldestEntry = null;
    let oldestKey = null;
    let oldestAccessTime = Infinity;

    // Find entry with oldest lastAccessedAt
    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessedAt < oldestAccessTime) {
        oldestAccessTime = entry.lastAccessedAt;
        oldestKey = key;
        oldestEntry = entry;
      }
    }

    if (oldestKey) {
      console.log(`[Cache] EVICT (LRU): ${oldestKey.substring(0, 16)}... (idle: ${Math.round(oldestEntry.getIdleTime() / 1000)}s, accessed: ${oldestEntry.accessCount} times)`);
      this.cache.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  /**
   * Remove expired entries
   * @returns {number} Number of entries removed
   */
  cleanupExpired() {
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.isExpired(this.config.TTL_MS)) {
        this.cache.delete(key);
        removed++;
        this.stats.expirations++;
      }
    }

    if (removed > 0) {
      console.log(`[Cache] CLEANUP: Removed ${removed} expired entries (${this.cache.size} remaining)`);
    }

    return removed;
  }

  /**
   * Start automatic cleanup interval
   */
  startCleanup() {
    if (this.cleanupInterval) {
      return; // Already running
    }

    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, this.config.CLEANUP_INTERVAL_MS);

    console.log(`[Cache] Cleanup interval started (every ${Math.round(this.config.CLEANUP_INTERVAL_MS / 1000)}s)`);
  }

  /**
   * Stop automatic cleanup interval
   */
  stopCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('[Cache] Cleanup interval stopped');
    }
  }

  /**
   * Clear all cache entries
   */
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    this.stats.clearCount++;
    console.log(`[Cache] CLEAR: Removed ${size} entries`);
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;

    // Calculate total size
    let totalSize = 0;
    let avgSize = 0;
    let oldestEntry = null;
    let newestEntry = null;

    for (const entry of this.cache.values()) {
      totalSize += entry.size;

      if (!oldestEntry || entry.createdAt < oldestEntry.createdAt) {
        oldestEntry = entry;
      }
      if (!newestEntry || entry.createdAt > newestEntry.createdAt) {
        newestEntry = entry;
      }
    }

    avgSize = this.cache.size > 0 ? totalSize / this.cache.size : 0;

    return {
      enabled: this.config.ENABLED,
      config: {
        maxSize: this.config.MAX_SIZE,
        ttlMs: this.config.TTL_MS,
        cleanupIntervalMs: this.config.CLEANUP_INTERVAL_MS
      },
      size: {
        current: this.cache.size,
        max: this.config.MAX_SIZE,
        utilizationPercent: (this.cache.size / this.config.MAX_SIZE * 100).toFixed(2)
      },
      memory: {
        totalBytes: totalSize,
        totalMB: (totalSize / (1024 * 1024)).toFixed(2),
        avgBytesPerEntry: Math.round(avgSize),
        avgKBPerEntry: (avgSize / 1024).toFixed(2)
      },
      requests: {
        total: totalRequests,
        hits: this.stats.hits,
        misses: this.stats.misses,
        hitRatePercent: hitRate.toFixed(2)
      },
      operations: {
        sets: this.stats.sets,
        evictions: this.stats.evictions,
        expirations: this.stats.expirations,
        clears: this.stats.clearCount
      },
      age: {
        oldestEntryAge: oldestEntry ? Math.round(oldestEntry.getAge() / 1000) : 0,
        newestEntryAge: newestEntry ? Math.round(newestEntry.getAge() / 1000) : 0,
        oldestEntryAgeMinutes: oldestEntry ? (oldestEntry.getAge() / 60000).toFixed(1) : 0
      }
    };
  }

  /**
   * Get detailed cache entries info (for debugging)
   * @param {number} limit - Maximum entries to return
   * @returns {Array} Array of entry info objects
   */
  getEntries(limit = 10) {
    const entries = [];

    let count = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (count >= limit) break;

      entries.push({
        key: key.substring(0, 16) + '...',
        ageSeconds: Math.round(entry.getAge() / 1000),
        idleSeconds: Math.round(entry.getIdleTime() / 1000),
        accessCount: entry.accessCount,
        sizeKB: (entry.size / 1024).toFixed(2),
        isExpired: entry.isExpired(this.config.TTL_MS)
      });

      count++;
    }

    return entries;
  }
}

// ═══════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════

let cacheInstance = null;

/**
 * Get or create cache instance
 * @returns {CacheManager} Singleton cache instance
 */
export function getCache() {
  if (!cacheInstance) {
    cacheInstance = new CacheManager();
  }
  return cacheInstance;
}

/**
 * Reset cache instance (for testing)
 */
export function resetCache() {
  if (cacheInstance) {
    cacheInstance.stopCleanup();
    cacheInstance.clear();
  }
  cacheInstance = null;
}

// Export for direct use
export { CacheManager };
export default getCache;
