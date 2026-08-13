import { machineService } from "./companyadmin/machineService";

export type ComponentStatus = "Good" | "Warning" | "Critical";

export type EngineerComponent = {
  id: string;
  name: "Engine" | "Tyre" | "Suspension" | "Hydraulics";
  health: number;
  status: ComponentStatus;
  readingLabel: string;
  readingValue: string;
  issue: string;
  recommendation: string;
  updatedAt?: string;
};

export type EngineerMachine = {
  id: string;
  machineId: string;
  name: string;
  type: string;
  location: string;
  overallHealth: number;
  status: ComponentStatus;
  components: EngineerComponent[];
};

const mockMachines: EngineerMachine[] = [
  {
    id: "machine-1",
    machineId: "MCH-001",
    name: "CAT 777D",
    type: "Dump Truck",
    location: "Main Mining Site",
    overallHealth: 72,
    status: "Warning",
    components: [
      {
        id: "engine-1",
        name: "Engine",
        health: 62,
        status: "Warning",
        readingLabel: "Coolant Temp",
        readingValue: "98°C",
        issue: "High temperature detected",
        recommendation: "Check coolant level, radiator airflow and engine load.",
      },
      {
        id: "tyre-1",
        name: "Tyre",
        health: 48,
        status: "Critical",
        readingLabel: "Avg Pressure",
        readingValue: "32 PSI",
        issue: "Low tyre pressure",
        recommendation: "Inspect tyre pressure and tyre wear immediately.",
      },
      {
        id: "suspension-1",
        name: "Suspension",
        health: 70,
        status: "Warning",
        readingLabel: "Vibration",
        readingValue: "Medium",
        issue: "Vibration detected",
        recommendation: "Inspect shock absorbers, mounts and vibration logs.",
      },
      {
        id: "hydraulics-1",
        name: "Hydraulics",
        health: 81,
        status: "Good",
        readingLabel: "Pressure",
        readingValue: "210 bar",
        issue: "System operating normal",
        recommendation: "Continue normal monitoring during scheduled service.",
      },
    ],
  },
  {
    id: "machine-2",
    machineId: "MCH-002",
    name: "Komatsu HD785",
    type: "Dump Truck",
    location: "North Quarry Zone",
    overallHealth: 84,
    status: "Good",
    components: [
      {
        id: "engine-2",
        name: "Engine",
        health: 86,
        status: "Good",
        readingLabel: "Coolant Temp",
        readingValue: "82°C",
        issue: "Normal temperature",
        recommendation: "Engine condition is stable. Continue routine checks.",
      },
      {
        id: "tyre-2",
        name: "Tyre",
        health: 80,
        status: "Good",
        readingLabel: "Avg Pressure",
        readingValue: "46 PSI",
        issue: "Pressure normal",
        recommendation: "Tyre pressure is stable. Continue normal inspection cycle.",
      },
      {
        id: "suspension-2",
        name: "Suspension",
        health: 82,
        status: "Good",
        readingLabel: "Vibration",
        readingValue: "Low",
        issue: "Shock condition good",
        recommendation: "Suspension condition is good. No urgent action needed.",
      },
      {
        id: "hydraulics-2",
        name: "Hydraulics",
        health: 88,
        status: "Good",
        readingLabel: "Pressure",
        readingValue: "225 bar",
        issue: "System stable",
        recommendation: "Hydraulic pressure is within normal range.",
      },
    ],
  },
  {
    id: "machine-3",
    machineId: "MCH-003",
    name: "CAT 740B",
    type: "Articulated Truck",
    location: "East Pit Area",
    overallHealth: 49,
    status: "Critical",
    components: [
      {
        id: "engine-3",
        name: "Engine",
        health: 55,
        status: "Warning",
        readingLabel: "Engine Load",
        readingValue: "78%",
        issue: "Engine load high",
        recommendation: "Reduce load and inspect engine performance data.",
      },
      {
        id: "tyre-3",
        name: "Tyre",
        health: 35,
        status: "Critical",
        readingLabel: "Tyre Wear",
        readingValue: "82%",
        issue: "Tyre wear critical",
        recommendation: "Schedule immediate tyre replacement or inspection.",
      },
      {
        id: "suspension-3",
        name: "Suspension",
        health: 44,
        status: "Critical",
        readingLabel: "Vibration",
        readingValue: "High",
        issue: "High vibration",
        recommendation: "Inspect suspension joints, mounts and shock absorbers.",
      },
      {
        id: "hydraulics-3",
        name: "Hydraulics",
        health: 52,
        status: "Warning",
        readingLabel: "Pressure",
        readingValue: "175 bar",
        issue: "Pressure slightly low",
        recommendation: "Check leakage, pump performance and hydraulic oil level.",
      },
    ],
  },
];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const engineerComponentService = {
  getMachines: async (): Promise<EngineerMachine[]> => {
    try {
      const dbMachinesRes = await machineService.getMachines();
      const dbMachines = Array.isArray(dbMachinesRes)
        ? dbMachinesRes
        : (dbMachinesRes as any).data || (dbMachinesRes as any).machines || [];

      if (!dbMachines || dbMachines.length === 0) {
        return [];
      }

      return dbMachines.map((m: any) => {
        // Map database machine components to EngineerComponent
        const components: EngineerComponent[] = (m.components || []).map((c: any) => {
          let name: "Engine" | "Tyre" | "Suspension" | "Hydraulics" = "Engine";
          const cat = (c.category || "").toLowerCase();
          if (cat.includes("tyre")) name = "Tyre";
          else if (cat.includes("hydraulics")) name = "Hydraulics";
          else if (cat.includes("suspension")) name = "Suspension";

          // condition: 1-New, 2-Good, 3-Monitor, 4-Warning, 5-Critical
          let status: ComponentStatus = "Good";
          let health = 100;
          if (c.condition === 5) {
            status = "Critical";
            health = 35;
          } else if (c.condition === 4) {
            status = "Warning";
            health = 60;
          } else if (c.condition === 3) {
            status = "Warning";
            health = 75;
          } else {
            status = "Good";
            health = 92;
          }

          // Dynamic reading labels & values
          let readingLabel = "Operating Temp";
          let readingValue = "82°C";
          let issue = "Normal temperature";
          let recommendation = "Engine condition is stable. Continue routine checks.";

          if (name === "Engine") {
            readingLabel = "Coolant Temp";
            if (status === "Critical") {
              readingValue = "118°C";
              issue = "Critical overheating detected!";
              recommendation =
                "Shut down engine immediately. Inspect cooling system and water pump.";
            } else if (status === "Warning") {
              readingValue = "98°C";
              issue = "High temperature detected";
              recommendation = "Check coolant level, radiator airflow and engine load.";
            } else {
              readingValue = "82°C";
              issue = "System operating normal";
              recommendation = "Continue normal monitoring during scheduled service.";
            }
          } else if (name === "Tyre") {
            readingLabel = "Avg Pressure";
            if (status === "Critical") {
              readingValue = "18 PSI";
              issue = "Critical low pressure detected!";
              recommendation = "Stop machine immediately. Inspect tyre for punctures or deep cuts.";
            } else if (status === "Warning") {
              readingValue = "32 PSI";
              issue = "Low tyre pressure";
              recommendation = "Inspect tyre pressure and tyre wear immediately.";
            } else {
              readingValue = "45 PSI";
              issue = "System operating normal";
              recommendation = "Continue normal monitoring during scheduled service.";
            }
          } else if (name === "Suspension") {
            readingLabel = "Vibration Level";
            if (status === "Critical") {
              readingValue = "High";
              issue = "Critical vibration detected!";
              recommendation = "Perform immediate structural suspension alignment inspection.";
            } else if (status === "Warning") {
              readingValue = "Medium";
              issue = "High vibration detected";
              recommendation = "Inspect shock absorbers, mounts and vibration logs.";
            } else {
              readingValue = "Low";
              issue = "System operating normal";
              recommendation = "Continue normal monitoring during scheduled service.";
            }
          } else if (name === "Hydraulics") {
            readingLabel = "System Pressure";
            if (status === "Critical") {
              readingValue = "120 bar";
              issue = "Hydraulic pressure dropped below critical threshold!";
              recommendation =
                "Shut down hydraulic pump. Inspect for major leaks or valve malfunction.";
            } else if (status === "Warning") {
              readingValue = "175 bar";
              issue = "Pressure slightly low";
              recommendation = "Check leakage, pump performance and hydraulic oil level.";
            } else {
              readingValue = "210 bar";
              issue = "System operating normal";
              recommendation = "Continue normal monitoring during scheduled service.";
            }
          }

          return {
            id: c.id,
            name,
            health,
            status,
            readingLabel,
            readingValue,
            issue,
            recommendation,
            updatedAt: c.updatedAt,
          };
        });

        // Determine machine status based on worst component status
        let machineStatus: ComponentStatus = "Good";
        if (components.some((c) => c.status === "Critical")) machineStatus = "Critical";
        else if (components.some((c) => c.status === "Warning")) machineStatus = "Warning";

        // Determine overall health as average of component healths
        const overallHealth =
          components.length > 0
            ? Math.round(components.reduce((sum, c) => sum + c.health, 0) / components.length)
            : 90;

        return {
          id: m.id,
          machineId: m.serialNumber || `MCH-${m.id.slice(0, 4).toUpperCase()}`,
          name: m.name,
          type: m.model || "Dump Truck",
          location: m.site || "Main Mining Site",
          overallHealth,
          status: machineStatus,
          components,
        };
      });
    } catch (err) {
      console.error("Failed to load engineer machines", err);
      return mockMachines;
    }
  },

  getMachineComponents: async (machineId: string): Promise<EngineerComponent[]> => {
    try {
      const machines = await engineerComponentService.getMachines();
      const machine = machines.find(
        (item) => item.id === machineId || item.machineId === machineId,
      );
      return machine?.components || [];
    } catch {
      return [];
    }
  },
};
