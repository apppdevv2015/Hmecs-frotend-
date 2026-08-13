import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

import { machineService, type MachinePayload } from "../../services/companyadmin/machineService";

/* ==========================================
   TYPES
========================================== */

export interface Machine {
  id: string;

  machineId?: string;

  name: string;

  model: string;

  serialNumber: string;

  equipmentType?: string;

  components?: any[];

  companyId?: string;

  status?: string;

  site?: string;

  location?: string;
}

interface MachineState {
  machines: Machine[];

  selectedMachine: Machine | null;

  loading: boolean;

  submitLoading: boolean;

  error: string | null;
}

/* ==========================================
   INITIAL STATE
========================================== */

const initialState: MachineState = {
  machines: [],

  selectedMachine: null,

  loading: false,

  submitLoading: false,

  error: null,
};

/* ==========================================
   HELPERS
========================================== */

const getArrayData = <T>(response: any): T[] => {
  if (Array.isArray(response)) return response;

  if (Array.isArray(response?.data)) return response.data;

  if (Array.isArray(response?.data?.data)) return response.data.data;

  if (Array.isArray(response?.machines)) return response.machines;

  if (Array.isArray(response?.data?.machines)) return response.data.machines;

  if (Array.isArray(response?.items)) return response.items;

  return [];
};

const normalizeMachine = (item: any): Machine => ({
  id: String(item?.id || item?.machine_id || item?.machineId || ""),

  machineId: String(item?.machineId || item?.machine_id || item?.id || ""),

  name: String(
    item?.name || item?.machineName || item?.machine_name || item?.model || "Unnamed Machine",
  ),

  model: String(item?.model || item?.equipmentType || item?.equipment_type || ""),

  serialNumber: item?.serialNumber || item?.serial_number || "",

  equipmentType: item?.equipmentType || item?.equipment_type || "",

  companyId: item?.companyId || item?.company_id || "",

  status: item?.status || "active",

  site: item?.site || item?.location || "",

  location: item?.location || item?.site || "",

  components: item?.components || [],
});

/* ==========================================
   API THUNKS
========================================== */

export const fetchMachines = createAsyncThunk(
  "machine/fetchMachines",
  async (_, { rejectWithValue }) => {
    try {
      const response = await machineService.getMachines();

      return getArrayData<any>(response).map(normalizeMachine);
    } catch (error: any) {
      return rejectWithValue(error?.message || "Failed to fetch machines");
    }
  },
);

export const addMachine = createAsyncThunk(
  "machine/addMachine",
  async (payload: MachinePayload, { rejectWithValue }) => {
    try {
      await machineService.createMachine(payload);

      const response = await machineService.getMachines();

      return getArrayData<any>(response).map(normalizeMachine);
    } catch (error: any) {
      return rejectWithValue(error?.message || "Failed to create machine");
    }
  },
);

export const updateMachine = createAsyncThunk(
  "machine/updateMachine",
  async (
    params: {
      id: string;
      payload: Partial<MachinePayload>;
    },
    { rejectWithValue },
  ) => {
    try {
      await machineService.updateMachine(params.id, params.payload);

      const response = await machineService.getMachines();

      return getArrayData<any>(response).map(normalizeMachine);
    } catch (error: any) {
      return rejectWithValue(error?.message || "Failed to update machine");
    }
  },
);

export const deleteMachine = createAsyncThunk(
  "machine/deleteMachine",
  async (id: string, { rejectWithValue }) => {
    try {
      await machineService.deleteMachine(id);

      return id;
    } catch (error: any) {
      return rejectWithValue(error?.message || "Failed to delete machine");
    }
  },
);

/* ==========================================
   SLICE
========================================== */

const machineSlice = createSlice({
  name: "machine",

  initialState,

  reducers: {
    setSelectedMachine: (state, action: PayloadAction<Machine | null>) => {
      state.selectedMachine = action.payload;
    },

    clearMachineError: (state) => {
      state.error = null;
    },
  },

  extraReducers: (builder) => {
    builder

      // FETCH
      .addCase(fetchMachines.pending, (state) => {
        state.loading = true;

        state.error = null;
      })

      .addCase(fetchMachines.fulfilled, (state, action) => {
        state.loading = false;

        state.machines = action.payload;
      })

      .addCase(fetchMachines.rejected, (state, action) => {
        state.loading = false;

        state.error = action.payload as string;
      })

      // ADD
      .addCase(addMachine.pending, (state) => {
        state.submitLoading = true;
      })

      .addCase(
        addMachine.fulfilled,

        (state, action) => {
          state.submitLoading = false;

          state.machines = action.payload;
        },
      )

      .addCase(addMachine.rejected, (state, action) => {
        state.submitLoading = false;

        state.error = action.payload as string;
      })

      // UPDATE
      .addCase(updateMachine.pending, (state) => {
        state.submitLoading = true;
      })

      .addCase(updateMachine.fulfilled, (state, action) => {
        state.submitLoading = false;

        state.machines = action.payload;
      })
      .addCase(updateMachine.rejected, (state, action) => {
        state.submitLoading = false;

        state.error = action.payload as string;
      })

      // DELETE
      .addCase(deleteMachine.fulfilled, (state, action) => {
        state.machines = state.machines.filter((machine) => machine.id !== action.payload);
      });
  },
});

/* ==========================================
   EXPORTS
========================================== */

export const { setSelectedMachine, clearMachineError } = machineSlice.actions;

export default machineSlice.reducer;
