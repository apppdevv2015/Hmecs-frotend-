import { useEffect, useState } from "react";
import { AlertTriangle, Crown, UserPlus, Wrench } from "lucide-react";
import { superAdminMachineService } from "../../services/SuperAdmin/machineService";

interface ActivityItem {
  title: string;
  time: string;
  iconType: "user" | "plan" | "machine" | "alert";
}

const iconMap: Record<string, any> = {
  user: UserPlus,
  plan: Crown,
  machine: Wrench,
  alert: AlertTriangle,
};

const classMap: Record<string, string> = {
  user: "bg-emerald-50 text-emerald-600 ring-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-400 dark:ring-emerald-900/60",
  plan: "bg-indigo-50 text-indigo-600 ring-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-400 dark:ring-indigo-900/60",
  machine:
    "bg-orange-50 text-orange-600 ring-orange-100 dark:bg-orange-950/50 dark:text-orange-400 dark:ring-orange-900/60",
  alert:
    "bg-rose-50 text-rose-600 ring-rose-100 dark:bg-rose-950/50 dark:text-rose-400 dark:ring-rose-900/60",
};

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return "Just now";
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} ${diffMinutes === 1 ? "minute" : "minutes"} ago`;
  }
  if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;
  }
  if (diffDays < 30) {
    return `${diffDays} ${diffDays === 1 ? "day" : "days"} ago`;
  }
  return date.toLocaleDateString();
}

export default function RecentActivity() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchActivities = async () => {
      try {
        setLoading(true);
        const list = await superAdminMachineService.getDashboardRecentActivity();
        if (isMounted) {
          setActivities(Array.isArray(list) ? list : []);
        }
      } catch (err) {
        console.error("Error fetching recent activities:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchActivities();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="flex h-full min-h-[320px] flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-950 dark:text-white">Recent Activity</h2>
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
        {loading ? (
          Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 animate-pulse dark:border-slate-800 dark:bg-slate-950/50"
            >
              <div className="h-10 w-10 shrink-0 rounded-xl bg-slate-200 dark:bg-slate-800" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-3 w-3/4 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-2 w-1/4 rounded bg-slate-200 dark:bg-slate-800" />
              </div>
            </div>
          ))
        ) : activities.length === 0 ? (
          <div className="flex h-full min-h-[200px] items-center justify-center py-8 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
            No recent activities found.
          </div>
        ) : (
          activities.map((activity, index) => {
            const Icon = iconMap[activity.iconType] || UserPlus;
            const iconClass = classMap[activity.iconType] || classMap.user;

            return (
              <div
                key={index}
                className="relative flex gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-3 dark:border-slate-800 dark:bg-slate-950/50"
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${iconClass}`}
                >
                  <Icon size={17} strokeWidth={2.2} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-semibold leading-5 text-slate-900 dark:text-white">
                    {activity.title}
                  </p>

                  <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                    {formatRelativeTime(activity.time)}
                  </p>
                </div>

                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-slate-300 dark:bg-slate-700" />

                {index !== activities.length - 1 && (
                  <span className="absolute left-[31px] top-[52px] h-3 w-px bg-slate-200 dark:bg-slate-800" />
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
