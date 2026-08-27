import { z } from "zod";

/**
 * Company Admin - Add Staff Validation Schema
 */
export const addStaffSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "First name is required")
    .max(50, "First name cannot exceed 50 characters")
    .regex(/^[A-Za-z\s]+$/, "First name can contain only alphabets"),

  lastName: z
    .string()
    .trim()
    .min(1, "Last name is required")
    .max(50, "Last name cannot exceed 50 characters")
    .regex(/^[A-Za-z\s]+$/, "Last name can contain only alphabets"),

  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .max(100, "Email cannot exceed 100 characters")
    .email("Enter a valid email address"),

  password: z
    .string()
    .trim()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters")
    .max(30, "Password cannot exceed 30 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^#])[A-Za-z\d@$!%*?&^#]{8,30}$/,
      "Password must contain uppercase, lowercase, number and special character",
    ),

  mobileNumber: z
    .string()
    .trim()
    .min(1, "Phone number is required")
    .refine((val) => {
      const digitsOnly = val.replace(/\D/g, "");
      return digitsOnly.length >= 7 && digitsOnly.length <= 15;
    }, "Phone number must contain between 7 and 15 digits")
    .refine(
      (val) => /^\+?[0-9\s-]{7,20}$/.test(val),
      "Phone number can only contain digits and optional leading +",
    ),

  roleName: z.string().trim().min(1, "Role is required"),

  companyId: z.string().trim().min(1, "Company is required"),

  isActive: z.boolean().optional(),
});

/**
 * Company Admin - Edit Staff Validation Schema
 */
export const editStaffSchema = addStaffSchema.omit({ password: true }).extend({
  password: z.string().optional(),
});

export type AddStaffInput = z.infer<typeof addStaffSchema>;
export type EditStaffInput = z.infer<typeof editStaffSchema>;

/**
 * Component Management - Add/Edit Component Validation Schema
 */
export const componentSchema = z
  .object({
    machineId: z.string().trim().min(1, "Machine is required"),

    category: z.string().trim().optional(),

    customCategory: z
      .string()
      .trim()
      .max(50, "Custom category cannot exceed 50 characters"),

    name: z
      .string()
      .trim()
      .min(1, "Component name is required")
      .max(100, "Component name cannot exceed 100 characters"),

    description: z
      .string()
      .trim()
      .max(500, "Description cannot exceed 500 characters"),

    serialNumber: z
      .string()
      .trim()
      .min(1, "Serial number is required")
      .max(50, "Serial number cannot exceed 50 characters"),

    supplier: z
      .string()
      .trim()
      .min(1, "Supplier is required")
      .max(100, "Supplier cannot exceed 100 characters"),

    installHours: z
      .string()
      .trim()
      .min(1, "Install hours is required")
      .regex(/^\d+$/, "Install hours must contain only numbers"),

    currentHours: z
      .string()
      .trim()
      .min(1, "Current hours is required")
      .regex(/^\d+$/, "Current hours must contain only numbers"),

    plannedLife: z
      .string()
      .trim()
      .min(1, "Planned life is required")
      .regex(/^\d+$/, "Planned life must contain only numbers"),

    replacementCost: z.string().optional(),

    condition: z.string().trim().min(1, "Condition is required"),
  })
  .superRefine((data, ctx) => {
    if (data.category === "Custom" && data.customCategory.trim().length < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["customCategory"],
        message: "Custom category is required",
      });
    }

    const install = Number(data.installHours);
    const current = Number(data.currentHours);
    const planned = Number(data.plannedLife);
    const condition = Number(data.condition);

    if (current < install) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["currentHours"],
        message: "Current hours cannot be less than install hours",
      });
    }

    if (planned <= install) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["plannedLife"],
        message: "Planned life must be greater than install hours",
      });
    }

    if (condition < 1 || condition > 5) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["condition"],
        message: "Condition must be between 1 and 5",
      });
    }
  });

export type ComponentSchemaInput = z.infer<typeof componentSchema>;
