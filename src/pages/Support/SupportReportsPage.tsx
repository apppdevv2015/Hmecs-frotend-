import React from "react";
import {
  Activity,
  Award,
  Building2,
  CheckCircle2,
  Clock,
  FileBarChart,
  FileText,
  PieChart,
  ShieldCheck,
  TrendingUp,
  Zap,
} from "lucide-react";

export default function SupportReportsPage() {
  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 dark:bg-[#070d17] dark:text-slate-100">
      {/* Top Header */}
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#0b1728] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
              Support Analytics & Performance
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">
            Support Reports & Metrics
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Comprehensive reports on resolution times, company breakdown, and SLA compliance.
          </p>
        </div>
      </div>

      {/* SLA & Performance Overview Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">First Response SLA</span>
            <Clock size={18} className="text-blue-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">14.2 mins</p>
          <span className="mt-1 text-[11px] font-bold text-emerald-600">✓ 98.6% Target Met</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Avg Resolution Time</span>
            <Zap size={18} className="text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">2.4 hours</p>
          <span className="mt-1 text-[11px] font-bold text-emerald-600">✓ Within 4h SLA</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">CSAT Score</span>
            <Award size={18} className="text-purple-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">4.9 / 5.0</p>
          <span className="mt-1 text-[11px] font-bold text-purple-600">Based on 140 ratings</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Reopen Rate</span>
            <TrendingUp size={18} className="text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">1.8%</p>
          <span className="mt-1 text-[11px] font-bold text-emerald-600">Well below 5% limit</span>
        </div>
      </div>

      {/* Reports Visual Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Company Wise Ticket Distribution */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
          <h3 className="text-base font-black text-slate-900 dark:text-white border-b pb-3 dark:border-slate-800">
            Company-Wise Ticket Breakdown
          </h3>

          <div className="mt-4 space-y-4">
            {[
              { name: "HME Systems", count: 48, resolved: 44, percent: 91.6 },
              { name: "HME Global", count: 32, resolved: 30, percent: 93.7 },
              { name: "Kalahari Mining Co.", count: 24, resolved: 22, percent: 91.6 },
              { name: "Southern Equipment Ltd", count: 18, resolved: 17, percent: 94.4 },
            ].map((comp) => (
              <div key={comp.name} className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                    <Building2 size={14} className="text-blue-500" />
                    {comp.name}
                  </span>
                  <span>{comp.resolved} / {comp.count} resolved ({comp.percent}%)</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                  <div style={{ width: `${comp.percent}%` }} className="h-2 rounded-full bg-blue-600" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Agent Performance Leaderboard */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
          <h3 className="text-base font-black text-slate-900 dark:text-white border-b pb-3 dark:border-slate-800">
            Technical Support Agent Performance
          </h3>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs font-medium">
              <thead className="border-b text-slate-400 dark:border-slate-800">
                <tr>
                  <th className="pb-3">Agent</th>
                  <th className="pb-3">Resolved</th>
                  <th className="pb-3">Avg Time</th>
                  <th className="pb-3 text-right">CSAT</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-800">
                {[
                  { name: "Technical Support", resolved: 42, avgTime: "1.8h", csat: "4.95" },
                  { name: "Daniel Mokoena", resolved: 38, avgTime: "2.1h", csat: "4.88" },
                  { name: "Thabo Ndlovu", resolved: 29, avgTime: "2.6h", csat: "4.82" },
                ].map((agent) => (
                  <tr key={agent.name} className="hover:bg-slate-50 dark:hover:bg-slate-900">
                    <td className="py-3 font-bold text-slate-900 dark:text-white">{agent.name}</td>
                    <td className="py-3 text-slate-600 dark:text-slate-300">{agent.resolved}</td>
                    <td className="py-3 text-slate-600 dark:text-slate-300">{agent.avgTime}</td>
                    <td className="py-3 text-right font-bold text-emerald-600">⭐ {agent.csat}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
