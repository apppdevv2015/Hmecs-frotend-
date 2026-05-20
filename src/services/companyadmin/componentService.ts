const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:4000/api";

const API_PREFIX = "/v1";

type ApiResponse<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

const getToken = () => localStorage.getItem("token") || "";

const getAuthHeaders = () => {
  const token = getToken();

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const parseApiError = async (response: Response) => {
  try {
    const data = await response.json();
    return data?.message || data?.error || "Something went wrong";
  } catch {
    return "Something went wrong";
  }
};

async function apiRequest<T>(url: string, options?: RequestInit): Promise<T> {
  const baseUrl = API_BASE_URL.replace(/\/$/, "");
  const prefix = API_PREFIX.startsWith("/") ? API_PREFIX : `/${API_PREFIX}`;
  let path = url.startsWith("/") ? url : `/${url}`;
  
  let fullPath = `${prefix}${path}`;
  if (baseUrl.endsWith("/v1") && fullPath.startsWith("/v1/")) {
    fullPath = fullPath.substring(3); // Remove first "/v1"
  }

  const response = await fetch(`${baseUrl}${fullPath}`, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options?.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  const data: ApiResponse<T> = await response.json();
  return (data?.data ?? data) as T;
}

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
    return apiRequest<any[]>("/components/categories");
  },

  getComponents: (machineId?: string) => {
    const query = machineId ? `?machineId=${encodeURIComponent(machineId)}` : "";
    return apiRequest<any[]>(`/components${query}`);
  },

  createComponent: (payload: ComponentPayload) => {
    return apiRequest("/components", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateComponent: (
    componentId: string,
    payload: Omit<ComponentPayload, "machineId">,
  ) => {
    return apiRequest(`/components/${componentId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  deleteComponent: (componentId: string) => {
    return apiRequest(`/components/${componentId}`, {
      method: "DELETE",
    });
  },
};