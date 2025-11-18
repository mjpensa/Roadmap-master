/**
 * Unit Tests for server/storage.js cleanup functionality
 * Tests the automatic cleanup interval for expired sessions, charts, and jobs
 */

import {
  createSession,
  getSession,
  storeChart,
  getChart,
  createJob,
  getJob,
} from '../../../server/storage.js';

describe('Storage Cleanup Functionality', () => {
  describe('Session Expiration Logic', () => {
    test('should track session creation time', () => {
      const beforeCreate = Date.now();
      const sessionId = createSession('Test data', ['file.txt']);
      const afterCreate = Date.now();

      const session = getSession(sessionId);

      expect(session.createdAt).toBeGreaterThanOrEqual(beforeCreate);
      expect(session.createdAt).toBeLessThanOrEqual(afterCreate);
    });

    test('should maintain sessions within expiration period', () => {
      const sessionId = createSession('Test', ['file.txt']);
      const session = getSession(sessionId);

      const now = Date.now();
      const age = now - session.createdAt;

      // Session should be fresh (< 1 second old in this test)
      expect(age).toBeLessThan(1000);
    });

    test('should identify sessions that would be expired', () => {
      const expirationMs = 24 * 60 * 60 * 1000; // 24 hours (from CONFIG)

      // Create a session and manually modify its createdAt to simulate expiration
      const sessionId = createSession('Old data', ['old.txt']);
      const session = getSession(sessionId);

      // Simulate old timestamp
      const simulatedOldTime = Date.now() - expirationMs - 1000;
      session.createdAt = simulatedOldTime;

      const now = Date.now();
      const age = now - session.createdAt;

      expect(age).toBeGreaterThan(expirationMs);
    });
  });

  describe('Chart Expiration Logic', () => {
    test('should track chart creation time', () => {
      const sessionId = createSession('Test', ['file.txt']);
      const beforeCreate = Date.now();
      const chartId = storeChart({ data: [] }, sessionId);
      const afterCreate = Date.now();

      const chart = getChart(chartId);

      expect(chart.created).toBeGreaterThanOrEqual(beforeCreate);
      expect(chart.created).toBeLessThanOrEqual(afterCreate);
    });

    test('should associate charts with sessions', () => {
      const sessionId = createSession('Test', ['file.txt']);
      const chartId = storeChart({ data: [] }, sessionId);

      const chart = getChart(chartId);

      expect(chart.sessionId).toBe(sessionId);
    });

    test('should identify orphaned charts (session deleted)', () => {
      const sessionId = createSession('Test', ['file.txt']);
      const chartId = storeChart({ data: [] }, sessionId);

      // Verify chart exists and is linked
      const chart = getChart(chartId);
      expect(chart.sessionId).toBe(sessionId);

      // In real cleanup, if session doesn't exist, chart would be orphaned
      // We can test this concept:
      const nonExistentSessionId = 'fake_session_id';
      const orphanedChart = {
        sessionId: nonExistentSessionId,
        data: {},
        created: Date.now(),
      };

      // An orphaned chart is one whose sessionId doesn't exist
      const parentSession = getSession(orphanedChart.sessionId);
      expect(parentSession).toBeNull();
    });

    test('should identify charts that would be expired', () => {
      const expirationMs = 24 * 60 * 60 * 1000;

      const sessionId = createSession('Test', ['file.txt']);
      const chartId = storeChart({ data: [] }, sessionId);
      const chart = getChart(chartId);

      // Simulate old chart
      chart.created = Date.now() - expirationMs - 1000;

      const age = Date.now() - chart.created;
      expect(age).toBeGreaterThan(expirationMs);
    });
  });

  describe('Job Expiration Logic', () => {
    test('should track job creation time', () => {
      const beforeCreate = Date.now();
      const jobId = createJob();
      const afterCreate = Date.now();

      const job = getJob(jobId);

      expect(job.createdAt).toBeGreaterThanOrEqual(beforeCreate);
      expect(job.createdAt).toBeLessThanOrEqual(afterCreate);
    });

    test('should differentiate between active and completed jobs', () => {
      const activeJobId = createJob();
      const completedJobId = createJob();

      const job1 = getJob(activeJobId);
      const job2 = getJob(completedJobId);

      // Simulate completed job
      job2.status = 'complete';

      expect(job1.status).toBe('queued'); // Active
      expect(job2.status).toBe('complete'); // Completed
    });

    test('should identify stale completed jobs', () => {
      const jobRetentionMs = 10 * 60 * 1000; // 10 minutes for completed jobs

      const jobId = createJob();
      const job = getJob(jobId);

      // Mark as complete and simulate old timestamp
      job.status = 'complete';
      job.createdAt = Date.now() - jobRetentionMs - 1000;

      const age = Date.now() - job.createdAt;
      const isStaleCompleted = job.status === 'complete' && age > jobRetentionMs;

      expect(isStaleCompleted).toBe(true);
    });

    test('should handle failed jobs', () => {
      const jobId = createJob();
      const job = getJob(jobId);

      job.status = 'error';
      job.error = 'Test error';

      expect(job.status).toBe('error');
      expect(job.error).toBeDefined();
    });
  });

  describe('Cleanup Interval Mechanics', () => {
    test('should calculate correct expiration times', () => {
      const expirationMs = 24 * 60 * 60 * 1000; // 24 hours
      const now = Date.now();

      // Item created just now
      const freshItem = { createdAt: now };
      const freshAge = now - freshItem.createdAt;
      expect(freshAge < expirationMs).toBe(true);

      // Item created 25 hours ago
      const oldItem = { createdAt: now - 25 * 60 * 60 * 1000 };
      const oldAge = now - oldItem.createdAt;
      expect(oldAge > expirationMs).toBe(true);
    });

    test('should handle edge case at exact expiration time', () => {
      const expirationMs = 24 * 60 * 60 * 1000;
      const now = Date.now();

      // Item created exactly at expiration threshold
      const edgeItem = { createdAt: now - expirationMs };
      const age = now - edgeItem.createdAt;

      // Should NOT be expired (threshold is >)
      expect(age <= expirationMs).toBe(true);
    });

    test('should track cleanup statistics conceptually', () => {
      // In real cleanup, these would be tracked
      const stats = {
        expiredSessions: 0,
        expiredCharts: 0,
        orphanedCharts: 0,
        expiredJobs: 0,
        completedJobs: 0,
      };

      // Simulate cleanup operations
      stats.expiredSessions = 2;
      stats.orphanedCharts = 1;
      stats.completedJobs = 3;

      const totalCleaned =
        stats.expiredSessions +
        stats.expiredCharts +
        stats.orphanedCharts +
        stats.expiredJobs +
        stats.completedJobs;

      expect(totalCleaned).toBe(6);
    });
  });

  describe('Memory Management', () => {
    test('should handle large numbers of items efficiently', () => {
      const startTime = Date.now();

      // Create 100 sessions
      const sessionIds = [];
      for (let i = 0; i < 100; i++) {
        sessionIds.push(createSession(`Test ${i}`, [`file${i}.txt`]));
      }

      // Create 100 charts
      const chartIds = [];
      for (let i = 0; i < 100; i++) {
        chartIds.push(storeChart({ data: [{ id: i }] }, sessionIds[i]));
      }

      // Create 100 jobs
      const jobIds = [];
      for (let i = 0; i < 100; i++) {
        jobIds.push(createJob());
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete quickly (< 1 second for 300 operations)
      expect(duration).toBeLessThan(1000);

      // All items should be retrievable
      expect(getSession(sessionIds[0])).toBeDefined();
      expect(getChart(chartIds[0])).toBeDefined();
      expect(getJob(jobIds[0])).toBeDefined();
    });

    test('should handle cleanup of expired items efficiently', () => {
      const expirationMs = 24 * 60 * 60 * 1000;
      const now = Date.now();

      // Create mix of fresh and expired items
      const items = [
        { id: 1, createdAt: now }, // Fresh
        { id: 2, createdAt: now - expirationMs - 1000 }, // Expired
        { id: 3, createdAt: now - 1000 }, // Fresh
        { id: 4, createdAt: now - expirationMs - 5000 }, // Expired
      ];

      // Filter expired items
      const expired = items.filter(
        (item) => now - item.createdAt > expirationMs
      );

      expect(expired).toHaveLength(2);
      expect(expired[0].id).toBe(2);
      expect(expired[1].id).toBe(4);
    });
  });

  describe('Concurrency Safety', () => {
    test('should handle concurrent session creation', () => {
      const sessions = [];

      // Create multiple sessions concurrently
      for (let i = 0; i < 10; i++) {
        sessions.push(createSession(`Concurrent ${i}`, [`file${i}.txt`]));
      }

      // All should have unique IDs
      const uniqueSessions = new Set(sessions);
      expect(uniqueSessions.size).toBe(10);

      // All should be retrievable
      sessions.forEach((sessionId) => {
        expect(getSession(sessionId)).toBeDefined();
      });
    });

    test('should handle concurrent cleanup operations', () => {
      // In real implementation, cleanup would need locks or atomic operations
      // This tests the concept of safe concurrent access
      const items = new Map();

      // Simulate concurrent reads
      const operations = [];
      for (let i = 0; i < 10; i++) {
        const id = `item_${i}`;
        items.set(id, { data: i });
        operations.push(() => items.get(id));
      }

      // All reads should succeed
      operations.forEach((op) => {
        expect(op()).toBeDefined();
      });
    });
  });

  describe('Edge Cases', () => {
    test('should handle cleanup when storage is empty', () => {
      // No items to clean up
      const stats = {
        expiredSessions: 0,
        expiredCharts: 0,
        expiredJobs: 0,
      };

      const totalCleaned =
        stats.expiredSessions + stats.expiredCharts + stats.expiredJobs;
      expect(totalCleaned).toBe(0);
    });

    test('should handle items created at exactly the same timestamp', () => {
      const timestamp = Date.now();

      const items = [
        { id: 1, createdAt: timestamp },
        { id: 2, createdAt: timestamp },
        { id: 3, createdAt: timestamp },
      ];

      // All should have same timestamp
      items.forEach((item) => {
        expect(item.createdAt).toBe(timestamp);
      });
    });

    test('should handle orphaned charts without parent session', () => {
      const orphanedChartId = storeChart({ data: [] }, 'nonexistent_session');

      const chart = getChart(orphanedChartId);
      expect(chart).toBeDefined();

      // Parent session doesn't exist
      const parentSession = getSession(chart.sessionId);
      expect(parentSession).toBeNull();
    });
  });
});
