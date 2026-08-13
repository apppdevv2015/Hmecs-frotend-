import React, { type ElementType } from "react";
import { ArrowUpRight } from "lucide-react";

export type SupervisorMetricItem = {
  label: string;
  value: string | number;
  icon: ElementType;
  description: string;
  badge: string;
  tone: "blue" | "green" | "amber" | "red";
};

type SupervisorMetricsProps = {
  metrics: SupervisorMetricItem[];
};

export const SupervisorMetrics: React.FC<SupervisorMetricsProps> = ({
  metrics,
}) => {
  const getToneStyle = (tone: "blue" | "green" | "amber" | "red") => {
    switch (tone) {
      case "green":
        return {
          icon: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400",
          badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
          bar: "bg-emerald-500",
        };
      case "amber":
        return {
          icon: "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400",
          badge: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
          bar: "bg-amber-500",
        };
      case "red":
        return {
          icon: "bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400",
          badge: "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300",
          bar: "bg-red-500",
        };
      default:
        return {
          icon: "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400",
          badge: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
          bar: "bg-blue-600",
        };
    }
  };

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((item) => {
        const Icon = item.icon;
        const toneStyle = getToneStyle(item.tone);

        return (
          <div
            key={item.label}
            className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-md dark:border-slate-800 dark:bg-[#0d1424]"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {item.label}
                </p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {item.value}
                </h2>
              </div>
              <div className={`rounded-xl p-2.5 ${toneStyle.icon}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>

            <p className="mt-3 min-h-[32px] text-[12px] leading-5 text-slate-500 dark:text-slate-400">
              {item.description}
            </p>

            <div className="mt-4 h-1 w-full rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className={`h-1 rounded-full ${toneStyle.bar}`}
                style={{
                  width:
                    item.tone === "blue"
                      ? "72%"
                      : item.tone === "green"
                        ? "80%"
                        : item.tone === "amber"
                          ? "22%"
                          : "12%",
                }}
              />
            </div>

            <div className="mt-3 flex items-center justify-between">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${toneStyle.badge}`}
              >
                {item.badge}
              </span>
              <ArrowUpRight className="h-4 w-4 text-slate-300 transition group-hover:text-blue-600 dark:text-slate-600 dark:group-hover:text-blue-400" />
            </div>
          </div>
        );
      })}
    </section>
  );
};

export default SupervisorMetrics;
