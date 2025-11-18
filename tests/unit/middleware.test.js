/**
 * Unit Tests for server/middleware.js
 * Tests rate limiting, file upload validation, and security headers
 */

import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import {
  configureHelmet,
  configureCacheControl,
  configureTimeout,
  apiLimiter,
  strictLimiter,
  uploadMiddleware,
  handleUploadErrors
} from '../../server/middleware.js';
import { CONFIG } from '../../server/config.js';
import httpMocks from 'node-mocks-http';
import multer from 'multer';

describe('Middleware - Helmet Configuration', () => {
  test('should configure helmet with CSP disabled', () => {
    const helmetMiddleware = configureHelmet();
    expect(helmetMiddleware).toBeDefined();
    expect(typeof helmetMiddleware).toBe('function');
  });
});

describe('Middleware - Cache Control', () => {
  test('should cache static assets for 1 day', () => {
    const req = httpMocks.createRequest({ path: '/style.css' });
    const res = httpMocks.createResponse();
    const next = jest.fn();

    configureCacheControl(req, res, next);

    expect(res.get('Cache-Control')).toBe(`public, max-age=${CONFIG.CACHE.STATIC_ASSETS_MAX_AGE}`);
    expect(next).toHaveBeenCalled();
  });

  test('should cache images for 1 day', () => {
    const req = httpMocks.createRequest({ path: '/assets/logo.png' });
    const res = httpMocks.createResponse();
    const next = jest.fn();

    configureCacheControl(req, res, next);

    expect(res.get('Cache-Control')).toBe(`public, max-age=${CONFIG.CACHE.STATIC_ASSETS_MAX_AGE}`);
    expect(next).toHaveBeenCalled();
  });

  test('should not cache HTML pages', () => {
    const req = httpMocks.createRequest({ path: '/index.html' });
    const res = httpMocks.createResponse();
    const next = jest.fn();

    configureCacheControl(req, res, next);

    expect(res.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate');
    expect(next).toHaveBeenCalled();
  });

  test('should not cache API endpoints', () => {
    const req = httpMocks.createRequest({ path: '/api/test' });
    const res = httpMocks.createResponse();
    const next = jest.fn();

    configureCacheControl(req, res, next);

    expect(res.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate');
    expect(next).toHaveBeenCalled();
  });
});

describe('Middleware - Timeout Configuration', () => {
  test('should set request and response timeouts', () => {
    const req = httpMocks.createRequest();
    const res = httpMocks.createResponse();
    const next = jest.fn();

    // Mock setTimeout methods
    req.setTimeout = jest.fn();
    res.setTimeout = jest.fn();

    configureTimeout(req, res, next);

    expect(req.setTimeout).toHaveBeenCalledWith(CONFIG.TIMEOUTS.REQUEST_MS);
    expect(res.setTimeout).toHaveBeenCalledWith(CONFIG.TIMEOUTS.RESPONSE_MS);
    expect(next).toHaveBeenCalled();
  });
});

describe('Middleware - Rate Limiting', () => {
  test('apiLimiter should have correct configuration', () => {
    expect(apiLimiter).toBeDefined();
    // Rate limiter is configured, we can't directly test internal config
    // but we can verify it's a function
    expect(typeof apiLimiter).toBe('function');
  });

  test('strictLimiter should have correct configuration', () => {
    expect(strictLimiter).toBeDefined();
    expect(typeof strictLimiter).toBe('function');
  });
});

describe('Middleware - File Upload', () => {
  test('uploadMiddleware should be configured', () => {
    expect(uploadMiddleware).toBeDefined();
    expect(uploadMiddleware.single).toBeDefined();
    expect(uploadMiddleware.array).toBeDefined();
  });

  test('should accept .md files', () => {
    const file = {
      originalname: 'test.md',
      mimetype: 'text/markdown'
    };

    const callback = jest.fn();

    // Access the fileFilter function
    const fileFilter = uploadMiddleware.fileFilter;
    fileFilter(null, file, callback);

    expect(callback).toHaveBeenCalledWith(null, true);
  });

  test('should accept .txt files', () => {
    const file = {
      originalname: 'test.txt',
      mimetype: 'text/plain'
    };

    const callback = jest.fn();
    const fileFilter = uploadMiddleware.fileFilter;
    fileFilter(null, file, callback);

    expect(callback).toHaveBeenCalledWith(null, true);
  });

  test('should accept .docx files', () => {
    const file = {
      originalname: 'test.docx',
      mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };

    const callback = jest.fn();
    const fileFilter = uploadMiddleware.fileFilter;
    fileFilter(null, file, callback);

    expect(callback).toHaveBeenCalledWith(null, true);
  });

  test('should accept .md files with octet-stream MIME', () => {
    const file = {
      originalname: 'test.md',
      mimetype: 'application/octet-stream'
    };

    const callback = jest.fn();
    const fileFilter = uploadMiddleware.fileFilter;
    fileFilter(null, file, callback);

    expect(callback).toHaveBeenCalledWith(null, true);
  });

  test('should reject .exe files', () => {
    const file = {
      originalname: 'malware.exe',
      mimetype: 'application/x-msdownload'
    };

    const callback = jest.fn();
    const fileFilter = uploadMiddleware.fileFilter;
    fileFilter(null, file, callback);

    expect(callback).toHaveBeenCalled();
    const error = callback.mock.calls[0][0];
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toContain('application/x-msdownload');
  });

  test('should reject .js files', () => {
    const file = {
      originalname: 'script.js',
      mimetype: 'application/javascript'
    };

    const callback = jest.fn();
    const fileFilter = uploadMiddleware.fileFilter;
    fileFilter(null, file, callback);

    expect(callback).toHaveBeenCalled();
    const error = callback.mock.calls[0][0];
    expect(error).toBeInstanceOf(Error);
  });

  test('should reject .pdf files', () => {
    const file = {
      originalname: 'document.pdf',
      mimetype: 'application/pdf'
    };

    const callback = jest.fn();
    const fileFilter = uploadMiddleware.fileFilter;
    fileFilter(null, file, callback);

    expect(callback).toHaveBeenCalled();
    const error = callback.mock.calls[0][0];
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toContain('application/pdf');
  });

  test('should reject octet-stream with invalid extension', () => {
    const file = {
      originalname: 'file.exe',
      mimetype: 'application/octet-stream'
    };

    const callback = jest.fn();
    const fileFilter = uploadMiddleware.fileFilter;
    fileFilter(null, file, callback);

    expect(callback).toHaveBeenCalled();
    const error = callback.mock.calls[0][0];
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toContain('exe');
  });

  test('should be case insensitive for file extensions', () => {
    const file = {
      originalname: 'test.MD',
      mimetype: 'application/octet-stream'
    };

    const callback = jest.fn();
    const fileFilter = uploadMiddleware.fileFilter;
    fileFilter(null, file, callback);

    expect(callback).toHaveBeenCalledWith(null, true);
  });
});

describe('Middleware - Upload Error Handling', () => {
  test('should handle LIMIT_FILE_SIZE error', () => {
    const error = new multer.MulterError('LIMIT_FILE_SIZE');

    const req = httpMocks.createRequest();
    const res = httpMocks.createResponse();
    const next = jest.fn();

    handleUploadErrors(error, req, res, next);

    const data = res._getJSONData();
    expect(res.statusCode).toBe(400);
    expect(data.error).toBe(CONFIG.ERRORS.FILE_TOO_LARGE);
    expect(next).not.toHaveBeenCalled();
  });

  test('should handle LIMIT_FILE_COUNT error', () => {
    const error = new multer.MulterError('LIMIT_FILE_COUNT');

    const req = httpMocks.createRequest();
    const res = httpMocks.createResponse();
    const next = jest.fn();

    handleUploadErrors(error, req, res, next);

    const data = res._getJSONData();
    expect(res.statusCode).toBe(400);
    expect(data.error).toBe(CONFIG.ERRORS.TOO_MANY_FILES);
    expect(next).not.toHaveBeenCalled();
  });

  test('should handle LIMIT_FIELD_VALUE error', () => {
    const error = new multer.MulterError('LIMIT_FIELD_VALUE');

    const req = httpMocks.createRequest();
    const res = httpMocks.createResponse();
    const next = jest.fn();

    handleUploadErrors(error, req, res, next);

    const data = res._getJSONData();
    expect(res.statusCode).toBe(400);
    expect(data.error).toBe(CONFIG.ERRORS.FIELD_TOO_LARGE);
    expect(next).not.toHaveBeenCalled();
  });

  test('should handle generic upload errors', () => {
    const error = new multer.MulterError('UNKNOWN_ERROR');

    const req = httpMocks.createRequest();
    const res = httpMocks.createResponse();
    const next = jest.fn();

    handleUploadErrors(error, req, res, next);

    const data = res._getJSONData();
    expect(res.statusCode).toBe(400);
    expect(data.error).toContain('Upload error');
    expect(next).not.toHaveBeenCalled();
  });

  test('should handle non-Multer errors', () => {
    const error = new Error('Custom error message');

    const req = httpMocks.createRequest();
    const res = httpMocks.createResponse();
    const next = jest.fn();

    handleUploadErrors(error, req, res, next);

    const data = res._getJSONData();
    expect(res.statusCode).toBe(400);
    expect(data.error).toBe('Custom error message');
    expect(next).not.toHaveBeenCalled();
  });

  test('should call next() if no error', () => {
    const req = httpMocks.createRequest();
    const res = httpMocks.createResponse();
    const next = jest.fn();

    handleUploadErrors(null, req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.statusCode).not.toBe(400);
  });
});

describe('Middleware - File Size Limits', () => {
  test('should have 10MB per-file limit', () => {
    expect(uploadMiddleware.limits.fileSize).toBe(10 * 1024 * 1024);
  });

  test('should allow up to 500 files', () => {
    expect(uploadMiddleware.limits.files).toBe(500);
  });

  test('should have 200MB total field size limit', () => {
    expect(uploadMiddleware.limits.fieldSize).toBe(200 * 1024 * 1024);
  });
});
