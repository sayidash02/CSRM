import { apiClient } from '../lib/apiClient';

export interface StakeholderEngagementItem {
  id: string | number;
  stakeholder: string;
  date?: string | null;
  venue?: string | null;
  concern_issue?: string | null;
  document_link?: string | null;
}

export async function getStakeholderEngagements(): Promise<any[]> {
  const response = await apiClient.get('/stakeholders');
  return response.data.data;
}
