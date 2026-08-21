import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '../../apps/api/node_modules/@prisma/client/default.js';

type TableRow = { TABLE_NAME: string };
type CountRow = { count: bigint | number };
type ConstraintRow = { CONSTRAINT_NAME: string; TABLE_NAME: string; CONSTRAINT_TYPE: string };

const restoreNameValue = process.env.RESTORE_DATABASE_NAME;
const backupPath = process.env.BACKUP_INPUT_PATH;
if (!restoreNameValue || !/^crms_restore_[a-z0-9_]+$/i.test(restoreNameValue)) {
  throw new Error('RESTORE_DATABASE_NAME must use a safe disposable name such as crms_restore_stage2');
}
const restoreName: string = restoreNameValue;
if (!backupPath || !fs.existsSync(backupPath)) {
  throw new Error('BACKUP_INPUT_PATH must point to an existing backup file');
}

const prisma = new PrismaClient();

function identifier(value: string): string {
  if (!/^[A-Za-z0-9_]+$/.test(value)) throw new Error(`Unsafe database identifier: ${value}`);
  return `\`${value}\``;
}

async function main(): Promise<void> {
  const databaseRows = await prisma.$queryRaw<Array<{ database_name: string | null }>>`
    SELECT DATABASE() AS database_name
  `;
  const sourceName = databaseRows[0]?.database_name;
  if (!sourceName || sourceName === restoreName) throw new Error('Restore database must differ from source database');

  const existing = await prisma.$queryRaw<Array<{ SCHEMA_NAME: string }>>`
    SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ${restoreName}
  `;
  if (existing.length > 0) {
    if (process.env.ALLOW_RESTORE_REPLACE !== 'true') {
      throw new Error(`Restore database ${restoreName} already exists; set ALLOW_RESTORE_REPLACE=true to replace it`);
    }
    await prisma.$executeRawUnsafe(`DROP DATABASE ${identifier(restoreName)}`);
  }
  await prisma.$executeRawUnsafe(`CREATE DATABASE ${identifier(restoreName)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);

  const sourceUrl = process.env.DATABASE_URL?.trim().replace(/^"|"$/g, '');
  if (!sourceUrl) throw new Error('DATABASE_URL is required');
  const restoreUrl = new URL(sourceUrl);
  restoreUrl.pathname = `/${restoreName}`;

  const prismaCommand = process.platform === 'win32'
    ? 'node_modules\\.bin\\prisma.cmd'
    : path.resolve(process.cwd(), 'node_modules/.bin/prisma');
  const prismaArgs = ['db', 'execute', '--file', path.resolve(backupPath), '--schema', 'prisma/schema.prisma'];
  const childEnv = { ...process.env, DATABASE_URL: restoreUrl.toString() };
  const result = process.platform === 'win32'
    ? spawnSync(
        process.env.ComSpec || 'cmd.exe',
        ['/d', '/s', '/c', [prismaCommand, ...prismaArgs].map((value) => value.includes(' ') ? `"${value.replace(/"/g, '""')}"` : value).join(' ')],
        { cwd: process.cwd(), stdio: 'inherit', env: childEnv },
      )
    : spawnSync(prismaCommand, prismaArgs, {
        cwd: process.cwd(),
        stdio: 'inherit',
        env: childEnv,
      });
  if (result.error) throw new Error(`Restore command could not start: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`Restore command failed with exit code ${result.status}`);

  const restored = new PrismaClient({ datasources: { db: { url: restoreUrl.toString() } } });
  try {
    const tables = await restored.$queryRaw<TableRow[]>`
      SELECT TABLE_NAME
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `;
    for (const table of tables) {
      const sourceRows = await prisma.$queryRawUnsafe<CountRow[]>(`SELECT COUNT(*) AS count FROM ${identifier(table.TABLE_NAME)}`);
      const restoredRows = await restored.$queryRawUnsafe<CountRow[]>(`SELECT COUNT(*) AS count FROM ${identifier(table.TABLE_NAME)}`);
      const sourceCount = Number(sourceRows[0]?.count || 0);
      const restoredCount = Number(restoredRows[0]?.count || 0);
      console.log(`${table.TABLE_NAME}: source=${sourceCount} restored=${restoredCount}`);
      if (sourceCount !== restoredCount) {
        throw new Error(`Row-count mismatch for ${table.TABLE_NAME}: source=${sourceCount}, restored=${restoredCount}`);
      }
    }

    const sourceConstraints = await prisma.$queryRaw<ConstraintRow[]>`
      SELECT CONSTRAINT_NAME, TABLE_NAME, CONSTRAINT_TYPE
      FROM information_schema.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = DATABASE()
      ORDER BY TABLE_NAME, CONSTRAINT_NAME
    `;
    const restoredConstraints = await restored.$queryRaw<ConstraintRow[]>`
      SELECT CONSTRAINT_NAME, TABLE_NAME, CONSTRAINT_TYPE
      FROM information_schema.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = DATABASE()
      ORDER BY TABLE_NAME, CONSTRAINT_NAME
    `;
    if (JSON.stringify(sourceConstraints) !== JSON.stringify(restoredConstraints)) {
      throw new Error('Constraint inventory mismatch between source and restored database');
    }
    console.log(`Constraints compared: ${sourceConstraints.length}`);
    console.log(`Restore drill completed: ${restoreName}`);
  } finally {
    await restored.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error('Restore drill failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
