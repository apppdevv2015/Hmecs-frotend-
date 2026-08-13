import StorageService from "../storage.service";
import { machineService } from "../companyadmin/machineService";

export type MachineAssignment = {
  userId: string;
  role: "engineer" | "operator";
  machineIds: string[];
};

const ASSIGNMENTS_STORAGE_KEY = "hme_machine_assignments";

const getStoredAssignments = (): MachineAssignment[] => {
  try {
    return StorageService.get<MachineAssignment[]>(ASSIGNMENTS_STORAGE_KEY) || [];
  } catch {
    return [];
  }
};

const setStoredAssignments = (assignments: MachineAssignment[]): void => {
  try {
    StorageService.set(ASSIGNMENTS_STORAGE_KEY, assignments);
  } catch (err) {
    console.warn("Failed to persist assignments:", err);
  }
};

export const machineAssignmentService = {
  /* GET ASSIGNED MACHINES */
  async getAssignedMachines(userId: string): Promise<string[]> {
    try {
      // 1. Check if user has explicitly saved assignments
      const stored = getStoredAssignments();
      const userAssignment = stored.find((item) => item.userId === userId);
      if (userAssignment && userAssignment.machineIds.length > 0) {
        return userAssignment.machineIds;
      }

      // 2. Fetch live machines from backend and check assignments
      const res: any = await machineService.getCompanyMachines();
      const machines = Array.isArray(res)
        ? res
        : Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res?.machines)
            ? res.machines
            : [];

      if (machines.length > 0) {
        const matched = machines.filter(
          (m: any) =>
            m.operatorId === userId ||
            m.assignedOperatorId === userId ||
            m.assignedTechnicianId === userId ||
            m.technicianId === userId
        );

        if (matched.length > 0) {
          return matched.map((m: any) => m.id || m._id || m.machineId);
        }

        // Default: Return all machine IDs for current company
        return machines.map((m: any) => m.id || m._id || m.machineId);
      }

      return [];
    } catch (err) {
      console.warn("Error fetching assigned machines:", err);
      return [];
    }
  },

  /* ASSIGN MACHINES */
  async assignMachines(
    userId: string,
    machineIds: string[],
    role: "engineer" | "operator" = "engineer",
  ): Promise<boolean> {
    try {
      const stored = getStoredAssignments();
      const finalMachineIds =
        role === "operator" ? machineIds.slice(0, 1) : machineIds;

      const existingIndex = stored.findIndex((item) => item.userId === userId);
      if (existingIndex !== -1) {
        stored[existingIndex].machineIds = finalMachineIds;
        stored[existingIndex].role = role;
      } else {
        stored.push({
          userId,
          role,
          machineIds: finalMachineIds,
        });
      }

      setStoredAssignments(stored);
      return true;
    } catch (err) {
      console.error("Failed to assign machines:", err);
      return false;
    }
  },

  /* GET ALL ASSIGNMENTS */
  async getAllAssignments(): Promise<MachineAssignment[]> {
    return getStoredAssignments();
  },
};