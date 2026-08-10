import { apiClient } from '../lib/apiClient';

export interface StakeholderDailyActivity {
  id: string | number;
  activity_date: string;
  activity: string;
  address?: string | null;
  focus?: string | null;
  location?: string | null;
  description_result?: string | null;
  cost?: number | string | null;
  document_link?: string | null;
  category?: { id?: string | number; name: string } | null;
  sub_category?: { id?: string | number; name: string } | null;
  pic?: { id?: string | number; name: string } | null;
}

export interface StakeholderEngagementItem {
  id: string | number;
  date?: string | null;
  venue?: string | null;
  concern_issue?: string | null;
  document_link?: string | null;
}

export interface StakeholderMaster {
  id: string;
  name: string;
  is_active: boolean;
  is_deleted: boolean;
  created_at?: string;
  updated_at?: string;
  daily_activities?: StakeholderDailyActivity[];
  stakeholder_engagement?: StakeholderEngagementItem[];
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

