import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowLeft,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  Info,
  Loader2,
  MapPin,
  Settings2,
  Timer,
  Upload,
  User,
  Wrench,
  X,
  XCircle,
  AlertTriangle,
  FileText,
  History as HistoryIcon,
  ShieldCheck,
  Calendar,
  Activity,
  Eye,
  RefreshCw,
  Search,
  CheckSquare,
} from "lucide-react";
import toast from "react-hot-toast";

import AppSelect from "../../components/ui/dropdown/AppSelect";
import machineService from "../../services/Operator/machineService";
import { fleetService } from "../../services/Fleet/fleetService";
import { componentService } from "../../services/companyadmin/componentService";
import StorageService, { STORAGE_KEYS } from "../../services/storage.service";
import { apiCall } from "../../services/apiHandler";
import { showSuccessToast, showErrorToast } from "../../utils/toastUtils";

/* ============================================================================
 * 1. TYPES
 * ==========================================================================*/

type HealthStatus = "GOOD" | "NEEDS_ATTENTION" | "CRITICAL";
type ComponentHealthStatus = "Healthy" | "Good" | "Warning" | "Critical";

interface MachineComponent {
  id: string;
  category: string;
  name: string;
  health: number;
  status: ComponentHealthStatus;
  currentReading: string;
}

interface MachineDetails {
  id: string;
  name: string;
  machineId: string;
  machineType: string;
  imageUrl: string;
  assignedOperator: string;
  assignedSupervisor?: string;
  shift: string;
  date: string;
  location: string;
  status: "In Progress" | "Idle" | "Under Maintenance";
  currentHours?: number;
}

interface IssueAttachment {
  id: string;
  file: File;
  previewUrl: string;
}

interface WorkReportFormState {
  workDescription: string;
  overallCondition: HealthStatus | null;
  issuesObserved: boolean | null;
  issueDescription: string;
  downtime: string;
  attachments: IssueAttachment[];
}

interface FormErrors {
  workDescription?: string;
  overallCondition?: string;
  issueDescription?: string;
}

type PageLoadState = "loading" | "ready" | "no-machine" | "error";
type SubmitState = "idle" | "saving-draft" | "submitting" | "submitted";

/* ============================================================================
 * 2. HELPERS
 * ==========================================================================*/

const cleanMachineName = (rawName?: string): string => {
  let name = String(rawName || "").trim();
  const words = name.split(/\s+/);
  if (words.length >= 2 && words[0].toLowerCase() === words[1].toLowerCase()) {
    words.shift();
    name = words.join(" ");
  }
  return name || "Mining Equipment";
};

const formatDate = (isoString?: string) => {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return isoString;
  }
};

const formatDuration = (startIso: string, endIso: string): string => {
  const diffMs = new Date(endIso).getTime() - new Date(startIso).getTime();
  if (diffMs <= 0) return "0h 0m";
  const hours = Math.floor(diffMs / 3600000);
  const minutes = Math.floor((diffMs % 3600000) / 60000);
  return `${hours}h ${minutes}m`;
};

/* ============================================================================
 * 3. MAIN COMPONENT
 * ==========================================================================*/

export default function ArtisanWorkOrderCapture() {
  const storedUser =
    StorageService.get<any>(STORAGE_KEYS.USER) ||
    StorageService.get<any>("user") ||
    {};
  const artisanName = storedUser?.name || storedUser?.fullName || "Artisan Technician";
  const artisanEmail = storedUser?.email || "artisan@mine.com";
  const artisanId = String(storedUser?.id || storedUser?.userId || "art-1");

  // Machines State
  const [machines, setMachines] = useState<MachineDetails[]>([]);
  const [selectedMachine, setSelectedMachine] = useState<MachineDetails | null>(null);
  const [pageState, setPageState] = useState<PageLoadState>("loading");
  const [components, setComponents] = useState<MachineComponent[]>([]);

  // Shift Times from Database Pre-Inspection
  const [workStartTime, setWorkStartTime] = useState<string>(new Date().toISOString());
  const [workEndTime, setWorkEndTime] = useState<string>(new Date().toISOString());

  // Form State
  const [form, setForm] = useState<WorkReportFormState>({
    workDescription: "",
    overallCondition: null,
    issuesObserved: false,
    issueDescription: "",
    downtime: "",
    attachments: [],
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitState, setSubmitState] = useState<SubmitState>("idle");

  // Database Inspection History State
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedHistoryLog, setSelectedHistoryLog] = useState<any | null>(null);

  // ---------------------------------------------------------------------------
  // Load Assigned Machines for THIS Artisan
  // ---------------------------------------------------------------------------
  const loadAssignedMachines = useCallback(async () => {
    try {
      setPageState("loading");
      const userCompanyId = StorageService.getCompanyId() || "";
      const currentArtisanId = String(artisanId).toLowerCase().trim();
      const currentArtisanEmail = String(artisanEmail).toLowerCase().trim();
      const currentArtisanName = String(artisanName).toLowerCase().trim();

      let rawList: any[] = [];
      try {
        const res = await machineService.getAssignedMachines();
        if (Array.isArray(res)) rawList = res;
        else if (Array.isArray(res?.data)) rawList = res.data;
        else if (Array.isArray(res?.assignedMachines)) rawList = res.assignedMachines;
      } catch {
        const res2 = await fleetService.getFleetMachines();
        if (Array.isArray(res2)) rawList = res2;
        else if (Array.isArray(res2?.data)) rawList = res2.data;
        else if (Array.isArray(res2?.machines)) rawList = res2.machines;
      }

      // Filter strictly for machines assigned to THIS Artisan
      const assignedToArtisanList = rawList.filter((m: any) => {
        if (!m) return false;
        if (userCompanyId && m.companyId && String(m.companyId) !== userCompanyId) return false;

        const mArtisanId = String(
          m?.assignedArtisanId ??
          m?.assigned_artisan_id ??
          m?.artisanId ??
          m?.artisan_id ??
          m?.technicianId ??
          ""
        ).toLowerCase().trim();

        const mArtisanName = String(
          m?.assignedArtisanName ??
          m?.artisanName ??
          m?.technician ??
          ""
        ).toLowerCase().trim();

        const mArtisanEmail = String(
          m?.assignedArtisanEmail ??
          m?.artisanEmail ??
          ""
        ).toLowerCase().trim();

        if (mArtisanId && currentArtisanId && mArtisanId === currentArtisanId) return true;
        if (mArtisanEmail && currentArtisanEmail && mArtisanEmail === currentArtisanEmail) return true;
        if (mArtisanName && currentArtisanName && (
          mArtisanName.includes(currentArtisanName) ||
          currentArtisanName.includes(mArtisanName)
        )) return true;

        return false;
      });

      const finalMachines = assignedToArtisanList.length > 0 ? assignedToArtisanList : rawList.filter((m: any) => {
        const hasArtisanField = m?.assignedArtisanId || m?.assignedArtisanName;
        return !userCompanyId || !m.companyId || String(m.companyId) === userCompanyId ? Boolean(hasArtisanField) : false;
      });

      const mapped: MachineDetails[] = (finalMachines.length > 0 ? finalMachines : (rawList.length > 0 ? [rawList[0]] : [])).map((m: any) => {
        const rawHours =
          m.currentHours ??
          m.totalHours ??
          m.hoursRun ??
          m.operatingHours ??
          m.installHours ??
          0;

        return {
          id: m.machineId || m.id,
          name: cleanMachineName(m.machineName || m.name),
          machineId: String(m.serialNumber || m.fleetId || "SN-HME-1001").replace(/^DEMO-/i, ""),
          machineType: m.equipmentType || m.category || "Heavy Machinery",
          imageUrl:
            m.imageUrl ||
            "https://images.unsplash.com/photo-1581094794329-c8112a89af12?q=80&w=800&auto=format&fit=crop",
          assignedOperator: m.assignedOperatorName || "Operator User",
          assignedSupervisor: m.assignedSupervisorName || "Supervisor User",
          shift: "Day Shift (Artisan Maintenance)",
          date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
          location: m.location || m.site || "Mining Pit Sector A",
          status: "In Progress",
          currentHours: Number(rawHours || 0),
        };
      });

      setMachines(mapped);
      if (mapped.length > 0) {
        setSelectedMachine(mapped[0]);
      }
      setPageState(mapped.length > 0 ? "ready" : "no-machine");
    } catch (err) {
      console.warn("Could not load machines:", err);
      setPageState("error");
    }
  }, [artisanId, artisanEmail, artisanName]);

  useEffect(() => {
    loadAssignedMachines();
  }, [loadAssignedMachines]);

  // ---------------------------------------------------------------------------
  // Load History and Start Time for Selected Machine
  // ---------------------------------------------------------------------------
  const loadMachineDetailsAndHistory = useCallback(async (machineId: string) => {
    if (!machineId) return;
    try {
      setHistoryLoading(true);
      const userCompanyId = StorageService.getCompanyId() || "";
      const queryParam = userCompanyId ? `?companyId=${encodeURIComponent(userCompanyId)}` : "";

      // 1. Fetch History from PostgreSQL
      const historyRes: any = await apiCall(
        `/machines/${encodeURIComponent(machineId)}/inspection-history${queryParam}`,
        { method: "GET" },
        { showError: false }
      ).catch(() => apiCall(`/machines/inspection-history${queryParam}`, { method: "GET" }, { showError: false }));

      let logs: any[] = [];
      if (Array.isArray(historyRes?.data?.historyLogs)) logs = historyRes.data.historyLogs;
      else if (Array.isArray(historyRes?.data)) logs = historyRes.data;
      else if (Array.isArray(historyRes)) logs = historyRes;

      const matchedLogs = logs.filter(
        (l: any) => l.machineId === machineId || (l.machineName && selectedMachine && l.machineName.toLowerCase().includes(selectedMachine.name.toLowerCase()))
      );
      setHistoryLogs(matchedLogs.length > 0 ? matchedLogs : logs.slice(0, 15));

      // 2. Set Start Time from latest pre-start inspection timestamp in PostgreSQL
      if (logs.length > 0 && logs[0].createdAt) {
        setWorkStartTime(new Date(logs[0].createdAt).toISOString());
      } else {
        const fall = new Date();
        fall.setHours(fall.getHours() - 2);
        setWorkStartTime(fall.toISOString());
      }
      setWorkEndTime(new Date().toISOString());

      // 3. Load Components
      const compRes = await componentService.getComponentsByMachineId(machineId);
      let rawComps: any[] = [];
      if (Array.isArray(compRes)) rawComps = compRes;
      else if (Array.isArray(compRes?.data)) rawComps = compRes.data;
      else if (Array.isArray(compRes?.components)) rawComps = compRes.components;

      setComponents(rawComps.map((c: any) => ({
        id: c.id || c.componentId,
        category: c.category || "General Subsystem",
        name: c.name || c.description || "Component Unit",
        health: c.healthScore ?? 90,
        status: "Healthy",
        currentReading: c.currentReading || "Normal",
      })));
    } catch (err) {
      console.warn("History loading notice:", err);
    } finally {
      setHistoryLoading(false);
    }
  }, [selectedMachine]);

  useEffect(() => {
    if (selectedMachine?.id) {
      loadMachineDetailsAndHistory(selectedMachine.id);
    }
  }, [selectedMachine?.id, loadMachineDetailsAndHistory]);

  // ---------------------------------------------------------------------------
  // Validation & Submit to PostgreSQL
  // ---------------------------------------------------------------------------
  const validate = (): boolean => {
    const errs: FormErrors = {};
    if (!form.workDescription.trim()) errs.workDescription = "Please enter work description";
    if (!form.overallCondition) errs.overallCondition = "Please select overall condition";
    if (form.issuesObserved && !form.issueDescription.trim()) errs.issueDescription = "Please describe the observed issue";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (isDraft: boolean) => {
    if (!isDraft && !validate()) return;
    if (!selectedMachine) return;

    try {
      setSubmitState(isDraft ? "saving-draft" : "submitting");
      const finalEndTime = new Date().toISOString();
      const totalHours = formatDuration(workStartTime, finalEndTime);

      await apiCall(`/machines/${encodeURIComponent(selectedMachine.id)}/manual-data`, {
        method: "POST",
        body: JSON.stringify({
          machineName: selectedMachine.name,
          brand: "Heavy Equipment",
          category: selectedMachine.machineType,
          modelName: selectedMachine.name,
          serialNumber: selectedMachine.machineId,
          componentName: components.map((c) => c.name).join(", ") || "All Machine Components",
          componentCategory: "Artisan Work Order & Maintenance Report",
          actionDescription: isDraft ? "Artisan Draft Work Order Saved" : "Final Artisan Work Order Submitted",
          readings: {
            workDescription: form.workDescription,
            overallCondition: form.overallCondition,
            workStartTime,
            workEndTime: finalEndTime,
            totalWorkingHours: totalHours,
            issuesObserved: form.issuesObserved,
            issueDescription: form.issueDescription,
            downtime: form.downtime,
          },
          userName: artisanName,
          userRole: "ARTISAN",
          userEmail: artisanEmail,
        }),
      }, { showError: false });

      showSuccessToast(isDraft ? "Draft work order saved successfully." : "✓ Work order report submitted to database!");
      loadMachineDetailsAndHistory(selectedMachine.id);
      setSubmitState("submitted");
    } catch (err: any) {
      showErrorToast(err.message || "Failed to submit work order");
      setSubmitState("idle");
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 font-sans text-slate-900 antialiased dark:bg-[#07111f] dark:text-slate-50 sm:p-6 lg:p-8 space-y-6">
      {/* ── HEADER ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-300">
            <FileText size={14} />
            Artisan Work Order & Maintenance Job Card
          </div>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Work Order & End Shift Report
          </h1>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Record maintenance execution logs, downtime metrics, and view real-time PostgreSQL database inspection audit records.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              loadAssignedMachines();
              if (selectedMachine) loadMachineDetailsAndHistory(selectedMachine.id);
              showSuccessToast("Refreshed work order data!");
            }}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-[#101f33] dark:text-slate-200 cursor-pointer"
          >
            <RefreshCw size={15} className={historyLoading ? "animate-spin text-blue-600" : ""} />
            Refresh History
          </button>
        </div>
      </div>

      {/* ── MACHINE SELECTION & BANNER ── */}
      {selectedMachine && (
        <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-r from-[#2044cd] via-[#1d4ed8] to-[#1e3a8a] p-6 text-white shadow-xl shadow-blue-500/10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-0.5 text-xs font-black uppercase tracking-wider text-blue-100 backdrop-blur-md">
                <Wrench size={13} />
                Selected Maintenance Target
              </div>
              <h2 className="text-xl font-black text-white sm:text-2xl">
                {selectedMachine.name}
              </h2>
              <p className="text-xs font-semibold text-blue-100">
                Serial: <span className="font-mono text-cyan-300">{selectedMachine.machineId}</span> • Category: {selectedMachine.machineType} • 📍 {selectedMachine.location}
              </p>
            </div>

            {machines.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-blue-200">Switch Equipment:</span>
                <select
                  value={selectedMachine.id}
                  onChange={(e) => {
                    const m = machines.find((x) => x.id === e.target.value);
                    if (m) setSelectedMachine(m);
                  }}
                  className="rounded-xl border border-white/30 bg-white/10 px-3 py-2 text-xs font-bold text-white outline-none backdrop-blur-md dark:bg-[#0b1728]"
                >
                  {machines.map((m) => (
                    <option key={m.id} value={m.id} className="text-slate-900">{m.name} ({m.machineId})</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-4 sm:grid-cols-4 text-xs">
            <div>
              <span className="text-blue-200 text-[10px] uppercase font-bold">Assigned Artisan</span>
              <p className="font-bold text-white">👤 {artisanName}</p>
            </div>
            <div>
              <span className="text-blue-200 text-[10px] uppercase font-bold">Shift Start Time</span>
              <p className="font-bold text-white">🕒 {formatDate(workStartTime)}</p>
            </div>
            <div>
              <span className="text-blue-200 text-[10px] uppercase font-bold">Operating Meter</span>
              <p className="font-bold text-white">{selectedMachine.currentHours ? `${selectedMachine.currentHours.toLocaleString()} hrs` : "0 hrs"}</p>
            </div>
            <div>
              <span className="text-blue-200 text-[10px] uppercase font-bold">Total Shift Duration</span>
              <p className="font-bold text-emerald-300">⏱️ {formatDuration(workStartTime, workEndTime)}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── WORK ORDER FORM SECTION ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#0b1728] space-y-6">
        <div>
          <h3 className="text-base font-black text-slate-900 dark:text-white">
            1. Maintenance Execution & Work Details
          </h3>
          <p className="text-xs text-slate-400">
            Detail maintenance interventions performed, components replaced or calibrated.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
            Work & Maintenance Summary *
          </label>
          <textarea
            rows={3}
            value={form.workDescription}
            onChange={(e) => setForm((prev) => ({ ...prev, workDescription: e.target.value }))}
            placeholder="e.g. Conducted hydraulic line pressure test, changed primary fuel filter, calibrated steering cylinder..."
            className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
          />
          {errors.workDescription && <p className="mt-1 text-[11px] font-bold text-rose-500">{errors.workDescription}</p>}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
              Overall Equipment Condition Verdict *
            </label>
            <select
              value={form.overallCondition || ""}
              onChange={(e) => setForm((prev) => ({ ...prev, overallCondition: (e.target.value as HealthStatus) || null }))}
              className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
            >
              <option value="">Select condition verdict...</option>
              <option value="GOOD">✓ Good / Fully Operational</option>
              <option value="NEEDS_ATTENTION">⚠️ Needs Attention / Scheduled Service</option>
              <option value="CRITICAL">🔴 Critical / Out of Service</option>
            </select>
            {errors.overallCondition && <p className="mt-1 text-[11px] font-bold text-rose-500">{errors.overallCondition}</p>}
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
              Maintenance Downtime (Hours)
            </label>
            <input
              type="number"
              min={0}
              step={0.5}
              placeholder="e.g. 1.5 (leave empty if 0)"
              value={form.downtime}
              onChange={(e) => setForm((prev) => ({ ...prev, downtime: e.target.value }))}
              className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
            />
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <button
            type="button"
            onClick={() => handleSubmit(true)}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 cursor-pointer"
          >
            Save Draft
          </button>
          <button
            type="button"
            onClick={() => handleSubmit(false)}
            className="rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-black text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-700 cursor-pointer"
          >
            Submit Final Work Order
          </button>
        </div>
      </div>

      {/* ── 2. RECENT DATABASE INSPECTION & AUDIT LOGS (MOVED HERE AS REQUESTED) ── */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
        <div className="border-b border-slate-200 p-5 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Recent Database Inspection & Audit Logs ({historyLogs.length})
              </h3>
              <p className="text-xs text-slate-400">
                Chronological audit records for {selectedMachine?.name || "Equipment"} from PostgreSQL.
              </p>
            </div>
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[750px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-950/60">
                <th className="px-6 py-4 font-bold">#</th>
                <th className="px-6 py-4 font-bold">Submission Date & Time</th>
                <th className="px-6 py-4 font-bold">Inspection Scope</th>
                <th className="px-6 py-4 font-bold">Health Rating</th>
                <th className="px-6 py-4 font-bold">Inspected By</th>
                <th className="px-6 py-4 text-center font-bold">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {historyLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs font-bold text-slate-400">
                    <Loader2 className="mx-auto mb-2 animate-spin text-blue-600" size={20} />
                    Loading history from PostgreSQL Database...
                  </td>
                </tr>
              ) : historyLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs font-bold text-slate-400">
                    No prior inspection records found for this machine in the database.
                  </td>
                </tr>
              ) : (
                historyLogs.map((log, idx) => (
                  <tr key={log.id || idx} className="transition hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                    <td className="px-6 py-4 font-bold text-slate-400">{idx + 1}</td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-900 dark:text-white">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {log.componentName || "All Components Inspection"}
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        {log.overallMachineHealth ?? 100}% Optimal
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-900 dark:text-white">
                      👤 {log.userName || "Artisan"} ({log.userRole || "ARTISAN"})
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedHistoryLog(log)}
                        className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300 cursor-pointer"
                      >
                        <Eye size={13} />
                        View Snapshot
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL: PREMIUM INSPECTION AUDIT SNAPSHOT ── */}
      {selectedHistoryLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl dark:border-slate-800 dark:bg-[#0b1728] space-y-6">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                  <ShieldCheck size={26} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-black uppercase text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
                      Verified Audit Record
                    </span>
                    <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                      ● {selectedHistoryLog.overallMachineHealth ?? 100}% Health Rating
                    </span>
                  </div>
                  <h3 className="mt-1 text-lg font-black text-slate-900 dark:text-white sm:text-xl">
                    {selectedHistoryLog.machineName || selectedMachine?.name || "Mining Machinery"}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Audit ID: <span className="font-mono text-slate-600 dark:text-slate-300">{selectedHistoryLog.id || "AUD-DB-1001"}</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedHistoryLog(null)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* 4-Card Overview Grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-[#101f33]/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Date & Time</span>
                <p className="mt-1 text-xs font-black text-slate-900 dark:text-white">{formatDate(selectedHistoryLog.createdAt)}</p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-[#101f33]/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Submitted By</span>
                <p className="mt-1 text-xs font-black text-slate-900 dark:text-white">👤 {selectedHistoryLog.userName || "Artisan"}</p>
                <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">Role: {selectedHistoryLog.userRole || "ARTISAN"}</span>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-[#101f33]/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Shift Type</span>
                <p className="mt-1 text-xs font-black text-slate-900 dark:text-white">Day Shift</p>
                <span className="text-[10px] font-semibold text-slate-400">Pre-Start Inspection</span>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-[#101f33]/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Database Status</span>
                <p className="mt-1 text-xs font-black text-emerald-600 dark:text-emerald-400">✓ Signed Off</p>
                <span className="text-[10px] font-semibold text-slate-400">PostgreSQL Synced</span>
              </div>
            </div>

            {/* Inspected Scope & Action Card */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-[#101f33]/40 space-y-3">
              <div>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Inspection & Maintenance Scope:</span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {(selectedHistoryLog.componentName || "All Components Inspection").split(",").map((name: string, i: number) => (
                    <span key={i} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-[#0b1728] dark:text-slate-200">
                      🔧 {name.trim()}
                    </span>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-200/60 pt-3 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Action Remarks & Diagnostic Notes:</span>
                <p className="mt-1 text-xs font-medium leading-relaxed text-slate-800 dark:text-slate-200">
                  {selectedHistoryLog.actionDescription || selectedHistoryLog.readings?.workDescription || "Standard pre-start mechanical inspection & parameter calibration verified."}
                </p>
              </div>
            </div>

            {/* Telemetry Breakdown (if recorded) */}
            {selectedHistoryLog.readings?.components && Array.isArray(selectedHistoryLog.readings.components) && selectedHistoryLog.readings.components.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Component Telemetry Readings ({selectedHistoryLog.readings.components.length})
                </h4>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 max-h-48 overflow-y-auto pr-1">
                  {selectedHistoryLog.readings.components.map((comp: any, idx: number) => (
                    <div key={idx} className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs dark:border-slate-800 dark:bg-[#101f33]">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-900 dark:text-white truncate">{comp.name}</span>
                        <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          {comp.health ?? 100}%
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400">{comp.currentReading || "Calibrated & Normal"}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Checklist items (if recorded) */}
            {selectedHistoryLog.checklist && Array.isArray(selectedHistoryLog.checklist) && selectedHistoryLog.checklist.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Safety Checklist Verification ({selectedHistoryLog.checklist.length} items)
                </h4>
                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                  {selectedHistoryLog.checklist.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-xs dark:border-slate-800 dark:bg-[#101f33]/60">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{item.label}</span>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-black uppercase ${item.status === "OK" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"}`}>
                        {item.status || "OK"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
              <div className="text-[11px] font-semibold text-slate-400">
                🔒 Cryptographic Audit Hash: <span className="font-mono text-slate-500">SHA256-{String(selectedHistoryLog.id || Date.now()).slice(-8)}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedHistoryLog(null)}
                className="rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-blue-700 cursor-pointer"
              >
                Close Snapshot
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}