import StorageService, { STORAGE_KEYS } from "../storage.service";
import { userService, type ApiUser, normalizeUsersResponse } from "../Auth/userService";
import { machineService } from "../companyadmin/machineService";
import { machineAssignmentService } from "./machineAssignmentService";
import { apiCall } from "../apiHandler";

export type ShiftType = "Morning" | "Evening" | "Night";
export type OperatorStatus = "Active" | "Inactive" | "On Leave";

export type DynamicOperator = {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  assignedMachine: string;
  assignedMachineId: string;
  assignedEngineer: string;
  assignedEngineerId: string;
  assignedAt?: string;
  shift: ShiftType;
  status: OperatorStatus;
  supervisorName?: string;
  supervisorId?: string;
};

export type DynamicEngineer = {
  id: string;
  name: string;
  email: string;
  specialization: string;
};

export type DynamicMachine = {
  id: string;
  machineName: string;
  model?: string;
  serialNumber?: string;
  site?: string;
};

export type StoredSupervisorTask = {
  operatorId: string; // operator user UUID or ID
  operatorName?: string;
  machineId: string;
  machineName: string;
  engineerId: string;
  engineerName: string;
  shift: ShiftType;
  assignedAt: string;
  supervisorId?: string;
  supervisorName?: string;
};

const SUPERVISOR_TASKS_KEY = "hme_supervisor_task_assignments";

const getStoredTasks = (): StoredSupervisorTask[] => {
  try {
    return StorageService.get<StoredSupervisorTask[]>(SUPERVISOR_TASKS_KEY) || [];
  } catch {
    return [];
  }
};

const saveStoredTasks = (tasks: StoredSupervisorTask[]): void => {
  try {
    StorageService.set(SUPERVISOR_TASKS_KEY, tasks);
  } catch (err) {
    console.warn("Failed to persist supervisor task assignments:", err);
  }
};

const getCurrentSupervisor = () => {
  try {
    const user = StorageService.get<any>(STORAGE_KEYS.USER) || {};
    const name = `${user.firstName || user.first_name || ""} ${user.lastName || user.last_name || ""}`.trim() || user.name || "Supervisor";
    const id = user.id || user._id || "";
    const email = user.email || StorageService.get<string>(STORAGE_KEYS.EMAIL) || "supervisor@hme.com";
    return { id, name, email };
  } catch {
    return { id: "", name: "Supervisor", email: "supervisor@hme.com" };
  }
};

export const supervisorTaskService = {
  /**
   * Fetches live operators, engineers, machines, and merges supervisor task assignments.
   */
  async getSupervisorTaskData(): Promise<{
    operators: DynamicOperator[];
    engineers: DynamicEngineer[];
    machines: DynamicMachine[];
  }> {
    try {
      // 1. Fetch Users and Machines concurrently from backend
      const [usersRes, machinesRes] = await Promise.allSettled([
        userService.getUsers({ limit: 100 }),
        machineService.getCompanyMachines(),
      ]);

      // Normalize Users list
      let userList: ApiUser[] = [];
      if (usersRes.status === "fulfilled") {
        userList = normalizeUsersResponse(usersRes.value as any);
      }

      // Normalize Machines list
      let rawMachines: any[] = [];
      if (machinesRes.status === "fulfilled") {
        const val: any = machinesRes.value;
        rawMachines = Array.isArray(val)
          ? val
          : Array.isArray(val?.data)
            ? val.data
            : Array.isArray(val?.machines)
              ? val.machines
              : [];
      }

      // Map Machines
      const machines: DynamicMachine[] = rawMachines.map((m: any, idx: number) => {
        const id = String(m.id || m._id || m.machineId || `m-${idx + 1}`);
        const rawName = m.name || m.machineName || m.model || `Machine ${idx + 1}`;
        const serial = m.serialNumber || m.code || "";
        const machineName = serial ? `${rawName} (${serial})` : rawName;
        return {
          id,
          machineName,
          model: m.model || "",
          serialNumber: serial,
          site: m.site || m.location || "",
        };
      });

      // Filter and Map Engineers / Artisans
      const rawEngineers = userList.filter((u) => {
        const role = String(
          (typeof u.role === "string" ? u.role : u.role?.name) ||
            u.role_name ||
            ""
        ).toLowerCase();
        return (
          role.includes("engineer") ||
          role.includes("artisan") ||
          role.includes("mechanic") ||
          role.includes("technician") ||
          role.includes("planner")
        );
      });

      const engineers: DynamicEngineer[] = rawEngineers.map((u, idx) => {
        const id = String(u.id || `ENG-${101 + idx}`);
        const first = u.firstName || u.first_name || u.fname || "";
        const last = u.lastName || u.last_name || u.lname || "";
        const name = `${first} ${last}`.trim() || u.name || u.email?.split("@")[0] || `Engineer ${idx + 1}`;
        const specialization =
          (typeof u.role === "string" ? u.role : u.role?.name) ||
          u.role_name ||
          "Equipment Maintenance";
        return {
          id,
          name,
          email: u.email || "N/A",
          specialization: String(specialization).replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        };
      });

      // Filter Operators (role operator or fallback if empty to all non-admin users)
      let rawOperators = userList.filter((u) => {
        const role = String(
          (typeof u.role === "string" ? u.role : u.role?.name) ||
            u.role_name ||
            ""
        ).toLowerCase();
        return role.includes("operator");
      });

      // If no users explicitly tagged as 'operator' found, use users that are not super_admin or admin
      if (rawOperators.length === 0 && userList.length > 0) {
        rawOperators = userList.filter((u) => {
          const role = String(
            (typeof u.role === "string" ? u.role : u.role?.name) ||
              u.role_name ||
              ""
          ).toLowerCase();
          return !role.includes("super_admin") && !role.includes("admin");
        });
      }

      // Load stored assignments
      const storedTasks = getStoredTasks();

      // Map Operators
      const operators: DynamicOperator[] = rawOperators.map((u, idx) => {
        const userId = String(u.id || `OP-${101 + idx}`);
        const code = `OP-${String(userId).slice(-4).toUpperCase()}`;
        const first = u.firstName || u.first_name || u.fname || "";
        const last = u.lastName || u.last_name || u.lname || "";
        const name = `${first} ${last}`.trim() || u.name || u.email?.split("@")[0] || `Operator ${idx + 1}`;
        const email = u.email || "N/A";
        const phone = u.mobileNumber || u.mobile_number || u.phone || u.mobile || "+91 9876543210";
        const status: OperatorStatus =
          u.isActive === false || u.is_active === false
            ? "Inactive"
            : (u.status as OperatorStatus) || "Active";

        // Find saved task assignment
        const assignment = storedTasks.find(
          (t) => t.operatorId === userId || t.operatorId === code
        );

        return {
          id: code,
          userId,
          name,
          email,
          phone,
          assignedMachine: assignment?.machineName || "",
          assignedMachineId: assignment?.machineId || "",
          assignedEngineer: assignment?.engineerName || "",
          assignedEngineerId: assignment?.engineerId || "",
          assignedAt: assignment?.assignedAt || "",
          shift: assignment?.shift || "Morning",
          status,
          supervisorName: assignment?.supervisorName,
          supervisorId: assignment?.supervisorId,
        };
      });

      return {
        operators,
        engineers,
        machines,
      };
    } catch (err) {
      console.error("Failed to load supervisor task data:", err);
      return { operators: [], engineers: [], machines: [] };
    }
  },

  /**
   * Assign or Reassign machine & engineer to an operator
   */
  async assignTask(payload: {
    operatorId: string; // operator userId or code
    operatorName?: string;
    operatorEmail?: string;
    machineId: string;
    machineName: string;
    engineerId?: string;
    engineerName?: string;
    shift?: ShiftType;
  }): Promise<boolean> {
    try {
      const stored = getStoredTasks();
      const supervisor = getCurrentSupervisor();
      const assignedAt = new Date().toISOString();

      const newAssignment: StoredSupervisorTask = {
        operatorId: payload.operatorId,
        operatorName: payload.operatorName || "",
        machineId: payload.machineId,
        machineName: payload.machineName,
        engineerId: payload.engineerId || "",
        engineerName: payload.engineerName || "",
        shift: payload.shift || "Morning",
        assignedAt,
        supervisorId: supervisor.id,
        supervisorName: supervisor.name,
      };

      const existingIndex = stored.findIndex(
        (item) => item.operatorId === payload.operatorId
      );

      if (existingIndex !== -1) {
        stored[existingIndex] = newAssignment;
      } else {
        stored.push(newAssignment);
      }

      saveStoredTasks(stored);

      // Persist assignment to backend DB so it shows on all pages
      if (payload.machineId) {
        try {
          await machineService.assignOperatorToMachine(payload.machineId, {
            assignedOperatorId: payload.operatorId || undefined,
            assignedOperatorName: payload.operatorName || undefined,
            assignedArtisanId: payload.engineerId || undefined,
            assignedArtisanName: payload.engineerName || undefined,
            assignedSupervisorId: supervisor.id || undefined,
            assignedSupervisorName: supervisor.name || undefined,
          });
        } catch (dbErr) {
          console.warn("Failed to persist assignment to backend DB:", dbErr);
        }
      }

      // Also sync machineAssignmentService so operator & engineer dashboards reflect this immediately
      if (payload.machineId) {
        await machineAssignmentService.assignMachines(
          payload.operatorId,
          [payload.machineId],
          "operator"
        );
        if (payload.engineerId) {
          await machineAssignmentService.assignMachines(
            payload.engineerId,
            [payload.machineId],
            "engineer"
          );
        }
      }

      // Trigger Machine Assignment Emails to Supervisor and Operator
      try {
        await apiCall("/users/send-assignment-email", {
          method: "POST",
          body: JSON.stringify({
            supervisorName: supervisor.name,
            supervisorEmail: supervisor.email,
            operatorName: payload.operatorName || "Operator",
            operatorEmail: payload.operatorEmail || `${payload.operatorId.toLowerCase()}@yopmail.com`,
            machineName: payload.machineName,
            shift: payload.shift || "Morning",
            assignedAt,
          }),
        });
      } catch (emailErr) {
        console.warn("Failed to dispatch machine assignment emails:", emailErr);
      }

      return true;
    } catch (err) {
      console.error("Failed to assign task:", err);
      return false;
    }
  },

  /**
   * Unassign an operator's machine/engineer task
   */
  async unassignTask(operatorId: string): Promise<boolean> {
    try {
      const stored = getStoredTasks();
      const updated = stored.filter((item) => item.operatorId !== operatorId);
      saveStoredTasks(updated);

      // Unassign in machineAssignmentService
      await machineAssignmentService.assignMachines(operatorId, [], "operator");
      return true;
    } catch (err) {
      console.error("Failed to unassign task:", err);
      return false;
    }
  },

  /**
   * Alias for getSupervisorTaskData
   */
  async getSupervisorTasksData() {
    return this.getSupervisorTaskData();
  },
};
