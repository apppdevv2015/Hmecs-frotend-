import type { ServiceLog } from "../types/serviceLog";

const dummyServiceLogs: ServiceLog[] = [
  {
    id: "SL-001",
    machineId: "MCH-001",
    machineName: "CAT 777D Dump Truck",
    site: "Johannesburg Mining Site",
    component: "Engine",
    serviceType: "Preventive Maintenance",
    engineerName: "Daniel Mokoena",
    serviceDate: "2026-05-15",
    nextServiceDate: "2026-06-15",
    runtimeHours: 1240,
    status: "Completed",
    priority: "Medium",
    issueFound: "Engine oil level was low and filter required replacement.",
    actionTaken:
      "Changed engine oil, replaced oil filter and checked coolant level.",
    remarks: "Machine is running normally after service.",
    createdAt: "2026-05-15",
  },
  {
    id: "SL-002",
    machineId: "MCH-002",
    machineName: "Komatsu HD785",
    site: "Cape Town Quarry",
    component: "Hydraulics",
    serviceType: "Breakdown Service",
    engineerName: "Thabo Ndlovu",
    serviceDate: "2026-05-14",
    nextServiceDate: "2026-05-28",
    runtimeHours: 980,
    status: "In Progress",
    priority: "High",
    issueFound: "Hydraulic pressure drop detected during operation.",
    actionTaken:
      "Checked hydraulic pump and hoses. Further inspection required.",
    remarks: "Machine should be monitored before heavy usage.",
    createdAt: "2026-05-14",
  },
  {
    id: "SL-003",
    machineId: "MCH-003",
    machineName: "Liebherr T 264",
    site: "Durban Mining Zone",
    component: "Tyre",
    serviceType: "Inspection",
    engineerName: "Sipho Khumalo",
    serviceDate: "2026-05-13",
    nextServiceDate: "2026-05-20",
    runtimeHours: 760,
    status: "Pending",
    priority: "Critical",
    issueFound: "Rear tyre pressure is below safe operating range.",
    actionTaken: "Inspection scheduled. Tyre replacement may be required.",
    remarks: "Do not assign machine for high-load tasks.",
    createdAt: "2026-05-13",
  },
  {
    id: "SL-004",
    machineId: "MCH-004",
    machineName: "Volvo A40G",
    site: "Pretoria Site",
    component: "Suspension",
    serviceType: "Routine Check",
    engineerName: "Lerato Dlamini",
    serviceDate: "2026-05-12",
    nextServiceDate: "2026-06-12",
    runtimeHours: 1460,
    status: "Completed",
    priority: "Low",
    issueFound: "Minor suspension noise found.",
    actionTaken: "Lubricated suspension joints and checked shock absorbers.",
    remarks: "No critical issue found.",
    createdAt: "2026-05-12",
  },
];

export const serviceLogService = {
  async getServiceLogs(): Promise<ServiceLog[]> {
    return Promise.resolve(dummyServiceLogs);
  },

  async createServiceLog(
    payload: Omit<ServiceLog, "id" | "createdAt">
  ): Promise<ServiceLog> {
    const newServiceLog: ServiceLog = {
      ...payload,
      id: `SL-${Date.now()}`,
      createdAt: new Date().toISOString().split("T")[0],
    };

    return Promise.resolve(newServiceLog);
  },

  async updateServiceLog(
    id: string,
    payload: Partial<ServiceLog>
  ): Promise<ServiceLog> {
    const existingLog = dummyServiceLogs.find((log) => log.id === id);

    const updatedLog: ServiceLog = {
      ...(existingLog || dummyServiceLogs[0]),
      ...payload,
      id,
    };

    return Promise.resolve(updatedLog);
  },

  async deleteServiceLog(id: string): Promise<{ success: boolean; id: string }> {
    return Promise.resolve({
      success: true,
      id,
    });
  },
};