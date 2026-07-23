export type UserRole =
  | "super_admin"
  | "company_admin"
  | "operator"
  | "Artisans";

export type ComponentHealthStatus = "ok" | "warn" | "critical";

export interface FleetComponent {
  status: ComponentHealthStatus;
  health: number;
}

export interface FleetMachine {
  machineId: string;
  machineName: string;

  company: {
    companyId: string;
    companyName: string;
  };

  fleetId: string;

  operator: {
    operatorId: string;
    name: string;
  };

  location: string;
  machineType: string;

  healthPercent: number;

  status: "Healthy" | "Warning" | "Critical";

  lastSeen: string;

  hoursRun: number;
  fuelLevel: number;

  components: {
    tyre: FleetComponent;
    engine: FleetComponent;
    hydraulic: FleetComponent;
    transmission: FleetComponent;
  };

  maintenanceHistory: any[];
}

/* ==========================================================
   DUMMY DATA
========================================================== */

const DUMMY_FLEET_DATA: FleetMachine[] = [
  {
    machineId: "FLT-1001",
    machineName: "CAT 320D",

    company: {
      companyId: "CMP-01",
      companyName: "Tata Mining",
    },

    fleetId: "FL-223",

    operator: {
      operatorId: "OP-01",
      name: "Rahul Sharma",
    },

    location: "Delhi Site A",
    machineType: "Excavator",

    healthPercent: 92,
    status: "Healthy",

    lastSeen: "2026-06-11T10:30:00Z",

    hoursRun: 1250,
    fuelLevel: 78,

    components: {
      tyre: {
        status: "ok",
        health: 86,
      },

      engine: {
        status: "ok",
        health: 88,
      },

      hydraulic: {
        status: "warn",
        health: 63,
      },

      transmission: {
        status: "ok",
        health: 78,
      },
    },

    maintenanceHistory: [],
  },

  {
    machineId: "FLT-1002",
    machineName: "Komatsu PC210",

    company: {
      companyId: "CMP-02",
      companyName: "L&T Construction",
    },

    fleetId: "FL-224",

    operator: {
      operatorId: "OP-02",
      name: "Amit Kumar",
    },

    location: "Mumbai Project",
    machineType: "Excavator",

    healthPercent: 85,
    status: "Healthy",

    lastSeen: "2026-06-11T09:50:00Z",

    hoursRun: 1450,
    fuelLevel: 70,

    components: {
      tyre: {
        status: "ok",
        health: 82,
      },

      engine: {
        status: "ok",
        health: 90,
      },

      hydraulic: {
        status: "ok",
        health: 80,
      },

      transmission: {
        status: "ok",
        health: 84,
      },
    },

    maintenanceHistory: [],
  },

  {
    machineId: "FLT-1003",
    machineName: "Volvo EC950",

    company: {
      companyId: "CMP-01",
      companyName: "Tata Mining",
    },

    fleetId: "FL-225",

    operator: {
      operatorId: "OP-03",
      name: "Ravi Singh",
    },

    location: "Noida Sector 63",

    machineType: "Excavator",

    healthPercent: 67,
    status: "Warning",

    lastSeen: "2026-06-11T08:20:00Z",

    hoursRun: 2230,
    fuelLevel: 56,

    components: {
      tyre: {
        status: "warn",
        health: 66,
      },

      engine: {
        status: "ok",
        health: 74,
      },

      hydraulic: {
        status: "warn",
        health: 58,
      },

      transmission: {
        status: "ok",
        health: 71,
      },
    },

    maintenanceHistory: [],
  },

  {
    machineId: "FLT-1004",
    machineName: "JCB 3DX",

    company: {
      companyId: "CMP-03",
      companyName: "ABC Infra",
    },

    fleetId: "FL-226",

    operator: {
      operatorId: "OP-04",
      name: "Suresh Yadav",
    },

    location: "Jaipur Plant",

    machineType: "Backhoe Loader",

    healthPercent: 58,
    status: "Warning",

    lastSeen: "2026-06-11T07:10:00Z",

    hoursRun: 1920,
    fuelLevel: 44,

    components: {
      tyre: {
        status: "warn",
        health: 54,
      },

      engine: {
        status: "warn",
        health: 61,
      },

      hydraulic: {
        status: "warn",
        health: 59,
      },

      transmission: {
        status: "ok",
        health: 64,
      },
    },

    maintenanceHistory: [],
  },

  {
    machineId: "FLT-1005",
    machineName: "CAT D8 Dozer",

    company: {
      companyId: "CMP-04",
      companyName: "Mega Infra",
    },

    fleetId: "FL-227",

    operator: {
      operatorId: "OP-05",
      name: "Deepak Verma",
    },

    location: "Lucknow Highway",

    machineType: "Dozer",

    healthPercent: 32,
    status: "Critical",

    lastSeen: "2026-06-11T06:15:00Z",

    hoursRun: 4890,
    fuelLevel: 19,

    components: {
      tyre: {
        status: "critical",
        health: 30,
      },

      engine: {
        status: "critical",
        health: 35,
      },

      hydraulic: {
        status: "warn",
        health: 41,
      },

      transmission: {
        status: "critical",
        health: 33,
      },
    },

    maintenanceHistory: [],
  },
];

/* ==========================================================
   SERVICE
========================================================== */

export const fleetService = {
  async getFleetMachines(
    role: UserRole = "super_admin",
    companyId?: string,
    operatorId?: string,
  ): Promise<FleetMachine[]> {
    await new Promise((resolve) => setTimeout(resolve, 500));

    let data = DUMMY_FLEET_DATA;

    if (role === "company_admin" && companyId) {
      data = data.filter((machine) => machine.company.companyId === companyId);
    }

    if (role === "operator" && operatorId) {
      data = data.filter(
        (machine) => machine.operator.operatorId === operatorId,
      );
    }

    return data;
  },

  async getMachineById(machineId: string) {
    const machines = await this.getFleetMachines();

    return machines.find((machine) => machine.machineId === machineId) ?? null;
  },

  async getFleetStats() {
    const machines = await this.getFleetMachines();

    return {
      totalMachines: machines.length,

      healthy: machines.filter((m) => m.status === "Healthy").length,

      maintenance: machines.filter((m) => m.status === "Warning").length,

      critical: machines.filter((m) => m.status === "Critical").length,
    };
  },
};
