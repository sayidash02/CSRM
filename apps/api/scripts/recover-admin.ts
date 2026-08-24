import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { adminRecoveryConfirmation, recoverAdminAccount } from '../src/services/AdminRecoveryService.ts';
import { ask, askSecret } from './interactiveInput.ts';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const username = await ask('Username admin existing: ');
  const password = await askSecret('Password baru (minimal 12 karakter): ');
  const confirmation = await ask(`Ketik ${adminRecoveryConfirmation()} untuk melanjutkan: `);
  await recoverAdminAccount(prisma, username, password, confirmation);
  console.log(`Admin ${username} berhasil dipulihkan. Login melalui halaman CSRM.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : 'Admin recovery gagal');
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
