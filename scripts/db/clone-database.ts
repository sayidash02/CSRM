import { PrismaClient } from '../../apps/api/node_modules/@prisma/client/default.js';

type TableRow = { TABLE_NAME: string };
type CountRow = { count: bigint | number };

const cloneNameValue = process.env.CLONE_DATABASE_NAME;
if (!cloneNameValue || !/^crms_(clone|restore)_[a-z0-9_]+$/i.test(cloneNameValue)) {
  throw new Error('CLONE_DATABASE_NAME must use a safe disposable name such as crms_clone_stage2');
}
const cloneName: string = cloneNameValue;

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
  if (!sourceName || sourceName === cloneName) throw new Error('Clone database must differ from source database');

  const existing = await prisma.$queryRaw<Array<{ SCHEMA_NAME: string }>>`
    SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ${cloneName}
  `;
  if (existing.length > 0) {
    if (process.env.ALLOW_CLONE_REPLACE !== 'true') {
      throw new Error(`Clone ${cloneName} already exists; set ALLOW_CLONE_REPLACE=true to replace it`);
    }
    await prisma.$executeRawUnsafe(`DROP DATABASE ${identifier(cloneName)}`);
  }

  await prisma.$executeRawUnsafe(`CREATE DATABASE ${identifier(cloneName)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  if (process.env.CLONE_EMPTY === 'true') {
    console.log(`Empty disposable database ready: ${cloneName}`);
    return;
  }

  const tables = await prisma.$queryRaw<TableRow[]>`
    SELECT TABLE_NAME
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'
    ORDER BY TABLE_NAME
  `;

  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0');
  for (const table of tables) {
    const sourceTable = `${identifier(sourceName)}.${identifier(table.TABLE_NAME)}`;
    const cloneTable = `${identifier(cloneName)}.${identifier(table.TABLE_NAME)}`;
    await prisma.$executeRawUnsafe(`CREATE TABLE ${cloneTable} LIKE ${sourceTable}`);
    await prisma.$executeRawUnsafe(`INSERT INTO ${cloneTable} SELECT * FROM ${sourceTable}`);
  }
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1');

  for (const table of tables) {
    const sourceCount = await prisma.$queryRawUnsafe<CountRow[]>(`SELECT COUNT(*) AS count FROM ${identifier(sourceName)}.${identifier(table.TABLE_NAME)}`);
    const cloneCount = await prisma.$queryRawUnsafe<CountRow[]>(`SELECT COUNT(*) AS count FROM ${identifier(cloneName)}.${identifier(table.TABLE_NAME)}`);
    console.log(`${table.TABLE_NAME}: source=${Number(sourceCount[0]?.count || 0)} clone=${Number(cloneCount[0]?.count || 0)}`);
  }
  console.log(`Clone ready: ${cloneName}`);
}

main()
  .catch((error) => {
    console.error('Database clone failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
