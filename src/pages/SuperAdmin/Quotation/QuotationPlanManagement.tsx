import { useState, useEffect, type FC } from "react";
import {
  Layers,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  Sparkles,
  Zap,
  Calendar,
  Truck,
  DollarSign,
  Check,
  AlertCircle,
  RefreshCw,
  Clock,
  ShieldAlert,
  HelpCircle,
  LayoutList,
  LayoutGrid,
} from "lucide-react";
import { toast } from "react-hot-toast";

interface DurationDetail {
  months: number;
  label: string;
  billing: string;
}

export interface QuotationPlan {
  id: string;
  name: string;
  tierCode?: string | null;
  minMachines: number;
  maxMachines: number;
  monthlyPrice: string | number;
  currency: string;
  durationOptions?: number[];
  durationMonths?: number[];
  durationLabels?: string[];
  durations?: DurationDetail[];
  isTrial: boolean;
  trialDays?: number;
  isCustom: boolean;
  features: string[];
  sortOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const AVAILABLE_DURATION_PRESETS = [
  { months: 1, label: "1 Month", billing: "Monthly" },
  { months: 3, label: "3 Months", billing: "Quarterly" },
  { months: 6, label: "6 Months", billing: "Semi-Annual" },
  { months: 12, label: "12 Months", billing: "Annual (1 Year)" },
  { months: 24, label: "24 Months", billing: "2 Years" },
  { months: 36, label: "36 Months", billing: "3 Years" },
  { months: 48, label: "48 Months", billing: "4 Years" },
];

const TIER_CODE_PRESETS = [
  { code: "TRIAL", label: "🎁 TRIAL (Free Evaluation Trial)" },
  { code: "TIER_1", label: "⚡ TIER 1 (Up to 10 Machines)" },
  { code: "TIER_2", label: "🚀 TIER 2 (11 – 25 Machines)" },
  { code: "TIER_3", label: "🏢 TIER 3 (26 – 75 Machines)" },
  { code: "TIER_4", label: "🏭 TIER 4 (76 – 150 Machines)" },
  { code: "CUSTOM", label: "🌐 CUSTOM (151+ Machines / Multi-Site)" },
];

const QuotationPlanManagement: FC = () => {
  const [plans, setPlans] = useState<QuotationPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [viewMode, setViewMode] = useState<"TABLE" | "GRID">("TABLE");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"CREATE" | "EDIT">("CREATE");
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    tierCode: "TIER_1",
    minMachines: 1,
    maxMachines: 10,
    monthlyPrice: 25000,
    currency: "ZAR",
    durationMonths: [1, 3, 6, 12, 24] as number[],
    isTrial: false,
    trialDays: 14,
    isCustom: false,
    features: [
      "Real-time Fleet Health Heatmap",
      "CAN-bus Sensor Telemetry Alerts",
      "Standard Operator & Artisan Dashboard",
    ] as string[],
    newFeatureText: "",
    sortOrder: 1,
    isActive: true,
  });

  // Delete Confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const getHeaders = () => {
    let token =
      localStorage.getItem("accessToken") ||
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      sessionStorage.getItem("token") ||
      "";

    if (token) {
      token = token.trim();
      if (
        (token.startsWith('"') && token.endsWith('"')) ||
        (token.startsWith("'") && token.endsWith("'"))
      ) {
        try {
          const parsed = JSON.parse(token);
          if (typeof parsed === "string") token = parsed;
        } catch {
          token = token.slice(1, -1);
        }
      }
    }

    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
  };

  // 1. Fetch Plans from API
  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await fetch("http://localhost:4000/api/v1/quotation-plans/admin", {
        headers: getHeaders(),
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setPlans(json.data);
      } else {
        // Fallback to public endpoint if admin query needs token
        const pubRes = await fetch("http://localhost:4000/api/v1/quotation-plans");
        const pubJson = await pubRes.json();
        if (pubJson.success && Array.isArray(pubJson.data)) {
          setPlans(pubJson.data);
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load quotation plans");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  // Filtered list
  const filteredPlans = plans.filter((plan) => {
    const matchesSearch =
      plan.name.toLowerCase().includes(search.toLowerCase()) ||
      (plan.tierCode && plan.tierCode.toLowerCase().includes(search.toLowerCase()));

    if (statusFilter === "ACTIVE") return matchesSearch && plan.isActive;
    if (statusFilter === "INACTIVE") return matchesSearch && !plan.isActive;
    return matchesSearch;
  });

  // Handle open Create Modal
  const handleOpenCreate = () => {
    setModalMode("CREATE");
    setSelectedPlanId(null);
    setFormData({
      name: "",
      tierCode: "TIER_1",
      minMachines: 1,
      maxMachines: 10,
      monthlyPrice: 25000,
      currency: "ZAR",
      durationMonths: [1, 3, 6, 12, 24],
      isTrial: false,
      trialDays: 14,
      isCustom: false,
      features: [
        "Full Telemetry & Sensor Integration",
        "CAN-bus Anomaly Detection",
        "Standard Operator & Artisan Access",
      ],
      newFeatureText: "",
      sortOrder: (plans.length || 0) + 1,
      isActive: true,
    });
    setIsModalOpen(true);
  };

  // Handle open Edit Modal
  const handleOpenEdit = (plan: QuotationPlan) => {
    setModalMode("EDIT");
    setSelectedPlanId(plan.id);
    const months =
      plan.durationMonths ||
      plan.durationOptions ||
      (Array.isArray(plan.durations) ? plan.durations.map((d) => d.months) : [1, 3, 6, 12, 24]);

    setFormData({
      name: plan.name,
      tierCode: plan.tierCode || "TIER_1",
      minMachines: plan.minMachines,
      maxMachines: plan.maxMachines,
      monthlyPrice: Number(plan.monthlyPrice) || 0,
      currency: plan.currency || "ZAR",
      durationMonths: months,
      isTrial: Boolean(plan.isTrial),
      trialDays: plan.trialDays || 14,
      isCustom: Boolean(plan.isCustom),
      features: Array.isArray(plan.features) ? [...plan.features] : [],
      newFeatureText: "",
      sortOrder: plan.sortOrder || 1,
      isActive: plan.isActive,
    });
    setIsModalOpen(true);
  };

  // Toggle Duration Month selection
  const toggleDurationMonth = (month: number) => {
    if (formData.durationMonths.includes(month)) {
      if (formData.durationMonths.length === 1) {
        toast.error("At least one duration month must be selected");
        return;
      }
      setFormData({
        ...formData,
        durationMonths: formData.durationMonths.filter((m) => m !== month),
      });
    } else {
      setFormData({
        ...formData,
        durationMonths: [...formData.durationMonths, month].sort((a, b) => a - b),
      });
    }
  };

  // Add Feature
  const handleAddFeature = () => {
    if (!formData.newFeatureText.trim()) return;
    setFormData({
      ...formData,
      features: [...formData.features, formData.newFeatureText.trim()],
      newFeatureText: "",
    });
  };

  // Remove Feature
  const handleRemoveFeature = (idx: number) => {
    setFormData({
      ...formData,
      features: formData.features.filter((_, i) => i !== idx),
    });
  };

  // Submit Create / Edit
  const handleSubmitPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Please enter a plan name");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: formData.name.trim(),
        tierCode: formData.tierCode,
        minMachines: Number(formData.minMachines),
        maxMachines: Number(formData.maxMachines),
        monthlyPrice: Number(formData.monthlyPrice),
        currency: formData.currency,
        durationOptions: formData.durationMonths,
        isTrial: formData.isTrial,
        trialDays: formData.isTrial ? Number(formData.trialDays) : null,
        isCustom: formData.isCustom,
        features: formData.features,
        sortOrder: Number(formData.sortOrder),
        isActive: formData.isActive,
      };

      const url =
        modalMode === "CREATE"
          ? "http://localhost:4000/api/v1/quotation-plans"
          : `http://localhost:4000/api/v1/quotation-plans/${selectedPlanId}`;

      const method = modalMode === "CREATE" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to save quotation plan");
      }

      toast.success(
        modalMode === "CREATE"
          ? "Quotation Plan created successfully!"
          : "Quotation Plan updated successfully!"
      );
      setIsModalOpen(false);
      fetchPlans();
    } catch (err: any) {
      toast.error(err.message || "Error saving plan");
    } finally {
      setSubmitting(false);
    }
  };

  // 1-Click Toggle Active Status
  const handleToggleStatus = async (plan: QuotationPlan) => {
    try {
      const res = await fetch(
        `http://localhost:4000/api/v1/quotation-plans/${plan.id}/toggle`,
        {
          method: "PATCH",
          headers: getHeaders(),
        }
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to toggle status");
      }

      toast.success(`${plan.name} is now ${!plan.isActive ? "Active" : "Inactive"}`);
      setPlans((prev) =>
        prev.map((p) => (p.id === plan.id ? { ...p, isActive: !p.isActive } : p))
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle status");
    }
  };

  // Delete Plan
  const handleDeletePlan = async () => {
    if (!deleteConfirmId) return;
    try {
      setIsDeleting(true);
      const res = await fetch(
        `http://localhost:4000/api/v1/quotation-plans/${deleteConfirmId}`,
        {
          method: "DELETE",
          headers: getHeaders(),
        }
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to delete plan");
      }

      toast.success("Plan deleted successfully");
      setPlans((prev) => prev.filter((p) => p.id !== deleteConfirmId));
      setDeleteConfirmId(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete plan");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Banner with Stats */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 md:p-8 text-white shadow-xl border border-indigo-900/30">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold tracking-wide uppercase">
              <Sparkles size={14} className="animate-pulse" />
              Master Pricing Catalog
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
              Quotation Plans & Fleet Tiers
            </h1>
            <p className="text-sm md:text-base text-slate-300 max-w-2xl">
              Configure standard monthly machine licensing tiers, free trials, and custom enterprise quote parameters served directly to the quotation request generator.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchPlans}
              className="p-3 rounded-xl bg-white/10 hover:bg-white/15 text-white transition border border-white/10 backdrop-blur-md"
              title="Refresh Plans"
            >
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold shadow-lg shadow-amber-500/25 transition-all transform active:scale-95 cursor-pointer"
            >
              <Plus size={20} strokeWidth={2.5} />
              <span>Create New Plan</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/10 text-slate-200">
          <div className="bg-white/5 rounded-xl p-3 backdrop-blur-sm border border-white/5">
            <span className="text-xs text-slate-400 uppercase font-semibold">Total Plans</span>
            <div className="text-2xl font-bold text-white mt-1">{plans.length}</div>
          </div>
          <div className="bg-white/5 rounded-xl p-3 backdrop-blur-sm border border-white/5">
            <span className="text-xs text-slate-400 uppercase font-semibold">Active in Catalog</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              {plans.filter((p) => p.isActive).length}
            </div>
          </div>
          <div className="bg-white/5 rounded-xl p-3 backdrop-blur-sm border border-white/5">
            <span className="text-xs text-slate-400 uppercase font-semibold">Base Currency</span>
            <div className="text-2xl font-bold text-amber-300 mt-1">ZAR (R)</div>
          </div>
          <div className="bg-white/5 rounded-xl p-3 backdrop-blur-sm border border-white/5">
            <span className="text-xs text-slate-400 uppercase font-semibold">Starter Rate</span>
            <div className="text-2xl font-bold text-indigo-300 mt-1">R25,000 /mo</div>
          </div>
        </div>
      </div>

      {/* 2. Search & Filter Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Search plans by name or tier code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800 dark:text-slate-100"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Status Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60">
            {(["ALL", "ACTIVE", "INACTIVE"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  statusFilter === status
                    ? "bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950 shadow"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800"
                }`}
              >
                {status === "ALL" && "All Plans"}
                {status === "ACTIVE" && "🟢 Active Only"}
                {status === "INACTIVE" && "⚪ Inactive"}
              </button>
            ))}
          </div>

          {/* View Mode Toggle: Table vs Grid */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60">
            <button
              onClick={() => setViewMode("TABLE")}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                viewMode === "TABLE"
                  ? "bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
              }`}
              title="Table View"
            >
              <LayoutList size={16} />
              <span className="hidden sm:inline">Table</span>
            </button>
            <button
              onClick={() => setViewMode("GRID")}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                viewMode === "GRID"
                  ? "bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
              }`}
              title="Grid Cards View"
            >
              <LayoutGrid size={16} />
              <span className="hidden sm:inline">Grid</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Plans Table & Grid View */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((n) => (
            <div
              key={n}
              className="h-16 rounded-xl bg-slate-100 dark:bg-slate-800/50 animate-pulse border border-slate-200 dark:border-slate-700"
            />
          ))}
        </div>
      ) : filteredPlans.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
          <Layers size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
            No Quotation Plans Found
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            {search
              ? "No quotation plans match your search filter."
              : "Click 'Create New Plan' to build your first pricing package."}
          </p>
        </div>
      ) : viewMode === "TABLE" ? (
        /* ENTERPRISE DATA TABLE VIEW */
        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-4 px-4 w-12 text-center">#</th>
                  <th className="py-4 px-5">Plan Name & Tier</th>
                  <th className="py-4 px-5">Fleet Capacity</th>
                  <th className="py-4 px-5">Monthly Price (ZAR)</th>
                  <th className="py-4 px-5">Supported Durations</th>
                  <th className="py-4 px-5">Features Included</th>
                  <th className="py-4 px-4 text-center">Status</th>
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredPlans.map((plan, index) => {
                  const priceNum = Number(plan.monthlyPrice);
                  const durations = plan.durations || [];

                  return (
                    <tr
                      key={plan.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* # Index */}
                      <td className="py-4 px-4 text-center text-xs font-semibold text-slate-400">
                        {index + 1}
                      </td>

                      {/* Plan Name & Tier Badge */}
                      <td className="py-4 px-5">
                        <div className="space-y-1">
                          <div className="font-bold text-slate-900 dark:text-white group-hover:text-amber-500 transition-colors">
                            {plan.name}
                          </div>
                          <div>
                            {plan.isTrial ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                🎁 FREE TRIAL
                              </span>
                            ) : plan.isCustom ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                🌐 CUSTOM ENTERPRISE
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                ⚡ {plan.tierCode || "STANDARD"}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Fleet Capacity Range */}
                      <td className="py-4 px-5">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300">
                          <Truck size={13} className="text-amber-500" />
                          {plan.isCustom
                            ? "151+ Machines"
                            : `${plan.minMachines} – ${plan.maxMachines} Machines`}
                        </div>
                      </td>

                      {/* Monthly Price */}
                      <td className="py-4 px-5">
                        {plan.isTrial ? (
                          <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                            R0 Free
                          </span>
                        ) : plan.isCustom ? (
                          <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                            Custom Quote
                          </span>
                        ) : (
                          <div className="font-extrabold text-slate-900 dark:text-white">
                            R{priceNum.toLocaleString()}
                            <span className="text-[11px] font-normal text-slate-400 ml-1">
                              /mo
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Supported Durations */}
                      <td className="py-4 px-5">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {durations.length > 0 ? (
                            durations.map((d, i) => (
                              <span
                                key={i}
                                className="px-1.5 py-0.5 text-[11px] rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium"
                              >
                                {d.label}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400">1, 3, 6, 12, 24 Mos</span>
                          )}
                        </div>
                      </td>

                      {/* Included Features */}
                      <td className="py-4 px-5">
                        <div className="text-xs text-slate-600 dark:text-slate-300 max-w-xs space-y-0.5">
                          {Array.isArray(plan.features) && plan.features.length > 0 ? (
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold">
                                <Check size={11} className="text-emerald-500" />
                                {plan.features.length} Features
                              </span>
                              <span className="text-[11px] text-slate-400 truncate max-w-[140px]">
                                {plan.features[0]}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">
                              Standard Core Telemetry
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status Toggle Switch */}
                      <td className="py-4 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(plan)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition ${
                            plan.isActive
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                              : "bg-slate-200 text-slate-600 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-400"
                          }`}
                        >
                          {plan.isActive ? (
                            <>
                              <CheckCircle2 size={13} />
                              Active
                            </>
                          ) : (
                            <>
                              <XCircle size={13} />
                              Hidden
                            </>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(plan)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition"
                            title="Edit Plan"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(plan.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 transition"
                            title="Delete Plan"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GRID CARDS VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlans.map((plan) => {
            const priceNum = Number(plan.monthlyPrice);
            const durations = plan.durations || [];

            return (
              <div
                key={plan.id}
                className={`group relative flex flex-col justify-between rounded-2xl transition-all duration-200 border bg-white dark:bg-slate-800 shadow-sm hover:shadow-lg ${
                  plan.isActive
                    ? "border-slate-200 dark:border-slate-700 hover:border-amber-500/50"
                    : "border-dashed border-slate-300 dark:border-slate-700 opacity-75"
                }`}
              >
                {/* Top Section */}
                <div className="p-6 space-y-4">
                  {/* Status & Tier Code Badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {plan.isTrial ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          🎁 FREE TRIAL
                        </span>
                      ) : plan.isCustom ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                          🌐 CUSTOM ENTERPRISE
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          ⚡ {plan.tierCode || "STANDARD"}
                        </span>
                      )}

                      {plan.isActive ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          Inactive
                        </span>
                      )}
                    </div>

                    {/* Machine Capacity Pill */}
                    <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200">
                      <Truck size={13} className="text-amber-500" />
                      {plan.isCustom
                        ? "151+ Machines"
                        : `${plan.minMachines} – ${plan.maxMachines} Machines`}
                    </div>
                  </div>

                  {/* Plan Name & Pricing */}
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-amber-500 transition-colors">
                      {plan.name}
                    </h3>
                    <div className="mt-2 flex items-baseline gap-1">
                      {plan.isTrial ? (
                        <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                          R0
                        </span>
                      ) : plan.isCustom ? (
                        <span className="text-2xl font-extrabold text-purple-600 dark:text-purple-400">
                          Custom Quote
                        </span>
                      ) : (
                        <>
                          <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                            R{priceNum.toLocaleString()}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">/ month</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Durations Supported */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Calendar size={12} />
                      Contract Durations:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {durations.length > 0 ? (
                        durations.map((d, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 text-xs rounded bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 font-medium"
                          >
                            {d.label}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400">1, 3, 6, 12, 24 Months</span>
                      )}
                    </div>
                  </div>

                  {/* Feature Highlights */}
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Included Scope:
                    </span>
                    <ul className="space-y-1.5">
                      {Array.isArray(plan.features) && plan.features.length > 0 ? (
                        plan.features.slice(0, 4).map((feat, i) => (
                          <li
                            key={i}
                            className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2"
                          >
                            <Check
                              size={14}
                              className="text-emerald-500 flex-shrink-0 mt-0.5"
                            />
                            <span className="line-clamp-1">{feat}</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-xs text-slate-400 italic">
                          Standard HME Intelligence features included
                        </li>
                      )}
                    </ul>
                  </div>
                </div>

                {/* Bottom Actions Bar */}
                <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-b-2xl border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                  {/* Active Switch */}
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(plan)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition ${
                      plan.isActive
                        ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                        : "bg-slate-200 text-slate-600 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-400"
                    }`}
                  >
                    {plan.isActive ? (
                      <>
                        <CheckCircle2 size={13} />
                        Active
                      </>
                    ) : (
                      <>
                        <XCircle size={13} />
                        Hidden
                      </>
                    )}
                  </button>

                  {/* Edit & Delete Action Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(plan)}
                      className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition"
                      title="Edit Plan"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(plan.id)}
                      className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 transition"
                      title="Delete Plan"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {modalMode === "CREATE"
                    ? "Create Master Quotation Plan"
                    : "Edit Quotation Plan"}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Set tier machine ranges, monthly price, and supported durations
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSubmitPlan} className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Plan Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Plan Display Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Growth Fleet (11 – 25 Machines)"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Tier Code & Currency */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Tier Category / Code
                  </label>
                  <select
                    value={formData.tierCode}
                    onChange={(e) => setFormData({ ...formData, tierCode: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    {TIER_CODE_PRESETS.map((t) => (
                      <option key={t.code} value={t.code}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Currency
                  </label>
                  <input
                    type="text"
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Machine Capacity Range */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Min Machines
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formData.minMachines}
                    onChange={(e) =>
                      setFormData({ ...formData, minMachines: parseInt(e.target.value) || 1 })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Max Machines
                  </label>
                  <input
                    type="number"
                    min={formData.minMachines}
                    value={formData.maxMachines}
                    onChange={(e) =>
                      setFormData({ ...formData, maxMachines: parseInt(e.target.value) || 10 })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Monthly Price */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Monthly Base Price ({formData.currency})
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                    R
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={formData.monthlyPrice}
                    onChange={(e) =>
                      setFormData({ ...formData, monthlyPrice: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                  />
                </div>
                <span className="text-[11px] text-slate-500">
                  Set 0 for Free Trial or Custom Quoted Tiers
                </span>
              </div>

              {/* Duration Options Multi-Select */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Available Contract Duration Options *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {AVAILABLE_DURATION_PRESETS.map((d) => {
                    const isSelected = formData.durationMonths.includes(d.months);
                    return (
                      <button
                        type="button"
                        key={d.months}
                        onClick={() => toggleDurationMonth(d.months)}
                        className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                          isSelected
                            ? "bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-300 font-bold"
                            : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs">{d.label}</span>
                          {isSelected && <Check size={14} className="text-amber-500" />}
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1">{d.billing}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Special Toggles (Free Trial / Custom Enterprise) */}
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200 dark:border-slate-800">
                <label className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isTrial}
                    onChange={(e) => setFormData({ ...formData, isTrial: e.target.checked })}
                    className="w-4 h-4 text-amber-600 rounded border-slate-300"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      Free Trial Tier
                    </span>
                    <span className="text-[10px] text-slate-500">14 Days Pilot</span>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isCustom}
                    onChange={(e) => setFormData({ ...formData, isCustom: e.target.checked })}
                    className="w-4 h-4 text-amber-600 rounded border-slate-300"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      Custom Enterprise
                    </span>
                    <span className="text-[10px] text-slate-500">Priced on request</span>
                  </div>
                </label>
              </div>

              {/* Features List Editor */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Included Features Checklist
                </label>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add bullet feature (e.g. 24/7 Field Engineer Support)"
                    value={formData.newFeatureText}
                    onChange={(e) => setFormData({ ...formData, newFeatureText: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddFeature();
                      }
                    }}
                    className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddFeature}
                    className="px-4 py-2 bg-slate-900 dark:bg-slate-700 text-white text-xs font-bold rounded-xl hover:bg-slate-800"
                  >
                    Add
                  </button>
                </div>

                <div className="space-y-1.5 mt-2">
                  {formData.features.map((feat, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300"
                    >
                      <span>{feat}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFeature(idx)}
                        className="text-slate-400 hover:text-rose-500"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status Toggle */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    Active in Quotation Flow
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Immediately available on the quotation selection dropdown
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-5 h-5 text-amber-500 rounded"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 disabled:opacity-50"
                >
                  {submitting ? "Saving..." : modalMode === "CREATE" ? "Create Plan" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/50 flex items-center justify-center text-rose-600">
              <ShieldAlert size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Delete Quotation Plan?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Are you sure you want to delete this master pricing tier? It will no longer appear in the quotation creation form.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePlan}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-lg shadow-rose-600/20"
              >
                {isDeleting ? "Deleting..." : "Delete Plan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuotationPlanManagement;
