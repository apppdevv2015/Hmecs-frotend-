// Real-Time Audit Trail & Voice Note Tracking Service
// Syncs directly with PostgreSQL Database Tables: `job_card_audit_logs` & `job_card_voice_notes`
import StorageService, { STORAGE_KEYS } from "../storage.service";
import { jobCardService } from "../Artisans/jobCardService";

export type AuditLogAction =
  | "CREATED"
  | "STATUS_CHANGE"
  | "TIMER_START"
  | "TIMER_PAUSE"
  | "TIMER_FINISH"
  | "PART_ADDED"
  | "FINDING_ADDED"
  | "PHOTO_ATTACHED"
  | "AUDIO_NOTE_ADDED"
  | "SUPERVISOR_APPROVED"
  | "ENGINEERING_CLOSED"
  | "UPDATED";

export interface AuditUser {
  id?: string;
  name: string;
  email?: string;
  role?: string;
}

export interface AuditLogEntry {
  id: string;
  jobCardId: string;
  jobCardNumber?: string;
  timestamp: string;
  formattedTime: string;
  user: AuditUser;
  action: AuditLogAction;
  title: string;
  description: string;
  fieldChanged?: string;
  oldValue?: string;
  newValue?: string;
  badgeColor?: string;
}

export interface AudioVoiceNote {
  id: string;
  jobCardId: string;
  title: string;
  audioUrl: string; // Base64 or Storage URL
  durationSeconds: number;
  recordedBy: AuditUser;
  createdAt: string;
  fileSizeFormatted?: string;
}

const STORAGE_AUDIT_LOGS = "hme_job_card_audit_logs";
const STORAGE_VOICE_NOTES = "hme_job_card_voice_notes";

class AuditTrailService {
  private listeners: (() => void)[] = [];

  public subscribe(callback: () => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private notify(): void {
    this.listeners.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.error("Audit listener error:", err);
      }
    });
  }

  public getCurrentUser(): AuditUser {
    try {
      const stored = StorageService.get<any>(STORAGE_KEYS.USER);
      if (stored) {
        return {
          id: stored.id || stored._id || "usr_current",
          name:
            stored.name ||
            (stored.firstName
              ? `${stored.firstName} ${stored.lastName || ""}`.trim()
              : "") ||
            stored.email?.split("@")[0] ||
            "Operations Admin",
          email: stored.email || "admin@hme.com",
          role: stored.role || "CompanyAdmin",
        };
      }
    } catch {}
    return {
      id: "usr_admin",
      name: "Operations Admin",
      email: "admin@hme.com",
      role: "Company Admin",
    };
  }

  private getAllLogsFromStorage(): AuditLogEntry[] {
    try {
      const data = localStorage.getItem(STORAGE_AUDIT_LOGS);
      if (data) {
        return JSON.parse(data);
      }
    } catch {}
    return [];
  }

  private saveLogsToStorage(logs: AuditLogEntry[]): void {
    try {
      localStorage.setItem(STORAGE_AUDIT_LOGS, JSON.stringify(logs.slice(0, 500)));
    } catch {}
    this.notify();
  }

  /**
   * Log an audit event — Saves to Database Table `job_card_audit_logs` + Local Cache
   */
  public logAction(
    jobCardId: string,
    jobCardNumber: string,
    payload: {
      action: AuditLogAction;
      title: string;
      description: string;
      fieldChanged?: string;
      oldValue?: string;
      newValue?: string;
      badgeColor?: string;
      user?: Partial<AuditUser>;
    }
  ): AuditLogEntry {
    const currentUser = this.getCurrentUser();
    const user: AuditUser = {
      ...currentUser,
      ...(payload.user || {}),
    };

    const now = new Date();
    const formattedTime = now.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    const badgeColor =
      payload.badgeColor || this.getDefaultBadgeColor(payload.action);

    const entry: AuditLogEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      jobCardId,
      jobCardNumber,
      timestamp: now.toISOString(),
      formattedTime,
      user,
      action: payload.action,
      title: payload.title,
      description: payload.description,
      fieldChanged: payload.fieldChanged,
      oldValue: payload.oldValue,
      newValue: payload.newValue,
      badgeColor,
    };

    // 1. Instant local persistence for zero UI lag
    const existing = this.getAllLogsFromStorage();
    existing.unshift(entry);
    this.saveLogsToStorage(existing);

    // 2. Persist to PostgreSQL Database Table `job_card_audit_logs`
    jobCardService
      .addAuditLog(jobCardId, {
        action: payload.action,
        title: payload.title,
        description: payload.description,
        fieldChanged: payload.fieldChanged,
        oldValue: payload.oldValue,
        newValue: payload.newValue,
        badgeColor,
        userName: user.name,
        userRole: user.role,
        userEmail: user.email,
      })
      .then((res) => {
        if (res?.data?.id) {
          entry.id = res.data.id;
        }
      })
      .catch((err) => {
        console.warn("Database audit log sync note:", err?.message);
      });

    return entry;
  }

  /**
   * Get logs for a specific job card from Database Table & Cache
   */
  public getLogsForJobCard(jobCardId: string): AuditLogEntry[] {
    const logs = this.getAllLogsFromStorage();
    return logs.filter((log) => log.jobCardId === jobCardId);
  }

  /**
   * Sync audit logs for a job card directly from the PostgreSQL Database
   */
  public async syncJobCardLogsFromDb(jobCardId: string): Promise<AuditLogEntry[]> {
    try {
      const res = await jobCardService.getAuditLogs(jobCardId);
      if (res?.data && Array.isArray(res.data)) {
        const dbLogs: AuditLogEntry[] = res.data.map((l: any) => ({
          id: l.id,
          jobCardId: l.jobCardId,
          timestamp: l.createdAt,
          formattedTime: new Date(l.createdAt).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          }),
          user: {
            id: l.userId,
            name: l.userName,
            role: l.userRole,
            email: l.userEmail,
          },
          action: l.action,
          title: l.title,
          description: l.description,
          fieldChanged: l.fieldChanged,
          oldValue: l.oldValue,
          newValue: l.newValue,
          badgeColor: l.badgeColor || this.getDefaultBadgeColor(l.action),
        }));

        if (dbLogs.length > 0) {
          const cached = this.getAllLogsFromStorage().filter(
            (l) => l.jobCardId !== jobCardId
          );
          this.saveLogsToStorage([...dbLogs, ...cached]);
          return dbLogs;
        }
      }
    } catch (err) {
      console.warn("Failed to fetch audit logs from database:", err);
    }
    return this.getLogsForJobCard(jobCardId);
  }

  /**
   * Get all logs (global stream)
   */
  public getAllRecentLogs(limit: number = 50): AuditLogEntry[] {
    const logs = this.getAllLogsFromStorage();
    return logs.slice(0, limit);
  }

  // --- Voice Notes API ---
  private getAllVoiceNotesFromStorage(): AudioVoiceNote[] {
    try {
      const data = localStorage.getItem(STORAGE_VOICE_NOTES);
      if (data) {
        return JSON.parse(data);
      }
    } catch {}
    return [];
  }

  private saveVoiceNotesToStorage(notes: AudioVoiceNote[]): void {
    try {
      localStorage.setItem(STORAGE_VOICE_NOTES, JSON.stringify(notes));
    } catch {}
    this.notify();
  }

  public addVoiceNote(
    jobCardId: string,
    jobCardNumber: string,
    payload: {
      title: string;
      audioUrl: string;
      durationSeconds: number;
      fileSizeFormatted?: string;
    }
  ): AudioVoiceNote {
    const currentUser = this.getCurrentUser();
    const now = new Date();

    const note: AudioVoiceNote = {
      id: `audio_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      jobCardId,
      title: payload.title || `Voice Note #${now.toLocaleTimeString()}`,
      audioUrl: payload.audioUrl,
      durationSeconds: payload.durationSeconds,
      fileSizeFormatted: payload.fileSizeFormatted || "Audio Note",
      recordedBy: currentUser,
      createdAt: now.toISOString(),
    };

    const notes = this.getAllVoiceNotesFromStorage();
    notes.unshift(note);
    this.saveVoiceNotesToStorage(notes);

    // Save to PostgreSQL Database Table `job_card_voice_notes`
    jobCardService
      .addVoiceNote(jobCardId, {
        title: note.title,
        audioUrl: note.audioUrl,
        durationSeconds: note.durationSeconds,
        userName: currentUser.name,
        userRole: currentUser.role,
      })
      .then((res) => {
        if (res?.data?.id) {
          note.id = res.data.id;
        }
      })
      .catch((err) => {
        console.warn("Database voice note sync note:", err?.message);
      });

    return note;
  }

  public getVoiceNotesForJobCard(jobCardId: string): AudioVoiceNote[] {
    const notes = this.getAllVoiceNotesFromStorage();
    return notes.filter((n) => n.jobCardId === jobCardId);
  }

  public async syncVoiceNotesFromDb(jobCardId: string): Promise<AudioVoiceNote[]> {
    try {
      const res = await jobCardService.getVoiceNotes(jobCardId);
      if (res?.data && Array.isArray(res.data)) {
        const dbNotes: AudioVoiceNote[] = res.data.map((n: any) => ({
          id: n.id,
          jobCardId: n.jobCardId,
          title: n.title,
          audioUrl: n.audioUrl,
          durationSeconds: parseFloat(n.durationSeconds) || 0,
          recordedBy: {
            id: n.userId,
            name: n.userName,
            role: n.userRole,
          },
          createdAt: n.createdAt,
        }));

        if (dbNotes.length > 0) {
          const cached = this.getAllVoiceNotesFromStorage().filter(
            (n) => n.jobCardId !== jobCardId
          );
          this.saveVoiceNotesToStorage([...dbNotes, ...cached]);
          return dbNotes;
        }
      }
    } catch (err) {
      console.warn("Failed to fetch voice notes from database:", err);
    }
    return this.getVoiceNotesForJobCard(jobCardId);
  }

  public deleteVoiceNote(noteId: string): void {
    const notes = this.getAllVoiceNotesFromStorage().filter((n) => n.id !== noteId);
    this.saveVoiceNotesToStorage(notes);
    jobCardService.deleteVoiceNote(noteId).catch(() => {});
  }

  /**
   * Seed realistic sample audit logs for job cards if none exist
   */
  public seedInitialLogsIfEmpty(jobCards: any[]): void {
    const existing = this.getAllLogsFromStorage();
    if (existing.length > 0) return;

    const initialLogs: AuditLogEntry[] = [];
    const now = new Date();

    jobCards.forEach((card, idx) => {
      const minutesAgo = (idx + 1) * 35;
      const eventTime = new Date(now.getTime() - minutesAgo * 60000);
      const formattedTime = eventTime.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      // Creation entry
      initialLogs.push({
        id: `audit_seed_create_${card.id}`,
        jobCardId: card.id,
        jobCardNumber: card.jobCardNumber || `JC-00${idx + 1}`,
        timestamp: eventTime.toISOString(),
        formattedTime,
        user: {
          name: card.assignedPlannerName || "Maintenance Planner",
          role: "Engineering Head",
          email: "planner@hme.com",
        },
        action: "CREATED",
        title: "Work Order Created & Scheduled",
        description: `Work order created for ${card.machine?.name || "Asset"} with ${card.priority || "MEDIUM"} priority.`,
        oldValue: "NEW",
        newValue: card.status || "OPEN",
        badgeColor: "text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800",
      });

      // If in progress or assigned, add transition log
      if (card.status === "IN_PROGRESS" || card.status === "COMPLETED") {
        const progressTime = new Date(eventTime.getTime() + 15 * 60000);
        initialLogs.push({
          id: `audit_seed_prog_${card.id}`,
          jobCardId: card.id,
          jobCardNumber: card.jobCardNumber || `JC-00${idx + 1}`,
          timestamp: progressTime.toISOString(),
          formattedTime: progressTime.toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          }),
          user: {
            name: card.assignedTechnicianName || "Lead Technician",
            role: "Field Artisan",
            email: "artisan@hme.com",
          },
          action: "STATUS_CHANGE",
          title: `Status Changed to ${card.status}`,
          description: `Work commenced on site. Artisan clocked in labor timer.`,
          oldValue: "OPEN",
          newValue: card.status,
          badgeColor: "text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800",
        });
      }
    });

    if (initialLogs.length > 0) {
      this.saveLogsToStorage(initialLogs);
    }
  }

  private getDefaultBadgeColor(action: AuditLogAction): string {
    switch (action) {
      case "CREATED":
        return "text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800";
      case "STATUS_CHANGE":
        return "text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800";
      case "TIMER_START":
        return "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800";
      case "TIMER_PAUSE":
        return "text-orange-600 bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800";
      case "TIMER_FINISH":
        return "text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800";
      case "PART_ADDED":
        return "text-purple-600 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800";
      case "FINDING_ADDED":
        return "text-cyan-600 bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800";
      case "PHOTO_ATTACHED":
        return "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800";
      case "AUDIO_NOTE_ADDED":
        return "text-rose-600 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800";
      case "SUPERVISOR_APPROVED":
      case "ENGINEERING_CLOSED":
        return "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800";
      default:
        return "text-slate-600 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700";
    }
  }
}

export const auditTrailService = new AuditTrailService();
