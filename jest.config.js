/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  
  // Test files configuration
  testMatch: [
    '<rootDir>/tests/**/*.test.ts',
    '<rootDir>/tests/**/*.spec.ts'
  ],
  
  // Module resolution
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/main.ts' // Exclude entry point from coverage
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // Mock configuration
  clearMocks: true,
  restoreMocks: true,
  
  // Test timeout
  testTimeout: 10000,
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/coverage/',
    '<rootDir>/dist/'
  ],
  
  // TypeScript configuration for ts-jest
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: './tsconfig.json'
    }]
  }
};