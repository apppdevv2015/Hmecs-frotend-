import React, { useEffect, useState } from "react";
import {
  Sparkles,
  CheckCircle2,
  X,
  Send,
  Loader2,
  Truck,
  Users,
  Clock,
  ShieldCheck,
  Zap,
} from "lucide-react";
import {
  createQuotationRequest,
  type CreateQuotationRequestPayload,
} from "../../services/Quotation/quotationService";
import { showSuccessToast, showErrorToast } from "../../utils/toastUtils";

interface DemoPlanModalProps {
  onSuccess: () => void;
  onClose: () => void;
}

interface QuotationPlan {
  id: string;
  name: string;
  tierCode?: string | null;
  minMachines: number;
  maxMachines: number;
  monthlyPrice: string | number;
  currency: string;
  isTrial: boolean;
  trialDays?: number;
  features: string[];
  isActive: boolean;
}

export const DemoPlanModal: React.FC<DemoPlanModalProps> = ({
  onSuccess,
  onClose,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [demoPlan, setDemoPlan] = useState<QuotationPlan | null>(null);

  // Fetch single active demo plan from backend created by Super Admin
  useEffect(() => {
    const fetchActiveDemoPlan = async () => {
      try {
        setLoading(true);
        const res = await fetch("http://localhost:4000/api/v1/quotation-plans/demo");
        const json = await res.json();
        const plan: QuotationPlan | null = json?.data || null;
        setDemoPlan(plan);
      } catch (err) {
        console.error("Failed to load demo plan template", err);
      } finally {
        setLoading(false);
      }
    };

    fetchActiveDemoPlan();
  }, []);

  const handleSubmitRequest = async () => {
    if (!demoPlan) {
      showErrorToast("No active demo plan template available from Super Admin.");
      return;
    }

    setSubmitting(true);
    try {
      const trialDays = demoPlan.trialDays;
      const maxMachines = demoPlan.maxMachines;
      const planName = demoPlan.name;
      const features = demoPlan.features || [];

      const payload: CreateQuotationRequestPayload = {
        companyId: "",
        quotationType: planName,
        numberOfSites: 1,
        siteNames: [],
        activeMachines: maxMachines,
        equipmentTypes: [],
        contractDuration: trialDays ? `${trialDays} Days` : "Custom Demo",
        optionalServices: features,
        implementationRequirements: `Demo Evaluation Request for ${planName}: ${trialDays} Days Duration, Max ${maxMachines} Machines.`,
        additionalRequirements: features.length
          ? `Features: ${features.join(", ")}`
          : undefined,
      };

      const response = await createQuotationRequest(payload);
      showSuccessToast(
        "Request Demo Sent! Super Admin will review and activate your demo plan.",
        { duration: 5000 }
      );
      onSuccess();
    } catch (err: any) {
      showErrorToast(
        err?.response?.data?.message || err?.message || "Failed to submit demo request.",
        { duration: 5000 }
      );
    } finally {
      setSubmitting(false);
    }
  };

  const planName = demoPlan?.name || "";
  const trialDays = demoPlan?.trialDays || 0;
  const maxMachines = demoPlan?.maxMachines || 0;
  const features = demoPlan?.features || [];

  return (
    <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-2xl">
      {/* Header Bar */}
      <div className="relative bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 px-6 py-6 text-white sm:px-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-blue-500/30 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-100 backdrop-blur-md">
              <Sparkles size={13} className="text-yellow-300" />
              Pre-Configured Super Admin Template
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white">
              {planName}
            </h2>
            <p className="mt-1 text-xs text-blue-100 sm:text-sm">
              Official evaluation package prepared by Super Admin. Read-only review mode.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-xl bg-white/10 p-2 text-white/80 transition hover:bg-white/20 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Content Body */}
      <div className="p-6 sm:p-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="mt-3 text-sm font-semibold text-slate-500">
              Loading active demo plan template...
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Key Specs Metric Grid */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50/50 p-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                  <Clock size={19} />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                    Duration
                  </p>
                  <p className="text-base font-black text-slate-900">
                    {trialDays} Days Free
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
                  <Truck size={19} />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
                    Machine Limit
                  </p>
                  <p className="text-base font-black text-slate-900">
                    Max {maxMachines} Machines
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                  <Users size={19} />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
                    Staff Limit
                  </p>
                  <p className="text-base font-black text-slate-900">
                    Max 3 Staff
                  </p>
                </div>
              </div>
            </div>

            {/* Read-Only Features Checklist */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Included Evaluation Modules & Features
                </h4>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                  <ShieldCheck size={14} /> Full Access
                </span>
              </div>

              <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {features.map((feature, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-xs font-medium text-slate-700"
                  >
                    <CheckCircle2
                      size={15}
                      className="mt-0.5 shrink-0 text-blue-600"
                    />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Workflow Notice */}
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200/80 bg-amber-50/60 p-4 text-xs text-amber-900">
              <Zap size={17} className="mt-0.5 shrink-0 text-amber-600" />
              <div>
                <p className="font-bold text-amber-950">Approval Workflow:</p>
                <p className="mt-0.5 text-amber-800">
                  Once you submit this request, it is routed to Super Admin for approval. Upon acceptance, your {trialDays}-day evaluation timer starts, allowing up to {maxMachines} machines to be actively monitored.
                </p>
              </div>
            </div>

            {/* Action Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-100"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSubmitRequest}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-md shadow-blue-500/25 transition hover:-translate-y-0.5 hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send size={15} />
                    Send Demo Request
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DemoPlanModal;
