import { apiCall } from "../apiHandler";

/* =========================================================
   Real Pre-Start Inspection API service.
   No mock/dummy data anywhere in this file — every method
   hits the backend. If the request fails, it throws and the
   caller is responsible for surfacing a toast error.
========================================================= */

export const inspectionService = {
  // GET /machines/{machineId}/inspection/components
  getMachineComponents: (machineId: string) => {
    if (!machineId?.trim()) throw new Error("Machine ID is required");
    return apiCall<any>(
      `/machines/${encodeURIComponent(machineId)}/inspection/components`,
      { method: "GET" },
    );
  },

  // GET /machines/{machineId}/inspection
  getMachineInspection: (machineId: string) => {
    if (!machineId?.trim()) throw new Error("Machine ID is required");
    return apiCall<any>(`/machines/${encodeURIComponent(machineId)}/inspection`, {
      method: "GET",
    });
  },

  // PUT /machines/{machineId}/inspection/components/{componentId}
  saveComponentInspection: (machineId: string, record: any) => {
    if (!machineId?.trim()) throw new Error("Machine ID is required");
    if (!record?.componentId) throw new Error("Component ID is required");
    return apiCall<any>(
      `/machines/${encodeURIComponent(machineId)}/inspection/components/${encodeURIComponent(
        record.componentId,
      )}`,
      {
        method: "PUT",
        body: JSON.stringify(record),
      },
    );
  },

  // POST /machines/{machineId}/inspection/draft
  saveInspectionDraft: (machineId: string, inspection: any) => {
    if (!machineId?.trim()) throw new Error("Machine ID is required");
    return apiCall<any>(
      `/machines/${encodeURIComponent(machineId)}/inspection/draft`,
      {
        method: "POST",
        body: JSON.stringify(inspection),
      },
    );
  },

  // POST /machines/{machineId}/inspection/submit
  submitInspection: (machineId: string, inspection: any) => {
    if (!machineId?.trim()) throw new Error("Machine ID is required");
    return apiCall<any>(
      `/machines/${encodeURIComponent(machineId)}/inspection/submit`,
      {
        method: "POST",
        body: JSON.stringify(inspection),
      },
      { showSuccess: true },
    );
  },

  // GET /machines/{machineId}/inspection-history
  getInspectionHistory: (machineId: string) => {
    if (!machineId?.trim()) throw new Error("Machine ID is required");
    return apiCall<any>(
      `/machines/${encodeURIComponent(machineId)}/inspection-history`,
      { method: "GET" },
    );
  },

  // GET /machines/{machineId}/issues
  getReportedIssues: (machineId: string) => {
    if (!machineId?.trim()) throw new Error("Machine ID is required");
    return apiCall<any>(`/machines/${encodeURIComponent(machineId)}/issues`, {
      method: "GET",
    });
  },
};

export default inspectionService;