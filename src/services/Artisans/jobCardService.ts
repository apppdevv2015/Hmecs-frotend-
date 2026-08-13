import { apiRequest } from "../api";

export type MaintenanceType =
  | "PREVENTIVE"
  | "CORRECTIVE"
  | "BREAKDOWN"
  | "INSPECTION"
  | "REBUILD"
  | "COMPONENT_REPLACEMENT";

export type PriorityLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type JobCardStatus =
  | "DRAFT"
  | "OPEN"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "WAITING_FOR_PARTS"
  | "WAITING_FOR_APPROVAL"
  | "COMPLETED"
  | "CLOSED"
  | "CANCELLED";

export type JobCardPart = {
  id?: string;
  partName: string;
  partNumber?: string;
  quantity: number;
  unitCost: number;
  totalCost?: number;
  isConsumed?: boolean;
};

export type JobCardLaborLog = {
  id?: string;
  artisanId?: string;
  artisanName?: string;
  startTime: string;
  endTime?: string;
  durationMinutes?: number;
  actionType?: string;
  notes?: string;
};

export type JobCardFinding = {
  id?: string;
  parameterName: string;
  measuredValue: string;
  unit?: string;
  standardSpec?: string;
  status: "PASS" | "FAIL" | "WARNING" | "ATTENTION";
  remarks?: string;
};

export type JobCardAttachment = {
  id?: string;
  fileType: "PHOTO_BEFORE" | "PHOTO_AFTER" | "MANUAL" | "DRAWING" | "REPORT";
  fileName: string;
  fileUrl: string;
  uploadedBy?: string;
  createdAt?: string;
};

export type JobCard = {
  id: string;
  jobCardNumber: string;
  companyId: string;
  machineId: string;
  componentId?: string;
  maintenanceType: MaintenanceType;
  priority: PriorityLevel;
  status: JobCardStatus;
  title: string;
  description?: string;
  plannedStartDate?: string;
  plannedFinishDate?: string;
  actualStartDate?: string;
  actualFinishDate?: string;
  assignedTechnicianId?: string;
  assignedTechnicianName?: string;
  assignedSupervisorId?: string;
  assignedSupervisorName?: string;
  assignedPlannerId?: string;
  assignedPlannerName?: string;
  allocatedLaborHours?: number;
  actualLaborHours?: number;
  downtimeHours?: number;
  requiredTools?: string;
  rootCause?: string;
  correctiveAction?: string;
  postRepairCondition?: string;
  totalCost?: number;
  supervisorNotes?: string;
  engineeringNotes?: string;
  supervisorApprovedAt?: string;
  engineeringApprovedAt?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
  machine?: {
    id: string;
    name: string;
    serialNumber: string;
    model: string;
    site?: string;
  };
  component?: {
    id: string;
    category: string;
    description: string;
    serialNumber: string;
  };
  parts?: JobCardPart[];
  laborLogs?: JobCardLaborLog[];
  findings?: JobCardFinding[];
  attachments?: JobCardAttachment[];
};

export type JobCardSummary = {
  total: number;
  open: number;
  assigned: number;
  inProgress: number;
  waitingParts: number;
  waitingApproval: number;
  completed: number;
  closed: number;
  cancelled: number;
  overdue: number;
};

export type JobCardListResponse = {
  items: JobCard[];
  total: number;
  page: number;
  limit: number;
  summary: JobCardSummary;
};

export type ReliabilityMetrics = {
  mttrHours: number;
  mtbfHours: number;
  pmCompliancePercent: number;
  breakdownCount: number;
  totalDowntimeHours: number;
  totalMaintenanceCost: number;
};

export const jobCardService = {
  getJobCards: (params: {
    status?: string;
    maintenanceType?: string;
    priority?: string;
    machineId?: string;
    technicianId?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}) => {
    const query = new URLSearchParams();
    if (params.status) query.set("status", params.status);
    if (params.maintenanceType) query.set("maintenanceType", params.maintenanceType);
    if (params.priority) query.set("priority", params.priority);
    if (params.machineId) query.set("machineId", params.machineId);
    if (params.technicianId) query.set("technicianId", params.technicianId);
    if (params.search) query.set("search", params.search);
    if (params.page) query.set("page", String(params.page));
    if (params.limit) query.set("limit", String(params.limit));

    return apiRequest<{ success: boolean; data: JobCardListResponse }>(
      `/api/v1/job-cards?${query.toString()}`
    );
  },

  getJobCardById: (id: string) =>
    apiRequest<{ success: boolean; data: JobCard }>(`/api/v1/job-cards/${id}`),

  createJobCard: (payload: Partial<JobCard>) =>
    apiRequest<{ success: boolean; data: JobCard }>("/api/v1/job-cards", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateJobCard: (id: string, payload: Partial<JobCard>) =>
    apiRequest<{ success: boolean; data: JobCard }>(`/api/v1/job-cards/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  updateStatus: (
    id: string,
    payload: {
      status: JobCardStatus;
      reason?: string;
      rootCause?: string;
      correctiveAction?: string;
      postRepairCondition?: string;
      downtimeHours?: number;
    }
  ) =>
    apiRequest<{ success: boolean; data: JobCard }>(
      `/api/v1/job-cards/${id}/status`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      }
    ),

  logLaborTimer: (
    id: string,
    payload: {
      artisanId?: string;
      artisanName?: string;
      actionType: "START" | "PAUSE" | "RESUME" | "FINISH";
      notes?: string;
    }
  ) =>
    apiRequest<{ success: boolean; data: JobCard }>(
      `/api/v1/job-cards/${id}/labor-timer`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    ),

  addPart: (id: string, payload: JobCardPart) =>
    apiRequest<{ success: boolean; data: JobCardPart }>(
      `/api/v1/job-cards/${id}/parts`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    ),

  addInspectionFinding: (id: string, payload: JobCardFinding) =>
    apiRequest<{ success: boolean; data: JobCardFinding }>(
      `/api/v1/job-cards/${id}/findings`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    ),

  addAttachment: (id: string, payload: JobCardAttachment) =>
    apiRequest<{ success: boolean; data: JobCardAttachment }>(
      `/api/v1/job-cards/${id}/attachments`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    ),

  approveJobCard: (
    id: string,
    payload: {
      role: "supervisor" | "engineer";
      approvedBy?: string;
      notes?: string;
      status?: JobCardStatus;
    }
  ) =>
    apiRequest<{ success: boolean; data: JobCard }>(
      `/api/v1/job-cards/${id}/approve`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    ),

  getReliabilityMetrics: () =>
    apiRequest<{ success: boolean; data: ReliabilityMetrics }>(
      "/api/v1/job-cards/metrics"
    ),

  // Database-backed Audit Trail APIs
  addAuditLog: (
    id: string,
    payload: {
      action: string;
      title: string;
      description: string;
      fieldChanged?: string;
      oldValue?: string;
      newValue?: string;
      badgeColor?: string;
      userName?: string;
      userRole?: string;
      userEmail?: string;
    }
  ) =>
    apiRequest<{ success: boolean; data: any }>(
      `/api/v1/job-cards/${id}/audit-logs`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    ),

  getAuditLogs: (id: string) =>
    apiRequest<{ success: boolean; data: any[] }>(
      `/api/v1/job-cards/${id}/audit-logs`
    ),

  getAuditStream: (limit = 50) =>
    apiRequest<{ success: boolean; data: any[] }>(
      `/api/v1/job-cards/audit-logs/stream?limit=${limit}`
    ),

  // Database-backed Voice Notes APIs
  addVoiceNote: (
    id: string,
    payload: {
      title: string;
      audioUrl: string;
      durationSeconds: number;
      userName?: string;
      userRole?: string;
    }
  ) =>
    apiRequest<{ success: boolean; data: any }>(
      `/api/v1/job-cards/${id}/voice-notes`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    ),

  getVoiceNotes: (id: string) =>
    apiRequest<{ success: boolean; data: any[] }>(
      `/api/v1/job-cards/${id}/voice-notes`
    ),

  deleteVoiceNote: (noteId: string) =>
    apiRequest<{ success: boolean; data: any }>(
      `/api/v1/job-cards/voice-notes/${noteId}`,
      {
        method: "DELETE",
      }
    ),
};
