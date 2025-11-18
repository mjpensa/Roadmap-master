/**
 * Mock helpers for Jest ES modules
 * Provides utility functions for creating mocks in ES module tests
 */

/**
 * Creates a Jest mock function
 * This is a wrapper to ensure jest.fn() is called in the right context
 */
export function fn() {
  // In Jest environment, jest should be available
  if (typeof jest !== 'undefined') {
    return jest.fn();
  }

  // Fallback for non-Jest environments
  const mockFn = function(...args) {
    mockFn.mock.calls.push(args);
    return mockFn.mock.results[mockFn.mock.calls.length - 1];
  };

  mockFn.mock = {
    calls: [],
    results: [],
  };

  mockFn.mockImplementation = (impl) => {
    mockFn.mock.implementation = impl;
    return mockFn;
  };

  mockFn.mockReturnValue = (value) => {
    mockFn.mock.results = [value];
    return mockFn;
  };

  mockFn.mockReturnThis = () => {
    return mockFn;
  };

  return mockFn;
}
