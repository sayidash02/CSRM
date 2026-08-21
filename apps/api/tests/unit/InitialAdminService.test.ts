import { verifyPassword } from '../../src/lib/auth';
import { createInitialAdmin } from '../../src/services/InitialAdminService';

describe('createInitialAdmin', () => {
  it('creates the first admin and records the provisioning audit', async () => {
    const create = jest.fn().mockResolvedValue({ id: 10n, username: 'it-admin', role: 'ADMIN', is_active: true });
    const auditCreate = jest.fn().mockResolvedValue({});
    const tx = {
      users: {
        count: jest.fn().mockResolvedValue(0),
        findUnique: jest.fn().mockResolvedValue(null),
        create,
      },
      audit_logs: { create: auditCreate },
    };
    const client = {
      $transaction: jest.fn(async (callback: (value: typeof tx) => Promise<unknown>) => callback(tx)),
    } as any;

    const result = await createInitialAdmin(client, ' IT-Admin ', 'initial-admin-password-123');

    expect(result).toEqual({ username: 'it-admin', role: 'ADMIN' });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ username: 'it-admin', role: 'ADMIN', is_active: true }),
    }));
    expect(verifyPassword('initial-admin-password-123', create.mock.calls[0][0].data.password_hash)).toBe(true);
    expect(auditCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'CREATE', entity_type: 'users', actor_user_id: null }),
    }));
  });

  it('refuses to create another initial admin once one exists', async () => {
    const client = {
      $transaction: jest.fn(async (callback: (value: unknown) => Promise<unknown>) => callback({
        users: { count: jest.fn().mockResolvedValue(1) },
      })),
    } as any;

    await expect(createInitialAdmin(client, 'new-admin', 'initial-admin-password-123'))
      .rejects.toMatchObject({ code: 'INITIAL_ADMIN_EXISTS' });
  });
});
