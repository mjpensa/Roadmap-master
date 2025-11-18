/**
 * Unit Tests for server/gemini.js
 * Tests AI API integration, retry logic, and JSON repair
 */

import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';

describe('Gemini API - Retry Logic', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('should succeed on first attempt with valid response', async () => {
    const mockResponse = {
      candidates: [{
        content: {
          parts: [{ text: '{"title": "Test Chart"}' }]
        }
      }]
    };

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })
    );

    const { callGeminiForJson } = await import('../../server/gemini.js');
    const payload = { contents: [{ parts: [{ text: 'test' }] }] };

    const result = await callGeminiForJson(payload);

    expect(result).toEqual({ title: 'Test Chart' });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test('should retry on network failure and succeed', async () => {
    let callCount = 0;

    global.fetch = jest.fn(() => {
      callCount++;
      if (callCount <= 2) {
        return Promise.reject(new Error('Network error'));
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          candidates: [{
            content: {
              parts: [{ text: '{"success": true}' }]
            }
          }]
        })
      });
    });

    const { callGeminiForJson } = await import('../../server/gemini.js');
    const payload = { contents: [{ parts: [{ text: 'test' }] }] };

    const result = await callGeminiForJson(payload);

    expect(result).toEqual({ success: true });
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  test('should fail after max retries', async () => {
    global.fetch = jest.fn(() =>
      Promise.reject(new Error('Network error'))
    );

    const { callGeminiForJson } = await import('../../server/gemini.js');
    const payload = { contents: [{ parts: [{ text: 'test' }] }] };

    await expect(callGeminiForJson(payload, 3)).rejects.toThrow('Network error');
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  test('should call onRetry callback on failures', async () => {
    let callCount = 0;
    const retryAttempts = [];

    global.fetch = jest.fn(() => {
      callCount++;
      if (callCount <= 2) {
        return Promise.reject(new Error(`Failure ${callCount}`));
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          candidates: [{
            content: {
              parts: [{ text: '{"done": true}' }]
            }
          }]
        })
      });
    });

    const onRetry = jest.fn((attempt, error) => {
      retryAttempts.push({ attempt, error: error.message });
    });

    const { callGeminiForJson } = await import('../../server/gemini.js');
    const payload = { contents: [{ parts: [{ text: 'test' }] }] };

    await callGeminiForJson(payload, 3, onRetry);

    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(retryAttempts).toHaveLength(2);
    expect(retryAttempts[0].attempt).toBe(1);
    expect(retryAttempts[1].attempt).toBe(2);
  });
});

describe('Gemini API - Response Validation', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('should handle non-OK HTTP responses', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        status: 429,
        text: () => Promise.resolve('Rate limit exceeded')
      })
    );

    const { callGeminiForJson } = await import('../../server/gemini.js');
    const payload = { contents: [{ parts: [{ text: 'test' }] }] };

    await expect(callGeminiForJson(payload)).rejects.toThrow('API call failed with status: 429');
  });

  test('should handle missing candidates in response', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ candidates: [] })
      })
    );

    const { callGeminiForJson } = await import('../../server/gemini.js');
    const payload = { contents: [{ parts: [{ text: 'test' }] }] };

    await expect(callGeminiForJson(payload)).rejects.toThrow('Invalid response from AI API');
  });

  test('should handle safety rating blocks', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          candidates: [{
            content: {
              parts: [{ text: '{}' }]
            },
            safetyRatings: [
              { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', blocked: true }
            ]
          }]
        })
      })
    );

    const { callGeminiForJson } = await import('../../server/gemini.js');
    const payload = { contents: [{ parts: [{ text: 'test' }] }] };

    await expect(callGeminiForJson(payload)).rejects.toThrow('API call blocked due to safety rating');
  });
});

describe('Gemini API - JSON Parsing', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('should parse clean JSON response', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          candidates: [{
            content: {
              parts: [{ text: '{"title": "Test", "value": 123}' }]
            }
          }]
        })
      })
    );

    const { callGeminiForJson } = await import('../../server/gemini.js');
    const payload = { contents: [{ parts: [{ text: 'test' }] }] };

    const result = await callGeminiForJson(payload);

    expect(result).toEqual({ title: 'Test', value: 123 });
  });

  test('should strip markdown code blocks from JSON', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          candidates: [{
            content: {
              parts: [{ text: '```json\n{"data": "test"}\n```' }]
            }
          }]
        })
      })
    );

    const { callGeminiForJson } = await import('../../server/gemini.js');
    const payload = { contents: [{ parts: [{ text: 'test' }] }] };

    const result = await callGeminiForJson(payload);

    expect(result).toEqual({ data: 'test' });
  });

  test('should strip plain markdown code blocks', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          candidates: [{
            content: {
              parts: [{ text: '```\n{"data": "test"}\n```' }]
            }
          }]
        })
      })
    );

    const { callGeminiForJson } = await import('../../server/gemini.js');
    const payload = { contents: [{ parts: [{ text: 'test' }] }] };

    const result = await callGeminiForJson(payload);

    expect(result).toEqual({ data: 'test' });
  });

  test('should repair malformed JSON with jsonrepair', async () => {
    // Malformed JSON: missing closing brace, duplicate keys
    const malformedJson = '{"title": "Test", "title": "Duplicate", "data": [1, 2, 3]';

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          candidates: [{
            content: {
              parts: [{ text: malformedJson }]
            }
          }]
        })
      })
    );

    const { callGeminiForJson } = await import('../../server/gemini.js');
    const payload = { contents: [{ parts: [{ text: 'test' }] }] };

    const result = await callGeminiForJson(payload);

    // jsonrepair should fix the malformed JSON
    expect(result).toBeDefined();
    expect(result.title).toBeDefined();
    expect(result.data).toEqual([1, 2, 3]);
  });

  test('should throw error if jsonrepair fails', async () => {
    const unfixableJson = '{{{{{invalid}}}}}';

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          candidates: [{
            content: {
              parts: [{ text: unfixableJson }]
            }
          }]
        })
      })
    );

    const { callGeminiForJson } = await import('../../server/gemini.js');
    const payload = { contents: [{ parts: [{ text: 'test' }] }] };

    await expect(callGeminiForJson(payload)).rejects.toThrow();
  });

  test('should handle empty JSON object', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          candidates: [{
            content: {
              parts: [{ text: '{}' }]
            }
          }]
        })
      })
    );

    const { callGeminiForJson } = await import('../../server/gemini.js');
    const payload = { contents: [{ parts: [{ text: 'test' }] }] };

    const result = await callGeminiForJson(payload);

    expect(result).toEqual({});
  });

  test('should handle JSON with nested objects and arrays', async () => {
    const complexJson = JSON.stringify({
      title: 'Complex',
      data: [
        { id: 1, name: 'Item 1', tags: ['a', 'b'] },
        { id: 2, name: 'Item 2', tags: ['c', 'd'] }
      ],
      metadata: {
        created: '2025-11-18',
        author: 'test'
      }
    });

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          candidates: [{
            content: {
              parts: [{ text: complexJson }]
            }
          }]
        })
      })
    );

    const { callGeminiForJson } = await import('../../server/gemini.js');
    const payload = { contents: [{ parts: [{ text: 'test' }] }] };

    const result = await callGeminiForJson(payload);

    expect(result.title).toBe('Complex');
    expect(result.data).toHaveLength(2);
    expect(result.data[0].tags).toEqual(['a', 'b']);
    expect(result.metadata.created).toBe('2025-11-18');
  });
});

describe('Gemini API - Edge Cases', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('should handle whitespace-only JSON text', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          candidates: [{
            content: {
              parts: [{ text: '   \n\n  {"trimmed": true}  \n\n  ' }]
            }
          }]
        })
      })
    );

    const { callGeminiForJson } = await import('../../server/gemini.js');
    const payload = { contents: [{ parts: [{ text: 'test' }] }] };

    const result = await callGeminiForJson(payload);

    expect(result).toEqual({ trimmed: true });
  });

  test('should handle Unicode characters in JSON', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          candidates: [{
            content: {
              parts: [{ text: '{"text": "Hello 世界 🌍"}' }]
            }
          }]
        })
      })
    );

    const { callGeminiForJson } = await import('../../server/gemini.js');
    const payload = { contents: [{ parts: [{ text: 'test' }] }] };

    const result = await callGeminiForJson(payload);

    expect(result.text).toBe('Hello 世界 🌍');
  });

  test('should handle escaped quotes in JSON strings', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          candidates: [{
            content: {
              parts: [{ text: '{"quote": "She said \\"Hello\\""}' }]
            }
          }]
        })
      })
    );

    const { callGeminiForJson } = await import('../../server/gemini.js');
    const payload = { contents: [{ parts: [{ text: 'test' }] }] };

    const result = await callGeminiForJson(payload);

    expect(result.quote).toBe('She said "Hello"');
  });
});
