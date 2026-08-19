import { z } from "zod";

export const equipmentTypeSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Name must be at least 3 characters long")
    .max(50, "Name cannot exceed 50 characters"),
  description: z
    .string()
    .trim()
    .max(250, "Description cannot exceed 250 characters")
    .optional(),
  icon: z.string().optional(),
});

export const componentCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Name must be at least 3 characters long")
    .max(50, "Name cannot exceed 50 characters"),
  description: z
    .string()
    .trim()
    .max(250, "Description cannot exceed 250 characters")
    .optional(),
});

export type EquipmentTypeSchemaInput = z.infer<typeof equipmentTypeSchema>;
export type ComponentCategorySchemaInput = z.infer<typeof componentCategorySchema>;
