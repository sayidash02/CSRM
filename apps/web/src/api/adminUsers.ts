import { apiClient } from '../lib/apiClient';

export type AdminUserRole = 'USER' | 'ADMIN';

export type AdminUser = {
  id: string;
  username: string;
  role: AdminUserRole;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateAdminUserInput = {
  username: string;
  password: string;
  role: AdminUserRole;
};

export type UpdateAdminUserInput = {
  password?: string;
  role?: AdminUserRole;
  is_active?: boolean;
};

type ApiResponse<T> = { data: T };

export async function listAdminUsers(): Promise<AdminUser[]> {
  const response = await apiClient.get<ApiResponse<AdminUser[]>>('/admin/users');
  return response.data.data;
}

export async function createAdminUser(input: CreateAdminUserInput): Promise<AdminUser> {
  const response = await apiClient.post<ApiResponse<AdminUser>>('/admin/users', input);
  return response.data.data;
}

export async function updateAdminUser(id: string, input: UpdateAdminUserInput): Promise<AdminUser> {
  const response = await apiClient.patch<ApiResponse<AdminUser>>(`/admin/users/${encodeURIComponent(id)}`, input);
  return response.data.data;
}
