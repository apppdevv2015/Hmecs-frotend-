import { AlertTriangle, Crown, UserPlus, Wrench } from "lucide-react";

const activities = [
  {
    title: "Rajesh Sharma added 4 new operators",
    time: "2 hours ago",
    icon: UserPlus,
    iconClass:
      "bg-emerald-50 text-emerald-600 ring-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-400 dark:ring-emerald-900/60",
  },
  {
    title: "Neha Verma upgraded to Professional plan",
    time: "5 hours ago",
    icon: Crown,
    iconClass:
      "bg-indigo-50 text-indigo-600 ring-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-400 dark:ring-indigo-900/60",
  },
  {
    title: "Amit Singh added 2 new machines",
    time: "1 day ago",
    icon: Wrench,
    iconClass:
      "bg-orange-50 text-orange-600 ring-orange-100 dark:bg-orange-950/50 dark:text-orange-400 dark:ring-orange-900/60",
  },
  {
    title: "3 critical alerts reported by operators",
    time: "2 days ago",
    icon: AlertTriangle,
    iconClass:
      "bg-rose-50 text-rose-600 ring-rose-100 dark:bg-rose-950/50 dark:text-rose-400 dark:ring-rose-900/60",
  },
];

export default function RecentActivity() {
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

        <button
          type="button"
          className="rounded-lg px-2 py-1 text-xs font-semibold text-blue-600 transition hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-950/50"
        >
          View All
        </button>
      </div>

      <div className="mt-5 flex-1 space-y-3">
        {activities.map((activity, index) => {
          const Icon = activity.icon;

          return (
            <div
              key={activity.title}
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

              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-slate-300 dark:bg-slate-700" />

              {index !== activities.length - 1 && (
                <span className="absolute left-[31px] top-[52px] h-3 w-px bg-slate-200 dark:bg-slate-800" />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}