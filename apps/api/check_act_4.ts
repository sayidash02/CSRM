import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
(BigInt.prototype as any).toJSON = function () { return this.toString(); };
async function main() {
  const act = await prisma.daily_activities.findFirst({
    where: { activity: { contains: 'SDN Cilamaya VII' } },
    include: { pic: true }
  });
  console.log(JSON.stringify(act, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
