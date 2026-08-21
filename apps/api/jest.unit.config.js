const baseConfig = require('./jest.config');

module.exports = {
  ...baseConfig,
  testMatch: [
    '<rootDir>/tests/unit/**/*.test.ts',
    '<rootDir>/tests/utils/**/*.test.ts',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/tests/unit/DailyActivityMomExportService\.test\.ts$',
  ],
};
