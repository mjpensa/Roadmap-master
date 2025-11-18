/**
 * Fixed tests for upload error handling
 */

import { describe, test, expect, jest } from '@jest/globals';
import { handleUploadErrors } from '../../server/middleware.js';
import { CONFIG } from '../../server/config.js';
import httpMocks from 'node-mocks-http';
import multer from 'multer';

describe('Middleware - Upload Error Handling (Fixed)', () => {
  test('should handle LIMIT_FILE_SIZE as Multer error', () => {
    const error = new multer.MulterError('LIMIT_FILE_SIZE');

    const req = httpMocks.createRequest();
    const res = httpMocks.createResponse();
    const next = jest.fn();

    handleUploadErrors(error, req, res, next);

    const data = res._getJSONData();
    expect(res.statusCode).toBe(400);
    expect(data.error).toBe(CONFIG.ERRORS.FILE_TOO_LARGE);
  });

  test('should handle LIMIT_FILE_COUNT as Multer error', () => {
    const error = new multer.MulterError('LIMIT_FILE_COUNT');

    const req = httpMocks.createRequest();
    const res = httpMocks.createResponse();
    const next = jest.fn();

    handleUploadErrors(error, req, res, next);

    const data = res._getJSONData();
    expect(res.statusCode).toBe(400);
    expect(data.error).toBe(CONFIG.ERRORS.TOO_MANY_FILES);
  });

  test('should handle LIMIT_FIELD_VALUE as Multer error', () => {
    const error = new multer.MulterError('LIMIT_FIELD_VALUE');

    const req = httpMocks.createRequest();
    const res = httpMocks.createResponse();
    const next = jest.fn();

    handleUploadErrors(error, req, res, next);

    const data = res._getJSONData();
    expect(res.statusCode).toBe(400);
    expect(data.error).toBe(CONFIG.ERRORS.FIELD_TOO_LARGE);
  });

  test('should handle other Multer errors', () => {
    const error = new multer.MulterError('UNKNOWN_CODE');

    const req = httpMocks.createRequest();
    const res = httpMocks.createResponse();
    const next = jest.fn();

    handleUploadErrors(error, req, res, next);

    const data = res._getJSONData();
    expect(res.statusCode).toBe(400);
    expect(data.error).toContain('Upload error');
  });
});
