import React, { useState } from "react";
import toast from "react-hot-toast";
import DigitalSignature from "../../components/common/DigitalSignature";
import {
  AlertCircle,
  Building2,
  CalendarDays,
  CheckCircle2,
  Download,
  Eye,
  FileSignature,
  FileText,
  Loader2,
  Mail,
  MapPin,
  MonitorCog,
  Phone,
  ReceiptText,
  ShieldCheck,
  UserRound,
  XCircle,
} from "lucide-react";

/* ============================================================
   TYPES
============================================================ */

type ContractStatus = "active" | "pending" | "completed" | "cancelled";

interface Party {
  name: string;
  email: string;
  phone: string;
  address: string;
}

interface Machine {
  name: string;
  type: string;
  site: string;
}

interface ContractPricing {
  planAmount: number;
  applicableTax: number;
  additionalCharges: number;
  totalContractValue: number;
  currency: string;
}

interface ContractSignature {
  partyName: string;
  role: string;
  signed: boolean;
  signedDate: string;
}

interface ContractDocument {
  fileName: string;
  version: string;
  fileType: string;
}

interface ContractData {
  contractNumber: string;
  quotationNumber: string;
  status: ContractStatus;

  contractStartDate: string;
  contractDuration: string;
  contractEndDate: string;

  customer: Party;
  supplier: Party;

  planName: string;
  planDescription: string;

  sites: string[];
  machines: Machine[];

  pricing: ContractPricing;

  signatures: ContractSignature[];

  document: ContractDocument;
}

/* ============================================================
   HELPERS
============================================================ */

const EMPTY_TEXT = "—";

const displayText = (value?: string | null): string =>
  value && value.trim().length > 0 ? value : EMPTY_TEXT;

const formatCurrency = (amount?: number, currency?: string): string => {
  if (typeof amount !== "number" || !currency) {
    return EMPTY_TEXT;
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
};

const getStatusLabel = (status?: ContractStatus): string => {
  if (!status) {
    return EMPTY_TEXT;
  }

  const statusLabels: Record<ContractStatus, string> = {
    active: "Contract Active",
    pending: "Contract Pending",
    completed: "Contract Completed",
    cancelled: "Contract Cancelled",
  };

  return statusLabels[status];
};

const getStatusClasses = (status?: ContractStatus): string => {
  if (!status) {
    return "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400";
  }

  const statusClasses: Record<ContractStatus, string> = {
    active:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-400",

    pending:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-400",

    completed:
      "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-400",

    cancelled:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400",
  };

  return statusClasses[status];
};

/* ============================================================
   DUMMY DATA
   ------------------------------------------------------------
   TEMPORARY: This is placeholder data only, wired in directly
   so the page renders fully without depending on an API yet.
   BACKEND TODO: once the contract API is ready, replace this
   constant + the accept/reject handlers below with real
   network calls (fetch on mount, POST on accept/reject) and
   drop this constant entirely.
============================================================ */

const DUMMY_CONTRACT: ContractData = {
  contractNumber: "CT-2026-000124",
  quotationNumber: "QT-2026-000891",
  status: "pending",

  contractStartDate: "01 Sep 2026",
  contractDuration: "12 Months",
  contractEndDate: "31 Aug 2027",

  customer: {
    name: "Vantage Infra Projects Pvt. Ltd.",
    email: "procurement@vantageinfra.com",
    phone: "+91 98765 43210",
    address: "Plot No. 14, Sector 44, Gurugram, Haryana 122003",
  },

  supplier: {
    name: "HME Machine Health Monitoring Services",
    email: "contracts@hme-monitoring.com",
    phone: "+91 11 4567 8900",
    address: "Tower B, DLF Cyber City, Gurugram, Haryana 122002",
  },

  planName: "Predictive Health Monitoring — Standard Plan",
  planDescription:
    "Continuous condition monitoring for rotating and static machinery, including vibration analysis, thermal imaging, oil analysis alerts and monthly health reports across all listed sites.",

  sites: ["Gurugram Manufacturing Unit", "Manesar Assembly Plant", "Neemrana Warehouse"],

  machines: [
    { name: "CNC Lathe M-101", type: "CNC Machine", site: "Gurugram Manufacturing Unit" },
    { name: "Hydraulic Press H-220", type: "Hydraulic Press", site: "Manesar Assembly Plant" },
    { name: "Conveyor Motor C-305", type: "Induction Motor", site: "Neemrana Warehouse" },
    { name: "Air Compressor AC-410", type: "Rotary Compressor", site: "Gurugram Manufacturing Unit" },
  ],

  pricing: {
    planAmount: 480000,
    applicableTax: 86400,
    additionalCharges: 15000,
    totalContractValue: 581400,
    currency: "INR",
  },

  signatures: [
    {
      partyName: "Vantage Infra Projects Pvt. Ltd.",
      role: "Customer",
      signed: false,
      signedDate: EMPTY_TEXT,
    },
    {
      partyName: "HME Machine Health Monitoring Services",
      role: "Supplier",
      signed: true,
      signedDate: "18 Aug 2026",
    },
  ],

  document: {
    fileName: "HME-Contract-CT-2026-000124.pdf",
    version: "v1.0",
    fileType: "PDF Document",
  },
};

/* ============================================================
   ACCEPT / REJECT HANDLERS
   ------------------------------------------------------------
   BACKEND TODO: replace the body of each function below with
   the real network call once the contract API is connected.
============================================================ */

const acceptContractById = async (contractId: string): Promise<void> => {
  // BACKEND TODO:
  // await apiClient.post(`/contracts/${contractId}/accept`);
  await new Promise((resolve) => setTimeout(resolve, 600));
};

const rejectContractById = async (contractId: string): Promise<void> => {
  // BACKEND TODO:
  // await apiClient.post(`/contracts/${contractId}/reject`);
  await new Promise((resolve) => setTimeout(resolve, 600));
};

/* ============================================================
   PDF HELPERS
   ------------------------------------------------------------
   Lightweight browser-side PDF generator built from the fetched
   ContractData. When a backend document URL/API is available,
   this can be replaced with the actual document endpoint.
============================================================ */

const escapePdfText = (value: string): string => {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
};

const createContractPdf = (contract: ContractData): Blob => {
  const lines: string[] = [
    "HME MACHINE HEALTH MONITORING CONTRACT",
    "",
    `Contract Number: ${contract.contractNumber}`,
    `Quotation Number: ${contract.quotationNumber}`,
    `Status: ${getStatusLabel(contract.status)}`,
    "",
    "CONTRACT PERIOD",
    `Start Date: ${contract.contractStartDate}`,
    `Duration: ${contract.contractDuration}`,
    `End Date: ${contract.contractEndDate}`,
    "",
    "CUSTOMER",
    contract.customer.name,
    contract.customer.email,
    contract.customer.phone,
    contract.customer.address,
    "",
    "SUPPLIER",
    contract.supplier.name,
    contract.supplier.email,
    contract.supplier.phone,
    contract.supplier.address,
    "",
    "MONITORING PLAN",
    contract.planName,
    contract.planDescription,
    "",
    "MONITORING SITES",
    ...contract.sites.map((site) => `- ${site}`),
    "",
    "MONITORED MACHINES",
    ...contract.machines.map(
      (machine) => `- ${machine.name} | ${machine.type} | ${machine.site}`,
    ),
    "",
    "COMMERCIAL DETAILS",
    `Monitoring Plan Amount: ${contract.pricing.currency} ${contract.pricing.planAmount}`,
    `Applicable Tax: ${contract.pricing.currency} ${contract.pricing.applicableTax}`,
    `Additional Charges: ${contract.pricing.currency} ${contract.pricing.additionalCharges}`,
    `Total Contract Value: ${contract.pricing.currency} ${contract.pricing.totalContractValue}`,
    "",
    "DIGITAL SIGNATURES",
    ...contract.signatures.map(
      (signature) =>
        `${signature.role}: ${signature.partyName} | ${
          signature.signed ? `Signed on ${signature.signedDate}` : "Pending Signature"
        }`,
    ),
  ];

  const pageWidth = 595;
  const pageHeight = 842;
  const leftMargin = 50;
  const topPosition = 790;
  const fontSize = 10;
  const lineHeight = 15;
  const linesPerPage = 48;

  const pages: string[][] = [];

  for (let index = 0; index < lines.length; index += linesPerPage) {
    pages.push(lines.slice(index, index + linesPerPage));
  }

  const objects: string[] = [];

  objects.push("<< /Type /Catalog /Pages 2 0 R >>");

  objects.push(
    "<< /Type /Pages /Kids [" +
      pages.map((_, index) => `${4 + index * 2} 0 R`).join(" ") +
      `] /Count ${pages.length} >>`,
  );

  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

  pages.forEach((pageLines, pageIndex) => {
    const pageObjectNumber = 4 + pageIndex * 2;
    const contentObjectNumber = pageObjectNumber + 1;

    const textCommands: string[] = [];

    textCommands.push("BT", `/F1 ${fontSize} Tf`, `${leftMargin} ${topPosition} Td`);

    pageLines.forEach((line, lineIndex) => {
      if (lineIndex > 0) {
        textCommands.push(`0 -${lineHeight} Td`);
      }

      textCommands.push(`(${escapePdfText(line)}) Tj`);
    });

    textCommands.push("ET");

    const stream = textCommands.join("\n");

    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`,
    );

    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  });

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];

  objects.forEach((object, index) => {
    offsets[index + 1] = pdf.length;
    pdf += `${index + 1} 0 obj\n`;
    pdf += `${object}\n`;
    pdf += "endobj\n";
  });

  const xrefPosition = pdf.length;

  pdf += `xref\n`;
  pdf += `0 ${objects.length + 1}\n`;
  pdf += `0000000000 65535 f \n`;

  for (let index = 1; index <= objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n`;
  pdf += `<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n`;
  pdf += `${xrefPosition}\n`;
  pdf += "%%EOF";

  return new Blob([pdf], { type: "application/pdf" });
};

/* ============================================================
   REUSABLE SECTION
============================================================ */

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, icon, children }) => {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
          {icon}
        </div>

        <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-base">
          {title}
        </h2>
      </div>

      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
};

/* ============================================================
   PARTY CARD
============================================================ */

interface PartyCardProps {
  title: string;
  party?: Party;
  icon: React.ReactNode;
}

const PartyCard: React.FC<PartyCardProps> = ({ title, party, icon }) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-950/40">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-blue-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-blue-400 dark:ring-slate-800">
          {icon}
        </div>

        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {title}
        </h3>
      </div>

      <div className="space-y-3.5">
        <p className="text-base font-bold text-slate-900 dark:text-slate-100">
          {displayText(party?.name)}
        </p>

        <div className="flex items-start gap-2.5">
          <Mail size={15} className="mt-0.5 shrink-0 text-slate-400" />
          <p className="break-all text-sm text-slate-600 dark:text-slate-300">
            {displayText(party?.email)}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Phone size={15} className="shrink-0 text-slate-400" />
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {displayText(party?.phone)}
          </p>
        </div>

        <div className="flex items-start gap-2.5">
          <MapPin size={15} className="mt-0.5 shrink-0 text-slate-400" />
          <p className="text-sm leading-5 text-slate-600 dark:text-slate-300">
            {displayText(party?.address)}
          </p>
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   DETAIL ROW
============================================================ */

interface DetailRowProps {
  label: string;
  children: React.ReactNode;
}

const DetailRow: React.FC<DetailRowProps> = ({ label, children }) => {
  return (
    <div className="grid grid-cols-1 gap-1 border-b border-slate-100 py-3.5 last:border-b-0 dark:border-slate-800 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-6">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </span>

      <div className="min-w-0 text-sm font-semibold text-slate-800 dark:text-slate-200">
        {children}
      </div>
    </div>
  );
};

/* ============================================================
   SIGNATURE CARD
============================================================ */

interface SignatureCardProps {
  signature: ContractSignature;
  signatureData?: string;
  onSave?: (signature: string) => void;
}

const SignatureCard: React.FC<SignatureCardProps> = ({
  signature,
  signatureData,
  onSave,
}) => {
  const isCustomer = signature.role.toLowerCase() === "customer";
  const isSigned = signature.signed || Boolean(signatureData);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950/30">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {displayText(signature.role)}
          </p>

          <p className="mt-1 truncate text-sm font-bold text-slate-900 dark:text-slate-100">
            {displayText(signature.partyName)}
          </p>
        </div>

        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
            isSigned
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
              : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
          }`}
        >
          <CheckCircle2 size={13} />
          {isSigned ? "Signed" : "Pending"}
        </span>
      </div>

      {isCustomer && !isSigned && onSave ? (
        <DigitalSignature onSave={onSave} />
      ) : (
        <div className="flex min-h-[100px] items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
          {signatureData ? (
            <img
              src={signatureData}
              alt={`${signature.partyName} digital signature`}
              className="max-h-[90px] max-w-[90%] object-contain"
            />
          ) : (
            <div className="text-center">
              <div
                className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full ${
                  isSigned
                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                    : "bg-slate-100 text-slate-400 dark:bg-slate-800"
                }`}
              >
                <ShieldCheck size={20} />
              </div>

              <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                {isSigned ? "Digitally Signed" : "Signature Pending"}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
        <span className="text-xs font-medium text-slate-400">Signed Date</span>

        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          {signatureData ? "Awaiting backend confirmation" : displayText(signature.signedDate)}
        </span>
      </div>
    </div>
  );
};

/* ============================================================
   MAIN COMPONENT
============================================================ */

const QuotationContract: React.FC = () => {
  const [contract, setContract] = useState<ContractData>(DUMMY_CONTRACT);
  const [customerSignature, setCustomerSignature] = useState<string>();
  const [approvalRemark, setApprovalRemark] = useState("");
  const [actionState, setActionState] = useState<"idle" | "accepting" | "rejecting">(
    "idle",
  );

  const handleSaveCustomerSignature = (signature: string): void => {
    setCustomerSignature(signature);
  };

  const createPdfBlob = (): Blob => {
    const documentSignatures = contract.signatures.map((signature) => {
      if (signature.role.toLowerCase() !== "customer" || !customerSignature) {
        return signature;
      }

      return {
        ...signature,
        signed: true,
        signedDate: new Date().toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
      };
    });

    return createContractPdf({
      ...contract,
      signatures: documentSignatures,
    });
  };

  const handleViewContract = (): void => {
    const pdfBlob = createPdfBlob();
    const pdfUrl = URL.createObjectURL(pdfBlob);

    window.open(pdfUrl, "_blank", "noopener,noreferrer");

    window.setTimeout(() => {
      URL.revokeObjectURL(pdfUrl);
    }, 60_000);
  };

  const handleDownloadContract = (): void => {
    const pdfBlob = createPdfBlob();
    const pdfUrl = URL.createObjectURL(pdfBlob);
    const anchor = document.createElement("a");

    anchor.href = pdfUrl;
    anchor.download = contract.document.fileName;

    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    window.setTimeout(() => {
      URL.revokeObjectURL(pdfUrl);
    }, 1_000);
  };

  const handleAcceptContract = async (): Promise<void> => {
    setActionState("accepting");

    try {
      await acceptContractById(contract.contractNumber);
      setContract((previous) => ({ ...previous, status: "active" }));
      toast.success("Contract accepted successfully.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to accept the contract.",
      );
    } finally {
      setActionState("idle");
    }
  };

  const handleRejectContract = async (): Promise<void> => {
    setActionState("rejecting");

    try {
      await rejectContractById(contract.contractNumber);
      setContract((previous) => ({ ...previous, status: "cancelled" }));
      toast.success("Contract has been rejected.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to reject the contract.",
      );
    } finally {
      setActionState("idle");
    }
  };

  const sites = contract.sites;
  const machines = contract.machines;
  const signatures = contract.signatures;
  const actionsDisabled = actionState !== "idle";

  return (
    <div className="w-full min-w-0 pb-8">
      <div className="mx-auto w-full max-w-[1200px] space-y-5">
        {/* ==================================================
            CONTRACT HEADER
        ================================================== */}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-100 px-5 py-5 dark:border-slate-800 sm:px-6 sm:py-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="mb-2 flex items-center gap-2">
                  <FileSignature
                    size={18}
                    className="shrink-0 text-blue-600 dark:text-blue-400"
                  />

                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Contract
                  </span>
                </div>

                <h1 className="break-all text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-2xl">
                  {displayText(contract.contractNumber)}
                </h1>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Quotation:{" "}
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {displayText(contract.quotationNumber)}
                  </span>
                </p>
              </div>

              <div
                className={`inline-flex w-fit shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 ${getStatusClasses(
                  contract.status,
                )}`}
              >
                <span className="h-2.5 w-2.5 rounded-full bg-current" />

                <span className="text-xs font-bold sm:text-sm">
                  {getStatusLabel(contract.status)}
                </span>
              </div>
            </div>
          </div>

          {/* CONTRACT PERIOD */}

          <div className="grid grid-cols-1 divide-y divide-slate-100 dark:divide-slate-800 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <div className="flex items-center gap-3 px-5 py-4 sm:px-6">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                <CalendarDays size={17} />
              </div>

              <div>
                <p className="text-xs font-medium text-slate-400">Contract Start</p>

                <p className="mt-0.5 text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {displayText(contract.contractStartDate)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 px-5 py-4 sm:px-6">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                <CalendarDays size={17} />
              </div>

              <div>
                <p className="text-xs font-medium text-slate-400">Contract Duration</p>

                <p className="mt-0.5 text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {displayText(contract.contractDuration)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 px-5 py-4 sm:px-6">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                <CalendarDays size={17} />
              </div>

              <div>
                <p className="text-xs font-medium text-slate-400">Contract End</p>

                <p className="mt-0.5 text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {displayText(contract.contractEndDate)}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ==================================================
            PARTIES
        ================================================== */}

        <Section title="Parties" icon={<Building2 size={18} />}>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <PartyCard
              title="Customer"
              party={contract.customer}
              icon={<UserRound size={16} />}
            />

            <PartyCard
              title="HME / Supplier"
              party={contract.supplier}
              icon={<Building2 size={16} />}
            />
          </div>
        </Section>

        {/* ==================================================
            HEALTH MONITORING PLAN
        ================================================== */}

        <Section title="Health Monitoring Plan" icon={<MonitorCog size={18} />}>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            <DetailRow label="Plan">{displayText(contract.planName)}</DetailRow>

            <DetailRow label="Description">
              <span className="font-normal leading-6 text-slate-600 dark:text-slate-300">
                {displayText(contract.planDescription)}
              </span>
            </DetailRow>

            <DetailRow label="Contract Duration">
              {displayText(contract.contractDuration)}
            </DetailRow>

            <DetailRow label="Monitoring Sites">
              {sites.length > 0 ? (
                <div className="space-y-2">
                  {sites.map((site) => (
                    <div key={site} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />

                      <span className="font-normal text-slate-700 dark:text-slate-300">
                        {site}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="font-normal text-slate-400">{EMPTY_TEXT}</span>
              )}
            </DetailRow>
          </div>
        </Section>

        {/* ==================================================
            MONITORED MACHINES
        ================================================== */}

        <Section title="Monitored Machines" icon={<MonitorCog size={18} />}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-400">
                    Machine
                  </th>

                  <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-400">
                    Machine Type
                  </th>

                  <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-400">
                    Monitoring Site
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {machines.length > 0 ? (
                  machines.map((machine) => (
                    <tr
                      key={`${machine.name}-${machine.site}`}
                      className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-3 py-4 text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {machine.name}
                      </td>

                      <td className="px-3 py-4 text-sm text-slate-600 dark:text-slate-300">
                        {machine.type}
                      </td>

                      <td className="px-3 py-4 text-sm text-slate-600 dark:text-slate-300">
                        {machine.site}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-3 py-6 text-center text-sm text-slate-400"
                    >
                      {EMPTY_TEXT}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Section>

        {/* ==================================================
            COMMERCIAL DETAILS
        ================================================== */}

        <Section title="Commercial Details" icon={<ReceiptText size={18} />}>
          <div className="overflow-x-auto">
            <div className="min-w-[520px]">
              <div className="grid grid-cols-[1fr_auto] border-b border-slate-200 px-1 pb-3 dark:border-slate-800">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Description
                </span>

                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Amount
                </span>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                <div className="grid grid-cols-[1fr_auto] items-center px-1 py-4">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Health Monitoring Plan
                  </span>

                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {formatCurrency(
                      contract.pricing.planAmount,
                      contract.pricing.currency,
                    )}
                  </span>
                </div>

                <div className="grid grid-cols-[1fr_auto] items-center px-1 py-4">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Applicable Tax
                  </span>

                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {formatCurrency(
                      contract.pricing.applicableTax,
                      contract.pricing.currency,
                    )}
                  </span>
                </div>

                <div className="grid grid-cols-[1fr_auto] items-center px-1 py-4">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Additional Charges
                  </span>

                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {formatCurrency(
                      contract.pricing.additionalCharges,
                      contract.pricing.currency,
                    )}
                  </span>
                </div>

                <div className="grid grid-cols-[1fr_auto] items-center px-1 pt-5">
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Total Contract Value
                  </span>

                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {formatCurrency(
                      contract.pricing.totalContractValue,
                      contract.pricing.currency,
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* ==================================================
            DIGITAL SIGNATURES
        ================================================== */}

        <Section title="Digital Signatures" icon={<ShieldCheck size={18} />}>
          {signatures.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {signatures.map((signature) => {
                const isCustomer = signature.role.toLowerCase() === "customer";

                return (
                  <SignatureCard
                    key={`${signature.role}-${signature.partyName}`}
                    signature={signature}
                    signatureData={isCustomer ? customerSignature : undefined}
                    onSave={isCustomer ? handleSaveCustomerSignature : undefined}
                  />
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-400">{EMPTY_TEXT}</p>
          )}
        </Section>

        {/* ==================================================
            CONTRACT APPROVAL
            Visible only while the contract is pending. Includes
            a description of what accepting/rejecting means, an
            optional remark input, and the action buttons — kept
            as its own section, separate from Contract Document.
        ================================================== */}

        {contract.status === "pending" && (
          <Section title="Contract Approval" icon={<AlertCircle size={18} />}>
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                <AlertCircle size={18} />
              </div>

              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Contract Approval Required
                </p>

                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Please review the contract terms above before proceeding. Accepting
                  this contract will activate the {displayText(contract.planName)} for{" "}
                  {formatCurrency(
                    contract.pricing.totalContractValue,
                    contract.pricing.currency,
                  )}{" "}
                  and monitoring will begin for the listed sites and machines.
                  Rejecting it will cancel this agreement and no services will be
                  provisioned.
                </p>
              </div>
            </div>

            <div className="mt-5">
              <label
                htmlFor="approval-remark"
                className="text-xs font-semibold uppercase tracking-wide text-slate-400"
              >
                Add a Note (Optional)
              </label>

              <textarea
                id="approval-remark"
                value={approvalRemark}
                onChange={(event) => setApprovalRemark(event.target.value)}
                placeholder="Add a comment for this decision, e.g. reason for rejection or any special instructions..."
                rows={3}
                className="mt-2 w-full resize-none rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:placeholder:text-slate-500"
              />
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleRejectContract}
                disabled={actionsDisabled}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 text-sm font-semibold text-red-600 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/50 dark:bg-slate-900 dark:text-red-400 dark:hover:bg-red-950/30"
              >
                {actionState === "rejecting" ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <XCircle size={16} />
                )}
                Reject Contract
              </button>

              <button
                type="button"
                onClick={handleAcceptContract}
                disabled={actionsDisabled}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionState === "accepting" ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={16} />
                )}
                Accept Contract
              </button>
            </div>
          </Section>
        )}

        {/* ==================================================
            CONTRACT DOCUMENT
        ================================================== */}

        <Section title="Contract Document" icon={<FileText size={18} />}>
          <div className="flex flex-col gap-5 rounded-xl border border-slate-200 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-950/40 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-red-500 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
                <FileText size={24} />
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100 sm:text-base">
                  {displayText(contract.document.fileName)}
                </p>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {displayText(contract.document.fileType)} • Version{" "}
                  {displayText(contract.document.version)}
                </p>
              </div>
            </div>

            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <button
                type="button"
                onClick={handleViewContract}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
              >
                <Eye size={16} />
                View Contract
              </button>

              <button
                type="button"
                onClick={handleDownloadContract}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-500"
              >
                <Download size={16} />
                Download PDF
              </button>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
};

export default QuotationContract;