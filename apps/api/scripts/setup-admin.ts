import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { createInitialAdmin } from '../src/services/InitialAdminService.ts';
import { ask, askSecret } from './interactiveInput.ts';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const username = await ask('Username admin pertama: ');
  const password = await askSecret('Password (minimal 12 karakter): ');
  const confirmation = await askSecret('Ulangi password: ');
  if (password !== confirmation) throw new Error('Konfirmasi password tidak sama');

  const admin = await createInitialAdmin(prisma, username, password);
  console.log(`Admin ${admin.username} berhasil dibuat. Login melalui halaman CSRM.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : 'Setup admin gagal');
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
