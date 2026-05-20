import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { CheckCircle2, Pencil, Trash2, X, XCircle } from "lucide-react";
import {
  createSubscriptionPlan,
  deleteSubscriptionPlan,
  getSubscriptionPlans,
  updateSubscriptionPlan,
  type SubscriptionPlanApi,
} from "../../../services/subscriptionService";

type Plan = {
  id: number;
  name: string;
  featuresText: string;
  price: string;
  machines: number;
  validityDays: number;
  createdAt: string;
};

type Toast = {
  type: "success" | "error";
  message: string;
};

const emptyPlan: Plan = {
  id: 0,
  name: "",
  featuresText: "",
  price: "",
  machines: 0,
  validityDays: 30,
  createdAt: "",
};

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
  const priceValue = String(apiPlan.price ?? 0);

  return {
    id: Number(apiPlan.id ?? 0),
    name: apiPlan.plan_name || apiPlan.name || "Untitled Plan",
    featuresText: featuresToText(apiPlan.features),
    price: priceValue.startsWith("$") ? priceValue : `$${priceValue}`,
    machines: Number(apiPlan.machine_limit ?? 0),
    validityDays: Number(apiPlan.validity_days ?? 30),
    createdAt: apiPlan.created_at || "",
  };
};

export default function Plans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);
  const [toastVisible, setToastVisible] = useState(false);

  const [createPlan, setCreatePlan] = useState<Plan | null>(null);
  const [editPlan, setEditPlan] = useState<Plan | null>(null);
  const [deletePlan, setDeletePlan] = useState<Plan | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setToastVisible(true);

    window.setTimeout(() => {
      setToastVisible(false);
    }, 2600);

    window.setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  const fetchPlans = async () => {
    try {
      setLoading(true);
      setError("");

      const response: any = await getSubscriptionPlans();

      console.log("Plans API Response:", response);

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
      showToast("error", message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

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
      setError(validationMessage);
      showToast("error", validationMessage);
      return;
    }

    try {
      setCreating(true);
      setError("");

      const payload = {
        plan_name: createPlan.name.trim(),
        machine_limit: Number(createPlan.machines),
        price: getNumericPrice(createPlan.price),
        validity_days: Number(createPlan.validityDays),

        // Keep this only for create API compatibility if backend supports features.
        // Update API will not send features.
        features: textToFeaturesPayload(createPlan.featuresText),
      } as any;

      await createSubscriptionPlan(payload);

      setCreatePlan(null);
      showToast("success", "Plan created successfully");
      await fetchPlans();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create plan";
      setError(message);
      showToast("error", message);
    } finally {
      setCreating(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editPlan) return;

    const validationMessage = validatePlan(editPlan);

    if (validationMessage) {
      setError(validationMessage);
      showToast("error", validationMessage);
      return;
    }

    try {
      setUpdating(true);
      setError("");

      const payload = {
        plan_name: editPlan.name.trim(),
        machine_limit: Number(editPlan.machines),
        price: getNumericPrice(editPlan.price),
        validity_days: Number(editPlan.validityDays),
      } as any;

      await updateSubscriptionPlan(editPlan.id, payload);

      setEditPlan(null);
      showToast("success", "Plan updated successfully");
      await fetchPlans();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update plan";
      setError(message);
      showToast("error", message);
    } finally {
      setUpdating(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletePlan) return;

    try {
      setDeleting(true);
      setError("");

      await deleteSubscriptionPlan(deletePlan.id);

      setDeletePlan(null);
      showToast("success", "Plan deleted successfully");
      await fetchPlans();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete plan";
      setError(message);
      showToast("error", message);
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
      {toast && (
        <div
          className={`fixed right-5 top-5 z-[999999] w-[340px] transform rounded-2xl border bg-white p-4 shadow-2xl transition-all duration-300 ease-out dark:bg-slate-900 ${
            toastVisible
              ? "translate-y-0 opacity-100"
              : "-translate-y-4 opacity-0"
          } ${
            toast.type === "success"
              ? "border-green-200 dark:border-green-500/30"
              : "border-red-200 dark:border-red-500/30"
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-full ${
                toast.type === "success"
                  ? "bg-green-50 text-green-600 dark:bg-green-500/10"
                  : "bg-red-50 text-red-600 dark:bg-red-500/10"
              }`}
            >
              {toast.type === "success" ? (
                <CheckCircle2 size={20} />
              ) : (
                <XCircle size={20} />
              )}
            </div>

            <div className="flex-1">
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {toast.type === "success" ? "Success" : "Error"}
              </p>

              <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">
                {toast.message}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setToastVisible(false);
                window.setTimeout(() => setToast(null), 300);
              }}
              className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
            >
              <X size={16} />
            </button>
          </div>

          <div
            className={`mt-3 h-1 overflow-hidden rounded-full ${
              toast.type === "success"
                ? "bg-green-100 dark:bg-green-500/20"
                : "bg-red-100 dark:bg-red-500/20"
            }`}
          >
            <div
              className={`h-full rounded-full transition-all duration-[2600ms] ease-linear ${
                toastVisible ? "w-0" : "w-full"
              } ${toast.type === "success" ? "bg-green-500" : "bg-red-500"}`}
            />
          </div>
        </div>
      )}

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Plans
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              All subscription plans from pricing API.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setError("");
              setCreatePlan(emptyPlan);
            }}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            + Create Plan
          </button>
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
          <div className="overflow-x-auto">
            <div className="min-w-[1000px] divide-y divide-slate-100 dark:divide-slate-800">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className="grid grid-cols-[150px_1fr_120px_140px_140px_100px] items-center gap-4 px-1 py-5 text-sm transition hover:bg-slate-50 dark:hover:bg-slate-800/60"
                >
                  <div className="font-semibold capitalize text-slate-800 dark:text-white">
                    {plan.name}
                  </div>

                  <div className="max-w-md text-slate-500 dark:text-slate-400">
                    {plan.featuresText ? (
                      <div className="flex flex-wrap gap-2">
                        {plan.featuresText
                          .split(",")
                          .filter(Boolean)
                          .map((feature, index) => (
                            <span
                              key={`${feature}-${index}`}
                              className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
                            >
                              {feature.trim()}
                            </span>
                          ))}
                      </div>
                    ) : (
                      <span>No features added</span>
                    )}
                  </div>

                  <div className="font-medium text-slate-700 dark:text-slate-200">
                    {plan.price}
                  </div>

                  <div className="text-slate-600 dark:text-slate-300">
                    {plan.machines} machines
                  </div>

                  <div className="text-slate-600 dark:text-slate-300">
                    {plan.validityDays} days
                  </div>

                  <div className="flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setError("");
                        setEditPlan({ ...plan });
                      }}
                      className="rounded-lg p-2 text-slate-500 transition hover:bg-blue-50 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-blue-500/10"
                      title="Edit Plan"
                    >
                      <Pencil size={16} />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setError("");
                        setDeletePlan(plan);
                      }}
                      className="rounded-lg p-2 text-red-500 transition hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-500/10"
                      title="Delete Plan"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
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
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
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
            onClick={onSubmit}
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
}: {
  plan: Plan;
  setPlan: Dispatch<SetStateAction<Plan | null>>;
  inputClass: string;
  labelClass: string;
  showFeatures: boolean;
}) {
  const updatePlanField = <K extends keyof Plan>(key: K, value: Plan[K]) => {
    setPlan((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [key]: value,
      };
    });
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div>
        <label className={labelClass}>Plan Name</label>
        <input
          value={plan.name}
          onChange={(e) => updatePlanField("name", e.target.value)}
          className={inputClass}
          placeholder="Enter plan name"
        />
      </div>

      <div>
        <label className={labelClass}>Price</label>
        <input
          value={plan.price}
          onChange={(e) => updatePlanField("price", e.target.value)}
          className={inputClass}
          placeholder="99"
        />
      </div>

      <div>
        <label className={labelClass}>Machine Limit</label>
        <input
          type="number"
          min={1}
          value={plan.machines}
          onChange={(e) =>
            updatePlanField("machines", Number(e.target.value))
          }
          className={inputClass}
          placeholder="10"
        />
      </div>

      <div>
        <label className={labelClass}>Validity Days</label>
        <input
          type="number"
          min={1}
          value={plan.validityDays}
          onChange={(e) =>
            updatePlanField("validityDays", Number(e.target.value))
          }
          className={inputClass}
          placeholder="30"
        />
      </div>

      {showFeatures && (
        <div className="md:col-span-2">
          <label className={labelClass}>Features</label>
          <textarea
            value={plan.featuresText}
            onChange={(e) => updatePlanField("featuresText", e.target.value)}
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

      {!showFeatures && (
        <div className="md:col-span-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-300">
          Update API only accepts plan name, machine limit, price and validity
          days. Features are not sent in update payload.
        </div>
      )}
    </div>
  );
}