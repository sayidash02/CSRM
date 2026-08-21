import { PrismaClient } from '../../apps/api/node_modules/@prisma/client/default.js';

const databaseNameValue = process.env.DISPOSABLE_DATABASE_NAME;
if (!databaseNameValue || !/^crms_(clone|restore)_[a-z0-9_]+$/i.test(databaseNameValue)) {
  throw new Error('DISPOSABLE_DATABASE_NAME must use a safe name such as crms_clone_stage2');
}
const databaseName: string = databaseNameValue;
if (process.env.ALLOW_DISPOSABLE_DROP !== 'true') {
  throw new Error('Set ALLOW_DISPOSABLE_DROP=true to drop a disposable database');
}

function identifier(value: string): string {
  if (!/^[A-Za-z0-9_]+$/.test(value)) throw new Error(`Unsafe database identifier: ${value}`);
  return `\`${value}\``;
}

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const current = await prisma.$queryRaw<Array<{ database_name: string | null }>>`
    SELECT DATABASE() AS database_name
  `;
  if (current[0]?.database_name === databaseName) {
    throw new Error('Refusing to drop the database currently used by DATABASE_URL');
  }

  const exists = await prisma.$queryRaw<Array<{ SCHEMA_NAME: string }>>`
    SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ${databaseName}
  `;
  if (exists.length === 0) {
    console.log(`Disposable database does not exist: ${databaseName}`);
    return;
  }

  await prisma.$executeRawUnsafe(`DROP DATABASE ${identifier(databaseName)}`);
  console.log(`Dropped disposable database: ${databaseName}`);
}

main()
  .catch((error) => {
    console.error('Disposable database cleanup failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
