import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function ensureColumnExists(table: string, column: string, definition: string) {
  const result: any[] = await prisma.$queryRawUnsafe(`
    SELECT COLUMN_NAME 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = '${table}' 
      AND COLUMN_NAME = '${column}'
  `);

  if (result.length === 0) {
    await prisma.$executeRawUnsafe(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition};`);
    console.log(`Added column ${column} to ${table}.`);
  }
}

async function main() {
  // Add back the text columns if they do not exist
  await ensureColumnExists('daily_activities', 'institution_group', 'VARCHAR(255)');
  await ensureColumnExists('stakeholder_engagement', 'stakeholder', 'VARCHAR(255)');
  
  // Migrate daily_activities
  await prisma.$executeRawUnsafe(`
    UPDATE daily_activities da
    JOIN stakeholders s ON da.stakeholder_id = s.id
    SET da.institution_group = s.name
    WHERE da.stakeholder_id IS NOT NULL;
  `);

  // Migrate stakeholder_engagement
  await prisma.$executeRawUnsafe(`
    UPDATE stakeholder_engagement se
    JOIN stakeholders s ON se.stakeholder_id = s.id
    SET se.stakeholder = s.name
    WHERE se.stakeholder_id IS NOT NULL;
  `);

  console.log("Data migration completed.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
