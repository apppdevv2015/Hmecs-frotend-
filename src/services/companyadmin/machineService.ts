import { apiRequest } from "../api";

export type MachinePayload = {
  name: string;
  model: string;
  serialNumber: string;
  equipmentType?: string;
  site?: string;
  companyId?: string;
};

// const API_BASE_URL =
//   import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:4000/api";

import StorageService, { STORAGE_KEYS } from "../storage.service";

const getToken = () => StorageService.get<string>(STORAGE_KEYS.TOKEN) || "";

const getCompanyIdFromToken = () => {
  try {
    const token = getToken();
    if (!token) return "";

    const payload = JSON.parse(atob(token.split(".")[1] || ""));

    return payload?.companyId || payload?.company_id || payload?.company?.id || "";
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
    return StorageService.get<string>(STORAGE_KEYS.COMPANY_ID) || getCompanyIdFromToken() || "";
  }
};

// const buildUrl = (endpoint: string) => {
//   const baseUrl = API_BASE_URL.replace(/\/$/, "");
//   let path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

//   // Self-heal: Deduplicate /v1 if it exists in both baseUrl and path
//   if (baseUrl.endsWith("/v1") && path.startsWith("/v1/")) {
//     path = path.substring(3); // Remove first "/v1" (index 0 to 3)
//   }

//   return `${baseUrl}${path}`;
// };

// const request = async <T = any>(
//   endpoint: string,
//   options: RequestInit = {},
// ):
// Promise<T> => {
//   const token = getToken();

//   const method = options.method?.toUpperCase() || "GET";

//   const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(method);

//   const response = await fetch(buildUrl(endpoint), {
//     ...options,

//     headers: {
//       "Content-Type": "application/json",

//       ...(token
//         ? {
//             Authorization: `Bearer ${token}`,
//           }
//         : {}),

//       ...(options.headers || {}),
//     },

//     cache: isMutation ? "no-store" : "no-cache",
//   });

//   let data: any = null;

//   try {
//     data = await response.json();
//   } catch {
//     data = null;
//   }

//   if (!response.ok) {
//     throw new Error(
//       data?.message || data?.error || `Request failed with ${response.status}`,
//     );
//   }

//   return data;
// };

const buildMachineBody = (payload: Partial<MachinePayload>) => ({
  ...(payload.name !== undefined ? { name: payload.name } : {}),
  ...(payload.model !== undefined ? { model: payload.model } : {}),
  ...(payload.serialNumber !== undefined ? { serialNumber: payload.serialNumber } : {}),
  ...(payload.equipmentType !== undefined ? { equipmentType: payload.equipmentType } : {}),
  ...(payload.site !== undefined ? { site: payload.site } : {}),
});

export const machineService = {
  async getMachines() {
    const companyId = getCompanyId();

    const endpoint = companyId
      ? `/machines?companyId=${encodeURIComponent(companyId)}`
      : `/machines`;

    return apiRequest(endpoint, {
      method: "GET",
    });
  },

  async createMachine(payload: MachinePayload) {
    const companyId = getCompanyId();

    return apiRequest("/machines", {
      method: "POST",
      body: JSON.stringify({
        ...buildMachineBody(payload),
        ...(payload.companyId || companyId
          ? {
              companyId: payload.companyId || companyId,
            }
          : {}),
      }),
    });
  },

  async updateMachine(id: string, payload: Partial<MachinePayload>) {
    return apiRequest(`/machines/${id}`, {
      method: "PUT",
      body: JSON.stringify(buildMachineBody(payload)),
    });
  },

  async deleteMachine(id: string) {
    return apiRequest(`/machines/${id}`, {
      method: "DELETE",
    });
  },
};
