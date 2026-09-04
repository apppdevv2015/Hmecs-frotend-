import {
  createSlice,
  createAsyncThunk,
  PayloadAction,
} from "@reduxjs/toolkit";

import {
  componentService,
} from "../../services/companyadmin/componentService";

/* ==========================================
   TYPES
========================================== */

export interface MachineComponent {
  id: string;

  machineId?: string;

  category?: string;

  description?: string;

  serialNumber?: string;

  supplier?: string;

  installHours?: number;

  currentHours?: number;

  plannedLife?: number;

  replacementCost?: number;

  condition?: number;

  status?: string;
}

interface MachineComponentState {
  components: MachineComponent[];

  loading: boolean;

  error: string | null;
}

/* ==========================================
   INITIAL STATE
========================================== */

const initialState: MachineComponentState = {
  components: [],

  loading: false,

  error: null,
};

/* ==========================================
   RESPONSE HELPER
========================================== */

const getComponentsArray = (
  response: any,
): MachineComponent[] => {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (Array.isArray(response?.data?.data)) {
    return response.data.data;
  }

  if (Array.isArray(response?.components)) {
    return response.components;
  }

  if (Array.isArray(response?.data?.components)) {
    return response.data.components;
  }

  if (Array.isArray(response?.items)) {
    return response.items;
  }

  if (Array.isArray(response?.data?.items)) {
    return response.data.items;
  }

  return [];
};

/* ==========================================
   NORMALIZE COMPONENT
========================================== */

const normalizeComponent = (
  item: any,
): MachineComponent => ({
  id: String(
    item?.id ??
      item?.componentId ??
      item?.component_id ??
      "",
  ),

  machineId:
    item?.machineId ??
    item?.machine_id ??
    undefined,

  category:
    item?.category ??
    item?.componentCategory ??
    item?.component_category ??
    "",

  description:
    item?.description ??
    item?.componentDescription ??
    item?.component_description ??
    "",

  serialNumber:
    item?.serialNumber ??
    item?.serial_number ??
    "",

  supplier:
    item?.supplier ??
    "",

  installHours: Number(
    item?.installHours ??
      item?.install_hours ??
      0,
  ),

  currentHours: Number(
    item?.currentHours ??
      item?.current_hours ??
      0,
  ),

  plannedLife: Number(
    item?.plannedLife ??
      item?.planned_life ??
      0,
  ),

  replacementCost: Number(
    item?.replacementCost ??
      item?.replacement_cost ??
      0,
  ),

  condition: Number(
    item?.condition ??
      0,
  ),

  status:
    item?.status ??
    "",
});

/* ==========================================
   FETCH MACHINE COMPONENTS
========================================== */

export const fetchMachineComponents =
  createAsyncThunk<
    MachineComponent[],
    string,
    {
      rejectValue: string;
    }
  >(
    "machineComponent/fetchMachineComponents",

    async (
      machineId,
      { rejectWithValue },
    ) => {
      try {
        /* --------------------------------------
           Validate machine ID
        -------------------------------------- */

        if (!machineId?.trim()) {
          return rejectWithValue(
            "Machine ID is required",
          );
        }

        /* --------------------------------------
           API CALL
        -------------------------------------- */

        const response =
          await componentService.getMachineComponents(
            machineId,
          );

        /* --------------------------------------
           Extract array
        -------------------------------------- */

        const components =
          getComponentsArray(response);

        /* --------------------------------------
           Normalize response
        -------------------------------------- */

        return components.map(
          normalizeComponent,
        );
      } catch (error: any) {
        return rejectWithValue(
          error?.message ||
            "Failed to fetch machine components",
        );
      }
    },
  );

/* ==========================================
   SLICE
========================================== */

const machineComponentSlice = createSlice({
  name: "machineComponent",

  initialState,

  reducers: {
    /* --------------------------------------
       CLEAR COMPONENTS
    -------------------------------------- */

    clearComponents: (state) => {
      state.components = [];
    },

    /* --------------------------------------
       CLEAR ERROR
    -------------------------------------- */

    clearComponentError: (state) => {
      state.error = null;
    },

    /* --------------------------------------
       SET COMPONENTS MANUALLY
    -------------------------------------- */

    setComponents: (
      state,
      action: PayloadAction<MachineComponent[]>,
    ) => {
      state.components = action.payload;
    },

    /* --------------------------------------
       ADD COMPONENT
    -------------------------------------- */

    addComponent: (
      state,
      action: PayloadAction<MachineComponent>,
    ) => {
      state.components.push(
        action.payload,
      );
    },

    /* --------------------------------------
       UPDATE COMPONENT
    -------------------------------------- */

    updateComponent: (
      state,
      action: PayloadAction<MachineComponent>,
    ) => {
      const index =
        state.components.findIndex(
          (component) =>
            component.id ===
            action.payload.id,
        );

      if (index !== -1) {
        state.components[index] =
          action.payload;
      }
    },

    /* --------------------------------------
       REMOVE COMPONENT
    -------------------------------------- */

    removeComponent: (
      state,
      action: PayloadAction<string>,
    ) => {
      state.components =
        state.components.filter(
          (component) =>
            component.id !==
            action.payload,
        );
    },
  },

  /* ========================================
     ASYNC THUNKS
  ======================================== */

  extraReducers: (builder) => {
    builder

      /* --------------------------------------
         FETCH PENDING
      -------------------------------------- */

      .addCase(
        fetchMachineComponents.pending,
        (state) => {
          state.loading = true;

          state.error = null;
        },
      )

      /* --------------------------------------
         FETCH SUCCESS
      -------------------------------------- */

      .addCase(
        fetchMachineComponents.fulfilled,
        (state, action) => {
          state.loading = false;

          state.error = null;

          state.components =
            action.payload;
        },
      )

      /* --------------------------------------
         FETCH FAILED
      -------------------------------------- */

      .addCase(
        fetchMachineComponents.rejected,
        (state, action) => {
          state.loading = false;

          state.components = [];

          state.error =
            action.payload ||
            "Failed to fetch machine components";
        },
      );
  },
});

/* ==========================================
   ACTIONS
========================================== */

export const {
  clearComponents,
  clearComponentError,
  setComponents,
  addComponent,
  updateComponent,
  removeComponent,
} = machineComponentSlice.actions;

/* ==========================================
   SELECTORS
========================================== */

export const selectMachineComponents = (
  state: {
    machineComponent: MachineComponentState;
  },
) => state.machineComponent.components;

export const selectMachineComponentsLoading = (
  state: {
    machineComponent: MachineComponentState;
  },
) => state.machineComponent.loading;

export const selectMachineComponentsError = (
  state: {
    machineComponent: MachineComponentState;
  },
) => state.machineComponent.error;

/* ==========================================
   REDUCER
========================================== */

export default machineComponentSlice.reducer;