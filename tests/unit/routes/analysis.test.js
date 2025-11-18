/**
 * Unit Tests for server/routes/analysis.js
 * Tests task analysis and Q&A endpoints
 */

import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import analysisRouter from '../../../server/routes/analysis.js';
import { createSession } from '../../../server/storage.js';

// Create test app
const app = express();
app.use(express.json());
app.use('/', analysisRouter);

describe('Analysis API - Task Analysis', () => {
  beforeEach(() => {
    // Mock successful AI response
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify({
                  taskName: 'Test Task',
                  entity: 'Team A',
                  factsAndAssumptions: [],
                  risks: [],
                  impact: {}
                })
              }]
            }
          }]
        })
      })
    );
  });

  afterEach(() => {
    global.fetch = undefined;
  });

  test('should return analysis for valid request', async () => {
    // Create a mock session
    const sessionId = createSession(
      'Project research content',
      ['research.md']
    );

    const response = await request(app)
      .post('/get-task-analysis')
      .send({
        taskName: 'Implement Feature X',
        entity: 'Engineering Team',
        sessionId: sessionId
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('taskName');
    expect(response.body).toHaveProperty('entity');
  });

  test('should reject missing taskName', async () => {
    const sessionId = createSession('Content', ['file.md']);

    const response = await request(app)
      .post('/get-task-analysis')
      .send({
        entity: 'Team A',
        sessionId: sessionId
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('taskName');
  });

  test('should reject missing entity', async () => {
    const sessionId = createSession('Content', ['file.md']);

    const response = await request(app)
      .post('/get-task-analysis')
      .send({
        taskName: 'Task 1',
        sessionId: sessionId
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('taskName');
  });

  test('should reject missing sessionId', async () => {
    const response = await request(app)
      .post('/get-task-analysis')
      .send({
        taskName: 'Task 1',
        entity: 'Team A'
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('sessionId');
  });

  test('should return 404 for non-existent session', async () => {
    const response = await request(app)
      .post('/get-task-analysis')
      .send({
        taskName: 'Task 1',
        entity: 'Team A',
        sessionId: 'session_nonexistent123456789012'
      });

    expect(response.status).toBe(404);
    expect(response.body.error).toContain('not found');
  });

  test('should validate taskName format', async () => {
    const sessionId = createSession('Content', ['file.md']);

    const response = await request(app)
      .post('/get-task-analysis')
      .send({
        taskName: 'Valid Task Name',
        entity: 'Valid Entity',
        sessionId: sessionId
      });

    // Should accept valid strings
    expect(response.status).toBe(200);
  });

  test('should validate entity format', async () => {
    const sessionId = createSession('Content', ['file.md']);

    const response = await request(app)
      .post('/get-task-analysis')
      .send({
        taskName: 'Task Name',
        entity: 'Valid Entity Name',
        sessionId: sessionId
      });

    // Should accept valid entity names
    expect(response.status).toBe(200);
  });

  test('should handle AI API errors', async () => {
    // Override mock to simulate error
    global.fetch = jest.fn(() => Promise.reject(new Error('API Error')));

    const sessionId = createSession('Content', ['file.md']);

    const response = await request(app)
      .post('/get-task-analysis')
      .send({
        taskName: 'Task',
        entity: 'Team',
        sessionId: sessionId
      });

    expect(response.status).toBe(500);
    expect(response.body.error).toContain('Error');
  });
});

describe('Analysis API - Q&A', () => {
  beforeEach(() => {
    // Mock successful text response
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          candidates: [{
            content: {
              parts: [{
                text: 'This is the answer to your question.'
              }]
            }
          }]
        })
      })
    );
  });

  afterEach(() => {
    global.fetch = undefined;
  });

  test('should return answer for valid question', async () => {
    const sessionId = createSession('Project documentation', ['docs.md']);

    const response = await request(app)
      .post('/ask-question')
      .send({
        taskName: 'Feature Implementation',
        entity: 'Dev Team',
        question: 'What are the main risks?',
        sessionId: sessionId
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('answer');
    expect(typeof response.body.answer).toBe('string');
  });

  test('should reject missing question', async () => {
    const sessionId = createSession('Content', ['file.md']);

    const response = await request(app)
      .post('/ask-question')
      .send({
        taskName: 'Task',
        entity: 'Team',
        sessionId: sessionId
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Question');
  });

  test('should reject missing entity', async () => {
    const sessionId = createSession('Content', ['file.md']);

    const response = await request(app)
      .post('/ask-question')
      .send({
        taskName: 'Task',
        question: 'What is the timeline?',
        sessionId: sessionId
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Entity');
  });

  test('should reject missing taskName', async () => {
    const sessionId = createSession('Content', ['file.md']);

    const response = await request(app)
      .post('/ask-question')
      .send({
        entity: 'Team',
        question: 'What is the status?',
        sessionId: sessionId
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Task name');
  });

  test('should reject missing sessionId', async () => {
    const response = await request(app)
      .post('/ask-question')
      .send({
        taskName: 'Task',
        entity: 'Team',
        question: 'What is the budget?'
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('sessionId');
  });

  test('should reject question that is too long', async () => {
    const sessionId = createSession('Content', ['file.md']);

    // Create a question longer than 1000 characters
    const longQuestion = 'a'.repeat(1001);

    const response = await request(app)
      .post('/ask-question')
      .send({
        taskName: 'Task',
        entity: 'Team',
        question: longQuestion,
        sessionId: sessionId
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('too long');
  });

  test('should return 404 for non-existent session', async () => {
    const response = await request(app)
      .post('/ask-question')
      .send({
        taskName: 'Task',
        entity: 'Team',
        question: 'What are the dependencies?',
        sessionId: 'session_nonexistent123456789012'
      });

    expect(response.status).toBe(404);
    expect(response.body.error).toContain('not found');
  });
});
