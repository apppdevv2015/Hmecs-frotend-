import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check,
  CheckCircle2,
  Play,
  Pause,
  Coffee,
  FileText,
  AlertTriangle,
  ArrowRight,
  Truck,
  Activity,
  MapPin,
  Clock,
  Gauge,
  Fuel,
  Zap,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  X,
  Plus,
} from "lucide-react";
import StorageService, { STORAGE_KEYS } from "../../services/storage.service";
import { fleetService } from "../../services/Fleet/fleetService";
import { showSuccessToast, showErrorToast } from "../../utils/toastUtils";

export default function ActiveTask() {
  const navigate = useNavigate();

  // User details
  const storedUser =
    StorageService.get<any>(STORAGE_KEYS.USER) ||
    StorageService.get<any>("user") ||
    {};
  const userName = storedUser?.name || "Ankush Waliya";

  // Task & Timer State
  const [isRunning, setIsRunning] = useState(true);
  const [secondsRunning, setSecondsRunning] = useState(12255); // 03:24:15
  const [secondsBreak, setSecondsBreak] = useState(930); // 00:15:30

  // Progress State
  const [completedQty, setCompletedQty] = useState(295);
  const [estimatedQty] = useState(450);
  const [isUpdateProgressOpen, setIsUpdateProgressOpen] = useState(false);
  const [newProgressInput, setNewProgressInput] = useState("295");

  // Modals & Popups
  const [isBreakModalOpen, setIsBreakModalOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [issueText, setIssueText] = useState("");

  // Machine metrics
  const [machine, setMachine] = useState({
    name: "CAT-777-DEMO",
    serialNumber: "SN-CAT-777-DEMO",
    hours: "4,823 hrs",
    fuelLevel: 68,
    engineLoad: 74,
    hydraulicTemp: 62,
  });

  // Timer Effect
  useEffect(() => {
    let interval: any = null;
    if (isRunning) {
      interval = setInterval(() => {
        setSecondsRunning((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  // Format seconds to hh:mm:ss
  const formatTime = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(
      2,
      "0"
    )}:${String(secs).padStart(2, "0")}`;
  };

  const effectiveTimeSeconds = Math.max(secondsRunning - secondsBreak, 0);
  const progressPercent = Math.min(
    Math.round((completedQty / estimatedQty) * 100),
    100
  );
  const remainingQty = Math.max(estimatedQty - completedQty, 0);

  const handleTogglePause = () => {
    setIsRunning(!isRunning);
    showSuccessToast(isRunning ? "Task paused" : "Task resumed");
  };

  const handleUpdateProgressSubmit = () => {
    const val = Number(newProgressInput);
    if (isNaN(val) || val < 0) {
      showErrorToast("Please enter a valid quantity.");
      return;
    }
    setCompletedQty(val);
    setIsUpdateProgressOpen(false);
    showSuccessToast("Task progress updated!");
  };

  const handleCompleteTask = () => {
    showSuccessToast("Task completed! Moving to Shift Summary.");
    navigate("/operator/shift-summary");
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 font-sans text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-50 sm:p-6 lg:p-8 space-y-6">
      {/* ── HEADER / BREADCRUMB ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Active Task
          </h1>
          <div className="mt-1 flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Operations</span>
            <span>•</span>
            <span className="font-semibold text-blue-600 dark:text-blue-400">
              Active Task
            </span>
          </div>
        </div>
      </div>

      {/* ── 4-STEP OPERATIONS STEPPER ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {/* Step 1 */}
          <div
            onClick={() => navigate("/operator/pre-start-inspection")}
            className="flex items-center gap-3 rounded-xl p-3 cursor-pointer opacity-90 transition hover:opacity-100"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md shadow-emerald-500/20">
              <Check className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                Pre-Start Inspection
              </p>
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                Completed
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div
            onClick={() => navigate("/operator/work-order-capture")}
            className="flex items-center gap-3 rounded-xl p-3 cursor-pointer opacity-90 transition hover:opacity-100"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md shadow-emerald-500/20">
              <Check className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                Work Order Capture
              </p>
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                Completed
              </p>
            </div>
          </div>

          {/* Step 3 (Active) */}
          <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50/70 p-3 shadow-xs dark:border-blue-800 dark:bg-blue-900/20">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white shadow-md shadow-blue-500/20">
              3
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                Active Task
              </p>
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                In Progress
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div
            onClick={() => navigate("/operator/shift-summary")}
            className="flex items-center gap-3 rounded-xl p-3 cursor-pointer opacity-60 transition hover:opacity-90"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
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

      {/* ── MAIN CONTENT GRID (3 COLUMNS / LAYOUT) ── */}
      <div className="grid gap-6 lg:grid-cols-[320px_1fr_300px]">
        {/* LEFT COLUMN: Current Task Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Current Task
            </h2>
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              ● Running
            </span>
          </div>

          <div className="space-y-3.5 border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
            <div>
              <span className="text-slate-400">Work Order Number</span>
              <p className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white">
                WO-2026-00049
              </p>
            </div>

            <div>
              <span className="text-slate-400">Task / Activity</span>
              <p className="mt-0.5 font-semibold text-slate-900 dark:text-white">
                Hauling
              </p>
            </div>

            <div>
              <span className="text-slate-400">Material</span>
              <p className="mt-0.5 font-semibold text-slate-900 dark:text-white">
                Iron Ore
              </p>
            </div>

            <div>
              <span className="text-slate-400">Loading Point</span>
              <p className="mt-0.5 font-semibold text-slate-900 dark:text-white">
                Pit A
              </p>
            </div>

            <div>
              <span className="text-slate-400">Destination</span>
              <p className="mt-0.5 font-semibold text-slate-900 dark:text-white">
                Crusher 02
              </p>
            </div>

            <div>
              <span className="text-slate-400">Priority</span>
              <p className="mt-0.5 font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                🚩 High
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate("/operator/work-order-capture")}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            View Work Order Details
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* MIDDLE COLUMN: Task Progress & Live Location */}
        <div className="space-y-6">
          {/* Task Progress Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Task Progress
            </h2>

            {/* 5 Timers / Metrics Grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {/* Running Time */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <Clock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  <span className="text-[11px] font-medium">Running Time</span>
                </div>
                <p className="mt-1.5 text-base font-bold text-slate-900 dark:text-white">
                  {formatTime(secondsRunning)}
                </p>
                <span className="text-[10px] text-slate-400">hh:mm:ss</span>
              </div>

              {/* Break Time */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <Coffee className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-[11px] font-medium">Break Time</span>
                </div>
                <p className="mt-1.5 text-base font-bold text-slate-900 dark:text-white">
                  {formatTime(secondsBreak)}
                </p>
                <span className="text-[10px] text-slate-400">hh:mm:ss</span>
              </div>

              {/* Effective Time */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <Zap className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-[11px] font-medium">Effective Time</span>
                </div>
                <p className="mt-1.5 text-base font-bold text-slate-900 dark:text-white">
                  {formatTime(effectiveTimeSeconds)}
                </p>
                <span className="text-[10px] text-slate-400">hh:mm:ss</span>
              </div>

              {/* Start Time */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                  Start Time
                </span>
                <p className="mt-1.5 text-xs font-bold text-slate-900 dark:text-white">
                  03 Aug 2026
                </p>
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                  06:15 AM
                </span>
              </div>

              {/* Est. End Time */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                  Est. End Time
                </span>
                <p className="mt-1.5 text-xs font-bold text-slate-900 dark:text-white">
                  03 Aug 2026
                </p>
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                  02:15 PM
                </span>
              </div>
            </div>

            {/* Progress Overview Bar */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
                <span>Progress Overview</span>
                <span className="text-blue-600 dark:text-blue-400">{progressPercent}%</span>
              </div>

              {/* Progress Bar Container */}
              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all duration-500 shadow-sm shadow-blue-500/30"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                <div className="flex items-center gap-6 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Estimated Quantity</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {estimatedQty} Ton
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Completed Quantity</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {completedQty} Ton
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Remaining Quantity</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {remainingQty} Ton
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsUpdateProgressOpen(true)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Update Progress
                </button>
              </div>
            </div>
          </div>

          {/* Live Location Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Live Location
              </h2>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                ● Live
              </span>
            </div>

            {/* Simulated Live Route Visualizer */}
            <div className="relative flex h-36 w-full items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 px-8 dark:border-slate-800 dark:bg-slate-950/40">
              {/* Green Source Marker */}
              <div className="relative z-10 flex flex-col items-center gap-1">
                <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-emerald-500 bg-white text-emerald-600 shadow-sm dark:bg-slate-900">
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                </div>
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  Pit A
                </span>
              </div>

              {/* Moving Dump Truck Icon */}
              <div className="relative flex flex-1 items-center justify-center px-4">
                <div className="w-full border-b-2 border-dashed border-slate-300 dark:border-slate-700" />
                <div className="absolute flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/30">
                  <Truck className="h-5 w-5" />
                </div>
              </div>

              {/* Red Destination Marker */}
              <div className="relative z-10 flex flex-col items-center gap-1">
                <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-rose-500 bg-white text-rose-600 shadow-sm dark:bg-slate-900">
                  <div className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                </div>
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  Crusher 02
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Machine Status Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Machine Status
            </h2>
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              Operating
            </span>
          </div>

          <div className="space-y-3.5 border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
            <div>
              <span className="text-slate-400">Machine</span>
              <p className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white">
                {machine.name}
              </p>
            </div>

            <div>
              <span className="text-slate-400">Serial Number</span>
              <p className="mt-0.5 font-semibold text-slate-900 dark:text-white">
                {machine.serialNumber}
              </p>
            </div>

            <div>
              <span className="text-slate-400">Current Hours</span>
              <p className="mt-0.5 font-semibold text-slate-900 dark:text-white">
                {machine.hours}
              </p>
            </div>

            {/* Fuel Level */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between font-semibold text-slate-700 dark:text-slate-300">
                <span>Fuel Level</span>
                <span>{machine.fuelLevel}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${machine.fuelLevel}%` }}
                />
              </div>
            </div>

            {/* Engine Load */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between font-semibold text-slate-700 dark:text-slate-300">
                <span>Engine Load</span>
                <span>{machine.engineLoad}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${machine.engineLoad}%` }}
                />
              </div>
            </div>

            {/* Hydraulic Temp */}
            <div className="flex justify-between pt-2 text-xs">
              <span className="text-slate-400">Hydraulic Temp</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {machine.hydraulicTemp} °C
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate("/operator/dashboard")}
            className="flex w-full items-center justify-between rounded-xl border border-slate-200 py-2.5 px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <span>View Machine Health</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── BOTTOM QUICK ACTIONS BAR (5 BUTTONS) ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-5">
          {/* Pause / Resume */}
          <button
            type="button"
            onClick={handleTogglePause}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-700"
          >
            {isRunning ? (
              <>
                <Pause className="h-4 w-4 fill-current" />
                Pause Task
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-current" />
                Resume Task
              </>
            )}
          </button>

          {/* Log Break */}
          <button
            type="button"
            onClick={() => setIsBreakModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Coffee className="h-4 w-4 text-amber-500" />
            Log Break
          </button>

          {/* Add Note */}
          <button
            type="button"
            onClick={() => setIsNoteModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <FileText className="h-4 w-4 text-blue-500" />
            Add Note
          </button>

          {/* Report Issue */}
          <button
            type="button"
            onClick={() => setIsIssueModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <AlertTriangle className="h-4 w-4 text-rose-500" />
            Report Issue
          </button>

          {/* Complete Task */}
          <button
            type="button"
            onClick={handleCompleteTask}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50/40 py-3 text-xs font-bold text-rose-600 transition hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400"
          >
            <CheckCircle2 className="h-4 w-4" />
            Complete Task
          </button>
        </div>
      </div>

      {/* ── UPDATE PROGRESS MODAL ── */}
      {isUpdateProgressOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Update Task Progress
              </h3>
              <button onClick={() => setIsUpdateProgressOpen(false)}>
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                Completed Quantity (Ton)
              </label>
              <input
                type="number"
                value={newProgressInput}
                onChange={(e) => setNewProgressInput(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-bold outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsUpdateProgressOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateProgressSubmit}
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
              >
                Save Progress
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
