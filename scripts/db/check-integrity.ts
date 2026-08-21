import { PrismaClient } from '../../apps/api/node_modules/@prisma/client/default.js';

type CountRow = { count: bigint | number };

const prisma = new PrismaClient();

async function count(sql: string): Promise<number> {
  const rows = await prisma.$queryRawUnsafe<CountRow[]>(sql);
  return Number(rows[0]?.count || 0);
}

async function main(): Promise<void> {
  const checks: Array<{ name: string; sql: string }> = [
    {
      name: 'proposals.status',
      sql: "SELECT COUNT(*) AS count FROM `proposals` WHERE `status` IS NULL OR `status` NOT IN ('Accept', 'Decline')",
    },
    {
      name: 'csr_projects.status',
      sql: "SELECT COUNT(*) AS count FROM `csr_projects` WHERE `status` IS NULL OR `status` NOT IN ('Planning', 'On Going', 'Completed', 'Cancelled')",
    },
    {
      name: 'grievance.significance',
      sql: "SELECT COUNT(*) AS count FROM `grievance` WHERE `significance` IS NULL OR `significance` NOT IN ('Low', 'Medium', 'High', 'Critical')",
    },
    {
      name: 'grievance.status',
      sql: "SELECT COUNT(*) AS count FROM `grievance` WHERE `status` IS NULL OR `status` NOT IN ('Open', 'On Progress', 'Resolved', 'Closed')",
    },
    {
      name: 'sync_log.status',
      sql: "SELECT COUNT(*) AS count FROM `sync_log` WHERE `status` IS NULL OR `status` NOT IN ('SUCCESS', 'FAILED')",
    },
    {
      name: 'daily_activities.category_id orphan',
      sql: 'SELECT COUNT(*) AS count FROM `daily_activities` da LEFT JOIN `categories` c ON c.id = da.category_id WHERE c.id IS NULL',
    },
    {
      name: 'daily_activities.sub_category_id orphan',
      sql: 'SELECT COUNT(*) AS count FROM `daily_activities` da LEFT JOIN `sub_categories` sc ON sc.id = da.sub_category_id WHERE sc.id IS NULL',
    },
    {
      name: 'sub_categories.category_id orphan',
      sql: 'SELECT COUNT(*) AS count FROM `sub_categories` sc LEFT JOIN `categories` c ON c.id = sc.category_id WHERE c.id IS NULL',
    },
    {
      name: 'daily_activity_pics.activity_id orphan',
      sql: 'SELECT COUNT(*) AS count FROM `daily_activity_pics` dap LEFT JOIN `daily_activities` da ON da.id = dap.activity_id WHERE da.id IS NULL',
    },
    {
      name: 'daily_activity_pics.pic_id orphan',
      sql: 'SELECT COUNT(*) AS count FROM `daily_activity_pics` dap LEFT JOIN `pics` p ON p.id = dap.pic_id WHERE p.id IS NULL',
    },
  ];

  const violations: string[] = [];
  for (const check of checks) {
    const violationsCount = await count(check.sql);
    console.log(`${check.name}: ${violationsCount}`);
    if (violationsCount > 0) violations.push(`${check.name}=${violationsCount}`);
  }

  if (violations.length > 0) {
    throw new Error(`Integrity preflight failed: ${violations.join(', ')}`);
  }
  console.log('Integrity preflight passed. Safe to apply data-integrity checks.');
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
