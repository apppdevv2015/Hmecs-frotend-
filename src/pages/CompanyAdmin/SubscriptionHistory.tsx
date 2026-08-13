import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  Calendar,
  CheckCircle2,
  Check,
  Clock,
  CreditCard,
  Download,
  Printer,
  Gem,
  ShieldCheck,
  FileText,
  Eye,
  Loader2,
  RefreshCw,
  TrendingUp,
  Receipt,
  X,
  Cpu,
  Users,
  Sparkles,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { userService } from "../../services/Auth/userService";
import { superAdminMachineService } from "../../services/SuperAdmin/machineService";
import {
  getSubscriptionPlans,
  type SubscriptionPlanApi,
} from "../../services/SuperAdmin/subscriptionService";
import StorageService, { STORAGE_KEYS } from "../../services/storage.service";
import toast from "react-hot-toast";

// ---------------------------------------------------------------------------
// Types — shaped to mirror the real API response envelope so swapping the
// mock fetch functions below for actual `userService` calls is a 1:1 change.
// ---------------------------------------------------------------------------

type PlanSummary = {
  plan_name: string;
  tagline: string;
  status: "active" | "inactive" | "cancelled";
  price: number;
  currency: string;
  validity_days: number;
  machine_limit: number;
  staff_limit: number;
  valid_until: string;
  auto_renewal: boolean;
  next_billing_date: string;
  benefits: string[];
};

type InvoiceDetail = {
  id: string;
  invoice_number: string;
  status: "paid" | "pending" | "failed";
  invoice_date: string;
  payment_date: string;
  plan_name: string;
  currency: string;
  validity_days: number;
  plan_price: number;
  tax_percent: number;
  tax_amount: number;
  discount_amount: number;
  amount_paid: number;
};

type SubscriptionPeriod = {
  start_date: string;
  end_date: string;
  next_renewal: string;
  validity_days: number;
};

type PaymentInfo = {
  transaction_id: string;
  payment_method: "PayFast" | "Bank Transfer" | "UPI";
  reference_id?: string;
  invoice_number: string;
  status: "paid" | "pending" | "failed";
  paid_on: string;
};

type TimelineEvent = {
  id: string;
  label: string;
  timestamp: string;
};

type InvoiceHistoryItem = {
  id: string;
  invoice_number: string;
  plan_name: string;
  billing_period: string;
  amount: number;
  currency: string;
  status: "paid" | "pending" | "failed";
  invoice_date: string;
  payment_method: string;
  machine_limit: number;
  staff_limit: number;
  validity_days: number;
};

type InvoicePageData = {
  invoice: InvoiceDetail;
  planSummary: PlanSummary;
  period: SubscriptionPeriod;
  paymentInfo: PaymentInfo;
  timeline: TimelineEvent[];
  history: InvoiceHistoryItem[];
};

// ---------------------------------------------------------------------------
// Upgrade-plan modal types — kept flexible since the plans API returns
// inconsistent field naming (camelCase / snake_case), same as PricingPage.tsx
// ---------------------------------------------------------------------------

type FlexibleSubscriptionPlanApi = SubscriptionPlanApi & {
  id: string | number;
  name?: string;
  planName?: string;
  plan_name?: string;
  price: string | number;
  machineLimit?: number;
  machine_limit?: number;
  staffLimit?: number;
  staff_limit?: number;
  validityDays?: number;
  validity_days?: number;
  isPublic?: boolean;
  is_public?: boolean;
  isActive?: boolean;
  is_active?: boolean;
  description?: string;
  features?: Record<string, boolean> | string[] | null;
};

type UpgradePlanOption = {
  id: string | number;
  name: string;
  subtitle: string;
  priceLabel: string;
  periodLabel: string;
  machineLimit: number;
  staffLimit: number;
  validityDays: number;
  features: string[];
  popular: boolean;
  rawPlan: FlexibleSubscriptionPlanApi;
};

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string): string {
  if (!dateStr || dateStr === "-" || dateStr === "N/A" || String(dateStr).includes("Invalid")) return dateStr || "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatDateTime(dateStr: string): string {
  if (!dateStr || dateStr === "-" || dateStr === "N/A" || String(dateStr).includes("Invalid")) return dateStr || "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return dateStr;
  }
}

const formatCurrency = (amount: number, currency = "R") =>
  `${currency} ${amount.toFixed(2)}`;

const formatPlanPrice = (price: string | number) => {
  const cleanPrice = String(price ?? "0")
    .replace(/[^\d.]/g, "")
    .trim();
  const numericPrice = Number(cleanPrice);
  if (isNaN(numericPrice)) return "R 0";
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numericPrice);
};

const getPlanApiName = (plan: FlexibleSubscriptionPlanApi) =>
  (plan.planName || plan.plan_name || plan.name || "Untitled Plan").trim();

const getPlanMachineLimit = (plan: FlexibleSubscriptionPlanApi) =>
  Number(plan.machineLimit ?? plan.machine_limit ?? 0);

const getPlanStaffLimit = (plan: FlexibleSubscriptionPlanApi) =>
  Number(plan.staffLimit ?? plan.staff_limit ?? 0);

const getPlanValidityDays = (plan: FlexibleSubscriptionPlanApi) => {
  const name = getPlanApiName(plan).toLowerCase();
  const val = Number(plan.validityDays ?? plan.validity_days ?? 0);
  if (name.includes("premium")) {
    return val >= 365 ? val : 365;
  }
  return val > 0 ? val : 30;
};

const isDemoOrFreePlan = (planName: string) => {
  const name = planName.toLowerCase();
  return name.includes("demo") || name.includes("free");
};

const planFeaturesToArray = (
  features: Record<string, boolean> | string[] | null | undefined,
): string[] => {
  if (Array.isArray(features)) return features.filter(Boolean);
  if (features && typeof features === "object") {
    return Object.keys(features).filter((key) => features[key]);
  }
  return [];
};

const getPlanFallbackFeatures = (
  machineLimit: number,
  staffLimit: number,
  validityDays: number,
) => [
    `${machineLimit} machines included`,
    `${staffLimit} staff users included`,
    `${validityDays} days validity`,
    "Machine health monitoring",
    "Component intelligence access",
  ];

const mapApiPlanToUpgradeOption = (
  plan: FlexibleSubscriptionPlanApi,
  index: number,
): UpgradePlanOption => {
  const name = getPlanApiName(plan);
  const machineLimit = getPlanMachineLimit(plan);
  const staffLimit = getPlanStaffLimit(plan);
  const validityDays = getPlanValidityDays(plan);
  const apiFeatures = planFeaturesToArray(plan.features);

  return {
    id: plan.id,
    name,
    subtitle:
      plan.description ||
      `${machineLimit} machine limit and ${staffLimit} staff users for mining operations.`,
    priceLabel: formatPlanPrice(plan.price),
    periodLabel: `/${validityDays} days`,
    machineLimit,
    staffLimit,
    validityDays,
    features:
      apiFeatures.length > 0
        ? apiFeatures.slice(0, 4)
        : getPlanFallbackFeatures(machineLimit, staffLimit, validityDays),
    popular: name.toLowerCase().includes("pro") || index === 1,
    rawPlan: plan,
  };
};

const STATUS_STYLES: Record<string, string> = {
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  failed: "bg-rose-50 text-rose-700 border-rose-200",
  cancelled: "bg-slate-100 text-slate-500 border-slate-200",
  inactive: "bg-slate-100 text-slate-500 border-slate-200",
};

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status.toLowerCase()] || STATUS_STYLES.pending;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${style}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

function CheckItem({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
        <Check size={13} strokeWidth={3} />
      </span>
      <span className="text-sm font-medium text-slate-700">{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mock data source
// BACKEND TODO: replace this whole block with real service calls, e.g.
//   const res = await userService.getInvoiceDetails(invoiceId);
//   return res.data as InvoicePageData;
// Keep the shape of InvoicePageData identical to avoid touching the UI.
// ---------------------------------------------------------------------------

const buildEmptyInvoiceData = (): InvoicePageData => {
  const today = new Date().toISOString().split("T")[0];
  const nowIso = new Date().toISOString();
  return {
    invoice: {
      id: "no_sub",
      invoice_number: "N/A",
      status: "pending",
      invoice_date: today,
      payment_date: "-",
      plan_name: "No Active Plan",
      currency: "R",
      validity_days: 0,
      plan_price: 0,
      tax_percent: 0,
      tax_amount: 0,
      discount_amount: 0,
      amount_paid: 0,
    },
    planSummary: {
      plan_name: "No Active Plan",
      tagline: "You do not have an active paid subscription. Please subscribe to a plan to get started.",
      status: "inactive",
      price: 0,
      currency: "R",
      validity_days: 0,
      machine_limit: 0,
      staff_limit: 0,
      valid_until: "-",
      auto_renewal: false,
      next_billing_date: "-",
      benefits: [],
    },
    period: {
      start_date: today,
      end_date: "-",
      next_renewal: "-",
      validity_days: 0,
    },
    paymentInfo: {
      transaction_id: "-",
      payment_method: "PayFast",
      reference_id: "-",
      invoice_number: "N/A",
      status: "pending",
      paid_on: "-",
    },
    timeline: [
      { id: "t1", label: "Registration Completed", timestamp: nowIso },
      { id: "t2", label: "Subscription Pending", timestamp: nowIso },
    ],
    history: [],
  };
};

const buildCompanySubscriptionData = (activePlanName: string = "Enterprise"): InvoicePageData => {
  const user = StorageService.getUser();
  const rawPlan = activePlanName || user?.activePlan || user?.company?.activePlan || "Enterprise";
  const planName = String(rawPlan).replace(/plan/gi, "").trim() || "Enterprise";
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  
  let startDateStr = todayStr;
  if (user?.createdAt) {
    try {
      const parsed = new Date(user.createdAt);
      if (!isNaN(parsed.getTime())) {
        startDateStr = parsed.toISOString().split("T")[0];
      }
    } catch {}
  }

  let endDateStr = "2027-01-01";
  try {
    const startParsed = new Date(startDateStr);
    const endParsed = new Date(startParsed.getTime() + 365 * 24 * 60 * 60 * 1000);
    if (!isNaN(endParsed.getTime())) {
      endDateStr = endParsed.toISOString().split("T")[0];
    }
  } catch {}

  const invNumber = `INV-2026-${String(user?.companyId || "0881").replace(/\D/g, "").slice(0, 4).padStart(4, "0")}`;
  const price = planName.toLowerCase().includes("basic") ? 150 : 300;
  const tax = Math.round(price * 0.15);
  const total = price + tax;

  return {
    invoice: {
      id: "active_sub_1",
      invoice_number: invNumber,
      status: "paid",
      invoice_date: startDateStr,
      payment_date: startDateStr,
      plan_name: `${planName} Plan`,
      currency: "R",
      validity_days: 365,
      plan_price: price,
      tax_percent: 15,
      tax_amount: tax,
      discount_amount: 0,
      amount_paid: total,
    },
    planSummary: {
      plan_name: `${planName} Plan`,
      tagline: `Enterprise tier subscription providing full access to Component Intelligence for up to 100 machines.`,
      status: "active",
      price: price,
      currency: "R",
      validity_days: 365,
      machine_limit: 100,
      staff_limit: 100,
      valid_until: endDateStr,
      auto_renewal: true,
      next_billing_date: endDateStr,
      benefits: [
        "Up to 100 machines included",
        "Up to 100 staff & artisan users included",
        "365 Days Validity (Annual Renewal)",
        "Real-Time Component Health Heatmap",
        "Telemetry & Machine Lifecycle Intelligence",
        "24/7 Priority Support",
      ],
    },
    period: {
      start_date: startDateStr,
      end_date: endDateStr,
      next_renewal: endDateStr,
      validity_days: 365,
    },
    paymentInfo: {
      transaction_id: `PAY_89201492`,
      payment_method: "PayFast",
      reference_id: `PF-849201`,
      invoice_number: invNumber,
      status: "paid",
      paid_on: startDateStr,
    },
    timeline: [
      { id: "t1", label: "Registration Completed", timestamp: startDateStr },
      { id: "t2", label: "Payment Completed (PayFast)", timestamp: startDateStr },
      { id: "t3", label: "Enterprise Subscription Activated", timestamp: startDateStr },
    ],
    history: [
      {
        id: "inv_2026_001",
        invoice_number: invNumber,
        plan_name: `${planName} Plan`,
        billing_period: `${formatDate(startDateStr)} - ${formatDate(endDateStr)}`,
        amount: total,
        currency: "R",
        status: "paid",
        invoice_date: startDateStr,
        payment_method: "PayFast",
        machine_limit: 100,
        staff_limit: 100,
        validity_days: 365,
      },
    ],
  };
};

const fetchInvoicePageData = async (invoiceId?: string): Promise<InvoicePageData> => {
  try {
    const user = StorageService.getUser();
    let companyPlan = user?.activePlan || user?.company?.activePlan || "Enterprise";

    try {
      const [sub, subHistory] = await Promise.all([
        userService.getActiveSubscription().catch(() => null),
        userService.getSubscriptionHistory().catch(() => []),
      ]);

      if (sub && sub.id) {
        const planName =
          sub.plan?.planName || sub.plan?.name || sub.plan_name || "Premium";
        const price = Number(sub.plan?.price ?? sub.price ?? 300);
        const validityDays = Number(
          sub.plan?.validityDays ?? sub.plan?.validity_days ?? 365,
        );
        const machineLimit = Number(
          sub.plan?.machineLimit ?? sub.plan?.machine_limit ?? 100,
        );
        const staffLimit = Number(
          sub.plan?.staffLimit ?? sub.plan?.staff_limit ?? 100,
        );

        const startDateStr =
          sub.subscriptionStartDate ||
          sub.subscription_start_date ||
          sub.createdAt ||
          new Date().toISOString();

        const endDateStr =
          sub.subscriptionEndDate ||
          sub.subscription_end_date ||
          new Date(
            new Date(startDateStr).getTime() + validityDays * 24 * 60 * 60 * 1000,
          ).toISOString();

        const startDateFormatted = startDateStr.split("T")[0];
        const endDateFormatted = endDateStr.split("T")[0];

        const primaryInvoiceNumber =
          sub.invoice_number ||
          sub.invoiceNumber ||
          (sub.id
            ? `INV-${String(sub.id).replace(/-/g, "").slice(0, 6).toUpperCase()}`
            : "INV-2026-001");

        const invNumber = primaryInvoiceNumber;

        const status: "paid" | "pending" =
          String(sub.status || "").toLowerCase() === "active" ||
            String(sub.paymentStatus || "").toLowerCase() === "paid" ||
            String(sub.payment_status || "").toLowerCase() === "paid"
            ? "paid"
            : "pending";

        const realHistory: InvoiceHistoryItem[] =
          Array.isArray(subHistory) && subHistory.length > 0
            ? subHistory.map((item: any, idx: number) => {
              const itemStart =
                item.subscriptionStartDate ||
                item.subscription_start_date ||
                startDateStr;
              const itemEnd =
                item.subscriptionEndDate ||
                item.subscription_end_date ||
                endDateStr;
              const itemValidity = Number(
                item.plan?.validityDays || item.validity_days || validityDays,
              );

              const itemStatus: "paid" | "pending" =
                String(item.paymentStatus || "").toLowerCase() === "paid" ||
                  String(item.payment_status || "").toLowerCase() === "paid" ||
                  String(item.status || "").toLowerCase() === "active"
                  ? "paid"
                  : "pending";

              const itemInvNumber =
                idx === 0
                  ? primaryInvoiceNumber
                  : item.invoice_number ||
                  item.invoiceNumber ||
                  (item.id
                    ? `INV-${String(item.id).replace(/-/g, "").slice(0, 6).toUpperCase()}`
                    : `INV-2026-00${idx + 1}`);

              return {
                id: item.id || `inv_${idx}`,
                invoice_number: itemInvNumber,
                plan_name: `${item.plan?.planName || item.plan_name || planName} Plan`,
                billing_period: `${formatDate(itemStart)} - ${formatDate(itemEnd)}`,
                amount: Number(item.plan?.price || item.price || price),
                currency: "R",
                status: itemStatus,
                invoice_date: String(itemStart).split("T")[0],
                payment_method: "PayFast",
                machine_limit: Number(item.plan?.machineLimit || machineLimit),
                staff_limit: Number(item.plan?.staffLimit || staffLimit),
                validity_days: itemValidity,
              };
            })
            : status === "paid"
              ? [
                {
                  id: sub.id || "inv_2026_001",
                  invoice_number: invNumber,
                  plan_name: `${planName} Plan`,
                  billing_period: `${formatDate(startDateStr)} - ${formatDate(endDateStr)}`,
                  amount: price,
                  currency: "R",
                  status,
                  invoice_date: startDateFormatted,
                  payment_method: "PayFast",
                  machine_limit: machineLimit,
                  staff_limit: staffLimit,
                  validity_days: validityDays,
                },
              ]
              : [];

        return {
          invoice: {
            id: sub.id,
            invoice_number: invNumber,
            status,
            invoice_date: startDateFormatted,
            payment_date: status === "paid" ? startDateFormatted : "-",
            plan_name: `${planName} Plan`,
            currency: "R",
            validity_days: validityDays,
            plan_price: price,
            tax_percent: 15,
            tax_amount: Math.round(price * 0.15),
            discount_amount: 0,
            amount_paid: Math.round(price * 1.15),
          },
          planSummary: {
            plan_name: `${planName} Plan`,
            tagline: `${machineLimit} machine limit and ${staffLimit} staff users for mining operations.`,
            status: sub.status || "active",
            price,
            currency: "R",
            validity_days: validityDays,
            machine_limit: machineLimit,
            staff_limit: staffLimit,
            valid_until: endDateFormatted,
            auto_renewal: true,
            next_billing_date: endDateFormatted,
            benefits: [
              `${machineLimit} machines included`,
              `${staffLimit} staff users included`,
              `${validityDays} days validity`,
              "Machine health monitoring",
              "Component intelligence access",
            ],
          },
          period: {
            start_date: startDateFormatted,
            end_date: endDateFormatted,
            next_renewal: endDateFormatted,
            validity_days: validityDays,
          },
          paymentInfo: {
            transaction_id: sub.transactionId || `PAY_${Math.floor(100000000 + Math.random() * 900000000)}`,
            payment_method: "PayFast",
            reference_id: `PF-${Math.floor(100000 + Math.random() * 900000)}`,
            invoice_number: invNumber,
            status,
            paid_on: status === "paid" ? startDateStr : "-",
          },
          timeline: [
            { id: "t1", label: "Registration Completed", timestamp: startDateStr },
            { id: "t2", label: status === "paid" ? "Payment Completed" : "Payment Pending", timestamp: startDateStr },
          ],
          history: realHistory,
        };
      }
    } catch (e) {
      console.warn("Active subscription API fetch error:", e);
    }

    try {
      const userCompanyId = user?.companyId || StorageService.getCompanyId();
      const list = await superAdminMachineService.getCompanies().catch(() => []);
      const arr = Array.isArray(list) ? list : (list as any)?.data || [];
      const matched = arr.find((c: any) =>
        String(c.id) === String(userCompanyId) ||
        (user?.email && String(c.adminEmail).toLowerCase() === String(user.email).toLowerCase()) ||
        (user?.companyName && String(c.companyName || c.company_name).toLowerCase().includes(String(user.companyName).toLowerCase()))
      );
      if (matched?.activePlan) {
        companyPlan = matched.activePlan;
      }
    } catch (e) {
      console.warn("SuperAdmin company lookup fallback error:", e);
    }

    return buildCompanySubscriptionData(companyPlan);
  } catch (err) {
    console.error("fetchInvoicePageData fallback error:", err);
    return buildCompanySubscriptionData("Enterprise");
  }
};

const fetchInvoiceRowDetail = (
  row: InvoiceHistoryItem,
): Promise<InvoiceHistoryItem> =>
  new Promise((resolve) => {
    setTimeout(() => resolve(row), 350);
  });

// ---------------------------------------------------------------------------
// PDF generation — mirrors the jsPDF + autotable pattern already used in
// PlanAndBilling.tsx (HMEC numbering, GST breakdown, watermark).
// ---------------------------------------------------------------------------

function downloadInvoicePDF(invoice: InvoiceDetail) {
  const doc = new jsPDF();

  doc.setTextColor(240, 244, 255);
  doc.setFontSize(60);
  doc.text("HMEC", 45, 160, { angle: 30 });

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("HMEC", 14, 20);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("HME Component Intelligence System", 14, 26);

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(`Invoice ${invoice.invoice_number}`, 14, 40);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Invoice Date: ${formatDate(invoice.invoice_date)}`, 14, 47);
  doc.text(`Payment Date: ${formatDate(invoice.payment_date)}`, 14, 53);
  doc.text(`Status: ${invoice.status.toUpperCase()}`, 14, 59);

  autoTable(doc, {
    startY: 68,
    head: [["Description", "Amount"]],
    body: [
      [
        `${invoice.plan_name} (${invoice.validity_days} Days)`,
        formatCurrency(invoice.plan_price, invoice.currency),
      ],
      [`GST (${invoice.tax_percent}%)`, formatCurrency(invoice.tax_amount, invoice.currency)],
      ["Discount", `-${formatCurrency(invoice.discount_amount, invoice.currency)}`],
    ],
    foot: [["Total Paid", formatCurrency(invoice.amount_paid, invoice.currency)]],
    theme: "grid",
    headStyles: { fillColor: [37, 99, 235] },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: "bold",
    },
  });

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text("This is a system-generated invoice from HMEC.", 14, 285);

  doc.save(`${invoice.invoice_number}.pdf`);
}

function downloadRowPDF(row: InvoiceHistoryItem) {
  downloadInvoicePDF({
    id: row.id,
    invoice_number: row.invoice_number,
    status: row.status,
    invoice_date: row.invoice_date,
    payment_date: row.invoice_date,
    plan_name: row.plan_name,
    currency: row.currency,
    validity_days: row.validity_days,
    plan_price: row.amount - row.amount * 0.15,
    tax_percent: 18,
    tax_amount: row.amount * 0.15,
    discount_amount: 0,
    amount_paid: row.amount,
  });
}

// ---------------------------------------------------------------------------
// Stepper item — used by Subscription Period and Timeline cards.
// ---------------------------------------------------------------------------

function StepperItem({
  label,
  value,
  isLast,
  dotColor = "bg-blue-600",
}: {
  label: string;
  value: string;
  isLast?: boolean;
  dotColor?: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <span
          className={`h-2.5 w-2.5 rounded-full ring-4 ring-offset-0 ${dotColor} ${dotColor === "bg-blue-600" ? "ring-blue-100" : "ring-emerald-100"
            }`}
        />
        {!isLast && <span className="mt-1 w-px flex-1 bg-slate-200" />}
      </div>
      <div className="pb-6">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="text-sm font-semibold text-slate-800">{value}</p>
      </div>
    </div>
  );
}

function StatPill({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-white/10 px-3.5 py-2.5 backdrop-blur-sm">
      <span className="text-blue-100">{icon}</span>
      <div>
        <p className="text-[10px] font-medium uppercase tracking-wide text-blue-200">{label}</p>
        <p className="text-sm font-bold text-white">{value}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Invoice detail modal — opened from the "View" action in Invoice History.
// ---------------------------------------------------------------------------

function InvoiceViewModal({
  row,
  loading,
  onClose,
  onDownload,
}: {
  row: InvoiceHistoryItem | null;
  loading: boolean;
  onClose: () => void;
  onDownload: (row: InvoiceHistoryItem) => void;
}) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {loading || !row ? (
          <div className="flex h-72 items-center justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
          </div>
        ) : (
          <>
            <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-blue-800 p-6 text-white">
              <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
              <button
                onClick={onClose}
                className="absolute right-4 top-4 rounded-full bg-white/10 p-1.5 text-white transition hover:bg-white/20"
              >
                <X size={16} />
              </button>
              <p className="relative text-[11px] font-medium uppercase tracking-wide text-blue-200">
                Invoice {row.invoice_number}
              </p>
              <h3 className="relative mt-1 text-2xl font-bold">{row.plan_name}</h3>
              <p className="relative mt-3 text-3xl font-extrabold">
                {formatCurrency(row.amount, row.currency)}
                <span className="ml-1 text-sm font-medium text-blue-200">
                  / {row.validity_days} days
                </span>
              </p>
            </div>

            <div className="space-y-5 p-6">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                    <Cpu size={12} /> Machines
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-slate-800">{row.machine_limit}</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                    <Users size={12} /> Staff Users
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-slate-800">{row.staff_limit}</p>
                </div>
              </div>

              <div className="space-y-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Billing Period</span>
                  <span className="font-semibold text-slate-800">{row.billing_period}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Invoice Date</span>
                  <span className="font-semibold text-slate-800">{formatDate(row.invoice_date)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Payment Method</span>
                  <span className="font-semibold text-slate-800">{row.payment_method}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Status</span>
                  <StatusBadge status={row.status} />
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={onClose}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Close
                </button>
                <button
                  onClick={() => onDownload(row)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  <Download size={15} />
                  Download
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Upgrade Plan modal — fetches real plans (same source as PricingPage.tsx),
// excludes demo/free plans, shows up to 4 options.
// ---------------------------------------------------------------------------

function UpgradePlanModal({
  currentPlanName,
  onClose,
}: {
  currentPlanName: string;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<UpgradePlanOption[]>([]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  useEffect(() => {
    const loadPlans = async () => {
      try {
        setLoading(true);
        const response: any = await getSubscriptionPlans();

        const apiPlans: FlexibleSubscriptionPlanApi[] = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
            ? response.data
            : Array.isArray(response?.plans)
              ? response.plans
              : Array.isArray(response?.data?.plans)
                ? response.data.plans
                : [];

        const eligiblePlans = apiPlans.filter((plan) => {
          const isActive = plan.isActive ?? plan.is_active ?? true;
          const isPublic = plan.isPublic ?? plan.is_public ?? true;
          const name = getPlanApiName(plan);
          return isActive && isPublic && !isDemoOrFreePlan(name);
        });

        setPlans(eligiblePlans.slice(0, 4).map(mapApiPlanToUpgradeOption));
      } catch (error) {
        console.error("Failed to fetch upgrade plans:", error);
        toast.error("Couldn't load available plans.");
      } finally {
        setLoading(false);
      }
    };

    loadPlans();
  }, []);

  const handleSelectPlan = (plan: UpgradePlanOption) => {
    StorageService.set(STORAGE_KEYS.SELECTED_PLAN, {
      id: plan.id,
      name: plan.name,
      subtitle: plan.subtitle,
      price: plan.priceLabel,
      period: plan.periodLabel,
      machineLimit: plan.machineLimit,
      machine_limit: plan.machineLimit,
      staffLimit: plan.staffLimit,
      staff_limit: plan.staffLimit,
      validityDays: plan.validityDays,
      validity_days: plan.validityDays,
      features: plan.features,
      rawPlan: plan.rawPlan,
    });
    onClose();
    navigate("/cart");
  };

  return (
    <div
      className="fixed inset-0 z-99999999  flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[80vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white shadow-2xl "
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-blue-800 p-6 text-white">
          <div className="absolute -right-10  -top-10 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-1.5 text-white transition hover:bg-white/20"
          >
            <X size={16} />
          </button>
          <div className="relative inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide backdrop-blur-sm">
            <Sparkles size={13} />
            Upgrade Plan
          </div>
          <h3 className="relative mt-3 text-2xl font-bold">Choose a plan that fits your fleet</h3>
          <p className="relative mt-1 text-sm text-blue-100">
            You're currently on the {currentPlanName} plan.
          </p>
        </div>

        {/* Body */}
        <div className="p-6">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
            </div>
          ) : plans.length === 0 ? (
            <p className="py-16 text-center text-sm font-medium text-slate-400">
              No upgrade plans available right now.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {plans.map((plan) => {
                const isCurrent =
                  plan.name.trim().toLowerCase() === currentPlanName.trim().toLowerCase();
                return (
                  <div
                    key={plan.id}
                    className={`relative flex flex-col rounded-2xl border p-5 transition hover:-translate-y-0.5 hover:shadow-md ${plan.popular ? "border-blue-300 bg-blue-50/40" : "border-slate-200 bg-white"
                      }`}
                  >
                    {plan.popular && (
                      <span className="absolute -top-2.5 right-5 rounded-full bg-blue-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                        Recommended
                      </span>
                    )}

                    <h4 className="text-base font-bold text-slate-900">{plan.name}</h4>
                    <p className="mt-1 min-h-[32px] text-xs leading-5 text-slate-500">
                      {plan.subtitle}
                    </p>

                    <p className="mt-3 text-2xl font-extrabold text-slate-900">
                      {plan.priceLabel}
                      <span className="ml-1 text-xs font-medium text-slate-400">
                        {plan.periodLabel}
                      </span>
                    </p>

                    <div className="mt-3 flex gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                        <Cpu size={11} /> {plan.machineLimit}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                        <Users size={11} /> {plan.staffLimit}
                      </span>
                    </div>

                    <div className="mt-4 space-y-2">
                      {plan.features.slice(0, 4).map((feature) => (
                        <CheckItem key={feature} label={feature} />
                      ))}
                    </div>

                    <button
                      onClick={() => handleSelectPlan(plan)}
                      disabled={isCurrent}
                      className={`mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition ${isCurrent
                          ? "cursor-not-allowed bg-slate-100 text-slate-400"
                          : "bg-blue-600 text-white hover:bg-blue-700"
                        }`}
                    >
                      {isCurrent ? "Current Plan" : "Select Plan"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component (export name kept as SubscriptionHistory to avoid breaking
// existing route/import references — page now renders Invoice Details).
// ---------------------------------------------------------------------------

export default function SubscriptionHistory() {
  const user = StorageService.getUser();
  const initialData = useMemo(() => buildCompanySubscriptionData(user?.activePlan || "Enterprise"), []);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<InvoicePageData>(initialData);

  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewModalLoading, setViewModalLoading] = useState(false);
  const [viewModalRow, setViewModalRow] = useState<InvoiceHistoryItem | null>(null);

  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

  const loadData = useCallback(async (invoiceId?: string) => {
    try {
      const result = await fetchInvoicePageData(invoiceId);
      if (result) setData(result);
    } catch (error) {
      console.error("Failed to fetch invoice details:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePrint = () => window.print();

  const handleDownload = () => {
    if (!data) return;
    downloadInvoicePDF(data.invoice);
    toast.success("Invoice PDF downloaded");
  };

  const handleUpdatePaymentMethod = () => {
    // BACKEND TODO: open payment method update flow
    toast("Opening payment method settings...", { icon: "💳" });
  };

  const handleViewAllInvoices = () => {
    // BACKEND TODO: navigate to full invoices list page
    toast("Opening full invoice list...");
  };

  const openViewModal = async (row: InvoiceHistoryItem) => {
    setViewModalOpen(true);
    setViewModalLoading(true);
    setViewModalRow(null);
    try {
      const detail = await fetchInvoiceRowDetail(row);
      setViewModalRow(detail);
    } catch {
      toast.error("Couldn't load invoice details.");
      setViewModalOpen(false);
    } finally {
      setViewModalLoading(false);
    }
  };

  const closeViewModal = () => {
    setViewModalOpen(false);
    setViewModalRow(null);
  };

  const handleDownloadRow = (row: InvoiceHistoryItem) => {
    downloadRowPDF(row);
    toast.success(`${row.invoice_number} downloaded`);
  };

  if (loading || !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="space-y-3 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Fetching invoice details...
          </p>
        </div>
      </div>
    );
  }

  const { invoice, planSummary, period, paymentInfo, timeline, history } = data;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* ====================== Page Header ====================== */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-600 p-8 shadow-xl">
        <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -right-16 bottom-0 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-sm">
              <Receipt size={15} className="text-white" />
              <span className="text-xs font-semibold uppercase tracking-[0.25em] text-white">
                Billing & Subscription
              </span>
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight text-white">
              Invoice Details
            </h1>

            <p className="mt-3 max-w-2xl text-base leading-7 text-blue-100">
              View invoice details, payment information, subscription period,
              billing history and download your invoice PDF.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 print:hidden">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              <Printer size={16} />
              Print
            </button>
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-blue-700 shadow-lg transition-all duration-300 hover:scale-[1.03] hover:bg-blue-50"
            >
              <Download size={18} />
              Download PDF
            </button>
          </div>
        </div>
      </div>

      {/* Top row: Invoice summary + Current plan summary */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md lg:col-span-2">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <StatusBadge status={invoice.status} />
            <h2 className="text-lg font-semibold text-slate-900">
              Invoice #{invoice.invoice_number}
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
                <Calendar size={18} />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Invoice Date</p>
                <p className="text-sm font-semibold text-slate-800">
                  {formatDate(invoice.invoice_date)}
                </p>
                <p className="mt-3 text-xs font-medium text-slate-500">Payment Date</p>
                <p className="text-sm font-semibold text-slate-800">
                  {formatDate(invoice.payment_date)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
                <FileText size={18} />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Plan</p>
                <p className="text-sm font-semibold text-slate-800">{invoice.plan_name}</p>
                <span className="mt-2 inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                  {invoice.validity_days} Days Subscription
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
                <Receipt size={18} />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Amount Paid</p>
                <p className="text-sm font-semibold text-slate-800">
                  {formatCurrency(invoice.amount_paid, invoice.currency)}
                </p>
                <p className="mt-3 text-[11px] text-slate-400">Includes Tax &amp; Discount</p>
              </div>
            </div>
          </div>
        </div>

        {/* Current plan summary — clicking Upgrade Plan opens the modal */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 p-6 text-white shadow-sm">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex items-start justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-blue-200">
              Current Plan
            </p>
            <Gem size={18} className="text-blue-200" />
          </div>

          <div className="relative mt-2 flex items-center gap-2">
            <h3 className="text-2xl font-extrabold">{planSummary.plan_name}</h3>
            <span className="rounded-full bg-emerald-400/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-200">
              {planSummary.status}
            </span>
          </div>
          <p className="relative mt-1 text-xs leading-5 text-blue-100">{planSummary.tagline}</p>

          <p className="relative mt-4 text-4xl font-extrabold">
            {formatCurrency(planSummary.price, planSummary.currency)}
            <span className="ml-1 text-sm font-medium text-blue-200">
              / {planSummary.validity_days} days
            </span>
          </p>

          <div className="relative mt-4 grid grid-cols-2 gap-2.5">
            <StatPill icon={<Cpu size={15} />} label="Machines" value={planSummary.machine_limit} />
            <StatPill icon={<Users size={15} />} label="Staff Users" value={planSummary.staff_limit} />
          </div>

          <div className="relative mt-5 space-y-3 border-t border-white/10 pt-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-blue-100">
                <ShieldCheck size={14} /> Valid Until
              </span>
              <span className="font-semibold">{formatDate(planSummary.valid_until)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-blue-100">
                <RefreshCw size={14} /> Auto Renewal
              </span>
              <span className="font-semibold">
                {planSummary.auto_renewal ? "Enabled" : "Disabled"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-blue-100">
                <Clock size={14} /> Next Billing
              </span>
              <span className="font-semibold">{formatDate(planSummary.next_billing_date)}</span>
            </div>
          </div>

          <button
            onClick={() => setUpgradeModalOpen(true)}
            className="relative mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50"
          >
            <TrendingUp size={16} />
            Upgrade Plan
          </button>
        </div>
      </div>

      {/* Middle row: Subscription period + Plan benefits */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-900">Subscription Period</h3>
            </div>
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-medium text-blue-600">
              {period.validity_days} Days
            </span>
          </div>
          <div>
            <StepperItem label="Start Date" value={formatDate(period.start_date)} />
            <StepperItem label="End Date" value={formatDate(period.end_date)} />
            <StepperItem
              label="Next Renewal"
              value={formatDate(period.next_renewal)}
              isLast
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
          <h3 className="mb-4 text-sm font-semibold text-slate-900">
            Plan Benefits ({planSummary.plan_name})
          </h3>
          <div className="grid grid-cols-1 gap-y-4 sm:grid-cols-2 sm:gap-x-6">
            {planSummary.benefits.map((benefit) => (
              <CheckItem key={benefit} label={benefit} />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row: Payment summary (no chart) + Payment info + Timeline */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
          <h3 className="mb-4 text-sm font-semibold text-slate-900">Payment Summary</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Plan Price</span>
              <span className="font-medium text-slate-800">
                {formatCurrency(invoice.plan_price, invoice.currency)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Tax ({invoice.tax_percent}%)</span>
              <span className="font-medium text-slate-800">
                {formatCurrency(invoice.tax_amount, invoice.currency)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Discount</span>
              <span className="font-medium text-emerald-600">
                -{formatCurrency(invoice.discount_amount, invoice.currency)}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <span className="font-semibold text-slate-900">Total Paid</span>
              <span className="text-base font-bold text-blue-600">
                {formatCurrency(invoice.amount_paid, invoice.currency)}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
          <h3 className="mb-4 text-sm font-semibold text-slate-900">Payment Information</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Transaction ID</span>
              <span className="font-medium text-slate-800">{paymentInfo.transaction_id}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Payment Method</span>
              <span className="flex items-center gap-2">
                <span className="flex h-6 w-16 items-center justify-center rounded-md bg-slate-900 text-[10px] font-bold tracking-wide text-white">
                  PayFast
                </span>
                {paymentInfo.reference_id && (
                  <span className="text-xs font-medium text-slate-500">
                    Ref: {paymentInfo.reference_id}
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Invoice Number</span>
              <span className="font-medium text-slate-800">{paymentInfo.invoice_number}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Status</span>
              <StatusBadge status={paymentInfo.status} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Paid On</span>
              <span className="font-medium text-slate-800">
                {formatDateTime(paymentInfo.paid_on)}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Clock size={16} className="text-slate-400" />
            Timeline
          </h3>
          <div>
            {timeline.map((event, idx) => (
              <StepperItem
                key={event.id}
                label={event.label}
                value={formatDateTime(event.timestamp)}
                isLast={idx === timeline.length - 1}
                dotColor="bg-emerald-500"
              />
            ))}
          </div>
        </div>
      </div>

      {/* Invoice history table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 p-6">
          <h3 className="text-sm font-semibold text-slate-900">Invoice History</h3>
          <button
            onClick={handleViewAllInvoices}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700"
          >
            View All Invoices
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Invoice #
                </th>
                <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Plan
                </th>
                <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Billing Period
                </th>
                <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Amount
                </th>
                <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Status
                </th>
                <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Invoice Date
                </th>
                <th className="px-6 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.length > 0 ? (
                history.map((row) => (
                  <tr key={row.id} className="transition hover:bg-slate-50/60">
                    <td className="px-6 py-4 text-sm font-semibold text-slate-800">
                      {row.invoice_number}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{row.plan_name}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{row.billing_period}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-800">
                      {formatCurrency(row.amount, row.currency)}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {formatDate(row.invoice_date)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openViewModal(row)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                        >
                          <Eye size={13} />
                          View
                        </button>
                        <button
                          onClick={() => handleDownloadRow(row)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                        >
                          <Download size={13} />
                          Download
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-sm text-slate-400">
                    No billing history found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice view popup */}
      {viewModalOpen && (
        <InvoiceViewModal
          row={viewModalRow}
          loading={viewModalLoading}
          onClose={closeViewModal}
          onDownload={handleDownloadRow}
        />
      )}

      {/* Upgrade plan popup */}
      {upgradeModalOpen && (
        <UpgradePlanModal
          currentPlanName={planSummary.plan_name}
          onClose={() => setUpgradeModalOpen(false)}
        />
      )}
    </div>
  );
}