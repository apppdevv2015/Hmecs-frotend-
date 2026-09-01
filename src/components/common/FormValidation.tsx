import { z } from "zod";

// ----------------------------------------------------
// Shared Sign Up / Quotation Validation
// ----------------------------------------------------
// Keep all form validation rules in one place so the page
// only imports the schemas and does not contain validation logic.
// ----------------------------------------------------

export const MAX_ATTACHMENT_SIZE_MB = 10;

// ----------------------------------------------------
// Company Details Validation
// ----------------------------------------------------

export const companyDetailsSchema = z.object({
  companyName: z
    .string()
    .trim()
    .min(1, "Company name is required"),

  contactPerson: z
    .string()
    .trim()
    .min(1, "Contact person is required")
    .min(2, "Contact person must be at least 2 characters"),

  email: z
    .string()
    .trim()
    .min(1, "Company email is required")
    .email("Please enter a valid email address"),

  phone: z
    .string()
    .trim()
    .min(1, "Phone number is required")
    .regex(
      /^[6-9]\d{9}$/,
      "Please enter a valid 10 digit phone number",
    ),

  siteLocation: z
    .string()
    .trim()
    .min(1, "Site / Location is required"),

  password: z
    .string()
    .trim()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/,
      "Password must contain uppercase, lowercase, number and special character",
    ),
});

// ----------------------------------------------------
// Quotation Validation
// ----------------------------------------------------

export const quotationSchema = z.object({
  quotationType: z
    .string()
    .min(1, "Please select a quotation type"),
numberOfSites: z
  .string()
  .trim()
  .min(1, "Number of sites is required")
  .regex(/^[0-9]+$/, "Only numbers are allowed")
  .refine((value) => Number(value) > 0, "Number of sites must be at least 1"),

  siteNames: z
    .array(
      z.object({
        name: z
          .string()
          .trim()
          .min(1, "Site name is required"),
      }),
    )
    .min(1, "Add at least one site"),

  // Number of active machines
  // Must be a positive whole number.
  activeMachines: z
    .string()
    .trim()
    .min(1, "Number of active machines is required")
    .regex(
      /^[1-9]\d*$/,
      "Enter a valid whole number greater than 0",
    ),

  equipmentTypes: z
    .array(z.string())
    .min(1, "Select at least one equipment type"),

  contractDuration: z
    .string()
    .min(1, "Please select contract duration"),

  optionalServices: z
    .array(z.string())
    .optional(),

  implementationRequirements: z
    .string()
    .trim()
    .optional(),

  additionalRequirements: z
    .string()
    .trim()
    .optional(),

  attachment: z
    .instanceof(File)
    .optional()
    .refine(
      (file) => !file || file.type === "application/pdf",
      "Only PDF files are allowed",
    )
    .refine(
      (file) =>
        !file ||
        file.size <= MAX_ATTACHMENT_SIZE_MB * 1024 * 1024,
      `File must be under ${MAX_ATTACHMENT_SIZE_MB}MB`,
    ),
});

// ----------------------------------------------------
// Complete Sign Up Schema
// ----------------------------------------------------

export const signUpSchema =
  companyDetailsSchema.merge(quotationSchema);

// ----------------------------------------------------
// Form Type
// ----------------------------------------------------

export type SignUpFormData = z.infer<typeof signUpSchema>;

// ----------------------------------------------------
// Step 1 Validation Fields
// ----------------------------------------------------

export const STEP_ONE_FIELDS = [
  "companyName",
  "contactPerson",
  "email",
  "phone",
  "siteLocation",
  "password",
] as const;

// ----------------------------------------------------
// Step 2 Validation Fields
// ----------------------------------------------------

export const STEP_TWO_FIELDS = [
  "quotationType",
  "numberOfSites",
  "siteNames",
  "activeMachines",
  "equipmentTypes",
  "contractDuration",
] as const;

