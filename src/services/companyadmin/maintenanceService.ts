export type MaintenanceStatus = "Open" | "Closed" | "Pending" | "In Progress" | "Completed";

export type MaintenancePayload = {
  id?: string;
  machineId: string;
  componentId?: string | null;
  technician: string;
  date: string;
  work: string;
  cost: number | string;
  downtime: string;
  status: MaintenanceStatus;
};

type RequestOptions = RequestInit & {
  skipJsonHeader?: boolean;
};

type GetLogsOptions = {
  companyId?: string;
  engineerId?: string;
  scope?: "auto" | "company" | "engineer" | "all";
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:4000/api";

import StorageService, { STORAGE_KEYS } from "../storage.service";

const DUMMY_COMPANY_IDS = new Set([
  "00000000-0000-0000-0000-000000000001",
  "00000000-0000-0000-0000-000000000000",
]);

const getToken = () => StorageService.get<string>(STORAGE_KEYS.TOKEN) || "";

const safeJsonParse = <T = any>(value: string | null, fallback: T): T => {
  try {
    if (!value) return fallback;
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const getTokenPayload = () => {
  try {
    const token = getToken();
    if (!token) return null;

    const payloadPart = token.split(".")[1];
    if (!payloadPart) return null;

    return JSON.parse(atob(payloadPart));
  } catch {
    return null;
  }
};

const normalizeRole = (role?: string | null) => {
  return String(role || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
};

const getCurrentUser = () => {
  return StorageService.get<any>(STORAGE_KEYS.USER) || {};
};

const getCurrentRole = () => {
  const payload = getTokenPayload();
  const user = getCurrentUser();

  return normalizeRole(
    payload?.role ||
      payload?.role_name ||
      user?.role ||
      user?.role_name ||
      StorageService.get<string>(STORAGE_KEYS.ROLE) ||
      "",
  );
};

const isEngineerRole = () => {
  const role = getCurrentRole();

  return role === "engineer" || role === "mechanic" || role === "technician" || role === "operator";
};

const getCurrentUserId = () => {
  const payload = getTokenPayload();
  const user = getCurrentUser();

  return String(
    payload?.id ||
      payload?.userId ||
      payload?.user_id ||
      user?.id ||
      user?.userId ||
      user?.user_id ||
      "",
  );
};

const isValidCompanyId = (companyId?: string | null) => {
  const value = String(companyId || "").trim();

  if (!value) return false;
  if (DUMMY_COMPANY_IDS.has(value)) return false;

  return true;
};

const getCompanyIdFromToken = () => {
  try {
    const payload = getTokenPayload();

    return String(payload?.companyId || payload?.company_id || payload?.company?.id || "");
  } catch {
    return "";
  }
};

const getCompanyIdFromUser = () => {
  const user = getCurrentUser();

  return String(user?.companyId || user?.company_id || user?.company?.id || "");
};

const getCompanyId = () => {
  const localCompanyId = StorageService.get<string>(STORAGE_KEYS.COMPANY_ID) || "";
  const tokenCompanyId = getCompanyIdFromToken();
  const userCompanyId = getCompanyIdFromUser();

  if (isValidCompanyId(localCompanyId)) return localCompanyId;
  if (isValidCompanyId(tokenCompanyId)) return tokenCompanyId;
  if (isValidCompanyId(userCompanyId)) return userCompanyId;

  return "";
};

const buildUrl = (endpoint: string) => {
  const baseUrl = API_BASE_URL.replace(/\/$/, "");
  let path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  if (baseUrl.endsWith("/v1") && path.startsWith("/v1/")) {
    path = path.replace(/^\/v1/, "");
  }

  return `${baseUrl}${path}`;
};

const parseResponseBody = async (response: Response) => {
  const contentType = response.headers.get("content-type") || "";

  try {
    if (contentType.includes("application/json")) {
      return await response.json();
    }

    const text = await response.text();

    return {
      message: text || response.statusText,
    };
  } catch {
    return null;
  }
};

const request = async <T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> => {
  const token = getToken();
  const { skipJsonHeader, headers, ...restOptions } = options;
  const finalUrl = buildUrl(endpoint);

  console.log("Maintenance API URL:", finalUrl);

  const method = restOptions.method?.toUpperCase() || "GET";

  const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(method);

  const response = await fetch(finalUrl, {
    ...restOptions,

    headers: {
      ...(!skipJsonHeader
        ? {
            "Content-Type": "application/json",
          }
        : {}),

      "ngrok-skip-browser-warning": "true",

      ...(token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {}),

      ...(headers || {}),
    },

    cache: isMutation ? "no-store" : "no-cache",
  });

  const data: any = await parseResponseBody(response);

  if (!response.ok) {
    const errorMessage =
      data?.message ||
      data?.error ||
      response.statusText ||
      `Request failed with ${response.status}`;

    throw new Error(errorMessage);
  }

  return data;
};

const requestWithFallback = async <T = any>(
  endpoints: string[],
  options: RequestOptions = {},
): Promise<T> => {
  let lastError: any = null;

  const uniqueEndpoints = Array.from(new Set(endpoints.filter(Boolean)));

  for (const endpoint of uniqueEndpoints) {
    try {
      return await request<T>(endpoint, options);
    } catch (error: any) {
      lastError = error;

      const message = String(error?.message || "").toLowerCase();

      const shouldTryNext =
        message.includes("cannot get") ||
        message.includes("cannot post") ||
        message.includes("cannot put") ||
        message.includes("cannot delete") ||
        message.includes("404") ||
        message.includes("not found") ||
        message.includes("request failed with 404");

      if (!shouldTryNext) {
        throw error;
      }
    }
  }

  throw lastError || new Error("Maintenance API endpoint not found");
};

const getDataArray = (response: any) => {
  if (Array.isArray(response)) return response;

  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.logs)) return response.logs;
  if (Array.isArray(response?.maintenance)) return response.maintenance;
  if (Array.isArray(response?.maintenanceLogs)) return response.maintenanceLogs;
  if (Array.isArray(response?.maintenance_logs)) return response.maintenance_logs;

  if (Array.isArray(response?.data?.logs)) return response.data.logs;
  if (Array.isArray(response?.data?.maintenance)) return response.data.maintenance;
  if (Array.isArray(response?.data?.maintenanceLogs)) return response.data.maintenanceLogs;
  if (Array.isArray(response?.data?.maintenance_logs)) return response.data.maintenance_logs;
  if (Array.isArray(response?.data?.data)) return response.data.data;

  if (Array.isArray(response?.result)) return response.result;
  if (Array.isArray(response?.results)) return response.results;
  if (Array.isArray(response?.items)) return response.items;

  return [];
};

const normalizeCost = (cost: number | string | undefined) => {
  if (cost === undefined || cost === null || cost === "") return undefined;

  const numericCost = parseFloat(String(cost).replace(/[^\d.]/g, ""));

  return Number.isFinite(numericCost) ? numericCost : 0;
};

const buildCompanyQuery = (companyId?: string) => {
  if (!isValidCompanyId(companyId)) return "";

  return `?companyId=${encodeURIComponent(companyId || "")}`;
};

const buildEngineerQuery = (engineerId?: string) => {
  if (!engineerId) return "";

  return `?engineerId=${encodeURIComponent(engineerId)}`;
};

const buildAssignedToQuery = (engineerId?: string) => {
  if (!engineerId) return "";

  return `?assignedTo=${encodeURIComponent(engineerId)}`;
};

const buildTechnicianQuery = (engineerId?: string) => {
  if (!engineerId) return "";

  return `?technicianId=${encodeURIComponent(engineerId)}`;
};

export const maintenanceService = {
  async getLogs(options: GetLogsOptions = {}) {
    const roleIsEngineer = isEngineerRole();

    const companyId = options.companyId !== undefined ? options.companyId : getCompanyId();

    const engineerId = options.engineerId !== undefined ? options.engineerId : getCurrentUserId();

    const scope = options.scope || "auto";

    const companyQuery = buildCompanyQuery(companyId);
    const engineerQuery = buildEngineerQuery(engineerId);
    const assignedToQuery = buildAssignedToQuery(engineerId);
    const technicianQuery = buildTechnicianQuery(engineerId);

    const commonEndpoints = [
      `/v1/maintenance${companyQuery}`,
      `/v1/maintenance/logs${companyQuery}`,
      `/v1/maintenance-logs${companyQuery}`,
      `/v1/maintenances${companyQuery}`,
      `/v1/logs/maintenance${companyQuery}`,
    ];

    const companyEndpoints = isValidCompanyId(companyId)
      ? [
          `/v1/maintenance/company/${encodeURIComponent(companyId)}`,
          `/v1/maintenance/logs/company/${encodeURIComponent(companyId)}`,
          `/v1/maintenance-logs/company/${encodeURIComponent(companyId)}`,
          `/v1/maintenances/company/${encodeURIComponent(companyId)}`,
          `/v1/logs/maintenance/company/${encodeURIComponent(companyId)}`,
        ]
      : [];

    const ArtisansEndpoints = engineerId
      ? [
          `/v1/maintenance/Artisans/${encodeURIComponent(engineerId)}`,
          `/v1/maintenance/logs/Artisans/${encodeURIComponent(engineerId)}`,
          `/v1/maintenance-logs/Artisans/${encodeURIComponent(engineerId)}`,

          `/v1/maintenance/technician/${encodeURIComponent(engineerId)}`,
          `/v1/maintenance/logs/technician/${encodeURIComponent(engineerId)}`,
          `/v1/maintenance-logs/technician/${encodeURIComponent(engineerId)}`,

          `/v1/maintenance/my-tasks`,
          `/v1/maintenance/logs/my-tasks`,
          `/v1/maintenance-logs/my-tasks`,

          `/v1/maintenance${engineerQuery}`,
          `/v1/maintenance/logs${engineerQuery}`,
          `/v1/maintenance-logs${engineerQuery}`,

          `/v1/maintenance${assignedToQuery}`,
          `/v1/maintenance/logs${assignedToQuery}`,
          `/v1/maintenance-logs${assignedToQuery}`,

          `/v1/maintenance${technicianQuery}`,
          `/v1/maintenance/logs${technicianQuery}`,
          `/v1/maintenance-logs${technicianQuery}`,
        ]
      : [];

    let endpoints: string[] = [];

    if (scope === "engineer") {
      endpoints = [...ArtisansEndpoints, ...commonEndpoints];
    } else if (scope === "company") {
      endpoints = [...commonEndpoints, ...companyEndpoints];
    } else if (scope === "all") {
      endpoints = [...commonEndpoints, ...companyEndpoints, ...ArtisansEndpoints];
    } else if (roleIsEngineer) {
      endpoints = [...ArtisansEndpoints, ...commonEndpoints, ...companyEndpoints];
    } else {
      endpoints = [...commonEndpoints, ...companyEndpoints];
    }

    const response = await requestWithFallback<any>(endpoints, {
      method: "GET",
    });

    return getDataArray(response);
  },

  async getEngineerLogs(engineerId?: string) {
    return this.getLogs({
      scope: "engineer",
      engineerId: engineerId || getCurrentUserId(),
    });
  },

  async getCompanyLogs(companyId?: string) {
    return this.getLogs({
      scope: "company",
      companyId: companyId || getCompanyId(),
    });
  },

  async createLog(payload: MaintenancePayload) {
    const companyId = getCompanyId();
    const numericCost = normalizeCost(payload.cost) ?? 0;

    const body = JSON.stringify({
      ...payload,
      cost: numericCost,
      ...(isValidCompanyId(companyId) ? { companyId } : {}),
    });

    return requestWithFallback(
      [
        "/v1/maintenance",
        "/v1/maintenance/logs",
        "/v1/maintenance-logs",
        "/v1/maintenances",
        "/v1/logs/maintenance",
      ],
      {
        method: "POST",
        body,
      },
    );
  },

  async updateLog(id: string, payload: Partial<MaintenancePayload>) {
    if (!id) {
      throw new Error("Maintenance log ID is required");
    }

    const numericCost = normalizeCost(payload.cost);

    const body = JSON.stringify({
      ...payload,
      ...(numericCost !== undefined ? { cost: numericCost } : {}),
    });

    return requestWithFallback(
      [
        `/v1/maintenance/${encodeURIComponent(id)}`,
        `/v1/maintenance/logs/${encodeURIComponent(id)}`,
        `/v1/maintenance-logs/${encodeURIComponent(id)}`,
        `/v1/maintenances/${encodeURIComponent(id)}`,
        `/v1/logs/maintenance/${encodeURIComponent(id)}`,
      ],
      {
        method: "PUT",
        body,
      },
    );
  },

  async deleteLog(id: string) {
    if (!id) {
      throw new Error("Maintenance log ID is required");
    }

    return requestWithFallback(
      [
        `/v1/maintenance/${encodeURIComponent(id)}`,
        `/v1/maintenance/logs/${encodeURIComponent(id)}`,
        `/v1/maintenance-logs/${encodeURIComponent(id)}`,
        `/v1/maintenances/${encodeURIComponent(id)}`,
        `/v1/logs/maintenance/${encodeURIComponent(id)}`,
      ],
      {
        method: "DELETE",
      },
    );
  },
};
