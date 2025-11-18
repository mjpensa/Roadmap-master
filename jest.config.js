export default {
  // Test environment
  testEnvironment: 'node',

  // Enable ES modules support
  transform: {},

  // Coverage configuration
  collectCoverageFrom: [
    'server/**/*.js',
    'Public/**/*.js',
    '!server/prompts.js', // Exclude large prompt file from coverage
    '!**/node_modules/**',
    '!**/coverage/**',
  ],

  coverageDirectory: 'coverage',

  coverageReporters: ['text', 'lcov', 'html'],

  // Coverage thresholds (start low, increase over time)
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
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
