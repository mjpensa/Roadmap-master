# Testing Guide

## Overview

This project uses **Jest** as the primary testing framework with comprehensive test coverage for critical security and business logic components.

## Quick Start

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration
```

## Test Structure

```
__tests__/
├── unit/                    # Unit tests
│   ├── server/             # Backend unit tests
│   │   ├── utils.test.js          # ✅ 100% coverage
│   │   ├── storage.test.js        # ✅ 40% coverage
│   │   ├── storage-cleanup.test.js # ✅ Cleanup logic
│   │   ├── middleware.test.js     # ⚠️  11% coverage
│   │   └── gemini-simple.test.js  # ⚠️  Placeholder
│   └── frontend/           # Frontend unit tests
│       └── Utils.test.js          # ✅ Date/validation tests
└── integration/            # Integration tests
    ├── charts.test.js             # ✅ Chart routes
    └── analysis.test.js           # ✅ Analysis routes
```

## Coverage Goals

### Critical Components (90%+ target)

| Component | Current | Target | Priority |
|-----------|---------|--------|----------|
| `server/utils.js` | 100% ✅ | 100% | Critical |
| `server/storage.js` | 40% | 80% | High |
| `server/middleware.js` | 11% | 80% | High |

### Business Logic (80%+ target)

| Component | Current | Target | Priority |
|-----------|---------|--------|----------|
| `server/routes/charts.js` | 0% | 80% | High |
| `server/routes/analysis.js` | 0% | 80% | High |
| `server/config.js` | 72% ✅ | 80% | Medium |

### Frontend (60%+ target)

| Component | Current | Target | Priority |
|-----------|---------|--------|----------|
| `Public/Utils.js` | ~30% | 60% | Medium |
| `Public/GanttChart.js` | 0% | 60% | Low |
| `Public/main.js` | 0% | 60% | Low |

## Writing Tests

### Unit Test Example

```javascript
import { sanitizePrompt } from '../../../server/utils.js';

describe('sanitizePrompt', () => {
  test('should detect XSS attempts', () => {
    const malicious = '<script>alert("XSS")</script>';
    const result = sanitizePrompt(malicious);

    expect(result).toContain('[SYSTEM SECURITY');
    expect(result).toContain('untrusted user input');
  });
});
```

### Integration Test Example

```javascript
import * as storage from '../../server/storage.js';

describe('Chart Generation Workflow', () => {
  test('should complete full workflow', () => {
    const jobId = storage.createJob();
    expect(jobId).toBeDefined();

    storage.updateJob(jobId, {
      status: 'processing',
      progress: 'Generating chart...',
    });

    const job = storage.getJob(jobId);
    expect(job.status).toBe('processing');
  });
});
```

## Test Categories

### 1. Security Tests ✅
- **Input sanitization** - XSS, SQL injection, prompt injection
- **File upload validation** - MIME types, extensions, size limits
- **URL validation** - Protocol validation, dangerous URLs
- **ID validation** - Format enforcement, path traversal prevention

### 2. Data Integrity Tests ✅
- **CRUD operations** - Create, read, update, delete
- **Concurrent operations** - Race conditions, data consistency
- **Error handling** - Graceful failures, error messages

### 3. Business Logic Tests ⚠️
- **Chart generation** - Full workflow, error handling
- **Task analysis** - AI integration, response validation
- **Q&A functionality** - Question validation, answer generation

### 4. Frontend Tests ⚠️
- **Date calculations** - Week numbers, column positioning
- **Validation** - URL safety, input validation
- **DOM manipulation** - Element access, event handling

## Coverage Reports

### Viewing HTML Reports

After running `npm run test:coverage`, open:

```bash
open coverage/index.html
```

### Coverage Badges

![Coverage](https://img.shields.io/badge/coverage-check_reports-blue)

## CI/CD Integration

### GitHub Actions

Tests run automatically on:
- Every push to any branch
- Every pull request
- Multiple Node.js versions (18.x, 20.x)

### Workflow Steps

1. **Test** - Run full test suite
2. **Lint** - Code quality checks
3. **Security** - Dependency audit, secret scanning
4. **Coverage** - Generate and upload coverage reports
5. **Build** - Verify no build errors

## Known Issues

### ES Module Mocking

Jest's experimental ES module support has limitations. Some tests use workarounds for `jest.fn()`.

**Solutions:**
1. Migrate to **Vitest** (better ES module support)
2. Use `unstable_mockModule` API
3. Refactor to CommonJS (not recommended)

### Skipped Tests

Tests in `*.test.js.skip` files are excluded from runs. These are typically complex mocks that need refactoring.

## Best Practices

### 1. Test Naming

```javascript
// ✅ Good
test('should return 404 for non-existent chart ID', () => {...});

// ❌ Bad
test('test chart', () => {...});
```

### 2. Test Organization

```javascript
describe('Component Name', () => {
  describe('Method Name', () => {
    test('should handle normal case', () => {...});
    test('should handle edge case', () => {...});
    test('should handle error case', () => {...});
  });
});
```

### 3. Arrange-Act-Assert Pattern

```javascript
test('should create a session', () => {
  // Arrange
  const researchText = 'Test data';
  const files = ['test.txt'];

  // Act
  const sessionId = createSession(researchText, files);

  // Assert
  expect(sessionId).toBeDefined();
  expect(typeof sessionId).toBe('string');
});
```

### 4. Mock External Dependencies

```javascript
beforeAll(() => {
  jest.spyOn(gemini, 'callGeminiForJson').mockResolvedValue({
    title: 'Test Chart',
    data: [],
  });
});

afterAll(() => {
  jest.restoreAllMocks();
});
```

## Troubleshooting

### Tests Failing Locally

```bash
# Clear Jest cache
npx jest --clearCache

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Run tests in band (no parallel)
npm test -- --runInBand
```

### Coverage Not Generating

```bash
# Ensure coverage directory is clean
rm -rf coverage

# Generate fresh coverage
npm run test:coverage
```

### ES Module Errors

If you see `Cannot use import statement outside a module`:

1. Check `package.json` has `"type": "module"`
2. Check `jest.config.js` is using ES module export
3. Check test files use `.js` extension (not `.mjs`)

## Contributing

### Adding New Tests

1. Create test file in appropriate directory
2. Follow naming convention: `*.test.js`
3. Import modules using ES6 `import`
4. Use descriptive test names
5. Add to appropriate describe block
6. Run tests to verify they pass
7. Check coverage impact

### Updating Thresholds

As coverage improves, update `jest.config.js`:

```javascript
coverageThreshold: {
  global: {
    branches: 20,  // Increase gradually
    functions: 25,
    lines: 25,
    statements: 25,
  },
}
```

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [ES Modules in Jest](https://jestjs.io/docs/ecmascript-modules)

## Support

For testing questions or issues:
1. Check this documentation
2. Review existing tests for examples
3. Check [TESTING_SUMMARY.md](./TESTING_SUMMARY.md) for detailed analysis
4. Create an issue on GitHub

---

**Last Updated:** 2025-11-18
**Test Framework:** Jest 30.2.0
**Coverage Tool:** Istanbul (built into Jest)
**Total Tests:** 200+ (and growing)
