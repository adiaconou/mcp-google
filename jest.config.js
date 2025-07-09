// eslint-disable-next-line no-undef
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  // Improved test teardown configuration
  testTimeout: 30000, // 30 second timeout for tests
  forceExit: true, // Force Jest to exit after tests complete
  detectOpenHandles: false, // Disable open handle detection to reduce noise
  // Ensure proper cleanup of resources
  setupFilesAfterEnv: [],
  // Better error handling for worker processes
  maxWorkers: 1, // Use single worker to avoid resource conflicts
};
