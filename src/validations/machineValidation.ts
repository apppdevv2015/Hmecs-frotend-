import { z } from "zod";

export const machineSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Machine name is required")
    .max(50, "Machine name cannot exceed 50 characters"),

  manufacturer: z
    .string()
    .trim()
    .min(1, "Manufacturer is required")
    .max(50, "Manufacturer cannot exceed 50 characters"),

  model: z
    .string()
    .trim()
    .min(1, "Model is required")
    .max(30, "Model cannot exceed 30 characters"),

  serialNumber: z
    .string()
    .trim()
    .min(1, "Serial number is required")
    .max(50, "Serial number cannot exceed 50 characters"),

  equipmentType: z
    .string()
    .trim()
    .min(1, "Equipment type is required")
    .max(30, "Equipment type cannot exceed 30 characters"),

  imageUrl: z.string().optional(),
});

export const validateMachineForm = (
  formData: Record<string, any>,
  existingMachines: { id?: string; serialNumber?: string }[] = [],
  editMachineId?: string | null
) => {
  const result = machineSchema.safeParse(formData);
  const errors: Record<string, string> = {};

  if (!result.success) {
    result.error.issues.forEach((issue) => {
      const key = String(issue.path[0] || "");
      if (key) {
        errors[key] = issue.message;
      }
    });
  }

  if (formData.serialNumber && String(formData.serialNumber).trim()) {
    const trimmedSerial = String(formData.serialNumber).trim().toLowerCase();
    const isDuplicate = existingMachines.some(
      (m) =>
        m.serialNumber &&
        m.serialNumber.toLowerCase() === trimmedSerial &&
        (!editMachineId || m.id !== editMachineId)
    );
    if (isDuplicate) {
      errors.serialNumber = "Serial number already exists in your fleet.";
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};
