import {
  createSlice,
  createAsyncThunk,
  PayloadAction,
} from "@reduxjs/toolkit";

import machineService from "../../services/Operator/machineService";

/* ==========================================
   TYPES
========================================== */

export type AssignmentStatus = "Active" | "Completed";

export interface CurrentMachine {
  machineName: string;
  machineId: string;
  serialNumber: string;
  modelYear: string;
  fuelType: string;
  status: AssignmentStatus;
  assignedOn: string;
  assignedBy: string;
  location: string;
  overallHealth: number;
  totalHours: number;
  fuelLevel: number;
  nextServiceDue: string;
}

export interface AssignmentHistoryItem {
  id: string;
  machineName: string;
  machineId: string;
  assignedOn: string;
  assignedBy: string;
  status: AssignmentStatus;
  notes: string;
}

interface AssignedMachineState {
  currentMachine: CurrentMachine | null;
  assignmentHistory: AssignmentHistoryItem[];

  loading: boolean;
  error: string | null;
}

const initialState: AssignedMachineState = {
  currentMachine: null,
  assignmentHistory: [],

  loading: false,
  error: null,
};

/* ==========================================
   NORMALIZERS
========================================== */

const normalizeHistoryItem = (
  item: any,
): AssignmentHistoryItem => ({
  id: String(
    item?.id ??
      item?.assignmentId ??
      item?.assignment_id ??
      "",
  ),

  machineName: String(
    item?.machineName ??
      item?.machine_name ??
      "",
  ),

  machineId: String(
    item?.machineId ??
      item?.machine_id ??
      "",
  ),

  assignedOn: String(
    item?.assignedOn ??
      item?.assignedAt ??
      item?.assigned_on ??
      item?.assigned_at ??
      "",
  ),

  assignedBy: String(
    item?.assignedBy ??
      item?.assignedSupervisorName ??
      item?.assigned_by ??
      item?.assigned_supervisor_name ??
      "",
  ),

  status:
    item?.status === "Active"
      ? "Active"
      : "Completed",

  notes: String(item?.notes ?? ""),
});

const normalizeCurrentMachine = (
  item: any,
): CurrentMachine => ({
  machineName: String(
    item?.machineName ??
      item?.machine_name ??
      "",
  ),

  machineId: String(
    item?.machineId ??
      item?.machine_id ??
      "",
  ),

  serialNumber: String(
    item?.serialNumber ??
      item?.serial_number ??
      "",
  ),

  modelYear: String(
    item?.modelYear ??
      item?.model_year ??
      "",
  ),

  fuelType: String(
    item?.fuelType ??
      item?.fuel_type ??
      "",
  ),

  status:
    (item?.status as AssignmentStatus) ||
    "Active",

  assignedOn: String(
    item?.assignedOn ??
      item?.assignedAt ??
      item?.assigned_on ??
      item?.assigned_at ??
      "",
  ),

  assignedBy: String(
    item?.assignedBy ??
      item?.assignedSupervisorName ??
      item?.assigned_by ??
      item?.assigned_supervisor_name ??
      "",
  ),

  location: String(item?.location ?? ""),

  overallHealth: Number(
    item?.overallHealth ??
      item?.overall_health ??
      0,
  ),

  totalHours: Number(
    item?.totalHours ??
      item?.total_hours ??
      0,
  ),

  fuelLevel: Number(
    item?.fuelLevel ??
      item?.fuel_level ??
      0,
  ),

  nextServiceDue: String(
    item?.nextServiceDue ??
      item?.next_service_due ??
      "-",
  ),
});

/* ==========================================
   FETCH OPERATOR ASSIGNMENTS
========================================== */

export const fetchOperatorAssignments =
  createAsyncThunk(
    "assignedMachine/fetchOperatorAssignments",

    async (_, { rejectWithValue }) => {
      try {
        const response =
          await machineService.getOperatorAssignments();

        const payload =
          response?.data ?? response;

        let rawCurrent =
          payload?.current ??
          payload?.currentMachine ??
          payload?.current_machine ??
          payload?.active ??
          payload?.activeAssignment ??
          payload?.active_assignment ??
          payload?.activeMachine ??
          null;

        if (
          !rawCurrent &&
          Array.isArray(payload?.activeAssignments)
        ) {
          rawCurrent =
            payload.activeAssignments[0] ?? null;
        }

        let rawHistory =
          payload?.history ??
          payload?.assignmentHistory ??
          payload?.assignment_history ??
          payload?.assignments ??
          (Array.isArray(payload)
            ? payload
            : []);

        if (!Array.isArray(rawHistory)) {
          rawHistory = [];
        }

        // If current machine is not directly provided,
        // find the latest active assignment from history.
        if (!rawCurrent && rawHistory.length) {
          const activeItems = rawHistory.filter(
            (item: any) => {
              const status = String(
                item?.status ??
                  item?.assignmentStatus ??
                  item?.assignment_status ??
                  "",
              )
                .trim()
                .toLowerCase();

              return (
                status !== "completed" &&
                status !== "unassigned"
              );
            },
          );

          rawCurrent =
            [...activeItems].sort(
              (a: any, b: any) => {
                const dateA = new Date(
                  a?.assignedAt ??
                    a?.assignedOn ??
                    a?.assigned_at ??
                    a?.assigned_on ??
                    0,
                ).getTime();

                const dateB = new Date(
                  b?.assignedAt ??
                    b?.assignedOn ??
                    b?.assigned_at ??
                    b?.assigned_on ??
                    0,
                ).getTime();

                return dateB - dateA;
              },
            )[0] ?? null;
        }

        // If no direct active assignment found from /operator-assignments,
        // query live machine assignments API to find the active assigned machine.
        if (!rawCurrent) {
          try {
            const allAssignedRes: any = await machineService.getAssignedMachines().catch(() => null);
            const list = Array.isArray(allAssignedRes?.data)
              ? allAssignedRes.data
              : Array.isArray(allAssignedRes)
                ? allAssignedRes
                : Array.isArray(allAssignedRes?.machines)
                  ? allAssignedRes.machines
                  : [];

            if (list.length > 0) {
              const storedUser = StorageService.getUser();
              const curName = (storedUser?.name || storedUser?.fullName || "").toLowerCase();
              const curId = (storedUser?.id || "").toLowerCase();

              let match = list.find((m: any) => {
                const opId = String(m?.assignedOperatorId || m?.operatorId || m?.operator?.id || "").toLowerCase();
                const opName = String(m?.assignedOperatorName || m?.operatorName || m?.operator?.name || "").toLowerCase();
                return (curId && opId === curId) || (curName && opName.includes(curName));
              });

              if (!match && list.length > 0) {
                match = list[0];
              }

              if (match) {
                rawCurrent = {
                  machineId: match.machineId || match.id || match._id,
                  machineName: match.machineName || match.name,
                  serialNumber: match.serialNumber || match.fleetId || match.serialNo || "—",
                  modelYear: match.modelYear || match.model || "—",
                  fuelType: match.equipmentType || match.fuelType || match.machineType || "Equipment",
                  location: match.site || match.location || "Main Mine Site",
                  overallHealth: Number(match.healthScore || match.health || match.overallHealth || 85),
                  totalHours: Number(match.runningHours || match.hoursRun || match.totalHours || 0),
                  fuelLevel: Number(match.fuelLevel || 80),
                  status: "Active",
                  assignedOn: match.assignedAt || match.assignedOn || new Date().toISOString(),
                  assignedBy: match.assignedSupervisorName || match.assignedBy || "Company Admin",
                };
              }
            }
          } catch {}
        }

        return {
          currentMachine: rawCurrent
            ? normalizeCurrentMachine(rawCurrent)
            : null,

          assignmentHistory:
            rawHistory.map(
              normalizeHistoryItem,
            ),
        };
      } catch (error: any) {
        return rejectWithValue(
          error?.message ||
            "Failed to fetch operator assignments",
        );
      }
    },
  );

/* ==========================================
   SLICE
========================================== */

const assignedMachineSlice = createSlice({
  name: "assignedMachine",

  initialState,

  reducers: {
    clearAssignedMachine: (state) => {
      state.currentMachine = null;
      state.assignmentHistory = [];
    },

    clearAssignmentError: (state) => {
      state.error = null;
    },
  },

  extraReducers: (builder) => {
    builder

      .addCase(
        fetchOperatorAssignments.pending,
        (state) => {
          state.loading = true;
          state.error = null;
        },
      )

      .addCase(
        fetchOperatorAssignments.fulfilled,
        (state, action) => {
          state.loading = false;

          state.currentMachine =
            action.payload.currentMachine;

          state.assignmentHistory =
            action.payload.assignmentHistory;
        },
      )

      .addCase(
        fetchOperatorAssignments.rejected,
        (state, action) => {
          state.loading = false;

          state.error =
            (action.payload as string) ||
            "Failed to fetch assignments";
        },
      );
  },
});

export const {
  clearAssignedMachine,
  clearAssignmentError,
} = assignedMachineSlice.actions;

export default assignedMachineSlice.reducer;