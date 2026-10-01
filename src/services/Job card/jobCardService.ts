import { apiCall } from "../apiHandler";

export type JobCardMaintenanceType =
  | "PREVENTIVE"
  | "CORRECTIVE"
  | "BREAKDOWN"
  | "INSPECTION"
  | "REBUILD"
  | "COMPONENT_REPLACEMENT";

export type JobCardPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

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

export type LaborTimerAction = "START" | "RESUME" | "PAUSE" | "FINISH";

export type InspectionFindingStatus = "PASS" | "FAIL";

export type JobCardAttachmentType =
  | "PHOTO_BEFORE"
  | "PHOTO_AFTER"
  | "MANUAL"
  | "DRAWING";



export interface JobCardMachineSummary {
  readonly id: string;
  readonly name: string;
  readonly serialNumber: string;
  readonly model: string;
  readonly site?: string | null;
}

export interface JobCardComponentSummary {
  readonly id: string;
  readonly category?: string | null;
  readonly description?: string | null;
  readonly serialNumber: string;
}

export interface JobCardPart {
  readonly id: string;
  readonly jobCardId: string;
  readonly partName: string;
  readonly partNumber?: string | null;
  readonly quantity: number;
  readonly unitCost: string;
  readonly totalCost: string;
  readonly isConsumed: boolean;
  readonly createdAt: string;
}

export interface JobCardLaborLog {
  readonly id: string;
  readonly jobCardId: string;
  readonly artisanId?: string | null;
  readonly artisanName?: string | null;
  readonly startTime: string;
  readonly endTime?: string | null;
  readonly durationMinutes?: number | null;
  readonly actionType: string;
  readonly notes?: string | null;
  readonly createdAt: string;
}

export interface JobCardInspectionFinding {
  readonly id: string;
  readonly jobCardId: string;
  readonly parameterName: string;
  readonly measuredValue: string;
  readonly unit?: string | null;
  readonly standardSpec?: string | null;
  readonly status: InspectionFindingStatus;
  readonly remarks?: string | null;
  readonly createdAt: string;
}

export interface JobCardAttachment {
  readonly id: string;
  readonly jobCardId: string;
  readonly fileType: JobCardAttachmentType;
  readonly fileName: string;
  readonly fileUrl: string;
  readonly uploadedBy?: string | null;
  readonly createdAt: string;
}

export interface JobCardAuditLog {
  readonly id: string;
  readonly jobCardId: string;
  readonly action: string;
  readonly title: string;
  readonly description: string;
  readonly fieldChanged?: string | null;
  readonly oldValue?: string | null;
  readonly newValue?: string | null;
  readonly userId?: string | null;
  readonly userName: string;
  readonly userRole?: string | null;
  readonly userEmail?: string | null;
  readonly badgeColor?: string | null;
  readonly createdAt: string;
  readonly jobCard?: {
    readonly id: string;
    readonly jobCardNumber: string;
    readonly title: string;
    readonly priority: JobCardPriority;
    readonly status: JobCardStatus;
  };
}

export interface JobCard {
  readonly id: string;
  readonly jobCardNumber: string;
  readonly companyId: string;
  readonly machineId: string;
  readonly componentId?: string | null;
  readonly maintenanceType: JobCardMaintenanceType;
  readonly priority: JobCardPriority;
  readonly status: JobCardStatus;
  readonly title: string;
  readonly description?: string | null;
  readonly plannedStartDate?: string | null;
  readonly plannedFinishDate?: string | null;
  readonly actualStartDate?: string | null;
  readonly actualFinishDate?: string | null;
  readonly assignedTechnicianId?: string | null;
  readonly assignedTechnicianName?: string | null;
  readonly assignedSupervisorId?: string | null;
  readonly assignedSupervisorName?: string | null;
  readonly assignedPlannerId?: string | null;
  readonly assignedPlannerName?: string | null;
  readonly allocatedLaborHours: string;
  readonly actualLaborHours: string;
  readonly downtimeHours: string;
  readonly requiredTools?: string | null;
  readonly rootCause?: string | null;
  readonly correctiveAction?: string | null;
  readonly postRepairCondition?: string | null;
  readonly totalCost: string;
  readonly laborRate: string;
  readonly laborCost: string;
  readonly supervisorNotes?: string | null;
  readonly engineeringNotes?: string | null;
  readonly supervisorApprovedAt?: string | null;
  readonly engineeringApprovedAt?: string | null;
  readonly closedAt?: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly machine?: JobCardMachineSummary;
  readonly component?: JobCardComponentSummary | null;
  readonly parts: readonly JobCardPart[];
  readonly laborLogs: readonly JobCardLaborLog[];
  readonly findings: readonly JobCardInspectionFinding[];
  readonly attachments: readonly JobCardAttachment[];
}

export interface JobCardStatusSummary {
  readonly total: number;
  readonly open: number;
  readonly assigned: number;
  readonly inProgress: number;
  readonly waitingParts: number;
  readonly waitingApproval: number;
  readonly completed: number;
  readonly closed: number;
  readonly cancelled: number;
  readonly overdue: number;
}

export interface JobCardListResult {
  readonly items: readonly JobCard[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
  readonly summary: JobCardStatusSummary;
}

export interface ReliabilityMetrics {
  readonly mttrHours: number | null;
  readonly mtbfHours: number | null;
  readonly pmCompliancePercent: number | null;
  readonly breakdownCount: number;
  readonly totalDowntimeHours: number;
  readonly totalMaintenanceCost: number;
}

export interface JobCardGroupedMetric {
  readonly key: string;
  readonly label: string;
  readonly jobs: number;
  readonly laborHours: number;
  readonly downtimeHours: number;
  readonly cost: number;
}

export interface JobCardPartsConsumptionRow {
  readonly partName: string;
  readonly quantity: number;
  readonly cost: number;
}

export interface JobCardBreakdownTrendRow {
  readonly month: string;
  readonly count: number;
}

export interface JobCardDashboard {
  readonly summary: JobCardStatusSummary;
  readonly reliability: ReliabilityMetrics;
  readonly byMachine: readonly JobCardGroupedMetric[];
  readonly byComponent: readonly JobCardGroupedMetric[];
  readonly byTechnician: readonly JobCardGroupedMetric[];
  readonly byPriority: readonly JobCardGroupedMetric[];
  readonly partsConsumption: readonly JobCardPartsConsumptionRow[];
  readonly breakdownTrend: readonly JobCardBreakdownTrendRow[];
}

export interface ApiEnvelope<T> {
  readonly success: boolean;
  readonly message?: string;
  readonly data: T;
}

export interface CreateJobCardPayload {
  readonly machineId: string;
  readonly title: string;
  readonly status?: "DRAFT";
  readonly componentId?: string;
  readonly description?: string;
  readonly maintenanceType?: JobCardMaintenanceType;
  readonly priority?: JobCardPriority;
  readonly plannedStartDate?: string;
  readonly plannedFinishDate?: string;
  readonly assignedTechnicianId?: string;
  readonly assignedSupervisorId?: string;
  readonly assignedPlannerId?: string;
  readonly allocatedLaborHours?: number;
  readonly laborRate?: number;
  readonly requiredTools?: string;
}

export interface UpdateJobCardPayload {
  readonly title?: string;
  readonly description?: string;
  readonly maintenanceType?: JobCardMaintenanceType;
  readonly priority?: JobCardPriority;
  readonly plannedStartDate?: string;
  readonly plannedFinishDate?: string;
  readonly assignedTechnicianId?: string;
  readonly assignedSupervisorId?: string;
  readonly assignedPlannerId?: string;
  readonly allocatedLaborHours?: number;
  readonly laborRate?: number;
  readonly requiredTools?: string;
  readonly componentId?: string;
  readonly rootCause?: string;
  readonly correctiveAction?: string;
  readonly postRepairCondition?: number;
  readonly supervisorNotes?: string;
  readonly engineeringNotes?: string;
}

export interface UpdateJobCardStatusPayload {
  readonly status: JobCardStatus;
  readonly rootCause?: string;
  readonly correctiveAction?: string;
  readonly postRepairCondition?: number;
  readonly downtimeHours?: number;
}

export interface LaborTimerPayload {
  readonly actionType: LaborTimerAction;
  readonly notes?: string;
}

export interface AddJobCardPartPayload {
  readonly partName: string;
  readonly quantity: number;
  readonly partNumber?: string;
  readonly unitCost?: number;
  readonly isConsumed?: boolean;
}

export interface AddInspectionFindingPayload {
  readonly parameterName: string;
  readonly measuredValue?: string;
  readonly unit?: string;
  readonly standardSpec?: string;
  readonly status?: InspectionFindingStatus;
  readonly remarks?: string;
}

export interface AddJobCardAttachmentPayload {
  readonly file: File;
  readonly fileType?: JobCardAttachmentType;
}

export interface ApproveJobCardPayload {
  readonly notes?: string;
}

export interface AddJobCardAuditLogPayload {
  readonly action: string;
  readonly title: string;
  readonly description: string;
  readonly fieldChanged?: string;
  readonly oldValue?: string;
  readonly newValue?: string;
}

export interface GetJobCardsParams {
  readonly status?: JobCardStatus;
  readonly maintenanceType?: JobCardMaintenanceType;
  readonly priority?: JobCardPriority;
  readonly machineId?: string;
  readonly componentId?: string;
  readonly technicianId?: string;
  readonly search?: string;
  readonly page?: number;
  readonly limit?: number;
}


export function resolveJobCardFileUrl(fileUrl: string): string {
  if (/^https?:\/\//i.test(fileUrl)) return fileUrl;
  const apiBase = (import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api/v1")
    .replace(/\/api\/v1\/?$/, "");
  return `${apiBase}${fileUrl}`;
}


const BASE_ENDPOINT = "/job-cards";

function assertValidId(id: string): void {
  if (typeof id !== "string" || id.trim().length === 0) {
    throw new Error("Invalid Job Card ID provided");
  }
}

function buildQueryString(
  params: Record<string, string | number | undefined>,
): string {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });

  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

export const jobCardService = {
  async createJobCard(
    payload: CreateJobCardPayload,
  ): Promise<ApiEnvelope<JobCard>> {
    return apiCall<ApiEnvelope<JobCard>>(
      BASE_ENDPOINT,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      { showSuccess: true },
    );
  },

 
  async createJobCardFromAlert(
    alertId: string,
  ): Promise<ApiEnvelope<JobCard>> {
    assertValidId(alertId);

    return apiCall<ApiEnvelope<JobCard>>(
      `${BASE_ENDPOINT}/from-alert/${encodeURIComponent(alertId)}`,
      { method: "POST" },
      { showSuccess: true },
    );
  },

  async getJobCards(
    params: GetJobCardsParams = {},
  ): Promise<ApiEnvelope<JobCardListResult>> {
    const query = buildQueryString({
      status: params.status,
      maintenanceType: params.maintenanceType,
      priority: params.priority,
      machineId: params.machineId,
      componentId: params.componentId,
      technicianId: params.technicianId,
      search: params.search,
      page: params.page,
      limit: params.limit,
    });

    return apiCall<ApiEnvelope<JobCardListResult>>(`${BASE_ENDPOINT}${query}`, {
      method: "GET",
    });
  },

  async getJobCardById(id: string): Promise<ApiEnvelope<JobCard>> {
    assertValidId(id);

    return apiCall<ApiEnvelope<JobCard>>(
      `${BASE_ENDPOINT}/${encodeURIComponent(id)}`,
      { method: "GET" },
    );
  },

  async updateJobCard(
    id: string,
    payload: UpdateJobCardPayload,
  ): Promise<ApiEnvelope<JobCard>> {
    assertValidId(id);

    return apiCall<ApiEnvelope<JobCard>>(
      `${BASE_ENDPOINT}/${encodeURIComponent(id)}`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      },
      { showSuccess: true },
    );
  },

  async updateJobCardStatus(
    id: string,
    payload: UpdateJobCardStatusPayload,
  ): Promise<ApiEnvelope<JobCard>> {
    assertValidId(id);

    return apiCall<ApiEnvelope<JobCard>>(
      `${BASE_ENDPOINT}/${encodeURIComponent(id)}/status`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
      { showSuccess: true },
    );
  },


  async logLaborTimer(
    id: string,
    payload: LaborTimerPayload,
  ): Promise<ApiEnvelope<JobCard>> {
    assertValidId(id);

    return apiCall<ApiEnvelope<JobCard>>(
      `${BASE_ENDPOINT}/${encodeURIComponent(id)}/labor-timer`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      { showSuccess: true },
    );
  },

  async addPart(
    id: string,
    payload: AddJobCardPartPayload,
  ): Promise<ApiEnvelope<JobCardPart>> {
    assertValidId(id);

    return apiCall<ApiEnvelope<JobCardPart>>(
      `${BASE_ENDPOINT}/${encodeURIComponent(id)}/parts`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      { showSuccess: true },
    );
  },

  async addInspectionFinding(
    id: string,
    payload: AddInspectionFindingPayload,
  ): Promise<ApiEnvelope<JobCardInspectionFinding>> {
    assertValidId(id);

    return apiCall<ApiEnvelope<JobCardInspectionFinding>>(
      `${BASE_ENDPOINT}/${encodeURIComponent(id)}/findings`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      { showSuccess: true },
    );
  },

async addAttachment(
  id: string,
  payload: AddJobCardAttachmentPayload,
): Promise<ApiEnvelope<JobCardAttachment>> {
  assertValidId(id);

  const formData = new FormData();
  formData.append("file", payload.file);
  formData.append("fileType", payload.fileType ?? "PHOTO_BEFORE");

  return apiCall<ApiEnvelope<JobCardAttachment>>(
    `${BASE_ENDPOINT}/${encodeURIComponent(id)}/attachments`,
    {
      method: "POST",
      body: formData,
    },
    { showSuccess: true },
  );
},

async deleteAttachment(
  id: string,
  attachmentId: string,
): Promise<ApiEnvelope<JobCardAttachment>> {
  assertValidId(id);
  assertValidId(attachmentId);

  return apiCall<ApiEnvelope<JobCardAttachment>>(
    `${BASE_ENDPOINT}/${encodeURIComponent(id)}/attachments/${encodeURIComponent(attachmentId)}`,
    { method: "DELETE" },
    { showSuccess: true },
  );
},

  async approveJobCard(
    id: string,
    payload: ApproveJobCardPayload = {},
  ): Promise<ApiEnvelope<JobCard>> {
    assertValidId(id);

    return apiCall<ApiEnvelope<JobCard>>(
      `${BASE_ENDPOINT}/${encodeURIComponent(id)}/approve`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      { showSuccess: true },
    );
  },

  async getReliabilityMetrics(): Promise<ApiEnvelope<ReliabilityMetrics>> {
    return apiCall<ApiEnvelope<ReliabilityMetrics>>(
      `${BASE_ENDPOINT}/metrics`,
      { method: "GET" },
    );
  },

  async getDashboard(): Promise<ApiEnvelope<JobCardDashboard>> {
    return apiCall<ApiEnvelope<JobCardDashboard>>(
      `${BASE_ENDPOINT}/dashboard`,
      { method: "GET" },
    );
  },

  async getAuditStream(
    limit?: number,
  ): Promise<ApiEnvelope<readonly JobCardAuditLog[]>> {
    const query = buildQueryString({ limit });

    return apiCall<ApiEnvelope<readonly JobCardAuditLog[]>>(
      `${BASE_ENDPOINT}/audit-logs/stream${query}`,
      { method: "GET" },
    );
  },

  async addAuditLog(
    id: string,
    payload: AddJobCardAuditLogPayload,
  ): Promise<ApiEnvelope<JobCardAuditLog>> {
    assertValidId(id);

    return apiCall<ApiEnvelope<JobCardAuditLog>>(
      `${BASE_ENDPOINT}/${encodeURIComponent(id)}/audit-logs`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      { showSuccess: true },
    );
  },

  async getAuditLogs(
    id: string,
  ): Promise<ApiEnvelope<readonly JobCardAuditLog[]>> {
    assertValidId(id);

    return apiCall<ApiEnvelope<readonly JobCardAuditLog[]>>(
      `${BASE_ENDPOINT}/${encodeURIComponent(id)}/audit-logs`,
      { method: "GET" },
    );
  },
};