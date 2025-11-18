/**
 * Unit Tests for server/storage.js
 * Tests for session, chart, and job storage management
 */

import {
  createSession,
  getSession,
  storeChart,
  getChart,
  updateChart,
  createJob,
  updateJob,
  getJob,
  completeJob,
  failJob,
} from '../../../server/storage.js';

describe('Session Management', () => {
  describe('createSession', () => {
    test('should create a session with research data', () => {
      const researchText = 'Research content about project roadmap';
      const researchFiles = ['file1.txt', 'file2.docx'];

      const sessionId = createSession(researchText, researchFiles);

      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe('string');
      expect(sessionId.length).toBe(32); // crypto.randomBytes(16).toString('hex')
    });

    test('should create unique session IDs', () => {
      const sessionId1 = createSession('Research 1', ['file1.txt']);
      const sessionId2 = createSession('Research 2', ['file2.txt']);

      expect(sessionId1).not.toBe(sessionId2);
    });

    test('should store session data correctly', () => {
      const researchText = 'Project requirements';
      const researchFiles = ['spec.docx'];

      const sessionId = createSession(researchText, researchFiles);
      const session = getSession(sessionId);

      expect(session).toBeDefined();
      expect(session.researchText).toBe(researchText);
      expect(session.researchFiles).toEqual(researchFiles);
      expect(session.createdAt).toBeDefined();
      expect(typeof session.createdAt).toBe('number');
    });

    test('should handle empty research files', () => {
      const sessionId = createSession('Text only', []);
      const session = getSession(sessionId);

      expect(session.researchFiles).toEqual([]);
    });

    test('should handle empty research text', () => {
      const sessionId = createSession('', ['file.txt']);
      const session = getSession(sessionId);

      expect(session.researchText).toBe('');
    });
  });

  describe('getSession', () => {
    test('should retrieve existing session', () => {
      const sessionId = createSession('Test data', ['test.txt']);
      const session = getSession(sessionId);

      expect(session).not.toBeNull();
      expect(session.researchText).toBe('Test data');
    });

    test('should return null for non-existent session', () => {
      const session = getSession('nonexistent_session_id');
      expect(session).toBeNull();
    });

    test('should return null for invalid session ID', () => {
      expect(getSession('')).toBeNull();
      expect(getSession(null)).toBeNull();
      expect(getSession(undefined)).toBeNull();
    });
  });
});

describe('Chart Management', () => {
  let testSessionId;

  beforeEach(() => {
    // Create a test session for chart tests
    testSessionId = createSession('Chart test data', ['chart.txt']);
  });

  describe('storeChart', () => {
    test('should store chart data with generated ID', () => {
      const ganttData = {
        timeColumns: [{ week: 1 }, { week: 2 }],
        data: [{ id: 1, name: 'Task 1' }],
      };

      const chartId = storeChart(ganttData, testSessionId);

      expect(chartId).toBeDefined();
      expect(typeof chartId).toBe('string');
      expect(chartId.length).toBe(32);
    });

    test('should generate unique chart IDs', () => {
      const data1 = { timeColumns: [], data: [] };
      const data2 = { timeColumns: [], data: [] };

      const chartId1 = storeChart(data1, testSessionId);
      const chartId2 = storeChart(data2, testSessionId);

      expect(chartId1).not.toBe(chartId2);
    });

    test('should store complete chart data', () => {
      const ganttData = {
        timeColumns: [{ week: 1, label: 'Week 1' }],
        data: [
          { id: 1, name: 'Task 1', start: 0, duration: 2 },
          { id: 2, name: 'Task 2', start: 2, duration: 3 },
        ],
      };

      const chartId = storeChart(ganttData, testSessionId);
      const chart = getChart(chartId);

      expect(chart).toBeDefined();
      expect(chart.data).toEqual(ganttData);
      expect(chart.sessionId).toBe(testSessionId);
      expect(chart.created).toBeDefined();
      expect(typeof chart.created).toBe('number');
    });

    test('should handle empty chart data', () => {
      const chartId = storeChart({}, testSessionId);
      const chart = getChart(chartId);

      expect(chart.data).toEqual({});
    });

    test('should associate chart with session', () => {
      const chartId = storeChart({ data: [] }, testSessionId);
      const chart = getChart(chartId);

      expect(chart.sessionId).toBe(testSessionId);
    });
  });

  describe('getChart', () => {
    test('should retrieve existing chart', () => {
      const ganttData = { timeColumns: [], data: [] };
      const chartId = storeChart(ganttData, testSessionId);

      const chart = getChart(chartId);

      expect(chart).not.toBeNull();
      expect(chart.data).toEqual(ganttData);
    });

    test('should return null for non-existent chart', () => {
      const chart = getChart('nonexistent_chart_id');
      expect(chart).toBeNull();
    });

    test('should return null for invalid chart ID', () => {
      expect(getChart('')).toBeNull();
      expect(getChart(null)).toBeNull();
      expect(getChart(undefined)).toBeNull();
    });
  });

  describe('updateChart', () => {
    test('should update existing chart data', () => {
      const originalData = { timeColumns: [], data: [{ id: 1, name: 'Task 1' }] };
      const chartId = storeChart(originalData, testSessionId);

      const updatedData = {
        timeColumns: [{ week: 1 }],
        data: [
          { id: 1, name: 'Task 1 Updated' },
          { id: 2, name: 'Task 2' },
        ],
      };

      const result = updateChart(chartId, updatedData);

      expect(result).toBe(true);

      const chart = getChart(chartId);
      expect(chart.data).toEqual(updatedData);
    });

    test('should preserve sessionId and created timestamp', () => {
      const originalData = { data: [] };
      const chartId = storeChart(originalData, testSessionId);
      const originalChart = getChart(chartId);

      const updatedData = { data: [{ id: 1 }] };
      updateChart(chartId, updatedData);

      const updatedChart = getChart(chartId);
      expect(updatedChart.sessionId).toBe(originalChart.sessionId);
      expect(updatedChart.created).toBe(originalChart.created);
    });

    test('should add lastModified timestamp', () => {
      const chartId = storeChart({ data: [] }, testSessionId);
      const updatedData = { data: [{ id: 1 }] };

      updateChart(chartId, updatedData);

      const chart = getChart(chartId);
      expect(chart.lastModified).toBeDefined();
      expect(typeof chart.lastModified).toBe('number');
      expect(chart.lastModified).toBeGreaterThanOrEqual(chart.created);
    });

    test('should return false for non-existent chart', () => {
      const result = updateChart('nonexistent_chart_id', { data: [] });
      expect(result).toBe(false);
    });

    test('should handle null or undefined chart ID', () => {
      expect(updateChart(null, { data: [] })).toBe(false);
      expect(updateChart(undefined, { data: [] })).toBe(false);
    });
  });
});

describe('Job Management', () => {
  describe('createJob', () => {
    test('should create a job with queued status', () => {
      const jobId = createJob();

      expect(jobId).toBeDefined();
      expect(typeof jobId).toBe('string');
      expect(jobId.length).toBe(32);
    });

    test('should create unique job IDs', () => {
      const jobId1 = createJob();
      const jobId2 = createJob();

      expect(jobId1).not.toBe(jobId2);
    });

    test('should initialize job with correct defaults', () => {
      const jobId = createJob();
      const job = getJob(jobId);

      expect(job).toBeDefined();
      expect(job.status).toBe('queued');
      expect(job.progress).toBe('Request received, starting processing...');
      expect(job.createdAt).toBeDefined();
      expect(typeof job.createdAt).toBe('number');
    });
  });

  describe('getJob', () => {
    test('should retrieve existing job', () => {
      const jobId = createJob();
      const job = getJob(jobId);

      expect(job).not.toBeNull();
      expect(job.status).toBe('queued');
    });

    test('should return null for non-existent job', () => {
      const job = getJob('nonexistent_job_id');
      expect(job).toBeNull();
    });

    test('should return null for invalid job ID', () => {
      expect(getJob('')).toBeNull();
      expect(getJob(null)).toBeNull();
      expect(getJob(undefined)).toBeNull();
    });
  });

  describe('updateJob', () => {
    test('should update job status', () => {
      const jobId = createJob();

      updateJob(jobId, { status: 'processing' });

      const job = getJob(jobId);
      expect(job.status).toBe('processing');
    });

    test('should update job progress', () => {
      const jobId = createJob();

      updateJob(jobId, { progress: 'Generating chart data...' });

      const job = getJob(jobId);
      expect(job.progress).toBe('Generating chart data...');
    });

    test('should update multiple fields at once', () => {
      const jobId = createJob();

      updateJob(jobId, {
        status: 'processing',
        progress: 'Step 2 of 5',
        customField: 'custom value',
      });

      const job = getJob(jobId);
      expect(job.status).toBe('processing');
      expect(job.progress).toBe('Step 2 of 5');
      expect(job.customField).toBe('custom value');
    });

    test('should preserve existing fields when updating', () => {
      const jobId = createJob();
      const originalJob = getJob(jobId);

      updateJob(jobId, { status: 'processing' });

      const updatedJob = getJob(jobId);
      expect(updatedJob.createdAt).toBe(originalJob.createdAt);
      expect(updatedJob.progress).toBe(originalJob.progress);
    });

    test('should handle updates to non-existent job gracefully', () => {
      // updateJob should handle non-existent jobs without throwing
      // The function logs a warning but doesn't throw
      expect(() => {
        updateJob('nonexistent_job_id', { status: 'complete' });
      }).not.toThrow();

      // Verify the job still doesn't exist
      expect(getJob('nonexistent_job_id')).toBeNull();
    });
  });

  describe('completeJob', () => {
    test('should mark job as complete with data', () => {
      const jobId = createJob();
      const resultData = {
        chartId: 'chart_123',
        timeColumns: [],
        data: [],
      };

      completeJob(jobId, resultData);

      const job = getJob(jobId);
      expect(job.status).toBe('complete');
      expect(job.progress).toBe('Chart generated successfully!');
      expect(job.data).toEqual(resultData);
    });

    test('should handle empty result data', () => {
      const jobId = createJob();

      completeJob(jobId, {});

      const job = getJob(jobId);
      expect(job.status).toBe('complete');
      expect(job.data).toEqual({});
    });
  });

  describe('failJob', () => {
    test('should mark job as failed with error message', () => {
      const jobId = createJob();
      const errorMessage = 'API request failed';

      failJob(jobId, errorMessage);

      const job = getJob(jobId);
      expect(job.status).toBe('error');
      expect(job.error).toBe(errorMessage);
    });

    test('should use default error message if none provided', () => {
      const jobId = createJob();

      failJob(jobId, '');

      const job = getJob(jobId);
      expect(job.status).toBe('error');
      expect(job.error).toBe('Unknown error occurred');
    });

    test('should preserve createdAt timestamp', () => {
      const jobId = createJob();
      const originalJob = getJob(jobId);

      failJob(jobId, 'Error occurred');

      const failedJob = getJob(jobId);
      expect(failedJob.createdAt).toBe(originalJob.createdAt);
    });
  });

  describe('Job lifecycle', () => {
    test('should support complete job workflow', () => {
      // Create job
      const jobId = createJob();
      let job = getJob(jobId);
      expect(job.status).toBe('queued');

      // Start processing
      updateJob(jobId, {
        status: 'processing',
        progress: 'Processing document...',
      });
      job = getJob(jobId);
      expect(job.status).toBe('processing');

      // Update progress
      updateJob(jobId, {
        progress: 'Generating chart...',
      });
      job = getJob(jobId);
      expect(job.progress).toBe('Generating chart...');

      // Complete job
      completeJob(jobId, { chartId: 'chart_123' });
      job = getJob(jobId);
      expect(job.status).toBe('complete');
      expect(job.data.chartId).toBe('chart_123');
    });

    test('should support error workflow', () => {
      // Create job
      const jobId = createJob();

      // Start processing
      updateJob(jobId, { status: 'processing' });

      // Fail job
      failJob(jobId, 'Processing failed');

      const job = getJob(jobId);
      expect(job.status).toBe('error');
      expect(job.error).toBe('Processing failed');
    });
  });
});

describe('Storage Integration', () => {
  test('should maintain separate storage for sessions, charts, and jobs', () => {
    // Create items in all stores
    const sessionId = createSession('Test', ['file.txt']);
    const chartId = storeChart({ data: [] }, sessionId);
    const jobId = createJob();

    // Verify all exist independently
    expect(getSession(sessionId)).not.toBeNull();
    expect(getChart(chartId)).not.toBeNull();
    expect(getJob(jobId)).not.toBeNull();

    // Verify IDs are different
    expect(sessionId).not.toBe(chartId);
    expect(sessionId).not.toBe(jobId);
    expect(chartId).not.toBe(jobId);
  });

  test('should link charts to sessions correctly', () => {
    const sessionId1 = createSession('Session 1', ['file1.txt']);
    const sessionId2 = createSession('Session 2', ['file2.txt']);

    const chartId1 = storeChart({ data: [] }, sessionId1);
    const chartId2 = storeChart({ data: [] }, sessionId2);

    const chart1 = getChart(chartId1);
    const chart2 = getChart(chartId2);

    expect(chart1.sessionId).toBe(sessionId1);
    expect(chart2.sessionId).toBe(sessionId2);
  });

  test('should handle high volume of concurrent operations', () => {
    const operations = 100;
    const sessionIds = [];
    const chartIds = [];
    const jobIds = [];

    // Create many items
    for (let i = 0; i < operations; i++) {
      sessionIds.push(createSession(`Session ${i}`, [`file${i}.txt`]));
      chartIds.push(storeChart({ data: [{ id: i }] }, sessionIds[i]));
      jobIds.push(createJob());
    }

    // Verify all are unique
    expect(new Set(sessionIds).size).toBe(operations);
    expect(new Set(chartIds).size).toBe(operations);
    expect(new Set(jobIds).size).toBe(operations);

    // Verify all are retrievable
    sessionIds.forEach((id, idx) => {
      const session = getSession(id);
      expect(session.researchText).toBe(`Session ${idx}`);
    });

    chartIds.forEach((id, idx) => {
      const chart = getChart(id);
      expect(chart.data.data[0].id).toBe(idx);
    });

    jobIds.forEach((id) => {
      const job = getJob(id);
      expect(job.status).toBe('queued');
    });
  });
});

describe('Error Handling and Edge Cases', () => {
  test('should handle concurrent updates to same job', () => {
    const jobId = createJob();

    updateJob(jobId, { status: 'processing', step: 1 });
    updateJob(jobId, { step: 2 });
    updateJob(jobId, { progress: 'Almost done' });

    const job = getJob(jobId);
    expect(job.status).toBe('processing');
    expect(job.step).toBe(2);
    expect(job.progress).toBe('Almost done');
  });

  test('should handle updating and then completing job', () => {
    const jobId = createJob();

    updateJob(jobId, { customField: 'preserved' });
    completeJob(jobId, { result: 'success' });

    const job = getJob(jobId);
    expect(job.status).toBe('complete');
    expect(job.customField).toBe('preserved');
    expect(job.data.result).toBe('success');
  });

  test('should handle large data objects', () => {
    const largeData = {
      timeColumns: Array(100).fill(null).map((_, i) => ({ week: i })),
      data: Array(1000).fill(null).map((_, i) => ({
        id: i,
        name: `Task ${i}`,
        description: 'A'.repeat(1000),
      })),
    };

    const sessionId = createSession('Large test', ['file.txt']);
    const chartId = storeChart(largeData, sessionId);

    const chart = getChart(chartId);
    expect(chart.data.timeColumns.length).toBe(100);
    expect(chart.data.data.length).toBe(1000);
  });
});
