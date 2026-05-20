
import { Link } from "react-router";
import { ShieldCheck, Clock, ArrowUpCircle } from "lucide-react";

interface CompanyPlanCardProps {
  subscription: any;
  machineCount: number;
}

export default function CompanyPlanCard({
  subscription,
  machineCount,
}: CompanyPlanCardProps) {
  if (!subscription) {
    return (
      <div className="rounded-[2rem] border border-blue-100 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-[#0F172A]">
        <div className="flex flex-col items-center justify-between gap-5 md:flex-row">
          
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
              <ShieldCheck size={28} />
            </div>

            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-500">
                Subscription
              </p>

              <h2 className="mt-1 text-xl font-black tracking-tight text-slate-900 dark:text-white">
                No Active Plan
              </h2>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Activate a plan to start monitoring your components.
              </p>
            </div>
          </div>

          <Link
            to="/plans"
            className="flex items-center gap-2 rounded-2xl bg-blue-500 px-6 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-600"
          >
            <ArrowUpCircle size={18} />
            Choose Plan
          </Link>
        </div>
      </div>
    );
  }

  const calculateDaysLeft = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();

    return Math.max(
      0,
      Math.ceil(diff / (1000 * 60 * 60 * 24))
    );
  };

  const daysLeft = calculateDaysLeft(
    subscription.subscription_end_date ||
      subscription.subscriptionEndDate ||
      subscription.end_date
  );

  const isDemo =
    (subscription.plan_name || subscription.name)
      ?.toLowerCase() === "demo";

  const usagePercentage = subscription.machine_limit
    ? Math.min(
        100,
        Math.round(
          (machineCount / subscription.machine_limit) * 100
        )
      )
    : 0;

  return (
    <div className="relative overflow-hidden rounded-[2.5rem] border border-blue-100 bg-white p-7 shadow-sm transition-all hover:shadow-lg hover:shadow-blue-500/10 dark:border-slate-700 dark:bg-[#0F172A]">
      
      {/* Background Glow */}
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-blue-500/5 blur-3xl" />

      <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
        
        {/* Left */}
        <div className="flex flex-1 items-start gap-5">
          
          <div
            className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl shadow-sm ${
              isDemo
                ? "bg-orange-50 text-orange-500 dark:bg-orange-500/10 dark:text-orange-400"
                : "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
            }`}
          >
            <ShieldCheck size={30} />
          </div>

          <div className="space-y-2">
            
            <div className="flex flex-wrap items-center gap-3">
              
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-500">
                Subscription Plan
              </p>

              <span
                className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${
                  subscription.status === "active"
                    ? "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400"
                    : "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                }`}
              >
                {subscription.status}
              </span>
            </div>

            <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              {subscription.plan_name ||
                subscription.name ||
                "Active"}{" "}
              Plan
            </h2>

            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
              
              <span className="flex items-center gap-2">
                <strong className="text-slate-900 dark:text-white">
                  {machineCount}
                </strong>
                / {subscription.machine_limit || "∞"} Machines
              </span>

              <span className="h-1 w-1 rounded-full bg-slate-300" />

              <span className="flex items-center gap-2">
                <Clock size={14} />
                <strong>{daysLeft}</strong> days remaining
              </span>
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="flex w-full items-center gap-3 xl:w-auto">
          <Link
            to="/plans"
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-500 px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-600 xl:flex-none"
          >
            <ArrowUpCircle size={18} />
            Upgrade Plan
          </Link>
        </div>
      </div>

      {/* Progress */}
      {subscription.machine_limit && (
        <div className="relative z-10 mt-7">
          
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              Machine Usage
            </p>

            <p className="text-sm font-black text-blue-600 dark:text-blue-400">
              {usagePercentage}%
            </p>
          </div>

          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${
                usagePercentage > 80
                  ? "bg-orange-500"
                  : "bg-blue-500"
              }`}
              style={{
                width: `${usagePercentage}%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}