import type { PrismaClient } from '@prisma/client';
import { hashPassword } from '../lib/auth';

const RECOVERY_CONFIRMATION = 'I_UNDERSTAND_THIS_CHANGES_ONE_ADMIN_ACCOUNT';

export function adminRecoveryConfirmation(): string {
  return RECOVERY_CONFIRMATION;
}

/**
 * Controlled server-side recovery for the case where no administrator can
 * sign in. This is deliberately not an HTTP endpoint and never creates an
 * account: IT must identify an existing account and explicitly confirm the
 * operation in the command environment.
 */
export async function recoverAdminAccount(
  client: PrismaClient,
  username: string,
  password: string,
  confirmation: string,
): Promise<void> {
  if (confirmation !== RECOVERY_CONFIRMATION) {
    throw new Error(`Recovery requires CRMS_CONFIRM_ADMIN_RECOVERY=${RECOVERY_CONFIRMATION}`);
  }

  const normalizedUsername = username.trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,100}$/.test(normalizedUsername)) {
    throw new Error('CRMS_RECOVERY_USERNAME harus berupa username 3-100 karakter');
  }

  const existing = await client.users.findUnique({ where: { username: normalizedUsername } });
  if (!existing) throw new Error('Akun recovery tidak ditemukan; recovery tidak membuat akun baru');

  const passwordHash = hashPassword(password);
  await client.$transaction(async (tx) => {
    await tx.users.update({
      where: { id: existing.id },
      data: { password_hash: passwordHash, role: 'ADMIN', is_active: true },
    });
    await tx.audit_logs.create({
      data: {
        entity_type: 'users',
        entity_id: existing.id,
        action: 'UPDATE',
        actor_user_id: null,
        changes: { reason: 'EMERGENCY_ADMIN_RECOVERY', fields: ['password_hash', 'role', 'is_active'] },
      },
    });
  });
}
