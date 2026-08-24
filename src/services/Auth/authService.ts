import { apiRequest } from "../api";

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

export type ForgotPasswordPayload = {
  email: string;
};

export type ResetPasswordPayload = {
  email?: string;
  token?: string;
  otp?: string;
  newPassword?: string;
  password?: string;
};

export type VerifyResetTokenPayload = {
  token?: string;
  email?: string;
  otp?: string;
};

export type AuthResponse = {
  success?: boolean;
  message?: string;
  token?: string;
  otp?: string;
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

    getMe: () =>
    apiRequest<AuthResponse>("/auth/me", {
      method: "GET",
    }),

  forgotPassword: (payload: ForgotPasswordPayload) =>
    apiRequest<AuthResponse>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  verifyResetToken: (payload: VerifyResetTokenPayload) =>
    apiRequest<AuthResponse>("/auth/verify-reset-token", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  resetPassword: (payload: ResetPasswordPayload) =>
    apiRequest<AuthResponse>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

    
};


