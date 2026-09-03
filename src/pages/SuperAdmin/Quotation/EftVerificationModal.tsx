import { useState, type FC } from "react";
import { createPortal } from "react-dom";
import {
  CheckCircle2,
  ExternalLink,
  FileCheck,
  FileText,
  Hash,
  Loader2,
  Receipt,
  X,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { verifyEftPayment } from "../../../services/Quotation/quotationService";

interface EftVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotation: {
    id: string;
    quotationNumber: string;
    companyName: string;
    contactEmail: string;
    totalAmount: number;
    machineCount?: number;
    scopeOfWork?: any;
    status: string;
  } | null;
  onSuccess?: () => void;
}

const MODAL_OVERLAY_Z_INDEX = 2147483000;
const MODAL_CONTENT_Z_INDEX = 2147483001;

export const EftVerificationModal: FC<EftVerificationModalProps> = ({
  isOpen,
  onClose,
  quotation,
  onSuccess,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");

  if (!isOpen || !quotation) return null;

  const scope = quotation.scopeOfWork || {};
  const eftRef = scope.eftReferenceNumber || `EFT-${quotation.quotationNumber}`;
  const popUrl = scope.proofOfPaymentUrl || null;
  const bankDetails = scope.bankDetails || {
    bankName: "First National Bank (FNB)",
    accountName: "HME Intelligence (Pty) Ltd",
    accountNumber: "62894109823",
    branchCode: "250655",
    referenceCode: eftRef,
  };

  const handleVerify = async (action: "APPROVE" | "REJECT") => {
    setIsProcessing(true);
    try {
      await verifyEftPayment(quotation.id, {
        action,
        notes: adminNotes || (action === "APPROVE" ? "Payment verified in FNB statement." : "Payment not reflected."),
      });
      toast.success(
        action === "APPROVE"
          ? `Quotation #${quotation.quotationNumber} marked as PAID. Machines quota updated!`
          : `EFT Payment rejected for #${quotation.quotationNumber}.`,
      );
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to process EFT action");
    } finally {
      setIsProcessing(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        style={{ zIndex: MODAL_OVERLAY_Z_INDEX }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm transition-opacity"
      />

      {/* Modal Card */}
      <div
        style={{ zIndex: MODAL_CONTENT_Z_INDEX }}
        className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-6 py-4 dark:border-slate-800 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
              <Receipt size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Verify EFT Bank Transfer
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Quotation Ref: <span className="font-semibold text-blue-600 dark:text-blue-400">{quotation.quotationNumber}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-5 p-6 text-sm text-slate-700 dark:text-slate-300">
          {/* Summary Box */}
          <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3 dark:border-slate-800 dark:bg-slate-800/50">
            <div>
              <span className="block text-xs font-medium text-slate-400">Client / Company</span>
              <span className="font-semibold text-slate-900 dark:text-white">{quotation.companyName}</span>
              <span className="block text-xs text-slate-500">{quotation.contactEmail}</span>
            </div>
            <div>
              <span className="block text-xs font-medium text-slate-400">Quotation Total (ZAR)</span>
              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                R {Number(quotation.totalAmount).toLocaleString()}
              </span>
              <span className="block text-xs text-slate-500">
                {quotation.machineCount ? `${quotation.machineCount} Machines` : "Standard Plan"}
              </span>
            </div>
            <div>
              <span className="block text-xs font-medium text-slate-400">Payment Status</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-600 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20">
                <FileCheck size={13} />
                {quotation.status || "EFT_SUBMITTED"}
              </span>
            </div>
          </div>

          {/* EFT Bank Reference Details */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-900/30 dark:bg-blue-950/20">
            <h3 className="mb-2 flex items-center gap-2 font-semibold text-blue-900 dark:text-blue-300">
              <Hash size={16} /> EFT Reference Details
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs text-slate-600 dark:text-slate-400 sm:grid-cols-4">
              <div>
                <span className="block font-medium text-slate-400">Bank:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{bankDetails.bankName}</span>
              </div>
              <div>
                <span className="block font-medium text-slate-400">Account No:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{bankDetails.accountNumber}</span>
              </div>
              <div>
                <span className="block font-medium text-slate-400">Branch Code:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{bankDetails.branchCode}</span>
              </div>
              <div>
                <span className="block font-medium text-slate-400">Ref Code:</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{eftRef}</span>
              </div>
            </div>
          </div>

          {/* Proof of Payment Preview */}
          <div>
            <h3 className="mb-2 font-semibold text-slate-900 dark:text-white">Proof of Payment Document</h3>
            {popUrl ? (
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-800">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-500 dark:bg-red-500/10">
                    <FileText size={18} />
                  </div>
                  <div>
                    <span className="font-medium text-slate-900 dark:text-white">EFT_Receipt_{quotation.quotationNumber}.pdf</span>
                    <span className="block text-xs text-slate-400">Uploaded by client / admin</span>
                  </div>
                </div>
                <a
                  href={popUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-200"
                >
                  <ExternalLink size={13} /> View / Download
                </a>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/50 p-4 text-xs text-amber-700 dark:border-amber-700/50 dark:bg-amber-950/20 dark:text-amber-300">
                ℹ️ No direct file attachment uploaded. Check manual bank statement for reference code <strong>{eftRef}</strong>.
              </div>
            )}
          </div>

          {/* Admin Verification Notes */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
              Admin Verification Note (Optional)
            </label>
            <input
              type="text"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="e.g. Funds cleared in FNB account #6289... on 03/09/2026"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-6 py-4 dark:border-slate-800 dark:bg-slate-800/40">
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => handleVerify("REJECT")}
            className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50 dark:border-red-900/30 dark:bg-red-950/30 dark:text-red-400"
          >
            <XCircle size={15} />
            Reject Payment
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={isProcessing}
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => handleVerify("APPROVE")}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-500 dark:hover:bg-emerald-600"
            >
              {isProcessing ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircle2 size={15} />
                  Approve & Mark Paid (Activate Fleet)
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};
