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
