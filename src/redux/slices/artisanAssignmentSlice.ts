import {
  createAsyncThunk,
  createSlice,
  PayloadAction,
} from "@reduxjs/toolkit";

import machineService from "../../services/Operator/machineService";

/* =========================================================
   TYPES
========================================================= */

export type ArtisanAssignmentStatus =
  | "Active"
  | "Completed"
  | "Unassigned";

export type ArtisanAssignmentPriority = "High" | "Medium" | "Low";

export interface ArtisanAssignment {
  id: string;

  machineId: string;
  machineName: string;

  artisanId: string;
  artisanName: string;

  supervisorId: string;
  supervisorName: string;

  assignedAt: string;

  status: ArtisanAssignmentStatus;

  /* -----------------------------------------------------
     Component-level task metadata (used by the Supervisor
     "Assign Artisan to Component" screen). Optional so the
     Operator-side flows that don't deal with components
     keep working unchanged.
  ----------------------------------------------------- */
  taskId?: string;
  componentId?: string;
  componentName?: string;
  workScope?: string;
  priority?: ArtisanAssignmentPriority;
  startDate?: string;
  dueDate?: string;
}

export interface AssignArtisanPayload {
  machineId: string;
  machineName?: string;

  artisanId: string;
  artisanName?: string;

  supervisorId?: string;
  supervisorName?: string;

  // component-level task metadata (optional)
  taskId?: string;
  componentId?: string;
  componentName?: string;
  workScope?: string;
  priority?: ArtisanAssignmentPriority;
  startDate?: string;
  dueDate?: string;
}

export interface UnassignArtisanPayload {
  machineId: string;
}

interface ArtisanAssignmentState {
  assignments: ArtisanAssignment[];

  loading: boolean;
  assigning: boolean;
  unassigning: boolean;

  error: string | null;
  assignError: string | null;
  unassignError: string | null;
}

const initialState: ArtisanAssignmentState = {
  assignments: [],
  artisans: [],

  loading: false,
  artisansLoading: false,
  assigning: false,
  unassigning: false,

  error: null,
  artisansError: null,
  assignError: null,
  unassignError: null,
};

/* =========================================================
   HELPERS
========================================================= */

const getApiPayload = (response: any): any => {
  return response?.data ?? response;
};

const getArrayFromResponse = (response: any): any[] => {
  const payload = getApiPayload(response);

  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.assignments)) {
    return payload.assignments;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.machines)) {
    return payload.machines;
  }

  if (Array.isArray(payload?.users)) {
    return payload.users;
  }

  if (Array.isArray(payload?.artisans)) {
    return payload.artisans;
  }

  return [];
};

/* =========================================================
   NORMALIZER
========================================================= */

const normalizeAssignment = (
  item: any,
): ArtisanAssignment => {
  const machineId = String(
    item?.machineId ??
      item?.machine_id ??
      item?.id ??
      "",
  );

  const machineName = String(
    item?.machineName ??
      item?.machine_name ??
      item?.name ??
      item?.machine?.name ??
      "",
  );

 const artisanId = String(
  item?.artisanId ??
    item?.artisan_id ??
    item?.assignedArtisanId ??
    item?.assigned_artisan_id ??
    item?.artisan?.id ??
    item?.artisan?._id ??
    item?.userId ??
    item?.user_id ??
    "",
);

const artisanName = String(
  item?.artisanName ??
    item?.artisan_name ??
    item?.assignedArtisanName ??
    item?.assigned_artisan_name ??
    item?.artisan?.name ??
    item?.artisan?.fullName ??
    item?.artisan?.username ??
    item?.userName ??
    item?.user_name ??
    "",
);

  const supervisorId = String(
    item?.supervisorId ??
      item?.supervisor_id ??
      item?.assignedSupervisorId ??
      item?.assigned_supervisor_id ??
      "",
  );

  const supervisorName = String(
    item?.supervisorName ??
      item?.supervisor_name ??
      item?.assignedSupervisorName ??
      item?.assigned_supervisor_name ??
      "",
  );

  const statusValue = String(
    item?.status ??
      item?.assignmentStatus ??
      item?.assignment_status ??
      "Active",
  )
    .trim()
    .toLowerCase();

  let status: ArtisanAssignmentStatus = "Active";

  if (statusValue === "completed") {
    status = "Completed";
  } else if (statusValue === "unassigned") {
    status = "Unassigned";
  }

  const taskId = item?.taskId ?? item?.task_id ?? undefined;

  const componentId =
    item?.componentId ?? item?.component_id ?? undefined;

  const componentName =
    item?.componentName ?? item?.component_name ?? undefined;

  const workScope =
    item?.workScope ?? item?.work_scope ?? undefined;

  const priority =
    (item?.priority as ArtisanAssignmentPriority | undefined) ??
    undefined;

  const startDate =
    item?.startDate ?? item?.start_date ?? undefined;

  const dueDate = item?.dueDate ?? item?.due_date ?? undefined;

  return {
    id: String(
      item?.assignmentId ??
        item?.assignment_id ??
        item?.id ??
        `${machineId}-${artisanId}`,
    ),

    machineId,
    machineName,

    artisanId,
    artisanName,

    supervisorId,
    supervisorName,

    assignedAt: String(
      item?.assignedAt ??
        item?.assigned_at ??
        item?.createdAt ??
        item?.created_at ??
        "",
    ),

    status,

    taskId: taskId !== undefined ? String(taskId) : undefined,
    componentId:
      componentId !== undefined ? String(componentId) : undefined,
    componentName:
      componentName !== undefined
        ? String(componentName)
        : undefined,
    workScope:
      workScope !== undefined ? String(workScope) : undefined,
    priority,
    startDate:
      startDate !== undefined ? String(startDate) : undefined,
    dueDate: dueDate !== undefined ? String(dueDate) : undefined,
  };
};

/* =========================================================
   FETCH ARTISAN ASSIGNMENTS
========================================================= */

export const fetchArtisanAssignments =
  createAsyncThunk<
    ArtisanAssignment[],
    void,
    { rejectValue: string }
  >(
    "artisanAssignment/fetchArtisanAssignments",
    async (_, { rejectWithValue }) => {
      try {
        /*
          GET /machines/assignments

          This is the common assignment endpoint already
          available in machineService.
        */

        const response =
          await machineService.getAssignedMachines();

        const rawAssignments =
          getArrayFromResponse(response);

        return rawAssignments
          .map(normalizeAssignment)
          .filter(
            (assignment) =>
              assignment.artisanId !== "",
          );
      } catch (error: any) {
        return rejectWithValue(
          error?.message ||
            "Failed to fetch artisan assignments",
        );
      }
    },
  );

/* =========================================================
   ASSIGN ARTISAN TO MACHINE (/ COMPONENT)
========================================================= */

export const assignArtisanToMachine =
  createAsyncThunk<
    ArtisanAssignment,
    AssignArtisanPayload,
    { rejectValue: string }
  >(
    "artisanAssignment/assignArtisanToMachine",

    async (payload, { rejectWithValue }) => {
      try {
        if (!payload.machineId?.trim()) {
          return rejectWithValue(
            "Machine ID is required",
          );
        }

        if (!payload.artisanId?.trim()) {
          return rejectWithValue(
            "Artisan ID is required",
          );
        }

        /*
          IMPORTANT:

          Do NOT call supervisorTaskService.assignTask()
          here because that method contains Operator-specific
          re-assignment logic.

          We directly reuse the existing backend
          machineService.assignMachine() API.
        */

        const response =
          await machineService.assignMachine(
            payload.machineId,
            {
              artisanId: payload.artisanId,

              assignedArtisanId:
                payload.artisanId,

              assignedArtisanName:
                payload.artisanName,

              assignedSupervisorId:
                payload.supervisorId,

              assignedSupervisorName:
                payload.supervisorName,

              // component-level task metadata
              taskId: payload.taskId,
              componentId: payload.componentId,
              componentName: payload.componentName,
              workScope: payload.workScope,
              priority: payload.priority,
              startDate: payload.startDate,
              dueDate: payload.dueDate,
            },
          );

        const apiData =
          getApiPayload(response);

        /*
          Backend may return the complete assignment.
          If it doesn't, we construct the Redux representation
          from the request payload — this is NOT dummy data;
          it is the successful mutation response representation.
        */

        const assignment =
          normalizeAssignment({
            ...apiData,
            machineId:
              apiData?.machineId ??
              apiData?.machine_id ??
              payload.machineId,

            machineName:
              apiData?.machineName ??
              apiData?.machine_name ??
              payload.machineName,

            artisanId:
              apiData?.artisanId ??
              apiData?.artisan_id ??
              apiData?.assignedArtisanId ??
              payload.artisanId,

            artisanName:
              apiData?.artisanName ??
              apiData?.artisan_name ??
              apiData?.assignedArtisanName ??
              payload.artisanName,

            supervisorId:
              apiData?.supervisorId ??
              apiData?.supervisor_id ??
              payload.supervisorId,

            supervisorName:
              apiData?.supervisorName ??
              apiData?.supervisor_name ??
              payload.supervisorName,

            status:
              apiData?.status ?? "Active",

            assignedAt:
              apiData?.assignedAt ??
              apiData?.assigned_at ??
              new Date().toISOString(),

            taskId: apiData?.taskId ?? payload.taskId,
            componentId:
              apiData?.componentId ?? payload.componentId,
            componentName:
              apiData?.componentName ?? payload.componentName,
            workScope: apiData?.workScope ?? payload.workScope,
            priority: apiData?.priority ?? payload.priority,
            startDate: apiData?.startDate ?? payload.startDate,
            dueDate: apiData?.dueDate ?? payload.dueDate,
          });

        return assignment;
      } catch (error: any) {
        return rejectWithValue(
          error?.message ||
            "Failed to assign artisan to machine",
        );
      }
    },
  );

/* =========================================================
   UNASSIGN ARTISAN FROM MACHINE
========================================================= */

export const unassignArtisanFromMachine =
  createAsyncThunk<
    string,
    UnassignArtisanPayload,
    { rejectValue: string }
  >(
    "artisanAssignment/unassignArtisanFromMachine",

    async (payload, { rejectWithValue }) => {
      try {
        if (!payload.machineId?.trim()) {
          return rejectWithValue(
            "Machine ID is required",
          );
        }

        /*
          Existing backend API:

          DELETE /machines/{machineId}/assign
        */

        await machineService.unassignMachine(
          payload.machineId,
        );

        return payload.machineId;
      } catch (error: any) {
        return rejectWithValue(
          error?.message ||
            "Failed to unassign artisan from machine",
        );
      }
    },
  );

/* =========================================================
   GET MACHINE ASSIGNMENT
========================================================= */

export const fetchMachineAssignment =
  createAsyncThunk<
    ArtisanAssignment | null,
    string,
    { rejectValue: string }
  >(
    "artisanAssignment/fetchMachineAssignment",

    async (machineId, { rejectWithValue }) => {
      try {
        if (!machineId?.trim()) {
          return rejectWithValue(
            "Machine ID is required",
          );
        }

        const response =
          await machineService.getMachineAssignment(
            machineId,
          );

        const payload =
          getApiPayload(response);

        if (!payload) {
          return null;
        }

        const assignment =
          normalizeAssignment(payload);

        /*
          Only treat it as an Artisan assignment when
          backend actually returns an Artisan ID.
        */

        if (!assignment.artisanId) {
          return null;
        }

        return assignment;
      } catch (error: any) {
        return rejectWithValue(
          error?.message ||
            "Failed to fetch machine assignment",
        );
      }
    },
  );

/* =========================================================
   SLICE
========================================================= */

const artisanAssignmentSlice =
  createSlice({
    name: "artisanAssignment",

    initialState,

    reducers: {
      clearArtisanAssignmentError: (
        state,
      ) => {
        state.error = null;
        state.assignError = null;
        state.unassignError = null;
      },

      clearArtisanAssignments: (
        state,
      ) => {
        state.assignments = [];
        state.error = null;
      },

      removeAssignmentFromState: (
        state,
        action: PayloadAction<string>,
      ) => {
        state.assignments =
          state.assignments.filter(
            (assignment) =>
              assignment.machineId !==
              action.payload,
          );
      },
    },

    extraReducers: (builder) => {
      /* =====================================================
         FETCH
      ===================================================== */

      builder
        .addCase(
          fetchArtisanAssignments.pending,
          (state) => {
            state.loading = true;
            state.error = null;
          },
        )

        .addCase(
          fetchArtisanAssignments.fulfilled,
          (
            state,
            action,
          ) => {
            state.loading = false;

            /*
              IMPORTANT:
              API response is the source of truth.
              No dummy fallback is added.
            */

            state.assignments =
              action.payload;
          },
        )

        .addCase(
          fetchArtisanAssignments.rejected,
          (
            state,
            action,
          ) => {
            state.loading = false;

            state.error =
              action.payload ||
              "Failed to fetch artisan assignments";

            /*
              No dummy data here.
              Existing assignments are not replaced
              with fake data.
            */
          },
        );

      /* =====================================================
         ASSIGN
      ===================================================== */

      builder
        .addCase(
          assignArtisanToMachine.pending,
          (state) => {
            state.assigning = true;
            state.assignError = null;
          },
        )

        .addCase(
          assignArtisanToMachine.fulfilled,
          (
            state,
            action,
          ) => {
            state.assigning = false;

            const newAssignment =
              action.payload;

            /*
              Match on machineId + componentId (when present)
              so multiple components on the same machine can
              each carry their own assignment. Falls back to
              machineId-only matching for the Operator flow,
              which doesn't use components.
            */
            const existingIndex =
              state.assignments.findIndex(
                (assignment) =>
                  assignment.machineId ===
                    newAssignment.machineId &&
                  (assignment.componentName ?? "") ===
                    (newAssignment.componentName ?? ""),
              );

            if (
              existingIndex !== -1
            ) {
              state.assignments[
                existingIndex
              ] = newAssignment;
            } else {
              state.assignments.push(
                newAssignment,
              );
            }
          },
        )

        .addCase(
          assignArtisanToMachine.rejected,
          (
            state,
            action,
          ) => {
            state.assigning = false;

            state.assignError =
              action.payload ||
              "Failed to assign artisan";
          },
        );

      /* =====================================================
         UNASSIGN
      ===================================================== */

      builder
        .addCase(
          unassignArtisanFromMachine.pending,
          (state) => {
            state.unassigning = true;
            state.unassignError = null;
          },
        )

        .addCase(
          unassignArtisanFromMachine.fulfilled,
          (
            state,
            action,
          ) => {
            state.unassigning = false;

            state.assignments =
              state.assignments.filter(
                (assignment) =>
                  assignment.machineId !==
                  action.payload,
              );
          },
        )

        .addCase(
          unassignArtisanFromMachine.rejected,
          (
            state,
            action,
          ) => {
            state.unassigning = false;

            state.unassignError =
              action.payload ||
              "Failed to unassign artisan";
          },
        );

      /* =====================================================
         MACHINE ASSIGNMENT
      ===================================================== */

      builder
        .addCase(
          fetchMachineAssignment.pending,
          (state) => {
            state.loading = true;
            state.error = null;
          },
        )

        .addCase(
          fetchMachineAssignment.fulfilled,
          (
            state,
            action,
          ) => {
            state.loading = false;

            const assignment =
              action.payload;

            if (!assignment) {
              return;
            }

            const existingIndex =
              state.assignments.findIndex(
                (item) =>
                  item.machineId ===
                  assignment.machineId,
              );

            if (
              existingIndex !== -1
            ) {
              state.assignments[
                existingIndex
              ] = assignment;
            } else {
              state.assignments.push(
                assignment,
              );
            }
          },
        )

        .addCase(
          fetchMachineAssignment.rejected,
          (
            state,
            action,
          ) => {
            state.loading = false;

            state.error =
              action.payload ||
              "Failed to fetch machine assignment";
          },
        );
    },
  });

/* =========================================================
   ACTIONS
========================================================= */

export const {
  clearArtisanAssignmentError,
  clearArtisanAssignments,
  removeAssignmentFromState,
} =
  artisanAssignmentSlice.actions;

/* =========================================================
   SELECTORS
========================================================= */

export const selectArtisanAssignments = (
  state: {
    artisanAssignment: ArtisanAssignmentState;
  },
) =>
  state.artisanAssignment.assignments;

export const selectArtisanAssignmentLoading = (
  state: {
    artisanAssignment: ArtisanAssignmentState;
  },
) =>
  state.artisanAssignment.loading;

export const selectArtisanAssigning = (
  state: {
    artisanAssignment: ArtisanAssignmentState;
  },
) =>
  state.artisanAssignment.assigning;

export const selectArtisanUnassigning = (
  state: {
    artisanAssignment: ArtisanAssignmentState;
  },
) =>
  state.artisanAssignment.unassigning;

export const selectArtisanAssignmentError = (
  state: {
    artisanAssignment: ArtisanAssignmentState;
  },
) =>
  state.artisanAssignment.error;

export default artisanAssignmentSlice.reducer;