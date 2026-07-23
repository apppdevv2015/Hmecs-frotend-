import { apiCall } from "./apiHandler";
import StorageService, { STORAGE_KEYS } from "./storage.service";

export type ApiRole = {
  id: number;
  name: string;
};

export type ApiUser = {
  id: string | number;
  first_name?: string;
  last_name?: string;
  firstName?: string;
  lastName?: string;
  fname?: string;
  lname?: string;
  name?: string;
  email?: string;
  password?: string;
  password_hash?: string;
  mobile?: string;
  mobile_number?: string;
  mobileNumber?: string;
  phone?: string;

  role?: string | { id?: string | number; name?: string };
  role_name?: string;
  role_id?: string | number;
  roleId?: string | number;

  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  company_id?: string | number | null;
  company_code?: string | null;
  company_name?: string | null;
  company?: string | { id?: string | number; name?: string };
  status?: string;
  is_active?: boolean;
  last_login?: string;
  lastLogin?: string;
};

export type AddUserPayload = {
  name?: string;
  first_name?: string;
  last_name?: string;
  email: string;
  password: string;
  phone?: string;
  mobile_number?: string;
  role?: string;
  role_name?: string;
  role_id?: number;
  company?: string;
  company_id?: string | number;
};

export type UpdateUserPayload = {
  first_name?: string;
  last_name?: string;
  email?: string;
  mobile_number?: string;

  role_name?: string;
  role_id?: string | number;
  roleId?: string | number;

  company_id?: string | number;
  company_name?: string;

  status?: string;
  is_active?: boolean;
};

export type GetUsersParams = {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
};

export type UsersResponse = {
  message?: string;
  users?: ApiUser[];
  data?: ApiUser[] | { users?: ApiUser[] };
  results?: ApiUser[];
  pagination?: {
    total?: number;
    page?: number;
    limit?: number;
    pages?: number;
  };
};

export type UpdateUserResponse = {
  success: boolean;
  message: string;
  data: ApiUser;
  error: string | null;
  timestamp: string;
};

const roleNameMap: Record<string, string> = {
  "Super Admin": "super_admin",
  "Company Admin": "admin",
  Admin: "admin",
  Engineer: "engineer",
  Planner: "planner",
  Viewer: "viewer",
  super_admin: "super_admin",
  system_admin: "super_admin",
  company_admin: "admin",
  admin: "admin",
  engineer: "engineer",
  mechanic: "engineer",
  planner: "planner",
  operator: "Operator",
  viewer: "viewer",
};

const isValidUUID = (value: string) => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
};

const getCompanyIdFromToken = () => {
  try {
    const token = StorageService.get<string>(STORAGE_KEYS.TOKEN);
    if (!token) return "";

    const payload = JSON.parse(atob(token.split(".")[1]));

    return payload.company_id || payload.companyId || payload.company?.id || "";
  } catch {
    return "";
  }
};

const splitName = (name = "") => {
  const nameParts = name.trim().split(/\s+/);
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";

  return { firstName, lastName };
};

const getValidCompanyId = (company?: string | number) => {
  const tokenCompanyId = getCompanyIdFromToken();
  const formCompanyId = String(company || "").trim();

  if (formCompanyId && isValidUUID(formCompanyId)) return formCompanyId;
  if (tokenCompanyId) return tokenCompanyId;

  return undefined;
};

export const normalizeUsersResponse = (
  response: UsersResponse | ApiUser[],
): ApiUser[] => {
  if (Array.isArray(response)) return response;

  if (Array.isArray(response.users)) return response.users;
  if (Array.isArray(response.results)) return response.results;
  if (Array.isArray(response.data)) return response.data;

  if (
    response.data &&
    !Array.isArray(response.data) &&
    Array.isArray(response.data.users)
  ) {
    return response.data.users;
  }

  return [];
};

export const userService = {
  getRoles: async (): Promise<ApiRole[]> => {
    const response = await apiCall<
      { data?: ApiRole[]; roles?: ApiRole[] } | ApiRole[]
    >("/auth/roles", {
      method: "GET",
    });

    if (Array.isArray(response)) return response;

    return response.data || response.roles || [];
  },

  getUsers: async ({
    page = 1,
    limit = 10,
    search = "",
    role = "",
    status = "",
  }: GetUsersParams = {}): Promise<UsersResponse | ApiUser[]> => {
    const params = new URLSearchParams();

    params.append("page", String(page));
    params.append("limit", String(limit));

    if (search.trim()) params.append("search", search.trim());
    if (role.trim()) params.append("role", role.trim());
    if (status.trim()) params.append("status", status.trim());

    return apiCall<UsersResponse | ApiUser[]>(
      `/auth/users?${params.toString()}`,
      {
        method: "GET",
      },
    );
  },

  getUserById: async (id: string | number): Promise<ApiUser> => {
    const response = await apiCall<
      ApiUser | { data?: ApiUser; user?: ApiUser }
    >(`/auth/users/${id}`, {
      method: "GET",
    });

    if ("data" in response && response.data) return response.data;
    if ("user" in response && response.user) return response.user;

    return response as ApiUser;
  },

  addUser: async (payload: AddUserPayload) => {
    const nameParts = splitName(payload.name);
    const firstName = payload.first_name || nameParts.firstName;
    const lastName = payload.last_name || nameParts.lastName;

    const roleName =
      payload.role_name ||
      (payload.role ? roleNameMap[payload.role] || payload.role : undefined);

    const roleId = payload.role_id;
    const companyId = payload.company_id || getValidCompanyId(payload.company);

    return apiCall(
      "/auth/users",
      {
        method: "POST",
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          email: payload.email.trim(),
          password: payload.password,
          mobile_number: (payload.mobile_number || payload.phone || "").trim(),
          ...(roleName ? { role_name: roleName } : {}),
          ...(roleId ? { role_id: roleId } : {}),
          ...(companyId ? { company_id: companyId } : {}),
        }),
      },
      {
        showSuccess: true,
      },
    );
  },

  updateUser: async (
    id: string | number,
    payload: UpdateUserPayload,
  ): Promise<UpdateUserResponse> => {
    const roleName = payload.role_name
      ? roleNameMap[payload.role_name] || payload.role_name
      : undefined;

    const roleId = payload.roleId || payload.role_id;

    return apiCall<UpdateUserResponse>(
      `/auth/users/${id}`,
      {
        method: "PUT",
        body: JSON.stringify({
          ...(payload.first_name !== undefined
            ? { first_name: payload.first_name }
            : {}),
          ...(payload.last_name !== undefined
            ? { last_name: payload.last_name }
            : {}),
          ...(payload.email ? { email: payload.email.trim() } : {}),
          ...(payload.mobile_number
            ? { mobile_number: payload.mobile_number.trim() }
            : {}),
          ...(roleName ? { role_name: roleName } : {}),

          ...(roleId ? { role_id: roleId } : {}),

          ...(payload.company_id ? { company_id: payload.company_id } : {}),
          ...(payload.company_name
            ? { company_name: payload.company_name }
            : {}),
          ...(payload.status ? { status: payload.status } : {}),
          ...(typeof payload.is_active === "boolean"
            ? { is_active: payload.is_active }
            : {}),
        }),
      },
      {
        showSuccess: true,
       
      },
    );
  },

  deleteUser: async (id: string | number) => {
    return apiCall(
      `/auth/users/${id}`,
      {
        method: "DELETE",
      },
      {
        showSuccess: true,
      },
    );
  },

  getActiveSubscription: async (): Promise<any> => {
    return apiCall<any>("/plans/active", {
      method: "GET",
    });
  },

  getSubscriptionHistory: async (): Promise<any[]> => {
    const response = await apiCall<any[] | { data?: any[] }>(
      "/plans/subscriptions",
      {
        method: "GET",
      },
    );

    if (Array.isArray(response)) return response;

    return response.data || [];
  },

  getMachines: async (): Promise<any[]> => {
    const response = await apiCall<any[] | { data?: any[] }>("/machines", {
      method: "GET",
    });

    if (Array.isArray(response)) return response;

    return response.data || [];
  },

  registerMachine: async (machineData: any): Promise<any> => {
    return apiCall<any>(
      "/machines",
      {
        method: "POST",
        body: JSON.stringify(machineData),
      },
      {
        showSuccess: true,
      },
    );
  },
};