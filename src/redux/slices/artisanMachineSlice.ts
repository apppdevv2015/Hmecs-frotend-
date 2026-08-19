import {
  createSlice,
  createAsyncThunk,
} from "@reduxjs/toolkit";

import machineService from "../../services/Operator/machineService";

/* =========================================================
   TYPES
========================================================= */

export type AssignmentStatus =
  | "Active"
  | "Completed";

export interface ArtisanMachine {
  machineId: string;
  machineName: string;
  serialNumber: string;
  modelYear: string;
  fuelType: string;
  status: AssignmentStatus | string;
  assignedOn: string;
  assignedBy: string;
  location: string;

  // Assignment information
  assignedArtisanId: string;
  assignedArtisanName: string;

  // Optional machine information
  overallHealth: number | null;
  totalHours: number | null;
  fuelLevel: number | null;
  nextServiceDue: string | null;
}

interface ArtisanMachineState {
  machines: ArtisanMachine[];

  loading: boolean;
  error: string | null;
}

/* =========================================================
   INITIAL STATE
========================================================= */

const initialState: ArtisanMachineState = {
  machines: [],
  loading: false,
  error: null,
};

/* =========================================================
   NORMALIZER
========================================================= */

const normalizeArtisanMachine = (
  item: any,
): ArtisanMachine => ({
  machineId: String(
    item?.machineId ??
      item?.machine_id ??
      item?.id ??
      "",
  ),

  machineName: String(
    item?.machineName ??
      item?.machine_name ??
      item?.name ??
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

  status: String(
    item?.status ?? "",
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
      item?.assignedByName ??
      item?.assignedSupervisorName ??
      item?.assigned_by ??
      item?.assigned_by_name ??
      item?.assigned_supervisor_name ??
      "",
  ),

  location: String(
    item?.location ?? "",
  ),

  assignedArtisanId: String(
    item?.assignedArtisanId ??
      item?.assigned_artisan_id ??
      "",
  ),

  assignedArtisanName: String(
    item?.assignedArtisanName ??
      item?.assigned_artisan_name ??
      "",
  ),

  overallHealth:
    item?.overallHealth ??
    item?.overall_health ??
    null,

  totalHours:
    item?.totalHours ??
    item?.total_hours ??
    item?.hoursRun ??
    item?.hours_run ??
    null,

  fuelLevel:
    item?.fuelLevel ??
    item?.fuel_level ??
    null,

  nextServiceDue:
    item?.nextServiceDue ??
    item?.next_service_due ??
    null,
});

/* =========================================================
   RESPONSE ARRAY EXTRACTOR
========================================================= */

const extractMachines = (
  response: any,
): any[] => {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (Array.isArray(response?.data?.data)) {
    return response.data.data;
  }

  if (Array.isArray(response?.items)) {
    return response.items;
  }

  if (Array.isArray(response?.machines)) {
    return response.machines;
  }

  if (Array.isArray(response?.data?.machines)) {
    return response.data.machines;
  }

  if (Array.isArray(response?.assignments)) {
    return response.assignments;
  }

  if (Array.isArray(response?.data?.assignments)) {
    return response.data.assignments;
  }

  return [];
};

/* =========================================================
   FETCH ARTISAN ASSIGNED MACHINES
========================================================= */

export const fetchArtisanAssignedMachines =
  createAsyncThunk(
    "artisanMachine/fetchArtisanAssignedMachines",

    async (
      artisanId: string | undefined,
      { rejectWithValue },
    ) => {
      try {
        /*
         * IMPORTANT:
         * Real API call only.
         * No mock data.
         * No dummy fallback.
         */
        const response =
          await machineService.getAssignedMachines();

        const rawMachines =
          extractMachines(response);

        /*
         * If artisanId is provided and API returns
         * assignment records for multiple users,
         * keep only this Artisan's machines.
         *
         * If API is already role/user scoped,
         * this simply keeps all returned records.
         */
        const filteredMachines =
          artisanId
            ? rawMachines.filter(
                (item: any) => {
                  const assignedArtisanId =
                    String(
                      item?.assignedArtisanId ??
                        item?.assigned_artisan_id ??
                        "",
                    );

                  return (
                    !assignedArtisanId ||
                    assignedArtisanId ===
                      String(artisanId)
                  );
                },
              )
            : rawMachines;

        return filteredMachines.map(
          normalizeArtisanMachine,
        );
      } catch (error: any) {
        return rejectWithValue(
          error?.message ||
            "Failed to fetch artisan assigned machines",
        );
      }
    },
  );

/* =========================================================
   SLICE
========================================================= */

const artisanMachineSlice =
  createSlice({
    name: "artisanMachine",

    initialState,

    reducers: {
      clearArtisanMachines: (
        state,
      ) => {
        state.machines = [];
        state.error = null;
      },

      clearArtisanMachineError: (
        state,
      ) => {
        state.error = null;
      },
    },

    extraReducers: (
      builder,
    ) => {
      builder

        /* =========================================
           PENDING
        ========================================= */

        .addCase(
          fetchArtisanAssignedMachines.pending,
          (state) => {
            state.loading = true;
            state.error = null;
          },
        )

        /* =========================================
           SUCCESS
        ========================================= */

        .addCase(
          fetchArtisanAssignedMachines.fulfilled,
          (
            state,
            action,
          ) => {
            state.loading = false;
            state.error = null;

            /*
             * Only API response goes into Redux.
             */
            state.machines =
              action.payload;
          },
        )

        /* =========================================
           ERROR
        ========================================= */

        .addCase(
          fetchArtisanAssignedMachines.rejected,
          (
            state,
            action,
          ) => {
            state.loading = false;

            /*
             * IMPORTANT:
             * Clear old data on API failure.
             * Never show stale/dummy data.
             */
            state.machines = [];

            state.error =
              (action.payload as string) ||
              "Failed to fetch artisan assigned machines";
          },
        );
    },
  });

/* =========================================================
   ACTIONS
========================================================= */

export const {
  clearArtisanMachines,
  clearArtisanMachineError,
} =
  artisanMachineSlice.actions;

/* =========================================================
   SELECTORS
========================================================= */

export const selectArtisanMachines = (
  state: {
    artisanMachine: ArtisanMachineState;
  },
) => state.artisanMachine.machines;

export const selectArtisanMachinesLoading = (
  state: {
    artisanMachine: ArtisanMachineState;
  },
) => state.artisanMachine.loading;

export const selectArtisanMachinesError = (
  state: {
    artisanMachine: ArtisanMachineState;
  },
) => state.artisanMachine.error;

/* =========================================================
   REDUCER
========================================================= */

export default artisanMachineSlice.reducer;