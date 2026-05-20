
import { AlertTriangle, HardHat, Truck, Wrench } from "lucide-react";

interface CompanyAdminMetricsProps {
  stats: {
    machines: number;
    operators: number;
    mechanics: number;
    alerts: number;
  };
}

export default function CompanyAdminMetrics({ stats }: CompanyAdminMetricsProps) {
  const metrics = [
    {
      title: "Total Machines",
      value: stats.machines.toString(),
      icon: Truck,
      iconBox: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
      accent: "bg-blue-500",
    },
    {
      title: "Operators",
      value: stats.operators.toString(),
      icon: HardHat,
      iconBox: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400",
      accent: "bg-sky-500",
    },
    {
      title: "Mechanics",
      value: stats.mechanics.toString(),
      icon: Wrench,
      iconBox: "bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300",
      accent: "bg-slate-500",
    },
    {
      title: "Active Alerts",
      value: stats.alerts.toString(),
      icon: AlertTriangle,
      iconBox: "bg-orange-50 text-orange-500 dark:bg-orange-500/10 dark:text-orange-400",
      accent: "bg-orange-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((item) => {
        const Icon = item.icon;

        return (
          <div
            key={item.title}
            className="group relative overflow-hidden rounded-[2rem] border border-blue-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-500/10 dark:border-slate-700 dark:bg-[#0F172A]"
          >
            <div className={`absolute left-0 top-0 h-full w-1 ${item.accent}`} />

            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  {item.title}
                </p>

                <h3 className="mt-3 text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                  {item.value}
                </h3>
              </div>

              <div
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl transition-transform group-hover:scale-105 ${item.iconBox}`}
              >
                <Icon size={24} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}