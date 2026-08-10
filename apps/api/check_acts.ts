import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
(BigInt.prototype as any).toJSON = function () { return this.toString(); };
async function main() {
  const acts = await prisma.daily_activities.findMany({
    include: { pic: true },
    take: 5
  });
  for (const act of acts) {
    console.log(`Activity: ${act.activity}`);
    console.log(`Link: ${act.document_link}`);
    console.log(`PIC: ${act.pic?.name || ''}`);
    console.log('---');
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
