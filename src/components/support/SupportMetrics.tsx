import React, { type ReactNode } from "react";

export type SupportMetricItem = {
  label: string;
  count: number | string;
  icon: ReactNode;
  color?: string;
  bg?: string;
  subtext?: string;
};

type SupportMetricsProps = {
  metrics: SupportMetricItem[];
  onCardClick?: (item: SupportMetricItem) => void;
};

export const SupportMetrics: React.FC<SupportMetricsProps> = ({
  metrics,
  onCardClick,
}) => {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((item, idx) => (
        <div
          key={idx}
          onClick={() => onCardClick && onCardClick(item)}
          className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900 ${
            onCardClick ? "cursor-pointer" : ""
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {item.label}
            </p>
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                item.bg || "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
              }`}
            >
              {item.icon}
            </div>
          </div>

          <h3 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {item.count}
          </h3>

          {item.subtext && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {item.subtext}
            </p>
          )}
        </div>
      ))}
    </div>
  );
};

export default SupportMetrics;
