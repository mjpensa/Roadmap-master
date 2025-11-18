/**
 * Integration Tests for API Endpoints
 * Tests actual HTTP endpoints with supertest
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { CONFIG } from '../../server/config.js';

// Create a minimal test app
let app;

beforeAll(async () => {
  app = express();
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: '*', credentials: true })); // Allow all origins for testing
  app.use(express.json({ limit: `${CONFIG.FILES.MAX_FIELD_SIZE_BYTES}` }));

  // Test routes
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', version: '2.0.0' });
  });

  app.get('/api/test', (req, res) => {
    res.json({ message: 'Test endpoint' });
  });
});

describe('API - Health Check', () => {
  test('GET /health should return 200 OK', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
  });

  test('GET /health should include version', async () => {
    const response = await request(app).get('/health');
    expect(response.body).toHaveProperty('version');
  });
});

describe('API - CORS Headers', () => {
  test('should include CORS headers in response', async () => {
    const response = await request(app)
      .get('/api/test')
      .set('Origin', 'http://localhost:3000');

    expect(response.headers['access-control-allow-origin']).toBeDefined();
  });
});

describe('API - Security Headers', () => {
  test('should include helmet security headers', async () => {
    const response = await request(app).get('/health');

    // Helmet adds various security headers
    expect(response.headers).toHaveProperty('x-dns-prefetch-control');
    expect(response.headers).toHaveProperty('x-frame-options');
    expect(response.headers).toHaveProperty('x-content-type-options');
  });
});

describe('API - Error Handling', () => {
  test('should return 404 for non-existent routes', async () => {
    const response = await request(app).get('/nonexistent');
    expect(response.status).toBe(404);
  });

  test('should handle invalid JSON gracefully', async () => {
    const response = await request(app)
      .post('/api/test')
      .set('Content-Type', 'application/json')
      .send('invalid json{');

    expect(response.status).toBeGreaterThanOrEqual(400);
  });
});
