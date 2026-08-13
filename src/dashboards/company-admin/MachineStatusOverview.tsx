import { AlertTriangle, CheckCircle2, Clock3, Gauge } from "lucide-react";

const machineStatus = [
  {
    title: "Operational",
    count: 18,
    icon: CheckCircle2,
    boxClass:
      "border-blue-100 bg-blue-50/60 text-blue-600 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400",
    iconClass: "bg-white text-blue-500 shadow-sm dark:bg-slate-900 dark:text-blue-400",
  },
  {
    title: "Maintenance Due",
    count: 5,
    icon: Clock3,
    boxClass:
      "border-orange-100 bg-orange-50 text-orange-600 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-400",
    iconClass: "bg-orange-100 text-orange-500 dark:bg-orange-500/20 dark:text-orange-400",
  },
  {
    title: "Critical Alert",
    count: 4,
    icon: AlertTriangle,
    boxClass:
      "border-red-100 bg-red-50 text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400",
    iconClass: "bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-400",
  },
];

export default function MachineStatusOverview() {
  const totalMachines = machineStatus.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="rounded-[2rem] border border-blue-100 bg-white p-6 shadow-sm transition-all dark:border-slate-700 dark:bg-[#0F172A]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-500">
            Fleet Health
          </p>

          <h2 className="mt-1 text-xl font-black tracking-tight text-slate-900 dark:text-white">
            Machine Status Overview
          </h2>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
          <Gauge size={22} />
        </div>
      </div>

      {/* Status Cards */}
      <div className="mt-6 space-y-3">
        {machineStatus.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.title}
              className={`flex items-center justify-between rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-md ${item.boxClass}`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.iconClass}`}
                >
                  <Icon size={18} />
                </div>

                <div>
                  <p className="text-sm font-black text-slate-900 dark:text-white">{item.title}</p>
                  <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    Machine Count
                  </p>
                </div>
              </div>

              <p className="text-2xl font-black">{item.count}</p>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/50">
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          Total Machines:
          <span className="ml-2 font-black text-blue-600 dark:text-blue-400">{totalMachines}</span>
        </p>
      </div>
    </div>
  );
}
