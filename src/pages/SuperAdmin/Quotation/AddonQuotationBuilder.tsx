import { useState, useMemo, type FC } from "react";
import {
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Hash,
  HelpCircle,
  Landmark,
  Layers,
  Loader2,
  Minus,
  Percent,
  Plus,
  Receipt,
  Send,
  ShieldCheck,
  Sparkles,
  Truck,
  UploadCloud,
  Zap,
} from "lucide-react";
import toast from "react-hot-toast";
import { createAddonQuotation, type AddonQuotationPayload } from "../../../services/Quotation/quotationService";

/* ============================================================
   TYPES & CONSTANTS
============================================================ */

interface EquipmentOption {
  id: string;
  name: string;
  icon: string;
  defaultRate: number;
}

const EQUIPMENT_TYPES: EquipmentOption[] = [
  { id: "excavator", name: "Hydraulic Excavators", icon: "🚜", defaultRate: 1800 },
  { id: "haul_truck", name: "Heavy Haul Trucks", icon: "🚛", defaultRate: 2200 },
  { id: "drill_rig", name: "Rotary Drill Rigs", icon: "🏗️", defaultRate: 2500 },
  { id: "wheel_loader", name: "Wheel Loaders", icon: "🚜", defaultRate: 1500 },
  { id: "bulldozer", name: "Track Bulldozers", icon: "🚜", defaultRate: 1700 },
  { id: "grader", name: "Motor Graders", icon: "🛣️", defaultRate: 1400 },
  { id: "underground", name: "Underground Loaders/LHD", icon: "⛏️", defaultRate: 2600 },
];

interface OptionalServiceItem {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  badge?: string;
}

const AVAILABLE_OPTIONAL_SERVICES: OptionalServiceItem[] = [
  {
    id: "telematics",
    name: "Telematics & CAN-Bus Live Ingestion",
    description: "Real-time engine, hydraulic & transmission telemetry ingestion pipeline.",
    monthlyPrice: 3500,
    badge: "Popular",
  },
  {
    id: "erp_sync",
    name: "SAP & Enterprise ERP Automated Sync",
    description: "Direct bidirectional inventory and purchase order integration with SAP PM.",
    monthlyPrice: 5000,
  },
  {
    id: "ai_predictive",
    name: "24/7 Deep Learning Component Health Prediction",
    description: "Neural net RUL (Remaining Useful Life) estimates with 94.2% accuracy.",
    monthlyPrice: 4200,
    badge: "Recommended",
  },
  {
    id: "dedicated_support",
    name: "Dedicated Reliability Engineer (Remote SLA 1hr)",
    description: "Priority triage and weekly component failure mitigation consultations.",
    monthlyPrice: 8500,
  },
];

const PRESET_CLIENTS = [
  {
    id: "COMP-001",
    name: "Anglo American Platinum",
    contactPerson: "David Ndlovu",
    email: "d.ndlovu@angloamerican.co.za",
    phone: "+27 11 373 6111",
    activeMachines: 45,
    contractDuration: "24",
  },
  {
    id: "COMP-002",
    name: "Glencore Coal Operations",
    contactPerson: "Sarah Jenkins",
    email: "s.jenkins@glencore.com",
    phone: "+27 13 656 7000",
    activeMachines: 80,
    contractDuration: "12",
  },
  {
    id: "COMP-003",
    name: "Exxaro Resources Ltd",
    contactPerson: "Kagiso Molefe",
    email: "k.molefe@exxaro.com",
    phone: "+27 12 307 5000",
    activeMachines: 62,
    contractDuration: "36",
  },
];

/* ============================================================
   MAIN COMPONENT
============================================================ */

export const AddonQuotationBuilder: FC = () => {
  // Form State
  const [selectedClientPreset, setSelectedClientPreset] = useState<string>("");
  const [companyName, setCompanyName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  
  // Addon Configuration
  const [extraMachines, setExtraMachines] = useState<number>(5);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>(["excavator", "haul_truck"]);
  const [ratePerMachine, setRatePerMachine] = useState<number>(1800);
  const [extraSites, setExtraSites] = useState<number>(1);
  const [siteNamesInput, setSiteNamesInput] = useState<string>("Rustenburg South Pit");
  const [contractDuration, setContractDuration] = useState<string>("12");
  const [selectedServices, setSelectedServices] = useState<string[]>(["telematics", "ai_predictive"]);

  // Payment & EFT State
  const [paymentMethod, setPaymentMethod] = useState<"EFT" | "PAYFAST" | "INVOICE">("EFT");
  const [customDiscount, setCustomDiscount] = useState<number>(0);
  const [popFileUrl, setPopFileUrl] = useState<string>("");
  const [isPopUploading, setIsPopUploading] = useState<boolean>(false);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedSuccessQuote, setGeneratedSuccessQuote] = useState<any>(null);

  // Auto-fill client when selected from preset
  const handleClientPresetChange = (clientId: string) => {
    setSelectedClientPreset(clientId);
    const client = PRESET_CLIENTS.find((c) => c.id === clientId);
    if (client) {
      setCompanyName(client.name);
      setContactPerson(client.contactPerson);
      setContactEmail(client.email);
      setContactPhone(client.phone);
      setContractDuration(client.contractDuration);
    }
  };

  // Toggle Equipment Type
  const toggleEquipment = (id: string) => {
    setSelectedEquipment((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Toggle Optional Service
  const toggleService = (id: string) => {
    setSelectedServices((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Dynamic Calculation
  const calculation = useMemo(() => {
    const durationMonths = Number(contractDuration) || 12;
    const machinesTotal = extraMachines * ratePerMachine * durationMonths;

    const servicesMonthlySum = selectedServices.reduce((sum, serviceId) => {
      const item = AVAILABLE_OPTIONAL_SERVICES.find((s) => s.id === serviceId);
      return sum + (item ? item.monthlyPrice : 0);
    }, 0);
    const servicesTotal = servicesMonthlySum * durationMonths;

    const rawSubtotal = machinesTotal + servicesTotal;
    const discountAmount = Math.min(rawSubtotal, Number(customDiscount) || 0);
    const taxableSubtotal = Math.max(0, rawSubtotal - discountAmount);

    const taxAmount = Math.round(taxableSubtotal * 0.15 * 100) / 100; // 15% VAT
    const totalAmount = taxableSubtotal + taxAmount;

    return {
      durationMonths,
      machinesTotal,
      servicesMonthlySum,
      servicesTotal,
      rawSubtotal,
      discountAmount,
      taxableSubtotal,
      taxAmount,
      totalAmount,
    };
  }, [extraMachines, ratePerMachine, contractDuration, selectedServices, customDiscount]);

  // Mock POP upload simulator
  const handleSimulatePopUpload = () => {
    setIsPopUploading(true);
    setTimeout(() => {
      setPopFileUrl("https://storage.googleapis.com/hme-invoices/pop_sample_eft.pdf");
      setIsPopUploading(false);
      toast.success("Proof of Payment (POP) receipt attached!");
    }, 900);
  };

  // Submit Quotation
  const handleSubmit = async (recordImmediateEft = false) => {
    if (!companyName.trim()) {
      toast.error("Please provide a Company Name");
      return;
    }
    if (!contactEmail.trim()) {
      toast.error("Please provide a Contact Email");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: AddonQuotationPayload = {
        companyName,
        contactPerson,
        contactEmail,
        contactPhone,
        machineCount: extraMachines,
        ratePerMachine,
        contractDuration,
        quotationType: "MACHINE_ADDON",
        machineTypes: selectedEquipment,
        extraSites,
        siteNames: siteNamesInput ? siteNamesInput.split(",").map((s) => s.trim()) : [],
        baseAmount: calculation.machinesTotal,
        optionalServicesAmount: calculation.servicesTotal,
        discountAmount: calculation.discountAmount,
        taxAmount: calculation.taxAmount,
        totalAmount: calculation.totalAmount,
        optionalServices: selectedServices.map((id) => {
          const s = AVAILABLE_OPTIONAL_SERVICES.find((srv) => srv.id === id);
          return { id, name: s?.name, monthlyPrice: s?.monthlyPrice };
        }),
        paymentMethod,
        proofOfPaymentUrl: popFileUrl || (recordImmediateEft ? "https://storage.googleapis.com/hme-invoices/manual_admin_eft.pdf" : undefined),
        status: recordImmediateEft ? "EFT_SUBMITTED" : "ISSUED",
        notes: notes || `Add-on quotation generated by Super Admin for ${extraMachines} machines.`,
      };

      const result = await createAddonQuotation(payload);
      setGeneratedSuccessQuote(result);
      toast.success(
        recordImmediateEft
          ? `Quotation #${result.quotationNumber} created & marked for EFT Verification!`
          : `Quotation #${result.quotationNumber} generated successfully!`
      );
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to create add-on quotation");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-600 via-indigo-600 to-slate-900 p-6 text-white shadow-xl dark:border-slate-800">
        <div className="relative z-10 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur-md">
              <Sparkles size={14} className="text-yellow-300" />
              Super Admin Fleet & Add-on Quotation Builder
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Create Quotation & Machine Add-on
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-blue-100">
              Provision additional machinery licenses, custom mining sites, optional AI diagnostics, and process immediate EFT or PayFast bank transfers.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setCompanyName("");
                setContactEmail("");
                setContactPerson("");
                setContactPhone("");
                setSelectedClientPreset("");
                setPopFileUrl("");
                setGeneratedSuccessQuote(null);
                toast.success("Form reset to default");
              }}
              className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold backdrop-blur-md hover:bg-white/20"
            >
              Reset Form
            </button>
          </div>
        </div>

        {/* Ambient background decoration */}
        <div className="pointer-events-none absolute -bottom-10 -right-10 h-64 w-64 rounded-full bg-blue-400/20 blur-3xl" />
      </div>

      {/* Success Banner if created */}
      {generatedSuccessQuote && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 p-5 shadow-sm dark:border-emerald-800/40 dark:bg-emerald-950/30">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
                <FileCheck2 size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-emerald-900 dark:text-emerald-300">
                  Quotation Created: {generatedSuccessQuote.quotationNumber}
                </h3>
                <p className="text-xs text-emerald-700 dark:text-emerald-400">
                  Total Payable: <strong>R {Number(generatedSuccessQuote.totalAmount).toLocaleString()}</strong> | Client: <strong>{generatedSuccessQuote.companyName}</strong>
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-emerald-200/60 px-2 py-0.5 text-xs font-semibold text-emerald-900 dark:bg-emerald-800/50 dark:text-emerald-200">
                    Status: {generatedSuccessQuote.status}
                  </span>
                  <span className="rounded-md bg-emerald-200/60 px-2 py-0.5 text-xs font-semibold text-emerald-900 dark:bg-emerald-800/50 dark:text-emerald-200">
                    Payment Ref: EFT-{generatedSuccessQuote.quotationNumber}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setGeneratedSuccessQuote(null)}
              className="text-xs text-emerald-700 underline hover:text-emerald-900 dark:text-emerald-400"
            >
              Create Another Quote
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: 2 Columns */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Form & Configuration (8 cols) */}
        <div className="space-y-6 lg:col-span-8">
          
          {/* Section 1: Client Selection */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                  <Building2 size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Step 1: Client & Company Information
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Select an existing enterprise account or enter new client details.
                  </p>
                </div>
              </div>

              {/* Quick Preset Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Quick Fill:</span>
                <select
                  value={selectedClientPreset}
                  onChange={(e) => handleClientPresetChange(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  <option value="">-- Choose Existing Client --</option>
                  {PRESET_CLIENTS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.activeMachines} Machines)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Company / Mine Name *
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Anglo American Platinum"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-800/60 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Contact Person *
                </label>
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="e.g. David Ndlovu (Plant Manager)"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-800/60 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Contact Email (for Quotation & Invoice) *
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="e.g. d.ndlovu@angloamerican.co.za"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-800/60 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="e.g. +27 11 373 6111"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-800/60 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Machine & Site Add-ons */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                  <Truck size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Step 2: Machinery & Fleet Add-On Scope
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Specify the number of additional mining assets and equipment types to be connected.
                  </p>
                </div>
              </div>
            </div>

            {/* Counter & Rate Controls */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {/* Extra Machine Counter */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                <span className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Additional Machines Count
                </span>
                <div className="mt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setExtraMachines((m) => Math.max(1, m - 1))}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-100 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <Minus size={15} />
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={extraMachines}
                    onChange={(e) => setExtraMachines(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 text-center font-mono text-xl font-extrabold text-slate-900 focus:outline-none dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setExtraMachines((m) => m + 1)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-100 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <Plus size={15} />
                  </button>
                </div>
              </div>

              {/* Rate Per Machine */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                <span className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Monthly Rate / Machine (ZAR)
                </span>
                <div className="mt-2 flex items-center">
                  <span className="mr-2 text-sm font-bold text-slate-400">R</span>
                  <input
                    type="number"
                    value={ratePerMachine}
                    onChange={(e) => setRatePerMachine(Math.max(100, parseInt(e.target.value) || 0))}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-bold text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              {/* Contract Term Duration */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                <span className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Contract Duration
                </span>
                <select
                  value={contractDuration}
                  onChange={(e) => setContractDuration(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="6">6 Months (Short Term)</option>
                  <option value="12">12 Months (Standard)</option>
                  <option value="24">24 Months (2-Year Enterprise)</option>
                  <option value="36">36 Months (3-Year Master Service)</option>
                </select>
              </div>
            </div>

            {/* Equipment Types Checklist */}
            <div className="mt-4">
              <label className="mb-2 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                Applicable Equipment Categories:
              </label>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
                {EQUIPMENT_TYPES.map((eq) => {
                  const isSelected = selectedEquipment.includes(eq.id);
                  return (
                    <button
                      key={eq.id}
                      type="button"
                      onClick={() => toggleEquipment(eq.id)}
                      className={`flex items-center gap-2 rounded-xl border p-2.5 text-left text-xs font-medium transition-all ${
                        isSelected
                          ? "border-indigo-500 bg-indigo-50/80 text-indigo-900 shadow-sm dark:border-indigo-500/50 dark:bg-indigo-950/30 dark:text-indigo-200"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400"
                      }`}
                    >
                      <span className="text-base">{eq.icon}</span>
                      <span className="truncate">{eq.name}</span>
                      {isSelected && <Check size={14} className="ml-auto shrink-0 text-indigo-600 dark:text-indigo-400" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sites Details */}
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Additional Mine Sites Count
                </label>
                <input
                  type="number"
                  min="0"
                  value={extraSites}
                  onChange={(e) => setExtraSites(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800/60 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Site Name(s) / Locations
                </label>
                <input
                  type="text"
                  value={siteNamesInput}
                  onChange={(e) => setSiteNamesInput(e.target.value)}
                  placeholder="e.g. Mogalakwena North Pit, Rustenburg Central"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800/60 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Value-Added & Optional Services */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                  <Zap size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Step 3: Optional Value-Added Diagnostics & AI Services
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Include telemetry streams, ERP integrations, and machine health modules in this quotation.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {AVAILABLE_OPTIONAL_SERVICES.map((srv) => {
                const isSelected = selectedServices.includes(srv.id);
                return (
                  <div
                    key={srv.id}
                    onClick={() => toggleService(srv.id)}
                    className={`flex cursor-pointer items-start justify-between rounded-xl border p-4 transition-all ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-500/20 dark:border-emerald-500/50 dark:bg-emerald-950/20"
                        : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800/50 dark:hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                          isSelected
                            ? "border-emerald-600 bg-emerald-600 text-white"
                            : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-700"
                        }`}
                      >
                        {isSelected && <Check size={13} strokeWidth={3} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 dark:text-white">{srv.name}</span>
                          {srv.badge && (
                            <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                              {srv.badge}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{srv.description}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-bold text-slate-900 dark:text-white">
                        +R {srv.monthlyPrice.toLocaleString()}
                      </span>
                      <span className="block text-[11px] text-slate-400">/ month</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 4: Payment Terms & EFT Bank Details */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                  <Landmark size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Step 4: Payment Mode & EFT Bank Reference
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Configure payment terms, bank transfer details, and proof of payment upload.
                  </p>
                </div>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => setPaymentMethod("EFT")}
                className={`flex flex-col items-center justify-center rounded-xl border p-4 text-center transition-all ${
                  paymentMethod === "EFT"
                    ? "border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-500/20 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-200"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                <Landmark size={24} className="mb-2 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-bold">EFT / Bank Transfer</span>
                <span className="mt-1 text-[11px] text-slate-400">Direct Bank Deposit (POP)</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod("PAYFAST")}
                className={`flex flex-col items-center justify-center rounded-xl border p-4 text-center transition-all ${
                  paymentMethod === "PAYFAST"
                    ? "border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-500/20 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-200"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                <CreditCard size={24} className="mb-2 text-purple-600 dark:text-purple-400" />
                <span className="text-xs font-bold">Online Gateway (PayFast)</span>
                <span className="mt-1 text-[11px] text-slate-400">Instant Card / Masterpass</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod("INVOICE")}
                className={`flex flex-col items-center justify-center rounded-xl border p-4 text-center transition-all ${
                  paymentMethod === "INVOICE"
                    ? "border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-500/20 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-200"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                <FileSpreadsheet size={24} className="mb-2 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-bold">Net 30 Corporate PO</span>
                <span className="mt-1 text-[11px] text-slate-400">Enterprise Invoicing Terms</span>
              </button>
            </div>

            {/* EFT Bank Details Card */}
            {paymentMethod === "EFT" && (
              <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/40 p-4 dark:border-blue-900/30 dark:bg-blue-950/20">
                <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300">
                  <ShieldCheck size={16} /> Official Company Banking Details
                </h3>
                <div className="grid grid-cols-2 gap-3 text-xs text-slate-700 sm:grid-cols-4 dark:text-slate-300">
                  <div>
                    <span className="block font-medium text-slate-400">Bank Name</span>
                    <span className="font-semibold text-slate-900 dark:text-white">First National Bank (FNB)</span>
                  </div>
                  <div>
                    <span className="block font-medium text-slate-400">Account Number</span>
                    <span className="font-mono font-semibold text-slate-900 dark:text-white">62894109823</span>
                  </div>
                  <div>
                    <span className="block font-medium text-slate-400">Branch Code</span>
                    <span className="font-mono font-semibold text-slate-900 dark:text-white">250655</span>
                  </div>
                  <div>
                    <span className="block font-medium text-slate-400">Account Type</span>
                    <span className="font-semibold text-slate-900 dark:text-white">Current / Cheque</span>
                  </div>
                </div>

                {/* Proof of Payment (POP) Attachment */}
                <div className="mt-4 border-t border-blue-100 pt-3 dark:border-blue-900/30">
                  <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        Attach Proof of Payment (POP) Receipt
                      </span>
                      <p className="text-[11px] text-slate-500">
                        If the client has already transferred funds, attach the banking slip for immediate verification.
                      </p>
                    </div>

                    {popFileUrl ? (
                      <div className="flex items-center gap-2 rounded-lg bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                        <CheckCircle2 size={15} />
                        Receipt Attached
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSimulatePopUpload}
                        disabled={isPopUploading}
                        className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-600 shadow-sm hover:bg-blue-50 dark:border-blue-800 dark:bg-slate-800 dark:text-blue-400"
                      >
                        {isPopUploading ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <UploadCloud size={13} />
                        )}
                        Upload / Attach POP Receipt
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Custom Notes */}
            <div className="mt-4">
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Quotation Notes / Terms Specifics
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Telematics devices to be dispatched to site within 5 working days upon EFT receipt."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800/60 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Dynamic Price Summary & Action Deck (4 cols) */}
        <div className="space-y-6 lg:col-span-4">
          <div className="sticky top-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Receipt size={18} className="text-blue-600 dark:text-blue-400" />
                <h3 className="font-bold text-slate-900 dark:text-white">Quotation Calculation</h3>
              </div>
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                {contractDuration} Months
              </span>
            </div>

            {/* Line Items */}
            <div className="space-y-3 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>
                  Fleet Add-on ({extraMachines} Machines @ R{ratePerMachine.toLocaleString()}/mo × {calculation.durationMonths}m):
                </span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  R {calculation.machinesTotal.toLocaleString()}
                </span>
              </div>

              {calculation.servicesTotal > 0 && (
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>
                    Selected Services ({selectedServices.length} items × {calculation.durationMonths}m):
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    R {calculation.servicesTotal.toLocaleString()}
                  </span>
                </div>
              )}

              {/* Discount Input */}
              <div className="flex items-center justify-between border-t border-dashed border-slate-200 pt-2 text-slate-600 dark:border-slate-800 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <Percent size={13} /> Custom Discount (ZAR):
                </span>
                <div className="flex w-24 items-center">
                  <span className="mr-1 text-slate-400">R</span>
                  <input
                    type="number"
                    min="0"
                    value={customDiscount}
                    onChange={(e) => setCustomDiscount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-right font-semibold text-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-between border-t border-slate-100 pt-2 text-slate-600 dark:border-slate-800 dark:text-slate-400">
                <span>Taxable Subtotal:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  R {calculation.taxableSubtotal.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>VAT (15% South African Standard):</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  R {calculation.taxAmount.toLocaleString()}
                </span>
              </div>

              {/* Grand Total */}
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-4 dark:border-emerald-900/30 dark:bg-emerald-950/30">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                  Total Contract Value (ZAR)
                </span>
                <span className="mt-1 text-2xl font-black text-emerald-700 dark:text-emerald-400 sm:text-3xl">
                  R {calculation.totalAmount.toLocaleString()}
                </span>
                <span className="mt-1 block text-[10px] text-emerald-600 dark:text-emerald-400">
                  Includes all add-on machines, sites & AI diagnostics for {calculation.durationMonths} months.
                </span>
              </div>
            </div>

            {/* Actions Deck */}
            <div className="mt-6 space-y-3">
              {/* Primary Action */}
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSubmit(false)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-xs font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 active:scale-[0.99] disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Generating Quotation...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Generate & Send Quotation
                  </>
                )}
              </button>

              {/* Secondary Action: Instant Record EFT */}
              {paymentMethod === "EFT" && (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSubmit(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-600/30 bg-emerald-50 py-2.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 active:scale-[0.99] disabled:opacity-50 dark:bg-emerald-950/40 dark:text-emerald-300"
                >
                  <FileCheck2 size={16} />
                  Record Immediate EFT & Activate
                </button>
              )}
            </div>

            {/* Quick Summary Badges */}
            <div className="mt-4 border-t border-slate-100 pt-4 text-[11px] text-slate-500 dark:border-slate-800">
              <div className="flex items-center gap-1.5 py-0.5">
                <CheckCircle2 size={13} className="text-emerald-500" />
                <span>Instant machine quota allocation</span>
              </div>
              <div className="flex items-center gap-1.5 py-0.5">
                <CheckCircle2 size={13} className="text-emerald-500" />
                <span>Unique reference tracking code embedded</span>
              </div>
              <div className="flex items-center gap-1.5 py-0.5">
                <CheckCircle2 size={13} className="text-emerald-500" />
                <span>EFT Verification workflow integrated</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
