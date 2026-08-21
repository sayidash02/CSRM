import { adminRecoveryConfirmation, recoverAdminAccount } from '../../src/services/AdminRecoveryService';
import { verifyPassword } from '../../src/lib/auth';

describe('recoverAdminAccount', () => {
  it('requires an explicit confirmation and never creates a missing account', async () => {
    const client = {
      users: { findUnique: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn(),
    } as any;

    await expect(recoverAdminAccount(client, 'missing', 'recovery-password-123', 'no')).rejects.toThrow('CRMS_CONFIRM_ADMIN_RECOVERY');
    await expect(recoverAdminAccount(client, 'missing', 'recovery-password-123', adminRecoveryConfirmation())).rejects.toThrow('tidak ditemukan');
    expect(client.$transaction).not.toHaveBeenCalled();
  });

  it('promotes and resets only the identified existing account in one transaction', async () => {
    const update = jest.fn().mockResolvedValue({});
    const auditCreate = jest.fn().mockResolvedValue({});
    const tx = { users: { update }, audit_logs: { create: auditCreate } };
    const client = {
      users: { findUnique: jest.fn().mockResolvedValue({ id: 12n, username: 'it-admin', role: 'USER', is_active: false }) },
      $transaction: jest.fn(async (callback: (value: typeof tx) => Promise<void>) => callback(tx)),
    } as any;

    await recoverAdminAccount(client, 'it-admin', 'recovery-password-123', adminRecoveryConfirmation());

    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 12n },
      data: expect.objectContaining({ role: 'ADMIN', is_active: true }),
    }));
    const passwordHash = update.mock.calls[0][0].data.password_hash;
    expect(verifyPassword('recovery-password-123', passwordHash)).toBe(true);
    expect(auditCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ entity_type: 'users', entity_id: 12n, actor_user_id: null }),
    }));
  });
});
