import { useEffect, useRef, useState } from "react";
import mine from "../../assets/images/pricingpage.jpg";

import { useNavigate } from "react-router";
import toast from "react-hot-toast";
import {
  ShieldCheck,
  CheckCircle2,
  Building2,
  ClipboardList,
  Users,
  Mail,
  BarChart3,
  Truck,
  Settings,
  Puzzle,
  type LucideIcon,
} from "lucide-react";
import Header from "../../components/landing/Navbar";
import Footer from "../../components/landing/Footer";
import { userService } from "../../services/Auth/userService";
import StorageService, { STORAGE_KEYS } from "../../services/storage.service";

interface QuotationPlan {
  id: "implementation_fee" | "monthly_licence";
  label: string;
}

interface SubscriptionStatus {
  activePlan: string | null;
}

const HOW_IT_WORKS_STEPS: {
  icon: LucideIcon;
  title: string;
  description: string;
}[] = [
  { icon: Building2, title: "Register Company", description: "Create your company account on HME." },
  { icon: ClipboardList, title: "Submit Request", description: "Provide your fleet details and requirements." },
  { icon: Users, title: "Admin Review", description: "Our team reviews your request and may ask for more info." },
  { icon: Mail, title: "Quotation Sent", description: "We prepare and send the best commercial offer." },
  { icon: CheckCircle2, title: "Accept & Contract", description: "Accept the quotation and sign the agreement." },
  { icon: BarChart3, title: "Full Access", description: "Account activated and full portal access granted." },
];

const IMPLEMENTATION_FEE_ITEMS = [
  "Platform and company setup",
  "Fleet and component data loading",
  "User and permission configuration",
  "Workflow setup",
  "Training",
  "Initial dashboards and reports",
  "Integration setup, where required",
];

const COMMON_SERVICES_ITEMS = [
  "Telematics / ECU Integration",
  "SAP / ERP Integration",
  "Custom Reports",
  "Historical Data Migration & Cleaning",
  "Additional Training",
  "On-site Technical Support",
  "Custom API Development",
  "SMS / WhatsApp Notifications",
];

const SITE_LICENCE_TIERS: {
  allowance: string;
  price: string;
  highlight?: boolean;
}[] = [
  { allowance: "Up to 10 Machines", price: "Priced on request" },
  { allowance: "11 – 25 Machines", price: "Priced on request" },
  { allowance: "26 – 75 Machines", price: "Priced on request" },
  { allowance: "76 – 150 Machines", price: "Priced on request" },
  { allowance: "151+ Machines or Multiple Sites", price: "Custom Pricing", highlight: true },
];

function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-white dark:bg-[#050b18]">
      <div className="pointer-events-none absolute left-1/4 top-0 h-[280px] w-[280px] -translate-x-1/2 rounded-full bg-cyan-400/10 blur-[100px]" />
      <div className="pointer-events-none absolute right-0 top-10 h-[240px] w-[240px] rounded-full bg-violet-400/10 blur-[100px]" />

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-stretch gap-10 px-6 py-14 lg:grid-cols-2 lg:gap-14 lg:px-10 lg:py-16">
        <div className="flex flex-col justify-center">
          <h1 className="text-5xl font-black leading-[1.1] tracking-tight text-slate-900 sm:text-6xl dark:text-white">
            Smart Mining.
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
              Smarter Decisions.
            </span>
          </h1>

          <p className="mt-5 max-w-lg text-base leading-7 text-slate-600 dark:text-slate-300">
            HME helps you monitor, maintain and maximize your mining
            equipment performance with intelligent insights.
          </p>

          <div className="mt-8 inline-flex w-fit items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4 dark:border-blue-500/20 dark:bg-blue-500/10">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
            <p className="text-sm leading-6 text-slate-700 dark:text-slate-200">
              <span className="block font-semibold text-slate-900 dark:text-white">
                No prices are shown here.
              </span>
              Pricing will be provided in the quotation.
            </p>
          </div>
        </div>

        <div className="relative min-h-[280px] lg:min-h-0">
          <div className="absolute inset-0 overflow-hidden rounded-[36px] shadow-2xl">
            <img
              src={mine}
              alt="HME mining equipment fleet in operation"
              className="h-full w-full object-cover"
              loading="eager"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------- Commercial Structure: cards ----------------
// NOTE: cards are intentionally NOT stretched to equal height (see the
// grid wrapper below using `items-start`). That's what previously caused
// the Implementation Fee card to visually "open up" / grow whenever the
// Site Licence card's dropdown was toggled.

function ImplementationFeeCard({ onRequestQuote }: { onRequestQuote: () => void }) {
  return (
    <div className="flex h-full flex-col rounded-[26px] border border-blue-200 bg-white p-6 shadow-sm dark:border-blue-500/30 dark:bg-[#0B1220]">
      <div className="mb-3 flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
          <Settings className="h-5 w-5" />
        </div>
        <div>
          <span className="text-sm font-black text-blue-600 dark:text-blue-400">01</span>
          <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
            Once-Off Implementation Fee
          </h3>
        </div>
      </div>

      <span className="inline-flex w-fit items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
        One-Time Fee
      </span>

      <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
        Covers complete platform setup and deployment to get your operations
        running smoothly.
      </p>

      <ul className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2.5 border-t border-slate-100 pt-4 dark:border-slate-800 sm:grid-cols-2">
        {IMPLEMENTATION_FEE_ITEMS.map((item) => (
          <li
            key={item}
            className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-300" />
            {item}
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-6">
        <button
          type="button"
          onClick={onRequestQuote}
          className="flex h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-violet-600 text-sm font-bold text-white transition hover:bg-violet-700"
        >
          <ClipboardList className="h-4 w-4" />
          Request Quotation
        </button>
      </div>
    </div>
  );
}

function SiteLicenceCard({ onSelectFleetSize }: { onSelectFleetSize: () => void }) {
  const [isAdditionalOpen, setIsAdditionalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close the dropdown when clicking outside it, since it now overlays
  // the card instead of pushing layout (so it won't stay stuck open).
  useEffect(() => {
    if (!isAdditionalOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsAdditionalOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isAdditionalOpen]);

  return (
    <div className="flex h-full flex-col rounded-[26px] border border-violet-200 bg-white p-6 shadow-sm dark:border-violet-500/30 dark:bg-[#0B1220]">
      <div className="mb-3 flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300">
          <Building2 className="h-5 w-5" />
        </div>
        <div>
          <span className="text-sm font-black text-violet-600 dark:text-violet-400">02</span>
          <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
            Fixed Monthly Site Licence
          </h3>
        </div>
      </div>

      <span className="inline-flex w-fit items-center rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
        Monthly Licence
      </span>

      <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
        Licence fee is based on the number of active machines in your fleet.
      </p>

      <div className="mt-4 overflow-hidden rounded-2xl border border-violet-100 dark:border-violet-500/20">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="bg-violet-50 text-xs font-bold uppercase tracking-wide text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
              <th className="px-4 py-2.5">Active Machines</th>
              <th className="px-4 py-2.5">Monthly Licence</th>
            </tr>
          </thead>
          <tbody>
            {SITE_LICENCE_TIERS.map((tier) => (
              <tr
                key={tier.allowance}
                className="border-t border-violet-100 dark:border-violet-500/10"
              >
                <td className="flex items-center gap-2 px-4 py-2.5 text-slate-700 dark:text-slate-200">
                  <Truck className="h-4 w-4 shrink-0 text-violet-500" />
                  {tier.allowance}
                </td>
                <td
                  className={`px-4 py-2.5 ${
                    tier.highlight
                      ? "font-bold text-violet-700 dark:text-violet-300"
                      : "font-semibold text-slate-800 dark:text-slate-100"
                  }`}
                >
                  {tier.price}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>


      <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
          <Truck className="h-4 w-4 text-violet-500" />
          Monthly Additional Charge
        </div>

        <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
          If the mine exceeds its contracted fleet allowance, a fixed
          monthly fee will be charged for every additional active machine
        </p>
      </div>

      <div className="mt-auto pt-4">
        <button
          type="button"
          onClick={onSelectFleetSize}
          className="flex h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-violet-600 text-sm font-bold text-white transition hover:bg-violet-700"
        >
          <Building2 className="h-4 w-4" />
          Request Quotation
        </button>
      </div>
    </div>
  );
}

function CommonServicesCard() {
  return (
    <div className="flex flex-col rounded-[26px] border border-amber-200 bg-white p-6 shadow-sm dark:border-amber-500/30 dark:bg-[#0B1220]">
      <div className="mb-3 flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300">
          <Puzzle className="h-5 w-5" />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
             Optional Services 
          </h3>
          <span className="inline-flex w-fit items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
            Included / As Per Requirement
          </span>
        </div>
      </div>

      <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
        Enhance your solution with additional integrations and value-added
        services.
      </p>

      <ul className="mt-4 grid grid-cols-1 gap-x-8 gap-y-2.5 border-t border-slate-100 pt-4 dark:border-slate-800 sm:grid-cols-2 lg:grid-cols-3">
        {COMMON_SERVICES_ITEMS.map((item) => (
          <li
            key={item}
            className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-300" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CommercialStructureSection({
  onRequestQuote,
}: {
  onRequestQuote: (plan: QuotationPlan) => void;
}) {
  return (
    <section className="relative bg-slate-50 px-6 py-16 lg:px-10 dark:bg-[#071322]">
      <div className="mx-auto max-w-6xl text-center">
        <p className="text-sm font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400">
          Commercial Structure
        </p>
        <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl dark:text-white">
          Transparent Pricing, Flexible Options
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
          Our commercial model is simple, scalable and tailored to your
          operational needs.
        </p>
      </div>

      {/*
        items-stretch: both cards always match height (bottom edges
        aligned). This is safe now because the additional-charge dropdown
        inside SiteLicenceCard is an absolute overlay (see SiteLicenceCard)
        — it floats above the card instead of pushing its height, so
        opening it never breaks the equal-height alignment.
      */}
      <div className="mx-auto mt-12 grid max-w-6xl grid-cols-1 items-stretch gap-8 lg:grid-cols-2">
        <ImplementationFeeCard
          onRequestQuote={() =>
            onRequestQuote({
              id: "implementation_fee",
              label: "Once-Off Implementation Fee",
            })
          }
        />
        <SiteLicenceCard
          onSelectFleetSize={() =>
            onRequestQuote({
              id: "monthly_licence",
              label: "Fixed Monthly Site Licence",
            })
          }
        />
      </div>

      <div className="mx-auto mt-8 max-w-6xl">
        <CommonServicesCard />
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="relative bg-slate-50 px-6 py-16 lg:px-10 dark:bg-[#071322]">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-center text-2xl font-black tracking-tight text-slate-900 sm:text-3xl dark:text-white">
          How It Works
        </h2>

        <div className="mt-12 flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          {HOW_IT_WORKS_STEPS.map(({ icon: Icon, title, description }, index) => (
            <div
              key={title}
              className="flex items-start gap-4 md:flex-1 md:flex-col md:items-center md:gap-0 md:text-center"
            >
              <div className="flex items-center">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-md">
                  <Icon className="h-6 w-6" />
                </div>

                {index < HOW_IT_WORKS_STEPS.length - 1 && (
                  <div className="ml-2 hidden h-0 w-10 border-t-2 border-dashed border-blue-200 dark:border-blue-500/30 md:block lg:w-16" />
                )}
              </div>

              <div className="md:mt-3">
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {index + 1}. {title}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300 md:mx-auto md:max-w-[160px]">
                  {description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function PricingPage() {
  const navigate = useNavigate();
  const [active, setActive] = useState("plans");

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [status, setStatus] = useState<SubscriptionStatus>({
    activePlan: null,
  });
  const [checkingStatus, setCheckingStatus] = useState(true);

  const getToken = () =>
    StorageService.get<string>(STORAGE_KEYS.TOKEN) ||
    StorageService.get<string>(STORAGE_KEYS.AUTH_TOKEN) ||
    StorageService.get<string>(STORAGE_KEYS.ACCESS_TOKEN);

  const refreshLoginStatus = () => {
    setIsLoggedIn(Boolean(getToken()));
  };

  useEffect(() => {
    refreshLoginStatus();
  }, []);

  useEffect(() => {
    const checkLogin = () => refreshLoginStatus();

    window.addEventListener("storage", checkLogin);
    window.addEventListener("focus", checkLogin);

    return () => {
      window.removeEventListener("storage", checkLogin);
      window.removeEventListener("focus", checkLogin);
    };
  }, []);

  useEffect(() => {
    const fetchStatus = async () => {
      if (!getToken()) {
        setStatus({ activePlan: null });
        setCheckingStatus(false);
        return;
      }

      try {
        setCheckingStatus(true);

        const activeSub = await userService.getActiveSubscription();

        const activePlan =
          activeSub?.plan_name || activeSub?.planName || activeSub?.name || null;

        setStatus({ activePlan });
      } catch (error) {
        console.error("Failed to fetch subscription status", error);
      } finally {
        setCheckingStatus(false);
      }
    };

    fetchStatus();
  }, [isLoggedIn]);

  const handleSelect = (plan: QuotationPlan) => {
    if (checkingStatus) return;

    if (status.activePlan) {
      toast.dismiss();
      toast.error("You already have an active subscription.");
      navigate("/company-admin/dashboard");
      return;
    }

    navigate("/signup", {
      state: {
        quotationType: plan.id,
        quotationTypeLabel: plan.label,
      },
    });
  };

  return (
    <div className="min-h-screen overflow-x-hidden pt-[90px] bg-white text-slate-900 transition-colors duration-300 dark:bg-[#050b18] dark:text-white">
      <Header active={active} setActive={setActive} />

      <main className="overflow-x-hidden">
        <HeroSection />

        <CommercialStructureSection onRequestQuote={handleSelect} />

        <HowItWorks />
      </main>

      <div className="overflow-x-hidden [&_.reveal]:!translate-y-0 [&_.reveal]:!opacity-100">
        <Footer />
      </div>
    </div>
  );
}