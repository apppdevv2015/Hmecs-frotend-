import { apiRequest } from "./api";

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
};