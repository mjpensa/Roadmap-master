/**
 * Storage Management Module
 * Phase 4 Enhancement: Extracted from server.js
 * Feature #8: Migrated to SQLite database for persistent storage
 *
 * This module now acts as an adapter between the existing API
 * and the new database storage layer, maintaining backward compatibility.
 */

import crypto from 'crypto';
import { CONFIG } from './config.js';
import * as db from './database.js';

/**
 * Starts the cleanup interval for expired sessions, charts, and jobs
 * Enhanced with database cleanup
 */
export function startCleanupInterval() {
  setInterval(() => {
    const stats = db.cleanupExpired();
    const dbStats = db.getStats();

    // Log cleanup results
    if (stats.chartsDeleted > 0 || stats.sessionsDeleted > 0 || stats.jobsDeleted > 0) {
      console.log('\n📊 Cleanup Summary:');
      console.log(`  - Expired sessions: ${stats.sessionsDeleted}`);
      console.log(`  - Expired charts: ${stats.chartsDeleted}`);
      console.log(`  - Expired jobs: ${stats.jobsDeleted}`);
      console.log(`  - Total items cleaned: ${stats.chartsDeleted + stats.sessionsDeleted + stats.jobsDeleted}`);
    }

    // Log current storage state
    console.log('\n💾 Storage State:');
    console.log(`  - Active sessions: ${dbStats.sessions}`);
    console.log(`  - Active charts: ${dbStats.charts}`);
    console.log(`  - Active jobs: ${dbStats.jobs}`);
    console.log(`  - Database size: ${dbStats.dbSizeKB} KB`);
    console.log(`  - Storage health: ✅ Good\n`);

  }, CONFIG.STORAGE.CLEANUP_INTERVAL_MS);

  console.log(`✅ Storage cleanup interval started (every ${CONFIG.STORAGE.CLEANUP_INTERVAL_MS / 1000 / 60} minutes)`);
}

/**
 * SESSION MANAGEMENT
 */

/**
 * Creates a new session with research data
 * @param {string} researchText - The combined research text
 * @param {Array<string>} researchFiles - Array of filename strings
 * @returns {string} The session ID
 */
export function createSession(researchText, researchFiles) {
  const sessionId = crypto.randomBytes(16).toString('hex');

  // Convert expiration from CONFIG (1 hour) to days for database
  const expirationDays = CONFIG.STORAGE.EXPIRATION_MS / (24 * 60 * 60 * 1000);

  db.createSession(sessionId, researchText, researchFiles, expirationDays);

  console.log(`✅ Session ${sessionId} created in database`);

  return sessionId;
}

/**
 * Retrieves session data by ID
 * @param {string} sessionId - The session ID
 * @returns {Object|null} The session data or null if not found
 */
export function getSession(sessionId) {
  const session = db.getSession(sessionId);

  if (!session) {
    return null;
  }

  // Transform database format to match original interface
  return {
    researchText: session.research,
    researchFiles: session.filenames,
    createdAt: session.createdAt.getTime()
  };
}

/**
 * CHART MANAGEMENT
 */

/**
 * Stores a chart with a unique ID
 * @param {Object} ganttData - The chart data (includes ganttData, executiveSummary, presentationSlides)
 * @param {string} sessionId - Associated session ID
 * @returns {string} The chart ID
 */
export function storeChart(ganttData, sessionId) {
  const chartId = crypto.randomBytes(16).toString('hex');

  console.log(`💾 Storing chart with ID: ${chartId}`);
  console.log(`📊 Chart data keys:`, Object.keys(ganttData || {}));
  console.log(`📊 TimeColumns count:`, ganttData?.ganttData?.timeColumns?.length || 0);
  console.log(`📊 Tasks count:`, ganttData?.ganttData?.data?.length || 0);

  // Extract components from the chart data
  const gantt = ganttData.ganttData || ganttData;
  const executiveSummary = ganttData.executiveSummary || null;
  const presentationSlides = ganttData.presentationSlides || null;

  // Use default 30-day expiration from database module
  // Don't pass expirationDays parameter to use DEFAULT_EXPIRATION_DAYS (30 days)
  db.saveChart(chartId, sessionId, gantt, executiveSummary, presentationSlides);

  console.log(`✅ Chart ${chartId} stored successfully in database with 30-day expiration`);

  return chartId;
}

/**
 * Retrieves chart data by ID
 * @param {string} chartId - The chart ID
 * @returns {Object|null} The chart data or null if not found
 */
export function getChart(chartId) {
  const chart = db.getChart(chartId);

  if (!chart) {
    return null;
  }

  // Transform database format to match original interface
  // Spread ganttData properties to flatten the structure
  return {
    data: {
      ...chart.ganttData,
      executiveSummary: chart.executiveSummary,
      presentationSlides: chart.presentationSlides
    },
    sessionId: chart.sessionId,
    created: chart.createdAt.getTime()
  };
}

/**
 * Phase 6: Updates chart data by ID
 * @param {string} chartId - The chart ID
 * @param {Object} updatedData - The updated chart data
 * @returns {boolean} True if successful, false if chart not found
 */
export function updateChart(chartId, updatedData) {
  const existing = db.getChart(chartId);

  if (!existing) {
    console.warn(`Attempted to update non-existent chart: ${chartId}`);
    return false;
  }

  // Extract components from updated data
  const gantt = updatedData.ganttData || updatedData;
  const executiveSummary = updatedData.executiveSummary || existing.executiveSummary;
  const presentationSlides = updatedData.presentationSlides || existing.presentationSlides;

  // Calculate remaining expiration time
  const expiresAt = existing.expiresAt || new Date(Date.now() + CONFIG.STORAGE.EXPIRATION_MS);
  const expirationDays = (expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000);

  // Save updated chart (INSERT OR REPLACE)
  db.saveChart(chartId, existing.sessionId, gantt, executiveSummary, presentationSlides, Math.max(expirationDays, 0.01));

  console.log(`✅ Chart ${chartId} updated successfully in database`);
  return true;
}

/**
 * JOB MANAGEMENT
 */

/**
 * Creates a new job with queued status
 * @returns {string} The job ID
 */
export function createJob() {
  const jobId = crypto.randomBytes(16).toString('hex');
  db.createJob(jobId, 'queued', 'Request received, starting processing...');
  return jobId;
}

/**
 * Updates job status and progress
 * @param {string} jobId - The job ID
 * @param {Object} updates - Object with status, progress, data, or error fields
 */
export function updateJob(jobId, updates) {
  const existingJob = db.getJob(jobId);

  if (!existingJob) {
    console.warn(`Attempted to update non-existent job: ${jobId}`);
    return;
  }

  // Transform updates to database format
  const dbUpdates = {};

  if (updates.status !== undefined) {
    dbUpdates.status = updates.status;
  }
  if (updates.progress !== undefined) {
    dbUpdates.progress = updates.progress;
  }
  if (updates.error !== undefined) {
    dbUpdates.error = updates.error;
  }
  // Note: 'data' field is now stored as chartId
  if (updates.data !== undefined && updates.data.chartId) {
    dbUpdates.chartId = updates.data.chartId;
  }

  db.updateJob(jobId, dbUpdates);
}

/**
 * Retrieves job data by ID
 * @param {string} jobId - The job ID
 * @returns {Object|null} The job data or null if not found
 */
export function getJob(jobId) {
  const job = db.getJob(jobId);

  if (!job) {
    return null;
  }

  // Transform database format to match original interface
  const result = {
    status: job.status,
    progress: job.progress,
    createdAt: job.createdAt.getTime()
  };

  // If job is complete and has a chartId, fetch the full chart data
  if (job.chartId && job.status === 'complete') {
    const chart = db.getChart(job.chartId);
    if (chart) {
      // Return the full chart data structure expected by the frontend
      result.data = {
        ...chart.ganttData,
        executiveSummary: chart.executiveSummary,
        presentationSlides: chart.presentationSlides,
        sessionId: chart.sessionId,
        chartId: job.chartId
      };
    } else {
      // Chart not found, just return chartId
      result.data = { chartId: job.chartId };
    }
  } else if (job.chartId) {
    // Job not complete yet, or error - just return chartId
    result.data = { chartId: job.chartId };
  }

  if (job.error) {
    result.error = job.error;
  }

  return result;
}

/**
 * Marks a job as complete with result data
 * @param {string} jobId - The job ID
 * @param {Object} data - The result data
 */
export function completeJob(jobId, data) {
  updateJob(jobId, {
    status: 'complete',
    progress: 'Chart generated successfully!',
    data: data
  });
}

/**
 * Marks a job as failed with error message
 * @param {string} jobId - The job ID
 * @param {string} errorMessage - The error message
 */
export function failJob(jobId, errorMessage) {
  updateJob(jobId, {
    status: 'error',
    error: errorMessage || 'Unknown error occurred'
  });
}

/**
 * Gets charts by session ID (NEW for Feature #8)
 * @param {string} sessionId - The session ID
 * @returns {Array} Array of chart metadata
 */
export function getChartsBySession(sessionId) {
  return db.getChartsBySession(sessionId);
}

/**
 * Gets database statistics (NEW for Feature #8)
 * @returns {Object} Database statistics
 */
export function getStorageStats() {
  return db.getStats();
}
