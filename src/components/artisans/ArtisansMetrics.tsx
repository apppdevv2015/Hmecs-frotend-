import React, { type ReactNode } from "react";

export type MetricItem = {
  title: string;
  value: number | string;
  icon: ReactNode;
  color: string;
  type?: any;
};

type ArtisansMetricsProps = {
  stats: MetricItem[];
  onCardClick?: (type: any) => void;
};

export const ArtisansMetrics: React.FC<ArtisansMetricsProps> = ({
  stats,
  onCardClick,
}) => {
  return (
    <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-2 xl:grid-cols-3">
      {stats.map((item) => (
        <button
          type="button"
          key={item.title}
          onClick={() => onCardClick && onCardClick(item.type)}
          className="
            group
            flex
            h-[150px]
            w-full
            items-center
            justify-between
            rounded-2xl
            border
            border-slate-200
            bg-slate-50
            px-6
            py-5
            text-left
            transition-all
            duration-300
            hover:-translate-y-1
            hover:border-blue-300
            hover:bg-white
            hover:shadow-lg
            dark:border-slate-800
            dark:bg-[#101f33]
            dark:hover:border-blue-500/50
            dark:hover:bg-[#12243b]
          "
        >
          {/* Left Icon */}
          <div
            className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border ${item.color}`}
          >
            {item.icon}
          </div>

          {/* Right Content */}
          <div className="flex flex-col items-end text-right">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              {item.title}
            </p>

            <h2 className="mt-3 text-5xl font-extrabold tracking-tight text-slate-950 dark:text-white">
              {item.value}
            </h2>
          </div>
        </button>
      ))}
    </div>
  );
};

export default ArtisansMetrics;
