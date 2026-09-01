import { z } from "zod";

// ---------------------------------------------------------------------------
// Common, reusable validation primitives.
//
// IMPORTANT DISTINCTION (read before adding to this file):
// These are client-side, keystroke-level UX messages ("this field is
// required", "enter a valid email"). They are NOT server/API response
// messages — those must always come from the backend as-is and are never
// defined here or anywhere in the frontend. This file only exists so every
// form in the app validates emails/phones/passwords the same way instead of
// re-writing the same regex in five places.
// ---------------------------------------------------------------------------

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Please enter a valid email address");

// 10-digit Indian mobile number, matches what PhoneField (defaultCountry="IN") produces.
export const phoneSchema = z
  .string()
  .trim()
  .min(1, "Phone number is required")
  .regex(/^[6-9]\d{9}$/, "Please enter a valid 10 digit phone number");

// NOTE: intentionally NOT trimmed. Trimming a password silently changes the
// value the user typed and can lock them out of an account they created
// with leading/trailing spaces. Only the raw value the user typed should
// ever be sent or validated.
export const passwordSchema = z
  .string()
  .min(1, "Password is required")
  .min(8, "Password must be at least 8 characters")
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/,
    "Password must contain uppercase, lowercase, number and special character",
  );

/** Generic "this field is required" string schema, reusable across forms. */
export function requiredString(fieldLabel: string, minLength = 1) {
  return z
    .string()
    .trim()
    .min(1, `${fieldLabel} is required`)
    .min(minLength, `${fieldLabel} must be at least ${minLength} characters`);
}

/** Generic "please select an option" schema for select/dropdown fields. */
export function requiredSelect(fieldLabel: string) {
  return z.string().min(1, `Please select ${fieldLabel}`);
}

/** Whole positive number entered as text (e.g. "Number of machines"). */
export function requiredPositiveIntegerString(fieldLabel: string) {
  return z
    .string()
    .trim()
    .min(1, `${fieldLabel} is required`)
    .regex(/^\d+$/, "Enter a valid whole number")
    .refine((value) => Number(value) > 0, `${fieldLabel} must be at least 1`);
}

/**
 * File validation built dynamically from backend-provided constraints —
 * there is no hardcoded size limit or file-type list anywhere in the app.
 * Call this once the relevant config has been fetched.
 */
export function buildFileSchema(opts: {
  allowedTypes: string[];
  maxSizeMB: number;
  fieldLabel?: string;
}) {
  const { allowedTypes, maxSizeMB, fieldLabel = "File" } = opts;

  return z
    .instanceof(File)
    .optional()
    .refine(
      (file) => !file || allowedTypes.includes(file.type),
      `${fieldLabel} type not allowed`,
    )
    .refine(
      (file) => !file || file.size <= maxSizeMB * 1024 * 1024,
      `${fieldLabel} must be under ${maxSizeMB}MB`,
    );
}