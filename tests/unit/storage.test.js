/**
 * Unit Tests for server/storage.js
 * Tests in-memory storage functionality
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import {
  createSession,
  getSession,
  storeChart,
  getChart,
  updateChart,
  createJob,
  getJob,
  updateJob
} from '../../server/storage.js';

describe('Storage - Session Management', () => {
  test('should create and retrieve session data', () => {
    const researchText = 'Test research content';
    const researchFiles = ['test.md', 'data.txt'];

    const sessionId = createSession(researchText, researchFiles);

    expect(sessionId).toBeTruthy();
    expect(typeof sessionId).toBe('string');
    expect(sessionId.length).toBe(32); // 16 bytes = 32 hex chars

    const retrieved = getSession(sessionId);
    expect(retrieved).toBeTruthy();
    expect(retrieved.researchText).toBe(researchText);
    expect(retrieved.researchFiles).toEqual(researchFiles);
    expect(retrieved.createdAt).toBeDefined();
  });

  test('should return null for non-existent session', () => {
    expect(getSession('nonexistent')).toBeNull();
  });

  test('should create unique session IDs', () => {
    const ids = new Set();
    for (let i = 0; i < 100; i++) {
      const sessionId = createSession('test', []);
      ids.add(sessionId);
    }
    expect(ids.size).toBe(100);
  });
});

describe('Storage - Chart Management', () => {
  test('should store and retrieve chart data', () => {
    const ganttData = {
      title: 'Test Chart',
      timeColumns: ['Q1', 'Q2'],
      data: []
    };
    const sessionId = 'test_session_123';

    const chartId = storeChart(ganttData, sessionId);

    expect(chartId).toBeTruthy();
    expect(typeof chartId).toBe('string');
    expect(chartId.length).toBe(32);

    const retrieved = getChart(chartId);
    expect(retrieved).toBeTruthy();
    expect(retrieved.data).toEqual(ganttData);
    expect(retrieved.sessionId).toBe(sessionId);
    expect(retrieved.created).toBeDefined();
  });

  test('should update existing chart', () => {
    const originalData = { title: 'Original', timeColumns: [], data: [] };
    const updatedData = { title: 'Updated', timeColumns: ['Q1'], data: [] };

    const chartId = storeChart(originalData, 'session1');
    const success = updateChart(chartId, updatedData);

    expect(success).toBe(true);

    const retrieved = getChart(chartId);
    expect(retrieved.data.title).toBe('Updated');
    expect(retrieved.lastModified).toBeDefined();
  });

  test('should fail to update non-existent chart', () => {
    const success = updateChart('nonexistent', { title: 'Test' });
    expect(success).toBe(false);
  });

  test('should return null for non-existent chart', () => {
    expect(getChart('nonexistent')).toBeNull();
  });

  test('should create unique chart IDs', () => {
    const ids = new Set();
    for (let i = 0; i < 100; i++) {
      const chartId = storeChart({ title: 'Test' }, 'session');
      ids.add(chartId);
    }
    expect(ids.size).toBe(100);
  });
});

describe('Storage - Job Management', () => {
  test('should create job with queued status', () => {
    const jobId = createJob();

    expect(jobId).toBeTruthy();
    expect(typeof jobId).toBe('string');
    expect(jobId.length).toBe(32);

    const job = getJob(jobId);
    expect(job).toBeTruthy();
    expect(job.status).toBe('queued');
    expect(job.progress).toBeDefined();
    expect(job.createdAt).toBeDefined();
  });

  test('should update job status', () => {
    const jobId = createJob();

    updateJob(jobId, {
      status: 'processing',
      progress: 'Analyzing research...'
    });

    const job = getJob(jobId);
    expect(job.status).toBe('processing');
    expect(job.progress).toBe('Analyzing research...');
  });

  test('should return null for non-existent job', () => {
    expect(getJob('nonexistent')).toBeNull();
  });

  test('should create unique job IDs', () => {
    const ids = new Set();
    for (let i = 0; i < 100; i++) {
      const jobId = createJob();
      ids.add(jobId);
    }
    expect(ids.size).toBe(100);
  });

  test('should handle complete job update', () => {
    const jobId = createJob();

    updateJob(jobId, {
      status: 'complete',
      progress: 'Chart generated successfully!',
      data: { chartId: 'abc123' }
    });

    const job = getJob(jobId);
    expect(job.status).toBe('complete');
    expect(job.data).toBeDefined();
    expect(job.data.chartId).toBe('abc123');
  });
});
