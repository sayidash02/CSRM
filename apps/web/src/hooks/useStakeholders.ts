import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getStakeholders,
  getStakeholderById,
  createStakeholder,
  updateStakeholder,
  deleteStakeholder,
  restoreStakeholder,
  getStakeholderEngagements,
  UpdateStakeholderData,
} from '../api/stakeholders';

export function useStakeholderEngagements() {
  return useQuery({
    queryKey: ['stakeholder-engagements'],
    queryFn: getStakeholderEngagements,
  });
}


export function useStakeholders() {
  return useQuery({
    queryKey: ['stakeholders'],
    queryFn: getStakeholders,
  });
}

export function useStakeholder(id: string) {
  return useQuery({
    queryKey: ['stakeholders', id],
    queryFn: () => getStakeholderById(id),
    enabled: Boolean(id),
  });
}

export function useCreateStakeholder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createStakeholder(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stakeholders'] });
    },
  });
}

export function useUpdateStakeholder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateStakeholderData }) =>
      updateStakeholder(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stakeholders'] });
    },
  });
}

export function useDeleteStakeholder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteStakeholder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stakeholders'] });
    },
  });
}

export function useRestoreStakeholder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => restoreStakeholder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stakeholders'] });
    },
  });
}
