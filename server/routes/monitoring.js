/**
 * Monitoring and Analytics Routes Module
 * Phase 4 Enhancement: Comprehensive monitoring endpoints
 *
 * Endpoints:
 * - GET /api/monitoring/health - Health check
 * - GET /api/monitoring/health/simple - Simple health check
 * - GET /api/monitoring/metrics - Real-time metrics
 * - GET /api/monitoring/system - System resources
 * - GET /api/monitoring/sla - SLA compliance
 * - GET /api/monitoring/dashboard - Complete dashboard data
 * - GET /api/monitoring/analytics/summary - Analytics summary
 * - GET /api/monitoring/analytics/overall - Overall analytics
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
        errorRate: metricsData.requests.total > 0 ?
          ((metricsData.requests.failed / metricsData.requests.total) * 100).toFixed(2) : '0.00',
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
