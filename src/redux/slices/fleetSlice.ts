import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

import { fleetService, type FleetMachine, type UserRole } from "../../services/Fleet/fleetService";

/* ==========================================
   TYPES
========================================== */

interface FleetStats {
  totalMachines: number;

  healthy: number;

  maintenance: number;

  critical: number;
}

interface FleetState {
  fleetMachines: FleetMachine[];

  selectedMachine: FleetMachine | null;

  stats: FleetStats | null;

  loading: boolean;

  error: string | null;
}

/* ==========================================
   INITIAL STATE
========================================== */

const initialState: FleetState = {
  fleetMachines: [],

  selectedMachine: null,

  stats: null,

  loading: false,

  error: null,
};

/* ==========================================
   THUNKS
========================================== */

export const fetchFleetMachines = createAsyncThunk(
  "fleet/fetchFleetMachines",

  async (
    params: {
      role?: UserRole;
      companyId?: string;
      operatorId?: string;
    } = {},
    { rejectWithValue },
  ) => {
    try {
      const response = await fleetService.getFleetMachines(
        params.role,
        params.companyId,
        params.operatorId,
      );

      return response;
    } catch (error: any) {
      return rejectWithValue(error?.message || "Failed to fetch fleet machines");
    }
  },
);

export const fetchFleetStats = createAsyncThunk(
  "fleet/fetchFleetStats",

  async (_, { rejectWithValue }) => {
    try {
      const response = await fleetService.getFleetStats();

      return response;
    } catch (error: any) {
      return rejectWithValue(error?.message || "Failed to fetch fleet stats");
    }
  },
);

/* ==========================================
   SLICE
========================================== */

const fleetSlice = createSlice({
  name: "fleet",

  initialState,

  reducers: {
    setSelectedFleetMachine: (state, action: PayloadAction<FleetMachine | null>) => {
      state.selectedMachine = action.payload;
    },

    clearFleetError: (state) => {
      state.error = null;
    },

    clearFleetData: (state) => {
      state.fleetMachines = [];

      state.stats = null;
    },
  },

  extraReducers: (builder) => {
    builder

      // FETCH MACHINES
      .addCase(fetchFleetMachines.pending, (state) => {
        state.loading = true;

        state.error = null;
      })

      .addCase(fetchFleetMachines.fulfilled, (state, action) => {
        state.loading = false;

        state.fleetMachines = action.payload;
      })

      .addCase(fetchFleetMachines.rejected, (state, action) => {
        state.loading = false;

        state.error = action.payload as string;
      })

      // FETCH STATS
      .addCase(fetchFleetStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      });
  },
});

/* ==========================================
   EXPORTS
========================================== */

export const { setSelectedFleetMachine, clearFleetError, clearFleetData } = fleetSlice.actions;

export default fleetSlice.reducer;
