import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import toast from "react-hot-toast";
import Header from "../../components/landing/Navbar";
import Footer from "../../components/landing/Footer";
import {
  getSubscriptionPlans,
  type SubscriptionPlanApi,
} from "../../services/subscriptionService";
import { userService } from "../../services/userService";
import StorageService, { STORAGE_KEYS } from "../../services/storage.service";

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

type PricingPlan = {
  id: string | number;
  name: string;
  subtitle: string;
  price: string;
  numericPrice: number;
  period: string;
  limit: string;
  staffLimit: string;
  validity: string;
  features: string[];
  unavailableFeatures: string[];
  popular: boolean;
  icon: string;
  rawPlan: FlexibleSubscriptionPlanApi;
};

const featuresToArray = (
  features: Record<string, boolean> | string[] | null | undefined,
): string[] => {
  if (Array.isArray(features)) {
    return features.filter(Boolean);
  }

  if (features && typeof features === "object") {
    return Object.keys(features).filter((key) => features[key]);
  }

  return [];
};

const formatPrice = (price: string | number) => {
  const numericPrice = Number(String(price ?? "0").replace(/[^\d.]/g, ""));

  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(isNaN(numericPrice) ? 0 : numericPrice);
};

const getPlanName = (plan: FlexibleSubscriptionPlanApi) => {
  return (
    plan.planName ||
    plan.plan_name ||
    plan.name ||
    "Untitled Plan"
  ).trim();
};

const getMachineLimit = (plan: FlexibleSubscriptionPlanApi) => {
  return Number(plan.machineLimit ?? plan.machine_limit ?? 0);
};

const getStaffLimit = (plan: FlexibleSubscriptionPlanApi) => {
  return Number(plan.staffLimit ?? plan.staff_limit ?? 0);
};

const getValidityDays = (plan: FlexibleSubscriptionPlanApi) => {
  return Number(plan.validityDays ?? plan.validity_days ?? 30);
};

const getPlanType = (planName: string) => {
  const name = planName.toLowerCase();

  if (name.includes("gold")) return "gold";
  if (name.includes("demo") || name.includes("free")) return "demo";
  if (name.includes("basic")) return "basic";
  if (name.includes("standard")) return "standard";
  if (name.includes("pro") || name.includes("plus")) return "pro";
  if (name.includes("enterprise")) return "enterprise";

  return "default";
};

const getUnavailableFeatures = (planName: string): string[] => {
  const type = getPlanType(planName);

  if (type === "gold" || type === "enterprise") {
    return [];
  }

  if (type === "demo") {
    return [
      "Advanced reporting not included",
      "Limited machine and staff access",
      "Priority support not available",
    ];
  }

  if (type === "basic") {
    return [
      "Predictive intelligence not included",
      "Advanced reports not available",
      "Priority support not included",
    ];
  }

  if (type === "standard") {
    return [
      "Enterprise-level analytics not included",
      "Priority support not included",
      "Unlimited scaling not available",
    ];
  }

  if (type === "pro") {
    return [
      "Unlimited machine access not included",
      "Dedicated enterprise support not included",
    ];
  }

  return [
    "Some advanced modules may be limited",
    "Enterprise support not included",
  ];
};

const getFallbackFeatures = (
  planName: string,
  machineLimit: number,
  staffLimit: number,
  validityDays: number,
) => {
  const type = getPlanType(planName);

  if (type === "demo") {
    return [
      `${machineLimit} machines included`,
      `${staffLimit} staff users included`,
      `${validityDays} days demo validity`,
      "Basic machine health preview",
      "Limited component intelligence access",
    ];
  }

  if (type === "gold") {
    return [
      `${machineLimit} machines included`,
      `${staffLimit} staff users included`,
      `${validityDays} days validity`,
      "Advanced machine health monitoring",
      "Predictive component intelligence",
      "Priority support and reports",
    ];
  }

  if (type === "basic") {
    return [
      `${machineLimit} machines included`,
      `${staffLimit} staff users included`,
      `${validityDays} days validity`,
      "Machine health monitoring",
      "Basic alerts and reports",
    ];
  }

  if (type === "standard") {
    return [
      `${machineLimit} machines included`,
      `${staffLimit} staff users included`,
      `${validityDays} days validity`,
      "Machine and component monitoring",
      "Maintenance alerts and reports",
    ];
  }

  if (type === "pro") {
    return [
      `${machineLimit} machines included`,
      `${staffLimit} staff users included`,
      `${validityDays} days validity`,
      "Component intelligence access",
      "Advanced alerts and reports",
    ];
  }

  return [
    `${machineLimit} machines included`,
    `${staffLimit} staff users included`,
    `${validityDays} days validity`,
    "Machine health monitoring",
    "Component intelligence access",
    "Alerts and reports",
  ];
};

const mapApiPlanToPricingPlan = (
  plan: FlexibleSubscriptionPlanApi,
  index: number,
): PricingPlan => {
  const planName = getPlanName(plan);
  const machineLimit = getMachineLimit(plan);
  const staffLimit = getStaffLimit(plan);
  const validityDays = getValidityDays(plan);

  const apiFeatures = featuresToArray(plan.features);

  const finalFeatures =
    apiFeatures.length > 0
      ? apiFeatures
      : getFallbackFeatures(planName, machineLimit, staffLimit, validityDays);

  const lowerPlanName = planName.toLowerCase();

  return {
    id: plan.id,
    name: planName,
    subtitle:
      plan.description ||
      `${machineLimit} machine limit and ${staffLimit} staff users for mining operations.`,

    price: formatPrice(plan.price),

    numericPrice: Number(String(plan.price ?? "0").replace(/[^\d.]/g, "")),

    period: `/${validityDays} days`,
    limit: `${machineLimit} Machines`,
    staffLimit: `${staffLimit} Staff`,
    validity: `${validityDays} Days`,
    features: finalFeatures,
    unavailableFeatures: getUnavailableFeatures(planName),
    popular:
      lowerPlanName.includes("pro") ||
      lowerPlanName.includes("plus") ||
      index === 1,
    icon: planName.charAt(0).toUpperCase(),
    rawPlan: plan,
  };
};

function PricingHero() {
  return (
    <div className="relative mx-auto mb-16 max-w-6xl overflow-hidden rounded-[40px] px-6 py-12 text-center lg:px-10">
      {/* Background Glow */}
      <div className="absolute left-1/2 top-0 h-[280px] w-[280px] -translate-x-1/2 rounded-full bg-cyan-400/15 blur-[90px]" />

      <div className="absolute left-[15%] top-10 h-[180px] w-[180px] rounded-full bg-violet-400/10 blur-[80px]" />

      <div className="absolute right-[15%] top-10 h-[180px] w-[180px] rounded-full bg-sky-400/10 blur-[80px]" />

      {/* Right Side Human PNG */}

      {/* Main Content */}
      <div className="relative z-10">
        {/* Small Badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-white/80 px-5 py-2 text-sm font-semibold text-cyan-700 shadow-sm backdrop-blur-md dark:border-cyan-500/20 dark:bg-cyan-500/10 dark:text-cyan-300">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Flexible Pricing Plans
        </div>

        {/* Heading */}
        <h1 className="mx-auto max-w-5xl text-5xl font-black leading-tight tracking-tight sm:text-6xl">
          <span className="text-slate-900 dark:text-white">
            Smart Pricing for
          </span>

          <br />

          <span className="bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 bg-clip-text text-transparent">
            Smarter Mining Operations
          </span>
        </h1>

        {/* Description */}
        <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-slate-600 dark:text-slate-300">
          Choose the right subscription plan to monitor machines, track
          components, manage staff, and scale your mining operations with
          intelligent insights.
        </p>
      </div>
    </div>
  );
}

function PricingCard({
  plan,
  activePlan,
  hasUsedDemo,
}: {
  plan: PricingPlan;
  activePlan?: string | null;
  hasUsedDemo?: boolean;
}) {
  const navigate = useNavigate();
  const [, setShowConfirm] = useState(false);

  const isDemo =
    plan.name.toLowerCase().includes("free") ||
    plan.name.toLowerCase().includes("demo");

  const isDemoDisabled = isDemo && hasUsedDemo;

  const isCurrentPlan =
    activePlan &&
    activePlan.trim().toLowerCase() === plan.name.trim().toLowerCase();

  const proceedToCart = () => {
    const machineLimit =
      plan.rawPlan.machineLimit ?? plan.rawPlan.machine_limit ?? 0;

    const staffLimitValue =
      plan.rawPlan.staffLimit ?? plan.rawPlan.staff_limit ?? 0;

    const validityDays =
      plan.rawPlan.validityDays ?? plan.rawPlan.validity_days ?? 30;

    StorageService.set(STORAGE_KEYS.SELECTED_PLAN, {
      id: plan.id,
      name: plan.name,
      subtitle: plan.subtitle,
      price: plan.price,
      period: plan.period,
      limit: plan.limit,
      machineLimit,
      machine_limit: machineLimit,
      staffLimit: staffLimitValue,
      staff_limit: staffLimitValue,
      validityDays,
      validity_days: validityDays,
      validity: plan.validity,
      features: plan.features,
      icon: plan.icon,
      rawPlan: plan.rawPlan,
    });

    navigate("/cart");
  };

  const handleSelectPlan = () => {
    if (isDemoDisabled) {
      toast.dismiss();
      toast.error("You already used the demo plan. Please upgrade now.");
      return;
    }

    if (activePlan && !isCurrentPlan) {
      setShowConfirm(true);
      return;
    }

    proceedToCart();
  };

  return (
    <div
      className={`relative w-[360px] min-h-[600px]
    overflow-hidden rounded-[30px]
    border bg-white shadow-lg
    transition-all duration-300
    hover:-translate-y-1 hover:shadow-2xl
    dark:border-slate-700 dark:bg-[#0B1220]
    ${plan.popular ? "border-cyan-400/30" : "border-slate-200"}`}
    >
      {/* TOP COLORED SECTION */}
      <div
        className={`relative rounded-b-[36px] px-7 pt-8 pb-8 text-white
      ${
        plan.popular
          ? `
            bg-gradient-to-br
            from-cyan-500
            via-sky-500
            to-blue-600
          `
          : `
            bg-gradient-to-br
            from-violet-500
            via-indigo-500
            to-blue-600
          `
      }`}
      >
        {/* Recommended */}
        {plan.popular && (
          <div className="absolute top-5 right-5">
            <span className="rounded-full bg-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md border border-white/20">
              Best Deal
            </span>
          </div>
        )}

        {/* Title */}
        <h3 className="text-[30px] font-extrabold tracking-tight">
          {plan.name}
        </h3>

        {/* Subtitle */}
        <p className="mt-3 min-h-[52px] text-sm leading-6 text-white/90">
          {plan.subtitle}
        </p>

        {/* Price */}
        <div className="mt-8 flex items-end gap-2">
          <span className="text-[56px] font-black leading-none">
            {plan.price}
          </span>

          <span className="mb-2 text-sm font-medium text-white/80">
            {plan.period}
          </span>
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={handleSelectPlan}
          className={`
          mt-8 h-[52px] w-full rounded-[18px]
          bg-white text-slate-900
          text-sm font-bold
          transition hover:scale-[1.01]
          hover:bg-slate-100
          active:scale-[0.98]
          shadow-lg
        `}
        >
          {isDemoDisabled
            ? "Upgrade Now"
            : isCurrentPlan
              ? "Current Plan"
              : "Get Started"}
        </button>
      </div>

      {/* BOTTOM CONTENT */}
      <div className="px-7 py-7">
        {/* Features */}
        <div className="mt-8">
          <p className="mb-5 text-sm font-bold text-slate-800 dark:text-white">
            Benefits
          </p>

          <div className="space-y-4">
            {plan.features.slice(0, 5).map((feature) => (
              <div key={feature} className="flex items-start gap-3">
                <div
                  className={`
                  mt-1 flex h-5 w-5 shrink-0
                  items-center justify-center
                  rounded-full text-white
                  ${plan.popular ? "bg-cyan-500" : "bg-violet-500"}
                `}
                >
                  <span className="text-[10px] font-bold">✓</span>
                </div>

                <span className="text-sm leading-6 text-slate-700 dark:text-slate-300">
                  {feature}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PricingPlans({
  visiblePlans,
  loading,
  activePlan,
  hasUsedDemo,
}: {
  visiblePlans: PricingPlan[];
  loading: boolean;
  activePlan: string | null;
  hasUsedDemo: boolean;
}) {
  return (
    <main
      id="plans"
      className="relative z-10 overflow-x-hidden bg-gradient-to-br from-white via-blue-50 to-white px-4 py-10 lg:px-6 dark:from-[#050b18] dark:via-[#071b38] dark:to-[#050b18]"
    >
      <div className="pointer-events-none absolute left-1/2 top-16 h-72 w-72 -translate-x-1/2 rounded-full bg-blue-400/10 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-10 h-56 w-56 rounded-full bg-blue-600/5 blur-3xl" />

      <div className="relative mx-auto max-w-[1400px] w-full overflow-hidden px-4">
        <PricingHero />

        {loading ? (
          <p className="py-8 text-center text-sm font-semibold text-slate-500 dark:text-slate-300">
            Loading pricing plans...
          </p>
        ) : visiblePlans.length === 0 ? (
          <p className="py-8 text-center text-sm font-semibold text-slate-500 dark:text-slate-300">
            No pricing plans found.
          </p>
        ) : (
          <div className="mx-auto flex flex-wrap items-stretch justify-center gap-8 max-w-[1400px] pt-8 pb-10">
            {visiblePlans.map((plan) => (
              <div key={plan.id} className="flex h-full">
                <PricingCard
                  plan={plan}
                  activePlan={activePlan}
                  hasUsedDemo={hasUsedDemo}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

const comparisonRows = [
  {
    label: "Machine Access",
    value: (plan: PricingPlan) => plan.limit,
  },
  {
    label: "Staff Access",
    value: (plan: PricingPlan) => plan.staffLimit,
  },
  {
    label: "Plan Validity",
    value: (plan: PricingPlan) => plan.validity,
  },
  {
    label: "Machine Health Monitoring",
    value: (plan: PricingPlan) =>
      plan.features.some((item) => item.toLowerCase().includes("machine"))
        ? "✓ Included"
        : "× Limited",
  },
  {
    label: "Component Intelligence",
    value: (plan: PricingPlan) =>
      plan.features.some((item) => item.toLowerCase().includes("component"))
        ? "✓ Included"
        : "× Limited",
  },
  {
    label: "Advanced Reports",
    value: (plan: PricingPlan) =>
      plan.unavailableFeatures.some((item) =>
        item.toLowerCase().includes("report"),
      )
        ? "× Not Included"
        : "✓ Included",
  },
  {
    label: "Priority Support",
    value: (plan: PricingPlan) =>
      plan.unavailableFeatures.some((item) =>
        item.toLowerCase().includes("support"),
      )
        ? "× Not Included"
        : "✓ Included",
  },
];

function PricingComparison({ plans }: { plans: PricingPlan[] }) {
  return (
    <section
      id="comparison"
      className="
      relative overflow-hidden
      bg-gradient-to-br
      from-[#eef7ff]
      via-[#f9fbff]
      to-[#f3f7ff]
      px-5 py-20 lg:px-8

      dark:from-[#050b18]
      dark:via-[#08111f]
      dark:to-[#0b1424]
    "
    >
      {/* Background Design */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Left Blur */}
        <div className="absolute left-[-100px] top-[80px] h-[320px] w-[320px] rounded-full bg-cyan-300/20 blur-[120px]" />

        {/* Right Blur */}
        <div className="absolute right-[-120px] bottom-[60px] h-[320px] w-[320px] rounded-full bg-violet-300/20 blur-[120px]" />

        {/* Top Center */}
        <div className="absolute left-1/2 top-0 h-[240px] w-[240px] -translate-x-1/2 rounded-full bg-sky-300/10 blur-[100px]" />

        {/* Dot Pattern */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02]">
          <div
            className="h-full w-full"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, #0f172a 1px, transparent 0)",
              backgroundSize: "32px 32px",
            }}
          />
        </div>
      </div>

      <div className="relative mx-auto max-w-7xl">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-5 py-2 text-sm font-semibold text-cyan-700 shadow-sm dark:border-cyan-500/20 dark:bg-cyan-500/10 dark:text-cyan-300">
            Compare Plans
          </div>

          <h2 className="mt-5 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl dark:text-white">
            Compare Features Across Plans
          </h2>

          <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300">
            Compare machine access, reports, monitoring, intelligence, and
            support to choose the best plan for your business.
          </p>
        </div>

        {/* Comparison Table */}
        <div
          className="
          mt-14 overflow-hidden rounded-[34px]
          border border-white/50
          bg-white/75 backdrop-blur-2xl
          shadow-[0_20px_60px_rgba(15,23,42,0.08)]

          dark:border-white/10
          dark:bg-white/[0.03]
        "
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px]">
              {/* Header */}
              <thead>
                <tr className="bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-700 text-white">
                  <th className="px-6 py-7 text-left text-sm font-bold uppercase tracking-[0.15em]">
                    Features
                  </th>

                  {plans.map((plan) => (
                    <th key={plan.id} className="px-6 py-7 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-xs font-semibold uppercase tracking-[0.15em] text-white/80">
                          Plan
                        </span>

                        <span className="mt-2 text-lg font-black">
                          {plan.name}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Body */}
              <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                {comparisonRows.map((row) => (
                  <tr
                    key={row.label}
                    className="
                    transition-all duration-300
                    hover:bg-cyan-50/70
                    dark:hover:bg-cyan-500/5
                  "
                  >
                    {/* Left Label */}
                    <td className="px-6 py-5 font-semibold text-slate-800 dark:text-slate-100">
                      {row.label}
                    </td>

                    {/* Plan Values */}
                    {plans.map((plan) => {
                      const value = row.value(plan);
                      const isNegative = String(value).startsWith("×");

                      const isIncluded = String(value).startsWith("✓");

                      return (
                        <td
                          key={`${plan.id}-${row.label}`}
                          className="px-6 py-5 text-center"
                        >
                          <div
                            className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold transition-all
                            ${
                              isNegative
                                ? "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-300"
                                : isIncluded
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                                  : "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200"
                            }`}
                          >
                            {value}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

function PricingCTA() {
  return (
    <section className="relative z-10 overflow-x-hidden bg-blue-600 px-5 py-16 text-center text-white lg:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.25),transparent_45%)]" />

      <div className="relative mx-auto max-w-4xl">
        <h2 className="text-3xl font-black sm:text-5xl">
          Ready to Transform Your Mining Operations?
        </h2>

        <p className="mx-auto mt-5 max-w-2xl text-blue-50">
          Start with a plan that fits your fleet and scale your maintenance
          intelligence as your company grows.
        </p>

        <a
          href="#plans"
          className="mt-8 inline-flex rounded-2xl bg-white px-8 py-4 text-sm font-black text-blue-600 shadow-xl transition hover:-translate-y-0.5 hover:bg-blue-50"
        >
          View Plans →
        </a>
      </div>
    </section>
  );
}

export default function PricingPage() {
  const [active, setActive] = useState("plans");
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePlan, setActivePlan] = useState<string | null>(null);
  const [hasUsedDemo, setHasUsedDemo] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
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
                : Array.isArray(response?.result)
                  ? response.result
                  : Array.isArray(response?.subscriptions)
                    ? response.subscriptions
                    : [];

        const publicActivePlans = apiPlans.filter((plan) => {
          const isActive = plan.isActive ?? plan.is_active ?? true;
          const isPublic = plan.isPublic ?? plan.is_public ?? true;
          return isActive && isPublic;
        });

        setPlans(publicActivePlans.map(mapApiPlanToPricingPlan));

        const token =
          StorageService.get<string>(STORAGE_KEYS.TOKEN) ||
          StorageService.get<string>(STORAGE_KEYS.AUTH_TOKEN);

        if (token) {
          try {
            const [activeSub, history] = await Promise.all([
              userService.getActiveSubscription(),
              userService.getSubscriptionHistory(),
            ]);

            setActivePlan(
              activeSub?.plan_name ||
                activeSub?.planName ||
                activeSub?.name ||
                null,
            );

            setHasUsedDemo(
              Array.isArray(history) &&
                history.some((sub: any) => {
                  const historyPlanName = String(
                    sub?.plan_name || sub?.planName || sub?.name || "",
                  ).toLowerCase();

                  return (
                    historyPlanName.includes("demo") ||
                    historyPlanName.includes("free")
                  );
                }),
            );
          } catch (error) {
            console.error("Failed to fetch subscription status", error);
          }
        }
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to load pricing plans",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const visiblePlans = useMemo(() => {
    return [...plans]
      .sort((a, b) => {
        const priceA = Number(
          String(a.rawPlan.price ?? "0").replace(/[^\d.]/g, ""),
        );

        const priceB = Number(
          String(b.rawPlan.price ?? "0").replace(/[^\d.]/g, ""),
        );

        return priceA - priceB;
      })
      .slice(0, 5);
  }, [plans]);

  return (
    <div className="min-h-screen overflow-x-hidden pt-[90px] bg-white text-slate-900 transition-colors duration-300 dark:bg-[#050b18] dark:text-white">
      <Header active={active} setActive={setActive} />

      <main className="overflow-x-hidden">
        <PricingPlans
          visiblePlans={visiblePlans}
          loading={loading}
          activePlan={activePlan}
          hasUsedDemo={hasUsedDemo}
        />

        <PricingComparison plans={visiblePlans} />

        <PricingCTA />
      </main>

      <div className="overflow-x-hidden [&_.reveal]:!translate-y-0 [&_.reveal]:!opacity-100">
        <Footer />
      </div>
    </div>
  );
}
