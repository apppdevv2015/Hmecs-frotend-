import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import StorageService, { STORAGE_KEYS } from "../../services/storage.service";

export type UserRole =
  | "super_admin"
  | "company_admin"
  | "supervisor"
  | "engineer"
  | "operator"
  | "mechanic"
  | "viewer"
  | "";

export interface AuthUser {
  id?: string | number;

  role?: UserRole;

  role_name?: string;

  role_id?: string | number;

  email?: string;

  name?: string;

  first_name?: string;

  last_name?: string;

  companyId?: string;

  company_id?: string;

  companyName?: string;

  company?: string;
}

interface AuthState {
  user: AuthUser | null;

  token: string | null;

  role: UserRole;

  companyId: string | null;

  isAuthenticated: boolean;

  loading: boolean;
}

/* ==========================================
   INITIAL STATE FROM STORAGE
========================================== */

const storedUser = StorageService.get<AuthUser>(STORAGE_KEYS.USER);

const storedToken = StorageService.get<string>(STORAGE_KEYS.TOKEN);

const storedRole = StorageService.get<UserRole>(STORAGE_KEYS.ROLE);

const storedCompanyId = StorageService.get<string>(STORAGE_KEYS.COMPANY_ID);

const initialState: AuthState = {
  user: storedUser || null,

  token: storedToken || null,

  role: storedRole || "",

  companyId: storedCompanyId || null,

  isAuthenticated: !!storedToken,

  loading: false,
};

/* ==========================================
   SLICE
========================================== */

const authSlice = createSlice({
  name: "auth",

  initialState,

  reducers: {
    setAuth: (
      state,
      action: PayloadAction<{
        user: AuthUser;
        token: string;
        role: UserRole;
        companyId?: string;
      }>,
    ) => {
      const { user, token, role, companyId } = action.payload;

      state.user = user;

      state.token = token;

      state.role = role;

      state.companyId = companyId || user.companyId || user.company_id || null;

      state.isAuthenticated = true;

      // Persist
      StorageService.set(STORAGE_KEYS.USER, user);

      StorageService.set(STORAGE_KEYS.TOKEN, token);

      StorageService.set(STORAGE_KEYS.ROLE, role);

      if (state.companyId) {
        StorageService.set(STORAGE_KEYS.COMPANY_ID, state.companyId);
      }
    },

    updateUser: (state, action: PayloadAction<Partial<AuthUser>>) => {
      state.user = {
        ...state.user,
        ...action.payload,
      };

      StorageService.set(STORAGE_KEYS.USER, state.user);
    },

    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },

    logout: (state) => {
      state.user = null;

      state.token = null;

      state.role = "";

      state.companyId = null;

      state.isAuthenticated = false;

      // Clear storage
      StorageService.remove(STORAGE_KEYS.USER);

      StorageService.remove(STORAGE_KEYS.TOKEN);

      StorageService.remove(STORAGE_KEYS.ROLE);

      StorageService.remove(STORAGE_KEYS.EMAIL);

      StorageService.remove(STORAGE_KEYS.NAME);

      StorageService.remove(STORAGE_KEYS.COMPANY_ID);
    },
  },
});

/* ==========================================
   EXPORTS
========================================== */

export const { setAuth, updateUser, logout, setLoading } = authSlice.actions;

export default authSlice.reducer;
