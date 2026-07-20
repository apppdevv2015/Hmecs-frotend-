import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { billingService } from "../../../services/SuperAdmin/billingService";
import {
  Download,
  FileText,
  Users,
  CheckCircle,
  Clock,
  XCircle,
  Filter,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Calendar,
  Building2,
  AlertCircle,
  RefreshCw,
  RotateCcw,
  MoreVertical,
  Wallet,
  Receipt,
  ShieldCheck,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import toast from "react-hot-toast";

// ─── Types ───────────────────────────────────────────────────────────────────

type InvoiceStatus = "paid" | "pending" | "failed" | "overdue";
type SubscriptionStatus = "active" | "pending" | "expired" | "cancelled";
type BillingCycle = "Monthly" | "Yearly";

type BillingHistory = {
  id: string;
  invoiceNo: string;
  companyId: string;
  companyName: string;
  companyEmail: string;
  planName: string;
  billingCycle: BillingCycle;
  planLimit: string;
  userLimit: string;
  subscriptionStart: string;
  subscriptionEnd: string;
  amount: number;
  currency: string;
  tax: number;
  paidToDate: number;
  paymentMethod: string;
  transactionId: string;
  paymentDate: string;
  status: InvoiceStatus;
  invoiceDate: string;
  dueDate: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatCurrency = (amount: number, currency = "ZAR") =>
  new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);

const formatDate = (date: string) => {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getInvoiceTotal = (inv: BillingHistory) => inv.amount + inv.tax;
const getInvoiceDue = (inv: BillingHistory) =>
  Math.max(getInvoiceTotal(inv) - inv.paidToDate, 0);

// Derives a subscription-level status from the invoice/payment data —
// distinct from invoice status since "expired" depends on the
// subscription end date rather than payment state alone.
const getSubscriptionStatus = (inv: BillingHistory): SubscriptionStatus => {
  const now = new Date();
  const end = inv.subscriptionEnd ? new Date(inv.subscriptionEnd) : null;

  if (inv.status === "failed") return "cancelled";
  if (end && end.getTime() < now.getTime()) return "expired";
  if (inv.status === "pending") return "pending";
  return "active";
};

const STATUS_CONFIG: Record<
  InvoiceStatus,
  {
    label: string;
    cls: string;
    icon: React.ReactNode;
  }
> = {
  paid: {
    label: "Paid",
    cls: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    icon: <CheckCircle size={13} />,
  },
  pending: {
    label: "Pending",
    cls: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    icon: <Clock size={13} />,
  },
  failed: {
    label: "Failed",
    cls: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
    icon: <XCircle size={13} />,
  },
  overdue: {
    label: "Overdue",
    cls: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
    icon: <AlertCircle size={13} />,
  },
};

const StatusBadge = ({ status }: { status: InvoiceStatus }) => {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${cfg.cls}`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
};

// ─── Data mapping ───────────────────────────────────────────────────────────
// BACKEND TODO: the current /subscriptions endpoint doesn't return company
// contact details, payment method, or transaction id. Once the API includes
// `item.company` / `item.payment` objects, replace the fallbacks below with
// the real fields — the rest of the page already reads from BillingHistory
// so no UI changes will be needed.

const mapApiInvoice = (item: any): BillingHistory => ({
  id: item.id,
  invoiceNo: `INV-${String(item.id).slice(0, 8).toUpperCase()}`,
  companyId: item.company?.id || item.companyId || item.userId || "unknown",
  companyName: item.company?.name || item.user?.companyName || "N/A",
  companyEmail: item.company?.email || item.user?.email || "",
  planName: item.plan?.planName || "N/A",
  billingCycle: (item.plan?.billingCycle as BillingCycle) || "Monthly",
  planLimit: String(item.plan?.machineLimit || 0),
  userLimit: String(item.plan?.staffLimit || 0),
  subscriptionStart: item.subscriptionStartDate || "",
  subscriptionEnd: item.subscriptionEndDate || "",
  amount: Number(item.plan?.price || 0),
  currency: item.currency || "ZAR",
  tax: Number(item.tax || 0),
  paidToDate: item.paymentStatus === "PAID" ? Number(item.plan?.price || 0) : 0,
  paymentMethod: item.paymentMethod || "—",
  transactionId: item.transactionId || "—",
  paymentDate: item.paymentStatus === "PAID" ? item.updatedAt || "" : "",
  status:
    item.paymentStatus === "PAID"
      ? "paid"
      : item.paymentStatus === "PENDING"
        ? "pending"
        : "failed",
  invoiceDate: item.createdAt || "",
  dueDate: item.subscriptionEndDate || "",
});

// ─── PDF download ───────────────────────────────────────────────────────────

function downloadInvoicePDF(inv: BillingHistory) {
  const doc = new jsPDF();

  doc.setTextColor(240, 244, 255);
  doc.setFontSize(60);
  doc.text("HMEC", 45, 160, { angle: 30 });

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("HME Component Intelligence System", 14, 20);

  doc.setFontSize(13);
  doc.text(`Invoice ${inv.invoiceNo}`, 14, 34);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Company: ${inv.companyName}`, 14, 41);
  doc.text(`Invoice Date: ${formatDate(inv.invoiceDate)}`, 14, 47);
  doc.text(`Due Date: ${formatDate(inv.dueDate)}`, 14, 53);
  doc.text(`Status: ${inv.status.toUpperCase()}`, 14, 59);

  autoTable(doc, {
    startY: 68,
    head: [["Description", "Amount"]],
    body: [
      [
        `${inv.planName} (${inv.billingCycle})`,
        formatCurrency(inv.amount, inv.currency),
      ],
      ["Tax", formatCurrency(inv.tax, inv.currency)],
    ],
    foot: [["Total", formatCurrency(getInvoiceTotal(inv), inv.currency)]],
    theme: "grid",
    headStyles: { fillColor: [37, 99, 235] },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: "bold",
    },
  });

  doc.save(`${inv.invoiceNo}.pdf`);
}

// ─── Summary Cards (6, matches the reference layout) ────────────────────────

function SummaryCard({
  icon,
  iconBg,
  iconColor,
  label,
  value,
  linkText,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  linkText: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg} ${iconColor}`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-0.5 text-xl font-bold text-slate-900">{value}</p>
          <p className="mt-0.5 truncate text-[11px] font-medium text-blue-600">
            {linkText}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Plan Summary table ─────────────────────────────────────────────────────

type PlanSummaryRow = {
  planName: string;
  price: number;
  currency: string;
  duration: BillingCycle;
  totalPurchases: number;
  activeUsers: number;
  revenue: number;
  status: "Active" | "Inactive";
};

const buildPlanSummary = (invoices: BillingHistory[]): PlanSummaryRow[] => {
  const byPlan = new Map<string, BillingHistory[]>();
  invoices.forEach((inv) => {
    const list = byPlan.get(inv.planName) || [];
    list.push(inv);
    byPlan.set(inv.planName, list);
  });

  return Array.from(byPlan.entries())
    .map(([planName, list]) => {
      const activeCount = list.filter(
        (i) => getSubscriptionStatus(i) === "active",
      ).length;
      return {
        planName,
        price: list[0].amount,
        currency: list[0].currency,
        duration: list[0].billingCycle,
        totalPurchases: list.length,
        activeUsers: activeCount,
        revenue: list.reduce((s, i) => s + i.paidToDate, 0),
        status: (activeCount > 0 ? "Active" : "Inactive") as
          | "Active"
          | "Inactive",
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
};

const PLAN_DOT_COLORS = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-violet-500",
  "bg-cyan-500",
];

function PlanSummaryTable({
  rows,
  onManagePlans,
}: {
  rows: PlanSummaryRow[];
  onManagePlans: () => void;
}) {

  
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 p-5">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Plan Summary</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Overview of all plans and subscription sales.
          </p>
        </div>
        <button
          onClick={onManagePlans}
          className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          Manage Plans
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left">
          <thead>
            <tr className="bg-slate-50">
              {[
                "Plan Name",
                "Price",
                "Duration",
                "Total Purchases",
                "Active Users",
                "Revenue",
                "Status",
              ].map((h) => (
                <th
                  key={h}
                  className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, idx) => (
              <tr key={row.planName} className="hover:bg-slate-50/60">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${PLAN_DOT_COLORS[idx % PLAN_DOT_COLORS.length]}`}
                    />
                    <span className="text-sm font-semibold text-slate-800">
                      {row.planName}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {formatCurrency(row.price, row.currency)}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {row.duration}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {row.totalPurchases}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {row.activeUsers}
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-slate-800">
                  {formatCurrency(row.revenue, row.currency)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                      row.status === "Active"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-sm text-slate-400"
                >
                  No plan data available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Subscription Status Overview ───────────────────────────────────────────

function SubscriptionStatusOverview({
  invoices,
  onViewAll,
}: {
  invoices: BillingHistory[];
  onViewAll: () => void;
}) {
  const counts = {
    active: invoices.filter((i) => getSubscriptionStatus(i) === "active")
      .length,
    pending: invoices.filter((i) => getSubscriptionStatus(i) === "pending")
      .length,
    expired: invoices.filter((i) => getSubscriptionStatus(i) === "expired")
      .length,
    cancelled: invoices.filter((i) => getSubscriptionStatus(i) === "cancelled")
      .length,
  };
  const total = invoices.length || 1;

  const rows = [
    {
      key: "active",
      label: "Active Subscriptions",
      color: "bg-emerald-500",
      icon: <ShieldCheck size={13} className="text-emerald-500" />,
    },
    {
      key: "pending",
      label: "Pending Subscriptions",
      color: "bg-amber-400",
      icon: <Clock size={13} className="text-amber-500" />,
    },
    {
      key: "expired",
      label: "Expired Subscriptions",
      color: "bg-rose-500",
      icon: <AlertCircle size={13} className="text-rose-500" />,
    },
    {
      key: "cancelled",
      label: "Cancelled Subscriptions",
      color: "bg-slate-400",
      icon: <XCircle size={13} className="text-slate-400" />,
    },
  ] as const;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 p-5">
        <h3 className="text-sm font-semibold text-slate-900">
          Subscription Status Overview
        </h3>
        <button
          onClick={onViewAll}
          className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          View All Subscriptions
        </button>
      </div>
      <div className="space-y-5 p-5">
        {rows.map((row) => {
          const count = counts[row.key];
          const pct = Math.round((count / total) * 100);
          return (
            <div key={row.key}>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-medium text-slate-700">
                  {row.icon}
                  {row.label}
                </span>
                <span className="font-semibold text-slate-800">
                  {count} <span className="text-slate-400">({pct}%)</span>
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-1.5 rounded-full ${row.color}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Recent Subscriptions table ─────────────────────────────────────────────

function RecentSubscriptions({
  invoices,
  onView,
  onViewAll,
}: {
  invoices: BillingHistory[];
  onView: (inv: BillingHistory) => void;
  onViewAll: () => void;
}) {
  const recent = [...invoices]
    .sort(
      (a, b) =>
        new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime(),
    )
    .slice(0, 5);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 p-5">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Recent Subscriptions
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Latest {recent.length} subscription purchases.
          </p>
        </div>
        <button
          onClick={onViewAll}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700"
        >
          View All
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left">
          <thead>
            <tr className="bg-slate-50">
              {[
                "Company",
                "Plan",
                "Amount",
                "Start Date",
                "Next Renewal",
                "Status",
                "Action",
              ].map((h) => (
                <th
                  key={h}
                  className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {recent.map((inv) => (
              <tr key={inv.id} className="hover:bg-slate-50/60">
                <td className="px-4 py-3 text-sm font-medium text-slate-800">
                  {inv.companyName}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {inv.planName}
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-slate-800">
                  {formatCurrency(inv.amount, inv.currency)}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {formatDate(inv.subscriptionStart)}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {formatDate(inv.subscriptionEnd)}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={inv.status} />
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => onView(inv)}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50"
                  >
                    <Eye size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {recent.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-sm text-slate-400"
                >
                  No subscriptions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Recent Invoices table ───────────────────────────────────────────────────

function RecentInvoices({
  invoices,
  onView,
  onDownload,
  onViewAll,
}: {
  invoices: BillingHistory[];
  onView: (inv: BillingHistory) => void;
  onDownload: (inv: BillingHistory) => void;
  onViewAll: () => void;
}) {
  const recent = [...invoices]
    .sort(
      (a, b) =>
        new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime(),
    )
    .slice(0, 5);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 p-5">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Recent Invoices
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Latest {recent.length} invoices generated.
          </p>
        </div>
        <button
          onClick={onViewAll}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700"
        >
          View All Invoices
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left">
          <thead>
            <tr className="bg-slate-50">
              {[
                "Invoice #",
                "Company",
                "Plan",
                "Amount",
                "Status",
                "Issue Date",
                "Action",
              ].map((h) => (
                <th
                  key={h}
                  className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {recent.map((inv) => (
              <tr key={inv.id} className="hover:bg-slate-50/60">
                <td className="px-4 py-3 text-sm font-semibold text-blue-700">
                  {inv.invoiceNo}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {inv.companyName}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {inv.planName}
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-slate-800">
                  {formatCurrency(getInvoiceTotal(inv), inv.currency)}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={inv.status} />
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {formatDate(inv.invoiceDate)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onView(inv)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50"
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      onClick={() => onDownload(inv)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50"
                    >
                      <Download size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {recent.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-sm text-slate-400"
                >
                  No invoices found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── All Invoices table (with filters + pagination) ─────────────────────────

const PAGE_SIZE = 10;

function AllInvoicesTable({
  invoices,
  onView,
  onDownload,
}: {
  invoices: BillingHistory[];
  onView: (inv: BillingHistory) => void;
  onDownload: (inv: BillingHistory) => void;
}) {
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(invoices.length / PAGE_SIZE));
  const pageRows = invoices.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [invoices.length]);

  const toggleSelectAll = () => {
    if (selected.size === pageRows.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pageRows.map((r) => r.id)));
    }
  };

  const toggleSelectRow = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 p-5">
        <h3 className="text-sm font-semibold text-slate-900">
          All Invoices{" "}
          <span className="text-slate-400">({invoices.length})</span>
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left">
          <thead>
            <tr className="bg-slate-50">
              <th className="w-10 px-4 py-2.5">
                <input
                  type="checkbox"
                  checked={
                    pageRows.length > 0 && selected.size === pageRows.length
                  }
                  onChange={toggleSelectAll}
                  className="h-3.5 w-3.5 rounded border-slate-300"
                />
              </th>
              {[
                "Invoice #",
                "Company",
                "Plan",
                "Billing Cycle",
                "Amount",
                "Status",
                "Payment Method",
                "Paid Date",
                "Issue Date",
                "Due Date",
                "Action",
              ].map((h) => (
                <th
                  key={h}
                  className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pageRows.map((inv) => (
              <tr key={inv.id} className="hover:bg-slate-50/60">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(inv.id)}
                    onChange={() => toggleSelectRow(inv.id)}
                    className="h-3.5 w-3.5 rounded border-slate-300"
                  />
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-blue-700">
                  {inv.invoiceNo}
                </td>
                <td className="px-4 py-3 text-sm text-slate-700">
                  {inv.companyName}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {inv.planName}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {inv.billingCycle}
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-slate-800">
                  {formatCurrency(getInvoiceTotal(inv), inv.currency)}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={inv.status} />
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {inv.paymentMethod}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {formatDate(inv.paymentDate)}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {formatDate(inv.invoiceDate)}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {formatDate(inv.dueDate)}
                </td>
                <td className="relative px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onView(inv)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50"
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      onClick={() => onDownload(inv)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50"
                    >
                      <Download size={14} />
                    </button>
                    <button
                      onClick={() =>
                        setOpenMenuId(openMenuId === inv.id ? null : inv.id)
                      }
                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50"
                    >
                      <MoreVertical size={14} />
                    </button>
                    {openMenuId === inv.id && (
                      <div
                        className="absolute right-4 top-9 z-10 w-40 rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg"
                        onMouseLeave={() => setOpenMenuId(null)}
                      >
                        <button
                          onClick={() => {
                            onView(inv);
                            setOpenMenuId(null);
                          }}
                          className="block w-full px-3.5 py-2 text-left text-xs font-medium text-slate-600 hover:bg-slate-50"
                        >
                          View details
                        </button>
                        <button
                          onClick={() => {
                            onDownload(inv);
                            setOpenMenuId(null);
                          }}
                          className="block w-full px-3.5 py-2 text-left text-xs font-medium text-slate-600 hover:bg-slate-50"
                        >
                          Download PDF
                        </button>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(inv.invoiceNo);
                            toast.success("Invoice number copied");
                            setOpenMenuId(null);
                          }}
                          className="block w-full px-3.5 py-2 text-left text-xs font-medium text-slate-600 hover:bg-slate-50"
                        >
                          Copy invoice #
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr>
                <td
                  colSpan={12}
                  className="px-4 py-14 text-center text-sm text-slate-400"
                >
                  No invoices found matching your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {invoices.length > 0 && (
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
          <p className="text-xs font-medium text-slate-500">
            Showing {(page - 1) * PAGE_SIZE + 1} to{" "}
            {Math.min(page * PAGE_SIZE, invoices.length)} of {invoices.length}{" "}
            invoices
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`inline-flex h-7 w-7 items-center justify-center rounded-lg text-xs font-semibold transition ${
                    page === pageNum
                      ? "bg-blue-600 text-white"
                      : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            {totalPages > 5 && <span className="px-1 text-slate-400">...</span>}
            {totalPages > 5 && (
              <button
                onClick={() => setPage(totalPages)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                {totalPages}
              </button>
            )}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Filter bar ──────────────────────────────────────────────────────────────

function FilterBar({
  companies,
  plans,
  fromDate,
  toDate,
  setFromDate,
  setToDate,
  planFilter,
  setPlanFilter,
  companyFilter,
  setCompanyFilter,
  statusFilter,
  setStatusFilter,
  methodFilter,
  setMethodFilter,
  searchQuery,
  setSearchQuery,
  onReset,
}: {
  companies: string[];
  plans: string[];
  fromDate: string;
  toDate: string;
  setFromDate: (v: string) => void;
  setToDate: (v: string) => void;
  planFilter: string;
  setPlanFilter: (v: string) => void;
  companyFilter: string;
  setCompanyFilter: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  methodFilter: string;
  setMethodFilter: (v: string) => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  onReset: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <Calendar size={13} className="text-slate-400" />
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="border-none bg-transparent text-xs font-medium text-slate-700 focus:outline-none"
          />
          <span className="text-xs text-slate-300">—</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="border-none bg-transparent text-xs font-medium text-slate-700 focus:outline-none"
          />
        </div>

        <div className="relative">
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="appearance-none rounded-xl border border-slate-200 bg-slate-50 py-2 pl-3 pr-7 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-none"
          >
            <option value="all">All Plans</option>
            {plans.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <ChevronDown
            size={12}
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
        </div>

        <div className="relative">
          <select
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            className="appearance-none rounded-xl border border-slate-200 bg-slate-50 py-2 pl-3 pr-7 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-none"
          >
            <option value="all">All Companies</option>
            {companies.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <ChevronDown
            size={12}
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
        </div>

        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none rounded-xl border border-slate-200 bg-slate-50 py-2 pl-3 pr-7 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-none"
          >
            <option value="all">All Status</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="overdue">Overdue</option>
            <option value="failed">Failed</option>
          </select>
          <ChevronDown
            size={12}
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
        </div>

        <div className="relative">
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="appearance-none rounded-xl border border-slate-200 bg-slate-50 py-2 pl-3 pr-7 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-none"
          >
            <option value="all">All Payment Methods</option>
            <option value="PayFast">PayFast</option>
            <option value="EFT Bank Transfer">Bank Transfer</option>
            <option value="Credit Card">Credit Card</option>
          </select>
          <ChevronDown
            size={12}
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
        </div>

        <div className="relative min-w-[200px] flex-1">
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Search by company, invoice, plan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-xs font-medium text-slate-700 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <button className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50">
          <Filter size={13} />
          Filter
        </button>
        <button
          onClick={onReset}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          <RotateCcw size={13} />
          Reset
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const PlanAndBilling = () => {
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState<BillingHistory[]>([]);
  const [loading, setLoading] = useState(true);

  // BACKEND TODO: these two counts need dedicated endpoints
  // (e.g. companyService.getCompanyCount(), userService.getUserCount()).
  // Until then they're derived from the invoices already on the page.
  const [totalCompaniesOverride, setTotalCompaniesOverride] = useState<
    number | null
  >(null);
  const [totalUsersOverride, setTotalUsersOverride] = useState<number | null>(
    null,
  );

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const response: any = await billingService.getSubscriptions();
      const mapped: BillingHistory[] = (response?.data || []).map(
        mapApiInvoice,
      );
      setInvoices(mapped);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load billing data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const plans = useMemo(
    () =>
      Array.from(new Set(invoices.map((i) => i.planName))).filter(
        (p) => p !== "N/A",
      ),
    [invoices],
  );
  const companies = useMemo(
    () =>
      Array.from(new Set(invoices.map((i) => i.companyName))).filter(
        (c) => c !== "N/A",
      ),
    [invoices],
  );

  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      const q = searchQuery.toLowerCase();
      if (
        q &&
        !inv.invoiceNo.toLowerCase().includes(q) &&
        !inv.companyName.toLowerCase().includes(q) &&
        !inv.planName.toLowerCase().includes(q)
      )
        return false;
      if (statusFilter !== "all" && inv.status !== statusFilter) return false;
      if (planFilter !== "all" && inv.planName !== planFilter) return false;
      if (companyFilter !== "all" && inv.companyName !== companyFilter)
        return false;
      if (methodFilter !== "all" && inv.paymentMethod !== methodFilter)
        return false;
      if (
        fromDate &&
        inv.invoiceDate &&
        new Date(inv.invoiceDate) < new Date(fromDate)
      )
        return false;
      if (
        toDate &&
        inv.invoiceDate &&
        new Date(inv.invoiceDate) > new Date(toDate)
      )
        return false;
      return true;
    });
  }, [
    invoices,
    searchQuery,
    statusFilter,
    planFilter,
    companyFilter,
    methodFilter,
    fromDate,
    toDate,
  ]);

  const planSummaryRows = useMemo(() => buildPlanSummary(invoices), [invoices]);

  const totalRevenue = invoices
    .filter((i) => i.status === "paid")
    .reduce((s, i) => s + i.paidToDate, 0);
  const pendingPayments = invoices
    .filter((i) => i.status === "pending")
    .reduce((s, i) => s + getInvoiceDue(i), 0);
  const totalCompanies = totalCompaniesOverride ?? companies.length;
  const totalUsers =
    totalUsersOverride ??
    invoices.reduce((s, i) => s + Number(i.userLimit || 0), 0);

  const handleReset = () => {
    setFromDate("");
    setToDate("");
    setPlanFilter("all");
    setCompanyFilter("all");
    setStatusFilter("all");
    setMethodFilter("all");
    setSearchQuery("");
  };

  const handleView = (inv: BillingHistory) =>
    navigate(`/super-admin/invoice/${inv.id}`);
  const handleDownload = (inv: BillingHistory) => {
    downloadInvoicePDF(inv);
    toast.success(`${inv.invoiceNo} downloaded`);
  };

  const handleRefresh = async () => {
    await fetchSubscriptions();
    toast.success("Billing data refreshed");
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-5">
        {/* Page Header */}
        <div className="overflow-hidden rounded-2xl border border-blue-700/30 bg-gradient-to-r from-blue-800 via-blue-700 to-blue-800 px-6 py-6 shadow-lg">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.15em] text-white backdrop-blur-sm">
                Billing & Subscription Management
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white">
                Billing Dashboard
              </h1>
              <p className="mt-2 text-sm font-medium text-blue-100">
                Super Admin — manage invoices, subscriptions, billing activity,
                and payment tracking from one centralized dashboard.
              </p>
            </div>
            <button
              onClick={handleRefresh}
              className="flex h-12 items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 text-sm font-semibold text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/20"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw size={28} className="animate-spin text-blue-600" />
              <p className="text-sm font-semibold text-slate-500">
                Loading billing data…
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* 6 Summary Cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
              <SummaryCard
                icon={<Building2 size={18} />}
                iconBg="bg-blue-50"
                iconColor="text-blue-600"
                label="Total Companies"
                value={String(totalCompanies)}
                linkText="View all companies"
              />
              <SummaryCard
                icon={<Users size={18} />}
                iconBg="bg-violet-50"
                iconColor="text-violet-600"
                label="Total Users"
                value={String(totalUsers)}
                linkText="View all users"
              />
              <SummaryCard
                icon={<ShieldCheck size={18} />}
                iconBg="bg-emerald-50"
                iconColor="text-emerald-600"
                label="Total Subscriptions"
                value={String(invoices.length)}
                linkText="Active subscriptions"
              />
              <SummaryCard
                icon={<Receipt size={18} />}
                iconBg="bg-sky-50"
                iconColor="text-sky-600"
                label="Total Invoices"
                value={String(invoices.length)}
                linkText="All time invoices"
              />
              <SummaryCard
                icon={<Wallet size={18} />}
                iconBg="bg-teal-50"
                iconColor="text-teal-600"
                label="Total Revenue"
                value={formatCurrency(totalRevenue)}
                linkText="All time revenue"
              />
              <SummaryCard
                icon={<Clock size={18} />}
                iconBg="bg-amber-50"
                iconColor="text-amber-600"
                label="Pending Payments"
                value={formatCurrency(pendingPayments)}
                linkText={`${invoices.filter((i) => i.status === "pending").length} pending invoices`}
              />
            </div>

            {/* Filter bar */}
            <FilterBar
              companies={companies}
              plans={plans}
              fromDate={fromDate}
              toDate={toDate}
              setFromDate={setFromDate}
              setToDate={setToDate}
              planFilter={planFilter}
              setPlanFilter={setPlanFilter}
              companyFilter={companyFilter}
              setCompanyFilter={setCompanyFilter}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              methodFilter={methodFilter}
              setMethodFilter={setMethodFilter}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onReset={handleReset}
            />

            {/* Plan Summary + Subscription Status */}
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
              <div className="xl:col-span-3">
                <PlanSummaryTable
                  rows={planSummaryRows}
                  onManagePlans={() => navigate("/super-admin/plans")}
                />
              </div>
              <div className="xl:col-span-2">
                <SubscriptionStatusOverview
                  invoices={invoices}
                  onViewAll={() => toast("Opening subscriptions list...")}
                />
              </div>
            </div>

            {/* Recent Subscriptions + Recent Invoices */}
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              <RecentSubscriptions
                invoices={invoices}
                onView={handleView}
                onViewAll={() => toast("Opening all subscriptions...")}
              />
              <RecentInvoices
                invoices={invoices}
                onView={handleView}
                onDownload={handleDownload}
                onViewAll={() =>
                  document
                    .getElementById("all-invoices")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              />
            </div>

            {/* All Invoices */}
            <div id="all-invoices">
              <AllInvoicesTable
                invoices={filtered}
                onView={handleView}
                onDownload={handleDownload}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PlanAndBilling;
