import { describe, it, expect, vi } from 'vitest';
import { fetchProposals } from './useProposals';
import { apiClient } from '../lib/apiClient';

vi.mock('../lib/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe('fetchProposals', () => {
  it('should call apiClient.get with correct params', async () => {
    (apiClient.get as any).mockResolvedValueOnce({ data: { data: [{ id: 1 }] } });
    
    const result = await fetchProposals('2026', false);
    
    expect(apiClient.get).toHaveBeenCalledWith('/proposals?year=2026&is_deleted=false');
    expect(result).toEqual([{ id: 1 }]);
  });
});
