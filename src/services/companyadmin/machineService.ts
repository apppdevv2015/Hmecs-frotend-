import { apiCall } from "../apiHandler";

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


const buildMachineBody = (payload: Partial<MachinePayload>) => ({
  ...(payload.name !== undefined ? { name: payload.name } : {}),
  ...(payload.model !== undefined ? { model: payload.model } : {}),
  ...(payload.serialNumber !== undefined
    ? { serialNumber: payload.serialNumber }
    : {}),
  ...(payload.equipmentType !== undefined
    ? { equipmentType: payload.equipmentType }
    : {}),
  ...(payload.site !== undefined ? { site: payload.site } : {}),
});
export const machineService = {
  async getMachines() {
    const companyId = getCompanyId();

    const endpoint = companyId
      ? `/machines?companyId=${encodeURIComponent(companyId)}`
      : `/machines`;

    return apiCall(endpoint, {
      method: "GET",
    });
  },

  async createMachine(payload: MachinePayload) {
    const companyId = getCompanyId();

    return apiCall(
      "/machines",
      {
        method: "POST",
        body: JSON.stringify({
          ...buildMachineBody(payload),
          ...(payload.companyId || companyId
            ? {
                companyId: payload.companyId || companyId,
              }
            : {}),
        }),
      },
      {
        showSuccess: true,
      },
    );
  },

  async updateMachine(id: string, payload: Partial<MachinePayload>) {
    return apiCall(
      `/machines/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(buildMachineBody(payload)),
      },
      {
        showSuccess: true,
      },
    );
  },

  async deleteMachine(id: string) {
    return apiCall(
      `/machines/${id}`,
      {
        method: "DELETE",
      },
      {
        showSuccess: true,
      },
    );
  },
};

