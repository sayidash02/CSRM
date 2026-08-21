import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import {
  assertIsolatedTestDatabaseUrl,
  databaseNameFromUrl,
} from '../../../scripts/db/database-safety';

process.env.CRMS_TEST_AUTH_BYPASS = 'true';

const developmentEnvPath = path.resolve(__dirname, '../.env');
const testEnvPath = path.resolve(__dirname, '../.env.test');

if (!fs.existsSync(testEnvPath)) {
  throw new Error('Refusing to run tests: apps/api/.env.test is required.');
}

const testEnv = dotenv.parse(fs.readFileSync(testEnvPath));
const configuredTestUrl = testEnv.DATABASE_URL;
const testDatabaseName = assertIsolatedTestDatabaseUrl(configuredTestUrl);
const testDatabaseUrl = configuredTestUrl as string;

if (process.env.DATABASE_URL && process.env.DATABASE_URL !== testDatabaseUrl) {
  throw new Error(
    'Refusing to run tests: DATABASE_URL must match apps/api/.env.test. ' +
      `Integration tests must never inherit a development or production database URL (configured=${databaseNameFromUrl(process.env.DATABASE_URL)}, expected=${testDatabaseName}).`,
  );
}
process.env.DATABASE_URL = testDatabaseUrl;

if (fs.existsSync(developmentEnvPath) && fs.existsSync(testEnvPath)) {
  const developmentEnv = dotenv.parse(fs.readFileSync(developmentEnvPath));

  if (
    developmentEnv.DATABASE_URL &&
    testDatabaseUrl &&
    developmentEnv.DATABASE_URL === testDatabaseUrl
  ) {
    throw new Error(
      'Refusing to run tests: .env.test DATABASE_URL must differ from the development DATABASE_URL.',
    );
  }
}
