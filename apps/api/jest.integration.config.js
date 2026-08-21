const baseConfig = require('./jest.config');

module.exports = {
  ...baseConfig,
  testMatch: [
    '<rootDir>/tests/integration/**/*.test.ts',
    '<rootDir>/tests/*.test.ts',
    '<rootDir>/tests/unit/DailyActivityMomExportService.test.ts',
  ],
};
