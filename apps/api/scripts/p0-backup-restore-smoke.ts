import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  assertDisposableDatabaseName,
  assertIsolatedTestDatabaseUrl,
} from '../../../scripts/db/database-safety.ts';

function runDatabaseScript(scriptPath: string, env: NodeJS.ProcessEnv): void {
  const result = spawnSync(
    process.execPath,
    ['--experimental-strip-types', scriptPath],
    { cwd: process.cwd(), stdio: 'inherit', env },
  );
  if (result.error) throw new Error(`Database smoke command could not start: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`Database smoke command failed with exit code ${result.status}`);
}

async function main(): Promise<void> {
  assertIsolatedTestDatabaseUrl(process.env.DATABASE_URL);
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');

  const temporaryDirectory = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'crms-p0-backup-'));
  const backupPath = path.join(temporaryDirectory, 'crms-p0-smoke.sql');
  const restoreName = assertDisposableDatabaseName(`crms_restore_p0_${Date.now()}_${process.pid}`);
  const scriptsDirectory = path.resolve(process.cwd(), '../../scripts/db');

  try {
    runDatabaseScript(path.join(scriptsDirectory, 'backup.ts'), {
      ...process.env,
      BACKUP_OUTPUT_PATH: backupPath,
    });
    const backup = await fsPromises.readFile(backupPath, 'utf8');
    if (backup.length === 0 || !backup.includes('SET FOREIGN_KEY_CHECKS = 0;')) {
      throw new Error('Backup smoke failed: backup file is empty or missing integrity markers');
    }
    console.log(`Backup smoke created ${backupPath} (${backup.length} bytes)`);

    runDatabaseScript(path.join(scriptsDirectory, 'restore-drill.ts'), {
      ...process.env,
      BACKUP_INPUT_PATH: backupPath,
      RESTORE_DATABASE_NAME: restoreName,
      ALLOW_RESTORE_REPLACE: 'true',
    });
    console.log(`Backup/restore smoke passed: restored into ${restoreName}`);
  } finally {
    try {
      runDatabaseScript(path.join(scriptsDirectory, 'drop-disposable-database.ts'), {
        ...process.env,
        DISPOSABLE_DATABASE_NAME: restoreName,
        ALLOW_DISPOSABLE_DROP: 'true',
      });
    } finally {
      if (fs.existsSync(temporaryDirectory)) {
        await fsPromises.rm(temporaryDirectory, { recursive: true, force: true });
      }
    }
  }
}

main().catch((error) => {
  console.error('Backup/restore smoke failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

