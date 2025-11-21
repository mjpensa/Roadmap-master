/**
 * Storage Management Module
 * In-Memory Storage (No Database Persistence)
 *
 * IMPORTANT: Data is stored in memory only and will be lost on server restart.
 * Charts and sessions expire after 1 hour.
 *
 * For persistent storage across restarts, consider:
 * - Railway Postgres plugin
 * - External database (Supabase, Neon, Turso)
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
    let sessionsDeleted = 0;
    let chartsDeleted = 0;
    let jobsDeleted = 0;

    // Clean expired sessions
    for (const [sessionId, session] of sessionStore.entries()) {
      if (now > session.expiresAt) {
        sessionStore.delete(sessionId);
        sessionsDeleted++;
      }
    }

    // Clean expired charts
    for (const [chartId, chart] of chartStore.entries()) {
      if (now > chart.expiresAt) {
        chartStore.delete(chartId);
        chartsDeleted++;
      }
    }

    // Clean old jobs (older than 1 hour)
    const oneHourAgo = now - CONFIG.STORAGE.EXPIRATION_MS;
    for (const [jobId, job] of jobStore.entries()) {
      if (job.createdAt < oneHourAgo) {
        jobStore.delete(jobId);
        jobsDeleted++;
      }
    }

    // ✨ PHASE 3: Clean up old partial results
    const partialResultsDeleted = cleanupPartialResults();

    // Log cleanup results
    if (sessionsDeleted > 0 || chartsDeleted > 0 || jobsDeleted > 0 || partialResultsDeleted > 0) {
      console.log('\n📊 Cleanup Summary:');
      console.log(`  - Expired sessions: ${sessionsDeleted}`);
      console.log(`  - Expired charts: ${chartsDeleted}`);
      console.log(`  - Expired jobs: ${jobsDeleted}`);
      console.log(`  - Expired partial results: ${partialResultsDeleted}`);
      console.log(`  - Total items cleaned: ${chartsDeleted + sessionsDeleted + jobsDeleted + partialResultsDeleted}`);
    }

    // Log current storage state
    console.log('\n💾 In-Memory Storage State:');
    console.log(`  - Active sessions: ${sessionStore.size}`);
    console.log(`  - Active charts: ${chartStore.size}`);
    console.log(`  - Active jobs: ${jobStore.size}`);
    console.log(`  - Active partial results: ${partialResultsStore.size}`);
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
  const now = Date.now();
  const expiresAt = now + CONFIG.STORAGE.EXPIRATION_MS;

  console.log(`[Storage] Creating in-memory session ${sessionId} with ${researchFiles.length} files`);
  console.log(`[Storage] Research text length: ${researchText.length} characters`);
  console.log(`[Storage] Expires in: ${CONFIG.STORAGE.EXPIRATION_MS / 1000 / 60} minutes`);

  sessionStore.set(sessionId, {
    researchText,
    researchFiles,
    createdAt: now,
    expiresAt
  });

  console.log(`✅ Session ${sessionId} created in memory`);

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

  // Check if expired
  if (Date.now() > session.expiresAt) {
    sessionStore.delete(sessionId);
    return null;
  }

  return {
    researchText: session.researchText,
    researchFiles: session.researchFiles,
    createdAt: session.createdAt
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
  const now = Date.now();
  const expiresAt = now + CONFIG.STORAGE.EXPIRATION_MS;

  console.log(`💾 Storing chart in memory with ID: ${chartId}`);
  console.log(`📊 Chart data keys:`, Object.keys(ganttData || {}));
  console.log(`📊 TimeColumns count:`, ganttData?.ganttData?.timeColumns?.length || 0);
  console.log(`📊 Tasks count:`, ganttData?.ganttData?.data?.length || 0);

  // Extract components from the chart data
  const gantt = ganttData.ganttData || ganttData;
  const executiveSummary = ganttData.executiveSummary || null;
  const presentationSlides = ganttData.presentationSlides || null;

  chartStore.set(chartId, {
    data: {
      ...gantt,
      executiveSummary,
      presentationSlides
    },
    sessionId,
    createdAt: now,
    expiresAt
  });

  console.log(`✅ Chart ${chartId} stored successfully in memory (expires in 1 hour)`);

  return chartId;
}

/**
 * Retrieves chart data by ID
 * @param {string} chartId - The chart ID
 * @returns {Object|null} The chart data or null if not found
 */
export function getChart(chartId) {
  const chart = chartStore.get(chartId);

  if (!chart) {
    console.log(`❌ Chart ${chartId} not found in memory`);
    return null;
  }

  // Check if expired
  if (Date.now() > chart.expiresAt) {
    chartStore.delete(chartId);
    console.log(`❌ Chart ${chartId} has expired`);
    return null;
  }

  console.log(`📊 Retrieved chart ${chartId} from memory`);
  console.log(`  - ganttData has timeColumns:`, chart.data?.timeColumns ? 'yes' : 'no');
  console.log(`  - ganttData has data:`, chart.data?.data ? 'yes' : 'no');

  return chart;
}

/**
 * Updates chart data by ID
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

  // Check if expired
  if (Date.now() > existing.expiresAt) {
    chartStore.delete(chartId);
    return false;
  }

  // Extract components from updated data
  const gantt = updatedData.ganttData || updatedData;
  const executiveSummary = updatedData.executiveSummary || existing.data.executiveSummary;
  const presentationSlides = updatedData.presentationSlides || existing.data.presentationSlides;

  chartStore.set(chartId, {
    data: {
      ...gantt,
      executiveSummary,
      presentationSlides
    },
    sessionId: existing.sessionId,
    createdAt: existing.createdAt,
    expiresAt: existing.expiresAt
  });

  console.log(`✅ Chart ${chartId} updated successfully in memory`);
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
  const now = Date.now();

  jobStore.set(jobId, {
    status: 'queued',
    progress: 'Request received, starting processing...',
    createdAt: now
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
  const job = jobStore.get(jobId);

  if (!job) {
    return null;
  }

  return job;
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
 * Gets charts by session ID
 * @param {string} sessionId - The session ID
 * @returns {Array} Array of chart metadata
 */
export function getChartsBySession(sessionId) {
  const charts = [];

  for (const [chartId, chart] of chartStore.entries()) {
    if (chart.sessionId === sessionId && Date.now() <= chart.expiresAt) {
      charts.push({
        chartId,
        createdAt: chart.createdAt,
        expiresAt: chart.expiresAt
      });
    }
  }

  return charts;
}

/**
 * Gets in-memory storage statistics
 * @returns {Object} Storage statistics
 */
export function getStorageStats() {
  return {
    sessions: sessionStore.size,
    charts: chartStore.size,
    jobs: jobStore.size,
    partialResults: partialResultsStore.size,
    type: 'in-memory',
    persistent: false
  };
}

// ═══════════════════════════════════════════════════════════
// ✨ PHASE 3 ENHANCEMENT: PARTIAL RESULT CACHING
// ═══════════════════════════════════════════════════════════
/**
 * Storage for partial/intermediate results during chart generation
 * Allows resuming from last successful phase if a stage fails
 *
 * Use cases:
 * - Chart generation succeeds, but executive summary fails → resume from summary
 * - Chart and summary succeed, but slides fail → resume from slides
 *
 * Structure: Map<jobId, { ganttData?, executiveSummary?, presentationSlides?, timestamp }>
 */
const partialResultsStore = new Map();

/**
 * Stores partial result for a specific job phase
 * @param {string} jobId - The job ID
 * @param {string} phase - Phase name ('ganttData', 'executiveSummary', 'presentationSlides')
 * @param {Object} data - The phase result data
 */
export function storePartialResult(jobId, phase, data) {
  if (!jobId || !phase || !data) {
    console.warn('[Partial Cache] Invalid parameters for storePartialResult');
    return;
  }

  // Get existing partial results or create new entry
  const existing = partialResultsStore.get(jobId) || {
    jobId,
    timestamp: Date.now()
  };

  // Store the phase result
  existing[phase] = data;
  existing.lastUpdated = Date.now();

  partialResultsStore.set(jobId, existing);

  console.log(`[Partial Cache] Stored ${phase} for job ${jobId}`);
  console.log(`[Partial Cache] Current phases: ${Object.keys(existing).filter(k => !['jobId', 'timestamp', 'lastUpdated'].includes(k)).join(', ')}`);
}

/**
 * Retrieves partial results for a job
 * @param {string} jobId - The job ID
 * @returns {Object|null} Partial results object or null if not found
 */
export function getPartialResults(jobId) {
  const partials = partialResultsStore.get(jobId);

  if (!partials) {
    console.log(`[Partial Cache] No partial results found for job ${jobId}`);
    return null;
  }

  console.log(`[Partial Cache] Retrieved partial results for job ${jobId}`);
  console.log(`[Partial Cache] Available phases: ${Object.keys(partials).filter(k => !['jobId', 'timestamp', 'lastUpdated'].includes(k)).join(', ')}`);

  return partials;
}

/**
 * Checks if a specific phase result is cached
 * @param {string} jobId - The job ID
 * @param {string} phase - Phase name ('ganttData', 'executiveSummary', 'presentationSlides')
 * @returns {boolean} True if phase is cached
 */
export function hasPartialResult(jobId, phase) {
  const partials = partialResultsStore.get(jobId);
  return partials && partials[phase] !== undefined;
}

/**
 * Clears partial results for a job (call after successful completion)
 * @param {string} jobId - The job ID
 */
export function clearPartialResults(jobId) {
  const deleted = partialResultsStore.delete(jobId);

  if (deleted) {
    console.log(`[Partial Cache] Cleared partial results for job ${jobId}`);
  } else {
    console.log(`[Partial Cache] No partial results to clear for job ${jobId}`);
  }
}

/**
 * Gets summary of all partial results (for monitoring/debugging)
 * @returns {Array} Array of partial result summaries
 */
export function getPartialResultsSummary() {
  const summary = [];

  for (const [jobId, partials] of partialResultsStore.entries()) {
    const phases = Object.keys(partials).filter(k => !['jobId', 'timestamp', 'lastUpdated'].includes(k));
    const age = Date.now() - partials.timestamp;

    summary.push({
      jobId,
      phases,
      phaseCount: phases.length,
      ageMs: age,
      ageMinutes: Math.round(age / 60000),
      lastUpdated: partials.lastUpdated
    });
  }

  return summary;
}

/**
 * Cleans up old partial results (older than 1 hour)
 * Called by the cleanup interval
 */
export function cleanupPartialResults() {
  const oneHourAgo = Date.now() - CONFIG.STORAGE.EXPIRATION_MS;
  let deleted = 0;

  for (const [jobId, partials] of partialResultsStore.entries()) {
    if (partials.timestamp < oneHourAgo) {
      partialResultsStore.delete(jobId);
      deleted++;
    }
  }

  if (deleted > 0) {
    console.log(`[Partial Cache] Cleaned up ${deleted} expired partial result(s)`);
  }

  return deleted;
}

// ═══════════════════════════════════════════════════════════
// END PHASE 3 ENHANCEMENT
// ═══════════════════════════════════════════════════════════
