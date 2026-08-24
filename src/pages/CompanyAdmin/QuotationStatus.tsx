import React from "react";
import {
  Building2,
  User,
  Boxes,
  Hash,
  CalendarClock,
  Flag,
  Activity,
  CheckCircle2,
  Circle,
  Clock,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/* MOCK DATA — replace with real API data for this quotation                  */
/* -------------------------------------------------------------------------- */

const requestInfo = {
  requestId: "QR-2025-000124",
  company: "Orion Mining Pvt. Ltd.",
  requestedBy: "Rakesh Verma",
  machineCount: 4,
  totalQuantity: 12,
  requestedDate: "21 Aug 2026",
  requestedTime: "10:30 AM",
  priority: "High",
  currentStatus: "Under Review",
};

type MachineStatus =
  | "Pending"
  | "Viewed"
  | "Under Review"
  | "Rejected"
  | "Quotation Prepared"
  | "Quotation Sent";

interface MachineRow {
  id: number;
  name: string;
  assetId: string;
  quantity: number;
  requestedOn: string;
  viewedOn: string | null;
  status: MachineStatus;
}

const machines: MachineRow[] = [
  {
    id: 1,
    name: "Hydraulic Excavator EX-220",
    assetId: "AST-1042",
    quantity: 3,
    requestedOn: "21 Aug 2026",
    viewedOn: "21 Aug 2026",
    status: "Under Review",
  },
  {
    id: 2,
    name: "Dump Truck DT-750",
    assetId: "AST-1088",
    quantity: 4,
    requestedOn: "21 Aug 2026",
    viewedOn: "21 Aug 2026",
    status: "Under Review",
  },
  {
    id: 3,
    name: "Wheel Loader WL-540",
    assetId: "AST-1103",
    quantity: 2,
    requestedOn: "21 Aug 2026",
    viewedOn: null,
    status: "Pending",
  },
  {
    id: 4,
    name: "Motor Grader MG-320",
    assetId: "AST-1129",
    quantity: 3,
    requestedOn: "21 Aug 2026",
    viewedOn: null,
    status: "Pending",
  },
];

interface ProgressStep {
  id: number;
  label: string;
  timestamp: string | null;
}

const progressSteps: ProgressStep[] = [
  { id: 1, label: "Request Submitted", timestamp: "21 Aug 2026, 10:30 AM" },
  { id: 2, label: "Request Viewed", timestamp: "21 Aug 2026, 11:15 AM" },
  { id: 3, label: "Under Review", timestamp: "21 Aug 2026, 11:20 AM" },
  { id: 4, label: "Quotation Prepared", timestamp: null },
  { id: 5, label: "Quotation Sent", timestamp: null },
  { id: 6, label: "Decision", timestamp: null },
];

// Index (0-based) of the current active step
const currentStepIndex = 2;

interface TimelineEntry {
  id: number;
  date: string;
  time: string;
  user: string;
  role: string;
  action: string;
  note?: string;
}

const activityTimeline: TimelineEntry[] = [
  {
    id: 1,
    date: "21 Aug 2026",
    time: "10:30 AM",
    user: "Rakesh Verma",
    role: "Company Admin",
    action: "Submitted a new quotation request",
  },
  {
    id: 2,
    date: "21 Aug 2026",
    time: "11:15 AM",
    user: "Ananya Sharma",
    role: "Super Admin",
    action: "Viewed the quotation request",
  },
  {
    id: 3,
    date: "21 Aug 2026",
    time: "11:20 AM",
    user: "Ananya Sharma",
    role: "Super Admin",
    action: "Started reviewing the request",
    note: "Checking machine availability across sites.",
  },
];

/* -------------------------------------------------------------------------- */
/* STYLE HELPERS                                                              */
/* -------------------------------------------------------------------------- */

const statusStyles: Record<string, string> = {
  Pending: "bg-gray-100 text-gray-600",
  Viewed: "bg-blue-50 text-blue-700",
  "Under Review": "bg-amber-50 text-amber-700",
  Rejected: "bg-red-50 text-red-700",
  "Quotation Prepared": "bg-indigo-50 text-indigo-700",
  "Quotation Sent": "bg-emerald-50 text-emerald-700",
};

const priorityStyles: Record<string, string> = {
  Low: "bg-gray-100 text-gray-600",
  Medium: "bg-blue-50 text-blue-700",
  High: "bg-red-50 text-red-700",
};

/* -------------------------------------------------------------------------- */
/* SMALL PRESENTATIONAL PIECES                                                */
/* -------------------------------------------------------------------------- */

const InfoItem: React.FC<{
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}> = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3">
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
      <Icon size={16} strokeWidth={2} />
    </div>
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
        {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-semibold text-gray-900">
        {value}
      </p>
    </div>
  </div>
);

const StatusBadge: React.FC<{ status: string }> = ({ status }) => (
  <span
    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
      statusStyles[status] ?? "bg-gray-100 text-gray-600"
    }`}
  >
    {status}
  </span>
);

/* -------------------------------------------------------------------------- */
/* MAIN COMPONENT                                                             */
/* -------------------------------------------------------------------------- */

const QuotationStatus: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* A. REQUEST INFORMATION */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            Request Information
          </h2>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
              priorityStyles[requestInfo.priority]
            }`}
          >
            <Flag size={12} className="mr-1" />
            {requestInfo.priority} Priority
          </span>
        </div>

        <div className="grid grid-cols-1 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
          <InfoItem icon={Hash} label="Request ID" value={requestInfo.requestId} />
          <InfoItem icon={Building2} label="Company" value={requestInfo.company} />
          <InfoItem icon={User} label="Requested By" value={requestInfo.requestedBy} />
          <InfoItem
            icon={Boxes}
            label="No. of Machines"
            value={requestInfo.machineCount}
          />
          <InfoItem
            icon={Boxes}
            label="Total Requested Qty"
            value={requestInfo.totalQuantity}
          />
          <InfoItem
            icon={CalendarClock}
            label="Requested Date"
            value={requestInfo.requestedDate}
          />
          <InfoItem
            icon={CalendarClock}
            label="Requested Time"
            value={requestInfo.requestedTime}
          />
          <InfoItem
            icon={Activity}
            label="Current Status"
            value={<StatusBadge status={requestInfo.currentStatus} />}
          />
        </div>
      </section>

      {/* B. MACHINE INFORMATION */}
      <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">
            Machine Information
          </h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Machines / equipment included in this quotation request.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60 text-xs uppercase tracking-wide text-gray-400">
                <th className="px-6 py-3 font-medium">#</th>
                <th className="px-6 py-3 font-medium">Machine / Equipment</th>
                <th className="px-6 py-3 font-medium">Asset ID</th>
                <th className="px-6 py-3 font-medium">Qty</th>
                <th className="px-6 py-3 font-medium">Requested On</th>
                <th className="px-6 py-3 font-medium">Viewed On</th>
                <th className="px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {machines.map((m, idx) => (
                <tr key={m.id} className="transition-colors hover:bg-blue-50/40">
                  <td className="px-6 py-4 text-gray-500">{idx + 1}</td>
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {m.name}
                  </td>
                  <td className="px-6 py-4 text-gray-500">{m.assetId}</td>
                  <td className="px-6 py-4 text-gray-700">{m.quantity}</td>
                  <td className="px-6 py-4 text-gray-500">{m.requestedOn}</td>
                  <td className="px-6 py-4 text-gray-500">
                    {m.viewedOn ?? (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={m.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* C. STATUS PROGRESS */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-base font-semibold text-gray-900">
          Status Progress
        </h2>

        <div className="relative">
          {/* connecting line */}
          <div className="absolute left-4 top-4 h-[calc(100%-2rem)] w-0.5 bg-gray-100 sm:left-0 sm:right-0 sm:top-4 sm:h-0.5 sm:w-full" />

          <div className="relative flex flex-col gap-8 sm:flex-row sm:justify-between sm:gap-4">
            {progressSteps.map((step, idx) => {
              const isDone = idx < currentStepIndex;
              const isActive = idx === currentStepIndex;

              return (
                <div
                  key={step.id}
                  className="relative flex flex-1 items-start gap-3 sm:flex-col sm:items-center sm:gap-2 sm:text-center"
                >
                  <div
                    className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 bg-white ${
                      isDone
                        ? "border-blue-600 text-blue-600"
                        : isActive
                        ? "border-blue-600 text-blue-600 ring-4 ring-blue-100"
                        : "border-gray-200 text-gray-300"
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle2 size={18} />
                    ) : isActive ? (
                      <Clock size={16} />
                    ) : (
                      <Circle size={14} />
                    )}
                  </div>

                  <div className="sm:max-w-[110px]">
                    <p
                      className={`text-sm font-medium ${
                        isDone || isActive ? "text-gray-900" : "text-gray-400"
                      }`}
                    >
                      {step.label}
                    </p>
                    <p
                      className={`mt-0.5 text-xs ${
                        step.timestamp ? "text-gray-500" : "text-gray-300"
                      }`}
                    >
                      {step.timestamp ?? "Pending"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* D. ACTIVITY TIMELINE */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-base font-semibold text-gray-900">
          Activity Timeline
        </h2>

        <ol className="space-y-6">
          {activityTimeline.map((entry, idx) => (
            <li key={entry.id} className="relative flex gap-4">
              <div className="flex flex-col items-center">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <Activity size={14} />
                </span>
                {idx !== activityTimeline.length - 1 && (
                  <span className="mt-1 w-px flex-1 bg-gray-100" />
                )}
              </div>

              <div className="flex-1 pb-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-gray-900">
                    {entry.action}
                  </p>
                  <span className="text-xs text-gray-400">
                    {entry.date} · {entry.time}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-gray-500">
                  {entry.user} ·{" "}
                  <span className="text-gray-400">{entry.role}</span>
                </p>
                {entry.note && (
                  <p className="mt-1.5 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
                    {entry.note}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
};

export default QuotationStatus;