import { apiCall } from "../apiHandler";
import StorageService, { STORAGE_KEYS } from "../storage.service";

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

  const message =
    response?.message ||
    response?.data?.message ||
    "Unable to load data. Please try again.";

  throw new Error(message);
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
    const response = await apiCall<any>("/auth/users/super-admin/companies", {
      method: "GET",
    });

    return normalizeArray<SuperAdminCompany>(response);
  },

  async getMachinesByCompanyId(
    companyId: string,
  ): Promise<SuperAdminMachine[]> {
    if (!companyId) {
      throw new Error("Unable to load company information. Please try again.");
    }

    const response = await apiCall<any>(
      `/machines?companyId=${encodeURIComponent(companyId)}`,
      {
        method: "GET",
      },
    );

    return normalizeArray<SuperAdminMachine>(response);
  },
  async getComponentsByMachineId(
    companyId: string,
    machineId: string,
  ): Promise<SuperAdminComponent[]> {
    if (!companyId) {
      throw new Error("Unable to load company information. Please try again.");
    }

    if (!machineId) {
      throw new Error("Unable to load machine information. Please try again.");
    }

    const response = await apiCall<any>(
      `/components/register?companyId=${encodeURIComponent(
        companyId,
      )}&machineId=${encodeURIComponent(machineId)}`,
      {
        method: "GET",
      },
    );

    return normalizeArray<SuperAdminComponent>(response);
  },

  async getComponentsByCompanyId(
    companyId: string,
  ): Promise<SuperAdminComponent[]> {
    if (!companyId) {
      throw new Error("Unable to load company information. Please try again.");
    }

    const response = await apiCall<any>(
      `/components/register?companyId=${encodeURIComponent(companyId)}`,
      {
        method: "GET",
      },
    );

    return normalizeArray<SuperAdminComponent>(response);
  },

  async createComponent(
    payload: SuperAdminComponentPayload,
  ): Promise<SuperAdminComponent> {
    const response = await apiCall<any>(
      "/components",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      {
        showSuccess: true,
        successMessage: "Component created successfully",
      },
    );

    return normalizeObject<SuperAdminComponent>(
      response,
      response as SuperAdminComponent,
    );
  },

  async updateComponent(
    componentId: string,
    payload: Partial<SuperAdminComponentPayload>,
  ): Promise<SuperAdminComponent> {
    if (!componentId) {
      throw new Error("Unable to update component. Please try again.");
    }

    const response = await apiCall<any>(
      `/components/${componentId}`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      },
      {
        showSuccess: true,
        successMessage: "Component updated successfully",
      },
    );

    return normalizeObject<SuperAdminComponent>(
      response,
      response as SuperAdminComponent,
    );
  },

  async deleteComponent(componentId: string): Promise<any> {
    if (!componentId) {
      throw new Error("Unable to delete component. Please try again.");
    }

    return apiCall<any>(
      `/components/${componentId}`,
      {
        method: "DELETE",
      },
      {
        showSuccess: true,
        successMessage: "Component deleted successfully",
      },
    );
  },

  async updateCompany(
    companyId: string,
    payload: UpdateCompanyPayload,
  ): Promise<any> {
    if (!companyId) {
      throw new Error("Unable to update company. Please try again.");
    }

    // Split admin full name into first_name / last_name as required by
    // PUT /auth/users/{id} (Swagger: first_name, last_name, email, mobile_number)
    const trimmedAdminName = (payload.adminName || "").trim();
    const nameParts = trimmedAdminName.split(/\s+/).filter(Boolean);
    const firstName = nameParts[0] || trimmedAdminName || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    const response = await apiCall<any>(
      `/auth/users/${companyId}`,
      {
        method: "PUT",
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          email: payload.adminEmail,
          mobile_number: (payload as any).mobileNumber || "",
        }),
      },
      {
        showSuccess: true,
        successMessage: "Company updated successfully",
      },
    );

    return normalizeObject<any>(response, response);
  },

  async deleteCompany(companyId: string): Promise<any> {
    if (!companyId) {
      throw new Error("Unable to delete company. Please try again.");
    }

    return apiCall<any>(
      `/auth/users/${companyId}`,
      {
        method: "DELETE",
      },
      {
        showSuccess: true,
        successMessage: "Company deleted successfully",
      },
    );
  },

  async getDashboardMetrics(): Promise<SuperAdminDashboardMetrics> {
    try {
      const companies = await this.getCompanies();

      // Get all users
      const usersResponse = await apiCall<any>("/auth/users", {
        method: "GET",
      });

      const users = Array.isArray(usersResponse)
        ? usersResponse
        : usersResponse?.data?.users || usersResponse?.users || [];

      if (!companies.length) {
        return {
          totalAdmins: 0,
          activePlans: 0,
          totalOperators: 0,
          totalMechanics: 0,
          totalMachines: 0,
          criticalAlerts: 0,
        };
      }

      const companyResults = await Promise.allSettled(
        companies.map(async (company) => {
          const companyId = company.id;

          const [machines, components] = await Promise.all([
            this.getMachinesByCompanyId(companyId),

            this.getComponentsByCompanyId(companyId),
          ]);

          return {
            company,
            machines: machines ?? [],
            components: components ?? [],
          };
        }),
      );

      return companyResults.reduce<SuperAdminDashboardMetrics>(
        (acc, result) => {
          if (result.status !== "fulfilled") {
            console.error("Dashboard metrics failed:", result.reason);

            return acc;
          }

          const { company, machines, components } = result.value;

          // Total Machines
          acc.totalMachines += machines.length;

          // Active Plans
          if (company.activePlan) {
            acc.activePlans += 1;
          }

          // Critical Alerts
          acc.criticalAlerts += components.filter((component) =>
            (component.status || "").toLowerCase().includes("critical"),
          ).length;

          return acc;
        },
        {
          totalAdmins: companies.length,

          // Total Operators
          totalOperators: users.filter((user: any) => {
            const role = (user.role_name || user.role?.name || user.role || "")
              .toString()
              .toLowerCase()
              .trim();

            return role.includes("operator");
          }).length,

          // Total Mechanics
          totalMechanics: users.filter((user: any) => {
            const role = (user.role_name || user.role?.name || user.role || "")
              .toString()
              .toLowerCase()
              .trim();

            return role.includes("mechanic") || role.includes("Artisans");
          }).length,

          activePlans: 0,
          totalMachines: 0,
          criticalAlerts: 0,
        },
      );
    } catch (error) {
      console.error("Failed to fetch dashboard metrics:", error);

      throw error;
    }
  },
};
