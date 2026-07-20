export type OperatorMachine = {
  id: string;
  name: string;
  model: string;
  serialNumber: string;
  status: "Running" | "Idle" | "Maintenance" | "Issue";
  healthScore: number;
  runningHours: number;
  lastUpdated: string;
};

export type OperatorTask = {
  id: string;
  title: string;
  machine: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  status: "Pending" | "In Progress" | "Completed";
  dueDate: string;
};

export type RunningLog = {
  id: string;
  machine: string;
  shift: string;
  startHours: number;
  endHours: number;
  fuelUsed: string;
  remarks: string;
};

export const operatorMachines: OperatorMachine[] = [
  {
    id: "M-001",
    name: "CAT 990H Loader",
    model: "990H",
    serialNumber: "SN-990-001",
    status: "Running",
    healthScore: 86,
    runningHours: 4920,
    lastUpdated: "Today, 10:30 AM",
  },
  {
    id: "M-002",
    name: "CAT 404 Backhoe",
    model: "CAT 404",
    serialNumber: "SN-404-784",
    status: "Idle",
    healthScore: 74,
    runningHours: 3180,
    lastUpdated: "Today, 09:15 AM",
  },
  {
    id: "M-003",
    name: "Volvo Excavator",
    model: "EC220",
    serialNumber: "SN-EC-220",
    status: "Issue",
    healthScore: 58,
    runningHours: 6100,
    lastUpdated: "Yesterday, 06:40 PM",
  },
];

export const operatorTasks: OperatorTask[] = [
  {
    id: "T-001",
    title: "Check tyre pressure",
    machine: "CAT 990H Loader",
    priority: "Medium",
    status: "Pending",
    dueDate: "Today",
  },
  {
    id: "T-002",
    title: "Update running hours",
    machine: "CAT 404 Backhoe",
    priority: "Low",
    status: "In Progress",
    dueDate: "Today",
  },
  {
    id: "T-003",
    title: "Report hydraulic leakage",
    machine: "Volvo Excavator",
    priority: "Critical",
    status: "Pending",
    dueDate: "Today",
  },
];

export const runningLogs: RunningLog[] = [
  {
    id: "R-001",
    machine: "CAT 990H Loader",
    shift: "Morning",
    startHours: 4880,
    endHours: 4920,
    fuelUsed: "46 L",
    remarks: "Machine running normal",
  },
  {
    id: "R-002",
    machine: "CAT 404 Backhoe",
    shift: "Afternoon",
    startHours: 3150,
    endHours: 3180,
    fuelUsed: "28 L",
    remarks: "No major issue observed",
  },
];

export const checklistItems = [
  "Engine oil checked",
  "Tyre condition checked",
  "Hydraulic leakage checked",
  "Brake working checked",
  "Fuel level checked",
  "Noise or vibration checked",
];