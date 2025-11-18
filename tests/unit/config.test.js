/**
 * Unit Tests for server/config.js
 * Tests configuration validation and security patterns
 */

import { describe, test, expect } from '@jest/globals';
import { CONFIG, getGeminiApiUrl } from '../../server/config.js';

describe('Config - Structure', () => {
  test('should have all required configuration sections', () => {
    expect(CONFIG).toHaveProperty('SERVER');
    expect(CONFIG).toHaveProperty('API');
    expect(CONFIG).toHaveProperty('FILES');
    expect(CONFIG).toHaveProperty('SECURITY');
    expect(CONFIG).toHaveProperty('TIMEOUTS');
    expect(CONFIG).toHaveProperty('RATE_LIMIT');
    expect(CONFIG).toHaveProperty('STORAGE');
    expect(CONFIG).toHaveProperty('CACHE');
    expect(CONFIG).toHaveProperty('VALIDATION');
    expect(CONFIG).toHaveProperty('ERRORS');
  });

  test('should be frozen (immutable)', () => {
    expect(Object.isFrozen(CONFIG)).toBe(true);
    expect(Object.isFrozen(CONFIG.SERVER)).toBe(true);
    expect(Object.isFrozen(CONFIG.API)).toBe(true);
    expect(Object.isFrozen(CONFIG.SECURITY)).toBe(true);
  });

  test('should have valid server configuration', () => {
    expect(CONFIG.SERVER).toHaveProperty('PORT');
    expect(CONFIG.SERVER).toHaveProperty('TRUST_PROXY_HOPS');
    expect(CONFIG.SERVER.PORT).toBeGreaterThan(0);
    expect(CONFIG.SERVER.TRUST_PROXY_HOPS).toBe(1);
  });

  test('should have valid API configuration', () => {
    expect(CONFIG.API).toHaveProperty('GEMINI_MODEL');
    expect(CONFIG.API).toHaveProperty('BASE_URL');
    expect(CONFIG.API).toHaveProperty('RETRY_COUNT');
    expect(CONFIG.API).toHaveProperty('RETRY_BASE_DELAY_MS');
    expect(CONFIG.API.RETRY_COUNT).toBe(3);
    expect(CONFIG.API.RETRY_BASE_DELAY_MS).toBeGreaterThan(0);
  });

  test('should have reasonable file limits', () => {
    expect(CONFIG.FILES.MAX_SIZE_BYTES).toBe(10 * 1024 * 1024); // 10MB
    expect(CONFIG.FILES.MAX_COUNT).toBe(500);
    expect(CONFIG.FILES.ALLOWED_EXTENSIONS).toContain('md');
    expect(CONFIG.FILES.ALLOWED_EXTENSIONS).toContain('txt');
    expect(CONFIG.FILES.ALLOWED_EXTENSIONS).toContain('docx');
  });

  test('getGeminiApiUrl should return valid URL with API key', () => {
    const url = getGeminiApiUrl();
    expect(url).toContain('https://generativelanguage.googleapis.com');
    expect(url).toContain('key=');
    expect(url).toContain('gemini-2.5-flash-preview-09-2025');
  });
});

describe('Config - Security Patterns', () => {
  test('should have prompt injection patterns defined', () => {
    expect(CONFIG.SECURITY).toHaveProperty('INJECTION_PATTERNS');
    expect(Array.isArray(CONFIG.SECURITY.INJECTION_PATTERNS)).toBe(true);
    expect(CONFIG.SECURITY.INJECTION_PATTERNS.length).toBeGreaterThan(0);
  });

  test('injection patterns should have pattern and replacement', () => {
    CONFIG.SECURITY.INJECTION_PATTERNS.forEach(entry => {
      expect(entry).toHaveProperty('pattern');
      expect(entry).toHaveProperty('replacement');
      expect(entry.pattern instanceof RegExp).toBe(true);
      expect(typeof entry.replacement).toBe('string');
    });
  });

  test('should have ID validation patterns', () => {
    expect(CONFIG.SECURITY.PATTERNS).toHaveProperty('CHART_ID');
    expect(CONFIG.SECURITY.PATTERNS).toHaveProperty('JOB_ID');
    expect(CONFIG.SECURITY.PATTERNS.CHART_ID instanceof RegExp).toBe(true);
    expect(CONFIG.SECURITY.PATTERNS.JOB_ID instanceof RegExp).toBe(true);
  });

  test('CHART_ID pattern should validate hex strings', () => {
    const validId = 'abc123def456789012345678901234ab';
    const invalidId = 'not_a_valid_id';

    expect(CONFIG.SECURITY.PATTERNS.CHART_ID.test(validId)).toBe(true);
    expect(CONFIG.SECURITY.PATTERNS.CHART_ID.test(invalidId)).toBe(false);
  });
});

describe('Config - Rate Limiting', () => {
  test('should have rate limit configuration', () => {
    expect(CONFIG.RATE_LIMIT).toHaveProperty('WINDOW_MS');
    expect(CONFIG.RATE_LIMIT).toHaveProperty('MAX_REQUESTS');
    expect(CONFIG.RATE_LIMIT).toHaveProperty('STRICT_MAX_REQUESTS');
  });

  test('should have reasonable rate limits', () => {
    expect(CONFIG.RATE_LIMIT.MAX_REQUESTS).toBe(100);
    expect(CONFIG.RATE_LIMIT.STRICT_MAX_REQUESTS).toBe(20);
    expect(CONFIG.RATE_LIMIT.WINDOW_MS).toBe(15 * 60 * 1000); // 15 minutes
  });
});

describe('Config - Storage', () => {
  test('should have storage configuration', () => {
    expect(CONFIG.STORAGE).toHaveProperty('EXPIRATION_MS');
    expect(CONFIG.STORAGE).toHaveProperty('CLEANUP_INTERVAL_MS');
  });

  test('should have 1 hour expiration', () => {
    expect(CONFIG.STORAGE.EXPIRATION_MS).toBe(60 * 60 * 1000);
    expect(CONFIG.STORAGE.CLEANUP_INTERVAL_MS).toBe(5 * 60 * 1000);
  });
});

describe('Config - Error Messages', () => {
  test('should have error messages defined', () => {
    expect(CONFIG.ERRORS).toHaveProperty('MISSING_TASK_NAME');
    expect(CONFIG.ERRORS).toHaveProperty('SESSION_NOT_FOUND');
    expect(CONFIG.ERRORS).toHaveProperty('CHART_NOT_FOUND');
    expect(CONFIG.ERRORS).toHaveProperty('INVALID_CHART_ID');
  });

  test('should have function-based error messages', () => {
    expect(typeof CONFIG.ERRORS.INVALID_FILE_EXTENSION).toBe('function');
    expect(typeof CONFIG.ERRORS.INVALID_FILE_TYPE).toBe('function');

    const extError = CONFIG.ERRORS.INVALID_FILE_EXTENSION('exe');
    const typeError = CONFIG.ERRORS.INVALID_FILE_TYPE('application/exe');

    expect(extError).toContain('exe');
    expect(typeError).toContain('application/exe');
  });
});
