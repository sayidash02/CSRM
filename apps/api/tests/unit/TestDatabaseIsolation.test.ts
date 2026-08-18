import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

function readDatabaseUrl(fileName: string): string | undefined {
  const filePath = path.resolve(__dirname, '../../', fileName);
  if (!fs.existsSync(filePath)) return undefined;
  return dotenv.parse(fs.readFileSync(filePath)).DATABASE_URL;
}

describe('test database isolation', () => {
  it('uses a database URL different from development', () => {
    const developmentUrl = readDatabaseUrl('.env');
    const testUrl = readDatabaseUrl('.env.test');

    expect(developmentUrl).toBeTruthy();
    expect(testUrl).toBeTruthy();
    expect(testUrl).not.toBe(developmentUrl);
  });
});
