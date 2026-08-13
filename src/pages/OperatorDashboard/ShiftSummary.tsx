import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check,
  CheckCircle2,
  Clock,
  Truck,
  Fuel,
  MapPin,
  TrendingUp,
  FileText,
  Upload,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  X,
  PieChart as PieIcon,
} from "lucide-react";
import StorageService, { STORAGE_KEYS } from "../../services/storage.service";
import { showSuccessToast, showErrorToast } from "../../utils/toastUtils";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

export default function ShiftSummary() {
  const navigate = useNavigate();

  // Logged-in user
  const storedUser =
    StorageService.get<any>(STORAGE_KEYS.USER) ||
    StorageService.get<any>("user") ||
    {};
  const userName = storedUser?.name || "Ankush Waliya";

  const [notes, setNotes] = useState("");
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const materialData = [
    { name: "Iron Ore", value: 525, color: "#3b82f6" },
    { name: "Waste", value: 0, color: "#10b981" },
    { name: "Other", value: 0, color: "#f59e0b" },
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showErrorToast("File size exceeds 5MB limit.");
        return;
      }
      setUploadedFile(file.name);
      showSuccessToast(`File ${file.name} attached!`);
    }
  };

  const handleSaveDraft = () => {
    showSuccessToast("Shift summary draft saved!");
  };

  const handleSubmitShift = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      showSuccessToast("Shift summary submitted successfully! Great job today.");
      navigate("/operator/dashboard");
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 font-sans text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-50 sm:p-6 lg:p-8 space-y-6">
      {/* ── HEADER / BREADCRUMB ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Shift Summary
          </h1>
          <div className="mt-1 flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Operations</span>
            <span>•</span>
            <span className="font-semibold text-blue-600 dark:text-blue-400">
              Shift Summary
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

          {/* Step 3 */}
          <div
            onClick={() => navigate("/operator/active-task")}
            className="flex items-center gap-3 rounded-xl p-3 cursor-pointer opacity-90 transition hover:opacity-100"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md shadow-emerald-500/20">
              <Check className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                Active Task
              </p>
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                Completed
              </p>
            </div>
          </div>

          {/* Step 4 (Active) */}
          <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50/70 p-3 shadow-xs dark:border-blue-800 dark:bg-blue-900/20">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white shadow-md shadow-blue-500/20">
              4
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                Shift Summary
              </p>
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                In Progress
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── TOP METRICS ROW (5 CARDS) ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Total Operating Time */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Total Operating Time
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900 dark:text-white">
            07:30 <span className="text-xs font-medium text-slate-400">hh:mm</span>
          </p>
          <p className="mt-1 text-[11px] text-slate-400">Break Time: 00:45</p>
        </div>

        {/* Total Material Hauled */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Total Material Hauled
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
              <Truck className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900 dark:text-white">
            525 <span className="text-xs font-medium text-slate-400">Ton</span>
          </p>
        </div>

        {/* Fuel Consumed */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Fuel Consumed
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <Fuel className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900 dark:text-white">
            92 <span className="text-xs font-medium text-slate-400">Liters</span>
          </p>
        </div>

        {/* Total Distance */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Total Distance
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
              <MapPin className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900 dark:text-white">
            28.7 <span className="text-xs font-medium text-slate-400">km</span>
          </p>
        </div>

        {/* Average Fuel Efficiency */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Average Fuel Efficiency
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600 dark:bg-cyan-950/40 dark:text-cyan-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900 dark:text-white">
            5.70 <span className="text-xs font-medium text-slate-400">Ton/Liter</span>
          </p>
        </div>
      </div>

      {/* ── MAIN CONTENT GRID (3 COLUMNS) ── */}
      <div className="grid gap-6 lg:grid-cols-[300px_1fr_300px]">
        {/* LEFT COLUMN: Shift Info & Work Orders */}
        <div className="space-y-6">
          {/* Shift Information Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Shift Information
            </h2>
            <div className="space-y-3 border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-400">Shift Type</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  Morning Shift
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Shift Time</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  06:00 AM - 02:00 PM
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Operator</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {userName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Date</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  03 Aug 2026
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Machine</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  CAT-777-DEMO
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Serial Number</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  SN-CAT-777-DEMO
                </span>
              </div>
            </div>
          </div>

          {/* Work Orders Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Work Orders (1)
            </h2>
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 space-y-1.5 dark:border-slate-800 dark:bg-slate-950/40">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  WO-2026-00049
                </span>
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                  Completed
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Hauling - Iron Ore
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pit A ➔ Crusher 02
              </p>
              <p className="text-[11px] text-slate-400 pt-1">
                Start: 06:15 AM &nbsp; End: 01:45 PM
              </p>
            </div>
          </div>
        </div>

        {/* MIDDLE COLUMN: Performance, Material & Notes */}
        <div className="space-y-6">
          {/* Performance Summary Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Performance Summary
            </h2>

            <div className="space-y-3 text-xs">
              {/* Effective Operating */}
              <div className="space-y-1">
                <div className="flex justify-between font-semibold">
                  <span className="text-slate-600 dark:text-slate-300">
                    Effective Operating Time
                  </span>
                  <span className="text-slate-900 dark:text-white">06:45 hh:mm</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-blue-600" style={{ width: "90%" }} />
                </div>
              </div>

              {/* Engine Idle */}
              <div className="space-y-1">
                <div className="flex justify-between font-semibold">
                  <span className="text-slate-600 dark:text-slate-300">Engine Idle Time</span>
                  <span className="text-slate-900 dark:text-white">00:30 hh:mm</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-amber-500" style={{ width: "15%" }} />
                </div>
              </div>

              {/* Loading Time */}
              <div className="space-y-1">
                <div className="flex justify-between font-semibold">
                  <span className="text-slate-600 dark:text-slate-300">Loading Time</span>
                  <span className="text-slate-900 dark:text-white">02:45 hh:mm</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: "40%" }} />
                </div>
              </div>

              {/* Hauling Time */}
              <div className="space-y-1">
                <div className="flex justify-between font-semibold">
                  <span className="text-slate-600 dark:text-slate-300">Hauling Time</span>
                  <span className="text-slate-900 dark:text-white">03:15 hh:mm</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-purple-500" style={{ width: "50%" }} />
                </div>
              </div>

              {/* Dumping Time */}
              <div className="space-y-1">
                <div className="flex justify-between font-semibold">
                  <span className="text-slate-600 dark:text-slate-300">Dumping Time</span>
                  <span className="text-slate-900 dark:text-white">00:45 hh:mm</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-cyan-500" style={{ width: "20%" }} />
                </div>
              </div>

              <div className="flex justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-slate-500">
                <span>Cycle Count</span>
                <span className="font-bold text-slate-900 dark:text-white">18</span>
              </div>
            </div>
          </div>

          {/* Material Summary Donut Chart */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Material Summary
            </h2>
            <div className="flex items-center justify-between">
              <div className="h-36 w-36 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={materialData}
                      cx="50%"
                      cy="50%"
                      innerRadius={42}
                      outerRadius={60}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {materialData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-base font-black text-slate-900 dark:text-white">525</span>
                  <span className="text-[10px] text-slate-400">Ton</span>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Iron Ore: 525 Ton (100%)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span className="font-semibold text-slate-500 dark:text-slate-400">
                    Waste: 0 Ton (0%)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                  <span className="font-semibold text-slate-500 dark:text-slate-400">
                    Other: 0 Ton (0%)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Operator Notes */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-2">
            <label className="text-xs font-bold text-slate-900 dark:text-white block">
              Operator Notes
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter any notes or observations for this shift..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs outline-none focus:border-blue-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950/40 dark:text-white dark:focus:border-blue-400"
            />
          </div>
        </div>

        {/* RIGHT COLUMN: Downtime & Issues + Document Upload */}
        <div className="space-y-6">
          {/* Downtime & Issues Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Downtime &amp; Issues
            </h2>

            <div className="space-y-3 border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-400">Total Downtime</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  00:25 hh:mm
                </span>
              </div>

              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Breakdown</span>
                <span>00:10 hh:mm</span>
              </div>

              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Waiting (Queue)</span>
                <span>00:10 hh:mm</span>
              </div>

              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Other Delays</span>
                <span>00:05 hh:mm</span>
              </div>

              <div className="flex justify-between font-bold pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Issues Reported</span>
                <span className="text-rose-600 dark:text-rose-400">1</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate("/operator/alerts")}
              className="text-xs font-bold text-blue-600 hover:underline dark:text-blue-400"
            >
              View Issues &gt;
            </button>
          </div>

          {/* Upload Documents Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-3">
            <label className="text-xs font-bold text-slate-900 dark:text-white block">
              Upload Documents <span className="font-normal text-slate-400">(Optional)</span>
            </label>

            {uploadedFile ? (
              <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-xs dark:border-emerald-900/40 dark:bg-emerald-950/20">
                <span className="truncate font-semibold text-emerald-900 dark:text-emerald-200">
                  {uploadedFile}
                </span>
                <button onClick={() => setUploadedFile(null)}>
                  <X className="h-4 w-4 text-emerald-600" />
                </button>
              </div>
            ) : (
              <label className="flex h-28 w-full cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-4 text-center transition hover:border-blue-500 dark:border-slate-800 dark:bg-slate-950/40">
                <Upload className="h-5 w-5 text-slate-400 mb-1" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Click to upload or drag &amp; drop
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  JPG, PNG, PDF (Max 5MB)
                </p>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>
      </div>

      {/* ── ACTION FOOTER ── */}
      <div className="flex items-center justify-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <button
          type="button"
          onClick={handleSaveDraft}
          className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Save as Draft
        </button>

        <button
          type="button"
          disabled={isSubmitting}
          onClick={handleSubmitShift}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              Submit Shift Summary
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
