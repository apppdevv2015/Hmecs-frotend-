import { Activity, CheckCircle2 } from "lucide-react";

const activities = [
  "Operator assigned to Excavator CAT 320D",
  "Mechanic updated inspection report",
  "Tyre pressure alert detected",
  "Maintenance request created",
];

export default function CompanyRecentActivity() {
  return (
    <div className="rounded-[2rem] border border-blue-100 bg-white p-6 shadow-sm transition-all dark:border-slate-700 dark:bg-[#0F172A]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-500">
            Activity Log
          </p>

          <h2 className="mt-1 text-xl font-black tracking-tight text-slate-900 dark:text-white">
            Recent Activity
          </h2>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
          <Activity size={22} />
        </div>
      </div>

      {/* Activity List */}
      <div className="mt-6 space-y-3">
        {activities.map((item, index) => {
          const isAlert = item.toLowerCase().includes("alert");

          return (
            <div
              key={item}
              className={`group flex items-start gap-4 rounded-2xl border p-4 text-sm font-semibold transition-all hover:-translate-y-0.5 hover:shadow-md ${
                isAlert
                  ? "border-orange-100 bg-orange-50 text-orange-700 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-400"
                  : "border-blue-100 bg-blue-50/50 text-slate-700 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300"
              }`}
            >
              <div
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                  isAlert
                    ? "bg-orange-100 text-orange-500 dark:bg-orange-500/20 dark:text-orange-400"
                    : "bg-white text-blue-500 shadow-sm dark:bg-slate-900 dark:text-blue-400"
                }`}
              >
                <CheckCircle2 size={16} />
              </div>

              <div className="flex-1">
                <p>{item}</p>

                <p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                  Activity #{index + 1}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
