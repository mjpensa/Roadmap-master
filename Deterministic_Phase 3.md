## 🎯 **PHASE 3: CACHING SYSTEM IMPLEMENTATION (P2)**

Let me search for the current Gemini client implementation to understand the existing structure.## 🎯 **PHASE 3: CACHING SYSTEM IMPLEMENTATION (P2)**

### **Overview**
This phase implements a production-grade caching system with SHA-256 key generation, TTL expiration, LRU eviction, and comprehensive monitoring. The cache will store deterministic chart generation results to improve performance and reduce API costs.

---

### **Step 1: Create Cache Module (server/cache.js)**

**File**: `server/cache.js` (NEW FILE)  
**Purpose**: Production-grade caching with TTL, LRU eviction, and monitoring

#### **COMPLETE FILE**:

```javascript
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
```

---

### **Step 2: Integrate Caching into Chart Generation (server/routes/charts.js)**

**File**: `server/routes/charts.js`  
**Lines**: ~38-160 (modify `processChartGeneration` function)  
**Purpose**: Add cache lookup before generation and cache storage after

#### **ADD AT TOP OF FILE**:

```javascript
// Add after existing imports (around line 15)
import { getCache } from '../cache.js';
```

#### **MODIFY `processChartGeneration` FUNCTION**:

```javascript
// File: server/routes/charts.js
// Lines: ~38-160
// Purpose: Add caching to chart generation

async function processChartGeneration(jobId, reqBody, files) {
  try {
    // Update job status to processing
    updateJob(jobId, {
      status: 'processing',
      progress: 'Analyzing your request...'
    });

    const userPrompt = reqBody.prompt;
    const sanitizedPrompt = sanitizePrompt(userPrompt);

    // Create request-scoped storage
    let researchTextCache = "";
    let researchFilesCache = [];

    // Update progress
    updateJob(jobId, {
      status: 'processing',
      progress: `Processing ${files?.length || 0} uploaded file(s)...`
    });

    // Extract text from uploaded files (Sort for determinism, process in parallel)
    if (files && files.length > 0) {
      const sortedFiles = files.sort((a, b) => a.originalname.localeCompare(b.originalname));

      const fileProcessingPromises = sortedFiles.map(async (file) => {
        let content = '';

        if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          const result = await mammoth.convertToHtml({ buffer: file.buffer });
          content = result.value;
        } else {
          content = file.buffer.toString('utf8');
        }

        return {
          name: file.originalname,
          content: content
        };
      });

      const processedFiles = await Promise.all(fileProcessingPromises);

      for (const processedFile of processedFiles) {
        researchTextCache += `\n\n--- Start of file: ${processedFile.name} ---\n`;
        researchFilesCache.push(processedFile.name);
        researchTextCache += processedFile.content;
        researchTextCache += `\n--- End of file: ${processedFile.name} ---\n`;
      }

      console.log(`Job ${jobId}: Processed ${processedFiles.length} files (${researchTextCache.length} characters total)`);
    }

    // ═══════════════════════════════════════════════════════════
    // ✨ PHASE 3 ENHANCEMENT: CACHE LOOKUP
    // ═══════════════════════════════════════════════════════════

    const cache = getCache();
    
    // Generate cache key based on prompt and research
    const cacheOptions = {
      temperature: CONFIG.API.TEMPERATURE_STRUCTURED,
      topP: CONFIG.API.TOP_P_STRUCTURED,
      topK: CONFIG.API.TOP_K_STRUCTURED,
      model: CONFIG.API.GEMINI_MODEL
    };
    
    const cacheKey = cache.generateKey(sanitizedPrompt, researchTextCache, cacheOptions);
    
    console.log(`Job ${jobId}: Cache key: ${cacheKey.substring(0, 16)}...`);
    
    // Try to get from cache
    const cachedResult = cache.get(cacheKey);
    
    if (cachedResult) {
      console.log(`Job ${jobId}: ✅ Cache HIT - Returning cached result`);
      
      // Create session for cached result
      const sessionId = createSession(researchTextCache, researchFilesCache);
      
      // Store chart with cached data
      const chartId = storeChart(cachedResult, sessionId);
      
      // Mark result as cached
      const completeData = {
        ...cachedResult,
        sessionId,
        chartId,
        _cached: true,
        _cacheAge: cachedResult._extractionMetrics?.cacheAge || 0
      };
      
      completeJob(jobId, completeData);
      
      // Track cache hit
      trackEvent('chart_generated', {
        fromCache: true,
        cacheHit: true,
        taskCount: cachedResult.data?.length || 0,
        generationTime: 0, // Instant from cache
        fileCount: researchFilesCache.length
      }, chartId, sessionId);
      
      console.log(`Job ${jobId}: Completed from cache`);
      return;
    }
    
    console.log(`Job ${jobId}: ❌ Cache MISS - Generating new chart`);
    
    // ═══════════════════════════════════════════════════════════
    // END PHASE 3 ENHANCEMENT
    // ═══════════════════════════════════════════════════════════

    // Update progress
    updateJob(jobId, {
      status: 'processing',
      progress: 'Generating chart data with AI...'
    });

    // Build user query
    const geminiUserQuery = `${sanitizedPrompt}

**CRITICAL REMINDER:** You MUST escape all newlines (\\n) and double-quotes (\") found in the research content before placing them into the final JSON string values.

Research Content:
${researchTextCache}`;

    // Define the payload
    const payload = {
      contents: [{ parts: [{ text: geminiUserQuery }] }],
      systemInstruction: { parts: [{ text: CHART_GENERATION_SYSTEM_PROMPT }] },
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: GANTT_CHART_SCHEMA,
        maxOutputTokens: CONFIG.API.MAX_OUTPUT_TOKENS_CHART,
        temperature: CONFIG.API.TEMPERATURE_STRUCTURED,
        topP: CONFIG.API.TOP_P_STRUCTURED,  // Phase 1 enhancement
        topK: CONFIG.API.TOP_K_STRUCTURED,  // Phase 1 enhancement
        candidateCount: 1,                   // Phase 1 enhancement
        stopSequences: []                    // Phase 1 enhancement
      }
    };

    const generationStartTime = Date.now();

    // Call the API with retry callback to update job status
    const ganttData = await callGeminiForJson(
      payload,
      CONFIG.API.RETRY_COUNT,
      (attemptNum, error) => {
        updateJob(jobId, {
          status: 'processing',
          progress: `Retrying AI request (attempt ${attemptNum + 1}/${CONFIG.API.RETRY_COUNT})...`
        });
        console.log(`Job ${jobId}: Retrying due to error: ${error.message}`);
      }
    );

    const generationDuration = Date.now() - generationStartTime;

    // Debug: Log what we received from AI
    console.log(`Job ${jobId}: Received ganttData from AI with keys:`, Object.keys(ganttData || {}));
    console.log(`Job ${jobId}: Generation took ${generationDuration}ms`);

    // Validate data structure before proceeding
    if (!ganttData || typeof ganttData !== 'object') {
      throw new Error('AI returned invalid data structure (not an object)');
    }

    if (!ganttData.timeColumns || !Array.isArray(ganttData.timeColumns)) {
      throw new Error('AI returned invalid timeColumns structure');
    }

    if (!ganttData.data || !Array.isArray(ganttData.data)) {
      throw new Error('AI returned invalid data array structure');
    }

    // Apply Phase 2 validation
    validateExtraction(ganttData, researchTextCache, jobId);

    // Continue with executive summary and presentation slides generation...
    // (existing code continues unchanged)
    
    let executiveSummary = null;
    try {
      updateJob(jobId, {
        status: 'processing',
        progress: 'Generating executive summary...'
      });

      // ... existing executive summary generation code ...
      
    } catch (summaryError) {
      console.error(`Job ${jobId}: Failed to generate executive summary:`, summaryError);
      executiveSummary = null;
    }

    // ... existing presentation slides generation code ...
    
    let presentationSlides = null;
    // ... (keep existing code)

    // Update progress
    updateJob(jobId, {
      status: 'processing',
      progress: 'Finalizing chart...'
    });

    // Create session to store research data
    const sessionId = createSession(researchTextCache, researchFilesCache);

    // Build complete chart data
    const chartDataWithEnhancements = {
      ...ganttData,
      executiveSummary: executiveSummary,
      presentationSlides: presentationSlides
    };

    // ═══════════════════════════════════════════════════════════
    // ✨ PHASE 3 ENHANCEMENT: CACHE STORAGE
    // ═══════════════════════════════════════════════════════════

    // Store in cache for future requests
    cache.set(cacheKey, chartDataWithEnhancements);
    console.log(`Job ${jobId}: ✅ Stored result in cache`);

    // ═══════════════════════════════════════════════════════════
    // END PHASE 3 ENHANCEMENT
    // ═══════════════════════════════════════════════════════════

    // Store chart data
    const chartId = storeChart(chartDataWithEnhancements, sessionId);

    // Complete job
    const completeData = {
      ...chartDataWithEnhancements,
      sessionId,
      chartId,
      _cached: false
    };

    completeJob(jobId, completeData);

    // Track successful generation
    const taskCount = ganttData.data.filter(row => !row.isSwimlane).length;
    trackEvent('chart_generated', {
      fromCache: false,
      cacheHit: false,
      taskCount,
      generationTime: generationDuration,
      hasExecutiveSummary: !!executiveSummary,
      hasPresentationSlides: !!presentationSlides,
      slideCount: presentationSlides?.slides?.length || 0,
      fileCount: researchFilesCache.length
    }, chartId, sessionId);

    console.log(`Job ${jobId}: Successfully completed`);

  } catch (error) {
    console.error(`Job ${jobId} failed:`, error);

    trackEvent('chart_failed', {
      errorMessage: error.message,
      errorType: error.constructor.name
    }, null, null);

    failJob(jobId, error.message);
  }
}
```

---

### **Step 3: Add Cache Statistics Endpoint (server/routes/charts.js)**

**File**: `server/routes/charts.js`  
**Lines**: End of file  
**Purpose**: Expose cache statistics for monitoring

#### **ADD AT END OF FILE**:

```javascript
// ═══════════════════════════════════════════════════════════
// ✨ PHASE 3 ENHANCEMENT: CACHE MANAGEMENT ENDPOINTS
// ═══════════════════════════════════════════════════════════

/**
 * GET /api/cache/stats
 * Returns cache statistics and performance metrics
 */
router.get('/api/cache/stats', apiLimiter, (req, res) => {
  try {
    const cache = getCache();
    const stats = cache.getStats();
    
    res.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      cache: stats
    });
    
  } catch (error) {
    console.error('[Cache Stats] Error:', error);
    res.status(500).json({
      error: 'Failed to retrieve cache statistics',
      details: error.message
    });
  }
});

/**
 * GET /api/cache/entries
 * Returns detailed information about cache entries
 * Query params:
 *  - limit: Number of entries to return (default: 10, max: 100)
 */
router.get('/api/cache/entries', apiLimiter, (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 100);
    
    const cache = getCache();
    const entries = cache.getEntries(limit);
    const stats = cache.getStats();
    
    res.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      limit,
      totalEntries: stats.size.current,
      entries
    });
    
  } catch (error) {
    console.error('[Cache Entries] Error:', error);
    res.status(500).json({
      error: 'Failed to retrieve cache entries',
      details: error.message
    });
  }
});

/**
 * POST /api/cache/clear
 * Clears all cache entries (admin operation)
 * Requires admin authentication in production
 */
router.post('/api/cache/clear', strictLimiter, (req, res) => {
  try {
    // TODO: Add admin authentication check in production
    // if (!req.isAdmin) {
    //   return res.status(403).json({ error: 'Unauthorized' });
    // }
    
    const cache = getCache();
    const beforeSize = cache.cache.size;
    
    cache.clear();
    
    console.log(`[Cache] Manually cleared ${beforeSize} entries`);
    
    res.json({
      status: 'success',
      message: `Cleared ${beforeSize} cache entries`,
      clearedCount: beforeSize,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[Cache Clear] Error:', error);
    res.status(500).json({
      error: 'Failed to clear cache',
      details: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════
// END PHASE 3 ENHANCEMENT
// ═══════════════════════════════════════════════════════════

export default router;
```

---

### **Step 4: Update Configuration (server/config.js)**

**File**: `server/config.js`  
**Lines**: ~84-95 (add cache configuration section)  
**Purpose**: Add cache-specific configuration

#### **ADD AFTER API CONFIGURATION**:

```javascript
// File: server/config.js
// Add after API configuration section (around line 84)

  // Cache Configuration
  CACHE: {
    ENABLED: process.env.CACHE_ENABLED !== 'false',              // Enable caching by default
    MAX_SIZE: parseInt(process.env.CACHE_MAX_SIZE, 10) || 100,  // Maximum cached items
    TTL_MS: parseInt(process.env.CACHE_TTL_MS, 10) || 3600000,  // 1 hour TTL
    CLEANUP_INTERVAL_MS: parseInt(process.env.CACHE_CLEANUP_MS, 10) || 300000, // 5 minutes cleanup
    STATIC_ASSETS_MAX_AGE: 86400 // 1 day in seconds (existing, keep unchanged)
  },
```

#### **UPDATE FREEZE STATEMENTS**:

```javascript
// Update at end of CONFIG object (around line 196)
Object.freeze(CONFIG.CACHE);  // Make sure this line exists
```

---

## 📝 **COMPLETE IMPLEMENTATION CHECKLIST (Phase 3)**

```markdown
### P2 Caching System

- [ ] **Task 1**: Create cache module (`server/cache.js`)
  - [ ] Implement CacheManager class
  - [ ] Add SHA-256 key generation
  - [ ] Add TTL expiration logic
  - [ ] Add LRU eviction algorithm
  - [ ] Add statistics tracking
  - [ ] Add cleanup interval
  - [ ] Test: Run unit tests on cache module

- [ ] **Task 2**: Integrate caching into chart generation
  - [ ] Import cache module in `server/routes/charts.js`
  - [ ] Add cache lookup before generation
  - [ ] Add cache storage after generation
  - [ ] Update job completion with cache metadata
  - [ ] Test: Generate chart twice, verify cache hit

- [ ] **Task 3**: Add cache endpoints
  - [ ] Create GET `/api/cache/stats` endpoint
  - [ ] Create GET `/api/cache/entries` endpoint
  - [ ] Create POST `/api/cache/clear` endpoint
  - [ ] Test: curl endpoints, verify responses

- [ ] **Task 4**: Update configuration
  - [ ] Add CACHE section to CONFIG
  - [ ] Add environment variable support
  - [ ] Freeze CACHE configuration
  - [ ] Test: Verify config loads correctly

- [ ] **Task 5**: Create cache test suite
  - [ ] Write cache functionality tests
  - [ ] Write cache eviction tests
  - [ ] Write cache expiration tests
  - [ ] Write cache statistics tests
  - [ ] Run all tests

- [ ] **Task 6**: Documentation & deployment
  - [ ] Document cache configuration options
  - [ ] Add cache monitoring guide
  - [ ] Update README with cache info
  - [ ] Deploy and monitor

- [ ] **Task 7**: Rollback plan
  - [ ] Commit: `git commit -m "P2: Caching system implementation"`
  - [ ] Tag: `git tag v1.0.0-deterministic-p2`
  - [ ] Document: Environment variables to disable cache
```

---

## 🧪 **PHASE 3 VALIDATION TEST SUITE**

Create this test file:

**File**: `test-cache-p2.js` (new file in project root)

```javascript
/**
 * Cache Functionality Test Suite - Phase 3 (P2)
 * Validates caching behavior, eviction, and statistics
 * 
 * Run: node test-cache-p2.js
 */

import fetch from 'node-fetch';
import FormData from 'form-data';
import crypto from 'crypto';

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

// Simple research for testing
const TEST_RESEARCH = `
# Test Project

## Phase 1: Planning
- Requirements gathering (2 weeks)
- Budget approval (1 week)

## Phase 2: Execution
- Development (4 weeks)
- Testing (2 weeks)
- Deployment (1 week)
`;

/**
 * Generate chart and measure time
 */
async function generateChart(prompt = 'Create a Gantt chart') {
  const formData = new FormData();
  formData.append('prompt', prompt);
  
  const buffer = Buffer.from(TEST_RESEARCH, 'utf-8');
  formData.append('researchFiles', buffer, {
    filename: 'test-project.md',
    contentType: 'text/markdown'
  });
  
  const startTime = Date.now();
  
  const response = await fetch(`${BASE_URL}/generate-chart`, {
    method: 'POST',
    body: formData
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }
  
  const { jobId } = await response.json();
  
  // Poll for completion
  let attempts = 0;
  while (attempts < 60) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const jobResponse = await fetch(`${BASE_URL}/job/${jobId}`);
    const job = await jobResponse.json();
    
    if (job.status === 'complete') {
      const duration = Date.now() - startTime;
      return {
        jobId,
        chartId: job.chartId,
        duration,
        fromCache: job._cached === true,
        data: job
      };
    }
    
    if (job.status === 'error') {
      throw new Error(`Generation failed: ${job.error}`);
    }
    
    attempts++;
  }
  
  throw new Error('Timeout waiting for generation');
}

/**
 * Get cache statistics
 */
async function getCacheStats() {
  const response = await fetch(`${BASE_URL}/api/cache/stats`);
  
  if (!response.ok) {
    throw new Error(`Failed to get cache stats: HTTP ${response.status}`);
  }
  
  return response.json();
}

/**
 * Clear cache
 */
async function clearCache() {
  const response = await fetch(`${BASE_URL}/api/cache/clear`, {
    method: 'POST'
  });
  
  if (!response.ok) {
    throw new Error(`Failed to clear cache: HTTP ${response.status}`);
  }
  
  return response.json();
}

/**
 * Test 1: Cache Miss → Cache Hit
 */
async function testCacheHit() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 1: Cache Miss → Cache Hit');
  console.log('='.repeat(60) + '\n');
  
  // Clear cache first
  console.log('Clearing cache...');
  await clearCache();
  
  // First generation (should be cache miss)
  console.log('\n1st Generation (expecting cache MISS)...');
  const result1 = await generateChart('Create a Gantt chart for the project');
  console.log(`  Duration: ${result1.duration}ms`);
  console.log(`  From cache: ${result1.fromCache}`);
  console.log(`  Chart ID: ${result1.chartId}`);
  
  // Second generation (should be cache hit)
  console.log('\n2nd Generation (expecting cache HIT)...');
  const result2 = await generateChart('Create a Gantt chart for the project');
  console.log(`  Duration: ${result2.duration}ms`);
  console.log(`  From cache: ${result2.fromCache}`);
  console.log(`  Chart ID: ${result2.chartId}`);
  
  // Verify cache hit
  const stats = await getCacheStats();
  console.log(`\nCache statistics:`);
  console.log(`  Hits: ${stats.cache.requests.hits}`);
  console.log(`  Misses: ${stats.cache.requests.misses}`);
  console.log(`  Hit rate: ${stats.cache.requests.hitRatePercent}%`);
  console.log(`  Cache size: ${stats.cache.size.current}/${stats.cache.size.max}`);
  
  // Validate
  const pass = result2.fromCache && result2.duration < (result1.duration / 2);
  console.log(`\nResult: ${pass ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Cache hit: ${result2.fromCache ? 'YES' : 'NO'}`);
  console.log(`  Speed improvement: ${((1 - result2.duration / result1.duration) * 100).toFixed(0)}%`);
  
  return { test: 'Cache Hit', passed: pass };
}

/**
 * Test 2: Different Prompts → Different Cache Keys
 */
async function testDifferentPrompts() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 2: Different Prompts → Different Cache Keys');
  console.log('='.repeat(60) + '\n');
  
  await clearCache();
  
  // Generate with different prompts
  console.log('Generating with prompt A...');
  const result1 = await generateChart('Create a detailed project timeline');
  console.log(`  Duration: ${result1.duration}ms`);
  
  console.log('\nGenerating with prompt B...');
  const result2 = await generateChart('Build a comprehensive Gantt chart');
  console.log(`  Duration: ${result2.duration}ms`);
  
  // Both should be cache misses (different prompts)
  const stats = await getCacheStats();
  console.log(`\nCache statistics:`);
  console.log(`  Size: ${stats.cache.size.current}`);
  console.log(`  Misses: ${stats.cache.requests.misses}`);
  
  const pass = !result1.fromCache && !result2.fromCache && stats.cache.size.current === 2;
  console.log(`\nResult: ${pass ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Both were cache misses: ${!result1.fromCache && !result2.fromCache ? 'YES' : 'NO'}`);
  console.log(`  Cache has 2 entries: ${stats.cache.size.current === 2 ? 'YES' : 'NO'}`);
  
  return { test: 'Different Prompts', passed: pass };
}

/**
 * Test 3: Cache Expiration (requires waiting or manual TTL adjustment)
 */
async function testCacheExpiration() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 3: Cache Expiration');
  console.log('='.repeat(60) + '\n');
  
  console.log('NOTE: This test requires CACHE_TTL_MS to be set to a short value (e.g., 5000ms)');
  console.log('      Skipping automatic expiration test in favor of manual verification');
  
  const stats = await getCacheStats();
  console.log(`\nCurrent TTL: ${stats.cache.config.ttlMs}ms (${(stats.cache.config.ttlMs / 1000 / 60).toFixed(1)} minutes)`);
  console.log(`Cleanup interval: ${stats.cache.config.cleanupIntervalMs}ms`);
  
  return { test: 'Cache Expiration', passed: true, skipped: true };
}

/**
 * Test 4: Cache Statistics Accuracy
 */
async function testCacheStatistics() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 4: Cache Statistics Accuracy');
  console.log('='.repeat(60) + '\n');
  
  await clearCache();
  
  // Generate multiple charts
  console.log('Generating 3 unique charts...');
  await generateChart('Project A timeline');
  await generateChart('Project B timeline');
  await generateChart('Project C timeline');
  
  // Regenerate first chart (cache hit)
  console.log('\nRegenerating Project A (should hit cache)...');
  await generateChart('Project A timeline');
  
  // Get stats
  const stats = await getCacheStats();
  
  console.log(`\nCache statistics:`);
  console.log(`  Total requests: ${stats.cache.requests.total}`);
  console.log(`  Hits: ${stats.cache.requests.hits}`);
  console.log(`  Misses: ${stats.cache.requests.misses}`);
  console.log(`  Hit rate: ${stats.cache.requests.hitRatePercent}%`);
  console.log(`  Cache size: ${stats.cache.size.current}/${stats.cache.size.max}`);
  console.log(`  Sets: ${stats.cache.operations.sets}`);
  
  // Expected: 4 total requests, 1 hit, 3 misses, 3 cache entries
  const pass = stats.cache.requests.total === 4 &&
                stats.cache.requests.hits === 1 &&
                stats.cache.requests.misses === 3 &&
                stats.cache.size.current === 3;
  
  console.log(`\nResult: ${pass ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Total requests correct: ${stats.cache.requests.total === 4 ? 'YES' : 'NO'} (${stats.cache.requests.total}/4)`);
  console.log(`  Hits correct: ${stats.cache.requests.hits === 1 ? 'YES' : 'NO'} (${stats.cache.requests.hits}/1)`);
  console.log(`  Misses correct: ${stats.cache.requests.misses === 3 ? 'YES' : 'NO'} (${stats.cache.requests.misses}/3)`);
  console.log(`  Cache size correct: ${stats.cache.size.current === 3 ? 'YES' : 'NO'} (${stats.cache.size.current}/3)`);
  
  return { test: 'Cache Statistics', passed: pass };
}

/**
 * Test 5: Performance Improvement
 */
async function testPerformanceImprovement() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 5: Performance Improvement');
  console.log('='.repeat(60) + '\n');
  
  await clearCache();
  
  // First generation (no cache)
  console.log('Generating without cache...');
  const result1 = await generateChart('Performance test chart');
  
  // Second generation (with cache)
  console.log('Generating with cache...');
  const result2 = await generateChart('Performance test chart');
  
  const improvement = ((1 - result2.duration / result1.duration) * 100);
  
  console.log(`\nPerformance comparison:`);
  console.log(`  Without cache: ${result1.duration}ms`);
  console.log(`  With cache: ${result2.duration}ms`);
  console.log(`  Improvement: ${improvement.toFixed(1)}%`);
  console.log(`  Speedup: ${(result1.duration / result2.duration).toFixed(1)}x`);
  
  // Cache should be at least 50% faster
  const pass = result2.fromCache && improvement >= 50;
  
  console.log(`\nResult: ${pass ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  From cache: ${result2.fromCache ? 'YES' : 'NO'}`);
  console.log(`  At least 50% faster: ${improvement >= 50 ? 'YES' : 'NO'}`);
  
  return { test: 'Performance Improvement', passed: pass };
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║     CACHE FUNCTIONALITY TEST SUITE (Phase 3 - P2)     ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  
  const results = [];
  
  try {
    results.push(await testCacheHit());
    results.push(await testDifferentPrompts());
    results.push(await testCacheExpiration());
    results.push(await testCacheStatistics());
    results.push(await testPerformanceImprovement());
  } catch (error) {
    console.error('\n💥 Test suite failed:', error);
    process.exit(1);
  }
  
  // Summary
  console.log('\n\n' + '='.repeat(60));
  console.log('TEST SUITE SUMMARY');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r.passed && !r.skipped).length;
  const skipped = results.filter(r => r.skipped).length;
  const failed = results.filter(r => !r.passed && !r.skipped).length;
  
  results.forEach(result => {
    const status = result.skipped ? '⏭️  SKIP' : (result.passed ? '✅ PASS' : '❌ FAIL');
    console.log(`\n${status} - ${result.test}`);
  });
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Total: ${results.length} tests | Passed: ${passed} | Failed: ${failed} | Skipped: ${skipped}`);
  console.log(`Success rate: ${((passed / (results.length - skipped)) * 100).toFixed(0)}%`);
  console.log('='.repeat(60)\n');
  
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
```

---

## 🚀 **DEPLOYMENT INSTRUCTIONS (Phase 3)**

```bash
# 1. Create new cache module
touch server/cache.js
# (Add complete code from Step 1)

# 2. Update chart routes
# (Modify server/routes/charts.js as specified in Step 2)

# 3. Update configuration
# (Modify server/config.js as specified in Step 4)

# 4. Set environment variables (optional)
echo "CACHE_ENABLED=true" >> .env
echo "CACHE_MAX_SIZE=100" >> .env
echo "CACHE_TTL_MS=3600000" >> .env
echo "CACHE_CLEANUP_MS=300000" >> .env

# 5. Restart server
pm2 restart ai-roadmap-generator

# 6. Run cache tests
node test-cache-p2.js

# 7. Test cache endpoints
curl "http://localhost:3000/api/cache/stats" | jq
curl "http://localhost:3000/api/cache/entries?limit=5" | jq

# 8. Monitor cache performance
while true; do
  curl -s "http://localhost:3000/api/cache/stats" | jq '.cache.requests'
  sleep 10
done

# 9. If tests pass, commit
git add server/cache.js server/routes/charts.js server/config.js test-cache-p2.js
git commit -m "feat: P2 caching system - SHA-256 keys, LRU eviction, TTL expiration"
git tag v1.0.0-deterministic-p2
git push origin main --tags

# 10. If tests fail, rollback
git checkout HEAD~1 server/cache.js server/routes/charts.js server/config.js
pm2 restart ai-roadmap-generator
```

---

## ✅ **SUCCESS CRITERIA (Phase 3)**

After deploying Phase 3:

1. **Cache Hit Rate**: 30%+ after warm-up period
2. **Performance Improvement**: 80%+ faster for cached results (< 500ms vs 3-5s)
3. **Cache Statistics**: Accurate hit/miss/eviction tracking
4. **Memory Management**: LRU eviction prevents memory overflow
5. **TTL Expiration**: Stale entries cleaned up automatically
6. **Zero Breaking Changes**: All existing functionality works
7. **API Endpoints**: `/api/cache/stats` and `/api/cache/entries` operational

---

## 📊 **EXPECTED IMPROVEMENTS**

### **Before Phase 3**:
```
Every chart generation: 3-5 seconds
Identical requests: Still takes 3-5 seconds
API cost: 100% (no caching)
```

### **After Phase 3**:
```
First generation: 3-5 seconds (cache miss)
Repeated generation: < 500ms (cache hit, 90% faster)
Cache hit rate: 30-50% in production
API cost: Reduced by 30-50%
Memory usage: Controlled via LRU eviction
```

---

Would you like me to:
1. Proceed with **Phase 4**: Advanced monitoring and analytics?
2. Create additional cache management utilities?
3. Review/adjust Phase 3 implementation?