import React, { useEffect, useRef, useState } from "react";
import { showErrorToast } from "../../utils/toastUtils";
import {
  AlertCircle,
  Building2,
  CalendarDays,
  CheckCircle2,
  Download,
  Eraser,
  Eye,
  FileSignature,
  FileText,
  Loader2,
  Mail,
  MonitorCog,
  Phone,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  UserRound,
  X,
  XCircle,
} from "lucide-react";
import {
  getContractsList,
  getContractPdfBlobUrl,
  downloadContractPdf,
  extractContractError,
  type ContractStatus,
} from "../../services/SuperAdmin/quotation/contractService";

import {
  acceptContract,
  rejectContract,
  type Contract,
} from "../../services/companyadmin/Quotations/ContractActionService";

/* ============================================================
   HELPERS
============================================================ */

const EMPTY_TEXT = "—";
const API_ORIGIN = new URL(import.meta.env.VITE_API_BASE_URL).origin;

const resolveFileUrl = (path?: string | null): string | undefined => {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
};

const displayText = (value?: string | null): string =>
  value && value.trim().length > 0 ? value : EMPTY_TEXT;

const formatCurrency = (amount?: number | string): string => {
  const numeric = typeof amount === "string" ? Number(amount) : amount;

  if (typeof numeric !== "number" || Number.isNaN(numeric)) {
    return EMPTY_TEXT;
  }

  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  }).format(numeric);
};

const formatDate = (value?: string | null): string => {
  if (!value) return EMPTY_TEXT;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return EMPTY_TEXT;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getStatusLabel = (status?: ContractStatus): string => {
  if (!status) return EMPTY_TEXT;
  const labels: Record<ContractStatus, string> = {
    SENT: "Sent — Awaiting Response",
    ACCEPTED: "Contract Active",
    REJECTED: "Contract Rejected",
    EXPIRED: "Contract Expired",
  };
  return labels[status];
};

const getStatusClasses = (status?: ContractStatus): string => {
  if (!status) {
    return "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400";
  }
  const classes: Record<ContractStatus, string> = {
    SENT: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-400",
    ACCEPTED:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-400",
    REJECTED:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400",
    EXPIRED:
      "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400",
  };
  return classes[status];
};

const computeTotal = (contract: Contract): number => {
  const q = contract.quotation;
  const base =
    Number(q.implementationFee || 0) +
    Number(q.monthlySiteLicence || 0) +
    Number(q.additionalMachineCharge || 0);
  const optionalTotal = (q.optionalServices || []).reduce(
    (sum, s) => sum + (Number(s.price) || 0),
    0,
  );
  return base + optionalTotal;
};

/* ============================================================
   REUSABLE SECTION / DETAIL ROW
============================================================ */

const Section: React.FC<{
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, icon, children }) => (
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

const DetailRow: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div className="grid grid-cols-1 gap-1 border-b border-slate-100 py-3.5 last:border-b-0 dark:border-slate-800 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-6">
    <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
      {label}
    </span>
    <div className="min-w-0 text-sm font-semibold text-slate-800 dark:text-slate-200">
      {children}
    </div>
  </div>
);

/* ============================================================
   MAIN COMPONENT
============================================================ */

const QuotationContract: React.FC = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const contract = contracts[0] ?? null;

  // Accept/Reject action state
  const [showAcceptConfirm, setShowAcceptConfirm] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [signedBy, setSignedBy] = useState("");
  const [acceptanceDescription, setAcceptanceDescription] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [signatureConfirmed, setSignatureConfirmed] = useState(false);
  const [signedSignatureLoadFailed, setSignedSignatureLoadFailed] =
    useState(false);

  const [pdfBusyAction, setPdfBusyAction] = useState<
    "view" | "download" | null
  >(null);

  const [pdfViewer, setPdfViewer] = useState<{
    url: string;
    title: string;
  } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getContractsList({ signal: controller.signal });
        if (!data || data.length === 0) {
          setError("Contract not found.");
        } else {
          setContracts([...data] as unknown as Contract[]);
        }
      } catch (err) {
        setError(extractContractError(err) ?? "Failed to load contract.");
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    return () => {
      if (pdfViewer) {
        window.URL.revokeObjectURL(pdfViewer.url);
      }
    };
  }, [pdfViewer]);

  /* ------------------------------------------------------------
     SIGNATURE CANVAS — mouse/touch drawing helpers
  ------------------------------------------------------------ */
  const getCanvasPoint = (
    canvas: HTMLCanvasElement,
    clientX: number,
    clientY: number,
  ) => {
    const rect = canvas.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDrawing = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    isDrawingRef.current = true;
    const { x, y } = getCanvasPoint(canvas, clientX, clientY);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const drawTo = (clientX: number, clientY: number) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCanvasPoint(canvas, clientX, clientY);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1d4ed8";
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    setSignatureDataUrl(null);
    setSignatureConfirmed(false);
  };

  // "OK" button — locks the drawn strokes in as a real signature image
  const handleConfirmSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) {
      showErrorToast("Please draw your signature first.");
      return;
    }
    const url = canvas.toDataURL("image/png");
    setSignatureDataUrl(url);
    setSignatureConfirmed(true);
  };

  const handleEditSignature = () => {
    setSignatureConfirmed(false);
  };

  const getSignatureBlob = async (): Promise<Blob | null> => {
    if (signatureDataUrl) {
      const res = await fetch(signatureDataUrl);
      return await res.blob();
    }
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return new Promise((resolve) =>
      canvas.toBlob((blob) => resolve(blob), "image/png"),
    );
  };

  /* ------------------------------------------------------------
     ACCEPT — validate on page, then open confirm popup
  ------------------------------------------------------------ */
  const handleOpenAcceptConfirm = () => {
    if (!signatureConfirmed) {
      showErrorToast(
        "Please confirm your signature (tap OK) before accepting.",
      );
      return;
    }
    if (!signedBy.trim()) {
      showErrorToast("Please enter the signer's name.");
      return;
    }
    setShowAcceptConfirm(true);
  };

  const handleConfirmAccept = async () => {
    if (!contract) return;

    const signatureBlob = await getSignatureBlob();
    if (!signatureBlob) {
      showErrorToast("Could not capture signature. Please try again.");
      return;
    }

    setIsSubmitting(true);
    try {
      const envelope = await acceptContract(contract.id, {
        signatureFile: signatureBlob,
        signedBy: signedBy.trim(),
        acceptanceDescription: acceptanceDescription.trim() || undefined,
      });

      setContracts((prev) =>
        prev.map((c) => (c.id === envelope.data.id ? envelope.data : c)),
      );
      setShowAcceptConfirm(false);
      setSignedBy("");
      setAcceptanceDescription("");
      setSignatureDataUrl(null);
      setSignatureConfirmed(false);
      clearSignature();
    } catch {
      // apiHandler already shows the backend error toast
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ------------------------------------------------------------
     REJECT — requires rejectionReason
  ------------------------------------------------------------ */
  const handleSubmitReject = async () => {
    if (!contract) return;

    if (!rejectionReason.trim()) {
      showErrorToast("Please provide a rejection reason.");
      return;
    }

    setIsSubmitting(true);
    try {
      const envelope = await rejectContract(contract.id, {
        rejectionReason: rejectionReason.trim(),
      });

      setContracts((prev) =>
        prev.map((c) => (c.id === envelope.data.id ? envelope.data : c)),
      );
      setShowRejectModal(false);
      setRejectionReason("");
    } catch {
      // apiHandler already shows the backend error toast
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ------------------------------------------------------------
   CONTRACT PDF — view (blob preview) & download
------------------------------------------------------------ */
  const handleViewContractPdf = async () => {
    if (!contract) return;
    setPdfBusyAction("view");
    try {
      const url = await getContractPdfBlobUrl(contract.id);
      setPdfViewer({ url, title: contract.contractNumber });
    } catch {
    } finally {
      setPdfBusyAction(null);
    }
  };

  const handleDownloadContractPdf = async () => {
    if (!contract) return;
    setPdfBusyAction("download");
    try {
      await downloadContractPdf(contract.id, `${contract.contractNumber}.pdf`);
    } catch {
    } finally {
      setPdfBusyAction(null);
    }
  };

  const closePdfViewer = () => {
    setPdfViewer((current) => {
      if (current) {
        window.URL.revokeObjectURL(current.url);
      }
      return null;
    });
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center gap-2 text-slate-500">
        <Loader2 className="animate-spin" size={20} />
        Loading contract...
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 text-slate-500">
        <AlertCircle size={24} />
        <p>{error ?? "Contract not found."}</p>
      </div>
    );
  }

  const q = contract.quotation;
  const total = computeTotal(contract);
  const isPendingResponse = contract.status === "SENT";

  return (
    <div className="w-full min-w-0 pb-8">
      <div className="mx-auto w-full max-w-[1200px] space-y-5">
        {/* HEADER */}
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
                    {displayText(q.quotationNumber)}
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

          <div className="grid grid-cols-1 divide-y divide-slate-100 dark:divide-slate-800 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <div className="flex items-center gap-3 px-5 py-4 sm:px-6">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                <CalendarDays size={17} />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400">
                  Contract Start
                </p>
                <p className="mt-0.5 text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {formatDate(contract.startDate)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-5 py-4 sm:px-6">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                <CalendarDays size={17} />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400">
                  Contract End
                </p>
                <p className="mt-0.5 text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {formatDate(contract.endDate)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-5 py-4 sm:px-6">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                <FileText size={17} />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400">PO Number</p>
                <p className="mt-0.5 text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {displayText(contract.poNumber)}
                </p>
              </div>
            </div>
          </div>
        </section>
        {/* CUSTOMER */}
        <Section title="Customer" icon={<Building2 size={18} />}>
          <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-5 dark:border-slate-800 dark:bg-slate-950/40">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-blue-600 ring-1 ring-blue-100 dark:bg-slate-900 dark:text-blue-400 dark:ring-slate-800">
                <UserRound size={16} />
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Company Details
              </h3>
            </div>
            <div className="space-y-3.5">
              <p className="text-base font-bold text-slate-900 dark:text-slate-100">
                {displayText(q.companyName)}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Contact: {displayText(q.contactPerson)}
              </p>
              <div className="flex items-start gap-2.5">
                <Mail size={15} className="mt-0.5 shrink-0 text-blue-400" />
                <p className="break-all text-sm text-slate-600 dark:text-slate-300">
                  {displayText(q.contactEmail)}
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone size={15} className="shrink-0 text-blue-400" />
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {displayText(q.contactPhone)}
                </p>
              </div>
            </div>
          </div>
        </Section>
        <Section title="Quotation Summary" icon={<MonitorCog size={18} />}>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            <DetailRow label="Quotation Number">
              {displayText(q.quotationNumber)}
            </DetailRow>
            <DetailRow label="Total Machines">{q.machineCount}</DetailRow>
            <DetailRow label="Licensed Machine Allowance">
              {q.licensedMachineAllowance}
            </DetailRow>
            <DetailRow label="Payment Terms">
              {displayText(q.paymentTerms)}
            </DetailRow>
            <DetailRow label="Description">
              <span className="font-normal leading-6 text-slate-600 dark:text-slate-300">
                {displayText(contract.description)}
              </span>
            </DetailRow>
          </div>
        </Section>
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
                    Implementation Fee
                  </span>
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {formatCurrency(q.implementationFee)}
                  </span>
                </div>
                <div className="grid grid-cols-[1fr_auto] items-center px-1 py-4">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Monthly Site Licence
                  </span>
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {formatCurrency(q.monthlySiteLicence)}
                  </span>
                </div>
                <div className="grid grid-cols-[1fr_auto] items-center px-1 py-4">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Additional Machine Charge
                  </span>
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {formatCurrency(q.additionalMachineCharge)}
                  </span>
                </div>

                {(q.optionalServices || []).map((service) => (
                  <div
                    key={service.serviceId}
                    className="grid grid-cols-[1fr_auto] items-center px-1 py-4"
                  >
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {service.name}
                    </span>
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {formatCurrency(service.price)}
                    </span>
                  </div>
                ))}

                <div className="grid grid-cols-[1fr_auto] items-center px-1 pt-5">
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Total Contract Value
                  </span>
                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Section>
        \
        <Section title="Digital Signatures" icon={<ShieldCheck size={18} />}>
          {contract.status === "ACCEPTED" ? (
            <div className="space-y-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1.5">
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {displayText(contract.signedBy)}
                  </p>
                  <p className="text-xs text-slate-500">
                    Signed on {formatDate(contract.signedAt)}
                  </p>
                  {contract.acceptanceDescription && (
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                      {contract.acceptanceDescription}
                    </p>
                  )}
                </div>
                {contract.signatureUrl && !signedSignatureLoadFailed ? (
                  <img
                    src={resolveFileUrl(contract.signatureUrl)}
                    alt="Signature"
                    onError={() => setSignedSignatureLoadFailed(true)}
                    className="h-20 w-40 rounded-lg border border-blue-100 bg-white object-contain dark:border-slate-800"
                  />
                ) : contract.signatureUrl ? (
                  <div className="flex h-20 w-40 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-center text-xs text-slate-400 dark:border-slate-800 dark:bg-slate-900">
                    Signature image unavailable
                  </div>
                ) : null}
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/60 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
                <CheckCircle2
                  size={18}
                  className="mt-0.5 shrink-0 text-blue-600 dark:text-blue-400"
                />
                <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                  This contract has been digitally signed and accepted. A
                  confirmation record has been saved, and both parties can now
                  proceed as per the agreed terms.
                </p>
              </div>
            </div>
          ) : contract.status === "REJECTED" ? (
            <div className="space-y-1.5">
              <p className="text-sm font-bold text-red-700 dark:text-red-400">
                Rejected by {displayText(contract.rejectedBy)}
              </p>
              <p className="text-xs text-slate-500">
                Rejected on {formatDate(contract.rejectedAt)}
              </p>
              {contract.rejectionReason && (
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  {contract.rejectionReason}
                </p>
              )}
            </div>
          ) : isPendingResponse ? (
            <div className="space-y-4">
              <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                Sign below to accept for{" "}
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {formatCurrency(total)}
                </span>
                , or reject with a reason.
              </p>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Signature
                  </label>
                  {!signatureConfirmed && (
                    <button
                      type="button"
                      onClick={clearSignature}
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
                    >
                      <Eraser size={12} />
                      Clear
                    </button>
                  )}
                </div>

                {signatureConfirmed && signatureDataUrl ? (
                  <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                    <img
                      src={signatureDataUrl}
                      alt="Your signature"
                      className="h-16 w-40 shrink-0 rounded-lg border border-slate-200 bg-white object-contain dark:border-slate-700"
                    />
                    <div className="flex flex-1 items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 size={14} />
                        Signature confirmed
                      </span>
                      <button
                        type="button"
                        onClick={handleEditSignature}
                        className="text-xs font-medium text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <canvas
                      ref={canvasRef}
                      width={800}
                      height={110}
                      className="w-full touch-none rounded-lg border-2 border-dashed border-blue-200 bg-blue-50/30 dark:border-slate-700 dark:bg-slate-950"
                      onMouseDown={(e) => startDrawing(e.clientX, e.clientY)}
                      onMouseMove={(e) => drawTo(e.clientX, e.clientY)}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={(e) => {
                        const t = e.touches[0];
                        startDrawing(t.clientX, t.clientY);
                      }}
                      onTouchMove={(e) => {
                        const t = e.touches[0];
                        drawTo(t.clientX, t.clientY);
                      }}
                      onTouchEnd={stopDrawing}
                    />
                    <div className="flex items-center justify-between pt-1">
                      <p className="text-xs text-slate-400">
                        Draw your signature above.
                      </p>
                      <button
                        type="button"
                        onClick={handleConfirmSignature}
                        className="inline-flex h-7 items-center justify-center gap-1 rounded-md bg-blue-600 px-3 text-xs font-bold text-white transition hover:bg-blue-700"
                      >
                        OK
                      </button>
                    </div>
                  </>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Signed By
                  </label>
                  <input
                    type="text"
                    value={signedBy}
                    onChange={(e) => setSignedBy(e.target.value)}
                    placeholder="Full name and title"
                    className="w-full rounded-lg border border-slate-200 p-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Description (optional)
                  </label>
                  <textarea
                    rows={1}
                    value={acceptanceDescription}
                    onChange={(e) => setAcceptanceDescription(e.target.value)}
                    placeholder="Add any notes about this acceptance..."
                    className="w-full resize-none rounded-lg border border-slate-200 p-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 dark:border-slate-800 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(true)}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-900/50 dark:bg-slate-900 dark:text-red-400 dark:hover:bg-red-950/30"
                >
                  <XCircle size={15} />
                  Reject Contract
                </button>
                <button
                  type="button"
                  onClick={handleOpenAcceptConfirm}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  <CheckCircle2 size={15} />
                  Accept Contract
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
              <AlertCircle size={16} />
              Signature will appear here once the contract is accepted.
            </div>
          )}
        </Section>
        {/* CONTRACT DOCUMENT */}
        <Section title="Contract Document" icon={<FileText size={18} />}>
          {contract.status === "ACCEPTED" ? (
            <div className="space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  View the signed contract PDF, or download a copy for your
                  records.
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleViewContractPdf()}
                    disabled={pdfBusyAction !== null}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    {pdfBusyAction === "view" ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <Eye size={14} />
                    )}
                    View PDF
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleDownloadContractPdf()}
                    disabled={pdfBusyAction !== null}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {pdfBusyAction === "download" ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <Download size={14} />
                    )}
                    Download PDF
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
              <AlertCircle size={16} />
              The contract PDF will be available once the contract is accepted
              and digitally signed.
            </div>
          )}
        </Section>
      </div>

      {/* ACCEPT CONFIRMATION POPUP — small, no canvas here */}
      {showAcceptConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
              <CheckCircle2 size={22} />
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
              Confirm Acceptance
            </h3>
            <p className="mt-1.5 text-sm leading-6 text-slate-500">
              You're about to accept this contract as{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {signedBy}
              </span>{" "}
              for{" "}
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                {formatCurrency(total)}
              </span>
              . This action cannot be undone.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAcceptConfirm(false)}
                disabled={isSubmitting}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAccept}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white shadow hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Reject Contract
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Please provide a reason for rejecting this contract.
            </p>

            <div className="mt-4 space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Rejection Reason
              </label>
              <textarea
                rows={4}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this contract is being rejected..."
                className="w-full rounded-lg border border-slate-200 p-2.5 text-sm text-slate-800 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitReject}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2 text-sm font-bold text-white shadow hover:bg-red-700 disabled:opacity-50"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONTRACT PDF VIEWER MODAL */}
      {pdfViewer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {pdfViewer.title}
              </h3>
              <button
                type="button"
                onClick={closePdfViewer}
                className="rounded-md p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={16} />
              </button>
            </div>
            <iframe
              src={pdfViewer.url}
              title={pdfViewer.title}
              className="w-full flex-1"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default QuotationContract;
