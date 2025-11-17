/**
 * Storage Management Module
 * Phase 4 Enhancement: Extracted from server.js
 * Manages session, chart, and job storage with automatic cleanup
 */

import crypto from 'crypto';
import { CONFIG } from './config.js';

// In-memory storage maps
const sessionStore = new Map();
const chartStore = new Map();
const jobStore = new Map();

/**
 * Starts the cleanup interval for expired sessions, charts, and jobs
 * Enhanced with orphan detection and memory leak prevention
 */
export function startCleanupInterval() {
  setInterval(() => {
    const now = Date.now();
    const expirationMs = CONFIG.STORAGE.EXPIRATION_MS;

    // Track cleanup statistics
    let expiredSessions = 0;
    let expiredCharts = 0;
    let orphanedCharts = 0;
    let expiredJobs = 0;
    let completedJobs = 0;

    // Set to track active sessions
    const activeSessions = new Set();
    const orphanedChartIds = new Set();

    // Step 1: Clean up expired sessions and track active ones
    for (const [sessionId, session] of sessionStore.entries()) {
      if (now - session.createdAt > expirationMs) {
        sessionStore.delete(sessionId);
        expiredSessions++;
        console.log(`🗑️  Cleaned up expired session: ${sessionId}`);
      } else {
        activeSessions.add(sessionId);
      }
    }

    // Step 2: Clean up expired AND orphaned charts
    for (const [chartId, chart] of chartStore.entries()) {
      const isExpired = now - chart.created > expirationMs;
      const isOrphaned = chart.sessionId && !activeSessions.has(chart.sessionId);

      if (isExpired) {
        chartStore.delete(chartId);
        expiredCharts++;
        console.log(`🗑️  Cleaned up expired chart: ${chartId}`);
      } else if (isOrphaned) {
        chartStore.delete(chartId);
        orphanedCharts++;
        orphanedChartIds.add(chartId);
        console.log(`🗑️  Cleaned up orphaned chart: ${chartId} (session ${chart.sessionId} no longer exists)`);
      }
    }

    // Step 3: Clean up old jobs (both expired and completed/failed)
    // Completed/failed jobs should be cleaned up faster than active jobs
    const jobRetentionMs = 10 * 60 * 1000; // 10 minutes for completed/failed jobs

    for (const [jobId, job] of jobStore.entries()) {
      const age = now - job.createdAt;
      const isExpired = age > expirationMs;
      const isCompleted = (job.status === 'complete' || job.status === 'error' || job.status === 'failed');
      const isStaleCompleted = isCompleted && age > jobRetentionMs;

      if (isExpired) {
        jobStore.delete(jobId);
        expiredJobs++;
        console.log(`🗑️  Cleaned up expired job: ${jobId}`);
      } else if (isStaleCompleted) {
        jobStore.delete(jobId);
        completedJobs++;
        console.log(`🗑️  Cleaned up stale ${job.status} job: ${jobId}`);
      }
    }

    // Step 4: Log cleanup statistics
    const totalCleaned = expiredSessions + expiredCharts + orphanedCharts + expiredJobs + completedJobs;

    if (totalCleaned > 0) {
      console.log('\n📊 Cleanup Summary:');
      console.log(`  - Expired sessions: ${expiredSessions}`);
      console.log(`  - Expired charts: ${expiredCharts}`);
      console.log(`  - Orphaned charts: ${orphanedCharts}`);
      console.log(`  - Expired jobs: ${expiredJobs}`);
      console.log(`  - Stale completed jobs: ${completedJobs}`);
      console.log(`  - Total items cleaned: ${totalCleaned}`);
    }

    // Log current storage state
    console.log('\n💾 Storage State:');
    console.log(`  - Active sessions: ${sessionStore.size}`);
    console.log(`  - Active charts: ${chartStore.size}`);
    console.log(`  - Active jobs: ${jobStore.size}`);
    console.log(`  - Memory health: ${totalCleaned === 0 ? '✅ Good' : '⚠️  Cleaned up'}\n`);

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
  sessionStore.set(sessionId, {
    researchText,
    researchFiles,
    createdAt: Date.now()
  });
  return sessionId;
}

/**
 * Retrieves session data by ID
 * @param {string} sessionId - The session ID
 * @returns {Object|null} The session data or null if not found
 */
export function getSession(sessionId) {
  const session = sessionStore.get(sessionId);
  if (!session) {
    return null;
  }
  return session;
}

/**
 * CHART MANAGEMENT
 */

/**
 * Stores a chart with a unique ID
 * @param {Object} ganttData - The chart data
 * @param {string} sessionId - Associated session ID
 * @returns {string} The chart ID
 */
export function storeChart(ganttData, sessionId) {
  const chartId = crypto.randomBytes(16).toString('hex');

  console.log(`💾 Storing chart with ID: ${chartId}`);
  console.log(`📊 Chart data keys:`, Object.keys(ganttData || {}));
  console.log(`📊 TimeColumns count:`, ganttData?.timeColumns?.length || 0);
  console.log(`📊 Tasks count:`, ganttData?.data?.length || 0);

  chartStore.set(chartId, {
    data: ganttData,
    sessionId: sessionId,
    created: Date.now()
  });

  console.log(`✅ Chart ${chartId} stored successfully. Total charts in storage: ${chartStore.size}`);

  return chartId;
}

/**
 * Retrieves chart data by ID
 * @param {string} chartId - The chart ID
 * @returns {Object|null} The chart data or null if not found
 */
export function getChart(chartId) {
  return chartStore.get(chartId) || null;
}

/**
 * Phase 6: Updates chart data by ID
 * @param {string} chartId - The chart ID
 * @param {Object} updatedData - The updated chart data
 * @returns {boolean} True if successful, false if chart not found
 */
export function updateChart(chartId, updatedData) {
  const existing = chartStore.get(chartId);
  if (!existing) {
    console.warn(`Attempted to update non-existent chart: ${chartId}`);
    return false;
  }

  chartStore.set(chartId, {
    ...existing,
    data: updatedData,
    lastModified: Date.now()
  });

  console.log(`✅ Chart ${chartId} updated successfully`);
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
  jobStore.set(jobId, {
    status: 'queued',
    progress: 'Request received, starting processing...',
    createdAt: Date.now()
  });
  return jobId;
}

/**
 * Updates job status and progress
 * @param {string} jobId - The job ID
 * @param {Object} updates - Object with status, progress, data, or error fields
 */
export function updateJob(jobId, updates) {
  const existingJob = jobStore.get(jobId);
  if (!existingJob) {
    console.warn(`Attempted to update non-existent job: ${jobId}`);
    return;
  }

  jobStore.set(jobId, {
    ...existingJob,
    ...updates
  });
}

/**
 * Retrieves job data by ID
 * @param {string} jobId - The job ID
 * @returns {Object|null} The job data or null if not found
 */
export function getJob(jobId) {
  return jobStore.get(jobId) || null;
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
  const existingJob = jobStore.get(jobId);
  updateJob(jobId, {
    status: 'error',
    error: errorMessage || 'Unknown error occurred',
    createdAt: existingJob?.createdAt || Date.now()
  });
}
