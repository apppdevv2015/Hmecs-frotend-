export type SuperAdminCompany = {
  id: string;
  name?: string;
  company_name?: string;
  companyName?: string;
  companyCode?: string;
  company_code?: string;
  email?: string;
  adminEmail?: string;
  adminName?: string;
  staffCount?: number;
  activePlan?: string;
  createdAt?: string;
  created_at?: string;
};

export type SuperAdminMachine = {
  id: string;
  name?: string;
  machine_name?: string;
  machineName?: string;
  machine_id?: string;
  machineId?: string;
  machine_code?: string;
  machineCode?: string;
  registration_number?: string;
  model?: string;
  manufacturer?: string;
  status?: string;
  location?: string;
  serialNumber?: string;
  serial_number?: string;
  equipmentType?: string;
  equipment_type?: string;
  site?: string;
  companyId?: string;
  company_id?: string;
  createdAt?: string;
  created_at?: string;
};

export type ComponentStatus = "Healthy" | "Warning" | "Critical";

export type SuperAdminComponent = {
  id: string;

  companyId?: string;
  company_id?: string;

  machineId?: string;
  machine_id?: string;

  name?: string;
  componentName?: string;
  component_name?: string;

  description?: string;

  category?: string;
  component_type?: string;
  type?: string;

  serialNumber?: string;
  serial_number?: string;
  supplier?: string;

  installHours?: number;
  install_hours?: number;

  currentHours?: number;
  current_hours?: number;

  plannedLife?: number;
  planned_life?: number;

  replacementCost?: number;
  replacement_cost?: number;

  condition?: number;

  health?: number;
  health_percentage?: number;
  condition_score?: number;

  status?: string;

  lastService?: string;
  last_service?: string;

  nextService?: string;
  next_service?: string;

  activeAlerts?: number;
  active_alerts?: number;
  alerts_count?: number;

  remainingLife?: string;
  remaining_life?: string;
  remaining_life_days?: number;

  temperature?: string;
  pressure?: string;
  vibration?: string;

  recommendation?: string;
  ai_recommendation?: string;

  intelligence?: {
    hoursRun?: number;
    lifeUsedPercent?: number;
    remainingHours?: number;
    riskStatus?: string;
    riskColor?: string;
    riskDriver?: string;
    estimatedSavings?: string;
    health?: number;
    healthScore?: number;
    condition?: number;
    recommendation?: string;
  };

  machine?: {
    id?: string;
    machineId?: string;
    machine_id?: string;
    name?: string;
    machine_name?: string;
    machineName?: string;
    machineCode?: string;
  };

  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
};

export type SuperAdminComponentPayload = {
  companyId?: string;
  company_id?: string;

  machineId: string;
  machine_id?: string;

  componentName?: string;
  component_name?: string;
  name?: string;

  category: string;
  component_type?: string;
  type?: string;

  serialNumber: string;
  serial_number?: string;

  description?: string;
  supplier?: string;

  installHours: number;
  install_hours?: number;

  currentHours: number;
  current_hours?: number;

  plannedLife: number;
  planned_life?: number;

  replacementCost: number;
  replacement_cost?: number;

  condition: number;
  condition_score?: number;

  health?: number;
  health_percentage?: number;

  status?: string;
};

export type SuperAdminDashboardMetrics = {
  totalAdmins: number;
  activePlans: number;
  totalOperators: number;
  totalMechanics: number;
  totalMachines: number;
  criticalAlerts: number;
};

export type UpdateCompanyPayload = {
  companyName: string;
  companyCode: string;
  adminName: string;
  adminEmail: string;
  staffCount: number;
  activePlan: string;
  status: string;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api/v1";

import StorageService, { STORAGE_KEYS } from "../storage.service";

const getToken = () => StorageService.get<string>(STORAGE_KEYS.TOKEN) || "";

const buildUrl = (endpoint: string) => {
  const baseUrl = API_BASE_URL.replace(/\/$/, "");
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  return `${baseUrl}${path}`;
};

const parseApiError = async (response: Response) => {
  try {
    const data = await response.json();

    return (
      data?.message ||
      data?.error ||
      data?.data?.message ||
      `Request failed with ${response.status}`
    );
  } catch {
    return `Request failed with ${response.status}`;
  }
};

const request = async <T = any>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  const token = getToken();
  const finalUrl = buildUrl(endpoint);

  const response = await fetch(finalUrl, {
    ...options,

    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",

      ...(token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {}),

      ...(options.headers || {}),
    },

    cache: options.method === "GET" ? "no-cache" : "no-store",
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  try {
    return (await response.json()) as T;
  } catch {
    return null as T;
  }
};

const normalizeArray = <T>(response: any): T[] => {
  if (Array.isArray(response)) return response;

  if (Array.isArray(response?.data)) return response.data;

  if (Array.isArray(response?.data?.data)) {
    return response.data.data;
  }

  // Companies
  if (Array.isArray(response?.data?.companies)) {
    return response.data.companies;
  }

  // Machines
  if (Array.isArray(response?.data?.machines)) {
    return response.data.machines;
  }

  // Components
  if (Array.isArray(response?.data?.components)) {
    return response.data.components;
  }

  // Pagination Support
  if (Array.isArray(response?.data?.rows)) {
    return response.data.rows;
  }

  if (Array.isArray(response?.rows)) {
    return response.rows;
  }

  if (Array.isArray(response?.data?.machines?.rows)) {
    return response.data.machines.rows;
  }

  // Fallback
  if (Array.isArray(response?.companies)) {
    return response.companies;
  }

  if (Array.isArray(response?.machines)) {
    return response.machines;
  }

  if (Array.isArray(response?.components)) {
    return response.components;
  }

  if (Array.isArray(response?.result)) {
    return response.result;
  }

  if (Array.isArray(response?.results)) {
    return response.results;
  }

  if (Array.isArray(response?.items)) {
    return response.items;
  }

  return [];
};

const normalizeObject = <T>(response: any, fallback: T): T => {
  if (response?.data?.data && !Array.isArray(response.data.data)) {
    return response.data.data;
  }

  if (response?.data && !Array.isArray(response.data)) {
    return response.data;
  }

  if (response?.item) return response.item;
  if (response && !Array.isArray(response)) return response;

  return fallback;
};

export const superAdminMachineService = {
  async getCompanies(): Promise<SuperAdminCompany[]> {
    const response = await request<any>("/auth/users/super-admin/companies", {
      method: "GET",
    });

    return normalizeArray<SuperAdminCompany>(response);
  },

  async getMachinesByCompanyId(companyId: string): Promise<SuperAdminMachine[]> {
    if (!companyId) {
      throw new Error("Company ID is required");
    }

    const response = await request<any>(`/machines?companyId=${encodeURIComponent(companyId)}`, {
      method: "GET",
    });

    return normalizeArray<SuperAdminMachine>(response);
  },

  async getComponentsByMachineId(
    companyId: string,
    machineId: string,
  ): Promise<SuperAdminComponent[]> {
    if (!companyId) {
      throw new Error("Company ID is required");
    }

    if (!machineId) {
      throw new Error("Machine ID is required");
    }

    const response = await request<any>(
      `/components/register?companyId=${encodeURIComponent(
        companyId,
      )}&machineId=${encodeURIComponent(machineId)}`,
      {
        method: "GET",
      },
    );

    return normalizeArray<SuperAdminComponent>(response);
  },

  async getComponentsByCompanyId(companyId: string): Promise<SuperAdminComponent[]> {
    if (!companyId) {
      throw new Error("Company ID is required");
    }

    const response = await request<any>(
      `/components/register?companyId=${encodeURIComponent(companyId)}`,
      {
        method: "GET",
      },
    );

    return normalizeArray<SuperAdminComponent>(response);
  },

  async createComponent(payload: SuperAdminComponentPayload): Promise<SuperAdminComponent> {
    const response = await request<any>("/components", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    return normalizeObject<SuperAdminComponent>(response, response as SuperAdminComponent);
  },

  async updateComponent(
    componentId: string,
    payload: Partial<SuperAdminComponentPayload>,
  ): Promise<SuperAdminComponent> {
    if (!componentId) {
      throw new Error("Component ID is required");
    }

    const response = await request<any>(`/components/${componentId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });

    return normalizeObject<SuperAdminComponent>(response, response as SuperAdminComponent);
  },

  async deleteComponent(componentId: string): Promise<any> {
    if (!componentId) {
      throw new Error("Component ID is required");
    }

    return request<any>(`/components/${componentId}`, {
      method: "DELETE",
    });
  },

  async updateCompany(companyId: string, payload: UpdateCompanyPayload): Promise<any> {
    if (!companyId) {
      throw new Error("Company ID is required");
    }

    // Split admin full name into first_name / last_name as required by
    // PUT /auth/users/{id} (Swagger: first_name, last_name, email, mobile_number)
    const trimmedAdminName = (payload.adminName || "").trim();
    const nameParts = trimmedAdminName.split(/\s+/).filter(Boolean);
    const firstName = nameParts[0] || trimmedAdminName || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    const response = await request<any>(`/auth/users/${companyId}`, {
      method: "PUT",
      body: JSON.stringify({
        first_name: firstName,
        last_name: lastName,
        email: payload.adminEmail,
        mobile_number: (payload as any).mobileNumber || "",
      }),
    });

    return normalizeObject<any>(response, response);
  },

  async deleteCompany(companyId: string): Promise<any> {
    if (!companyId) {
      throw new Error("Company ID is required");
    }

    return request<any>(`/auth/users/${companyId}`, {
      method: "DELETE",
    });
  },

  async getDashboardRoleDetails(roleId: string): Promise<any> {
    try {
      const response = await request<any>(`/auth/company/dashboard/role-details/${roleId}`, {
        method: "GET",
      });
      return response.data || response;
    } catch (error) {
      console.error("Failed to fetch dashboard role details:", error);
      throw error;
    }
  },

  async getDashboardRolesActivity(): Promise<any> {
    try {
      const response = await request<any>("/auth/company/dashboard/roles-activity", {
        method: "GET",
      });
      return response.data || response;
    } catch (error) {
      console.error("Failed to fetch dashboard roles activity:", error);
      throw error;
    }
  },

  async getDashboardMetrics(): Promise<SuperAdminDashboardMetrics> {
    try {
      const response = await request<any>("/auth/company/dashboard/metrics", {
        method: "GET",
      });
      return response.data || response;
    } catch (error) {
      console.error("Failed to fetch dashboard metrics:", error);
      throw error;
    }
  },

  async getDashboardStats() {
    try {
      const response = await request<any>("/auth/company/dashboard", {
        method: "GET",
      });
      return response.data || response;
    } catch (error) {
      console.error("Failed to fetch dashboard stats:", error);
      throw error;
    }
  },

  async getDashboardRecentActivity() {
    try {
      const response = await request<any>("/auth/company/dashboard/recent-activity", {
        method: "GET",
      });
      return response.data || response;
    } catch (error) {
      console.error("Failed to fetch dashboard recent activity:", error);
      throw error;
    }
  },

  async getDashboardPlanDistribution() {
    try {
      const response = await request<any>("/auth/company/dashboard/plan-distribution", {
        method: "GET",
      });
      return response.data || response;
    } catch (error) {
      console.error("Failed to fetch dashboard plan distribution:", error);
      throw error;
    }
  },

  async getDashboardMachineStatus() {
    try {
      const response = await request<any>("/auth/company/dashboard/machine-status", {
        method: "GET",
      });
      return response.data || response;
    } catch (error) {
      console.error("Failed to fetch dashboard machine status:", error);
      throw error;
    }
  },

  async getDashboardAlertsSummary() {
    try {
      const response = await request<any>("/auth/company/dashboard/alerts-summary", {
        method: "GET",
      });
      return response.data || response;
    } catch (error) {
      console.error("Failed to fetch dashboard alerts summary:", error);
      throw error;
    }
  },
};
