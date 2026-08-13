import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Check,
  AlertTriangle,
  RefreshCw,
  Camera,
  Upload,
  X,
  ArrowRight,
  ShieldCheck,
  Truck,
  History,
  FileText,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Droplet,
  Thermometer,
  Wrench,
  Fuel,
  Wind,
  Settings,
  Disc,
  Compass,
  Sun,
  Volume2,
  Flame,
  ChevronRight,
  CheckCircle,
} from "lucide-react";
import StorageService, { STORAGE_KEYS } from "../../services/storage.service";
import { fleetService } from "../../services/Fleet/fleetService";
import { showSuccessToast, showErrorToast } from "../../utils/toastUtils";

// ---------------------------------------------------------------------------
// TYPES & CONSTANTS
// ---------------------------------------------------------------------------

type InspectionStatus = "OK" | "Issue" | "N/A";

type InspectionItem = {
  id: string;
  name: string;
  category: "general";
  icon: any;
};

const CHECKLIST_ITEMS: InspectionItem[] = [
  { id: "engine_oil", name: "Engine Oil Level", category: "general", icon: Droplet },
  { id: "tyre_condition", name: "Tyre Condition", category: "general", icon: Disc },
  { id: "coolant_level", name: "Coolant Level", category: "general", icon: Thermometer },
  { id: "brake_system", name: "Brake System", category: "general", icon: Disc },
  { id: "hydraulic_oil", name: "Hydraulic Oil Level", category: "general", icon: Wrench },
  { id: "steering_system", name: "Steering System", category: "general", icon: Compass },
  { id: "fuel_level", name: "Fuel Level", category: "general", icon: Fuel },
  { id: "lights_indicators", name: "Lights & Indicators", category: "general", icon: Sun },
  { id: "air_filter", name: "Air Filter", category: "general", icon: Wind },
  { id: "horn", name: "Horn", category: "general", icon: Volume2 },
  { id: "belts_hoses", name: "Belts & Hoses", category: "general", icon: Settings },
  { id: "fire_extinguisher", name: "Fire Extinguisher", category: "general", icon: Flame },
];

type HistoryRecord = {
  id: string;
  date: string;
  time: string;
  operator: string;
  status: "Passed" | "Failed";
};

const DEFAULT_HISTORY: HistoryRecord[] = [
  {
    id: "hist-1",
    date: "02 Aug 2026",
    time: "06:10 AM",
    operator: "Ankush Waliya",
    status: "Passed",
  },
  {
    id: "hist-2",
    date: "01 Aug 2026",
    time: "06:05 AM",
    operator: "Ankush Waliya",
    status: "Passed",
  },
  {
    id: "hist-3",
    date: "31 Jul 2026",
    time: "06:12 AM",
    operator: "Ankush Waliya",
    status: "Failed",
  },
];

export default function PreStartInspection() {
  const navigate = useNavigate();

  // Logged-in user
  const storedUser =
    StorageService.get<any>(STORAGE_KEYS.USER) ||
    StorageService.get<any>("user") ||
    {};
  const userName = storedUser?.name || "Ankush Waliya";

  // Machine State
  const [machine, setMachine] = useState({
    name: "CAT-777-DEMO",
    type: "Dump Truck",
    serialNumber: "SN-CAT-777-DEMO",
    currentHours: "4,800 hrs",
    location: "Pit A - Haul Road",
    status: "Online",
    image: "https://images.unsplash.com/photo-1579412690850-bd41cd0af397?auto=format&fit=crop&q=80&w=800",
  });

  // Inspection Checklist State (Default all "OK")
  const [checklist, setChecklist] = useState<Record<string, InspectionStatus>>(() => {
    const initial: Record<string, InspectionStatus> = {};
    CHECKLIST_ITEMS.forEach((item) => {
      initial[item.id] = "OK";
    });
    return initial;
  });

  const [remarks, setRemarks] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [history, setHistory] = useState<HistoryRecord[]>(DEFAULT_HISTORY);
  const [currentStep, setCurrentStep] = useState(1);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [issueText, setIssueText] = useState("");

  // Load live machine from fleetService if available
  useEffect(() => {
    const loadFleetMachine = async () => {
      try {
        const machines = await fleetService.getFleetMachines();
        if (machines && machines.length > 0) {
          const m = machines[0];
          setMachine({
            name: m.machineName || "CAT-777-DEMO",
            type: m.machineType || "Dump Truck",
            serialNumber: m.fleetId || "SN-CAT-777-DEMO",
            currentHours: `${m.hoursRun || 4800} hrs`,
            location: m.location || "Pit A - Haul Road",
            status: m.status === "Critical" ? "Offline" : "Online",
            image: "https://images.unsplash.com/photo-1579412690850-bd41cd0af397?auto=format&fit=crop&q=80&w=800",
          });
        }
      } catch (err) {}
    };
    loadFleetMachine();
  }, []);

  const handleItemStatusChange = (itemId: string, status: InspectionStatus) => {
    setChecklist((prev) => ({
      ...prev,
      [itemId]: status,
    }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showErrorToast("Photo size exceeds 5MB limit.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveDraft = () => {
    showSuccessToast("Inspection draft saved successfully!");
  };

  const handleSubmitInspection = () => {
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);

      // Determine overall status
      const hasIssue = Object.values(checklist).some((s) => s === "Issue");
      const status: "Passed" | "Failed" = hasIssue ? "Failed" : "Passed";

      const newRecord: HistoryRecord = {
        id: `hist-${Date.now()}`,
        date: new Date().toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        time: new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        operator: userName,
        status,
      };

      setHistory([newRecord, ...history]);
      setCurrentStep(2);

      showSuccessToast(
        status === "Passed"
          ? "Pre-Start Inspection submitted & passed!"
          : "Pre-Start Inspection submitted with reported issues."
      );
    }, 800);
  };

  const handleReportIssue = () => {
    if (!issueText.trim()) {
      showErrorToast("Please describe the issue before submitting.");
      return;
    }
    showSuccessToast("Issue reported successfully to supervisor!");
    setIsReportModalOpen(false);
    setIssueText("");
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* ── HEADER / BREADCRUMB ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Pre-Start Inspection
          </h1>
          <div className="flex items-center gap-2 mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Operations</span>
            <span>•</span>
            <span className="text-blue-600 dark:text-blue-400 font-semibold">
              Pre-Start Inspection
            </span>
          </div>
        </div>
      </div>

      {/* ── 4-STEP OPERATIONS STEPPER ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {/* Step 1 */}
          <div
            onClick={() => setCurrentStep(1)}
            className={`flex items-center gap-3 rounded-xl p-3 cursor-pointer transition ${
              currentStep === 1
                ? "bg-blue-50/70 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800"
                : "opacity-80 hover:opacity-100"
            }`}
          >
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                currentStep === 1
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
              }`}
            >
              1
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                Pre-Start Inspection
              </p>
              <p
                className={`text-xs font-medium ${
                  currentStep === 1
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-slate-400"
                }`}
              >
                {currentStep === 1 ? "In Progress" : "Completed"}
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div
            onClick={() => setCurrentStep(2)}
            className={`flex items-center gap-3 rounded-xl p-3 cursor-pointer transition ${
              currentStep === 2
                ? "bg-blue-50/70 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800"
                : "opacity-60 hover:opacity-90"
            }`}
          >
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                currentStep === 2
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
              }`}
            >
              2
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                Work Order
              </p>
              <p className="text-xs font-medium text-slate-400">
                {currentStep > 2 ? "Completed" : "Pending"}
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div
            onClick={() => setCurrentStep(3)}
            className={`flex items-center gap-3 rounded-xl p-3 cursor-pointer transition ${
              currentStep === 3
                ? "bg-blue-50/70 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800"
                : "opacity-60 hover:opacity-90"
            }`}
          >
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                currentStep === 3
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
              }`}
            >
              3
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                Active Task
              </p>
              <p className="text-xs font-medium text-slate-400">
                {currentStep > 3 ? "Completed" : "Pending"}
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div
            onClick={() => setCurrentStep(4)}
            className={`flex items-center gap-3 rounded-xl p-3 cursor-pointer transition ${
              currentStep === 4
                ? "bg-blue-50/70 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800"
                : "opacity-60 hover:opacity-90"
            }`}
          >
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                currentStep === 4
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
              }`}
            >
              4
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                Shift Summary
              </p>
              <p className="text-xs font-medium text-slate-400">Pending</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT GRID (2 COLUMNS) ── */}
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        {/* LEFT COLUMN: Assigned Machine & Inspection History */}
        <div className="space-y-6">
          {/* Assigned Machine Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Assigned Machine
              </h2>
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                ● {machine.status}
              </span>
            </div>

            {/* Machine Image */}
            <div className="relative h-44 w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
              <img
                src={machine.image}
                alt={machine.name}
                className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
              />
            </div>

            {/* Machine Details */}
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                {machine.name}
              </h3>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {machine.type}
              </p>
            </div>

            <div className="space-y-2.5 text-xs border-t border-slate-100 pt-4 dark:border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Serial Number</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {machine.serialNumber}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Current Hours</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {machine.currentHours}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Location</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {machine.location}
                </span>
              </div>
            </div>

            <button
              onClick={() => navigate("/operator/machines")}
              type="button"
              className="mt-2 flex w-full items-center justify-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Change Machine
            </button>
          </div>

          {/* Inspection History Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Inspection History
              </h2>
              <button
                onClick={() => navigate("/operator/service-logs")}
                type="button"
                className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
              >
                View All
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {history.map((item) => (
                <div key={item.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {item.date} <span className="font-normal text-slate-400">| {item.time}</span>
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Operator: {item.operator}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        item.status === "Passed"
                          ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                          : "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Pre-Start Inspection Checklist & Form */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
          {/* Section Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5 dark:border-slate-800">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Pre-Start Inspection Checklist
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Please inspect all the items below before starting the machine.
              </p>
            </div>

            <button
              onClick={() => setIsReportModalOpen(true)}
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50/50 px-4 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400"
            >
              <AlertTriangle className="h-4 w-4" />
              Report an Issue
            </button>
          </div>

          {/* Checklist Category Header */}
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
              <Check className="h-3.5 w-3.5" />
            </div>
            <span>General Inspection</span>
          </div>

          {/* 12-Item Checklist Grid (2-Columns) */}
          <div className="grid gap-4 md:grid-cols-2">
            {CHECKLIST_ITEMS.map((item) => {
              const ItemIcon = item.icon;
              const currentStatus = checklist[item.id] || "OK";

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 transition hover:border-slate-200 dark:border-slate-800 dark:bg-slate-950/40"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white shadow-xs dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      <ItemIcon className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-semibold text-slate-900 dark:text-white">
                      {item.name}
                    </span>
                  </div>

                  {/* 3 Segmented Toggle Buttons */}
                  <div className="flex items-center gap-1 rounded-lg bg-white p-1 shadow-2xs dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => handleItemStatusChange(item.id, "OK")}
                      className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition ${
                        currentStatus === "OK"
                          ? "bg-emerald-500 text-white shadow-xs"
                          : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                      }`}
                    >
                      OK
                    </button>

                    <button
                      type="button"
                      onClick={() => handleItemStatusChange(item.id, "Issue")}
                      className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition ${
                        currentStatus === "Issue"
                          ? "bg-rose-500 text-white shadow-xs"
                          : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                      }`}
                    >
                      Issue
                    </button>

                    <button
                      type="button"
                      onClick={() => handleItemStatusChange(item.id, "N/A")}
                      className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition ${
                        currentStatus === "N/A"
                          ? "bg-slate-400 text-white shadow-xs"
                          : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                      }`}
                    >
                      N/A
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Remarks & Photo Upload Section */}
          <div className="grid gap-4 md:grid-cols-2 pt-2">
            {/* Remarks Textarea */}
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                Remarks
              </label>
              <textarea
                rows={4}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Enter any remarks or notes..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs outline-none transition focus:border-blue-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950/40 dark:text-white dark:focus:border-blue-400"
              />
            </div>

            {/* Photo Upload Dropzone */}
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                Upload Photo <span className="font-normal text-slate-400">(Optional)</span>
              </label>

              {photoPreview ? (
                <div className="relative h-[105px] w-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                  <img
                    src={photoPreview}
                    alt="Inspection preview"
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setPhotoPreview(null)}
                    className="absolute right-2 top-2 rounded-full bg-slate-900/80 p-1 text-white hover:bg-rose-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <label className="flex h-[105px] w-full cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-4 text-center transition hover:border-blue-500 hover:bg-blue-50/20 dark:border-slate-800 dark:bg-slate-950/40 dark:hover:border-blue-400">
                  <Camera className="h-6 w-6 text-slate-400 mb-1" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Click to upload
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    JPG, PNG (Max 5MB)
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Action Footer Buttons */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-5 dark:border-slate-800">
            <button
              type="button"
              onClick={handleSaveDraft}
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Save as Draft
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmitInspection}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  Submit Inspection
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── REPORT AN ISSUE MODAL ── */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="h-5 w-5" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Report Machine Issue
                </h3>
              </div>
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Describe the issue encountered on machine <strong>{machine.name}</strong>. This will notify your supervisor immediately.
            </p>

            <textarea
              rows={4}
              value={issueText}
              onChange={(e) => setIssueText(e.target.value)}
              placeholder="Describe the issue details here..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs outline-none focus:border-rose-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleReportIssue}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700"
              >
                Submit Issue Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
