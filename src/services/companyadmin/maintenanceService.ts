export type MaintenancePayload = {
  id?: string;
  machineId: string;
  componentId?: string | null;
  technician: string;
  date: string;
  work: string;
  cost: number | string;
  downtime: string;
  status: "Open" | "Closed";
};

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:4000/api";

const getToken = () => localStorage.getItem("token") || "";

const buildUrl = (endpoint: string) => {
  const baseUrl = API_BASE_URL.replace(/\/$/, "");
  let path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  
  if (baseUrl.endsWith("/v1") && path.startsWith("/v1/")) {
    path = path.substring(3);
  }
  
  return `${baseUrl}${path}`;
};

const request = async <T = any>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> => {
  const token = getToken();

  const response = await fetch(buildUrl(endpoint), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  let data: any = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(
      data?.message || data?.error || `Request failed with ${response.status}`,
    );
  }

  return data;
};

export const maintenanceService = {
  async getLogs() {
    return request("/v1/maintenance", {
      method: "GET",
    });
  },

  async createLog(payload: MaintenancePayload) {
    // Parse cost dynamically to numeric for db
    const numericCost = parseFloat(String(payload.cost).replace(/[^\d.]/g, "")) || 0;

    return request("/v1/maintenance", {
      method: "POST",
      body: JSON.stringify({
        ...payload,
        cost: numericCost
      }),
    });
  },

  async updateLog(id: string, payload: Partial<MaintenancePayload>) {
    const numericCost = payload.cost !== undefined
      ? parseFloat(String(payload.cost).replace(/[^\d.]/g, "")) || 0
      : undefined;

    return request(`/v1/maintenance/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        ...payload,
        ...(numericCost !== undefined ? { cost: numericCost } : {})
      }),
    });
  },

  async deleteLog(id: string) {
    return request(`/v1/maintenance/${id}`, {
      method: "DELETE",
    });
  },
};
