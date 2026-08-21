import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../lib/apiClient';
import { createAdminUser, listAdminUsers, updateAdminUser } from './adminUsers';

vi.mock('../lib/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

describe('admin account API contract', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists only the public account shape returned by the API', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { data: [{ id: '1', username: 'it', role: 'ADMIN', is_active: true, last_login_at: null, created_at: '2026-01-01', updated_at: '2026-01-01' }] } });

    await expect(listAdminUsers()).resolves.toEqual([{ id: '1', username: 'it', role: 'ADMIN', is_active: true, last_login_at: null, created_at: '2026-01-01', updated_at: '2026-01-01' }]);
    expect(apiClient.get).toHaveBeenCalledWith('/admin/users');
  });

  it('creates and updates an account through the admin-only endpoints', async () => {
    const created = { id: '2', username: 'operator', role: 'USER' as const, is_active: true, last_login_at: null, created_at: '2026-01-01', updated_at: '2026-01-01' };
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { data: created } });
    vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: { data: { ...created, is_active: false } } });

    await expect(createAdminUser({ username: 'operator', password: 'a-secure-password', role: 'USER' })).resolves.toEqual(created);
    await expect(updateAdminUser('2', { is_active: false })).resolves.toMatchObject({ id: '2', is_active: false });
    expect(apiClient.post).toHaveBeenCalledWith('/admin/users', { username: 'operator', password: 'a-secure-password', role: 'USER' });
    expect(apiClient.patch).toHaveBeenCalledWith('/admin/users/2', { is_active: false });
  });
});
