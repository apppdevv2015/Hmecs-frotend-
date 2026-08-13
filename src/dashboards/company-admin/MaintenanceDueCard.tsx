import { Clock3, Wrench } from "lucide-react";

export default function MaintenanceDueCard() {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-blue-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-500/10 dark:border-slate-700 dark:bg-[#0F172A]">
      {/* Background Glow */}
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-orange-500/10 blur-3xl" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-500">
            Scheduled Work
          </p>

          <h2 className="mt-1 text-xl font-black tracking-tight text-slate-900 dark:text-white">
            Maintenance Due
          </h2>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-500 dark:bg-orange-500/10 dark:text-orange-400">
          <Wrench size={22} />
        </div>
      </div>

      {/* Count */}
      <div className="relative z-10 mt-6">
        <div className="flex items-end gap-3">
          <p className="text-5xl font-black tracking-tight text-slate-900 dark:text-white">5</p>

          <span className="mb-2 rounded-full border border-orange-100 bg-orange-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-orange-500 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-400">
            This Week
          </span>
        </div>

        <p className="mt-3 text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
          Machines require scheduled maintenance this week.
        </p>
      </div>

      {/* Footer */}
      <div className="relative z-10 mt-6 flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/50">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-blue-500 shadow-sm dark:bg-slate-900 dark:text-blue-400">
          <Clock3 size={16} />
        </div>

        <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
          Review maintenance schedule and assign mechanics.
        </p>
      </div>
    </div>
  );
}
