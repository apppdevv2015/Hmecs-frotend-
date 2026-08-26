import { CheckCircle2, Clock, CreditCard, History } from "lucide-react";

interface HistoryItem {
  id: string | number;
  plan_name?: string;
  status?: string;
  price?: string | number;
  payment_status?: string;
  subscription_start_date?: string;
  subscription_end_date?: string;
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  paymentStatus?: string;
  plan?: {
    id?: string;
    planName?: string;
    price?: string | number;
    validityDays?: number;
    machineLimit?: number;
    staffLimit?: number;
  };
}

interface SubscriptionHistoryTableProps {
  history: HistoryItem[];
  activeSubscription?: any;
}

export default function SubscriptionHistoryTable({
  history,
  activeSubscription,
}: SubscriptionHistoryTableProps) {
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A";

    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const calculateDuration = (item?: any) => {
    const days =
      item?.plan?.validityDays ??
      item?.plan?.validity_days ??
      item?.validityDays ??
      item?.validity_days ??
      30;

    return `${days} Days`;
  };

  const getStatusClasses = (status?: string) => {
    const normalizedStatus = status?.toLowerCase();

    if (normalizedStatus === "active" || normalizedStatus === "paid") {
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400";
    }

    if (normalizedStatus === "expired") {
      return "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400";
    }

    return "border-amber-100 bg-amber-50 text-amber-600 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400";
  };

  const displayList =
    history && history.length > 0
      ? history
      : activeSubscription
        ? [activeSubscription]
        : [];

  return (
    <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-slate-100 p-6 dark:border-slate-800 sm:p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
          <History size={22} />
        </div>

        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">
            Billing Timeline
          </p>

          <h3 className="mt-1 text-xl font-black tracking-tight text-slate-900 dark:text-white">
            Subscription History Records
          </h3>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Detailed overview of your plan invoices and transaction status.
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
              <th className="px-6 py-4">Plan & Status</th>
              <th className="px-6 py-4">Amount</th>
              <th className="px-6 py-4 text-center">Duration</th>
              <th className="px-6 py-4">Start Date</th>
              <th className="px-6 py-4 text-right">End Date</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {displayList && displayList.length > 0 ? (
              displayList.map((item, index) => {
                const planName =
                  item.plan?.planName ||
                  item.plan_name ||
                  (item as any).planName ||
                  (item as any).name ||
                  "N/A";

                const price =
                  item.price ??
                  item.plan?.price ??
                  (item as any).amount ??
                  0;

                const startDate =
                  item.subscription_start_date ||
                  item.subscriptionStartDate ||
                  (item as any).start_date ||
                  (item as any).created_at;

                const endDate =
                  item.subscription_end_date ||
                  item.subscriptionEndDate ||
                  (item as any).end_date;

                const displayStatus =
                  item.status ||
                  item.paymentStatus ||
                  item.payment_status ||
                  "N/A";

                return (
                  <tr
                    key={item.id || index}
                    className="group transition-all hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
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
                            className={`inline-flex w-fit items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${getStatusClasses(
                              displayStatus,
                            )}`}
                          >
                            {["active", "paid"].includes(
                              displayStatus.toLowerCase(),
                            ) && <CheckCircle2 size={11} />}

                            {displayStatus}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-5">
                      <span className="text-base font-black text-blue-600 dark:text-blue-400">
                        R {Number(price).toLocaleString()}
                      </span>
                    </td>

                    <td className="px-6 py-5 text-center">
                      <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        <Clock size={13} />
                        {calculateDuration(item)}
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
