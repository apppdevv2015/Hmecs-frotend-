import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

/* ==========================================
   TYPES
========================================== */

export interface AssignedMachine {
  machineId: string;

  machineName?: string;

  fleetId?: string;
}

export interface Assignment {
  assignmentId?: string;

  supervisorId?: string;

  engineerId: string;

  engineerName?: string;

  operatorId: string;

  operatorName?: string;

  machines: AssignedMachine[];

  assignedAt: string;

  status: "assigned" | "completed" | "pending";
}

interface AssignmentState {
  assignments: Assignment[];

  loading: boolean;

  submitLoading: boolean;

  error: string | null;
}

/* ==========================================
   INITIAL STATE
========================================== */

const initialState: AssignmentState = {
  assignments: [],

  loading: false,

  submitLoading: false,

  error: null,
};

/* ==========================================
   FUTURE API THUNKS
========================================== */

/**
 * Future:
 * GET assigned machines API
 */
export const fetchAssignments = createAsyncThunk(
  "assignment/fetchAssignments",

  async (_, { rejectWithValue }) => {
    try {
      /**
       * Future API:
       *
       * const response =
       * await assignmentService.getAssignments()
       *
       * return response.data
       */

      return [];
    } catch (error: any) {
      return rejectWithValue(error?.message || "Failed to fetch assignments");
    }
  },
);

/**
 * Future:
 * POST assign machine API
 */
export const createAssignment = createAsyncThunk(
  "assignment/createAssignment",

  async (payload: Assignment, { rejectWithValue }) => {
    try {
      /**
       * Future API:
       *
       * const response =
       * await assignmentService.assignMachine(payload)
       *
       * return response.data
       */

      return payload;
    } catch (error: any) {
      return rejectWithValue(error?.message || "Failed to assign machine");
    }
  },
);

/* ==========================================
   SLICE
========================================== */

const assignmentSlice = createSlice({
  name: "assignment",

  initialState,

  reducers: {
    /**
     * Manual local assignment
     * (for dummy phase)
     */
    assignMachine: (state, action: PayloadAction<Assignment>) => {
      const existingIndex = state.assignments.findIndex(
        (item) => item.operatorId === action.payload.operatorId,
      );

      // Update existing assignment
      if (existingIndex !== -1) {
        state.assignments[existingIndex] = action.payload;
      }

      // Create new assignment
      else {
        state.assignments.push(action.payload);
      }
    },

    updateAssignment: (state, action: PayloadAction<Assignment>) => {
      const index = state.assignments.findIndex(
        (item) => item.operatorId === action.payload.operatorId,
      );

      if (index !== -1) {
        state.assignments[index] = action.payload;
      }
    },

    removeAssignment: (state, action: PayloadAction<string>) => {
      state.assignments = state.assignments.filter(
        (item) => item.operatorId !== action.payload,
      );
    },

    clearAssignments: (state) => {
      state.assignments = [];
    },

    clearAssignmentError: (state) => {
      state.error = null;
    },
  },

  extraReducers: (builder) => {
    builder

      // FETCH
      .addCase(fetchAssignments.pending, (state) => {
        state.loading = true;

        state.error = null;
      })

      .addCase(fetchAssignments.fulfilled, (state, action) => {
        state.loading = false;

        state.assignments = action.payload;
      })

      .addCase(fetchAssignments.rejected, (state, action) => {
        state.loading = false;

        state.error = action.payload as string;
      })

      // CREATE
      .addCase(createAssignment.pending, (state) => {
        state.submitLoading = true;
      })

      .addCase(createAssignment.fulfilled, (state, action) => {
        state.submitLoading = false;

        state.assignments.push(action.payload);
      });
  },
});

/* ==========================================
   EXPORTS
========================================== */

export const {
  assignMachine,
  updateAssignment,
  removeAssignment,
  clearAssignments,
  clearAssignmentError,
} = assignmentSlice.actions;

export default assignmentSlice.reducer;
