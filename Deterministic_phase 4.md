## 🎯 **PHASE 4: ADVANCED MONITORING AND ANALYTICS (P3)**

Let me search for existing monitoring infrastructure first.Perfect! I can see there's already analytics infrastructure in place. Let me build a comprehensive monitoring system on top of it.

---

## 🎯 **PHASE 4: ADVANCED MONITORING AND ANALYTICS (P3)**

### **Overview**
This phase creates a production-grade monitoring system with real-time metrics, health checks, performance tracking, and analytics dashboard. It builds on the existing analytics infrastructure to provide comprehensive observability.

---

### **Step 1: Create Monitoring Module (server/monitoring.js)**

**File**: `server/monitoring.js` (NEW FILE)  
**Purpose**: Real-time monitoring, metrics aggregation, and health checks

#### **COMPLETE FILE**:

```javascript
/**
 * Advanced Monitoring and Analytics Module
 * Phase 4 Enhancement: Production-grade monitoring system
 * 
 * Features:
 * - Real-time metrics collection
 * - Performance tracking
 * - Health checks
 * - SLA monitoring
 * - Error tracking
 * - Resource utilization
 */

import os from 'os';
import { getCache } from './cache.js';
import { getStats as getDbStats } from './database.js';
import { CONFIG } from './config.js';

// ═══════════════════════════════════════════════════════════
// METRICS COLLECTOR
// ═══════════════════════════════════════════════════════════

class MetricsCollector {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        avgDuration: 0,
        p95Duration: 0,
        p99Duration: 0
      },
      generation: {
        total: 0,
        successful: 0,
        failed: 0,
        avgDuration: 0,
        avgTasksExtracted: 0,
        totalTasksExtracted: 0
      },
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0,
        avgHitDuration: 0,
        avgMissDuration: 0
      },
      errors: {
        total: 0,
        byType: {},
        recent: []
      },
      performance: {
        requestDurations: [],
        generationDurations: []
      }
    };

    this.startTime = Date.now();
    this.requestTimestamps = [];
  }

  /**
   * Record a request
   */
  recordRequest(duration, success = true) {
    this.metrics.requests.total++;
    
    if (success) {
      this.metrics.requests.successful++;
    } else {
      this.metrics.requests.failed++;
    }

    // Track for percentile calculation
    this.metrics.performance.requestDurations.push(duration);
    
    // Keep only last 1000 durations for memory efficiency
    if (this.metrics.performance.requestDurations.length > 1000) {
      this.metrics.performance.requestDurations.shift();
    }

    // Update average
    this.metrics.requests.avgDuration = this.calculateAverage(
      this.metrics.performance.requestDurations
    );

    // Update percentiles
    this.updatePercentiles();

    // Track timestamp for rate calculation
    this.requestTimestamps.push(Date.now());
    
    // Keep only last hour of timestamps
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    this.requestTimestamps = this.requestTimestamps.filter(ts => ts > oneHourAgo);
  }

  /**
   * Record a chart generation
   */
  recordGeneration(duration, taskCount, success = true) {
    this.metrics.generation.total++;
    
    if (success) {
      this.metrics.generation.successful++;
      
      if (taskCount) {
        this.metrics.generation.totalTasksExtracted += taskCount;
        this.metrics.generation.avgTasksExtracted = 
          this.metrics.generation.totalTasksExtracted / this.metrics.generation.successful;
      }
    } else {
      this.metrics.generation.failed++;
    }

    // Track duration
    this.metrics.performance.generationDurations.push(duration);
    
    if (this.metrics.performance.generationDurations.length > 1000) {
      this.metrics.performance.generationDurations.shift();
    }

    // Update average
    this.metrics.generation.avgDuration = this.calculateAverage(
      this.metrics.performance.generationDurations
    );
  }

  /**
   * Record cache access
   */
  recordCacheAccess(hit, duration) {
    if (hit) {
      this.metrics.cache.hits++;
      
      // Track hit durations separately
      const hitDurations = this.metrics.performance.requestDurations.slice(-100).filter((d, i) => {
        // This is approximate - in production, track hit/miss durations separately
        return d < 500; // Assume cache hits are < 500ms
      });
      
      this.metrics.cache.avgHitDuration = this.calculateAverage(hitDurations);
    } else {
      this.metrics.cache.misses++;
      
      const missDurations = this.metrics.performance.requestDurations.slice(-100).filter(d => d >= 500);
      this.metrics.cache.avgMissDuration = this.calculateAverage(missDurations);
    }

    const total = this.metrics.cache.hits + this.metrics.cache.misses;
    this.metrics.cache.hitRate = total > 0 ? (this.metrics.cache.hits / total * 100) : 0;
  }

  /**
   * Record an error
   */
  recordError(error, context = {}) {
    this.metrics.errors.total++;

    const errorType = error.constructor.name || 'UnknownError';
    this.metrics.errors.byType[errorType] = (this.metrics.errors.byType[errorType] || 0) + 1;

    // Store recent errors (max 100)
    this.metrics.errors.recent.unshift({
      type: errorType,
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 3).join('\n'), // First 3 lines only
      context,
      timestamp: Date.now()
    });

    if (this.metrics.errors.recent.length > 100) {
      this.metrics.errors.recent.pop();
    }
  }

  /**
   * Calculate average of array
   */
  calculateAverage(arr) {
    if (arr.length === 0) return 0;
    return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
  }

  /**
   * Update percentile metrics
   */
  updatePercentiles() {
    const durations = [...this.metrics.performance.requestDurations].sort((a, b) => a - b);
    
    if (durations.length === 0) return;

    const p95Index = Math.floor(durations.length * 0.95);
    const p99Index = Math.floor(durations.length * 0.99);

    this.metrics.requests.p95Duration = durations[p95Index] || durations[durations.length - 1];
    this.metrics.requests.p99Duration = durations[p99Index] || durations[durations.length - 1];
  }

  /**
   * Calculate requests per minute
   */
  getRequestsPerMinute() {
    const oneMinuteAgo = Date.now() - (60 * 1000);
    const recentRequests = this.requestTimestamps.filter(ts => ts > oneMinuteAgo);
    return recentRequests.length;
  }

  /**
   * Calculate requests per hour
   */
  getRequestsPerHour() {
    return this.requestTimestamps.length;
  }

  /**
   * Get uptime in seconds
   */
  getUptime() {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  /**
   * Get all metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      uptime: this.getUptime(),
      requestsPerMinute: this.getRequestsPerMinute(),
      requestsPerHour: this.getRequestsPerHour(),
      timestamp: Date.now()
    };
  }

  /**
   * Reset metrics (for testing)
   */
  reset() {
    this.metrics = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        avgDuration: 0,
        p95Duration: 0,
        p99Duration: 0
      },
      generation: {
        total: 0,
        successful: 0,
        failed: 0,
        avgDuration: 0,
        avgTasksExtracted: 0,
        totalTasksExtracted: 0
      },
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0,
        avgHitDuration: 0,
        avgMissDuration: 0
      },
      errors: {
        total: 0,
        byType: {},
        recent: []
      },
      performance: {
        requestDurations: [],
        generationDurations: []
      }
    };

    this.startTime = Date.now();
    this.requestTimestamps = [];
  }
}

// ═══════════════════════════════════════════════════════════
// HEALTH CHECK SYSTEM
// ═══════════════════════════════════════════════════════════

class HealthChecker {
  constructor() {
    this.checks = new Map();
    this.lastCheckResults = new Map();
  }

  /**
   * Register a health check
   */
  registerCheck(name, checkFunction, criticalLevel = 'warn') {
    this.checks.set(name, { checkFunction, criticalLevel });
  }

  /**
   * Run all health checks
   */
  async runAllChecks() {
    const results = {
      status: 'healthy',
      timestamp: Date.now(),
      checks: {},
      summary: {
        total: this.checks.size,
        passed: 0,
        warnings: 0,
        failures: 0
      }
    };

    for (const [name, { checkFunction, criticalLevel }] of this.checks) {
      try {
        const checkResult = await checkFunction();
        
        results.checks[name] = {
          status: checkResult.healthy ? 'pass' : 'fail',
          message: checkResult.message,
          details: checkResult.details,
          criticalLevel,
          duration: checkResult.duration
        };

        if (checkResult.healthy) {
          results.summary.passed++;
        } else {
          if (criticalLevel === 'critical') {
            results.summary.failures++;
            results.status = 'unhealthy';
          } else {
            results.summary.warnings++;
            if (results.status === 'healthy') {
              results.status = 'degraded';
            }
          }
        }

        this.lastCheckResults.set(name, checkResult);
      } catch (error) {
        results.checks[name] = {
          status: 'error',
          message: error.message,
          criticalLevel,
          error: true
        };

        results.summary.failures++;
        results.status = 'unhealthy';
      }
    }

    return results;
  }

  /**
   * Get last check results without running
   */
  getLastResults() {
    const results = {};
    
    for (const [name, result] of this.lastCheckResults) {
      results[name] = result;
    }

    return results;
  }
}

// ═══════════════════════════════════════════════════════════
// PERFORMANCE MONITOR
// ═══════════════════════════════════════════════════════════

class PerformanceMonitor {
  /**
   * Get system resource usage
   */
  static getSystemMetrics() {
    const cpus = os.cpus();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    // Calculate CPU usage (simplified)
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });

    const cpuUsagePercent = 100 - (100 * totalIdle / totalTick);

    return {
      cpu: {
        count: cpus.length,
        model: cpus[0].model,
        usagePercent: cpuUsagePercent.toFixed(2),
        loadAverage: os.loadavg().map(load => load.toFixed(2))
      },
      memory: {
        totalGB: (totalMemory / (1024 ** 3)).toFixed(2),
        usedGB: (usedMemory / (1024 ** 3)).toFixed(2),
        freeGB: (freeMemory / (1024 ** 3)).toFixed(2),
        usagePercent: ((usedMemory / totalMemory) * 100).toFixed(2)
      },
      process: {
        memoryUsageMB: (process.memoryUsage().heapUsed / (1024 ** 2)).toFixed(2),
        memoryLimitMB: (process.memoryUsage().heapTotal / (1024 ** 2)).toFixed(2),
        uptime: Math.floor(process.uptime()),
        pid: process.pid
      },
      platform: {
        type: os.type(),
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname(),
        nodeVersion: process.version
      }
    };
  }

  /**
   * Get Node.js process metrics
   */
  static getProcessMetrics() {
    const memUsage = process.memoryUsage();

    return {
      memory: {
        rss: Math.round(memUsage.rss / (1024 ** 2)), // MB
        heapTotal: Math.round(memUsage.heapTotal / (1024 ** 2)),
        heapUsed: Math.round(memUsage.heapUsed / (1024 ** 2)),
        external: Math.round(memUsage.external / (1024 ** 2))
      },
      uptime: Math.floor(process.uptime()),
      pid: process.pid,
      version: process.version,
      resourceUsage: process.resourceUsage()
    };
  }
}

// ═══════════════════════════════════════════════════════════
// SLA MONITOR
// ═══════════════════════════════════════════════════════════

class SLAMonitor {
  constructor() {
    // SLA targets
    this.targets = {
      availability: 99.9, // 99.9% uptime
      responseTime: 5000, // 5 seconds for generation
      errorRate: 1.0,     // < 1% error rate
      cacheHitRate: 30.0  // > 30% cache hit rate
    };

    this.violations = [];
  }

  /**
   * Check SLA compliance
   */
  checkCompliance(metrics) {
    const results = {
      compliant: true,
      violations: [],
      metrics: {}
    };

    // Check availability (based on error rate)
    const totalRequests = metrics.requests.total;
    const failedRequests = metrics.requests.failed;
    const availability = totalRequests > 0 ? 
      ((totalRequests - failedRequests) / totalRequests) * 100 : 100;

    results.metrics.availability = {
      current: availability.toFixed(2),
      target: this.targets.availability,
      compliant: availability >= this.targets.availability
    };

    if (availability < this.targets.availability) {
      results.compliant = false;
      results.violations.push({
        metric: 'availability',
        current: availability.toFixed(2),
        target: this.targets.availability,
        severity: 'critical'
      });
    }

    // Check response time
    const avgResponseTime = metrics.generation.avgDuration;
    
    results.metrics.responseTime = {
      current: avgResponseTime,
      target: this.targets.responseTime,
      compliant: avgResponseTime <= this.targets.responseTime
    };

    if (avgResponseTime > this.targets.responseTime) {
      results.compliant = false;
      results.violations.push({
        metric: 'responseTime',
        current: avgResponseTime,
        target: this.targets.responseTime,
        severity: 'warning'
      });
    }

    // Check error rate
    const errorRate = totalRequests > 0 ? 
      (failedRequests / totalRequests) * 100 : 0;

    results.metrics.errorRate = {
      current: errorRate.toFixed(2),
      target: this.targets.errorRate,
      compliant: errorRate <= this.targets.errorRate
    };

    if (errorRate > this.targets.errorRate) {
      results.compliant = false;
      results.violations.push({
        metric: 'errorRate',
        current: errorRate.toFixed(2),
        target: this.targets.errorRate,
        severity: 'critical'
      });
    }

    // Check cache hit rate
    const cacheHitRate = metrics.cache.hitRate;

    results.metrics.cacheHitRate = {
      current: cacheHitRate.toFixed(2),
      target: this.targets.cacheHitRate,
      compliant: cacheHitRate >= this.targets.cacheHitRate
    };

    if (cacheHitRate < this.targets.cacheHitRate && (metrics.cache.hits + metrics.cache.misses) > 10) {
      results.compliant = false;
      results.violations.push({
        metric: 'cacheHitRate',
        current: cacheHitRate.toFixed(2),
        target: this.targets.cacheHitRate,
        severity: 'warning'
      });
    }

    // Store violations
    if (results.violations.length > 0) {
      this.violations.push({
        timestamp: Date.now(),
        violations: results.violations
      });

      // Keep only last 100 violations
      if (this.violations.length > 100) {
        this.violations.shift();
      }
    }

    return results;
  }

  /**
   * Get violation history
   */
  getViolationHistory(limit = 20) {
    return this.violations.slice(0, limit);
  }
}

// ═══════════════════════════════════════════════════════════
// SINGLETON INSTANCES
// ═══════════════════════════════════════════════════════════

let metricsCollector = null;
let healthChecker = null;
let slaMonitor = null;

export function getMetricsCollector() {
  if (!metricsCollector) {
    metricsCollector = new MetricsCollector();
  }
  return metricsCollector;
}

export function getHealthChecker() {
  if (!healthChecker) {
    healthChecker = new HealthChecker();
    initializeHealthChecks(healthChecker);
  }
  return healthChecker;
}

export function getSLAMonitor() {
  if (!slaMonitor) {
    slaMonitor = new SLAMonitor();
  }
  return slaMonitor;
}

/**
 * Initialize standard health checks
 */
function initializeHealthChecks(checker) {
  // Database health check
  checker.registerCheck('database', async () => {
    const start = Date.now();
    try {
      const stats = getDbStats();
      const duration = Date.now() - start;

      return {
        healthy: true,
        message: 'Database is operational',
        details: {
          sessions: stats.sessions,
          charts: stats.charts,
          jobs: stats.jobs,
          dbSizeKB: stats.dbSizeKB
        },
        duration
      };
    } catch (error) {
      return {
        healthy: false,
        message: `Database error: ${error.message}`,
        duration: Date.now() - start
      };
    }
  }, 'critical');

  // Cache health check
  checker.registerCheck('cache', async () => {
    const start = Date.now();
    try {
      const cache = getCache();
      const stats = cache.getStats();
      const duration = Date.now() - start;

      return {
        healthy: stats.enabled,
        message: stats.enabled ? 'Cache is operational' : 'Cache is disabled',
        details: {
          size: stats.size.current,
          hitRate: stats.requests.hitRatePercent,
          utilizationPercent: stats.size.utilizationPercent
        },
        duration
      };
    } catch (error) {
      return {
        healthy: false,
        message: `Cache error: ${error.message}`,
        duration: Date.now() - start
      };
    }
  }, 'warn');

  // Memory health check
  checker.registerCheck('memory', async () => {
    const start = Date.now();
    const memUsage = process.memoryUsage();
    const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    const duration = Date.now() - start;

    return {
      healthy: heapUsedPercent < 90,
      message: heapUsedPercent < 90 ? 
        'Memory usage is normal' : 
        'Memory usage is high',
      details: {
        heapUsedMB: Math.round(memUsage.heapUsed / (1024 ** 2)),
        heapTotalMB: Math.round(memUsage.heapTotal / (1024 ** 2)),
        heapUsedPercent: heapUsedPercent.toFixed(2)
      },
      duration
    };
  }, 'warn');

  // API health check
  checker.registerCheck('api', async () => {
    const start = Date.now();
    const hasApiKey = !!process.env.API_KEY;
    const duration = Date.now() - start;

    return {
      healthy: hasApiKey,
      message: hasApiKey ? 'API key is configured' : 'API key is missing',
      details: {
        configured: hasApiKey,
        model: CONFIG.API.GEMINI_MODEL
      },
      duration
    };
  }, 'critical');
}

export { PerformanceMonitor };
export default {
  getMetricsCollector,
  getHealthChecker,
  getSLAMonitor,
  PerformanceMonitor
};
```

---

### **Step 2: Add Monitoring Middleware (server/middleware.js)**

**File**: `server/middleware.js`  
**Lines**: Add at end of file  
**Purpose**: Track all requests for monitoring

#### **ADD TO END OF FILE**:

```javascript
// File: server/middleware.js
// Add after existing middleware exports

import { getMetricsCollector } from './monitoring.js';

/**
 * Monitoring middleware - tracks all requests
 */
export function monitoringMiddleware(req, res, next) {
  const start = Date.now();
  const metrics = getMetricsCollector();

  // Track response
  res.on('finish', () => {
    const duration = Date.now() - start;
    const success = res.statusCode < 400;

    metrics.recordRequest(duration, success);
  });

  next();
}
```

---

### **Step 3: Create Monitoring Routes (server/routes/monitoring.js)**

**File**: `server/routes/monitoring.js` (NEW FILE)  
**Purpose**: Expose monitoring endpoints

#### **COMPLETE FILE**:

```javascript
/**
 * Monitoring and Analytics Routes Module
 * Phase 4 Enhancement: Comprehensive monitoring endpoints
 * 
 * Endpoints:
 * - GET /api/monitoring/health - Health check
 * - GET /api/monitoring/metrics - Real-time metrics
 * - GET /api/monitoring/system - System resources
 * - GET /api/monitoring/sla - SLA compliance
 * - GET /api/monitoring/dashboard - Complete dashboard data
 */

import express from 'express';
import {
  getMetricsCollector,
  getHealthChecker,
  getSLAMonitor,
  PerformanceMonitor
} from '../monitoring.js';
import { getCache } from '../cache.js';
import { getStats as getDbStats, getAnalyticsSummary, getOverallAnalytics } from '../database.js';
import { apiLimiter } from '../middleware.js';

const router = express.Router();

// ═══════════════════════════════════════════════════════════
// HEALTH CHECK ENDPOINTS
// ═══════════════════════════════════════════════════════════

/**
 * GET /api/monitoring/health
 * Comprehensive health check
 */
router.get('/api/monitoring/health', async (req, res) => {
  try {
    const checker = getHealthChecker();
    const health = await checker.runAllChecks();

    // Set appropriate status code
    const statusCode = health.status === 'healthy' ? 200 :
                       health.status === 'degraded' ? 200 :
                       503;

    res.status(statusCode).json(health);
  } catch (error) {
    console.error('[Monitoring] Health check error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * GET /api/monitoring/health/simple
 * Simple health check (fast, no deep checks)
 */
router.get('/api/monitoring/health/simple', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: Date.now(),
    uptime: Math.floor(process.uptime())
  });
});

// ═══════════════════════════════════════════════════════════
// METRICS ENDPOINTS
// ═══════════════════════════════════════════════════════════

/**
 * GET /api/monitoring/metrics
 * Real-time application metrics
 */
router.get('/api/monitoring/metrics', apiLimiter, (req, res) => {
  try {
    const metrics = getMetricsCollector();
    const data = metrics.getMetrics();

    res.json({
      status: 'success',
      timestamp: Date.now(),
      metrics: data
    });
  } catch (error) {
    console.error('[Monitoring] Metrics error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * GET /api/monitoring/system
 * System resource metrics
 */
router.get('/api/monitoring/system', apiLimiter, (req, res) => {
  try {
    const systemMetrics = PerformanceMonitor.getSystemMetrics();
    const processMetrics = PerformanceMonitor.getProcessMetrics();

    res.json({
      status: 'success',
      timestamp: Date.now(),
      system: systemMetrics,
      process: processMetrics
    });
  } catch (error) {
    console.error('[Monitoring] System metrics error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * GET /api/monitoring/sla
 * SLA compliance check
 */
router.get('/api/monitoring/sla', apiLimiter, (req, res) => {
  try {
    const metrics = getMetricsCollector();
    const slaMonitor = getSLAMonitor();
    
    const metricsData = metrics.getMetrics();
    const compliance = slaMonitor.checkCompliance(metricsData);
    const history = slaMonitor.getViolationHistory(10);

    res.json({
      status: 'success',
      timestamp: Date.now(),
      compliance,
      violationHistory: history
    });
  } catch (error) {
    console.error('[Monitoring] SLA check error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════
// ANALYTICS ENDPOINTS
// ═══════════════════════════════════════════════════════════

/**
 * GET /api/monitoring/analytics/summary
 * Analytics summary for date range
 * Query params:
 *  - startDate: YYYY-MM-DD (default: 7 days ago)
 *  - endDate: YYYY-MM-DD (default: today)
 */
router.get('/api/monitoring/analytics/summary', apiLimiter, (req, res) => {
  try {
    const endDate = req.query.endDate || new Date().toISOString().split('T')[0];
    const startDate = req.query.startDate || (() => {
      const date = new Date();
      date.setDate(date.getDate() - 7);
      return date.toISOString().split('T')[0];
    })();

    const summary = getAnalyticsSummary(startDate, endDate);

    res.json({
      status: 'success',
      dateRange: { startDate, endDate },
      data: summary
    });
  } catch (error) {
    console.error('[Monitoring] Analytics summary error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * GET /api/monitoring/analytics/overall
 * Overall analytics statistics
 */
router.get('/api/monitoring/analytics/overall', apiLimiter, (req, res) => {
  try {
    const overall = getOverallAnalytics();

    res.json({
      status: 'success',
      timestamp: Date.now(),
      analytics: overall
    });
  } catch (error) {
    console.error('[Monitoring] Overall analytics error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════
// DASHBOARD ENDPOINT
// ═══════════════════════════════════════════════════════════

/**
 * GET /api/monitoring/dashboard
 * Complete dashboard data (all metrics in one call)
 */
router.get('/api/monitoring/dashboard', apiLimiter, async (req, res) => {
  try {
    // Gather all monitoring data
    const metrics = getMetricsCollector();
    const checker = getHealthChecker();
    const slaMonitor = getSLAMonitor();
    const cache = getCache();

    const metricsData = metrics.getMetrics();
    const health = await checker.runAllChecks();
    const slaCompliance = slaMonitor.checkCompliance(metricsData);
    const systemMetrics = PerformanceMonitor.getSystemMetrics();
    const cacheStats = cache.getStats();
    const dbStats = getDbStats();
    const overall = getOverallAnalytics();

    // Build complete dashboard
    const dashboard = {
      timestamp: Date.now(),
      status: health.status,
      
      // Overview metrics
      overview: {
        uptime: metricsData.uptime,
        requestsPerMinute: metricsData.requestsPerMinute,
        requestsPerHour: metricsData.requestsPerHour,
        errorRate: ((metricsData.requests.failed / metricsData.requests.total) * 100).toFixed(2),
        avgResponseTime: metricsData.requests.avgDuration
      },

      // Health status
      health: {
        status: health.status,
        summary: health.summary,
        checks: health.checks
      },

      // Performance metrics
      performance: {
        requests: metricsData.requests,
        generation: metricsData.generation,
        cache: {
          ...metricsData.cache,
          stats: {
            size: cacheStats.size,
            utilizationPercent: cacheStats.size.utilizationPercent
          }
        }
      },

      // SLA compliance
      sla: {
        compliant: slaCompliance.compliant,
        metrics: slaCompliance.metrics,
        violations: slaCompliance.violations
      },

      // System resources
      system: {
        cpu: systemMetrics.cpu,
        memory: systemMetrics.memory,
        process: systemMetrics.process
      },

      // Database stats
      database: dbStats,

      // Analytics
      analytics: overall,

      // Error summary
      errors: {
        total: metricsData.errors.total,
        byType: metricsData.errors.byType,
        recent: metricsData.errors.recent.slice(0, 5)
      }
    };

    res.json({
      status: 'success',
      dashboard
    });
  } catch (error) {
    console.error('[Monitoring] Dashboard error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

export default router;
```

---

### **Step 4: Integrate Monitoring into Chart Routes**

**File**: `server/routes/charts.js`  
**Lines**: Update processChartGeneration function  
**Purpose**: Track generation metrics

#### **ADD AT TOP**:

```javascript
// Add after existing imports
import { getMetricsCollector } from '../monitoring.js';
```

#### **UPDATE processChartGeneration**:

```javascript
// In processChartGeneration function, after generation completes
// Around line ~180 (after ganttData is received)

const metrics = getMetricsCollector();

// Record generation metrics
metrics.recordGeneration(
  generationDuration,
  taskCount,
  true // success
);

// Record cache access
if (cachedResult) {
  metrics.recordCacheAccess(true, result2.duration);
} else {
  metrics.recordCacheAccess(false, generationDuration);
}
```

#### **UPDATE ERROR HANDLER**:

```javascript
// In catch block of processChartGeneration
// Around line ~250

catch (error) {
  console.error(`Job ${jobId} failed:`, error);

  const metrics = getMetricsCollector();
  metrics.recordError(error, { jobId, type: 'chart_generation' });
  metrics.recordGeneration(0, 0, false); // Failed generation

  trackEvent('chart_failed', {
    errorMessage: error.message,
    errorType: error.constructor.name
  }, null, null);

  failJob(jobId, error.message);
}
```

---

### **Step 5: Update Server Entry Point (server.js)**

**File**: `server.js`  
**Lines**: Add monitoring middleware and routes  
**Purpose**: Enable monitoring across all routes

#### **ADD IMPORTS**:

```javascript
// Add after existing route imports (around line 30)
import monitoringRoutes from './server/routes/monitoring.js';
import { monitoringMiddleware } from './server/middleware.js';
```

#### **ADD MIDDLEWARE** (before routes):

```javascript
// Add after CORS configuration (around line 70)
// Apply monitoring to all requests
app.use(monitoringMiddleware);
```

#### **ADD ROUTES**:

```javascript
// Add after existing routes (around line 90)
app.use(monitoringRoutes);
```

---

## 📝 **COMPLETE IMPLEMENTATION CHECKLIST (Phase 4)**

```markdown
### P3 Monitoring & Analytics

- [ ] **Task 1**: Create monitoring module (`server/monitoring.js`)
  - [ ] Implement MetricsCollector class
  - [ ] Implement HealthChecker class
  - [ ] Implement SLAMonitor class
  - [ ] Implement PerformanceMonitor class
  - [ ] Test: Unit tests for each class

- [ ] **Task 2**: Add monitoring middleware
  - [ ] Create monitoringMiddleware in `server/middleware.js`
  - [ ] Track request duration
  - [ ] Track success/failure
  - [ ] Test: Verify metrics collection

- [ ] **Task 3**: Create monitoring routes
  - [ ] Create `server/routes/monitoring.js`
  - [ ] Add /health endpoint
  - [ ] Add /metrics endpoint
  - [ ] Add /system endpoint
  - [ ] Add /sla endpoint
  - [ ] Add /dashboard endpoint
  - [ ] Test: curl all endpoints

- [ ] **Task 4**: Integrate into chart generation
  - [ ] Import metrics collector
  - [ ] Track generation duration
  - [ ] Track cache hits/misses
  - [ ] Record errors
  - [ ] Test: Verify metrics update

- [ ] **Task 5**: Update server entry point
  - [ ] Import monitoring routes
  - [ ] Add monitoring middleware
  - [ ] Mount routes
  - [ ] Test: Server starts correctly

- [ ] **Task 6**: Create monitoring dashboard
  - [ ] Test dashboard endpoint
  - [ ] Verify all data sources
  - [ ] Check response time
  - [ ] Document API

- [ ] **Task 7**: Deploy and monitor
  - [ ] Deploy to production
  - [ ] Set up monitoring alerts
  - [ ] Create runbook
  - [ ] Document for ops team

- [ ] **Task 8**: Rollback plan
  - [ ] Commit: `git commit -m "P3: Advanced monitoring and analytics"`
  - [ ] Tag: `git tag v1.0.0-deterministic-p3`
  - [ ] Document: Monitoring configuration
```

---

Let me create the test suite in the next message due to length constraints.