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
 */
export function startCleanupInterval() {
  setInterval(() => {
    const now = Date.now();
    const expirationMs = CONFIG.STORAGE.EXPIRATION_MS;

    // Clean up expired sessions
    for (const [sessionId, session] of sessionStore.entries()) {
      if (now - session.createdAt > expirationMs) {
        sessionStore.delete(sessionId);
        console.log(`Cleaned up expired session: ${sessionId}`);
      }
    }

    // Clean up expired charts
    for (const [chartId, chart] of chartStore.entries()) {
      if (now - chart.created > expirationMs) {
        chartStore.delete(chartId);
        console.log(`Cleaned up expired chart: ${chartId}`);
      }
    }

    // Clean up old jobs
    for (const [jobId, job] of jobStore.entries()) {
      if (now - job.createdAt > expirationMs) {
        jobStore.delete(jobId);
        console.log(`Cleaned up expired job: ${jobId}`);
      }
    }
  }, CONFIG.STORAGE.CLEANUP_INTERVAL_MS);
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
