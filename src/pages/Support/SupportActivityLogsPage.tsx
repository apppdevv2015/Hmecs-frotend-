import React from "react";
import {
  Activity,
  BadgeCheck,
  FileClock,
  FileText,
  UserCheck,
  AlertTriangle,
} from "lucide-react";

export default function SupportActivityLogsPage() {
  const activityLogs = [
    {
      id: "1",
      action: "Ticket Assigned",
      details: "Technical Support self-assigned ticket TICK-1001 (C32 Engine High Oil Temp Alert)",
      user: "support@hme.com",
      time: "10 minutes ago",
      icon: UserCheck,
      color: "text-purple-500 bg-purple-50 dark:bg-purple-950/30",
    },
    {
      id: "2",
      action: "Customer Replied",
      details: "John Operator posted a message on TICK-1001",
      user: "operator@hme.com",
      time: "25 minutes ago",
      icon: FileText,
      color: "text-blue-500 bg-blue-50 dark:bg-blue-950/30",
    },
    {
      id: "3",
      action: "Status Updated",
      details: "Thabo Engineer updated status of TICK-1003 to Waiting for Customer",
      user: "engineer@gmail.com",
      time: "1 hour ago",
      icon: Activity,
      color: "text-amber-500 bg-amber-50 dark:bg-amber-950/30",
    },
    {
      id: "4",
      action: "Ticket Resolved",
      details: "Ticket TICK-1004 marked as Closed after transmission fluid flush completion",
      user: "support@gmail.com",
      time: "2 hours ago",
      icon: BadgeCheck,
      color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30",
    },
    {
      id: "5",
      action: "Ticket Created",
      details: "Admin created new ticket TICK-1002 (Tyre Pressure Sensor Telemetry Delay)",
      user: "admin@hme.com",
      time: "3 hours ago",
      icon: AlertTriangle,
      color: "text-rose-500 bg-rose-50 dark:bg-rose-950/30",
    },
  ];

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 dark:bg-[#070d17] dark:text-slate-100">
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#0b1728] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
              Audit Trail
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">
            Support Activity Logs
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Real-time audit log stream of ticket assignments, status transitions, and customer replies.
          </p>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
        <div className="space-y-4">
          {activityLogs.map((log) => (
            <div
              key={log.id}
              className="flex items-start gap-4 rounded-2xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/40"
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${log.color}`}>
                <log.icon size={20} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {log.action}
                  </span>
                  <span className="text-xs text-slate-400">{log.time}</span>
                </div>
                <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                  {log.details}
                </p>
                <span className="mt-1 block text-xs text-slate-400 font-mono">
                  Triggered by: {log.user}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
