import StorageService, { STORAGE_KEYS } from "./storage.service";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

type ApiResponse<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

const getToken = () => StorageService.get<string>(STORAGE_KEYS.TOKEN) || "";

const getCompanyIdFromToken = () => {
  try {
    const token = getToken();
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

const getAuthHeaders = () => {
  const token = getToken();

  return {
    "Content-Type": "application/json",
    ...(token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {}),
  };
};

const buildUrl = (endpoint: string) => {
  const baseUrl = API_BASE_URL.replace(/\/$/, "");
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  return `${baseUrl}${cleanEndpoint}`;
};

const parseApiError = async (response: Response) => {
  try {
    const data = await response.json();

    return data?.message || data?.error || "Something went wrong";
  } catch {
    return "Something went wrong";
  }
};

async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(buildUrl(endpoint), {
    ...options,

    headers: {
      ...getAuthHeaders(),
      ...(options?.headers || {}),
    },

    cache: "no-cache",
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  const data: ApiResponse<T> | T = await response.json();

  if (data && typeof data === "object" && "data" in data) {
    return (data as ApiResponse<T>).data as T;
  }

  return data as T;
}

export type IntelligenceRegister = {
  id: string;
  machineId: string;
  category: string;
  description: string;
  serialNumber: string;

  installHours: number;
  currentHours: number;
  plannedLife: number;

  condition: number;

  intelligence: {
    hoursRun: number;
    lifeUsedPercent: number;
    remainingHours: number;
    riskStatus: string;
    riskColor: string;
    riskDriver: string;
    estimatedSavings: string;
  };
};

export const intelligenceService = {
  async getRegister() {
    const companyId = getCompanyId();

    if (!companyId) {
      throw new Error("companyId is required to fetch intelligence register");
    }

    return apiRequest<IntelligenceRegister[]>(
      `/intelligence/register?companyId=${encodeURIComponent(companyId)}`,
    );
  },

  async getDashboardStats() {
    const companyId = getCompanyId();

    if (!companyId) {
      throw new Error("companyId is required to fetch dashboard stats");
    }

    return apiRequest(
      `/intelligence/dashboard-stats?companyId=${encodeURIComponent(
        companyId,
      )}`,
    );
  },
};
