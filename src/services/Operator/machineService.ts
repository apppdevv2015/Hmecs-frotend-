import { apiCall } from "../apiHandler";

export type MachineAssignmentPayload = {
  // User ID fields (required by backend - it will do the DB lookup)
  userId?: string;
  operatorId?: string;
  userIds?: string[];
  artisanId?: string;
  
  // Name fields (used as fallback if user not found in DB)
  operatorName?: string;
  assignedOperatorName?: string;
  assignedOperatorId?: string;
  assignedArtisanId?: string;
  assignedArtisanName?: string;
  assignedSupervisorId?: string;
  assignedSupervisorName?: string;
  supervisorId?: string;
  supervisorName?: string;
  
  // Other fields
  assignedAt?: string;
  companyId?: string;
};

export const machineService = {
  // GET /machines/assignments - Fetch all assigned machines (current + history)
 getAssignedMachines: () =>
  apiCall("/machines/assignments", {
    method: "GET",
  }),

  // GET /machines/operator-assignments - Fetch the logged-in operator's
  // active assigned machine AND their full assignment history in one call.
  // This is the correct, purpose-built endpoint for the operator's own
  // "My Assigned Machine" page.
  getOperatorAssignments: () =>
    apiCall<any>("/machines/operator-assignments", {
      method: "GET",
    }),

  // GET /machines/operator/{operatorId}/assignments - Fetch assignment
  // history for a specific operator by ID.
  getOperatorAssignmentHistory: (operatorId: string) => {
    if (!operatorId?.trim()) {
      throw new Error("Operator ID is required");
    }
    return apiCall<any>(
      `/machines/operator/${encodeURIComponent(operatorId)}/assignments`,
      { method: "GET" },
    );
  },

  // POST /machines/{id}/assign - Assign machine to operator/staff
  

  // POST /machines/{id}/assign - Assign machine to operator/staff
  assignMachine: (machineId: string, assignment: MachineAssignmentPayload) => {
    if (!machineId?.trim()) {
      throw new Error("Machine ID is required");
    }
    return apiCall<any>(
      `/machines/${encodeURIComponent(machineId)}/assign`,
      {
        method: "POST",
        body: JSON.stringify(assignment),
      },
      {
        showSuccess: true,
      },
    );
  },

  unassignMachine: (machineId: string) => {
    if (!machineId?.trim()) {
      throw new Error("Machine ID is required");
    }

    return apiCall<any>(
      `/machines/${encodeURIComponent(machineId)}/assign`,
      {
        method: "DELETE",
      },
      {
        showSuccess: true,
      },
    );
  },

  // GET /machines/{id}/assign - Fetch assignment details for a machine
  getMachineAssignment: (machineId: string) => {
    if (!machineId?.trim()) {
      throw new Error("Machine ID is required");
    }

    return apiCall<any>(`/machines/${encodeURIComponent(machineId)}/assign`, {
      method: "GET",
    });
  },
};

export default machineService;