import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

const developmentEnvPath = path.resolve(__dirname, '../.env');
const testEnvPath = path.resolve(__dirname, '../.env.test');

if (fs.existsSync(developmentEnvPath) && fs.existsSync(testEnvPath)) {
  const developmentEnv = dotenv.parse(fs.readFileSync(developmentEnvPath));
  const testEnv = dotenv.parse(fs.readFileSync(testEnvPath));

  if (
    developmentEnv.DATABASE_URL &&
    testEnv.DATABASE_URL &&
    developmentEnv.DATABASE_URL === testEnv.DATABASE_URL
  ) {
    throw new Error(
      'Refusing to run tests: .env.test DATABASE_URL must differ from the development DATABASE_URL.',
    );
  }
}

// Global setup for all Jest tests
jest.mock('../src/services/sharepoint/GraphSharePointClient', () => {
  return {
    GraphSharePointClient: jest.fn().mockImplementation(() => {
      return {
        uploadFile: jest.fn().mockResolvedValue('https://mock-sharepoint.com/mock-file.xlsx')
      };
    })
  };
});
