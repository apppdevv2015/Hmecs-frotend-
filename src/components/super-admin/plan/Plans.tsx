import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { CheckCircle2, Pencil, Trash2, X, XCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { showErrorToast, showSuccessToast } from "../../../utils/toastUtils";

import {
  createSubscriptionPlan,
  deleteSubscriptionPlan,
  getSubscriptionPlans,
  updateSubscriptionPlan,
  type SubscriptionPlanApi,
} from "../../../services/subscriptionService";

type Plan = {
  id: string;
  name: string;
  featuresText: string;
  price: string;
  machines: number;
  staffLimit: number;
  validityDays: number;
  isPublic: boolean;
  isActive: boolean;
  createdAt: string;
};

const emptyPlan: Plan = {
  id: "",
  name: "",
  featuresText: "",
  price: "",
  machines: 0,
  staffLimit: 0,
  validityDays: 30,
  isPublic: true,
  isActive: true,
  createdAt: "",
};

const planSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Plan name must be at least 3 characters")
    .max(50, "Plan name cannot exceed 50 characters")
    .regex(/^[A-Za-z ]+$/, "Only alphabets and spaces are allowed"),

  price: z
    .string()
    .trim()
    .min(1, "Price is required")
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, {
      message: "Enter a valid price",
    }),

  staffLimit: z.number().min(1, "Staff limit must be at least 1"),

  machines: z.number().min(1, "Machine limit must be at least 1"),

  validityDays: z.number().min(1, "Validity days must be at least 1"),

  featuresText: z.string().optional(),
});

type PlanFormData = z.infer<typeof planSchema>;

const featuresToText = (
  features: Record<string, boolean> | string[] | null | undefined,
) => {
  if (Array.isArray(features)) return features.join(", ");

  if (features && typeof features === "object") {
    return Object.keys(features)
      .filter((key) => Boolean(features[key]))
      .join(", ");
  }

  return "";
};

const textToFeaturesPayload = (text: string) => {
  return text
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .reduce<Record<string, boolean>>((acc, feature) => {
      acc[feature] = true;
      return acc;
    }, {});
};

const getNumericPrice = (price: string) => {
  return Number(String(price).replace("$", "").trim());
};

const mapApiPlanToPlan = (plan: SubscriptionPlanApi): Plan => {
  const apiPlan = plan as any;

  return {
    id: apiPlan.id || "",
    name: apiPlan.planName || "Untitled Plan",
    featuresText: "",
    price: `$${apiPlan.price ?? 0}`,
    machines: Number(apiPlan.machineLimit ?? 0),
    staffLimit: Number(apiPlan.staffLimit ?? 0),
    validityDays: Number(apiPlan.validityDays ?? 30),
    isPublic: Boolean(apiPlan.isPublic),
    isActive: Boolean(apiPlan.isActive),
    createdAt: "",
  };
};

export default function Plans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState("");

  const [createPlan, setCreatePlan] = useState<Plan | null>(null);
  const [editPlan, setEditPlan] = useState<Plan | null>(null);
  const [deletePlan, setDeletePlan] = useState<Plan | null>(null);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      setError("");

      const response: any = await getSubscriptionPlans();

      const apiPlans = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response?.plans)
            ? response.plans
            : Array.isArray(response?.data?.plans)
              ? response.data.plans
              : [];

      setPlans(apiPlans.map(mapApiPlanToPlan));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load plans";

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  useEffect(() => {
    const isModalOpen = !!createPlan || !!editPlan || !!deletePlan;

    if (isModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [createPlan, editPlan, deletePlan]);

  const validatePlan = (plan: Plan) => {
    const numericPrice = getNumericPrice(plan.price);

    if (!plan.name.trim()) return "Plan name is required";

    if (!plan.machines || Number(plan.machines) <= 0) {
      return "Machine limit is required";
    }

    if (!numericPrice || numericPrice <= 0) {
      return "Valid price is required";
    }

    if (!plan.validityDays || Number(plan.validityDays) <= 0) {
      return "Validity days is required";
    }

    return "";
  };

  const handleCreatePlan = async () => {
    if (!createPlan) return;

    const validationMessage = validatePlan(createPlan);

    if (validationMessage) {
      showErrorToast(validationMessage);
      return;
    }

    try {
      setCreating(true);
      setError("");

      const payload = {
        plan_name: createPlan.name.trim(),
        machine_limit: Number(createPlan.machines),
        staff_limit: Number(createPlan.staffLimit),
        price: getNumericPrice(createPlan.price),
        validity_days: Number(createPlan.validityDays),
        features: textToFeaturesPayload(createPlan.featuresText),
      } as any;

      const response: any = await createSubscriptionPlan(payload);

      if (!response?.success) {
        showErrorToast(response?.message || "Failed to create plan");
        return;
      }

      showSuccessToast(response?.message || "Plan created successfully");

      setCreatePlan(null);

      await fetchPlans();
    } catch (err: any) {
      showErrorToast(err?.message || "Failed to create plan");
    } finally {
      setCreating(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editPlan) return;

    const validationMessage = validatePlan(editPlan);

    if (validationMessage) {
      showErrorToast(validationMessage);
      return;
    }

    try {
      setUpdating(true);
      setError("");

      const payload = {
        plan_name: editPlan.name.trim(),
        machine_limit: Number(editPlan.machines),
        staff_limit: Number(editPlan.staffLimit),
        price: getNumericPrice(editPlan.price),
        validity_days: Number(editPlan.validityDays),
      } as any;

      const response: any = await updateSubscriptionPlan(editPlan.id, payload);

      if (!response?.success) {
        showErrorToast(response?.message || "Failed to update plan");
        return;
      }

      setPlans((prev) =>
        prev.map((plan) =>
          String(plan.id) === String(editPlan.id)
            ? {
                ...plan,
                name: editPlan.name,
                price: `$${Number(getNumericPrice(editPlan.price))}`,
                machines: Number(editPlan.machines),
                validityDays: Number(editPlan.validityDays),
                staffLimit: Number(editPlan.staffLimit),
                isPublic: plan.isPublic,
                isActive: plan.isActive,
              }
            : plan,
        ),
      );

      setEditPlan(null);

      showSuccessToast(response?.message || "Plan updated successfully");

      await fetchPlans();
    } catch (err: any) {
      setError(err?.message || "Failed to update plan");
      showErrorToast(err?.message || "Failed to update plan");
    } finally {
      setUpdating(false);
    }
  };

  const handleConfirmDelete = async () => {
  if (!deletePlan) return;

  try {
    setDeleting(true);
    setError("");

    const response: any = await deleteSubscriptionPlan(deletePlan.id);

    if (!response?.success) {
      showErrorToast(response?.message || "Failed to delete plan");
      return;
    }

    setDeletePlan(null);

    showSuccessToast(response?.message || "Plan deleted successfully");

    await fetchPlans();
  } catch (err: any) {
    setError(err?.message || "Failed to delete plan");
    showErrorToast(err?.message || "Failed to delete plan");
  } finally {
    setDeleting(false);
  }
};

  const inputClass =
    "h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white";

  const labelClass =
    "mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300";

  return (
    <div className="relative min-h-screen bg-gray-50 p-4 dark:bg-slate-950 md:p-6">
      <div className="rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#081028]">
        <div className="overflow-hidden rounded-t-2xl border border-blue-700/30 bg-gradient-to-r from-blue-800 via-blue-700 to-blue-800 px-6 py-6 shadow-lg">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            {/* Left Section */}
            <div>
              <div className="mb-3 inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.15em] text-white backdrop-blur-sm">
                Subscription Management
              </div>

              <h1 className="text-3xl font-black tracking-tight text-white">
                Plans
              </h1>

              <p className="mt-2 text-sm font-medium text-blue-100">
                Manage subscription plans, pricing, features, and plan
                availability across the platform.
              </p>
            </div>

            {/* Right Section */}
            <button
              type="button"
              onClick={() => {
                setError("");
                setCreatePlan(emptyPlan);
              }}
              className="flex h-12 items-center justify-center rounded-2xl bg-white px-5 text-sm font-semibold text-blue-700 shadow-md transition-all duration-200 hover:bg-blue-50 hover:shadow-lg"
            >
              + Create Plan
            </button>
          </div>
        </div>

        {loading && (
          <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
            Loading plans...
          </p>
        )}

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
            {error}
          </div>
        )}

        {!loading && !error && plans.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
            No plans found.
          </p>
        )}

        {!loading && plans.length > 0 && (
          <div
            className="overflow-x-auto [&::-webkit-scrollbar]:hidden"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            <div
              className="min-w-[1000px] divide-y divide-slate-100 dark:divide-slate-800"
              style={{
                scrollbarWidth: "none",
              }}
            >
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className="grid grid-cols-[180px_120px_140px_140px_140px_120px_120px_100px] items-center gap-4 rounded-2xl px-4 py-5 text-sm transition hover:bg-slate-50 dark:hover:bg-slate-800/60"
                >
                  <div className="font-bold text-slate-800 dark:text-white">
                    {plan.name}
                  </div>

                  <div className="font-semibold text-green-600">
                    {plan.price}
                  </div>

                  <div className="text-slate-700 dark:text-slate-300">
                    {plan.machines} Machines
                  </div>

                  <div className="text-slate-700 dark:text-slate-300">
                    {plan.staffLimit} Staff
                  </div>

                  <div className="text-slate-700 dark:text-slate-300">
                    {plan.validityDays} Days
                  </div>

                  <div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        plan.isPublic
                          ? "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-300"
                          : "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-300"
                      }`}
                    >
                      {plan.isPublic ? "Public" : "Private"}
                    </span>
                  </div>

                  <div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        plan.isActive
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                          : "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-300"
                      }`}
                    >
                      {plan.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setError("");
                        setEditPlan({ ...plan });
                      }}
                      className="rounded-xl bg-blue-50 p-2 text-blue-600 transition hover:bg-blue-100 dark:bg-blue-500/10"
                    >
                      <Pencil size={16} />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setError("");
                        setDeletePlan(plan);
                      }}
                      className="rounded-xl bg-red-50 p-2 text-red-600 transition hover:bg-red-100 dark:bg-red-500/10"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {createPlan && (
        <PlanModal
          title="Create Plan"
          plan={createPlan}
          setPlan={setCreatePlan}
          inputClass={inputClass}
          labelClass={labelClass}
          onClose={() => setCreatePlan(null)}
          onSubmit={handleCreatePlan}
          submitLabel={creating ? "Creating..." : "Create Plan"}
          disabled={creating}
          showFeatures
        />
      )}

      {editPlan && (
        <PlanModal
          title="Edit Plan"
          plan={editPlan}
          setPlan={setEditPlan}
          inputClass={inputClass}
          labelClass={labelClass}
          onClose={() => setEditPlan(null)}
          onSubmit={handleSaveEdit}
          submitLabel={updating ? "Updating..." : "Save Changes"}
          disabled={updating}
          showFeatures={false}
        />
      )}

      {deletePlan && (
        <div
          className="fixed inset-0 z-[999999] flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setDeletePlan(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative z-[999999] w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
          >
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Delete Plan
            </h2>

            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-slate-900 dark:text-white">
                {deletePlan.name}
              </span>
              ? This action cannot be undone.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletePlan(null)}
                disabled={deleting}
                className="rounded-xl border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="rounded-xl bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// Plans.tsx — ONLY these two functions change, baaki sab same rehta hai

function PlanModal({
  title,
  plan,
  setPlan,
  inputClass,
  labelClass,
  onClose,
  onSubmit,
  submitLabel,
  disabled,
  showFeatures,
}: {
  title: string;
  plan: Plan;
  setPlan: Dispatch<SetStateAction<Plan | null>>;
  inputClass: string;
  labelClass: string;
  onClose: () => void;
  onSubmit: () => void;
  submitLabel: string;
  disabled: boolean;
  showFeatures: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PlanFormData>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      name: plan.name,
      price: String(getNumericPrice(plan.price) || ""),
      machines: plan.machines,
      staffLimit: plan.staffLimit,
      validityDays: plan.validityDays,
      featuresText: plan.featuresText,
    },
    mode: "onTouched",
  });

  return (
    <div
      className="fixed inset-0 z-[999999] flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative z-[999999] w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {title}
          </h2>

          <button
            type="button"
            onClick={onClose}
            disabled={disabled}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        <PlanForm
          plan={plan}
          setPlan={setPlan}
          inputClass={inputClass}
          labelClass={labelClass}
          showFeatures={showFeatures}
          register={register}
          errors={errors}
        />

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={disabled}
            className="rounded-xl border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit(onSubmit)}
            disabled={disabled}
            className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function PlanForm({
  plan,
  setPlan,
  inputClass,
  labelClass,
  showFeatures,
  register,
  errors,
}: {
  plan: Plan;
  setPlan: Dispatch<SetStateAction<Plan | null>>;
  inputClass: string;
  labelClass: string;
  showFeatures: boolean;
  register: any;
  errors: any;
}) {
  const updatePlanField = <K extends keyof Plan>(key: K, value: Plan[K]) => {
    setPlan((prev) => {
      if (!prev) return prev;
      return { ...prev, [key]: value };
    });
  };

  const errorClass =
    "mt-1.5 text-xs font-medium text-red-500 dark:text-red-400";

  const getInputClass = (hasError: boolean) =>
    `${inputClass} ${hasError ? "border-red-400 focus:border-red-500 focus:ring-red-500/10 dark:border-red-500/70" : ""}`;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {/* Plan Name */}
      <div>
        <label className={labelClass}>Plan Name</label>
        <input
          {...register("name")}
          value={plan.name}
          onChange={(e) => {
            register("name").onChange(e);
            updatePlanField("name", e.target.value);
          }}
          className={getInputClass(!!errors.name)}
          placeholder="Enter plan name"
        />
        {errors.name && <p className={errorClass}>{errors.name.message}</p>}
      </div>

      {/* Price */}
      <div>
        <label className={labelClass}>Price ($)</label>
        <input
          {...register("price")}
          value={plan.price}
          onChange={(e) => {
            register("price").onChange(e);
            updatePlanField("price", e.target.value);
          }}
          className={getInputClass(!!errors.price)}
          placeholder="99"
        />
        {errors.price && <p className={errorClass}>{errors.price.message}</p>}
      </div>

      {/* Machine Limit */}

      {/* Staff Limit */}
      <div>
        <label className={labelClass}>Staff Limit</label>

        <input
          type="number"
          min={1}
          {...register("staffLimit", { valueAsNumber: true })}
          value={plan.staffLimit}
          onChange={(e) => {
            register("staffLimit", {
              valueAsNumber: true,
            }).onChange(e);

            updatePlanField("staffLimit", Number(e.target.value));
          }}
          className={getInputClass(!!errors.staffLimit)}
          placeholder="20"
        />

        {errors.staffLimit && (
          <p className={errorClass}>{errors.staffLimit.message}</p>
        )}
      </div>

      <div>
        <label className={labelClass}>Machine Limit</label>
        <input
          type="number"
          min={1}
          {...register("machines", { valueAsNumber: true })}
          value={plan.machines}
          onChange={(e) => {
            register("machines", { valueAsNumber: true }).onChange(e);
            updatePlanField("machines", Number(e.target.value));
          }}
          className={getInputClass(!!errors.machines)}
          placeholder="10"
        />
        {errors.machines && (
          <p className={errorClass}>{errors.machines.message}</p>
        )}
      </div>

      {/* Validity Days */}
      <div>
        <label className={labelClass}>Validity Days</label>
        <input
          type="number"
          min={1}
          {...register("validityDays", { valueAsNumber: true })}
          value={plan.validityDays}
          onChange={(e) => {
            register("validityDays", { valueAsNumber: true }).onChange(e);
            updatePlanField("validityDays", Number(e.target.value));
          }}
          className={getInputClass(!!errors.validityDays)}
          placeholder="30"
        />
        {errors.validityDays && (
          <p className={errorClass}>{errors.validityDays.message}</p>
        )}
      </div>

      {/* Features — Create only */}
      {showFeatures && (
        <div className="md:col-span-2">
          <label className={labelClass}>Features</label>
          <textarea
            {...register("featuresText")}
            value={plan.featuresText}
            onChange={(e) => {
              register("featuresText").onChange(e);
              updatePlanField("featuresText", e.target.value);
            }}
            rows={4}
            className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            placeholder="Engine Monitoring, Hydraulic Monitoring, Tyre Monitoring"
          />
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Add features with comma separation. Example: Engine Monitoring,
            Hydraulic Monitoring
          </p>
        </div>
      )}

      {/* Edit-mode notice */}
      {!showFeatures && (
        <div className="md:col-span-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-300">
          Update API only accepts plan name, machine limit, price and validity
          days. Features are not sent in update payload.
        </div>
      )}
    </div>
  );
}
