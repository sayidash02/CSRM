import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';
import { OmnisearchModal } from './OmnisearchModal';

describe('OmnisearchModal', () => {
  it('returns null when isOpen is false', () => {
    const html = renderToString(
      <OmnisearchModal
        isOpen={false}
        onClose={vi.fn()}
        onNavigate={vi.fn()}
      />
    );
    expect(html).toBe('');
  });

  it('renders search input and placeholder when isOpen is true', () => {
    const html = renderToString(
      <OmnisearchModal
        isOpen={true}
        onClose={vi.fn()}
        onNavigate={vi.fn()}
      />
    );
    expect(html).toContain('Universal Omnisearch CRMS');
    expect(html).toContain('Cari di semua 7 modul');
  });
});
