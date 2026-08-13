import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  Truck,
  Box,
  MapPin,
  User,
  Clock,
  Calendar,
  AlertTriangle,
  Flag,
  ChevronDown,
  Layers,
  FileText,
  Edit,
} from "lucide-react";
import StorageService, { STORAGE_KEYS } from "../../services/storage.service";
import { fleetService } from "../../services/Fleet/fleetService";
import { showSuccessToast, showErrorToast } from "../../utils/toastUtils";
import AppSelect from "../../components/ui/dropdown/AppSelect";

// ---------------------------------------------------------------------------
// TYPES & CONSTANTS
// ---------------------------------------------------------------------------

type WorkOrderRecord = {
  id: string;
  code: string;
  type: string;
  material: string;
  route: string;
  time: string;
  status: "In Progress" | "Completed" | "Pending";
};

const INITIAL_WORK_ORDERS: WorkOrderRecord[] = [
  {
    id: "wo-1",
    code: "WO-2026-00048",
    type: "Hauling",
    material: "Iron Ore",
    route: "Pit A ➔ Crusher 02",
    time: "Started: 07:15 AM",
    status: "In Progress",
  },
  {
    id: "wo-2",
    code: "WO-2026-00047",
    type: "Hauling",
    material: "Iron Ore",
    route: "Pit B ➔ Crusher 01",
    time: "Completed: 05:45 AM",
    status: "Completed",
  },
];

export default function WorkOrderCapture() {
  const navigate = useNavigate();

  // User info
  const storedUser =
    StorageService.get<any>(STORAGE_KEYS.USER) ||
    StorageService.get<any>("user") ||
    {};
  const userName = storedUser?.name || "Ankush Waliya";

  // Machine state
  const [machine, setMachine] = useState({
    name: "CAT-777-DEMO",
    type: "Dump Truck",
    serialNumber: "SN-CAT-777-DEMO",
    currentHours: "4,800 hrs",
    location: "Pit A - Haul Road",
    status: "Pre-Start Inspection Passed",
    inspectionTime: "03 Aug 2026, 08:30 AM",
    image:
      "https://images.unsplash.com/photo-1579412690850-bd41cd0af397?auto=format&fit=crop&q=80&w=800",
  });

  // Form State
  const [workOrderType, setWorkOrderType] = useState("Hauling");
  const [workOrderNumber, setWorkOrderNumber] = useState("WO-2026-00049");
  const [priority, setPriority] = useState("High");
  const [projectMine, setProjectMine] = useState("Kalahari Mine");
  const [taskActivity, setTaskActivity] = useState("Hauling");
  const [shift, setShift] = useState("Morning Shift (06:00 AM - 02:00 PM)");

  // Material Info
  const [materialType, setMaterialType] = useState("Iron Ore");
  const [materialCode, setMaterialCode] = useState("IO-01");
  const [estimatedQuantity, setEstimatedQuantity] = useState("450");

  // Location Details
  const [loadingPoint, setLoadingPoint] = useState("Pit A");
  const [destinationPoint, setDestinationPoint] = useState("Crusher 02");
  const [haulRoadRoute, setHaulRoadRoute] = useState("Haul Road A-1");

  // Assignment Details
  const [supervisor, setSupervisor] = useState("John Smith");
  const [plannerDispatcher, setPlannerDispatcher] = useState("Michael Brown");
  const [expectedStartTime, setExpectedStartTime] = useState("2026-08-03T08:45");
  const [expectedEndTime, setExpectedEndTime] = useState("2026-08-03T16:45");
  const [notes, setNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [workOrdersList, setWorkOrdersList] = useState<WorkOrderRecord[]>(INITIAL_WORK_ORDERS);

  // Load live machine if available
  useEffect(() => {
    const loadFleet = async () => {
      try {
        const machines = await fleetService.getFleetMachines();
        if (machines && machines.length > 0) {
          const m = machines[0];
          setMachine((prev) => ({
            ...prev,
            name: m.machineName || "CAT-777-DEMO",
            type: m.machineType || "Dump Truck",
            serialNumber: m.fleetId || "SN-CAT-777-DEMO",
            currentHours: `${m.hoursRun || 4800} hrs`,
            location: m.location || "Pit A - Haul Road",
          }));
        }
      } catch (err) {}
    };
    loadFleet();
  }, []);

  const handleSaveDraft = () => {
    showSuccessToast("Work order draft saved successfully!");
  };

  const handleStartWorkOrder = () => {
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);

      const newWO: WorkOrderRecord = {
        id: `wo-${Date.now()}`,
        code: workOrderNumber,
        type: workOrderType,
        material: materialType,
        route: `${loadingPoint} ➔ ${destinationPoint}`,
        time: `Started: ${new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        })}`,
        status: "In Progress",
      };

      setWorkOrdersList([newWO, ...workOrdersList]);
      showSuccessToast(`Work order ${workOrderNumber} started successfully!`);

      // Navigate to Step 3: Active Task
      navigate("/operator/active-task");
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 font-sans text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-50 sm:p-6 lg:p-8 space-y-6">
      {/* ── HEADER / BREADCRUMB ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Work Order Capture
          </h1>
          <div className="mt-1 flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Operations</span>
            <span>•</span>
            <span className="font-semibold text-blue-600 dark:text-blue-400">
              Work Order Capture
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

          {/* Step 2 (Active) */}
          <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50/70 p-3 shadow-xs dark:border-blue-800 dark:bg-blue-900/20">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white shadow-md shadow-blue-500/20">
              2
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                Work Order Capture
              </p>
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                In Progress
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div
            onClick={() => navigate("/operator/active-task")}
            className="flex items-center gap-3 rounded-xl p-3 cursor-pointer opacity-60 transition hover:opacity-90"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
              3
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                Active Task
              </p>
              <p className="text-xs font-medium text-slate-400">Pending</p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex items-center gap-3 rounded-xl p-3 opacity-60">
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

      {/* ── MAIN CONTENT GRID (2 COLUMNS) ── */}
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        {/* LEFT COLUMN: Selected Machine & Today's Work Orders */}
        <div className="space-y-6">
          {/* Selected Machine Card */}
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Selected Machine
              </h2>
              <button
                type="button"
                onClick={() => navigate("/operator/machines")}
                className="text-xs font-bold text-blue-600 hover:underline dark:text-blue-400"
              >
                Edit
              </button>
            </div>

            {/* Machine Image */}
            <div className="relative h-44 w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
              <img
                src={machine.image}
                alt={machine.name}
                className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
              />
            </div>

            {/* Machine Name */}
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                {machine.name}
              </h3>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {machine.type}
              </p>
            </div>

            {/* Machine Attributes */}
            <div className="space-y-2.5 border-t border-slate-100 pt-4 text-xs dark:border-slate-800">
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

            {/* Pre-Start Passed Banner */}
            <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 dark:border-emerald-900/40 dark:bg-emerald-950/20">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                  {machine.status}
                </p>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                  {machine.inspectionTime}
                </p>
              </div>
            </div>
          </div>

          {/* Today's Work Orders Card */}
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Today&apos;s Work Orders
              </h2>
              <button
                type="button"
                className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
              >
                View All
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {workOrdersList.map((wo) => (
                <div key={wo.id} className="py-3 first:pt-0 last:pb-0 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      {wo.code}
                    </p>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        wo.status === "In Progress"
                          ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
                          : "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                      }`}
                    >
                      {wo.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {wo.type} - {wo.material}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {wo.route}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {wo.time}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Capture Work Order Details Form */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
          {/* Form Header */}
          <div className="border-b border-slate-100 pb-5 dark:border-slate-800">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Capture Work Order Details
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Select or create a work order to start operating the machine.
            </p>
          </div>

          {/* Form Content */}
          <div className="space-y-6">
            {/* ROW 1: Type, Number, Priority */}
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Work Order Type <span className="text-rose-500">*</span>
                </label>
                <AppSelect
                  value={workOrderType}
                  options={[
                    { label: "Hauling", value: "Hauling" },
                    { label: "Excavation", value: "Excavation" },
                    { label: "Maintenance", value: "Maintenance" },
                    { label: "Dumping", value: "Dumping" },
                  ]}
                  onChange={setWorkOrderType}
                  triggerClassName="h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950/40 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Work Order Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={workOrderNumber}
                  onChange={(e) => setWorkOrderNumber(e.target.value)}
                  className="h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-950/40 dark:text-white dark:focus:border-blue-400"
                />
                <span className="mt-1 block text-[10px] text-slate-400">
                  Auto generated next number
                </span>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Priority <span className="text-rose-500">*</span>
                </label>
                <AppSelect
                  value={priority}
                  options={[
                    { label: "🚩 High", value: "High" },
                    { label: "Medium", value: "Medium" },
                    { label: "Low", value: "Low" },
                    { label: "Critical", value: "Critical" },
                  ]}
                  onChange={setPriority}
                  triggerClassName="h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950/40 dark:text-white"
                />
              </div>
            </div>

            {/* ROW 2: Mine, Activity, Shift */}
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Project / Mine <span className="text-rose-500">*</span>
                </label>
                <AppSelect
                  value={projectMine}
                  options={[
                    { label: "Kalahari Mine", value: "Kalahari Mine" },
                    { label: "Tata Site A", value: "Tata Site A" },
                    { label: "Pit B Location", value: "Pit B Location" },
                  ]}
                  onChange={setProjectMine}
                  triggerClassName="h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950/40 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Task / Activity <span className="text-rose-500">*</span>
                </label>
                <AppSelect
                  value={taskActivity}
                  options={[
                    { label: "Hauling", value: "Hauling" },
                    { label: "Overburden Removal", value: "Overburden Removal" },
                    { label: "Stockpiling", value: "Stockpiling" },
                  ]}
                  onChange={setTaskActivity}
                  triggerClassName="h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950/40 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Shift <span className="text-rose-500">*</span>
                </label>
                <AppSelect
                  value={shift}
                  options={[
                    {
                      label: "Morning Shift (06:00 AM - 02:00 PM)",
                      value: "Morning Shift (06:00 AM - 02:00 PM)",
                    },
                    {
                      label: "Afternoon Shift (02:00 PM - 10:00 PM)",
                      value: "Afternoon Shift (02:00 PM - 10:00 PM)",
                    },
                    {
                      label: "Night Shift (10:00 PM - 06:00 AM)",
                      value: "Night Shift (10:00 PM - 06:00 AM)",
                    },
                  ]}
                  onChange={setShift}
                  triggerClassName="h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950/40 dark:text-white"
                />
              </div>
            </div>

            {/* SECTION 1: Material Information */}
            <div className="space-y-4 rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-950/30">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                <Box className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>Material Information</span>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Material Type <span className="text-rose-500">*</span>
                  </label>
                  <AppSelect
                    value={materialType}
                    options={[
                      { label: "Iron Ore", value: "Iron Ore" },
                      { label: "Coal", value: "Coal" },
                      { label: "Bauxite", value: "Bauxite" },
                      { label: "Waste Rock", value: "Waste Rock" },
                    ]}
                    onChange={setMaterialType}
                    triggerClassName="h-[42px] w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Material Code
                  </label>
                  <input
                    type="text"
                    value={materialCode}
                    onChange={(e) => setMaterialCode(e.target.value)}
                    className="h-[42px] w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Estimated Quantity
                  </label>
                  <div className="flex h-[42px] items-center overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                    <input
                      type="number"
                      value={estimatedQuantity}
                      onChange={(e) => setEstimatedQuantity(e.target.value)}
                      className="h-full w-full bg-transparent px-3 text-xs font-semibold text-slate-900 outline-none dark:text-white"
                    />
                    <span className="flex h-full items-center bg-slate-100 px-3 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      Ton
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: Location Details */}
            <div className="space-y-4 rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-950/30">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>Location Details</span>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Loading Point / Source <span className="text-rose-500">*</span>
                  </label>
                  <AppSelect
                    value={loadingPoint}
                    options={[
                      { label: "Pit A", value: "Pit A" },
                      { label: "Pit B", value: "Pit B" },
                      { label: "Stockpile 01", value: "Stockpile 01" },
                    ]}
                    onChange={setLoadingPoint}
                    triggerClassName="h-[42px] w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Destination / Dump Point <span className="text-rose-500">*</span>
                  </label>
                  <AppSelect
                    value={destinationPoint}
                    options={[
                      { label: "Crusher 02", value: "Crusher 02" },
                      { label: "Waste Dump A", value: "Waste Dump A" },
                      { label: "Crusher 01", value: "Crusher 01" },
                    ]}
                    onChange={setDestinationPoint}
                    triggerClassName="h-[42px] w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Haul Road / Route
                  </label>
                  <AppSelect
                    value={haulRoadRoute}
                    options={[
                      { label: "Haul Road A-1", value: "Haul Road A-1" },
                      { label: "Haul Road B-2", value: "Haul Road B-2" },
                      { label: "Direct Access Route", value: "Direct Access Route" },
                    ]}
                    onChange={setHaulRoadRoute}
                    triggerClassName="h-[42px] w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 3: Assignment Details */}
            <div className="space-y-4 rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-950/30">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>Assignment Details</span>
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Supervisor
                  </label>
                  <AppSelect
                    value={supervisor}
                    options={[
                      { label: "John Smith", value: "John Smith" },
                      { label: "Rahul Sharma", value: "Rahul Sharma" },
                      { label: "Vikram Patel", value: "Vikram Patel" },
                    ]}
                    onChange={setSupervisor}
                    triggerClassName="h-[42px] w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Planner / Dispatcher
                  </label>
                  <AppSelect
                    value={plannerDispatcher}
                    options={[
                      { label: "Michael Brown", value: "Michael Brown" },
                      { label: "Amit Verma", value: "Amit Verma" },
                    ]}
                    onChange={setPlannerDispatcher}
                    triggerClassName="h-[42px] w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Expected Start Time <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative flex h-[42px] items-center rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-800 dark:bg-slate-900">
                    <Calendar className="mr-2 h-4 w-4 text-slate-400" />
                    <input
                      type="datetime-local"
                      value={expectedStartTime}
                      onChange={(e) => setExpectedStartTime(e.target.value)}
                      className="w-full bg-transparent text-xs font-semibold text-slate-900 outline-none dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Expected End Time
                  </label>
                  <div className="relative flex h-[42px] items-center rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-800 dark:bg-slate-900">
                    <Calendar className="mr-2 h-4 w-4 text-slate-400" />
                    <input
                      type="datetime-local"
                      value={expectedEndTime}
                      onChange={(e) => setExpectedEndTime(e.target.value)}
                      className="w-full bg-transparent text-xs font-semibold text-slate-900 outline-none dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Notes / Instructions */}
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                Notes / Instructions
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter any special instructions or notes..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs outline-none focus:border-blue-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950/40 dark:text-white dark:focus:border-blue-400"
              />
            </div>
          </div>

          {/* Form Footer Action Buttons */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-5 dark:border-slate-800">
            <button
              type="button"
              onClick={() => navigate("/operator/dashboard")}
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>

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
              onClick={handleStartWorkOrder}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  Start Work Order
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
