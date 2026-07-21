import React, { useEffect, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  Clock,
  History,
  CreditCard,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { CompanyAdminNav } from "../../components/company-admin/CompanyAdminNav";
import { userService } from "../../services/userService";
import toast from "react-hot-toast";

type Subscription = {
  id: string | number;
  plan_name: string;
  status: string;
  start_date: string;
  end_date: string;
  amount: string | number;
  payment_method?: string;
};

export default function SubscriptionHistory() {
  const [history, setHistory] = useState<Subscription[]>([]);
  const [activeSub, setActiveSub] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [historyData, activeData] = await Promise.all([
          userService.getSubscriptionHistory(),
          userService.getActiveSubscription(),
        ]);

        setHistory(Array.isArray(historyData) ? historyData : []);
        setActiveSub(activeData?.data || activeData);
      } catch (error) {
        console.error("Failed to fetch subscriptions:", error);
        // Fallback to mock if API fails for now, or just show empty
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getDurationDays = (planName?: string) => {
    if (!planName) return "30 Days";
    return planName.toLowerCase().includes("demo") || planName.toLowerCase().includes("free")
      ? "14 Days"
      : "30 Days";
  };

  if (loading) {
    return (
      <div className="p-6 space-y-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto" />
          <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">
            Fetching your billing records...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      <CompanyAdminNav />

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-slate-900/20">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-[10px] font-black uppercase tracking-widest text-blue-300">
            Current Subscription
          </div>
          <h1 className="text-4xl font-black tracking-tighter">
            {activeSub?.plan_name || "No Active"}{" "}
            <span className="text-blue-400 text-2xl uppercase ml-2 tracking-normal">Plan</span>
          </h1>
          <p className="text-slate-400 font-medium max-w-md">
            {activeSub
              ? `Your ${activeSub.plan_name} subscription is active until ${new Date(activeSub.end_date).toLocaleDateString()}.`
              : "You don't have an active subscription. Choose a plan to get started."}
          </p>
        </div>

        <div className="flex items-center gap-4">
          {activeSub && (
            <div className="text-right hidden sm:block">
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                Auto Renewal
              </p>
              <p className="text-sm font-bold text-green-400">Enabled</p>
            </div>
          )}
          <button className="px-8 py-4 rounded-2xl bg-white text-slate-900 text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition shadow-xl">
            {activeSub ? "Manage Billing" : "Upgrade Now"}
          </button>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-900 dark:text-white">
              <History size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Billing History
              </h2>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                Past Transactions & Invoices
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/50">
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Plan Details
                </th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Status
                </th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Duration
                </th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Amount
                </th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">
                  Invoice
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {history.length > 0 ? (
                history.map((sub) => (
                  <tr
                    key={sub.id}
                    className="group hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors"
                  >
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600">
                          <CreditCard size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900 dark:text-white uppercase">
                            {sub.plan_name}
                          </p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            via {sub.payment_method || "PayFast"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          sub.status === "active" || sub.status === "Active"
                            ? "bg-green-50 text-green-600 border border-green-100 dark:bg-green-500/10 dark:border-green-500/20"
                            : "bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${sub.status === "active" || sub.status === "Active" ? "bg-green-500" : "bg-slate-400"}`}
                        />
                        {sub.status}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                          {new Date(sub.start_date).toLocaleDateString()} -{" "}
                          {new Date(sub.end_date).toLocaleDateString()}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          {getDurationDays(sub.plan_name)} Cycle
                        </p>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-sm font-black text-slate-900 dark:text-white">
                        ${sub.amount}
                      </p>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button className="inline-flex items-center justify-center h-10 w-10 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-900 hover:bg-slate-50 dark:hover:text-white dark:hover:bg-slate-800 transition">
                        <ArrowRight size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="px-8 py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs"
                  >
                    No billing history found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions / Tips */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-8 rounded-[2.5rem] bg-orange-50 border border-orange-100 dark:bg-orange-500/5 dark:border-orange-500/10 space-y-4">
          <div className="h-12 w-12 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/20">
            <CheckCircle2 size={24} />
          </div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white">Need to upgrade?</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
            Upgrade your plan anytime to add more machines or unlock premium modules like Advanced
            Fleet AI and Custom Reports.
          </p>
          <button className="text-xs font-black uppercase tracking-widest text-orange-600 hover:text-orange-700 transition">
            Explore Plans →
          </button>
        </div>

        <div className="p-8 rounded-[2.5rem] bg-blue-50 border border-blue-100 dark:bg-blue-500/5 dark:border-blue-100/10 space-y-4">
          <div className="h-12 w-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/20">
            <Calendar size={24} />
          </div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white">Auto-Renewal Notice</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
            Your next billing date is June 1, 2024. Your saved payment method will be charged
            automatically to ensure uninterrupted service.
          </p>
          <button className="text-xs font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 transition">
            Update Method →
          </button>
        </div>
      </div>
    </div>
  );
}
