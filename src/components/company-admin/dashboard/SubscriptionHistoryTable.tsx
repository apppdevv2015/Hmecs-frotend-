import {
  CheckCircle2,
  Clock,
  CreditCard,
  History,
} from "lucide-react";

interface HistoryItem {
  id: string | number;
  plan_name: string;
  status: string;
  price: string | number;
  subscription_start_date: string;
  subscription_end_date: string;
  payment_status: string;
}

interface SubscriptionHistoryTableProps {
  history: HistoryItem[];
}

export default function SubscriptionHistoryTable({
  history,
}: SubscriptionHistoryTableProps) {
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A";

    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const calculateDuration = (start: string, end: string) => {
    if (!start || !end) return "N/A";

    const s = new Date(start);
    const e = new Date(end);
    const diff = e.getTime() - s.getTime();
    const days = Math.round(diff / (1000 * 60 * 60 * 24));

    return `${days} Days`;
  };

  const getStatusClasses = (status: string) => {
    const normalizedStatus = status?.toLowerCase();

    if (normalizedStatus === "active") {
      return "border-green-100 bg-green-50 text-green-700 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-400";
    }

    if (normalizedStatus === "expired") {
      return "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400";
    }

    return "border-orange-100 bg-orange-50 text-orange-600 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-400";
  };

  return (
    <div className="overflow-hidden rounded-[2rem] border border-blue-100 bg-white shadow-sm transition-all dark:border-slate-700 dark:bg-[#0F172A]">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-blue-50 p-6 dark:border-slate-700/50">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
          <History size={22} />
        </div>

        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-500">
            Billing Timeline
          </p>

          <h3 className="mt-1 text-xl font-black tracking-tight text-slate-900 dark:text-white">
            Subscription History
          </h3>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Detailed overview of your plan timeline and status.
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-blue-50 bg-blue-50/50 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-slate-400">
              <th className="px-6 py-4">Plan & Status</th>
              <th className="px-6 py-4">Amount</th>
              <th className="px-6 py-4 text-center">Duration</th>
              <th className="px-6 py-4">Start Date</th>
              <th className="px-6 py-4 text-right">End Date</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-blue-50 dark:divide-slate-700/50">
            {history && history.length > 0 ? (
              history.map((item) => {
                const planName =
                  item.plan_name || (item as any).name || "Unknown Plan";

                const price = item.price ?? (item as any).amount ?? "0.00";

                const startDate =
                  item.subscription_start_date ||
                  (item as any).subscriptionStartDate ||
                  (item as any).start_date ||
                  (item as any).created_at;

                const endDate =
                  item.subscription_end_date ||
                  (item as any).subscriptionEndDate ||
                  (item as any).end_date;

                return (
                  <tr
                    key={item.id}
                    className="group transition-all hover:bg-blue-50/40 dark:hover:bg-slate-800/40"
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-sm dark:bg-blue-500/10 dark:text-blue-400">
                          <CreditCard size={18} />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <span className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">
                            {planName}
                          </span>

                          <span
                            className={`inline-flex w-fit items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${getStatusClasses(
                              item.status
                            )}`}
                          >
                            {item.status === "active" && (
                              <CheckCircle2 size={11} />
                            )}
                            {item.status || "unknown"}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-5">
                      <span className="text-base font-black text-blue-600 dark:text-blue-400">
                        ${price}
                      </span>
                    </td>

                    <td className="px-6 py-5 text-center">
                      <span className="inline-flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-600 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400">
                        <Clock size={13} />
                        {calculateDuration(startDate, endDate)}
                      </span>
                    </td>

                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                          Start Date
                        </span>

                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {formatDate(startDate)}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-5 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                          Expiry Date
                        </span>

                        <span className="font-semibold text-slate-900 dark:text-white">
                          {formatDate(endDate)}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-14 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-300 dark:bg-blue-500/10 dark:text-blue-400">
                      <Clock size={28} />
                    </div>

                    <div>
                      <p className="text-sm font-black text-slate-700 dark:text-slate-200">
                        No subscription records found.
                      </p>
                      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                        Your subscription history will appear here.
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}