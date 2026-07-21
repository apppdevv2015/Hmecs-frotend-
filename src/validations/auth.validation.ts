import { z } from "zod";
import { AUTH_ERRORS } from "../errors/auth.errors";

export const signInSchema = z.object({
  email: z.string().trim().min(1, AUTH_ERRORS.emailRequired).email(AUTH_ERRORS.invalidEmail),

  password: z.string().min(1, AUTH_ERRORS.passwordRequired),
});

export const signUpSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, AUTH_ERRORS.firstNameRequired)
    .min(2, AUTH_ERRORS.firstNameMinLength),

  lastName: z.string().trim().min(1, AUTH_ERRORS.lastNameRequired),

  companyName: z.string().trim().min(1, AUTH_ERRORS.companyNameRequired),

  phone: z
    .string()
    .trim()
    .min(1, AUTH_ERRORS.phoneRequired)
    .regex(/^[6-9]\d{9}$/, AUTH_ERRORS.invalidPhone),

  email: z.string().trim().min(1, AUTH_ERRORS.emailRequired).email(AUTH_ERRORS.invalidEmail),

  password: z
    .string()
    .trim()
    .min(1, AUTH_ERRORS.passwordRequired)
    .min(8, AUTH_ERRORS.passwordTooShort)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/,
      AUTH_ERRORS.passwordRequirements,
    ),
});
