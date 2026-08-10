import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import { Proposal } from '../features/proposals/ProposalsModule';

export const fetchProposals = async (year: string, showDeleted: boolean): Promise<Proposal[]> => {
  const yearParam = year ? `year=${year}` : '';
  const isDeletedParam = `is_deleted=${showDeleted}`;
  const queryParams = [yearParam, isDeletedParam].filter(Boolean).join('&');
  const res = await apiClient.get(`/proposals${queryParams ? `?${queryParams}` : ''}`);
  return res.data.data;
};

export function useProposals(activeYear: string, showDeleted: boolean) {
  return useQuery<Proposal[]>({
    queryKey: ['proposals', 'list', activeYear, showDeleted],
    queryFn: () => fetchProposals(activeYear, showDeleted),
  });
}

export function useCreateProposal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<Proposal, 'id'>) => {
      const res = await apiClient.post('/proposals', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    },
  });
}

export function useEditProposal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string | number; data: Omit<Proposal, 'id'> }) => {
      const res = await apiClient.put(`/proposals/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    },
  });
}

export function useDeleteProposal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) => {
      const res = await apiClient.delete(`/proposals/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    },
  });
}

export function useRestoreProposal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) => {
      const res = await apiClient.patch(`/proposals/${id}/restore`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    },
  });
}
