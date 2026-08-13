import { useEffect, useState } from "react";
import { Building2, Crown, LucideIcon, UserPlus } from "lucide-react";

import { getSubscriptionPlans } from "../../../services/SuperAdmin/subscriptionService";
import { superAdminMachineService } from "../../../services/SuperAdmin/machineService";

type ActivityItem = {
  id: string;
  title: string;
  time: string;
  icon: LucideIcon;
  iconClass: string;
  rawDate: number;
};

const formatRelativeTime = (dateStr?: string | Date) => {
  if (!dateStr) return "Recently";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "Recently";

  const now = new Date();
  const diffMs = Math.abs(now.getTime() - d.getTime());
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export default function RecentActivity() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    const loadRealActivities = async () => {
      try {
        setLoading(true);
        const [plansRes, companiesRes] = await Promise.allSettled([
          getSubscriptionPlans(),
          superAdminMachineService.getCompanies(),
        ]);

        if (!isMounted) return;

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

        const generatedActivities: ActivityItem[] = [];

        // 1. Process Plan Subscriptions from DB
        rawPlans.forEach((plan: any) => {
          const rawPlanName = (
            plan.planName ||
            plan.plan_name ||
            plan.name ||
            "Plan"
          ).toString();
          const formattedPlan =
            rawPlanName.charAt(0).toUpperCase() + rawPlanName.slice(1);
          const planTitle = formattedPlan.endsWith("Plan")
            ? formattedPlan
            : `${formattedPlan} Plan`;

          if (Array.isArray(plan.subscriptions)) {
            plan.subscriptions.forEach((sub: any) => {
              const compName =
                sub.company?.name ||
                sub.company?.company_name ||
                sub.companyName ||
                sub.name;
              const subDate =
                sub.createdAt ||
                sub.created_at ||
                sub.company?.createdAt ||
                sub.company?.created_at;
              const dateTimestamp = subDate
                ? new Date(subDate).getTime()
                : Date.now();

              if (compName) {
                generatedActivities.push({
                  id: `sub-${compName}-${planTitle}`,
                  title: `${compName} subscribed to ${planTitle}`,
                  time: formatRelativeTime(subDate),
                  icon: Crown,
                  iconClass:
                    "bg-indigo-50 text-indigo-600 ring-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-400 dark:ring-indigo-900/60",
                  rawDate: dateTimestamp,
                });
              }
            });
          }
        });

        // 2. Process Registered Companies from DB
        rawCompanies.forEach((comp: any) => {
          const compName =
            comp.name || comp.company_name || comp.companyName;
          const compDate =
            comp.createdAt || comp.created_at || comp.startDate;
          const dateTimestamp = compDate
            ? new Date(compDate).getTime()
            : Date.now() - 3600000;

          const compPlanName = (
            comp.activePlan?.planName ||
            comp.activePlan?.name ||
            comp.activePlan ||
            comp.planName ||
            comp.plan_name ||
            ""
          )
            .toString()
            .trim();

          if (compName) {
            // Check if subscription activity was already added above for this company
            const hasSubActivity = generatedActivities.some(
              (act) =>
                act.id.startsWith(`sub-${compName}`) ||
                act.title.includes(compName)
            );

            if (!hasSubActivity && compPlanName) {
              const formattedPlan =
                compPlanName.charAt(0).toUpperCase() + compPlanName.slice(1);
              const planTitle = formattedPlan.endsWith("Plan")
                ? formattedPlan
                : `${formattedPlan} Plan`;

              generatedActivities.push({
                id: `sub-comp-${compName}`,
                title: `${compName} subscribed to ${planTitle}`,
                time: formatRelativeTime(compDate),
                icon: Crown,
                iconClass:
                  "bg-indigo-50 text-indigo-600 ring-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-400 dark:ring-indigo-900/60",
                rawDate: dateTimestamp,
              });
            }

            generatedActivities.push({
              id: `reg-${compName}`,
              title: `New company registered: ${compName}`,
              time: formatRelativeTime(compDate),
              icon: UserPlus,
              iconClass:
                "bg-emerald-50 text-emerald-600 ring-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-400 dark:ring-emerald-900/60",
              rawDate: dateTimestamp,
            });
          }
        });

        // Sort activities by date descending (most recent first)
        generatedActivities.sort((a, b) => b.rawDate - a.rawDate);

        // Deduplicate activities by title
        const uniqueActivities: ActivityItem[] = [];
        const seenTitles = new Set<string>();

        generatedActivities.forEach((act) => {
          if (!seenTitles.has(act.title)) {
            seenTitles.add(act.title);
            uniqueActivities.push(act);
          }
        });

        setActivities(uniqueActivities.slice(0, 5));
      } catch (err) {
        console.error("Failed to load real recent activity:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadRealActivities();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="flex h-full min-h-[320px] flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-950 dark:text-white">
            Recent Activity
          </h2>
          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            Latest platform updates
          </p>
        </div>

        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          Live DB
        </span>
      </div>

      <div className="mt-5 flex-1 space-y-3">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
          </div>
        ) : activities.length > 0 ? (
          activities.map((activity, index) => {
            const Icon = activity.icon;

            return (
              <div
                key={activity.id}
                className="relative flex gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-3 dark:border-slate-800 dark:bg-slate-950/50"
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${activity.iconClass}`}
                >
                  <Icon size={17} strokeWidth={2.2} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-semibold leading-5 text-slate-900 dark:text-white">
                    {activity.title}
                  </p>

                  <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                    {activity.time}
                  </p>
                </div>

                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />

                {index !== activities.length - 1 && (
                  <span className="absolute left-[31px] top-[52px] h-3 w-px bg-slate-200 dark:bg-slate-800" />
                )}
              </div>
            );
          })
        ) : (
          <div className="flex h-32 items-center justify-center text-sm text-slate-400">
            No recent activity
          </div>
        )}
      </div>
    </section>
  );
}