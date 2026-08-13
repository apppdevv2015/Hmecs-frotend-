import React, { type ReactNode } from "react";

export type OperatorMetricCard = {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  iconBg?: string;
  textColor?: string;
  badge?: string;
  badgeColor?: string;
};

type OperatorMetricsProps = {
  metrics: OperatorMetricCard[];
  onCardClick?: (metric: OperatorMetricCard) => void;
};

export const OperatorMetrics: React.FC<OperatorMetricsProps> = ({
  metrics,
  onCardClick,
}) => {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((card, idx) => (
        <div
          key={idx}
          onClick={() => onCardClick && onCardClick(card)}
          className={`group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-md dark:border-slate-800 dark:bg-[#081226] ${
            onCardClick ? "cursor-pointer" : ""
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {card.title}
            </p>
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                card.iconBg || "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
              }`}
            >
              {card.icon}
            </div>
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <h3
              className={`text-2xl font-bold tracking-tight ${
                card.textColor || "text-slate-900 dark:text-white"
              }`}
            >
              {card.value}
            </h3>
            {card.badge && (
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  card.badgeColor || "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                }`}
              >
                {card.badge}
              </span>
            )}
          </div>

          {card.subtitle && (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {card.subtitle}
            </p>
          )}
        </div>
      ))}
    </div>
  );
};

export default OperatorMetrics;
