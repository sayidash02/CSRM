import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';
import { AuthGate, useAuth } from './AuthGate';

vi.mock('../lib/apiClient', () => ({
  apiClient: {
    get: vi.fn().mockRejectedValue(new Error('Unauthenticated')),
    post: vi.fn().mockResolvedValue({ data: { data: { user: { username: 'admin', role: 'ADMIN' } } } }),
  },
}));

describe('AuthGate', () => {
  it('throws an error if useAuth is used outside AuthGate', () => {
    const TestComponent = () => {
      useAuth();
      return null;
    };
    expect(() => renderToString(<TestComponent />)).toThrow(
      'useAuth must be used inside AuthGate'
    );
  });

  it('renders initial checking state correctly', () => {
    const html = renderToString(
      <AuthGate>
        <div>Protected Content</div>
      </AuthGate>
    );

    expect(html).toContain('Memeriksa sesi login CRIMEs');
  });
});
