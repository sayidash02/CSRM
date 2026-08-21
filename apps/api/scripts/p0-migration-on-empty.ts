import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import {
  assertDisposableDatabaseName,
  assertIsolatedTestDatabaseUrl,
  databaseUrlForName,
  quoteDatabaseIdentifier,
} from '../../../scripts/db/database-safety.ts';

type MigrationRow = { migration_name: string; finished_at: Date | null };

function runPrisma(args: string[], env: NodeJS.ProcessEnv): void {
  const prismaCli = path.resolve(process.cwd(), 'node_modules/prisma/build/index.js');
  const result = spawnSync(process.execPath, [prismaCli, ...args], {
    cwd: process.cwd(),
    stdio: 'inherit',
    env,
  });

  if (result.error) throw new Error(`Prisma command could not start: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`Prisma command failed with exit code ${result.status}`);
}

async function main(): Promise<void> {
  const sourceUrl = process.env.DATABASE_URL;
  const sourceName = assertIsolatedTestDatabaseUrl(sourceUrl);
  const sourceDatabaseUrl = sourceUrl as string;
  const disposableName = assertDisposableDatabaseName(
    `crms_clone_migration_${Date.now()}_${process.pid}`,
  );
  if (disposableName === sourceName) throw new Error('Disposable migration database must differ from source');

  const source = new PrismaClient({ datasources: { db: { url: sourceDatabaseUrl } } });
  let created = false;
  try {
    const existing = await source.$queryRaw<Array<{ SCHEMA_NAME: string }>>`
      SELECT SCHEMA_NAME
      FROM information_schema.SCHEMATA
      WHERE SCHEMA_NAME = ${disposableName}
    `;
    if (existing.length > 0) {
      throw new Error(`Disposable migration database already exists: ${disposableName}`);
    }

    await source.$executeRawUnsafe(
      `CREATE DATABASE ${quoteDatabaseIdentifier(disposableName)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
    created = true;

    const targetUrl = databaseUrlForName(sourceDatabaseUrl, disposableName);
    runPrisma(['migrate', 'deploy', '--schema', 'prisma/schema.prisma'], {
      ...process.env,
      DATABASE_URL: targetUrl,
    });

    const target = new PrismaClient({ datasources: { db: { url: targetUrl } } });
    try {
      const tables = await target.$queryRaw<Array<{ TABLE_NAME: string }>>`
        SELECT TABLE_NAME
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'
      `;
      const tableNames = new Set(tables.map((row) => row.TABLE_NAME));
      for (const requiredTable of ['proposals', 'grievance', 'daily_activities', 'lrp']) {
        if (!tableNames.has(requiredTable)) {
          throw new Error(`Migration-on-empty database is missing table ${requiredTable}`);
        }
      }

      const migrationRows = await target.$queryRaw<MigrationRow[]>`
        SELECT migration_name, finished_at
        FROM _prisma_migrations
        ORDER BY started_at, migration_name
      `;
      const migrationDirectories = (await fs.readdir(path.resolve(process.cwd(), 'prisma/migrations'), { withFileTypes: true }))
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort();
      const appliedNames = new Set(migrationRows.filter((row) => row.finished_at !== null).map((row) => row.migration_name));
      const missing = migrationDirectories.filter((name) => !appliedNames.has(name));
      if (missing.length > 0) {
        throw new Error(`Migration-on-empty database has unapplied migrations: ${missing.join(', ')}`);
      }
      console.log(`Migration-on-empty passed: ${disposableName} (${migrationRows.length} migrations, ${tables.length} tables)`);
    } finally {
      await target.$disconnect();
    }
  } finally {
    if (created) {
      await source.$executeRawUnsafe(`DROP DATABASE ${quoteDatabaseIdentifier(disposableName)}`);
      console.log(`Dropped disposable migration database: ${disposableName}`);
    }
    await source.$disconnect();
  }
}

main().catch((error) => {
  console.error('Migration-on-empty failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
