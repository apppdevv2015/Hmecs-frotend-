import { useRef } from "react";
import { Download } from "lucide-react";
import toast from "react-hot-toast";

type InvoiceStatus = "paid" | "pending" | "failed";

type InvoiceLineItem = {
  item: string;
  description: string;
  unitCost: number;
  quantity: number;
};

type BillingHistory = {
  id: string;
  invoiceNo: string;
  companyName: string;
  companyEmail: string;
  companyAddress: string;
  planName: string;
  billingCycle: "Monthly" | "Yearly";
  planLimit: string;
  amount: number;
  tax: number;
  paidToDate: number;
  paymentMethod: string;
  transactionId: string;
  status: InvoiceStatus;
  invoiceDate: string;
  dueDate: string;
  items: InvoiceLineItem[];
};

const invoiceData: BillingHistory = {
  id: "1",
  invoiceNo: "INV-HMEC-0527",
  companyName: "CapeRock Mining Pty Ltd",
  companyEmail: "accounts@caperockmining.co.za",
  companyAddress: "Rustenburg Mining Zone, North West, South Africa",
  planName: "Pro Plan",
  billingCycle: "Monthly",
  planLimit: "50 Machines",
  amount: 4999,
  tax: 900,
  paidToDate: 5899,
  paymentMethod: "PayFast",
  transactionId: "TXN-PF-982734",
  status: "paid",
  invoiceDate: "2026-05-10",
  dueDate: "2026-06-10",
  items: [
    {
      item: "Pro Plan",
      description: "Monthly subscription for machine intelligence dashboard",
      unitCost: 4999,
      quantity: 1,
    },
    {
      item: "Component Reports",
      description: "Engine, tyre, hydraulic and suspension analytics",
      unitCost: 0,
      quantity: 1,
    },
    {
      item: "Invoice Storage",
      description: "Finance history and saved invoice access",
      unitCost: 0,
      quantity: 1,
    },
  ],
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getLineTotal = (item: InvoiceLineItem) => {
  return item.unitCost * item.quantity;
};

const getInvoiceSubtotal = (invoice: BillingHistory) => {
  return invoice.items.reduce((sum, item) => sum + getLineTotal(item), 0);
};

const getInvoiceTotal = (invoice: BillingHistory) => {
  return getInvoiceSubtotal(invoice) + invoice.tax;
};

const getInvoiceDue = (invoice: BillingHistory) => {
  return Math.max(getInvoiceTotal(invoice) - invoice.paidToDate, 0);
};

const getStatusClass = (status: InvoiceStatus) => {
  if (status === "paid") {
    return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
  }

  if (status === "pending") {
    return "bg-orange-50 text-orange-700 ring-1 ring-orange-200";
  }

  return "bg-red-50 text-red-700 ring-1 ring-red-200";
};

const PlanAndBilling = () => {
  const invoiceRef = useRef<HTMLDivElement>(null);

  const handlePrintInvoice = () => {
    const printContent = invoiceRef.current?.innerHTML;

    if (!printContent) {
      toast.error("Invoice not ready");
      return;
    }

    const printWindow = window.open("", "_blank", "width=1000,height=800");

    if (!printWindow) {
      toast.error("Please allow popup to print invoice");
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>${invoiceData.invoiceNo}</title>
          <style>
            body {
              margin: 0;
              padding: 24px;
              background: #ffffff;
              font-family: Arial, sans-serif;
            }

            * {
              box-sizing: border-box;
            }

            @media print {
              body {
                padding: 0;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Invoice</h1>
            <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
              Plan billing and finance invoice preview
            </p>
          </div>

          <button
            type="button"
            onClick={handlePrintInvoice}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-orange-500/25 transition hover:bg-orange-600"
          >
            <Download size={18} />
            Save / Print PDF
          </button>
        </div>

        <div ref={invoiceRef}>
          <InvoiceTemplate invoice={invoiceData} />
        </div>
      </div>
    </div>
  );
};

type InvoiceTemplateProps = {
  invoice: BillingHistory;
};

const InvoiceTemplate = ({ invoice }: InvoiceTemplateProps) => {
  const subtotal = getInvoiceSubtotal(invoice);
  const total = getInvoiceTotal(invoice);
  const partialDue = getInvoiceDue(invoice);

  return (
    <div
      className="mx-auto overflow-hidden rounded-[2rem] bg-white text-slate-950 shadow-xl"
      style={{
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-orange-400 px-8 py-8 text-white">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-3xl font-black tracking-tight">
              HME Component Intelligence System
            </h2>
            <p className="mt-2 text-sm font-semibold text-blue-50">
              Heavy Machinery Subscription & Finance Invoice
            </p>
          </div>

          <div className="min-w-[260px] space-y-2 text-sm">
            <div className="flex justify-between gap-8">
              <span className="font-semibold text-blue-50">Invoice Number</span>
              <span className="font-black">{invoice.invoiceNo}</span>
            </div>

            <div className="flex justify-between gap-8">
              <span className="font-semibold text-blue-50">Invoice Date</span>
              <span className="font-black">{formatDate(invoice.invoiceDate)}</span>
            </div>

            <div className="flex justify-between gap-8">
              <span className="font-semibold text-blue-50">Due Date</span>
              <span className="font-black">{formatDate(invoice.dueDate)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-8 py-7">
        <div className="flex flex-col gap-7 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-700 text-lg font-black text-white">
                HME
              </div>

              <div>
                <h3 className="text-3xl font-black">
                  <span className="text-blue-700">Invoice</span>
                  <span className="text-slate-950"> Details</span>
                </h3>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Plan billing and finance record
                </p>
              </div>
            </div>
          </div>

          <div className="text-left text-sm leading-6 text-slate-700 md:min-w-[320px]">
            <p className="font-black text-slate-950">Bill To:</p>
            <p>{invoice.companyName}</p>
            <p>{invoice.companyAddress}</p>
            <p>{invoice.companyEmail}</p>
          </div>
        </div>

        <div className="mt-7 grid gap-4 rounded-2xl bg-blue-50 p-4 text-sm text-blue-900 md:grid-cols-2">
          <InfoItem label="Plan Name" value={invoice.planName} />
          <InfoItem label="Billing Cycle" value={invoice.billingCycle} />
          <InfoItem label="Machine Limit" value={invoice.planLimit} />
          <InfoItem label="Payment Method" value={invoice.paymentMethod} />
          <InfoItem label="Transaction ID" value={invoice.transactionId} />
          <InfoItem label="Status" value={invoice.status.toUpperCase()} />
        </div>

        <div className="mt-7 overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-950 text-white">
                <th className="px-4 py-4 text-left text-sm font-black">Item</th>
                <th className="px-4 py-4 text-left text-sm font-black">Description</th>
                <th className="px-4 py-4 text-left text-sm font-black">Unit Cost</th>
                <th className="px-4 py-4 text-left text-sm font-black">Quantity</th>
                <th className="px-4 py-4 text-right text-sm font-black">Line Total</th>
              </tr>
            </thead>

            <tbody>
              {invoice.items.map((item, index) => (
                <tr key={`${item.item}-${index}`} className="border-b border-slate-200">
                  <td className="px-4 py-5 align-top text-sm font-black">{item.item}</td>

                  <td className="px-4 py-5 align-top text-sm leading-5 text-slate-700">
                    {item.description}
                  </td>

                  <td className="px-4 py-5 align-top text-sm font-semibold">
                    {formatCurrency(item.unitCost)}
                  </td>

                  <td className="px-4 py-5 align-top text-sm font-semibold">{item.quantity}</td>

                  <td className="px-4 py-5 text-right align-top text-sm font-black">
                    {formatCurrency(getLineTotal(item))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-7 grid gap-8 md:grid-cols-2">
          <div>
            <p className="text-sm font-black text-slate-950">Invoice Terms:</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Payment is linked with subscription activation. Invoice record is saved automatically
              in finance history.
            </p>

            <div className="mt-5 rounded-2xl bg-orange-50 p-4 text-sm text-orange-700">
              <p className="font-black">Note</p>
              <p className="mt-1">
                This invoice is generated for HME subscription and billing record.
              </p>
            </div>
          </div>

          <div className="ml-auto w-full max-w-sm space-y-3 text-sm">
            <AmountRow label="Subtotal" value={formatCurrency(subtotal)} />
            <AmountRow label="Tax" value={formatCurrency(invoice.tax)} />
            <AmountRow label="Total" value={formatCurrency(total)} strong />
            <AmountRow label="Paid to Date" value={formatCurrency(invoice.paidToDate)} />
            <AmountRow label="Partial Due" value={formatCurrency(partialDue)} highlight />

            <div className="pt-2">
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider ${getStatusClass(
                  invoice.status,
                )}`}
              >
                {invoice.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-orange-400 px-8 py-7 text-white">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="font-black">HME Component Intelligence System</p>
            <p className="mt-1 text-sm text-blue-50">support@hme-system.com</p>
          </div>

          <div className="text-sm leading-6 text-blue-50 md:text-right">
            <p>Mining Component Intelligence Platform</p>
            <p>South Africa</p>
            <p className="mt-3 text-xs italic text-blue-100">Page 1 of 1</p>
          </div>
        </div>
      </div>
    </div>
  );
};

type InfoItemProps = {
  label: string;
  value: string;
};

const InfoItem = ({ label, value }: InfoItemProps) => {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-wider text-blue-500">{label}</p>
      <p className="mt-1 break-all text-sm font-black text-blue-950">{value}</p>
    </div>
  );
};

type AmountRowProps = {
  label: string;
  value: string;
  strong?: boolean;
  highlight?: boolean;
};

const AmountRow = ({ label, value, strong, highlight }: AmountRowProps) => {
  return (
    <div
      className={`flex items-center justify-between gap-4 border-b border-slate-200 pb-2 ${
        highlight ? "text-orange-600" : "text-slate-800"
      }`}
    >
      <span className={`${strong || highlight ? "font-black" : "font-semibold"}`}>{label}</span>

      <span className={`${strong || highlight ? "font-black" : "font-semibold"}`}>{value}</span>
    </div>
  );
};

export default PlanAndBilling;
