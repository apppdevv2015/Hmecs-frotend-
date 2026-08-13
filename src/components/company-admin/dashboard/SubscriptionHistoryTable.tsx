import {
  CheckCircle2,
  Clock,
  CreditCard,
  History,
  Sparkles,
  Zap,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Gem,
  Calendar,
  Layers,
  Check,
} from "lucide-react";

interface HistoryItem {
  id: string | number;

  plan_name?: string;
  status?: string;
  price?: string | number;

  payment_status?: string;

  subscription_start_date?: string;
  subscription_end_date?: string;

  subscriptionStartDate?: string;
  subscriptionEndDate?: string;

  paymentStatus?: string;

  plan?: {
    id?: string;
    planName?: string;
    price?: string | number;
    validityDays?: number;
    machineLimit?: number;
    staffLimit?: number;
  };
}

interface SubscriptionHistoryTableProps {
  history: HistoryItem[];
}

export default function SubscriptionHistoryTable({
  history,
}: SubscriptionHistoryTableProps) {
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A";

    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const calculateDuration = (start?: string, end?: string) => {
    if (!start || !end) return "N/A";

    const s = new Date(start);
    const e = new Date(end);
    const diff = e.getTime() - s.getTime();
    const days = Math.round(diff / (1000 * 60 * 60 * 24));

    return `${days} Days`;
  };

  const getStatusClasses = (status?: string) => {
    const normalizedStatus = status?.toLowerCase();

    if (normalizedStatus === "active" || normalizedStatus === "paid") {
      return "border-green-200 bg-green-50 text-green-700 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-400";
    }

    if (normalizedStatus === "expired") {
      return "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400";
    }

    return "border-orange-100 bg-orange-50 text-orange-600 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-400";
  };

  // Sort history chronologically (earliest to latest) for the Timeline Tree Journey
  const chronologicalHistory = [...(history || [])].sort((a, b) => {
    const dateA = new Date(
      a.subscription_start_date ||
        a.subscriptionStartDate ||
        (a as any).created_at ||
        0,
    ).getTime();
    const dateB = new Date(
      b.subscription_start_date ||
        b.subscriptionStartDate ||
        (b as any).created_at ||
        0,
    ).getTime();
    return dateA - dateB;
  });

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* 🌟 LINKEDIN-STYLE SUBSCRIPTION JOURNEY / TREE PROGRESSION CHAIN */}
      {/* ------------------------------------------------------------- */}
      {chronologicalHistory.length > 0 && (
        <div className="relative overflow-hidden rounded-[2rem] border border-blue-100 bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/40 p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:from-[#0F172A] dark:via-[#131E36] dark:to-[#0F172A]">
          {/* Subtle glow background */}
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />

          {/* Timeline Header */}
          <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
                <TrendingUp size={20} />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">
                  Plan Evolution Chain
                </p>
                <h3 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  Subscription Journey & Lifecycle Tree
                </h3>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/80 px-3.5 py-1.5 text-xs font-bold text-blue-700 shadow-sm backdrop-blur-sm dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              {chronologicalHistory.length} Journey Milestones Recorded
            </div>
          </div>

          {/* Timeline Tree Nodes (LinkedIn Style) */}
          <div className="relative">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {chronologicalHistory.map((item, index) => {
                const planName =
                  item.plan_name ||
                  item.plan?.planName ||
                  (item as any).planName ||
                  (item as any).name ||
                  "Plan";
                const upperPlan = planName.toUpperCase();

                const price =
                  item.price ??
                  item.plan?.price ??
                  (item as any).amount ??
                  "0";

                const startDate =
                  item.subscription_start_date ||
                  item.subscriptionStartDate ||
                  (item as any).start_date;

                const endDate =
                  item.subscription_end_date ||
                  item.subscriptionEndDate ||
                  (item as any).end_date;

                const status = (
                  item.status ||
                  item.payment_status ||
                  item.paymentStatus ||
                  "active"
                ).toLowerCase();

                const isActive = status === "active";
                const isDemo = upperPlan.includes("DEMO");
                const isPro = upperPlan.includes("PRO") || upperPlan.includes("PREMIUM");
                const isEnterprise = upperPlan.includes("ENTERPRISE");

                const machineLimit =
                  item.plan?.machineLimit ||
                  (isDemo ? 3 : isPro ? 50 : isEnterprise ? 1000 : 10);
                const staffLimit =
                  item.plan?.staffLimit ||
                  (isDemo ? 5 : isPro ? 60 : isEnterprise ? 1000 : 20);

                return (
                  <div key={item.id || index} className="relative flex flex-col">
                    {/* Horizontal Connector Arrow for large screens */}
                    {index < chronologicalHistory.length - 1 && (
                      <div className="hidden lg:flex absolute -right-3.5 top-1/2 -translate-y-1/2 z-20 h-7 w-7 items-center justify-center rounded-full border border-blue-200 bg-white text-blue-600 shadow-md dark:border-slate-700 dark:bg-slate-800 dark:text-blue-400">
                        <ArrowRight size={14} strokeWidth={3} />
                      </div>
                    )}

                    {/* Step Card */}
                    <div
                      className={`group relative flex-1 rounded-3xl border p-5 sm:p-6 transition-all duration-300 ${
                        isActive
                          ? "border-blue-400/80 bg-gradient-to-b from-blue-600/10 via-white to-white shadow-xl shadow-blue-500/10 ring-2 ring-blue-500/30 dark:border-blue-500/60 dark:from-blue-600/20 dark:via-slate-900 dark:to-slate-900"
                          : "border-slate-200/80 bg-white/90 shadow-sm hover:border-blue-200 dark:border-slate-800 dark:bg-slate-900/90"
                      }`}
                    >
                      {/* Top Step Number & Status */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${
                              isActive
                                ? "bg-blue-600 text-white shadow-md shadow-blue-500/30"
                                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                            }`}
                          >
                            {index + 1}
                          </span>
                          <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            {isDemo
                              ? "Trial Onboarding"
                              : isActive
                              ? "Current Active Tier"
                              : "Previous Tier"}
                          </span>
                        </div>

                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                            isActive
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400"
                              : "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                          }`}
                        >
                          {isActive ? (
                            <>
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              ACTIVE
                            </>
                          ) : (
                            <>
                              <Check size={10} strokeWidth={3} />
                              COMPLETED
                            </>
                          )}
                        </span>
                      </div>

                      {/* Plan Title & Price */}
                      <div className="mt-4 flex items-baseline justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                              isActive
                                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                            }`}
                          >
                            {isDemo ? (
                              <Sparkles size={18} />
                            ) : isEnterprise ? (
                              <Gem size={18} />
                            ) : (
                              <Zap size={18} />
                            )}
                          </div>
                          <div>
                            <h4 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                              {upperPlan} PLAN
                            </h4>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                              {calculateDuration(startDate, endDate)} Duration
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span
                            className={`text-xl font-black ${
                              isActive
                                ? "text-blue-600 dark:text-blue-400"
                                : "text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            ${Number(price).toLocaleString()}
                          </span>
                          <span className="block text-[10px] font-bold text-slate-400">
                            {Number(price) === 0 ? "Free Trial" : "/ billing"}
                          </span>
                        </div>
                      </div>

                      {/* Date Range Tree Timeline */}
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-400">Start Date</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {formatDate(startDate)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-400">
                            {isActive ? "Renewal Due" : "Ended On"}
                          </span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {formatDate(endDate)}
                          </span>
                        </div>
                      </div>

                      {/* Limits & Highlights */}
                      <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-50 p-2.5 text-[11px] font-bold text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                        <span className="flex items-center gap-1.5">
                          <Layers size={13} className="text-blue-600 dark:text-blue-400" />
                          {machineLimit} Machines Max
                        </span>
                        <span className="text-slate-300 dark:text-slate-700">•</span>
                        <span>{staffLimit} Staff Accounts</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Next Upcoming Step: Future Milestone */}
              <div className="relative flex flex-col">
                <div className="flex-1 rounded-3xl border-2 border-dashed border-blue-200/80 bg-blue-50/30 p-5 sm:p-6 transition-all hover:bg-blue-50/60 dark:border-slate-800 dark:bg-slate-900/40">
                  <div className="flex items-center justify-between">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-black text-blue-700 dark:bg-blue-950 dark:text-blue-400">
                      {chronologicalHistory.length + 1}
                    </span>
                    <span className="inline-flex items-center rounded-full border border-blue-200 bg-white px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-blue-700 dark:border-blue-500/30 dark:bg-slate-800 dark:text-blue-300">
                      Upcoming Step
                    </span>
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
                      <Gem size={18} />
                    </div>
                    <div>
                      <h4 className="text-base font-black tracking-tight text-slate-900 dark:text-white">
                        Next Renewal / Upgrade
                      </h4>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Continuous Predictive Intelligence
                      </p>
                    </div>
                  </div>

                  <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                    Seamless auto-renewal or upgrade to Enterprise with unlimited fleet scale & dedicated AI telemetry.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 📋 DETAILED SUBSCRIPTION HISTORY TABLE */}
      {/* ------------------------------------------------------------- */}
      <div className="overflow-hidden rounded-[2rem] border border-blue-100 bg-white shadow-sm transition-all dark:border-slate-800 dark:bg-[#0F172A]">
        {/* Header */}
        <div className="flex items-center gap-4 border-b border-blue-50 p-6 dark:border-slate-800">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
            <History size={22} />
          </div>

          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-500">
              Billing Timeline
            </p>

            <h3 className="mt-1 text-xl font-black tracking-tight text-slate-900 dark:text-white">
              Subscription History Records
            </h3>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Detailed overview of your plan invoices and transaction status.
            </p>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-blue-50 bg-blue-50/50 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                <th className="px-6 py-4">Plan & Status</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4 text-center">Duration</th>
                <th className="px-6 py-4">Start Date</th>
                <th className="px-6 py-4 text-right">End Date</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-blue-50 dark:divide-slate-800">
              {history && history.length > 0 ? (
                history.map((item) => {
                  const planName =
                    item.plan_name ||
                    item.plan?.planName ||
                    (item as any).planName ||
                    (item as any).name ||
                    "Unknown Plan";

                  const price =
                    item.price ??
                    item.plan?.price ??
                    (item as any).amount ??
                    "0.00";

                  const startDate =
                    item.subscription_start_date ||
                    (item as any).subscriptionStartDate ||
                    (item as any).start_date ||
                    (item as any).created_at;

                  const endDate =
                    item.subscription_end_date ||
                    (item as any).subscriptionEndDate ||
                    (item as any).end_date;

                  const displayStatus =
                    item.payment_status ||
                    item.paymentStatus ||
                    item.status ||
                    "Pending";

                  return (
                    <tr
                      key={item.id}
                      className="group transition-all hover:bg-blue-50/40 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-sm dark:bg-blue-500/10 dark:text-blue-400">
                            <CreditCard size={18} />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <span className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">
                              {planName}
                            </span>

                            <span
                              className={`inline-flex w-fit items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${getStatusClasses(
                                displayStatus,
                              )}`}
                            >
                              {["active", "paid"].includes(
                                displayStatus.toLowerCase(),
                              ) && <CheckCircle2 size={11} />}

                              {displayStatus}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <span className="text-base font-black text-blue-600 dark:text-blue-400">
                          ${Number(price).toLocaleString()}
                        </span>
                      </td>

                      <td className="px-6 py-5 text-center">
                        <span className="inline-flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-600 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400">
                          <Clock size={13} />
                          {calculateDuration(startDate, endDate)}
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                            Start Date
                          </span>

                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {formatDate(startDate)}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-5 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                            Expiry Date
                          </span>

                          <span className="font-semibold text-slate-900 dark:text-white">
                            {formatDate(endDate)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-14 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-300 dark:bg-blue-500/10 dark:text-blue-400">
                        <Clock size={28} />
                      </div>

                      <div>
                        <p className="text-sm font-black text-slate-700 dark:text-slate-200">
                          No subscription records found.
                        </p>
                        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                          Your subscription history will appear here.
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
