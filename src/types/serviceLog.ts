export type ServiceLogStatus = "Completed" | "Pending" | "In Progress";
export type ServiceLogPriority = "Low" | "Medium" | "High" | "Critical";

export type ServiceLog = {
  id: string;
  machineId: string;
  machineName: string;
  site: string;
  component: string;
  serviceType: string;
  engineerName: string;
  serviceDate: string;
  nextServiceDate: string;
  runtimeHours: number;
  status: ServiceLogStatus;
  priority: ServiceLogPriority;
  issueFound: string;
  actionTaken: string;
  remarks: string;
  createdAt: string;
};