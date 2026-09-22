import { machineService } from "../companyadmin/machineService";

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
   SERVICE
========================================================== */

export const fleetService = {
  async getFleetMachines(
    role: UserRole = "super_admin",
    companyId?: string,
    operatorId?: string,
  ): Promise<FleetMachine[]> {
    try {
      const targetCompanyId =
        companyId && companyId !== "all" ? companyId : undefined;
      const res: any = await machineService.getMachines(targetCompanyId);
      const raw = Array.isArray(res)
        ? res
        : Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res?.machines)
            ? res.machines
            : [];

      if (Array.isArray(raw) && raw.length > 0) {
        const liveFleet: FleetMachine[] = raw.map((item: any, idx: number) => {
          const mId = item.id || item._id || item.machineId || `m_${idx}`;
          const mName = item.name || item.model || `Machine #${idx + 1}`;
          const compId =
            item.companyId ||
            item.company_id ||
            item.company?.id ||
            item.company?.companyId ||
            "";
          const compName =
            item.companyName ||
            item.company_name ||
            item.company?.name ||
            item.company?.companyName ||
            "N/A";
          const fId = item.serialNumber || `FL-${220 + idx}`;
          const opName =
            item.assignedOperatorName ||
            item.assigned_operator_name ||
            item.operatorName ||
            item.assignedOperator ||
            (item.operator?.name && item.operator.name !== "N/A"
              ? item.operator.name
              : "");
          const loc = item.site || item.location || "N/A";

          let tyreHealth: number | null = null;
          let engineHealth: number | null = null;
          let hydraulicHealth: number | null = null;
          let suspensionHealth: number | null = null;

          if (Array.isArray(item.components)) {
            item.components.forEach((c: any) => {
              const name = String(
                c.category || c.name || c.component_type || "",
              ).toLowerCase();
              let val = Number(c.health ?? c.health_percentage ?? 0);
              if (!val && c.condition) {
                const cond = Number(c.condition);
                val = Math.max(0, Math.min(100, Math.round((6 - cond) * 20)));
              }
              if (name.includes("tyre") || name.includes("tire"))
                tyreHealth = val;
              else if (name.includes("engine")) engineHealth = val;
              else if (name.includes("hydraulic")) hydraulicHealth = val;
              else if (
                name.includes("suspension") ||
                name.includes("transmission")
              )
                suspensionHealth = val;
            });
          }

          const rawHealthVals: (number | null)[] = [
            tyreHealth,
            engineHealth,
            hydraulicHealth,
            suspensionHealth,
          ];
          const healthVals: number[] = rawHealthVals.filter(
            (v): v is number => v !== null && !isNaN(v),
          );
          const avgHealth =
            healthVals.length > 0
              ? Math.round(
                  healthVals.reduce((a: number, b: number) => a + b, 0) /
                    healthVals.length,
                )
              : 85;

          const status =
            avgHealth < 60
              ? "Critical"
              : avgHealth < 75
                ? "Warning"
                : "Healthy";

          const getCompStatus = (h: number | null): ComponentHealthStatus => {
            if (h === null) return "ok";
            if (h < 60) return "critical";
            if (h < 75) return "warn";
            return "ok";
          };

          return {
            machineId: mId,
            machineName: mName,
            company: {
              companyId: compId,
              companyName: compName,
            },
            fleetId: fId,
            operator: {
              operatorId: `op_${idx}`,
              name: opName,
            },
            location: loc,
            machineType: item.equipmentType || "Heavy Haulage",
            healthPercent: avgHealth,
            status,
            lastSeen: item.updatedAt
              ? new Date(item.updatedAt).toLocaleDateString()
              : "Just now",
            hoursRun: Number(item.hoursRun || 0),
            fuelLevel: 85,
            components: {
              tyre: {
                status: getCompStatus(tyreHealth),
                health: tyreHealth ?? 85,
              },
              engine: {
                status: getCompStatus(engineHealth),
                health: engineHealth ?? 88,
              },
              hydraulic: {
                status: getCompStatus(hydraulicHealth),
                health: hydraulicHealth ?? 75,
              },
              transmission: {
                status: getCompStatus(suspensionHealth),
                health: suspensionHealth ?? 80,
              },
            },
            maintenanceHistory: [],
          };
        });

        let result = liveFleet;
        if (targetCompanyId) {
          result = result.filter(
            (m) =>
              m.company.companyId === targetCompanyId ||
              String((m as any).companyId) === String(targetCompanyId) ||
              (m.company.companyName &&
                targetCompanyId &&
                m.company.companyName
                  .toLowerCase()
                  .includes(targetCompanyId.toLowerCase())),
          );
        }
        return result;
      }
      return [];
    } catch (e) {
      console.warn("Live fleet API fetch error:", e);
      return [];
    }
  },

  async getMachineById(machineId: string) {
    const machines = await this.getFleetMachines();

    return machines.find((machine) => machine.machineId === machineId) ?? null;
  },

  async getFleetStats(companyId?: string) {
    const machines = await this.getFleetMachines("super_admin", companyId);

    return {
      totalMachines: machines.length,

      healthy: machines.filter((m) => m.status === "Healthy").length,

      maintenance: machines.filter((m) => m.status === "Warning").length,

      critical: machines.filter((m) => m.status === "Critical").length,
    };
  },

  async getAllMachines() {
    return this.getFleetMachines("super_admin");
  },
};
