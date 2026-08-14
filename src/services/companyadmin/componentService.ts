import { apiCall } from "../apiHandler";
import StorageService, { STORAGE_KEYS } from "../storage.service";

const getCompanyIdFromToken = () => {
  try {
    const token = StorageService.get<string>(STORAGE_KEYS.TOKEN) || "";

    if (!token) return "";

    const payload = JSON.parse(atob(token.split(".")[1] || ""));

    return (
      payload?.companyId || payload?.company_id || payload?.company?.id || ""
    );
  } catch {
    return "";
  }
};

const getCompanyId = () => {
  try {
    const user = StorageService.get<any>(STORAGE_KEYS.USER) || {};

    return (
      user?.companyId ||
      user?.company_id ||
      user?.company?.id ||
      StorageService.get<string>(STORAGE_KEYS.COMPANY_ID) ||
      getCompanyIdFromToken() ||
      ""
    );
  } catch {
    return (
      StorageService.get<string>(STORAGE_KEYS.COMPANY_ID) ||
      getCompanyIdFromToken() ||
      ""
    );
  }
};

export type ComponentPayload = {
  machineId?: string;
  category: string;
  description: string;
  serialNumber: string;
  supplier: string;
  installHours: number;
  currentHours: number;
  plannedLife: number;
  replacementCost: number;
  condition: number;
};

export const componentService = {
  getCategories: () => {
    return apiCall<any[]>("/components/categories", {
      method: "GET",
    });
  },

  getComponents: (machineId?: string) => {
    const companyId = getCompanyId();

    if (!companyId) {
      throw new Error("companyId is required");
    }

    const queryParts = [`companyId=${encodeURIComponent(companyId)}`];

    if (machineId) {
      queryParts.push(`machineId=${encodeURIComponent(machineId)}`);
    }

    return apiCall<any[]>(`/components/register?${queryParts.join("&")}`, {
      method: "GET",
    });
  },

  createComponent: (payload: ComponentPayload) => {
    return apiCall<any>(
      "/components",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      {
        showSuccess: true,
      },
    );
  },

  updateComponent: (
    componentId: string,
    payload: Omit<ComponentPayload, "machineId">,
  ) => {
    return apiCall<any>(
      `/components/${componentId}`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      },
      {
        showSuccess: true,
      },
    );
  },

  deleteComponent: (componentId: string) => {
    return apiCall<any>(
      `/components/${componentId}`,
      {
        method: "DELETE",
      },
      {
        showSuccess: true,
      },
    );
  },

  getComponentTelemetry: (componentId: string) => {
    return apiCall<any>(`/components/${componentId}/telemetry`, {
      method: "GET",
    });
  },
};
