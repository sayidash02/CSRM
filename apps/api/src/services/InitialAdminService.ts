import type { PrismaClient } from '@prisma/client';
import { hashPassword } from '../lib/auth.ts';

export class InitialAdminSetupError extends Error {
  readonly code: 'INITIAL_ADMIN_EXISTS' | 'INITIAL_USERNAME_EXISTS';

  constructor(code: 'INITIAL_ADMIN_EXISTS' | 'INITIAL_USERNAME_EXISTS', message: string) {
    super(message);
    this.code = code;
    this.name = 'InitialAdminSetupError';
  }
}

export async function createInitialAdmin(
  client: PrismaClient,
  username: string,
  password: string,
): Promise<{ username: string; role: 'ADMIN' }> {
  const normalizedUsername = username.trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,100}$/.test(normalizedUsername)) {
    throw new Error('Username harus berupa 3-100 karakter: huruf kecil, angka, titik, garis bawah, atau tanda hubung');
  }

  return client.$transaction(async (tx) => {
    const adminCount = await tx.users.count({ where: { role: 'ADMIN' } });
    if (adminCount > 0) {
      throw new InitialAdminSetupError('INITIAL_ADMIN_EXISTS', 'Akun ADMIN sudah ada. Gunakan menu Kelola Akun.');
    }

    const existing = await tx.users.findUnique({ where: { username: normalizedUsername } });
    if (existing) {
      throw new InitialAdminSetupError('INITIAL_USERNAME_EXISTS', 'Username sudah digunakan. Pilih username lain.');
    }

    const created = await tx.users.create({
      data: {
        username: normalizedUsername,
        password_hash: hashPassword(password),
        role: 'ADMIN',
        is_active: true,
      },
      select: { id: true, username: true },
    });

    await tx.audit_logs.create({
      data: {
        entity_type: 'users',
        entity_id: created.id,
        action: 'CREATE',
        actor_user_id: null,
        changes: { reason: 'INITIAL_ADMIN_PROVISIONING', username: normalizedUsername, role: 'ADMIN' },
      },
    });

    return { username: created.username, role: 'ADMIN' };
  });
}
