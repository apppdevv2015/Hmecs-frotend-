import { apiRequest } from "./api";
import StorageService, { STORAGE_KEYS } from "./storage.service";
import { getSanitizedErrorMessage } from "../utils/errorHelper";
import { translateError } from "../errors/auth.errors";

export type RegisterPayload = {
  company_name: string;
  fname: string;
  lname: string;
  email: string;
  password: string;
  mobile_number: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type AuthResponse = {
  success?: boolean;
  message?: string;
  token?: string;
  admin?: unknown;
  company?: unknown;
  user?: unknown;
  data?: unknown;
};

export const normalizeRole = (role?: string | number | null) => {
  if (!role) return "";

  return String(role)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_")
    .replace(/_+$/g, "");
};

export const authService = {
  register: (payload: RegisterPayload) =>
    apiRequest<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  login: (payload: LoginPayload) =>
    apiRequest<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  clearAuthStorage: () => {
    StorageService.remove(STORAGE_KEYS.TOKEN);
    StorageService.remove(STORAGE_KEYS.USER);
    StorageService.remove(STORAGE_KEYS.ROLE);
    StorageService.remove(STORAGE_KEYS.EMAIL);
    StorageService.remove(STORAGE_KEYS.NAME);
    StorageService.remove(STORAGE_KEYS.COMPANY_ID);
  },

  getRedirectPathByRole: (role?: string | number | null) => {
    const normalizedRole = normalizeRole(role);

    const roleRoutes: Record<string, string> = {
      super_admin: "/super-admin/dashboard",
      superadmin: "/super-admin/dashboard",
      system_admin: "/super-admin/dashboard",

      admin: "/company-admin/dashboard",
      company_admin: "/company-admin/dashboard",
      companyadmin: "/company-admin/dashboard",

      operator: "/operator/dashboard",
      planner: "/operator/dashboard",

      supervisor: "/supervisor/dashboard",

      mechanic: "/mechanic/dashboard",

      artisans: "/artisans/dashboard",
      artisuns: "/artisans/dashboard",

      viewer: "/viewer/dashboard",
    };

    return roleRoutes[normalizedRole] || null;
  },

  getApiErrorMessage: (error: unknown) => {
    const rawMessage = getSanitizedErrorMessage(error, "Invalid email or password");
    return translateError(rawMessage);
  },
};
