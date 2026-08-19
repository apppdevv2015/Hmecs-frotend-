import { configureStore } from "@reduxjs/toolkit";

import authReducer from "./slices/authSlice";
import machineReducer from "./slices/machineSlice";
import assignmentReducer from "./slices/assignmentSlice";
import fleetReducer from "./slices/fleetSlice";

import assignedMachineReducer from "./slices/assignedMachineSlice";
import machineComponentReducer from "./slices/machineComponentSlice";

// Artisan
import artisanMachineReducer from "./slices/artisanMachineSlice";
import artisanAssignmentReducer from "./slices/artisanAssignmentSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    machine: machineReducer,
    assignment: assignmentReducer,
    fleet: fleetReducer,

    // Operator
    assignedMachine: assignedMachineReducer,

    // Machine Components
    machineComponent: machineComponentReducer,

    // Artisan - Assigned Machines
    artisanMachine: artisanMachineReducer,

    // Artisan - Machine Assignments
    artisanAssignment: artisanAssignmentReducer,
  },
});

// TypeScript types
export type RootState =
  ReturnType<typeof store.getState>;

export type AppDispatch =
  typeof store.dispatch;