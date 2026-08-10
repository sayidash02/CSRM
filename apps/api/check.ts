import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};
async function main() {
  const count = await prisma.daily_activities.count();
  console.log('Daily activities count:', count);
  const acts = await prisma.daily_activities.findMany({
    include: { pic: true },
    take: 5
  });
  console.log(JSON.stringify(acts, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
