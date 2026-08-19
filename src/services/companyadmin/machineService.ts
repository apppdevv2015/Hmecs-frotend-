import { apiCall } from "../apiHandler";

export type MachinePayload = {
  name: string;
  manufacturer?: string;
  model: string;
  serialNumber: string;
  equipmentType?: string;
  imageUrl?: string;
  site?: string;
  companyId?: string;
};

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
  ...(payload.manufacturer !== undefined
    ? { manufacturer: payload.manufacturer }
    : {}),
  ...(payload.model !== undefined ? { model: payload.model } : {}),
  ...(payload.serialNumber !== undefined
    ? { serialNumber: payload.serialNumber }
    : {}),
  ...(payload.equipmentType !== undefined
    ? { equipmentType: payload.equipmentType }
    : {}),
  ...(payload.imageUrl !== undefined ? { imageUrl: payload.imageUrl } : {}),
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

  async getCompanyMachines() {
    return this.getMachines();
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

  async assignOperatorToMachine(
    machineId: string,
    assignment: {
      userId: string;
    },
  ) {
    return apiCall(
      `/machines/${machineId}/assign`,
      {
        method: "POST",
        body: JSON.stringify(assignment),
      },
      {
        showSuccess: true,
      },
    );
  },
  async getMachineAssignment(machineId: string) {
    return apiCall(`/machines/${machineId}/assign`, {
      method: "GET",
    });
  },
  async getAllAssignedMachines(params?: { companyId?: string; operatorId?: string }) {
    const queryParts: string[] = [];
    if (params?.companyId) queryParts.push(`companyId=${encodeURIComponent(params.companyId)}`);
    if (params?.operatorId) queryParts.push(`operatorId=${encodeURIComponent(params.operatorId)}`);
    const queryString = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";

    return apiCall(`/machines/assignments${queryString}`, {
      method: "GET",
    });
  },

  async getOperatorAssignments(operatorId?: string) {
    const endpoint = operatorId
      ? `/machines/operator/${encodeURIComponent(operatorId)}/assignments`
      : `/machines/operator-assignments`;

    return apiCall(endpoint, {
      method: "GET",
    });
  },

  async getEquipmentCategories() {
    return apiCall(`/machines/categories?includeInactive=true`, {
      method: "GET",
    });
  },

  async saveManualInspectionData(machineId: string, payload: any) {
    return apiCall(`/machines/${machineId}/manual-data`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getManualInspectionData(machineId: string) {
    return apiCall(`/machines/${machineId}/manual-data`, {
      method: "GET",
    });
  },
};

