import { configureStore } from "@reduxjs/toolkit";

import authReducer from "./slices/authSlice";
import machineReducer from "./slices/machineSlice";
import assignmentReducer from "./slices/assignmentSlice";
import fleetReducer from "./slices/fleetSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    machine: machineReducer,
    assignment: assignmentReducer,
    fleet: fleetReducer,
  },
});

// TypeScript types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;