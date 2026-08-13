import { AlertTriangle, Crown, HardHat, Users, Wrench } from "lucide-react";

import { useEffect, useMemo, useState } from "react";

import {
  superAdminMachineService,
  type SuperAdminDashboardMetrics,
} from "../../services/SuperAdmin/machineService";

import type { LucideIcon } from "lucide-react";

type StatItem = {
  title: string;
  value: number;
  change: string;
  positive: boolean;
  icon: LucideIcon;
  iconClass: string;
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
  const [metrics, setMetrics] = useState<SuperAdminDashboardMetrics>(initialMetrics);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const fetchMetrics = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await superAdminMachineService.getDashboardMetrics();

        if (isMounted) {
          setMetrics(response || initialMetrics);
        }
      } catch (error: unknown) {
        console.error("Dashboard Metrics Error:", error);

        if (isMounted) {
          setError(error instanceof Error ? error.message : "Failed to load dashboard metrics");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchMetrics();

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
        iconClass: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400",
      },
      {
        title: "Active Plans",
        value: metrics.activePlans ?? 0,
        change: "8%",
        positive: true,
        icon: Crown,
        iconClass: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400",
      },
      {
        title: "Total Operators",
        value: metrics.totalOperators ?? 0,
        change: "18%",
        positive: true,
        icon: HardHat,
        iconClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
      },
      {
        title: "Total Artisans",
        value: metrics.totalMechanics ?? 0,
        change: "10%",
        positive: true,
        icon: Wrench,
        iconClass: "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400",
      },
      {
        title: "Critical Alerts",
        value: metrics.criticalAlerts ?? 0,
        change: "4%",
        positive: false,
        icon: AlertTriangle,
        iconClass: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400",
      },
    ],
    [metrics],
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
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
          >
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
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{item.title}</p>

              <h3 className="mt-2 text-[28px] font-semibold tracking-tight text-slate-900 dark:text-white">
                {item.value.toLocaleString()}
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
