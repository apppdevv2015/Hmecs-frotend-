export interface ServiceLogFormData {
  machineId: string;
  machineName: string;
  site: string;
  component: string;
  serviceType: string;
  engineerId: string;
  artisanName: string;
  artisanRole: string;
  assignedBy: string;
  serviceDate: string;
  nextServiceDate: string;
  runtimeHours: number;
  status: string;
  priority: string;
  issueFound: string;
  actionTaken: string;
  remarks: string;
}

export const validateServiceLogForm = (formData: ServiceLogFormData): string | null => {
  if (!formData.machineId) return "Machine selection is required";
  if (!formData.component.trim()) return "Component name is required";
  if (!formData.serviceType.trim()) return "Service type is required";
  if (!formData.serviceDate) return "Service date is required";
  if (!formData.nextServiceDate) return "Next service date is required";
  if (!formData.issueFound.trim()) return "Issue description is required";
  if (!formData.actionTaken.trim()) return "Action taken details are required";
  return null;
};
