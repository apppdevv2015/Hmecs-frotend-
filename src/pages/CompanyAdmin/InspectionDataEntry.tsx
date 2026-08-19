"use client";

import React, { useState, useEffect } from "react";
import {
  ClipboardCheck,
  Truck,
  Cog,
  Wrench,
  Activity,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Gauge,
  Zap,
  Save,
  Loader2,
  Building2,
  Sliders,
  Tag,
  Check,
  Layers,
  Plus,
  Trash2,
  RefreshCw,
  Pencil,
  Eye,
  X,
} from "lucide-react";
import { machineService } from "../../services/companyadmin/machineService";
import { componentService } from "../../services/companyadmin/componentService";
import { showSuccessToast, showErrorToast } from "../../utils/toastUtils";

type MachineItem = {
  id: string;
  name: string;
  model: string;
  serialNumber: string;
  equipmentType?: string;
  status?: string;
};

type DynamicCategory = {
  id: string;
  name: string;
  description?: string;
};

export default function InspectionDataEntry() {
  const [machines, setMachines] = useState<MachineItem[]>([]);
  const [selectedMachineId, setSelectedMachineId] = useState<string>("");
  const [selectedMachine, setSelectedMachine] = useState<MachineItem | null>(null);

  const [machineComponents, setMachineComponents] = useState<any[]>([]);
  const [totalFleetComponents, setTotalFleetComponents] = useState<number>(0);
  const [loadingComponents, setLoadingComponents] = useState(false);
  const [componentHealthMap, setComponentHealthMap] = useState<Record<string, { healthScore: number; status: string }>>({});

  // Stored Component Health Records for selected machine
  const [inspectedRecords, setInspectedRecords] = useState<any[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [selectedParamsRecord, setSelectedParamsRecord] = useState<any | null>(null);

  const loadInspectedRecords = async (machineId: string) => {
    if (!machineId) return;
    try {
      setLoadingRecords(true);
      const res: any = await machineService.getManualInspectionData(machineId);
      let records: any[] = [];
      if (res && res.data && Array.isArray(res.data.records)) {
        records = res.data.records;
      } else if (res && Array.isArray(res.records)) {
        records = res.records;
      } else if (Array.isArray(res)) {
        records = res;
      }
      setInspectedRecords(records);
    } catch (err) {
      console.error("Failed to load component health records:", err);
      setInspectedRecords([]);
    } finally {
      setLoadingRecords(false);
    }
  };

  // Dynamic Component Categories State (Fetched from Category Master API)
  const [categories, setCategories] = useState<DynamicCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [activeComponentTab, setActiveComponentTab] = useState<string>("Engine Assembly");

  const [loadingMachines, setLoadingMachines] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Result state after health calculation
  const [calcResult, setCalcResult] = useState<{
    status: string;
    healthScore: number;
    issues: string[];
    message: string;
  } | null>(null);

  // Dynamic Readings (Section A), Checklist (Section B), and Custom Admin Fields mapped per category tab
  const [readingsState, setReadingsState] = useState<Record<string, Record<string, string>>>({});
  const [checklistState, setChecklistState] = useState<Record<string, Record<string, string>>>({});
  const [customFieldsState, setCustomFieldsState] = useState<Record<string, Array<{ id: string; name: string; value: string }>>>({});

  // 1. Fetch Fleet Machines on mount
  useEffect(() => {
    const fetchFleet = async () => {
      setLoadingMachines(true);
      try {
        const res: any = await machineService.getMachines();
        if (res && res.data && Array.isArray(res.data)) {
          setMachines(res.data);
          if (res.data.length > 0) {
            setSelectedMachineId(res.data[0].id);
            setSelectedMachine(res.data[0]);
          }
        }
      } catch (err) {
        console.error("Failed to load machines:", err);
      } finally {
        setLoadingMachines(false);
      }
    };
    fetchFleet();
  }, []);

  // Fetch total fleet components count live on mount
  useEffect(() => {
    const fetchTotalComponentsCount = async () => {
      try {
        const res: any = await componentService.getComponents();
        let list: any[] = [];
        if (Array.isArray(res)) {
          list = res;
        } else if (res && Array.isArray(res.data)) {
          list = res.data;
        }
        setTotalFleetComponents(list.length);
      } catch (err) {
        console.error("Failed to fetch total fleet components count:", err);
        setTotalFleetComponents(0);
      }
    };
    fetchTotalComponentsCount();
  }, []);

const deriveComponentName = (item: any): string => {
  const directName = item?.name || item?.componentName || item?.component_name;
  if (directName && directName !== "General") {
    return String(directName);
  }

  const desc = String(item?.description || "").trim();
  if (desc) {
    const cleaned = desc.replace(/^Spec Notes:\s*/i, "").trim();
    const parts = cleaned.split(" - ");
    if (parts[0]) return parts[0].trim();
  }

  if (directName) return String(directName);

  return "Component";
};

  // 1b. Fetch registered components for selected machine directly by machine ID
  useEffect(() => {
    if (!selectedMachineId) return;

    const fetchMachineComponents = async () => {
      setLoadingComponents(true);
      try {
        const res: any = await componentService.getComponentsByMachineId(selectedMachineId);
        let list: any[] = [];
        if (Array.isArray(res)) {
          list = res;
        } else if (res && Array.isArray(res.data)) {
          list = res.data;
        }

        const mapped = list.map((c: any) => ({
          ...c,
          displayName: deriveComponentName(c),
          serialNumber: String(c.serialNumber || c.serial_number || "").replace(/^DEMO-/i, ""),
        }));

        setMachineComponents(mapped);
        if (mapped.length > 0) {
          setActiveComponentTab(mapped[0].displayName);
        }
      } catch (err) {
        console.error("Failed to load components for selected machine:", err);
        setMachineComponents([]);
      } finally {
        setLoadingComponents(false);
      }
    };

    fetchMachineComponents();
    loadInspectedRecords(selectedMachineId);
  }, [selectedMachineId]);

  // 2. Fetch Component Categories dynamically from Category Master API
  useEffect(() => {
    const loadCategories = async () => {
      setLoadingCategories(true);
      try {
        const res: any = await componentService.getCategories();
        let catData: any[] = [];
        if (Array.isArray(res)) {
          catData = res;
        } else if (res && Array.isArray(res.data)) {
          catData = res.data;
        }

        if (catData.length > 0) {
          const mapped = catData.map((c: any) => ({
            id: c.id || c.name,
            name: c.name,
            description: c.description || "",
          }));
          setCategories(mapped);
          setActiveComponentTab(mapped[0].name);
        } else {
          setCategories([]);
        }
      } catch (err) {
        console.error("Failed to load component categories from API:", err);
        setCategories([]);
      } finally {
        setLoadingCategories(false);
      }
    };

    loadCategories();
  }, []);

  // Helper to determine component-specific manual reading fields
  const getComponentMetricFields = (tabName: string) => {
    const name = tabName.toLowerCase();
    if (name.includes("battery")) {
      return [
        { key: "batteryVoltage", label: "Operating Voltage (V)", type: "number", placeholder: "e.g. 24.5" },
        { key: "batteryTemp", label: "Operating Temperature (°C)", type: "number", placeholder: "e.g. 35" },
        { key: "chargeState", label: "Battery Charge Level (%)", type: "number", placeholder: "e.g. 98" },
        { key: "faultCodes", label: "Diagnostic Fault Codes (DTCs)", type: "text", placeholder: "None or DTC-B001" },
      ];
    }
    if (name.includes("engine") || name.includes("diesel")) {
      return [
        { key: "coolantTemp", label: "Coolant Temperature (°C)", type: "number", placeholder: "e.g. 85" },
        { key: "engineOilPressure", label: "Engine Oil Pressure (bar)", type: "number", placeholder: "e.g. 4.2" },
        { key: "operatingRpm", label: "Operating RPM", type: "number", placeholder: "e.g. 1800" },
        { key: "faultCodes", label: "Diagnostic Fault Codes (DTCs)", type: "text", placeholder: "None" },
      ];
    }
    if (name.includes("brake")) {
      return [
        { key: "brakePressure", label: "Brake Hydraulic Pressure (bar)", type: "number", placeholder: "e.g. 150" },
        { key: "operatingTemp", label: "Brake Temperature (°C)", type: "number", placeholder: "e.g. 70" },
        { key: "fluidPressure", label: "Brake Fluid Line Pressure (bar)", type: "number", placeholder: "e.g. 120" },
        { key: "faultCodes", label: "Diagnostic Fault Codes (DTCs)", type: "text", placeholder: "None" },
      ];
    }
    if (name.includes("hydraulic") || name.includes("pump")) {
      return [
        { key: "systemPressure", label: "Main System Pressure (bar)", type: "number", placeholder: "e.g. 280" },
        { key: "operatingTemp", label: "Hydraulic Oil Temp (°C)", type: "number", placeholder: "e.g. 65" },
        { key: "returnPressure", label: "Return Line Pressure (bar)", type: "number", placeholder: "e.g. 12" },
        { key: "faultCodes", label: "Diagnostic Fault Codes (DTCs)", type: "text", placeholder: "None" },
      ];
    }
    if (name.includes("transmission") || name.includes("swing")) {
      return [
        { key: "transPressure", label: "Transmission Oil Pressure (bar)", type: "number", placeholder: "e.g. 22" },
        { key: "transTemp", label: "Transmission Temp (°C)", type: "number", placeholder: "e.g. 80" },
        { key: "converterPressure", label: "Torque Converter Pressure (bar)", type: "number", placeholder: "e.g. 15" },
        { key: "faultCodes", label: "Diagnostic Fault Codes (DTCs)", type: "text", placeholder: "None" },
      ];
    }
    if (name.includes("tyre") || name.includes("tire")) {
      return [
        { key: "tyreInflation", label: "Tyre Inflation Pressure (PSI)", type: "number", placeholder: "e.g. 105" },
        { key: "operatingTemp", label: "Tyre Surface Temp (°C)", type: "number", placeholder: "e.g. 45" },
        { key: "treadDepth", label: "Tread Depth (mm)", type: "number", placeholder: "e.g. 42" },
        { key: "faultCodes", label: "Diagnostic Notes & Code", type: "text", placeholder: "Normal" },
      ];
    }
    if (name.includes("fuel") || name.includes("delivery")) {
      return [
        { key: "fuelPressure", label: "Fuel Injection Pressure (bar)", type: "number", placeholder: "e.g. 1600" },
        { key: "fuelTemp", label: "Fuel Temperature (°C)", type: "number", placeholder: "e.g. 40" },
        { key: "flowRate", label: "Fuel Flow Rate (L/min)", type: "number", placeholder: "e.g. 45" },
        { key: "faultCodes", label: "Diagnostic Fault Codes (DTCs)", type: "text", placeholder: "None" },
      ];
    }
    if (name.includes("tank") || name.includes("nozzle") || name.includes("axle")) {
      return [
        { key: "tankLevel", label: "Operating Capacity / Level (%)", type: "number", placeholder: "e.g. 95" },
        { key: "operatingPressure", label: "Operating Pressure (bar)", type: "number", placeholder: "e.g. 8.5" },
        { key: "operatingTemp", label: "Operating Temperature (°C)", type: "number", placeholder: "e.g. 50" },
        { key: "faultCodes", label: "Diagnostic Notes / Codes", type: "text", placeholder: "None" },
      ];
    }

    return [
      { key: "operatingPressure", label: "Operating Pressure (bar)", type: "number", placeholder: "e.g. 10" },
      { key: "operatingTemp", label: "Operating Temperature (°C)", type: "number", placeholder: "e.g. 60" },
      { key: "coolantTemp", label: "Coolant / System Temp (°C)", type: "number", placeholder: "e.g. 75" },
      { key: "faultCodes", label: "Diagnostic Fault Codes (DTCs)", type: "text", placeholder: "None" },
    ];
  };

  // Helper to determine component-specific checklist fields
  const getComponentChecklistFields = (tabName: string) => {
    const name = tabName.toLowerCase();
    if (name.includes("battery")) {
      return [
        { key: "electrolyteLevel", label: "Electrolyte Fluid Level", options: ["Normal", "Low", "Critical Low"] },
        { key: "terminalCorrosion", label: "Terminal & Cable Corrosion", options: ["Pass", "Minor Corrosion", "Severe Corrosion"] },
        { key: "casingCondition", label: "Mechanical Casing & Seals", options: ["Normal", "Cracked/Sweating", "Damaged"] },
      ];
    }
    if (name.includes("engine") || name.includes("diesel")) {
      return [
        { key: "engineOilLevel", label: "Engine Oil & Fluid Level", options: ["Normal", "Low", "Critical Low"] },
        { key: "engineOilLeak", label: "Oil & Coolant Leakage", options: ["Pass", "Minor Seepage", "Severe Leak"] },
        { key: "exhaustBlowby", label: "Exhaust & Crankcase Blowby", options: ["Normal", "Black Smoke", "Severe Blowby"] },
      ];
    }
    if (name.includes("brake")) {
      return [
        { key: "padWear", label: "Brake Lining / Pad Wear", options: ["Normal (80%+)", "Moderate (40-70%)", "Critical Wear (<20%)"] },
        { key: "fluidLevel", label: "Brake Fluid Level", options: ["Normal", "Low", "Critical Low"] },
        { key: "leakageInspection", label: "Hydraulic Line Leakage", options: ["Pass", "Minor Seepage", "Severe Leak"] },
      ];
    }
    if (name.includes("hydraulic") || name.includes("pump")) {
      return [
        { key: "fluidLevel", label: "Hydraulic Fluid Level", options: ["Normal", "Low", "Critical Low"] },
        { key: "hoseInspection", label: "Hose & Fitting Inspection", options: ["Pass", "Minor Sweating", "Severe Leak/Burst"] },
        { key: "valveOperation", label: "Control Valve Operation", options: ["Normal", "Sluggish", "Failed/Stuck"] },
      ];
    }
    if (name.includes("tyre") || name.includes("tire")) {
      return [
        { key: "treadWear", label: "Tread Wear Condition", options: ["Normal", "Uneven Wear", "Severe Wear/Smooth"] },
        { key: "sidewallCut", label: "Sidewall & Bead Damage", options: ["Pass", "Minor Cut/Bulge", "Severe Cut/Damage"] },
        { key: "rimTorque", label: "Rim & Wheel Nut Torque", options: ["Normal", "Loose Nuts", "Rim Damage"] },
      ];
    }

    return [
      { key: "fluidLevel", label: "Fluid & Oil Level", options: ["Normal", "Low", "Critical Low"] },
      { key: "leakageInspection", label: "Leakage Inspection", options: ["Pass", "Minor", "Severe"] },
      { key: "mechanicalCondition", label: "Mechanical Condition", options: ["Normal", "Warning", "Failed"] },
    ];
  };

  // Field change handler for dynamic readings
  const handleReadingChange = (tabName: string, fieldKey: string, value: string) => {
    setReadingsState((prev) => ({
      ...prev,
      [tabName]: {
        ...(prev[tabName] || {}),
        [fieldKey]: value,
      },
    }));
  };

  // Field change handler for dynamic checklist
  const handleChecklistChange = (tabName: string, fieldKey: string, value: string) => {
    setChecklistState((prev) => ({
      ...prev,
      [tabName]: {
        ...(prev[tabName] || {}),
        [fieldKey]: value,
      },
    }));
  };

  // Custom Admin Field Handlers
  const addCustomField = (tabName: string) => {
    const newField = { id: `custom_${Date.now()}`, name: "", value: "" };
    setCustomFieldsState((prev) => ({
      ...prev,
      [tabName]: [...(prev[tabName] || []), newField],
    }));
  };

  const updateCustomFieldName = (tabName: string, id: string, name: string) => {
    setCustomFieldsState((prev) => ({
      ...prev,
      [tabName]: (prev[tabName] || []).map((f) => (f.id === id ? { ...f, name } : f)),
    }));
  };

  const updateCustomFieldValue = (tabName: string, id: string, value: string) => {
    setCustomFieldsState((prev) => ({
      ...prev,
      [tabName]: (prev[tabName] || []).map((f) => (f.id === id ? { ...f, value } : f)),
    }));
  };

  const removeCustomField = (tabName: string, id: string) => {
    setCustomFieldsState((prev) => ({
      ...prev,
      [tabName]: (prev[tabName] || []).filter((f) => f.id !== id),
    }));
  };

  // Get current reading value for field
  const getReadingValue = (tabName: string, fieldKey: string, defaultVal: string) => {
    return readingsState[tabName]?.[fieldKey] !== undefined
      ? readingsState[tabName][fieldKey]
      : defaultVal;
  };

  // Get current checklist value for field
  const getChecklistValue = (tabName: string, fieldKey: string, defaultVal: string) => {
    return checklistState[tabName]?.[fieldKey] !== undefined
      ? checklistState[tabName][fieldKey]
      : defaultVal;
  };

  // Update selected machine object when dropdown changes
  const handleMachineChange = (id: string) => {
    setSelectedMachineId(id);
    const found = machines.find((m) => m.id === id) || null;
    setSelectedMachine(found);
    setCalcResult(null);
  };

  // Submit Inspection & Calculate Health
  const handleSubmitInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMachineId) return;

    setSubmitting(true);
    setCalcResult(null);

    try {
      const readingsPayload: Record<string, string> = {};
      const checklistPayload: Record<string, string> = {};

      const customFields = (customFieldsState[activeComponentTab] || []).filter(
        (f) => f.name.trim() !== ""
      );

      const payload = {
        componentCategory: activeComponentTab,
        readings: readingsPayload,
        checklist: checklistPayload,
        customFields,
      };

      const res: any = await machineService.saveManualInspectionData(selectedMachineId, payload);

      if (res && (res.success !== false || res.status === 200 || res.data)) {
        const responseData = res.data || res;
        const compObj = responseData?.component || responseData?.componentHealth;
        const healthObj = responseData?.health || responseData;

        if (compObj?.healthScore !== undefined) {
          setComponentHealthMap((prev) => ({
            ...prev,
            [activeComponentTab]: {
              healthScore: compObj.healthScore,
              status: compObj.status || "Healthy",
            },
          }));
        }

        if (healthObj) {
          setCalcResult({
            status: healthObj.status || healthObj.machineStatus || "Healthy",
            healthScore: healthObj.healthScore !== undefined ? healthObj.healthScore : 100,
            issues: healthObj.issues || [],
            message: res.message || "Manual inspection data saved successfully.",
          });

          // Show Toast Notification!
          const toastMsg = `Inspection saved for ${activeComponentTab}. Health: ${compObj?.healthScore ?? 100}%, Machine Status: ${healthObj.status || healthObj.machineStatus || "Healthy"}`;
          showSuccessToast(toastMsg);

          // Refresh Component Health Table below
          await loadInspectedRecords(selectedMachineId);

          // Update local selected machine status
          if (selectedMachine) {
            setSelectedMachine({
              ...selectedMachine,
              status: healthObj.status || healthObj.machineStatus || "Healthy",
            });
          }
        }
      } else {
        showErrorToast(`Failed to save inspection: ${res?.message || "Server Error"}`);
      }
    } catch (err: any) {
      console.error("Error submitting manual data:", err);
      showErrorToast(`Error submitting inspection: ${err?.message || "Server Communication Error"}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditRecord = (rec: any) => {
    const compName = rec.componentName;
    setActiveComponentTab(compName);

    const params = Array.isArray(rec.parameters)
      ? rec.parameters
      : rec.parameters?.customFields || [];

    if (params.length > 0) {
      setCustomFieldsState((prev) => ({
        ...prev,
        [compName]: params.map((p: any, idx: number) => ({
          id: `custom_edit_${Date.now()}_${idx}`,
          name: p.name || "",
          value: p.value || "",
        })),
      }));
    }

    window.scrollTo({ top: 320, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 font-sans text-slate-900 dark:bg-[#07111f] dark:text-white sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        {/* Premium Header Banner */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-r from-[#1D4ED8] via-[#2563EB] to-[#3B82F6] p-6 text-white shadow-xl dark:border-slate-800">
          <div className="relative z-10 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                <Building2 size={14} />
                Company Admin Inspection Master
              </div>
              <h1 className="text-3xl font-black tracking-tight">
                Inspection & Manual Data Capture
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-blue-100">
                Select any fleet machine and enter manual operating parameters and physical inspection checklists. Component Categories are dynamically fetched live from your Category Master.
              </p>
            </div>

            <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-md">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-200">
                Access Level
              </span>
              <div className="mt-1 flex items-center gap-2 font-black text-white">
                <ShieldCheck size={18} className="text-emerald-400" />
                Company Admin (Write Permission)
              </div>
            </div>
          </div>
        </div>

        {/* Machine Selector Bar */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="w-full sm:w-72 md:w-80 shrink-0">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Select Fleet Machine *
              </label>
              {loadingMachines ? (
                <div className="mt-1.5 flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 size={16} className="animate-spin" /> Loading fleet machines...
                </div>
              ) : (
                <select
                  value={selectedMachineId}
                  onChange={(e) => handleMachineChange(e.target.value)}
                  className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-semibold text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:bg-white dark:border-slate-800 dark:bg-[#101f33] dark:text-white"
                >
                  {machines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Fleet Overview & Machine Stats Badges */}
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-[#101f33]">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700 shadow-xs dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                <Truck size={13} className="text-blue-500" /> {machines.length} Fleet Machines
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300">
                <Layers size={13} /> {totalFleetComponents} Total Components
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
                <Layers size={13} /> {machineComponents.length} Machine Components
              </span>

              {selectedMachine && (
                selectedMachine.status === "Critical" ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-black text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
                    <AlertTriangle size={14} /> Critical Risk
                  </span>
                ) : selectedMachine.status === "Warning" ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-black text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
                    <AlertTriangle size={14} /> Warning Status
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400">
                    <CheckCircle2 size={14} /> Healthy (Optimal)
                  </span>
                )
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Component Category Selector Tabs (Loaded from Machine Registered Components API) */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {machineComponents.length > 0
                ? `Registered Machine Components (${machineComponents.length} Components Found for ${selectedMachine?.name || "Machine"})`
                : `Component Categories (${categories.length} Master Categories)`}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400">
              <Check size={12} /> Live API Components
            </span>
          </div>

          <div className="flex overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
            {loadingComponents ? (
              <div className="flex items-center gap-2 px-4 py-3 text-xs font-semibold text-slate-500">
                <Loader2 size={14} className="animate-spin" /> Loading components for selected machine...
              </div>
            ) : machineComponents.length > 0 ? (
              machineComponents.map((comp) => {
                const compName = comp.displayName || comp.name || comp.description || comp.category || "Component";
                const isActive = activeComponentTab === compName;

                const healthInfo = componentHealthMap[compName] || (comp.healthScore !== null && comp.healthScore !== undefined ? { healthScore: comp.healthScore, status: comp.status || "Healthy" } : null);

                return (
                  <button
                    key={comp.id}
                    type="button"
                    onClick={() => {
                      setActiveComponentTab(compName);
                      setCalcResult(null);
                    }}
                    className={`flex items-center gap-2.5 rounded-xl px-5 py-3 text-xs font-extrabold whitespace-nowrap transition-all ${
                      isActive
                        ? "bg-blue-600 text-white shadow-md"
                        : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-[#101f33]"
                    }`}
                  >
                    <Cog size={16} />
                    <span>{compName}</span>

                    {healthInfo ? (
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-black uppercase ${
                          healthInfo.healthScore < 50
                            ? "bg-red-500 text-white"
                            : healthInfo.healthScore < 85
                            ? "bg-amber-500 text-white"
                            : "bg-emerald-500 text-white"
                        }`}
                      >
                        {healthInfo.healthScore}%
                      </span>
                    ) : (
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                          isActive
                            ? "bg-white/20 text-white"
                            : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                        }`}
                      >
                        Uncalculated
                      </span>
                    )}
                  </button>
                );
              })
            ) : (
              categories.map((tab) => {
                const isActive = activeComponentTab === tab.name;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setActiveComponentTab(tab.name);
                      setCalcResult(null);
                    }}
                    className={`flex items-center gap-2.5 rounded-xl px-5 py-3 text-xs font-extrabold whitespace-nowrap transition-all ${
                      isActive
                        ? "bg-blue-600 text-white shadow-md"
                        : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-[#101f33]"
                    }`}
                  >
                    <Cog size={16} />
                    {tab.name}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Calculated Health Result Alert Banner */}
        {calcResult && (
          <div
            className={`rounded-3xl border p-6 shadow-md transition-all ${
              calcResult.status === "Critical"
                ? "border-red-300 bg-red-50 text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"
                : calcResult.status === "Warning"
                ? "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200"
                : "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200"
            }`}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2 font-black">
                  {calcResult.status === "Critical" ? (
                    <AlertTriangle size={20} className="text-red-600" />
                  ) : calcResult.status === "Warning" ? (
                    <AlertTriangle size={20} className="text-amber-600" />
                  ) : (
                    <CheckCircle2 size={20} className="text-emerald-600" />
                  )}
                  <span className="text-lg uppercase">
                    Calculated Status: {calcResult.status} (Health Score: {calcResult.healthScore}%)
                  </span>
                </div>
                <p className="mt-1 text-sm font-medium opacity-90">{calcResult.message}</p>
              </div>

              {calcResult.issues.length > 0 && (
                <div className="rounded-2xl bg-white/60 p-3 backdrop-blur-sm dark:bg-black/20">
                  <span className="text-xs font-bold uppercase tracking-wider">Detected Risk Factors:</span>
                  <ul className="mt-1 list-disc pl-4 text-xs font-semibold">
                    {calcResult.issues.map((iss, i) => (
                      <li key={i}>{iss}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Form: Section A & Section B */}
        <form onSubmit={handleSubmitInspection} className="space-y-6">
          {/* SECTION A: DYNAMIC MANUAL OPERATING READINGS */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
            <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
              <h3 className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
                <Gauge size={20} className="text-blue-600" />
                Section A: Manual Operating Readings ({activeComponentTab})
              </h3>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Component-Specific Metric Fields
              </span>
            </div>

            {/* 100% DYNAMIC MANUAL INSPECTION FIELDS BUILDER FOR ACTIVE COMPONENT */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-extrabold uppercase tracking-wide text-slate-800 dark:text-white">
                    Manual Inspection Parameters ({activeComponentTab})
                  </h4>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Add custom parameter fields and fill in values for {activeComponentTab}.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => addCustomField(activeComponentTab)}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-blue-700 active:scale-95"
                >
                  <Plus size={16} strokeWidth={2.4} />
                  Add Inspection Field
                </button>
              </div>

              {(customFieldsState[activeComponentTab] || []).length > 0 ? (
                <div className="space-y-3 pt-2">
                  {(customFieldsState[activeComponentTab] || []).map((field, idx) => (
                    <div
                      key={field.id}
                      className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-[#101f33] sm:flex-row sm:items-center"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-xs font-black text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                        {idx + 1}
                      </div>

                      <div className="w-full sm:w-1/2">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Parameter Name
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Operating Temp (°C), Pressure (bar), Tread Depth"
                          value={field.name}
                          onChange={(e) => updateCustomFieldName(activeComponentTab, field.id, e.target.value)}
                          className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-900 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                      </div>

                      <div className="w-full sm:w-1/2">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Parameter Value / Reading
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 85, 4.2 bar, Normal, Pass, DTC-001"
                          value={field.value}
                          onChange={(e) => updateCustomFieldValue(activeComponentTab, field.id, e.target.value)}
                          className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-extrabold text-slate-900 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => removeCustomField(activeComponentTab, field.id)}
                        className="mt-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400 sm:mt-4"
                        title="Delete Field"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 py-10 text-center dark:border-slate-700">
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    No inspection parameters defined for <span className="text-blue-600 dark:text-blue-400">{activeComponentTab}</span> yet.
                  </p>
                  <button
                    type="button"
                    onClick={() => addCustomField(activeComponentTab)}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-extrabold text-blue-700 transition hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300"
                  >
                    <Plus size={15} /> Add First Inspection Field
                  </button>
                </div>
              )}
            </div>
          </div>



          {/* SUBMIT BUTTON */}
          <div className="flex items-center justify-end gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
            <button
              type="submit"
              disabled={submitting || !selectedMachineId}
              className="flex items-center gap-2 rounded-2xl bg-blue-600 px-8 py-4 text-base font-extrabold text-white shadow-xl transition hover:bg-blue-700 active:scale-95 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 size={20} className="animate-spin" /> Submitting...
                </>
              ) : (
                <>
                  <Save size={20} /> Submit
                </>
              )}
            </button>
          </div>
        </form>

        {/* STORED COMPONENT HEALTH & INSPECTION PARAMETERS TABLE */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
            <div>
              <h3 className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
                <Layers size={20} className="text-blue-600" />
                Stored Component Health Records ({selectedMachine?.name || "Selected Machine"})
              </h3>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Live inspection parameters and health status records saved in database for {selectedMachine?.name || "this machine"}.
              </p>
            </div>
            <button
              type="button"
              onClick={() => loadInspectedRecords(selectedMachineId)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-[#101f33] dark:text-slate-300"
            >
              <RefreshCw size={14} /> Refresh Table
            </button>
          </div>

          {loadingRecords ? (
            <div className="flex items-center justify-center py-12 text-sm text-slate-500">
              <Loader2 size={20} className="mr-2 animate-spin text-blue-600" />
              Loading stored component health records...
            </div>
          ) : inspectedRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 py-12 text-center dark:border-slate-700">
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                <Layers size={22} />
              </div>
              <h4 className="text-sm font-extrabold text-slate-800 dark:text-white">
                No Component Health Records Stored Yet
              </h4>
              <p className="mt-1 max-w-sm text-xs text-slate-500">
                Select a component tab above, add custom inspection fields, and click "Submit" to calculate & store the record.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-[#101f33] dark:text-slate-400">
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Component Name</th>
                    <th className="px-4 py-3">Serial Number</th>
                    <th className="px-4 py-3">Inspected Parameters & Values</th>
                    <th className="px-4 py-3">Health Score</th>
                    <th className="px-4 py-3">Last Inspected At</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-semibold">
                  {inspectedRecords.map((rec, idx) => {
                    const paramsList = Array.isArray(rec.parameters)
                      ? rec.parameters
                      : rec.parameters?.customFields || [];
                    const score = Number(rec.healthScore ?? rec.health_score ?? 100);
                    const isCrit = score < 50 || rec.status === "Critical";
                    const isWarn = (score >= 50 && score < 85) || rec.status === "Warning";

                    return (
                      <tr key={rec.id || idx} className="hover:bg-slate-50/70 dark:hover:bg-[#101f33]/50">
                        <td className="px-4 py-3 text-slate-400 font-extrabold">{idx + 1}</td>
                        <td className="px-4 py-3 font-extrabold text-slate-900 dark:text-white">
                          {rec.componentName}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {rec.serialNumber || "S/N: N/A"}
                        </td>
                        <td className="px-4 py-3">
                          {paramsList.length > 0 ? (
                            <button
                              type="button"
                              onClick={() => setSelectedParamsRecord(rec)}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-extrabold text-blue-700 transition hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300"
                            >
                              <Eye size={14} /> View All ({paramsList.length})
                            </button>
                          ) : (
                            <span className="italic text-slate-400">Standard metric checks</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                                isCrit
                                  ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                                  : isWarn
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                              }`}
                            >
                              {isCrit ? "Critical" : isWarn ? "Warning" : "Healthy"}
                            </span>
                            <span className="font-extrabold text-slate-800 dark:text-slate-200">{score}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {rec.createdAt ? new Date(rec.createdAt).toLocaleString() : "Just now"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleEditRecord(rec)}
                            className="inline-flex h-8.5 w-8.5 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700 transition hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300"
                            title="Edit / Update Parameters"
                          >
                            <Pencil size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* VIEW ALL PARAMETERS & VALUES MODAL */}
        {selectedParamsRecord && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
            <div className="max-h-[90vh] w-full max-w-xl overflow-hidden rounded-3xl border border-slate-700 bg-white shadow-2xl dark:bg-[#0b1728]">
              <div className="flex items-center justify-between border-b border-blue-700/30 bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 p-5 text-white">
                <div>
                  <h3 className="text-base font-black tracking-tight">
                    Inspected Parameters ({selectedParamsRecord.componentName})
                  </h3>
                  <p className="mt-0.5 text-xs text-blue-200 font-semibold">
                    {selectedParamsRecord.serialNumber || "S/N: N/A"} • Health Score: {selectedParamsRecord.healthScore}% ({selectedParamsRecord.status})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedParamsRecord(null)}
                  className="rounded-xl p-2 text-blue-100 transition hover:bg-white/10 hover:text-white"
                >
                  <X size={20} strokeWidth={2.4} />
                </button>
              </div>

              <div className="max-h-[calc(90vh-130px)] overflow-y-auto p-5">
                {(() => {
                  const paramsList = Array.isArray(selectedParamsRecord.parameters)
                    ? selectedParamsRecord.parameters
                    : selectedParamsRecord.parameters?.customFields || [];

                  return paramsList.length > 0 ? (
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-[#101f33] dark:text-slate-400">
                          <th className="px-4 py-3">#</th>
                          <th className="px-4 py-3">Parameter Name</th>
                          <th className="px-4 py-3">Value / Reading</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-semibold">
                        {paramsList.map((p: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-[#101f33]/50">
                            <td className="px-4 py-3 text-slate-400 font-extrabold">{idx + 1}</td>
                            <td className="px-4 py-3 font-extrabold text-slate-900 dark:text-white">
                              {p.name || "Parameter"}
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
                                {p.value || "-"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-center text-xs font-bold text-slate-400 py-8">
                      No custom parameter values recorded.
                    </p>
                  );
                })()}

                <div className="mt-6 flex justify-end border-t border-slate-200 pt-4 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setSelectedParamsRecord(null)}
                    className="rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-extrabold text-white transition hover:bg-blue-700 active:scale-95"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
