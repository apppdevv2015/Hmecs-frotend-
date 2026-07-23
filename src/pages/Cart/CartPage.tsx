import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

import type { PricingPlan } from "../../data/pricingPlans";
import Navbar from "../../components/landing/Navbar";
import Footer from "../../components/landing/Footer";

import toast from "react-hot-toast";
import { initiatePayFastCheckout } from "../../services/payfastService";
import { userService } from "../../services/userService";
import StorageService, { STORAGE_KEYS } from "../../services/storage.service";

export default function CartPage() {
  const navigate = useNavigate();

  const [active, setActive] = useState("");
  const [plan, setPlan] = useState<PricingPlan | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);
  const [hasUsedDemo, setHasUsedDemo] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const getToken = () => {
    return (
      StorageService.get<string>(STORAGE_KEYS.TOKEN) ||
      StorageService.get<string>(STORAGE_KEYS.AUTH_TOKEN) ||
      StorageService.get<string>(STORAGE_KEYS.ACCESS_TOKEN)
    );
  };

  const refreshLoginStatus = () => {
    setIsLoggedIn(Boolean(getToken()));
  };

  useEffect(() => {
    const savedPlan = StorageService.get<PricingPlan>(STORAGE_KEYS.SELECTED_PLAN);
    refreshLoginStatus();

    if (savedPlan) {
      setPlan(savedPlan);
    }
  }, []);

  useEffect(() => {
    const checkLogin = () => {
      refreshLoginStatus();
    };

    window.addEventListener("storage", checkLogin);
    window.addEventListener("focus", checkLogin);

    return () => {
      window.removeEventListener("storage", checkLogin);
      window.removeEventListener("focus", checkLogin);
    };
  }, []);

  useEffect(() => {
    const checkDemo = async () => {
      if (!getToken()) return;

      try {
        const history = await userService.getSubscriptionHistory();

        const used =
          Array.isArray(history) &&
          history.some(
            (sub: any) =>
              sub.plan_name?.toLowerCase().includes("demo") ||
              sub.plan_name?.toLowerCase().includes("free"),
          );

        setHasUsedDemo(used);
      } catch (e) {
        console.error("Demo check failed", e);
      }
    };

    checkDemo();
  }, [isLoggedIn]);

  const handlePayment = async () => {
    const selectedPlan = plan as PricingPlan & {
      id?: string | number;
    };

    if (!getToken()) {
      toast.error("Please sign in first to continue payment");
      navigate("/signin?redirect=/cart");
      return;
    }

    if (!selectedPlan?.id) {
      toast.error("Plan ID not found");
      return;
    }

    const isDemo =
      selectedPlan.name?.toLowerCase().includes("demo") ||
      selectedPlan.name?.toLowerCase().includes("free");

    if (isDemo && hasUsedDemo) {
      toast.dismiss();
      toast.error("you used already demo plan", { duration: 4000 });
      setIsRedirecting(true);

      setTimeout(() => {
        navigate("/plans");
      }, 3000);

      return;
    }

    try {
      setIsPaymentLoading(true);

      const loadingToast = toast.loading("Opening PayFast payment page...");

      const idempotencyKey =
        crypto.randomUUID?.() ||
        Math.random().toString(36).substring(2) + Date.now().toString(36);

      const response = await initiatePayFastCheckout(
        selectedPlan.id,
        idempotencyKey,
      );

      toast.dismiss(loadingToast);

      if (response?.skip_payment) {
        toast.dismiss();
        toast.success(response.message || "Plan activated successfully!", {
          duration: 4000,
        });

        setIsRedirecting(true);

        setTimeout(() => {
          navigate("/company-admin/dashboard");
        }, 3000);

        return;
      }

      const paymentUrl =
        response?.checkout_url ||
        response?.payment_url ||
        response?.redirect_url ||
        response?.url;

      const paymentData = response?.data;

      if (!paymentUrl || !paymentData) {
        toast.error("Invalid PayFast response");
        return;
      }

      const form = document.createElement("form");
      form.method = "POST";
      form.action = paymentUrl;
      form.style.display = "none";

      Object.entries(paymentData).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "") return;

        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = String(value);
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();
    } catch (error) {
      console.error("Payment Error:", error);
      toast.error("Failed to open payment page");
    } finally {
      setIsPaymentLoading(false);
    }
  };

  const loggedIn = Boolean(getToken()) || isLoggedIn;

  if (isRedirecting) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 dark:bg-slate-950">
        <div className="text-center space-y-6 max-w-md w-full bg-white dark:bg-slate-900 p-12 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-white/5 animate-in zoom-in-95 duration-300">
          <div className="h-20 w-20 bg-orange-100 dark:bg-orange-500/10 rounded-3xl flex items-center justify-center mx-auto text-orange-500 animate-pulse">
            <span className="text-4xl font-black">!</span>
          </div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">
            Redirecting to plans...
          </h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
            Please wait while we take you to the plans page to upgrade your
            account.
          </p>
          <div className="flex justify-center gap-1.5">
            <div className="h-1.5 w-1.5 bg-orange-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
            <div className="h-1.5 w-1.5 bg-orange-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
            <div className="h-1.5 w-1.5 bg-orange-500 rounded-full animate-bounce" />
          </div>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">
        <Navbar active={active} setActive={setActive} />

        <main className="flex min-h-[520px] items-center justify-center px-4 pb-10 pt-20">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-xl dark:border-white/10 dark:bg-slate-900">
            <h1 className="text-2xl font-black">No Plan Selected</h1>

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Please select a plan first to continue checkout.
            </p>

            <button
              onClick={() => navigate("/pricing")}
              className="mt-6 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
            >
              Select Plan
            </button>
          </div>
        </main>

        <div className="[&_.reveal]:!translate-y-0 [&_.reveal]:!opacity-100">
          <Footer />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">
      <Navbar active={active} setActive={setActive} />

      <main className="flex min-h-[650px] items-center justify-center px-4 pb-12 pt-20 lg:pt-16">
        <div className="w-full max-w-5xl">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white md:text-3xl">
              Checkout Summary
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Review your selected plan and continue with payment.
            </p>
          </div>

          <div className="grid overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-slate-900 lg:grid-cols-2">
            <div className="p-5 md:p-7">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/5">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-2xl dark:bg-blue-600/20">
                    {plan.icon}
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-600">
                      Selected Plan
                    </p>

                    <h2 className="mt-1 text-2xl font-black capitalize tracking-wide">
                      {plan.name} Plan
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                      {plan.subtitle}
                    </p>
                  </div>
                </div>
              </div>

              <ul className="mt-6 space-y-3">
                <li className="flex gap-3 text-sm text-slate-700 dark:text-slate-200">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-black text-white">
                    ✓
                  </span>
                  Selected subscription:{" "}
                  <span className="font-bold capitalize">{plan.name}</span>
                </li>

                <li className="flex gap-3 text-sm text-slate-700 dark:text-slate-200">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-black text-white">
                    ✓
                  </span>
                  {plan.limit}
                </li>

                {plan.features.slice(0, 4).map((feature) => (
                  <li
                    key={feature}
                    className="flex gap-3 text-sm text-slate-700 dark:text-slate-200"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-black text-white">
                      ✓
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-500/20 dark:bg-blue-500/10">
                <p className="text-sm leading-6 text-slate-700 dark:text-slate-200">
                  {!loggedIn
                    ? "Please create your account or sign in first. After login/signup, you will come back to this cart page and the payment option will be available."
                    : "Click Pay Now to open the PayFast payment page. After successful payment, you will be redirected to the Sign In page."}
                </p>
              </div>
            </div>

            <div className="border-t border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-slate-950/40 md:p-7 lg:border-l lg:border-t-0">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center dark:border-white/10 dark:bg-slate-900">
                <h2 className="text-xl font-black text-blue-600 md:text-2xl">
                  Total Cost
                </h2>

                <p className="mt-4 text-4xl font-black text-blue-700 dark:text-blue-400">
                  {plan.price}
                </p>

                <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {plan.period}
                </p>
              </div>

              <div className="mt-6 space-y-4 text-sm">
                <div className="flex justify-between gap-4 border-b border-slate-200 pb-3 dark:border-white/10">
                  <span className="text-slate-500 dark:text-slate-400">
                    Plan
                  </span>
                  <span className="font-bold capitalize tracking-wide">
                    {plan.name}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-lg font-black text-blue-600">
                    Total
                  </span>
                  <span className="text-lg font-black text-blue-700 dark:text-blue-400">
                    {plan.price}
                  </span>
                </div>
              </div>

              {!loggedIn ? (
                <div className="mt-8 space-y-3">
                  <button
                    onClick={() => navigate("/signup?redirect=/cart")}
                    className="w-full rounded-xl bg-blue-600 px-7 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-blue-600/30 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Create Account
                  </button>

                  <button
                    onClick={() => navigate("/signin?redirect=/cart")}
                    className="w-full rounded-xl border border-slate-300 bg-white px-7 py-3 text-sm font-bold text-slate-800 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                  >
                    Already have account? Sign In
                  </button>
                </div>
              ) : (
                <div className="mt-8">
                  <button
                    onClick={handlePayment}
                    disabled={isPaymentLoading}
                    className="w-full rounded-xl bg-blue-600 px-7 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isPaymentLoading ? "Opening Payment..." : "Pay Now"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <div className="[&_.reveal]:!translate-y-0 [&_.reveal]:!opacity-100">
        <Footer />
      </div>
    </div>
  );
}