/**
 * Database Module
 * Handles persistent storage using SQLite
 * Feature #8: Data Persistence & Sharing
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database file path (parent directory of server/)
const DB_PATH = path.join(__dirname, '..', 'roadmap.db');

// Default expiration: 30 days
const DEFAULT_EXPIRATION_DAYS = 30;

/**
 * Initialize the database connection
 * @returns {Database} SQLite database instance
 */
function initializeDatabase() {
  // Create database file if it doesn't exist
  const db = new Database(DB_PATH, { verbose: console.log });

  // Enable WAL mode for better concurrency
  db.pragma('journal_mode = WAL');

  // Create tables if they don't exist
  createTables(db);

  console.log(`✓ Database initialized at ${DB_PATH}`);
  return db;
}

/**
 * Create database tables
 * @param {Database} db - SQLite database instance
 */
function createTables(db) {
  // Sessions table - stores research context for task analysis
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sessionId TEXT UNIQUE NOT NULL,
      research TEXT NOT NULL,
      filenames TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      expiresAt INTEGER NOT NULL
    )
  `);

  // Charts table - stores generated charts
  db.exec(`
    CREATE TABLE IF NOT EXISTS charts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chartId TEXT UNIQUE NOT NULL,
      sessionId TEXT NOT NULL,
      ganttData TEXT NOT NULL,
      executiveSummary TEXT,
      presentationSlides TEXT,
      createdAt INTEGER NOT NULL,
      expiresAt INTEGER NOT NULL,
      FOREIGN KEY (sessionId) REFERENCES sessions(sessionId)
    )
  `);

  // Jobs table - stores async job status
  db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      jobId TEXT UNIQUE NOT NULL,
      status TEXT NOT NULL,
      progress TEXT,
      chartId TEXT,
      error TEXT,
      createdAt INTEGER NOT NULL
    )
  `);

  // Create indices for faster lookups
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_sessions_sessionId ON sessions(sessionId);
    CREATE INDEX IF NOT EXISTS idx_charts_chartId ON charts(chartId);
    CREATE INDEX IF NOT EXISTS idx_charts_sessionId ON charts(sessionId);
    CREATE INDEX IF NOT EXISTS idx_jobs_jobId ON jobs(jobId);
    CREATE INDEX IF NOT EXISTS idx_sessions_expiresAt ON sessions(expiresAt);
    CREATE INDEX IF NOT EXISTS idx_charts_expiresAt ON charts(expiresAt);
  `);

  console.log('✓ Database tables created');
}

/**
 * Database singleton instance
 */
let db = null;

/**
 * Get database instance (creates if doesn't exist)
 * @returns {Database}
 */
export function getDatabase() {
  if (!db) {
    db = initializeDatabase();
  }
  return db;
}

/**
 * SESSION OPERATIONS
 */

/**
 * Create a new session
 * @param {string} sessionId - Unique session ID
 * @param {string} research - Research content
 * @param {string[]} filenames - Array of filenames
 * @param {number} expirationDays - Days until expiration (default: 30)
 * @returns {object} Created session
 */
export function createSession(sessionId, research, filenames, expirationDays = DEFAULT_EXPIRATION_DAYS) {
  const db = getDatabase();
  const now = Date.now();
  const expiresAt = now + (expirationDays * 24 * 60 * 60 * 1000);

  const stmt = db.prepare(`
    INSERT INTO sessions (sessionId, research, filenames, createdAt, expiresAt)
    VALUES (?, ?, ?, ?, ?)
  `);

  stmt.run(sessionId, research, JSON.stringify(filenames), now, expiresAt);

  return {
    sessionId,
    research,
    filenames,
    createdAt: new Date(now),
    expiresAt: new Date(expiresAt)
  };
}

/**
 * Get session by ID
 * @param {string} sessionId - Session ID
 * @returns {object|null} Session data or null if not found
 */
export function getSession(sessionId) {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM sessions WHERE sessionId = ?');
  const row = stmt.get(sessionId);

  if (!row) return null;

  return {
    sessionId: row.sessionId,
    research: row.research,
    filenames: JSON.parse(row.filenames),
    createdAt: new Date(row.createdAt)
  };
}

/**
 * CHART OPERATIONS
 */

/**
 * Save a chart to database
 * @param {string} chartId - Unique chart ID
 * @param {string} sessionId - Associated session ID
 * @param {object} ganttData - Gantt chart data
 * @param {object} executiveSummary - Executive summary data
 * @param {object} presentationSlides - Presentation slides data
 * @param {number} expirationDays - Days until expiration (default: 30)
 * @returns {object} Saved chart metadata
 */
export function saveChart(chartId, sessionId, ganttData, executiveSummary, presentationSlides, expirationDays = DEFAULT_EXPIRATION_DAYS) {
  const db = getDatabase();
  const now = Date.now();
  const expiresAt = now + (expirationDays * 24 * 60 * 60 * 1000);

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO charts (chartId, sessionId, ganttData, executiveSummary, presentationSlides, createdAt, expiresAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    chartId,
    sessionId,
    JSON.stringify(ganttData),
    JSON.stringify(executiveSummary),
    JSON.stringify(presentationSlides),
    now,
    expiresAt
  );

  console.log(`✓ Chart saved to database: ${chartId}`);

  return {
    chartId,
    sessionId,
    createdAt: new Date(now),
    expiresAt: new Date(expiresAt)
  };
}

/**
 * Get chart by ID
 * @param {string} chartId - Chart ID
 * @returns {object|null} Chart data or null if not found
 */
export function getChart(chartId) {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM charts WHERE chartId = ?');
  const row = stmt.get(chartId);

  if (!row) return null;

  return {
    chartId: row.chartId,
    sessionId: row.sessionId,
    ganttData: JSON.parse(row.ganttData),
    executiveSummary: JSON.parse(row.executiveSummary),
    presentationSlides: JSON.parse(row.presentationSlides),
    createdAt: new Date(row.createdAt)
  };
}

/**
 * Get all charts for a session
 * @param {string} sessionId - Session ID
 * @returns {array} Array of chart metadata
 */
export function getChartsBySession(sessionId) {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT chartId, createdAt, expiresAt
    FROM charts
    WHERE sessionId = ?
    ORDER BY createdAt DESC
  `);

  const rows = stmt.all(sessionId);
  return rows.map(row => ({
    chartId: row.chartId,
    createdAt: new Date(row.createdAt),
    expiresAt: new Date(row.expiresAt)
  }));
}

/**
 * JOB OPERATIONS
 */

/**
 * Create a new job
 * @param {string} jobId - Unique job ID
 * @param {string} status - Job status
 * @param {string} progress - Progress message
 * @returns {object} Created job
 */
export function createJob(jobId, status = 'queued', progress = 'Starting...') {
  const db = getDatabase();
  const now = Date.now();

  const stmt = db.prepare(`
    INSERT INTO jobs (jobId, status, progress, createdAt)
    VALUES (?, ?, ?, ?)
  `);

  stmt.run(jobId, status, progress, now);

  return { jobId, status, progress, createdAt: new Date(now) };
}

/**
 * Update job status
 * @param {string} jobId - Job ID
 * @param {object} updates - Updates to apply
 */
export function updateJob(jobId, updates) {
  const db = getDatabase();

  const fields = [];
  const values = [];

  if (updates.status !== undefined) {
    fields.push('status = ?');
    values.push(updates.status);
  }
  if (updates.progress !== undefined) {
    fields.push('progress = ?');
    values.push(updates.progress);
  }
  if (updates.chartId !== undefined) {
    fields.push('chartId = ?');
    values.push(updates.chartId);
  }
  if (updates.error !== undefined) {
    fields.push('error = ?');
    values.push(updates.error);
  }

  if (fields.length === 0) return;

  values.push(jobId);

  const stmt = db.prepare(`
    UPDATE jobs
    SET ${fields.join(', ')}
    WHERE jobId = ?
  `);

  stmt.run(...values);
}

/**
 * Get job by ID
 * @param {string} jobId - Job ID
 * @returns {object|null} Job data or null if not found
 */
export function getJob(jobId) {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM jobs WHERE jobId = ?');
  const row = stmt.get(jobId);

  if (!row) return null;

  return {
    jobId: row.jobId,
    status: row.status,
    progress: row.progress,
    chartId: row.chartId,
    error: row.error,
    createdAt: new Date(row.createdAt)
  };
}

/**
 * Delete job by ID
 * @param {string} jobId - Job ID
 */
export function deleteJob(jobId) {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM jobs WHERE jobId = ?');
  stmt.run(jobId);
}

/**
 * CLEANUP OPERATIONS
 */

/**
 * Delete expired sessions and charts
 * @returns {object} Cleanup statistics
 */
export function cleanupExpired() {
  const db = getDatabase();
  const now = Date.now();

  // Delete expired charts
  const deleteChartsStmt = db.prepare('DELETE FROM charts WHERE expiresAt < ?');
  const chartsResult = deleteChartsStmt.run(now);

  // Delete expired sessions
  const deleteSessionsStmt = db.prepare('DELETE FROM sessions WHERE expiresAt < ?');
  const sessionsResult = deleteSessionsStmt.run(now);

  // Delete old jobs (older than 1 hour)
  const oneHourAgo = now - (60 * 60 * 1000);
  const deleteJobsStmt = db.prepare('DELETE FROM jobs WHERE createdAt < ?');
  const jobsResult = deleteJobsStmt.run(oneHourAgo);

  const stats = {
    chartsDeleted: chartsResult.changes,
    sessionsDeleted: sessionsResult.changes,
    jobsDeleted: jobsResult.changes
  };

  if (stats.chartsDeleted > 0 || stats.sessionsDeleted > 0 || stats.jobsDeleted > 0) {
    console.log('✓ Cleanup completed:', stats);
  }

  return stats;
}

/**
 * Get database statistics
 * @returns {object} Database statistics
 */
export function getStats() {
  const db = getDatabase();

  const sessionCount = db.prepare('SELECT COUNT(*) as count FROM sessions').get().count;
  const chartCount = db.prepare('SELECT COUNT(*) as count FROM charts').get().count;
  const jobCount = db.prepare('SELECT COUNT(*) as count FROM jobs').get().count;

  // Get database file size
  let dbSize = 0;
  try {
    const stats = fs.statSync(DB_PATH);
    dbSize = Math.round(stats.size / 1024); // KB
  } catch (error) {
    console.error('Error getting database size:', error);
  }

  return {
    sessions: sessionCount,
    charts: chartCount,
    jobs: jobCount,
    dbSizeKB: dbSize
  };
}

/**
 * Close database connection
 */
export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
    console.log('✓ Database connection closed');
  }
}

// Initialize database on module load
getDatabase();

// Export default cleanup interval (5 minutes)
export const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
