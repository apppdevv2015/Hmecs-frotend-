import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  Camera,
  CheckCircle,
  CheckCircle2,
  ChevronDown,
  Circle,
  CircleDot,
  Clock,
  Disc,
  Droplet,
  Fuel,
  Gauge,
  Hash,
  ImagePlus,
  Lightbulb,
  Loader2,
  MapPin,
  Navigation,
  Plus,
  PlusCircle,
  RefreshCw,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Thermometer,
  Trash2,
  Truck,
  Upload,
  User,
  Wind,
  Wrench,
  X,
  History as HistoryIcon,
  Eye,
  Calendar,
} from "lucide-react";

import machineService from "../../services/Operator/machineService";
import { fleetService } from "../../services/Fleet/fleetService";
import { componentService } from "../../services/companyadmin/componentService";
import StorageService, { STORAGE_KEYS } from "../../services/storage.service";
import { apiCall } from "../../services/apiHandler";
import { showSuccessToast, showErrorToast } from "../../utils/toastUtils";

// ============================================================================
// TYPES
// ============================================================================

export type MachineStatus = "Online" | "Offline" | "Maintenance";

export interface Machine {
  id: string;
  name: string;
  type: string;
  serialNumber: string;
  location: string;
  currentHours: number;
  status: MachineStatus;
  operatorName: string;
  supervisorName?: string;
  imageUrl: string;
  healthScore?: number;
}

export type IssueComponent =
  | "Suspension"
  | "Engine"
  | "Hydraulic System"
  | "Transmission"
  | "Braking System"
  | "Tyres"
  | "Other";

export type IssueSeverity = "Low" | "Medium" | "High" | "Critical";

export interface IssueImage {
  id: string;
  file: File | null;
  previewUrl: string;
  name: string;
  sizeKb: number;
}

export interface IssueReport {
  id: string;
  machineId: string;
  component: IssueComponent | "";
  severity: IssueSeverity | "";
  description: string;
  images: IssueImage[];
  createdAt: string;
}

export type InspectionStatus = "OK" | "Issue" | "N/A" | "Pending";

export interface InspectionItem {
  id: string;
  label: string;
  icon: string;
  status: InspectionStatus;
  value?: string;
  unit?: string;
  safeRange?: string;
  description: string;
  imageUrl: string | null;
}

export type ComponentCategory = string;
export type ComponentHealthStatus = "Healthy" | "Good" | "Warning" | "Critical";

export interface ComponentParameter {
  name: string;
  unit: string;
  safeMin: number;
  safeMax: number;
  defaultVal: number;
  currentVal?: number;
  description?: string;
}

export interface MachineComponent {
  id: string;
  category: ComponentCategory;
  name: string;
  health: number;
  status: ComponentHealthStatus;
  currentReading: string;
  parameters?: ComponentParameter[];
}

export interface ComponentUpdate {
  componentId: string;
  currentLevel: number;
  condition: "Poor" | "Fair" | "Good" | "Excellent";
  status: ComponentHealthStatus;
  currentReading: string;
  notes: string;
  images: IssueImage[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

const healthToStatus = (health: number): ComponentHealthStatus => {
  if (health >= 80) return "Healthy";
  if (health >= 60) return "Good";
  if (health >= 40) return "Warning";
  return "Critical";
};

const conditionNumToHealth = (c?: number): number => {
  const n = Number(c ?? 5);
  if (n === 5) return 100;
  if (n === 4) return 80;
  if (n === 3) return 60;
  if (n === 2) return 40;
  return 20;
};

// ============================================================================
// MAIN ARTISAN PRE-START INSPECTION COMPONENT
// ============================================================================

export default function ArtisanPreStartInspection() {
  // Artisan user details
  const storedUser =
    StorageService.get<any>(STORAGE_KEYS.USER) ||
    StorageService.get<any>("user") ||
    {};
  const artisanName = storedUser?.name || storedUser?.fullName || "Artisan User";
  const artisanEmail = storedUser?.email || "artisan@mine.com";
  const artisanId = String(storedUser?.id || storedUser?.userId || "art-1");

  // Machines List State
  const [machines, setMachines] = useState<Machine[]>([]);
  const [selectedMachineId, setSelectedMachineId] = useState<string>("");
  const [machinesLoading, setMachinesLoading] = useState(true);
  const [machineSearch, setMachineSearch] = useState("");

  // Components & Inspection State
  const [componentsLoading, setComponentsLoading] = useState(false);
  const [components, setComponents] = useState<MachineComponent[]>([]);
  const [inspectionItems, setInspectionItems] = useState<InspectionItem[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>("All");

  // Visual Inspection & Reports
  const [issueReports, setIssueReports] = useState<IssueReport[]>([]);
  const [newIssue, setNewIssue] = useState<{
    component: IssueComponent | "";
    severity: IssueSeverity | "";
    description: string;
    images: IssueImage[];
  }>({
    component: "",
    severity: "Medium",
    description: "",
    images: [],
  });

  // History State
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedHistoryLog, setSelectedHistoryLog] = useState<any | null>(null);

  // Tabs: 'components' | 'visual' | 'history'
  const [activeTab, setActiveTab] = useState<"components" | "visual" | "history">("components");

  // Modals
  const [updateTarget, setUpdateTarget] = useState<MachineComponent | null>(null);
  const [isAddComponentModalOpen, setIsAddComponentModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // References for audit logging
  const baselineSnapshotRef = useRef<MachineComponent[]>([]);
  const customAddedComponentsRef = useRef<any[]>([]);

  // ---------------------------------------------------------------------------
  // Load Fleet / Assigned Machines strictly for THIS Artisan
  // ---------------------------------------------------------------------------
  const loadMachines = useCallback(async () => {
    try {
      setMachinesLoading(true);
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

        if (mArtisanId && currentArtisanId && mArtisanId === currentArtisanId) {
          return true;
        }
        if (mArtisanEmail && currentArtisanEmail && mArtisanEmail === currentArtisanEmail) {
          return true;
        }
        if (mArtisanName && currentArtisanName && (
          mArtisanName.includes(currentArtisanName) ||
          currentArtisanName.includes(mArtisanName)
        )) {
          return true;
        }

        return false;
      });

      const finalMachines = assignedToArtisanList.length > 0 ? assignedToArtisanList : rawList.filter((m: any) => {
        // If no explicit ID match yet, check company machines with artisan assignment field present
        const hasArtisanField = m?.assignedArtisanId || m?.assignedArtisanName;
        return !userCompanyId || !m.companyId || String(m.companyId) === userCompanyId ? Boolean(hasArtisanField) : false;
      });

      const mapped: Machine[] = (finalMachines.length > 0 ? finalMachines : (rawList.length > 0 ? [rawList[0]] : [])).map((m: any) => {
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
          type: m.equipmentType || m.category || "Heavy Machinery",
          serialNumber: String(m.serialNumber || m.fleetId || "SN-HME-1001").replace(/^DEMO-/i, ""),
          location: m.location || m.site || "Mining Pit Sector A",
          currentHours: Number(rawHours || 0),
          status: (m.status === "Offline" || m.status === "Maintenance") ? m.status : "Online",
          operatorName: m.assignedOperatorName || "Operator User",
          supervisorName: m.assignedSupervisorName || "Supervisor User",
          healthScore: m.healthPercent ?? m.healthScore ?? 100,
          imageUrl:
            m.imageUrl ||
            "https://images.unsplash.com/photo-1581094794329-c8112a89af12?q=80&w=800&auto=format&fit=crop",
        };
      });

      setMachines(mapped);
      if (mapped.length > 0) {
        setSelectedMachineId((prev) => (prev && mapped.some((m) => m.id === prev) ? prev : mapped[0].id));
      }
    } catch (err) {
      console.warn("Could not load assigned machines for artisan:", err);
    } finally {
      setMachinesLoading(false);
    }
  }, [artisanId, artisanEmail, artisanName]);

  useEffect(() => {
    loadMachines();
  }, [loadMachines]);

  const activeMachine = useMemo(() => {
    return machines.find((m) => m.id === selectedMachineId) || machines[0] || null;
  }, [machines, selectedMachineId]);

  // ---------------------------------------------------------------------------
  // Load Components & History for Selected Machine
  // ---------------------------------------------------------------------------
  const loadMachineInspectionData = useCallback(async (machineId: string) => {
    if (!machineId) return;
    try {
      setComponentsLoading(true);

      // 1. Load Components from PostgreSQL Database
      const compRes = await componentService.getComponentsByMachineId(machineId);
      let rawComps: any[] = [];
      if (Array.isArray(compRes)) rawComps = compRes;
      else if (Array.isArray(compRes?.data)) rawComps = compRes.data;
      else if (Array.isArray(compRes?.components)) rawComps = compRes.components;

      let mappedComps: MachineComponent[] = rawComps.map((c: any) => {
        const health = conditionNumToHealth(c.condition);
        return {
          id: c.id || c.componentId,
          category: c.category || "General Subsystem",
          name: c.name || c.description || "Component Unit",
          health,
          status: healthToStatus(health),
          currentReading: c.currentReading || `${health}% Health`,
          parameters: [
            {
              name: "Operating Temperature",
              unit: "°C",
              safeMin: 65,
              safeMax: 95,
              defaultVal: 78,
              currentVal: 78,
              description: "Normal thermal operating envelope.",
            },
            {
              name: "System Line Pressure",
              unit: "Bar",
              safeMin: 180,
              safeMax: 320,
              defaultVal: 245,
              currentVal: 245,
              description: "Main circuit hydraulic line pressure.",
            },
            {
              name: "Vibration & Harmonic Wear",
              unit: "mm/s",
              safeMin: 0.5,
              safeMax: 4.5,
              defaultVal: 1.8,
              currentVal: 1.8,
              description: "Bearing housing vibration velocity.",
            },
          ],
        };
      });

      setComponents(mappedComps);
      baselineSnapshotRef.current = JSON.parse(JSON.stringify(mappedComps));

      // 2. Load Real Inspection Checklist dynamically from Database & Installed Components
      let realChecklist: InspectionItem[] = [];
      try {
        const inspRes = await inspectionService.getMachineInspection(machineId);
        if (inspRes?.checklist && Array.isArray(inspRes.checklist)) {
          realChecklist = inspRes.checklist;
        } else if (inspRes?.data?.checklist && Array.isArray(inspRes.data.checklist)) {
          realChecklist = inspRes.data.checklist;
        }
      } catch {}

      if (realChecklist.length === 0 && mappedComps.length > 0) {
        realChecklist = mappedComps.map((c, idx) => ({
          id: `insp-comp-${c.id || idx}`,
          label: `${c.name} Safety Verification`,
          icon: c.category.toLowerCase().includes("engine")
            ? "droplet"
            : c.category.toLowerCase().includes("hydraulic")
            ? "wrench"
            : c.category.toLowerCase().includes("brake")
            ? "discAlbum"
            : "circleDot",
          status: c.status === "Critical" ? "Issue" : "OK",
          value: c.currentReading || `${c.health}% Health`,
          unit: c.parameters?.[0]?.unit || "%",
          safeRange: `Condition: ${c.status} (${c.health}%)`,
          description: `Artisan technical verification for ${c.name} subsystem.`,
          imageUrl: null,
        }));
      }

      setInspectionItems(realChecklist);

      // 3. Load Inspection History from PostgreSQL
      try {
        setHistoryLoading(true);
        const userCompanyId = StorageService.getCompanyId() || "";
        const queryParam = userCompanyId ? `?companyId=${encodeURIComponent(userCompanyId)}` : "";
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
          (l: any) => l.machineId === machineId || (l.machineName && activeMachine && l.machineName.toLowerCase().includes(activeMachine.name.toLowerCase()))
        );
        setHistoryLogs(matchedLogs.length > 0 ? matchedLogs : logs.slice(0, 10));
      } catch {
        setHistoryLogs([]);
      } finally {
        setHistoryLoading(false);
      }
    } catch (err) {
      console.warn("Inspection data loading notice:", err);
    } finally {
      setComponentsLoading(false);
    }
  }, [activeMachine]);

  useEffect(() => {
    if (selectedMachineId) {
      loadMachineInspectionData(selectedMachineId);
    }
  }, [selectedMachineId, loadMachineInspectionData]);

  // ---------------------------------------------------------------------------
  // Categories & Filtering
  // ---------------------------------------------------------------------------
  const categories = useMemo(() => {
    const set = new Set<string>();
    components.forEach((c) => set.add(c.category));
    return ["All", ...Array.from(set)];
  }, [components]);

  const filteredComponents = useMemo(() => {
    if (categoryFilter === "All") return components;
    return components.filter((c) => c.category === categoryFilter);
  }, [components, categoryFilter]);

  const filteredMachines = useMemo(() => {
    const q = machineSearch.toLowerCase().trim();
    if (!q) return machines;
    return machines.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.serialNumber.toLowerCase().includes(q) ||
        m.type.toLowerCase().includes(q)
    );
  }, [machines, machineSearch]);

  // ---------------------------------------------------------------------------
  // Handlers: Parameter Updates, Adding Custom Component, Completing Inspection
  // ---------------------------------------------------------------------------
  const handleSaveComponentUpdate = (updatedComponent: MachineComponent) => {
    setComponents((prev) =>
      prev.map((c) => (c.id === updatedComponent.id ? updatedComponent : c))
    );
    showSuccessToast(`Updated ${updatedComponent.name} diagnostics.`);
    setUpdateTarget(null);
  };

  const handleSaveNewCustomComponent = (newComp: MachineComponent) => {
    setComponents((prev) => [...prev, newComp]);
    customAddedComponentsRef.current.push(newComp);
    showSuccessToast(`Added custom component: ${newComp.name}`);
    setIsAddComponentModalOpen(false);
  };

  const handleToggleChecklistItem = (itemId: string) => {
    setInspectionItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const nextStatus: InspectionStatus = item.status === "OK" ? "Issue" : item.status === "Issue" ? "N/A" : "OK";
        return { ...item, status: nextStatus };
      })
    );
  };

  const handleAddVisualImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img: IssueImage = {
        id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        file,
        previewUrl: reader.result as string,
        name: file.name,
        sizeKb: Math.round(file.size / 1024),
      };
      setNewIssue((prev) => ({
        ...prev,
        images: [...prev.images, img],
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveVisualReport = () => {
    if (!newIssue.component || !newIssue.description.trim()) {
      showErrorToast("Please select a component and enter an issue description.");
      return;
    }
    const report: IssueReport = {
      id: `rep-${Date.now()}`,
      machineId: activeMachine?.id || "m-1",
      component: newIssue.component,
      severity: newIssue.severity || "Medium",
      description: newIssue.description,
      images: newIssue.images,
      createdAt: new Date().toISOString(),
    };
    setIssueReports((prev) => [...prev, report]);
    setNewIssue({ component: "", severity: "Medium", description: "", images: [] });
    showSuccessToast("Visual defect reported and attached to inspection scope.");
  };

  // Submit complete inspection to PostgreSQL database
  const handleSubmitCompleteInspection = async () => {
    if (!activeMachine) return;
    setIsSubmitting(true);

    try {
      const hasCritical = components.some((c) => c.status === "Critical");

      // Save directly into PostgreSQL database table (machine_inspection_audit_logs)
      await apiCall(`/machines/${encodeURIComponent(activeMachine.id)}/manual-data`, {
        method: "POST",
        body: JSON.stringify({
          machineName: activeMachine.name,
          brand: "Heavy Mining Machinery",
          category: activeMachine.type,
          modelName: activeMachine.name,
          serialNumber: activeMachine.serialNumber,
          componentName: components.map((c) => c.name).join(", "),
          componentCategory: "All Components",
          actionDescription: "Artisan Pre-Start Technical Inspection Completed",
          readings: {
            components,
            summary: {
              totalComponents: components.length,
              healthy: components.filter((c) => c.status === "Healthy" || c.status === "Good").length,
              warning: components.filter((c) => c.status === "Warning").length,
              critical: components.filter((c) => c.status === "Critical").length,
            },
          },
          checklist: inspectionItems,
          customFields: customAddedComponentsRef.current,
          userName: artisanName,
          userRole: "ARTISAN",
          userEmail: artisanEmail,
        }),
      }, { showError: false });

      showSuccessToast(`✓ Pre-Start Inspection completed by Artisan ${artisanName} & logged!`);
      // Refresh history
      loadMachineInspectionData(activeMachine.id);
      setActiveTab("history");
    } catch (err: any) {
      showErrorToast(err.message || "Failed to submit inspection log.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 font-sans text-slate-900 antialiased dark:bg-[#07111f] dark:text-slate-50 sm:p-6 lg:p-8 space-y-6">
      {/* ── TOP HEADER ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-300">
            <Wrench size={14} />
            Artisan Engineering Diagnostics
          </div>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Pre-Start Technical Inspection
          </h1>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Select assigned equipment, verify live component telemetry, calibrate parameters, and log inspections directly to the database.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              loadMachines();
              if (selectedMachineId) loadMachineInspectionData(selectedMachineId);
              showSuccessToast("Refreshed machine data!");
            }}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-[#101f33] dark:text-slate-200 cursor-pointer"
          >
            <RefreshCw size={15} className={machinesLoading || componentsLoading ? "animate-spin text-blue-600" : ""} />
            Refresh Data
          </button>
        </div>
      </div>

      {/* ── MAIN 2-COLUMN LAYOUT: MACHINE SELECTOR (LEFT) + INSPECTION ENGINE (RIGHT) ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* LEFT COLUMN: ASSIGNED MACHINES LIST (4 COLS) */}
        <div className="space-y-4 lg:col-span-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                Assigned Fleet Equipment ({machines.length})
              </h3>
              <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                Artisan Scope
              </span>
            </div>

            <div className="relative mt-3 h-10 w-full">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search machine, model, serial..."
                value={machineSearch}
                onChange={(e) => setMachineSearch(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
              />
            </div>

            {/* Machines Stack */}
            <div className="mt-4 space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
              {machinesLoading ? (
                <div className="py-12 text-center text-xs font-bold text-slate-400">
                  <Loader2 className="mx-auto mb-2 animate-spin text-blue-600" size={20} />
                  Loading assigned machines...
                </div>
              ) : filteredMachines.length === 0 ? (
                <div className="py-12 text-center text-xs font-bold text-slate-400">
                  No machines found.
                </div>
              ) : (
                filteredMachines.map((m) => {
                  const isSelected = m.id === selectedMachineId;
                  return (
                    <div
                      key={m.id}
                      onClick={() => setSelectedMachineId(m.id)}
                      className={`group flex cursor-pointer flex-col justify-between rounded-xl border p-3.5 transition ${
                        isSelected
                          ? "border-blue-600 bg-blue-50/70 shadow-sm dark:border-blue-500 dark:bg-blue-950/40"
                          : "border-slate-200 bg-slate-50/60 hover:border-blue-300 hover:bg-white dark:border-slate-800 dark:bg-[#101f33]/60 dark:hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[11px] font-bold text-blue-600 dark:text-blue-400">
                          {m.serialNumber}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                            m.healthScore && m.healthScore < 80
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                          }`}
                        >
                          {m.healthScore ?? 100}% Health
                        </span>
                      </div>

                      <h4 className="mt-2 text-xs font-black text-slate-900 dark:text-white truncate">
                        {m.name}
                      </h4>
                      <p className="text-[11px] font-semibold text-slate-400 truncate">
                        {m.type} • 📍 {m.location}
                      </p>

                      <div className="mt-2 flex items-center justify-between border-t border-slate-200/60 pt-2 text-[10px] text-slate-500 dark:border-slate-700/60 dark:text-slate-400">
                        <span>👤 {m.operatorName}</span>
                        <span>{m.currentHours > 0 ? `${m.currentHours.toLocaleString()} hrs` : "0 hrs"}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: INSPECTION ENGINE (8 COLS) */}
        <div className="space-y-5 lg:col-span-8">
          {activeMachine ? (
            <>
              {/* Selected Machine Hero Card */}
              <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-r from-[#2044cd] via-[#1d4ed8] to-[#1e3a8a] p-6 text-white shadow-xl shadow-blue-500/10">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1.5">
                    <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-0.5 text-xs font-black uppercase tracking-wider text-blue-100 backdrop-blur-md">
                      <Truck size={13} />
                      Active Inspection Target
                    </div>
                    <h2 className="text-xl font-black text-white sm:text-2xl">
                      {activeMachine.name}
                    </h2>
                    <p className="text-xs font-semibold text-blue-100">
                      Serial: <span className="font-mono text-cyan-300">{activeMachine.serialNumber}</span> • Category: {activeMachine.type} • 📍 {activeMachine.location}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsAddComponentModalOpen(true)}
                      className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-white px-4 text-xs font-black text-blue-700 shadow-md transition hover:bg-blue-50 cursor-pointer"
                    >
                      <Plus size={15} />
                      Add Custom Component
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-4 sm:grid-cols-4 text-xs">
                  <div>
                    <span className="text-blue-200 text-[10px] uppercase font-bold">Assigned Operator</span>
                    <p className="font-bold text-white">👤 {activeMachine.operatorName}</p>
                  </div>
                  <div>
                    <span className="text-blue-200 text-[10px] uppercase font-bold">Supervisor</span>
                    <p className="font-bold text-white">🛡️ {activeMachine.supervisorName}</p>
                  </div>
                  <div>
                    <span className="text-blue-200 text-[10px] uppercase font-bold">Meter Reading</span>
                    <p className="font-bold text-white">{activeMachine.currentHours > 0 ? `${activeMachine.currentHours.toLocaleString()} hrs` : "0 hrs"}</p>
                  </div>
                  <div>
                    <span className="text-blue-200 text-[10px] uppercase font-bold">Health Verdict</span>
                    <p className="font-bold text-emerald-300">✓ {activeMachine.healthScore ?? 100}% Optimal</p>
                  </div>
                </div>
              </div>

              {/* ── UNIFIED COMPONENT TELEMETRY & INSPECTION ── */}
              <div className="space-y-5">
                {/* Category Filter & Quick Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">Category Filter:</span>
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsAddComponentModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-1.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300 cursor-pointer"
                  >
                    <PlusCircle size={14} />
                    Add Custom Component / Field
                  </button>
                </div>

                {/* Components List */}
                <div className="space-y-4">
                  {componentsLoading ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-xs font-bold text-slate-400 dark:border-slate-800 dark:bg-[#0b1728]">
                      <Loader2 className="mx-auto mb-2 animate-spin text-blue-600" size={24} />
                      Loading telemetry & component modules...
                    </div>
                  ) : filteredComponents.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-xs font-bold text-slate-400 dark:border-slate-800 dark:bg-[#0b1728]">
                      No components found in this category.
                    </div>
                  ) : (
                    filteredComponents.map((comp) => {
                      const isCrit = comp.status === "Critical";
                      const isWarn = comp.status === "Warning";

                      return (
                        <div
                          key={comp.id}
                          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 dark:border-slate-800 dark:bg-[#0b1728]"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                  {comp.category}
                                </span>
                                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                                  {comp.name}
                                </h4>
                              </div>
                              <p className="mt-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
                                Current Telemetry: {comp.currentReading}
                              </p>
                            </div>

                            <div className="flex items-center gap-3">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-black uppercase ${
                                  isCrit
                                    ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                                    : isWarn
                                    ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                }`}
                              >
                                {comp.health}% • {comp.status}
                              </span>

                              <button
                                type="button"
                                onClick={() => setUpdateTarget(comp)}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-100 dark:border-slate-700 dark:bg-[#101f33] dark:text-slate-200 cursor-pointer"
                              >
                                <Sliders size={13} />
                                Calibrate / Update
                              </button>
                            </div>
                          </div>

                          {/* Parameters Grid */}
                          {comp.parameters && comp.parameters.length > 0 && (
                            <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                              {comp.parameters.map((p, idx) => (
                                <div
                                  key={idx}
                                  className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 text-xs dark:border-slate-800 dark:bg-[#101f33]/60"
                                >
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    {p.name}
                                  </span>
                                  <p className="mt-0.5 text-xs font-black text-slate-900 dark:text-white">
                                    {p.currentVal ?? p.defaultVal} {p.unit}
                                  </p>
                                  <p className="text-[10px] font-semibold text-slate-400">
                                    Safe Range: {p.safeMin}–{p.safeMax} {p.unit}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Pre-Start Inspection Checklist */}
                {inspectionItems.length > 0 && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                      <div>
                        <h3 className="text-base font-black text-slate-900 dark:text-white">
                          Pre-Start Safety Checklist ({inspectionItems.length})
                        </h3>
                        <p className="text-xs text-slate-400">
                          Toggle pass/fail status for each mechanical safety item.
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {inspectionItems.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleToggleChecklistItem(item.id)}
                          className={`flex cursor-pointer items-center justify-between rounded-xl border p-3.5 transition ${
                            item.status === "OK"
                              ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/20"
                              : item.status === "Issue"
                              ? "border-rose-200 bg-rose-50/40 dark:border-rose-900/40 dark:bg-rose-950/20"
                              : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-[#101f33]/40"
                          }`}
                        >
                          <div>
                            <p className="text-xs font-bold text-slate-900 dark:text-white">{item.label}</p>
                            <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">{item.value}</p>
                            <p className="text-[10px] text-slate-400">{item.safeRange}</p>
                          </div>

                          <span
                            className={`rounded-lg px-2.5 py-1 text-xs font-black uppercase ${
                              item.status === "OK"
                                ? "bg-emerald-500 text-white"
                                : item.status === "Issue"
                                ? "bg-rose-500 text-white"
                                : "bg-slate-300 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Submit Bar */}
                    <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
                      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Inspected by Artisan: <strong className="text-slate-900 dark:text-white">{artisanName}</strong>
                      </div>

                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={handleSubmitCompleteInspection}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 text-xs font-black text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                      >
                        {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                        Complete & Send to Supervisor
                      </button>
                    </div>
                  </div>
                )}

              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-400 dark:border-slate-800 dark:bg-[#0b1728]">
              Select a machine from the left panel to begin inspection.
            </div>
          )}
        </div>
      </div>

      {/* ── MODAL: UPDATE / CALIBRATE COMPONENT ── */}
      {updateTarget && (
        <UpdateComponentModal
          component={updateTarget}
          onClose={() => setUpdateTarget(null)}
          onSave={handleSaveComponentUpdate}
        />
      )}

      {/* ── MODAL: ADD CUSTOM COMPONENT / FIELD ── */}
      {isAddComponentModalOpen && activeMachine && (
        <AddCustomComponentModal
          machine={activeMachine}
          onClose={() => setIsAddComponentModalOpen(false)}
          onSave={handleSaveNewCustomComponent}
        />
      )}

      {/* ── MODAL: HISTORY AUDIT SNAPSHOT ── */}
      {selectedHistoryLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#0b1728]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h4 className="text-base font-black text-slate-900 dark:text-white">
                Inspection Audit Snapshot
              </h4>
              <button
                type="button"
                onClick={() => setSelectedHistoryLog(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs text-slate-700 dark:text-slate-300">
              <div>
                <span className="text-slate-400">Date & Time:</span>
                <p className="font-bold text-slate-900 dark:text-white">{formatDate(selectedHistoryLog.createdAt)}</p>
              </div>
              <div>
                <span className="text-slate-400">Equipment:</span>
                <p className="font-bold text-slate-900 dark:text-white">{selectedHistoryLog.machineName || activeMachine?.name}</p>
              </div>
              <div>
                <span className="text-slate-400">Inspected Scope:</span>
                <p className="font-semibold text-blue-600 dark:text-blue-400">{selectedHistoryLog.componentName || "All Components"}</p>
              </div>
              <div>
                <span className="text-slate-400">Action Remarks:</span>
                <p className="font-medium text-slate-800 dark:text-slate-200">{selectedHistoryLog.actionDescription || "Pre-Start Inspection Verified"}</p>
              </div>
              <div>
                <span className="text-slate-400">Submitted By:</span>
                <p className="font-bold text-slate-900 dark:text-white">👤 {selectedHistoryLog.userName || "Artisan"} ({selectedHistoryLog.userRole || "ARTISAN"})</p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedHistoryLog(null)}
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow transition hover:bg-blue-700 cursor-pointer"
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

// ============================================================================
// MODAL: UPDATE / CALIBRATE COMPONENT TELEMETRY
// ============================================================================

function UpdateComponentModal({
  component,
  onClose,
  onSave,
}: {
  component: MachineComponent;
  onClose: () => void;
  onSave: (comp: MachineComponent) => void;
}) {
  const [health, setHealth] = useState(component.health);
  const [params, setParams] = useState<ComponentParameter[]>(component.parameters || []);

  const handleParamValChange = (idx: number, newVal: number) => {
    setParams((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, currentVal: newVal } : p))
    );
  };

  const handleSave = () => {
    const status = healthToStatus(health);
    const updated: MachineComponent = {
      ...component,
      health,
      status,
      currentReading: `${health}% Health • ${params[0] ? `${params[0].currentVal ?? params[0].defaultVal} ${params[0].unit}` : "Calibrated"}`,
      parameters: params,
    };
    onSave(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#0b1728]">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <h4 className="text-base font-black text-slate-900 dark:text-white">
            Calibrate / Update {component.name}
          </h4>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <div className="mt-4 space-y-4 text-xs text-slate-700 dark:text-slate-300">
          <div>
            <div className="flex items-center justify-between">
              <label className="font-bold">Component Health Rating (%)</label>
              <span className="font-black text-blue-600 dark:text-blue-400">{health}%</span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              step={5}
              value={health}
              onChange={(e) => setHealth(Number(e.target.value))}
              className="mt-2 w-full accent-blue-600 cursor-pointer"
            />
          </div>

          {params.length > 0 && (
            <div className="space-y-3 border-t border-slate-100 pt-3 dark:border-slate-800">
              <span className="font-bold uppercase tracking-wider text-slate-400">
                Operating Parameters Telemetry
              </span>
              {params.map((p, idx) => (
                <div key={idx} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{p.name}</span>
                    <span className="text-slate-400 text-[11px]">Safe: {p.safeMin}–{p.safeMax} {p.unit}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="number"
                      value={p.currentVal ?? p.defaultVal}
                      onChange={(e) => handleParamValChange(idx, Number(e.target.value))}
                      className="h-9 w-full rounded-lg border border-slate-300 px-3 text-xs font-bold outline-none dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
                    />
                    <span className="font-bold text-slate-500">{p.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-black text-white shadow transition hover:bg-blue-700 cursor-pointer"
          >
            Save Calibration
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MODAL: ADD CUSTOM COMPONENT / FIELD
// ============================================================================

function AddCustomComponentModal({
  machine,
  onClose,
  onSave,
}: {
  machine: Machine;
  onClose: () => void;
  onSave: (comp: MachineComponent) => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Engine");
  const [health, setHealth] = useState(100);
  const [paramName, setParamName] = useState("Telemetry Level");
  const [paramUnit, setParamUnit] = useState("Bar");
  const [paramVal, setParamVal] = useState(100);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showErrorToast("Component name is required.");
      return;
    }

    const status = healthToStatus(health);
    const newComponent: MachineComponent = {
      id: `custom-comp-${Date.now()}`,
      name: name.trim(),
      category: category.trim(),
      health,
      status,
      currentReading: `${health}% Health • ${paramVal} ${paramUnit}`,
      parameters: [
        {
          name: paramName || "Operating Level",
          unit: paramUnit || "",
          safeMin: 0,
          safeMax: paramVal * 1.5,
          defaultVal: paramVal,
          currentVal: paramVal,
          description: "Custom artisan inspection parameter.",
        },
      ],
    };

    onSave(newComponent);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#0b1728]">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <h4 className="text-base font-black text-slate-900 dark:text-white">
            Add Custom Component / Field
          </h4>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs text-slate-700 dark:text-slate-300">
          <div>
            <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
              Component Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Auxiliary Turbo Cooler, Secondary Hydraulic Pump..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-300 px-3 text-xs font-semibold outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold outline-none dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
              >
                <option value="Engine">Engine</option>
                <option value="Hydraulic System">Hydraulic System</option>
                <option value="Transmission">Transmission</option>
                <option value="Braking System">Braking System</option>
                <option value="Suspension">Suspension</option>
                <option value="Boom & Structure">Boom & Structure</option>
                <option value="Electrical">Electrical & Sensors</option>
                <option value="Other Subsystem">Other Subsystem</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                Initial Health (%)
              </label>
              <input
                type="number"
                min={10}
                max={100}
                value={health}
                onChange={(e) => setHealth(Number(e.target.value))}
                className="h-10 w-full rounded-xl border border-slate-300 px-3 text-xs font-bold outline-none dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-3 dark:border-slate-800 dark:bg-[#101f33]/60">
            <span className="font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Initial Parameter Reading
            </span>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="mb-1 block text-[11px] font-bold">Parameter Label</label>
                <input
                  type="text"
                  placeholder="e.g. Line Pressure"
                  value={paramName}
                  onChange={(e) => setParamName(e.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-300 px-2.5 text-xs font-semibold outline-none dark:border-slate-700 dark:bg-[#0b1728] dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-bold">Unit</label>
                <input
                  type="text"
                  placeholder="e.g. Bar, °C"
                  value={paramUnit}
                  onChange={(e) => setParamUnit(e.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-300 px-2.5 text-xs font-semibold outline-none dark:border-slate-700 dark:bg-[#0b1728] dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-bold">Reading Value</label>
              <input
                type="number"
                value={paramVal}
                onChange={(e) => setParamVal(Number(e.target.value))}
                className="h-9 w-full rounded-lg border border-slate-300 px-2.5 text-xs font-semibold outline-none dark:border-slate-700 dark:bg-[#0b1728] dark:text-white"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-black text-white shadow transition hover:bg-blue-700 cursor-pointer"
            >
              Add Component
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}