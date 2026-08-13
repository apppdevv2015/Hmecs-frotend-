import {
  Building2,
  Crown,
  Layers,
  ShoppingBag,
  Users,
} from "lucide-react";

import { useEffect, useMemo, useState } from "react";

import {
  superAdminMachineService,
  type SuperAdminDashboardMetrics,
} from "../../../services/SuperAdmin/machineService";
import { getSubscriptionPlans } from "../../../services/SuperAdmin/subscriptionService";

import type { LucideIcon } from "lucide-react";

type PlanDetail = {
  name: string;
  count: number;
  inUse: boolean;
  companies: string[];
  price?: number | string;
};

type ActiveCompanyDetail = {
  name: string;
  planName: string;
  purchaseMonth?: string;
};

type StatItem = {
  title: string;
  value: number | string;
  change: string;
  positive: boolean;
  icon: LucideIcon;
  iconClass: string;
  tooltipDetails?: PlanDetail[];
  companiesTooltip?: ActiveCompanyDetail[];
  purchasesTooltip?: ActiveCompanyDetail[];
};

const initialMetrics: SuperAdminDashboardMetrics = {
  totalAdmins: 0,
  activePlans: 0,
  totalOperators: 0,
  totalMechanics: 0,
  totalMachines: 0,
  criticalAlerts: 0,
};

export default function SuperAdminMetrics() {
  const [metrics, setMetrics] =
    useState<SuperAdminDashboardMetrics>(initialMetrics);
  const [dbPlansDetails, setDbPlansDetails] = useState<PlanDetail[]>([]);
  const [subscribedCompanies, setSubscribedCompanies] = useState<ActiveCompanyDetail[]>([]);
  const [usedPlansCount, setUsedPlansCount] = useState<number>(0);
  const [totalPlansCount, setTotalPlansCount] = useState<number>(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError("");

        const [metricsRes, plansRes, companiesRes] = await Promise.allSettled([
          superAdminMachineService.getDashboardMetrics(),
          getSubscriptionPlans(),
          superAdminMachineService.getCompanies(),
        ]);

        if (!isMounted) return;

        if (metricsRes.status === "fulfilled") {
          setMetrics(metricsRes.value || initialMetrics);
        }

        // 1. Extract real plans safely from response
        let rawPlans: any[] = [];
        if (plansRes.status === "fulfilled" && plansRes.value) {
          const val: any = plansRes.value;
          rawPlans = Array.isArray(val)
            ? val
            : Array.isArray(val?.data)
              ? val.data
              : Array.isArray(val?.plans)
                ? val.plans
                : Array.isArray(val?.data?.plans)
                  ? val.data.plans
                  : [];
        }

        // 2. Extract companies list safely
        let rawCompanies: any[] = [];
        if (companiesRes.status === "fulfilled" && companiesRes.value) {
          const val: any = companiesRes.value;
          rawCompanies = Array.isArray(val)
            ? val
            : Array.isArray(val?.data)
              ? val.data
              : Array.isArray(val?.companies)
                ? val.companies
                : [];
        }

        if (rawPlans.length > 0) {
          setTotalPlansCount(rawPlans.length);

          let activeCount = 0;
          const activeCompanyList: ActiveCompanyDetail[] = [];

          const mapped: PlanDetail[] = rawPlans.map((p: any) => {
            const rawName = (p.planName || p.plan_name || p.name || "Plan").toString();
            const formattedName =
              rawName.charAt(0).toUpperCase() + rawName.slice(1);
            const planDisplayName = formattedName.endsWith("Plan") ? formattedName : `${formattedName} Plan`;
            const lowerName = rawName.toLowerCase().trim();
            const planCompanies: string[] = [];

            // 1. Check subscriptions from plan object directly
            if (Array.isArray(p.subscriptions) && p.subscriptions.length > 0) {
              p.subscriptions.forEach((sub: any) => {
                const compName = sub.company?.name || sub.company?.company_name || sub.companyName || sub.name;
                const subDate = sub.createdAt || sub.created_at || sub.company?.createdAt || sub.company?.created_at;
                const exactDateStr = subDate
                  ? new Date(subDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                  : "";

                if (compName && !planCompanies.includes(compName)) {
                  planCompanies.push(compName);
                  activeCompanyList.push({ name: compName, planName: planDisplayName, purchaseMonth: exactDateStr });
                }
              });
            }

            // 2. Cross check with rawCompanies list
            rawCompanies.forEach((comp: any) => {
              const compPlan = (
                comp.activePlan?.planName ||
                comp.activePlan?.name ||
                comp.activePlan ||
                comp.planName ||
                comp.plan_name ||
                ""
              )
                .toString()
                .toLowerCase()
                .trim();

              if (compPlan && (compPlan === lowerName || compPlan.includes(lowerName) || lowerName.includes(compPlan))) {
                const compName = comp.name || comp.company_name || comp.companyName;
                const dateVal = comp.subscriptions?.[0]?.createdAt || comp.subscriptions?.[0]?.created_at || comp.createdAt || comp.created_at || comp.startDate || comp.start_date;
                const exactDateStr = dateVal
                  ? new Date(dateVal).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                  : "";
                if (compName && !planCompanies.includes(compName)) {
                  planCompanies.push(compName);
                  activeCompanyList.push({ name: compName, planName: planDisplayName, purchaseMonth: exactDateStr });
                }
              }
            });

            const subsCount = planCompanies.length;
            const inUse = subsCount > 0;
            if (inUse) activeCount++;

            return {
              name: planDisplayName,
              count: subsCount,
              inUse,
              companies: planCompanies,
              price: p.price,
            };
          });

          setUsedPlansCount(activeCount);
          setDbPlansDetails(mapped);

          // Deduplicate activeCompanyList
          const uniqueCompaniesMap = new Map<string, ActiveCompanyDetail>();
          activeCompanyList.forEach((item) => uniqueCompaniesMap.set(item.name, item));
          setSubscribedCompanies(Array.from(uniqueCompaniesMap.values()));
        }
      } catch (error: unknown) {
        console.error("Dashboard Metrics Error:", error);
        if (isMounted) {
          setError(
            error instanceof Error
              ? error.message
              : "Failed to load dashboard metrics"
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadDashboardData();

    return () => {
      isMounted = false;
    };
  }, []);

  const stats = useMemo<StatItem[]>(
    () => [
      {
        title: "Total Admins",
        value: metrics.totalAdmins ?? 0,
        change: "12%",
        positive: true,
        icon: Users,
        iconClass:
          "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400",
      },
      {
        title: "Active Plans",
        value: totalPlansCount,
        change: "8%",
        positive: true,
        icon: Crown,
        iconClass:
          "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400",
      },
      {
        title: "Subscribed Companies",
        value: `${subscribedCompanies.length} Companies`,
        change: "18%",
        positive: true,
        icon: Building2,
        iconClass:
          "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
        companiesTooltip: subscribedCompanies,
      },
      {
        title: "Plans In Use",
        value: `${usedPlansCount} / ${totalPlansCount} Plans`,
        change: "10%",
        positive: true,
        icon: Layers,
        iconClass:
          "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400",
        tooltipDetails: dbPlansDetails,
      },
      {
        title: "Monthly Plans",
        value: `${subscribedCompanies.length} Purchased`,
        change: "15%",
        positive: true,
        icon: ShoppingBag,
        iconClass:
          "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400",
        purchasesTooltip: subscribedCompanies,
      },
    ],
    [metrics, usedPlansCount, totalPlansCount, dbPlansDetails, subscribedCompanies]
  );

  if (loading) {
    return (
      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="h-[170px] animate-pulse rounded-3xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900"
          />
        ))}
      </section>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
        {error}
      </div>
    );
  }

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {stats.map((item) => {
        const Icon = item.icon;

        return (
          <article
            key={item.title}
            className="relative group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
          >
            {/* Card 3 Hover Tooltip Popup for Subscribed Companies */}
            {item.companiesTooltip && (
              <div className="pointer-events-none absolute top-full left-1/2 mt-3 hidden w-72 -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl transition-all duration-200 group-hover:flex group-hover:pointer-events-auto flex-col dark:border-slate-800 dark:bg-[#081028] z-50">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Subscribed Companies
                  </p>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                    {item.companiesTooltip.length} Active
                  </span>
                </div>
                <div className="mt-3 space-y-2 max-h-60 overflow-y-auto pr-1">
                  {item.companiesTooltip.map((comp) => (
                    <div
                      key={comp.name}
                      className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800/60 last:border-0"
                    >
                      <span className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                        🏢 {comp.name}
                      </span>
                      <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                        {comp.planName}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Card 4 Hover Tooltip Popup for Plans Usage Details */}
            {item.tooltipDetails && (
              <div className="pointer-events-none absolute top-full left-1/2 mt-3 hidden w-72 -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl transition-all duration-200 group-hover:flex group-hover:pointer-events-auto flex-col dark:border-slate-800 dark:bg-[#081028] z-50">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {totalPlansCount || 5} Created Plans Breakdown
                  </p>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                    {usedPlansCount} Active In Use
                  </span>
                </div>
                <div className="mt-3 space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {item.tooltipDetails.map((plan) => (
                    <div
                      key={plan.name}
                      className="flex flex-col gap-1 border-b border-slate-100 dark:border-slate-800/60 pb-2 last:border-0 last:pb-0"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              plan.inUse
                                ? "bg-emerald-500 shadow-sm shadow-emerald-500/50"
                                : "bg-slate-300 dark:bg-slate-700"
                            }`}
                          />
                          <span className="font-semibold text-slate-800 dark:text-slate-100">
                            {plan.name}
                          </span>
                        </div>
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                            plan.inUse
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                              : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                          }`}
                        >
                          {plan.inUse
                            ? `${plan.count} Active Subscription${plan.count > 1 ? "s" : ""}`
                            : "Not In Use"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Card 5 Hover Tooltip Popup for Company Plan Purchases */}
            {item.purchasesTooltip && (
              <div className="pointer-events-none absolute top-full right-0 mt-3 hidden w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl transition-all duration-200 group-hover:flex group-hover:pointer-events-auto flex-col dark:border-slate-800 dark:bg-[#081028] z-50">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Monthly Plan Purchases
                  </p>
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400">
                    {item.purchasesTooltip.length} Purchases
                  </span>
                </div>
                <div className="mt-3 space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {item.purchasesTooltip.map((comp) => (
                    <div
                      key={comp.name}
                      className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 dark:border-slate-800/60 last:border-0"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                          🏢 {comp.name}
                        </span>
                        {comp.purchaseMonth && (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                            📅 Purchased: {comp.purchaseMonth}
                          </span>
                        )}
                      </div>
                      <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                        {comp.planName}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-start justify-between">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl ${item.iconClass}`}
              >
                <Icon size={20} strokeWidth={2} />
              </div>

              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  item.positive
                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                    : "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400"
                }`}
              >
                {item.positive ? "+" : "-"}
                {item.change}
              </span>
            </div>

            <div className="mt-5">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  {item.title}
                </p>
                {(item.tooltipDetails || item.companiesTooltip) && (
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400 px-1.5 py-0.5 rounded">
                    Hover for Info
                  </span>
                )}
              </div>

              <h3 className="mt-2 text-[28px] font-semibold tracking-tight text-slate-900 dark:text-white">
                {typeof item.value === "number"
                  ? item.value.toLocaleString()
                  : item.value}
              </h3>

              <div className="mt-3 flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    item.positive ? "bg-emerald-500" : "bg-red-500"
                  }`}
                />

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  <span
                    className={
                      item.positive
                        ? "font-medium text-emerald-600 dark:text-emerald-400"
                        : "font-medium text-red-600 dark:text-red-400"
                    }
                  >
                    {item.positive ? "Growth" : "Drop"}
                  </span>{" "}
                  from last month
                </p>
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}