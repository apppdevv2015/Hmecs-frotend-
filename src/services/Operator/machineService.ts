import { apiCall } from "../apiHandler";

export type MachineAssignmentPayload = {

  userId?: string;
  operatorId?: string;
  userIds?: string[];
  artisanId?: string;
  

  operatorName?: string;
  assignedOperatorName?: string;
  assignedOperatorId?: string;
  assignedArtisanId?: string;
  assignedArtisanName?: string;
  assignedSupervisorId?: string;
  assignedSupervisorName?: string;
  supervisorId?: string;
  supervisorName?: string;
  
 
  assignedAt?: string;
  companyId?: string;
  taskId?: string;
  componentId?: string;
  componentName?: string;
  workScope?: string;
  priority?: string;
  startDate?: string;
  dueDate?: string;
};

export const machineService = {

 getAssignedMachines: () =>
  apiCall("/machines/assignments", {
    method: "GET",
  }),


  getOperatorAssignments: () =>
    apiCall<any>("/machines/operator-assignments", {
      method: "GET",
    }),


  getOperatorAssignmentHistory: (operatorId: string) => {
    if (!operatorId?.trim()) {
      throw new Error("Operator ID is required");
    }
    return apiCall<any>(
      `/machines/operator/${encodeURIComponent(operatorId)}/assignments`,
      { method: "GET" },
    );
  },

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

  unassignMachine: (machineId: string, role?: "artisan" | "operator") => {
    if (!machineId?.trim()) {
      throw new Error("Machine ID is required");
    }

    const query = role ? `?role=${encodeURIComponent(role)}` : "";
    return apiCall<any>(
      `/machines/${encodeURIComponent(machineId)}/assign${query}`,
      {
        method: "DELETE",
      },
      {
        showSuccess: true,
      },
    );
  },


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