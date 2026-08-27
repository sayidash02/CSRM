import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';
import { UserProfileModal } from './UserProfileModal';

vi.mock('../lib/apiClient', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({
      data: {
        data: {
          id: 1,
          username: 'sasha',
          role: 'ADMIN',
          is_active: true,
          created_at: '2026-01-01T00:00:00.000Z',
          last_login_at: '2026-08-27T08:00:00.000Z',
          activity_count: 42,
        },
      },
    }),
    put: vi.fn().mockResolvedValue({ data: { data: { success: true } } }),
  },
}));

describe('UserProfileModal', () => {
  it('returns null when isOpen is false', () => {
    const html = renderToString(
      <UserProfileModal
        isOpen={false}
        onClose={vi.fn()}
        onLogout={vi.fn()}
      />
    );
    expect(html).toBe('');
  });

  it('renders profile modal structure when isOpen is true', () => {
    const html = renderToString(
      <UserProfileModal
        isOpen={true}
        onClose={vi.fn()}
        onLogout={vi.fn()}
      />
    );
    expect(html).toContain('Profil Pengguna');
    expect(html).toContain('Departemen CSR · PT Jawa Satu Power');
    expect(html).toContain('Ganti Kata Sandi (Password)');
    expect(html).toContain('Keluar dari Akun (Logout)');
  });
});
