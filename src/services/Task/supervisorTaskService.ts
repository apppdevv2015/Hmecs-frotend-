import StorageService, { STORAGE_KEYS } from "../storage.service";
import { userService, type ApiUser, normalizeUsersResponse } from "../Auth/userService";
import { machineService as companyMachineService } from "../companyadmin/machineService";

import { apiCall } from "../apiHandler";

import machineService from "../Operator/machineService";

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

// ---------------------------------------------------------------------------
// Shift is not tracked on the backend Machine table, so it's the only piece
// of supervisor task data we still keep client-side. Everything else
// (assigned machine, assigned artisan/engineer, supervisor) is now derived
// live from the backend Machine record so it always matches the Operator
// Dashboard and never drifts out of sync.
// ---------------------------------------------------------------------------

type StoredShiftEntry = {
  operatorId: string; // operator user UUID or ID
  shift: ShiftType;
};

const SUPERVISOR_SHIFTS_KEY = "hme_supervisor_operator_shifts";

const getStoredShifts = (): StoredShiftEntry[] => {
  try {
    return StorageService.get<StoredShiftEntry[]>(SUPERVISOR_SHIFTS_KEY) || [];
  } catch {
    return [];
  }
};

const saveStoredShifts = (entries: StoredShiftEntry[]): void => {
  try {
    StorageService.set(SUPERVISOR_SHIFTS_KEY, entries);
  } catch (err) {
    console.warn("Failed to persist supervisor shift selections:", err);
  }
};

const setStoredShift = (operatorId: string, shift: ShiftType): void => {
  const entries = getStoredShifts();
  const existingIndex = entries.findIndex((e) => e.operatorId === operatorId);

  if (existingIndex !== -1) {
    entries[existingIndex] = { operatorId, shift };
  } else {
    entries.push({ operatorId, shift });
  }

  saveStoredShifts(entries);
};

const clearStoredShift = (operatorId: string): void => {
  const entries = getStoredShifts().filter((e) => e.operatorId !== operatorId);
  saveStoredShifts(entries);
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
   * Fetches live operators, engineers, and machines from the backend, and
   * derives each operator's current assignment directly from the Machine
   * table's assigned_operator_id/assigned_artisan_id/assigned_supervisor_id
   * fields — this is the single source of truth, shared with the Operator
   * Dashboard, so assign/unassign always stays in sync everywhere.
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
        companyMachineService.getCompanyMachines(),
      ]);

      // Normalize Users list
      let userList: ApiUser[] = [];
      if (usersRes.status === "fulfilled") {
        userList = normalizeUsersResponse(usersRes.value as any);
      }

      // Normalize Machines list (raw, keeps assignment fields for lookup below)
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

      // Map Machines (for dropdown options etc. — no assignment fields exposed here)
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

      // Build a lookup: operatorId -> raw machine record currently assigned to them
      const machineByOperatorId = new Map<string, any>();
      rawMachines.forEach((m: any) => {
        const assignedOperatorId = String(
          m.assignedOperatorId ?? m.assigned_operator_id ?? "",
        ).trim();

        if (assignedOperatorId) {
          machineByOperatorId.set(assignedOperatorId, m);
        }
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

      // Load locally-stored shift selections (backend has no shift column)
      const storedShifts = getStoredShifts();

      // Map Operators — assignment info comes straight from the backend Machine record
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

        const assignedMachineRaw = machineByOperatorId.get(userId);

        let assignedMachine = "";
        let assignedMachineId = "";
        let assignedEngineer = "";
        let assignedEngineerId = "";
        let assignedAt = "";
        let supervisorName: string | undefined;
        let supervisorId: string | undefined;

        if (assignedMachineRaw) {
          assignedMachineId = String(
            assignedMachineRaw.id ?? assignedMachineRaw._id ?? assignedMachineRaw.machineId ?? "",
          );

          const rawName =
            assignedMachineRaw.name ??
            assignedMachineRaw.machineName ??
            assignedMachineRaw.model ??
            "";
          const serial = assignedMachineRaw.serialNumber ?? assignedMachineRaw.code ?? "";
          assignedMachine = serial ? `${rawName} (${serial})` : rawName;

          assignedEngineer =
            assignedMachineRaw.assignedArtisanName ??
            assignedMachineRaw.assigned_artisan_name ??
            "";
          assignedEngineerId = String(
            assignedMachineRaw.assignedArtisanId ??
              assignedMachineRaw.assigned_artisan_id ??
              "",
          );

          assignedAt =
            assignedMachineRaw.assignedAt ??
            assignedMachineRaw.updatedAt ??
            assignedMachineRaw.updated_at ??
            "";

          supervisorName =
            assignedMachineRaw.assignedSupervisorName ??
            assignedMachineRaw.assigned_supervisor_name ??
            undefined;
          supervisorId =
            assignedMachineRaw.assignedSupervisorId ??
            assignedMachineRaw.assigned_supervisor_id ??
            undefined;
        }

        const shiftEntry = storedShifts.find((s) => s.operatorId === userId || s.operatorId === code);

        return {
          id: code,
          userId,
          name,
          email,
          phone,
          assignedMachine,
          assignedMachineId,
          assignedEngineer,
          assignedEngineerId,
          assignedAt,
          shift: shiftEntry?.shift || "Morning",
          status,
          supervisorName,
          supervisorId,
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
      const supervisor = getCurrentSupervisor();
      const assignedAt = new Date().toISOString();

      // If reassigning, first unassign from the old machine
      try {
        const currentData = await this.getSupervisorTaskData();
        const currentAssignment = currentData.operators.find(
          (op) => op.userId === payload.operatorId || op.id === payload.operatorId
        );
        
        // If operator already has a machine assigned and we're assigning a different one
        if (
          currentAssignment?.assignedMachineId &&
          currentAssignment.assignedMachineId !== payload.machineId
        ) {
          await machineService.unassignMachine(currentAssignment.assignedMachineId);
        }
      } catch (err) {
        console.warn("Warning: Could not unassign previous machine:", err);
        // Continue with new assignment even if unassign fails
      }

      // Persist assignment to backend DB — this is now the only source of truth
      if (payload.machineId) {
        // Backend requires 'operatorId' or 'userId' field in the payload for user lookup
        await machineService.assignMachine(payload.machineId, {
          operatorId: payload.operatorId || undefined, // Backend will look up the user
          userId: payload.operatorId || undefined, // Alternative field name backend looks for
          operatorName: payload.operatorName || undefined,
          assignedArtisanId: payload.engineerId || undefined,
          assignedArtisanName: payload.engineerName || undefined,
          assignedSupervisorId: supervisor.id || undefined,
          assignedSupervisorName: supervisor.name || undefined,
        } as any);
      }

      // Shift has no backend column yet — keep it client-side only
      setStoredShift(payload.operatorId, payload.shift || "Morning");

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
  async unassignTask(operatorId: string, machineId: string): Promise<boolean> {
    try {
      if (!operatorId?.trim()) {
        throw new Error("Operator ID is required");
      }

      if (!machineId?.trim()) {
        throw new Error("Machine ID is required");
      }

      // Unassign on the backend — this is the only source of truth now,
      // so once this succeeds every dashboard reading Machine data
      // (Operator Dashboard, this page, etc.) will reflect it immediately.
      await machineService.unassignMachine(machineId);

      // Clear the locally-stored shift for this operator
      clearStoredShift(operatorId);

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