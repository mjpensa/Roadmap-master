export default {
  // Test environment
  testEnvironment: 'node',

  // Enable ES modules support
  transform: {},

  // Coverage configuration
  collectCoverageFrom: [
    'server/**/*.js',
    // Frontend files excluded for now - add back when frontend tests are comprehensive
    // 'Public/**/*.js',
    '!server/prompts.js', // Exclude large prompt file from coverage
    '!**/node_modules/**',
    '!**/coverage/**',
  ],

  coverageDirectory: 'coverage',

  coverageReporters: ['text', 'lcov', 'html'],

  // Coverage thresholds (realistic based on current state, gradually increase)
  // Note: Routes have 0% coverage pending proper HTTP integration tests
  // Core modules have strong coverage (utils.js: 100%, storage.js: 40%)
  coverageThreshold: {
    global: {
      branches: 5,    // Start low, gradually increase as routes get tested
      functions: 10,
      lines: 5,
      statements: 5,
    },
    // Per-module thresholds for critical components
    './server/utils.js': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './server/storage.js': {
      branches: 40,
      functions: 80,
      lines: 40,
      statements: 40,
    },
  },

  // Test match patterns
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/?(*.)+(spec|test).js',
  ],

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
  ],

  // Verbose output
  verbose: true,

  // Test timeout
  testTimeout: 10000,

  // Make Jest globals available in ES modules
  injectGlobals: true,

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};
