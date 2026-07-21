import { apiRequest } from "./api";

export type ApiRole = {
  id: number | string;
  name: string;
  description?: string;
  status?: string;
  permissions?: number;
  created_at?: string;
  updated_at?: string;
};

export type CreateRolePayload = {
  name: string;
};

export type UpdateRolePayload = {
  name: string;
};

export const getRoles = async (page = 1, limit = 10) => {
  return apiRequest<{
    message?: string;
    roles?: ApiRole[];
    data?: ApiRole[] | { roles?: ApiRole[] };
  }>(`/auth/roles?page=${page}&limit=${limit}`, {
    method: "GET",
  });
};

type RoleResponse = {
  success: boolean;
  message: string;
  data: ApiRole;
  error: string | null;
  timestamp: string;
};

export const createRole = async (payload: CreateRolePayload): Promise<RoleResponse> => {
  return apiRequest<RoleResponse>("/auth/roles", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const updateRole = async (id: number | string, payload: UpdateRolePayload) => {
  return apiRequest<RoleResponse>(`/auth/roles/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
};

export const deleteRole = async (id: number | string) => {
  return apiRequest<{ message?: string }>(`/auth/roles/${id}`, {
    method: "DELETE",
  });
};
