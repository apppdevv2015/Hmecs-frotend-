import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
  getContractsList,
  getContractById,
  extractContractError,
  type Contract,
} from "../../../services/SuperAdmin/quotation/contractService";

import {
  createInvoice,
  getBillingProfile,
  saveBillingProfile,
} from "../../../services/Quotation/invoice.service";

// ── Validation regexes ──────────────────────────────────────────────
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[6-9]\d{9}$/;
const ACCOUNT_NUMBER_REGEX = /^\d{9,18}$/;

const invoiceFormSchema = z.object({
  contractId: z.string().trim().min(1, "Please select a contract"),
  dueDate: z
    .string()
    .trim()
    .min(1, "Due date is required")
    .refine((val) => !Number.isNaN(new Date(val).getTime()), "Invalid due date")
    .refine(
      (val) => new Date(val) >= new Date(new Date().toDateString()),
      "Due date cannot be in the past",
    ),
  notes: z
    .string()
    .trim()
    .max(500, "Notes must be under 500 characters")
    .optional()
    .or(z.literal("")),

  businessName: z.string().trim().min(1, "Business name is required").max(200),
  addressLine: z
    .string()
    .trim()
    .min(1, "Business address is required")
    .max(300),

  phone: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((val) => !val || PHONE_REGEX.test(val), {
      message: "Enter a valid 10-digit mobile number",
    }),
  email: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((val) => !val || EMAIL_REGEX.test(val), {
      message: "Invalid email format",
    }),
  bankName: z.string().trim().min(1, "Bank name is required").max(100),
  accountHolderName: z
    .string()
    .trim()
    .min(1, "Account holder name is required")
    .max(150),
  accountNumber: z
    .string()
    .trim()
    .min(1, "Account number is required")
    .refine((val) => ACCOUNT_NUMBER_REGEX.test(val), {
      message: "Account number must be 9-18 digits",
    }),
  ifscCode: z
    .string()
    .trim()
    .min(1, "IFSC code is required")
    .refine((val) => IFSC_REGEX.test(val.toUpperCase()), {
      message: "Invalid IFSC format (e.g. HDFC0001234)",
    }),
  branch: z.string().trim().max(100).optional().or(z.literal("")),
});

type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;
const emptyFormValues: InvoiceFormValues = {
  contractId: "",
  dueDate: "",
  notes: "Please include invoice number in payment reference.",
  businessName: "",
  addressLine: "",
  phone: "",
  email: "",
  bankName: "",
  accountHolderName: "",
  accountNumber: "",
  ifscCode: "",
  branch: "",
};

export default function GenerateInvoiceForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedContractId = searchParams.get("contractId");
  const isContractLocked = Boolean(preselectedContractId);

  const [contracts, setContracts] = useState<readonly Contract[]>([]);
  const [loadingContracts, setLoadingContracts] = useState(true);
  const [contractsLoadError, setContractsLoadError] = useState<string | null>(
    null,
  );

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    trigger,
    formState: { errors },
  } = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    mode: "onChange",
    defaultValues: emptyFormValues,
  });

  const selectedContractId = watch("contractId");
  const selectedContract =
    contracts.find((c) => c.id === selectedContractId) ?? null;

  useEffect(() => {
    const controller = new AbortController();
    setLoadingContracts(true);
    setContractsLoadError(null);

    const load = async () => {
      try {
        if (preselectedContractId) {
          const contract = await getContractById(
            preselectedContractId,
            controller.signal,
          );
          if (!contract) {
            setContractsLoadError("The selected contract could not be found.");
            setContracts([]);
            return;
          }
          setContracts([contract]);
          setValue("contractId", contract.id, { shouldValidate: true });
        } else {
          const res = await getContractsList({
            status: "ACCEPTED",
            signal: controller.signal,
          });
          setContracts(res);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setContractsLoadError(
          extractContractError(err) ??
            "Failed to load contract details. Please refresh the page.",
        );
      } finally {
        setLoadingContracts(false);
      }
    };

    load();
    return () => controller.abort();
  }, [preselectedContractId, setValue]);

  useEffect(() => {
    const controller = new AbortController();
    setLoadingProfile(true);

    getBillingProfile(controller.signal)
      .then((res) => {
        if (res.data) {
          reset({
            ...emptyFormValues,
            contractId: preselectedContractId ?? "",
            businessName: res.data.businessName,
            addressLine: res.data.addressLine,
            phone: res.data.phone ?? "",
            email: res.data.email ?? "",
            bankName: res.data.bankName,
            accountHolderName: res.data.accountHolderName,
            accountNumber: res.data.accountNumber,
            ifscCode: res.data.ifscCode,
            branch: res.data.branch ?? "",
          });
        }
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;

      })
      .finally(() => setLoadingProfile(false));

    return () => controller.abort();
    
  }, [reset]);

 
  useEffect(() => {
    if (!selectedContract) return;

    const due = new Date();
    due.setDate(due.getDate() + 30);
    setValue("dueDate", due.toISOString().slice(0, 10), {
      shouldValidate: true,
    });
    void trigger("contractId");
  }, [selectedContract, setValue, trigger]);

  const description = selectedContract
    ? `Services as per contract ${selectedContract.contractNumber}`
    : "";
  const paymentTerms = selectedContract?.quotation.paymentTerms ?? "";

  const pageLoading = loadingContracts || loadingProfile;

  const onSubmit = () => {
    if (!selectedContract) return;
    setShowConfirm(true);
  };

  const handleConfirmGenerate = handleSubmit(async (values) => {
    if (!selectedContract) return;

    setShowConfirm(false);
    setSubmitting(true);

    try {
      await saveBillingProfile({
        businessName: values.businessName,
        addressLine: values.addressLine,
        phone: values.phone || undefined,
        email: values.email || undefined,
        bankName: values.bankName,
        accountHolderName: values.accountHolderName,
        accountNumber: values.accountNumber,
        ifscCode: values.ifscCode.toUpperCase(),
        branch: values.branch || undefined,
      });

      await createInvoice({
        contractId: values.contractId,
        dueDate: values.dueDate,
        paymentTerms,
        notes: values.notes || undefined,
      });
      navigate("/super-admin/invoices");
    } catch {
} finally {
      setSubmitting(false);
    }
  });

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Invoice Details</h1>
        <button
          type="button"
          onClick={() => navigate("/super-admin/invoices")}
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          Back to List
        </button>
      </div>

      {contractsLoadError && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
          {contractsLoadError}
        </div>
      )}
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        {/* 1. Select Contract */}
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-gray-800 mb-2">
            1. Select Contract
          </h2>

          {isContractLocked ? (
            <>
              {loadingContracts ? (
                <p className="text-sm text-gray-500">
                  Loading contract details...
                </p>
              ) : selectedContract ? (
                <div className="rounded-md bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-700 space-y-1">
                  <p className="font-medium text-gray-900">
                    {selectedContract.contractNumber}
                  </p>
                  <p>Company: {selectedContract.quotation.companyName}</p>
                  <p>User: {selectedContract.quotation.contactPerson}</p>
                  <p>Quotation: {selectedContract.quotation.quotationNumber}</p>
                  <p>Total Count: {selectedContract.quotation.machineCount}</p>
                  <p>
                    Contract Period:{" "}
                    {new Date(selectedContract.startDate).toLocaleDateString()}{" "}
                    - {new Date(selectedContract.endDate).toLocaleDateString()}
                  </p>
                </div>
              ) : null}
              <input type="hidden" {...register("contractId")} />
            </>
          ) : (
            <>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Contract <span className="text-red-500">*</span>
              </label>
              <select
                className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.contractId ? "border-red-400" : "border-gray-300"
                }`}
                disabled={loadingContracts}
                {...register("contractId")}
              >
                <option value="">
                  {loadingContracts
                    ? "Loading contracts..."
                    : "Select a contract"}
                </option>
                {contracts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.contractNumber} - {c.quotation.companyName} (Accepted)
                  </option>
                ))}
              </select>
              {!loadingContracts &&
                contracts.length === 0 &&
                !contractsLoadError && (
                  <p className="mt-1 text-xs text-gray-500">
                    No accepted contracts available yet.
                  </p>
                )}
              {selectedContract && (
                <div className="mt-3 rounded-md bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-700 space-y-1">
                  <p>Company: {selectedContract.quotation.companyName}</p>
                  <p>Quotation: {selectedContract.quotation.quotationNumber}</p>
                  <p>Total Count: {selectedContract.quotation.machineCount}</p>
                  <p>
                    Contract Period:{" "}
                    {new Date(selectedContract.startDate).toLocaleDateString()}{" "}
                    - {new Date(selectedContract.endDate).toLocaleDateString()}
                  </p>
                </div>
              )}
            </>
          )}

          {errors.contractId && (
            <p className="mt-1 text-xs text-red-600">
              {errors.contractId.message}
            </p>
          )}
        </section>

        {/* 2. Invoice Information */}
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-gray-800 mb-2">
            2. Invoice Information
          </h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Invoice Number
              </label>
              <input
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-gray-100 text-gray-500"
                value="Auto-generated"
                disabled
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Invoice Date
              </label>
              <input
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-gray-100 text-gray-500"
                value="Auto-generated"
                disabled
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Due Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.dueDate ? "border-red-400" : "border-gray-300"
                }`}
                {...register("dueDate")}
              />
              {errors.dueDate && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.dueDate.message}
                </p>
              )}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Description
            </label>
            <input
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-gray-100 text-gray-700"
              value={description || "Select a contract to auto-fill"}
              disabled
            />
          </div>

          <p className="text-xs text-gray-500">
            Pricing (implementation fee, monthly charges, and optional services)
            will be calculated automatically from the contract when the invoice
            is generated.
          </p>
        </section>

        {/* 3. Payment Terms */}
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-gray-800 mb-2">
            3. Payment Terms
          </h2>
          <input
            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-gray-100 text-gray-700"
            value={paymentTerms || "Select a contract to auto-fill"}
            disabled
          />
        </section>

        {/* 4. Bank & Business Details (Super Admin) */}
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-gray-800 mb-2">
            4. Bank &amp; Business Details (Super Admin)
          </h2>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Business Name <span className="text-red-500">*</span>
              </label>
              <input
                className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.businessName ? "border-red-400" : "border-gray-300"
                }`}
                {...register("businessName")}
              />
              {errors.businessName && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.businessName.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Business Address <span className="text-red-500">*</span>
              </label>
              <input
                className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.addressLine ? "border-red-400" : "border-gray-300"
                }`}
                {...register("addressLine")}
              />
              {errors.addressLine && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.addressLine.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Phone
              </label>
              <input
                className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.phone ? "border-red-400" : "border-gray-300"
                }`}
                {...register("phone")}
              />
              {errors.phone && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.phone.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Email
              </label>
              <input
                type="email"
                className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.email ? "border-red-400" : "border-gray-300"
                }`}
                {...register("email")}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.email.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Bank Name <span className="text-red-500">*</span>
              </label>
              <input
                className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.bankName ? "border-red-400" : "border-gray-300"
                }`}
                {...register("bankName")}
              />
              {errors.bankName && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.bankName.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Account Holder Name <span className="text-red-500">*</span>
              </label>
              <input
                className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.accountHolderName
                    ? "border-red-400"
                    : "border-gray-300"
                }`}
                {...register("accountHolderName")}
              />
              {errors.accountHolderName && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.accountHolderName.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Account Number <span className="text-red-500">*</span>
              </label>
              <input
                className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.accountNumber ? "border-red-400" : "border-gray-300"
                }`}
                {...register("accountNumber")}
              />
              {errors.accountNumber && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.accountNumber.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                IFSC Code <span className="text-red-500">*</span>
              </label>
              <input
                className={`w-full border rounded-md px-3 py-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.ifscCode ? "border-red-400" : "border-gray-300"
                }`}
                {...register("ifscCode")}
                onChange={(e) => {
                  e.target.value = e.target.value.toUpperCase();
                  register("ifscCode").onChange(e);
                }}
              />
              {errors.ifscCode && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.ifscCode.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Branch
              </label>
              <input
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                {...register("branch")}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Additional Notes
              </label>
              <textarea
                className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.notes ? "border-red-400" : "border-gray-300"
                }`}
                rows={1}
                {...register("notes")}
              />
              {errors.notes && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.notes.message}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Footer buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            className="px-4 py-2 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
            onClick={() =>
              isContractLocked
                ? navigate("/super-admin/invoices")
                : navigate(-1)
            }
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || pageLoading || !selectedContract}
            className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? "Generating..." : "Generate Invoice PDF"}
          </button>
        </div>
      </form>

      {/* Confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-2">
              Generate this invoice?
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              The invoice number will be finalized once generated and cannot be
              changed afterward.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="px-4 py-2 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
                onClick={() => setShowConfirm(false)}
              >
                Go Back
              </button>
              <button
                type="button"
                disabled={submitting}
                className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                onClick={handleConfirmGenerate}
              >
                {submitting ? "Generating..." : "Confirm & Generate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
