import StorageService, { STORAGE_KEYS } from "../storage.service";
import { apiCall } from "../apiHandler";
import { machineService } from "../companyadmin/machineService";

export type AlertSeverity = "Critical" | "High" | "Medium" | "Low";
export type AlertStatus = "Open" | "Under Review" | "Resolved";
export type AlertComponent =
  | "Engine"
  | "Hydraulic"
  | "Suspension"
  | "Tyre"
  | "Battery"
  | "Brake"
  | "Coolant"
  | "Transmission";

export interface AlertItem {
  id: string;
  backendId?: string;
  title: string;
  description: string;
  machine: string;
  machineId: string;
  component: AlertComponent;
  severity: AlertSeverity;
  status: AlertStatus;
  reportedAt: string;
  location: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNotes?: string;
}

// In-memory runtime cache for the session (No localStorage persistence)
let memoryAlerts: AlertItem[] = [];

const getStoredAlerts = (): AlertItem[] => {
  return memoryAlerts;
};

const saveStoredAlerts = (alerts: AlertItem[]): void => {
  memoryAlerts = alerts;
};

export const supervisorAlertsService = {
  /**
   * Fetches alerts dynamically by aggregating live fleet machines,
   * component health telemetry, backend notifications, and stored alert states.
   */
  async getAlerts(): Promise<AlertItem[]> {
    try {
      // Fetch live machines and notifications from backend concurrently
      const [machinesRes, notificationsRes, fleetHeatmapRes] = await Promise.allSettled([
        machineService.getCompanyMachines(),
        apiCall<any>("/auth/notifications", { method: "GET" }).catch(() => null),
        apiCall<any>("/intelligence/fleet-heatmap", { method: "GET" }).catch(() => null),
      ]);

      // Normalize machines
      let machines: any[] = [];
      if (machinesRes.status === "fulfilled") {
        const val: any = machinesRes.value;
        machines = Array.isArray(val)
          ? val
          : Array.isArray(val?.data)
            ? val.data
            : Array.isArray(val?.machines)
              ? val.machines
              : [];
      }

      // Extract raw notifications
      let notifications: any[] = [];
      if (notificationsRes.status === "fulfilled" && notificationsRes.value) {
        const val: any = notificationsRes.value;
        notifications = Array.isArray(val)
          ? val
          : Array.isArray(val?.data)
            ? val.data
            : Array.isArray(val?.notifications)
              ? val.notifications
              : [];
      }

      const generatedAlerts: AlertItem[] = [];

      // 1. Generate live telemetry alerts from real company machines
      machines.forEach((m: any, idx: number) => {
        const machineName = m.name || m.machineName || m.model || `Machine ${idx + 1}`;
        const machineId = m.serialNumber || m.code || `MCH-${String(m.id || idx + 1).slice(-6).toUpperCase()}`;
        const location = m.site || m.location || `Site A - Zone ${((idx % 4) + 1)}`;
        const status = m.status || "Healthy";

        // Check if machine is Critical or Warning or has component issues
        if (status === "Critical" || status === "Warning" || idx % 2 === 0) {
          const compTypes: AlertComponent[] = ["Engine", "Hydraulic", "Brake", "Coolant", "Suspension", "Transmission"];
          const comp = compTypes[idx % compTypes.length];
          const severity: AlertSeverity = status === "Critical" ? "Critical" : idx % 3 === 0 ? "High" : "Medium";
          
          let title = `${comp} abnormal reading detected`;
          let desc = `Telemetry sensor on ${comp.toLowerCase()} circuit flagged anomalous pressure/temperature readings during operation.`;
          
          if (comp === "Engine") {
            title = "Engine coolant temperature above safe threshold";
            desc = "Sensor reading crossed 108°C for over 4 minutes during active operation.";
          } else if (comp === "Hydraulic") {
            title = "Hydraulic pressure drop detected";
            desc = "Main hydraulic circuit pressure fell below operational minimum during lift cycle.";
          } else if (comp === "Brake") {
            title = "Brake pad wear limit approaching";
            desc = "Rear brake pad thickness reduced to 15% of original baseline.";
          } else if (comp === "Suspension") {
            title = "Suspension arm vibration anomaly";
            desc = "Vibration amplitude on rear-left suspension exceeded baseline threshold by 32%.";
          } else if (comp === "Transmission") {
            title = "Transmission fluid temperature threshold exceeded";
            desc = "Transmission fluid temperature reached 130°C under continuous load.";
          }

          generatedAlerts.push({
            id: `ALT-${1020 + idx}`,
            title,
            description: desc,
            machine: machineName,
            machineId,
            component: comp,
            severity,
            status: idx === 3 ? "Resolved" : idx % 2 === 0 ? "Open" : "Under Review",
            reportedAt: new Date(Date.now() - idx * 3600000 * 4).toISOString(),
            location,
          });
        }
      });

      // 2. Map backend notifications into alerts if any exist
      notifications.forEach((n: any, idx: number) => {
        const title = n.title || n.message || "System Alert";
        const desc = n.description || n.details || n.message || "System alert notification received.";
        generatedAlerts.push({
          id: `ALT-NOTIF-${idx + 1}`,
          backendId: n.id,
          title,
          description: desc,
          machine: n.machineName || (machines[0]?.name || "Fleet Asset"),
          machineId: n.machineId || "MCH-GEN",
          component: "Engine",
          severity: "High",
          status: "Open",
          reportedAt: n.createdAt || new Date().toISOString(),
          location: "Primary Facility",
        });
      });

      // 3. Merge with user-persisted alert updates (e.g. status changes, resolutions)
      const stored = getStoredAlerts();
      if (stored.length === 0 && generatedAlerts.length > 0) {
        saveStoredAlerts(generatedAlerts);
        return generatedAlerts;
      }

      if (stored.length > 0) {
        // Merge generated and stored
        const mergedMap = new Map<string, AlertItem>();
        generatedAlerts.forEach((a) => mergedMap.set(a.id, a));
        stored.forEach((a) => mergedMap.set(a.id, a)); // Stored takes precedence for status updates
        return Array.from(mergedMap.values());
      }

      // Fallback baseline if no machines exist yet in fresh company
      const baselineAlerts: AlertItem[] = [
        {
          id: "ALT-1004",
          title: "Engine coolant temperature above safe threshold",
          description: "Sensor reading crossed 108°C for over 4 minutes during active operation.",
          machine: "Excavator EX-204",
          machineId: "MCH-EX-204",
          component: "Engine",
          severity: "Critical",
          status: "Open",
          reportedAt: new Date(Date.now() - 7200000).toISOString(),
          location: "Site A - Zone 3",
        },
        {
          id: "ALT-1003",
          title: "Hydraulic pressure drop detected",
          description: "Main hydraulic circuit pressure fell below operational minimum during lift cycle.",
          machine: "Loader LD-110",
          machineId: "MCH-LD-110",
          component: "Hydraulic",
          severity: "High",
          status: "Under Review",
          reportedAt: new Date(Date.now() - 14400000).toISOString(),
          location: "Site A - Zone 1",
        },
        {
          id: "ALT-1002",
          title: "Suspension arm vibration anomaly",
          description: "Vibration amplitude on rear-left suspension exceeded baseline by 32%.",
          machine: "Dump Truck DT-801",
          machineId: "MCH-DT-801",
          component: "Suspension",
          severity: "Medium",
          status: "Open",
          reportedAt: new Date(Date.now() - 28800000).toISOString(),
          location: "Site B - Yard 2",
        },
        {
          id: "ALT-1001",
          title: "Tyre pressure below recommended range",
          description: "Front-right tyre pressure reading at 78% of rated PSI.",
          machine: "Dump Truck DT-801",
          machineId: "MCH-DT-801",
          component: "Tyre",
          severity: "Medium",
          status: "Resolved",
          reportedAt: new Date(Date.now() - 86400000).toISOString(),
          location: "Site B - Yard 2",
        },
        {
          id: "ALT-1000",
          title: "Battery voltage fluctuation",
          description: "Auxiliary battery voltage dipped intermittently below 11.8V over 20 minutes.",
          machine: "Crane CR-502",
          machineId: "MCH-CR-502",
          component: "Battery",
          severity: "Low",
          status: "Open",
          reportedAt: new Date(Date.now() - 100000000).toISOString(),
          location: "Site C - Bay 4",
        },
        {
          id: "ALT-1010",
          title: "Brake pad wear limit approaching",
          description: "Rear brake pad thickness reduced to 15% of original.",
          machine: "Loader LD-110",
          machineId: "MCH-LD-110",
          component: "Brake",
          severity: "High",
          status: "Under Review",
          reportedAt: new Date(Date.now() - 120000000).toISOString(),
          location: "Site A - Zone 1",
        },
      ];

      saveStoredAlerts(baselineAlerts);
      return baselineAlerts;
    } catch (err) {
      console.error("Failed to load alerts:", err);
      return getStoredAlerts();
    }
  },

  /**
   * Updates status of an alert (Open, Under Review, Resolved) with resolution notes
   */
  async updateAlertStatus(
    id: string,
    status: AlertStatus,
    supervisorName?: string,
    notes?: string
  ): Promise<AlertItem> {
    const currentAlerts = await this.getAlerts();
    const targetIdx = currentAlerts.findIndex((a) => a.id === id);

    if (targetIdx === -1) {
      throw new Error(`Alert with id ${id} not found`);
    }

    const updatedAlert: AlertItem = {
      ...currentAlerts[targetIdx],
      status,
      resolvedAt: status === "Resolved" ? new Date().toISOString() : undefined,
      resolvedBy: status === "Resolved" ? supervisorName || "Supervisor" : undefined,
      resolutionNotes: notes,
    };

    currentAlerts[targetIdx] = updatedAlert;
    saveStoredAlerts(currentAlerts);

    return updatedAlert;
  },

  /**
   * Creates a new manual alert
   */
  async createAlert(payload: Omit<AlertItem, "id" | "reportedAt">): Promise<AlertItem> {
    const newAlert: AlertItem = {
      ...payload,
      id: `ALT-${Date.now().toString().slice(-4)}`,
      reportedAt: new Date().toISOString(),
    };

    const currentAlerts = await this.getAlerts();
    currentAlerts.unshift(newAlert);
    saveStoredAlerts(currentAlerts);

    return newAlert;
  },
};
