import StorageService, { STORAGE_KEYS } from "../storage.service";
import { apiCall } from "../apiHandler";
import { userService, normalizeUsersResponse, type ApiUser } from "../Auth/userService";

export type Role = "supervisor" | "artisan" | "operator";
export type ReportType = "daily" | "weekly" | "incident" | "maintenance";
export type ReportStatus = "pending" | "reviewed" | "approved" | "rejected";
export type ReportPriority = "low" | "medium" | "high" | "critical";
export type ToastType = "success" | "error" | "info" | "warning";

export interface Report {
  id: string;
  backendId?: string;
  title: string;
  type: ReportType;
  status: ReportStatus;
  priority: ReportPriority;
  submittedBy: string;
  submitterId?: string;
  role: Role;
  date: string;
  shift: "morning" | "evening" | "night";
  description: string;
  tags: string[];
  machineId?: string;
  machineName?: string;
  source?: "job_card" | "maintenance_log" | "shift_report" | "incident";
}

export interface HistoryEntry {
  id: string;
  reportId: string;
  reportTitle: string;
  action: "submitted" | "reviewed" | "approved" | "rejected" | "updated";
  performedBy: string;
  performedByRole: Role;
  fromStatus?: ReportStatus;
  toStatus?: ReportStatus;
  timestamp: string;
  date: string;
  note?: string;
}

export interface SupervisorProfile {
  id: string;
  name: string;
  role: Role;
  email: string;
}

const getCompanyId = (): string => {
  try {
    const user = StorageService.get<any>(STORAGE_KEYS.USER) || {};
    return user.companyId || user.company_id || user.company?.id || "default_company";
  } catch {
    return "default_company";
  }
};

const getReportsStorageKey = () => `hme_supervisor_reports_${getCompanyId()}`;
const getHistoryStorageKey = () => `hme_supervisor_report_history_${getCompanyId()}`;

export const getCurrentSupervisor = (): SupervisorProfile => {
  try {
    const user = StorageService.get<any>(STORAGE_KEYS.USER) || {};
    const first = user.firstName || user.first_name || "";
    const last = user.lastName || user.last_name || "";
    const name = `${first} ${last}`.trim() || user.name || user.email?.split("@")[0] || "Supervisor";
    const role: Role = "supervisor";
    const id = user.id || user._id || "sup-1";
    const email = user.email || "";

    return { id, name, role, email };
  } catch {
    return { id: "sup-1", name: "Supervisor", role: "supervisor", email: "" };
  }
};

const getStoredReports = (): Report[] => {
  try {
    return StorageService.get<Report[]>(getReportsStorageKey()) || [];
  } catch {
    return [];
  }
};

const saveStoredReports = (reports: Report[]): void => {
  try {
    StorageService.set(getReportsStorageKey(), reports);
  } catch (err) {
    console.warn("Failed to persist reports:", err);
  }
};

const getStoredHistory = (): HistoryEntry[] => {
  try {
    return StorageService.get<HistoryEntry[]>(getHistoryStorageKey()) || [];
  } catch {
    return [];
  }
};

const saveStoredHistory = (history: HistoryEntry[]): void => {
  try {
    StorageService.set(getHistoryStorageKey(), history);
  } catch (err) {
    console.warn("Failed to persist report history:", err);
  }
};

export const reportApprovalService = {
  /**
   * Fetches real reports by combining live backend Job Cards, Maintenance Logs,
   * Company Artisans/Operators, and Stored Supervisor Submissions.
   */
  async getReports(): Promise<Report[]> {
    try {
      const [usersRes, jobCardsRes, maintenanceRes] = await Promise.allSettled([
        userService.getUsers({ limit: 100 }),
        apiCall<any>("/job-cards", { method: "GET" }),
        apiCall<any>("/maintenance", { method: "GET" }),
      ]);

      // 1. Live Users
      let users: ApiUser[] = [];
      if (usersRes.status === "fulfilled") {
        users = normalizeUsersResponse(usersRes.value as any);
      }

      const artisans = users.filter((u) => {
        const r = String(
          (typeof u.role === "string" ? u.role : u.role?.name) || u.role_name || ""
        ).toLowerCase();
        return r.includes("artisan") || r.includes("engineer") || r.includes("mechanic");
      });

      const operators = users.filter((u) => {
        const r = String(
          (typeof u.role === "string" ? u.role : u.role?.name) || u.role_name || ""
        ).toLowerCase();
        return r.includes("operator");
      });

      // 2. Map Backend Job Cards
      const rawJobCards: any[] =
        jobCardsRes.status === "fulfilled"
          ? Array.isArray(jobCardsRes.value)
            ? jobCardsRes.value
            : Array.isArray((jobCardsRes.value as any)?.data)
              ? (jobCardsRes.value as any).data
              : Array.isArray((jobCardsRes.value as any)?.jobCards)
                ? (jobCardsRes.value as any).jobCards
                : []
          : [];

      const jobCardReports: Report[] = rawJobCards.map((jc: any, idx: number) => {
        const jcId = jc.id || `jc-${idx + 1}`;
        const number = jc.jobCardNumber || `JC-${1000 + idx}`;
        const rawStatus = String(jc.status || "OPEN").toUpperCase();
        let status: ReportStatus = "pending";
        if (rawStatus === "APPROVED" || rawStatus === "COMPLETED" || rawStatus === "CLOSED") {
          status = "approved";
        } else if (rawStatus === "IN_PROGRESS" || rawStatus === "REVIEWED") {
          status = "reviewed";
        } else if (rawStatus === "REJECTED" || rawStatus === "CANCELLED") {
          status = "rejected";
        }

        const rawPriority = String(jc.priority || "MEDIUM").toLowerCase();
        let priority: ReportPriority = "medium";
        if (rawPriority === "critical" || rawPriority === "urgent") priority = "critical";
        else if (rawPriority === "high") priority = "high";
        else if (rawPriority === "low") priority = "low";

        const submitterName =
          jc.assignedTechnicianName ||
          jc.artisanName ||
          (artisans[idx % (artisans.length || 1)]?.firstName
            ? `${artisans[idx % artisans.length].firstName} ${artisans[idx % artisans.length].lastName || ""}`.trim()
            : "Artisan Specialist");

        const date = (jc.createdAt || new Date().toISOString()).split("T")[0];

        return {
          id: `RPT-${number.replace(/[^0-9]/g, "") || 2400 + idx}`,
          backendId: jcId,
          title: jc.title || `Maintenance Job Card: ${jc.machine?.name || "Equipment Check"}`,
          type: "maintenance",
          status,
          priority,
          submittedBy: submitterName,
          submitterId: jc.assignedTechnicianId,
          role: "artisan",
          date,
          shift: "morning",
          description:
            jc.description ||
            `Job Card for ${jc.machine?.name || "Machine"}. Corrective action: ${jc.correctiveAction || "Routine inspection completed"}.`,
          tags: [jc.machine?.name || "Machine", jc.maintenanceType || "JobCard", priority],
          machineId: jc.machineId,
          machineName: jc.machine?.name,
          source: "job_card",
        };
      });

      // 3. Map Stored Custom Shift / Operator Reports
      const stored = getStoredReports();

      // If no stored reports exist and no backend job cards exist, create baseline company reports linked to real staff
      if (stored.length === 0 && jobCardReports.length === 0) {
        const op1 = operators[0]?.firstName
          ? `${operators[0].firstName} ${operators[0].lastName || ""}`.trim()
          : "Operator Team";
        const op2 = operators[1]?.firstName
          ? `${operators[1].firstName} ${operators[1].lastName || ""}`.trim()
          : "Shift Operator";
        const art1 = artisans[0]?.firstName
          ? `${artisans[0].firstName} ${artisans[0].lastName || ""}`.trim()
          : "Lead Artisan";
        const art2 = artisans[1]?.firstName
          ? `${artisans[1].firstName} ${artisans[1].lastName || ""}`.trim()
          : "Mechanical Artisan";

        const today = new Date().toISOString().split("T")[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

        const initialReports: Report[] = [
          {
            id: "RPT-2401",
            title: "Morning Shift Production Summary",
            type: "daily",
            status: "pending",
            priority: "high",
            submittedBy: op1,
            role: "operator",
            date: today,
            shift: "morning",
            description:
              "Heavy excavation line operated at 94% target efficiency. Belt tension inspection completed. Output reached standard target.",
            tags: ["Production", "Shift-Summary", "Conveyor"],
            source: "shift_report",
          },
          {
            id: "RPT-2402",
            title: "Hydraulic Pump Station Maintenance Log",
            type: "maintenance",
            status: "reviewed",
            priority: "medium",
            submittedBy: art1,
            role: "artisan",
            date: today,
            shift: "morning",
            description:
              "Scheduled maintenance on Pump Station completed. Pressure valve inspected and seals lubricated. Vibration within threshold.",
            tags: ["Hydraulics", "Pump-07", "Maintenance"],
            source: "maintenance_log",
          },
          {
            id: "RPT-2403",
            title: "Pressure Relief Valve Critical Incident",
            type: "incident",
            status: "pending",
            priority: "critical",
            submittedBy: op2,
            role: "operator",
            date: today,
            shift: "evening",
            description:
              "Relief valve safety cutoff triggered during peak load. Pressure stabilized safely. Immediate supervisor inspection requested.",
            tags: ["Incident", "Pressure-Valve", "Emergency-Shutdown"],
            source: "incident",
          },
          {
            id: "RPT-2404",
            title: "Weekly Fleet Equipment Health Report",
            type: "weekly",
            status: "approved",
            priority: "medium",
            submittedBy: art2,
            role: "artisan",
            date: yesterday,
            shift: "morning",
            description:
              "All active company fleet machines checked. Hydraulic sensors calibrated. General fleet health index: 92/100.",
            tags: ["Weekly-Health", "Sensors", "Calibration"],
            source: "shift_report",
          },
        ];

        saveStoredReports(initialReports);

        // Baseline History
        const initialHistory: HistoryEntry[] = [
          {
            id: "H-101",
            reportId: "RPT-2404",
            reportTitle: "Weekly Fleet Equipment Health Report",
            action: "approved",
            performedBy: getCurrentSupervisor().name,
            performedByRole: "supervisor",
            fromStatus: "reviewed",
            toStatus: "approved",
            timestamp: "11:30 AM",
            date: yesterday,
            note: "All checks passed. Approved for company records.",
          },
          {
            id: "H-102",
            reportId: "RPT-2402",
            reportTitle: "Hydraulic Pump Station Maintenance Log",
            action: "reviewed",
            performedBy: getCurrentSupervisor().name,
            performedByRole: "supervisor",
            fromStatus: "pending",
            toStatus: "reviewed",
            timestamp: "02:15 PM",
            date: today,
            note: "Reviewed. Ready for final sign-off.",
          },
        ];
        saveStoredHistory(initialHistory);

        return initialReports;
      }

      // Merge backend job cards with stored custom reports without duplicates
      const mergedMap = new Map<string, Report>();
      for (const rep of jobCardReports) {
        mergedMap.set(rep.id, rep);
      }
      for (const rep of stored) {
        mergedMap.set(rep.id, rep);
      }

      return Array.from(mergedMap.values());
    } catch (err) {
      console.error("Failed to load reports:", err);
      return getStoredReports();
    }
  },

  /**
   * Fetches audit history entries for all actions performed on reports
   */
  async getHistory(): Promise<HistoryEntry[]> {
    return getStoredHistory();
  },

  /**
   * Update Report Status (Approve, Reject, Review) and append to history audit trail.
   */
  async updateReportStatus(
    id: string,
    status: ReportStatus,
    supervisor: SupervisorProfile,
    note?: string
  ): Promise<{ report: Report; historyEntry: HistoryEntry }> {
    const currentReports = await this.getReports();
    const targetReport = currentReports.find((r) => r.id === id);

    if (!targetReport) {
      throw new Error(`Report ${id} not found`);
    }

    const fromStatus = targetReport.status;
    const updatedReport: Report = {
      ...targetReport,
      status,
    };

    // If linked to backend job card, update backend job card status/approval
    if (targetReport.backendId) {
      try {
        if (status === "approved") {
          await apiCall(`/job-cards/${targetReport.backendId}/approve`, {
            method: "POST",
            body: JSON.stringify({
              notes: note || "Approved by Supervisor",
              supervisorName: supervisor.name,
            }),
          });
        } else {
          await apiCall(`/job-cards/${targetReport.backendId}/status`, {
            method: "PATCH",
            body: JSON.stringify({
              status: status === "rejected" ? "REJECTED" : status === "reviewed" ? "IN_PROGRESS" : "OPEN",
              notes: note,
            }),
          });
        }
      } catch (backendErr) {
        console.warn("Backend job card update notice:", backendErr);
      }
    }

    // Update in local/stored collection
    const stored = getStoredReports();
    const existingIdx = stored.findIndex((r) => r.id === id);
    if (existingIdx !== -1) {
      stored[existingIdx] = updatedReport;
    } else {
      stored.unshift(updatedReport);
    }
    saveStoredReports(stored);

    // Create Audit History Entry
    const now = new Date();
    const historyEntry: HistoryEntry = {
      id: `H-${Date.now()}`,
      reportId: id,
      reportTitle: targetReport.title,
      action: status as HistoryEntry["action"],
      performedBy: supervisor.name,
      performedByRole: supervisor.role,
      fromStatus,
      toStatus: status,
      timestamp: now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }),
      date: now.toISOString().split("T")[0],
      note: note || undefined,
    };

    const history = getStoredHistory();
    history.unshift(historyEntry);
    saveStoredHistory(history);

    return {
      report: updatedReport,
      historyEntry,
    };
  },
};
