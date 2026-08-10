import { apiClient } from '../lib/apiClient';

export interface StakeholderMaster {
  id: string;
  name: string;
  is_active: boolean;
  is_deleted: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface UpdateStakeholderData {
  name?: string;
  is_active?: boolean;
}

export async function getStakeholders(): Promise<StakeholderMaster[]> {
  const response = await apiClient.get('/master-stakeholders');
  return response.data.data;
}

export async function getStakeholderById(id: string): Promise<StakeholderMaster> {
  const response = await apiClient.get(`/master-stakeholders/${id}`);
  return response.data.data;
}

export async function createStakeholder(name: string): Promise<StakeholderMaster> {
  const response = await apiClient.post('/master-stakeholders', { name });
  return response.data.data;
}

export async function updateStakeholder(
  id: string,
  data: UpdateStakeholderData
): Promise<StakeholderMaster> {
  const response = await apiClient.put(`/master-stakeholders/${id}`, data);
  return response.data.data;
}

export async function deleteStakeholder(id: string): Promise<StakeholderMaster> {
  const response = await apiClient.delete(`/master-stakeholders/${id}`);
  return response.data.data;
}

export async function restoreStakeholder(id: string): Promise<StakeholderMaster> {
  const response = await apiClient.patch(`/master-stakeholders/${id}/restore`);
  return response.data.data;
}

export async function getStakeholderEngagements(): Promise<any[]> {
  const response = await apiClient.get('/stakeholders');
  return response.data.data;
}

