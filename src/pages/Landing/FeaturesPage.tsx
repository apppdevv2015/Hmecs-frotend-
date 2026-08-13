import { useEffect, useState } from "react";
import Navbar from "../../components/landing/Navbar";
import Footer from "../../components/landing/Footer";
import RoleImg from "../../assets/images/landingpageimages/FuturePage/RolesImg.jpg";
import img1 from "../../assets/images/landingpageimages/FuturePage/img1.jpg";
import engine from "../../assets/images/landingpageimages/FuturePage/Engine.jpg";
import hydraulic from "../../assets/images/landingpageimages/FuturePage/Hydraulic.jpg";
import tyre from "../../assets/images/landingpageimages/FuturePage/Tyre&Suspention.jpg";
import alert from "../../assets/images/landingpageimages/FuturePage/Alert.jpg";
import report from "../../assets/images/landingpageimages/FuturePage/report.jpg";
import fleet from "../../assets/images/landingpageimages/FuturePage/Fleeet.jpg";
import roles from "../../assets/images/landingpageimages/FuturePage/RolesImg.jpg";

import { Link } from "react-router-dom";
import {
  Gauge,
  Thermometer,
  Droplets,
  CircleGauge,
  BellRing,
  FileBarChart2,
  Boxes,
  ShieldCheck,
  Activity,
  Users,
  LayoutDashboard,
  Wrench,
  TrendingUp,
  Radio,
  Lock,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

// BACKEND TODO: replace with live capability/version data from
// GET /api/platform/features (feature flags, plan-gated capability list)

type CoreFeature = {
  icon: typeof Gauge;
  title: string;
  description: string;
  points: string[];
};

const coreFeatures: CoreFeature[] = [
  {
    icon: Thermometer,
    title: "Engine Health Monitoring",
    description:
      "Continuous visibility into engine temperature, RPM, runtime and load so failures are caught before they cause downtime.",
    points: [
      "Real-time temperature & load tracking",
      "Runtime hours logged per machine",
      "Early warning on abnormal patterns",
    ],
  },
  {
    icon: Droplets,
    title: "Hydraulic System Intelligence",
    description:
      "Track hydraulic pressure, oil temperature and leak risk across every unit in the fleet from a single dashboard.",
    points: [
      "Pressure & oil temperature trends",
      "Automated leak-risk detection",
      "Component-level flow status",
    ],
  },
  {
    icon: CircleGauge,
    title: "Tyre & Suspension Analytics",
    description:
      "Monitor tyre pressure, wear and suspension performance to reduce blowouts and unplanned service stops.",
    points: [
      "Per-tyre pressure & temperature data",
      "Suspension vibration analysis",
      "Wear-rate based replacement alerts",
    ],
  },
  {
    icon: BellRing,
    title: "Smart Alerts",
    description:
      "Configurable, role-based alerts route the right issue to the right person the moment it happens.",
    points: [
      "Severity-based escalation rules",
      "SMS, email & in-app notifications",
      "Live status indicators on every alert",
    ],
  },
  {
    icon: FileBarChart2,
    title: "Maintenance & Compliance Reports",
    description:
      "Generate audit-ready maintenance reports and export PDFs for compliance, warranty and internal review.",
    points: [
      "Approval workflow for supervisors",
      "One-click PDF export",
      "Full activity timeline per asset",
    ],
  },
  {
    icon: Boxes,
    title: "Cross-Company Fleet View",
    description:
      "Super admins get a consolidated, searchable view of every company, site and machine on the platform.",
    points: [
      "Fleet-wide health heatmaps",
      "Searchable multi-company directory",
      "Scales to 100+ managed companies",
    ],
  },
];

const featureImages: Record<string, string> = {
  "Engine Health Monitoring": engine,
  "Hydraulic System Intelligence": hydraulic,
  "Tyre & Suspension Analytics": tyre,
  "Smart Alerts": alert,
  "Maintenance & Compliance Reports": report,
  "Cross-Company Fleet View": fleet,
};

const roleAccess = [
  {
    icon: LayoutDashboard,
    role: "Super Admin",
    detail: "Platform-wide oversight, billing and cross-company fleet analytics.",
  },
  {
    icon: Users,
    role: "Admin",
    detail: "Manage staff, machines and subscription for a single company.",
  },
  {
    icon: ShieldCheck,
    role: "Supervisor",
    detail: "Review alerts, approve reports and track team performance.",
  },
  {
    icon: Wrench,
    role: "Engineer / Artisan",
    detail: "Assigned-machine diagnostics, service history and task queues.",
  },
  {
    icon: Activity,
    role: "Operator",
    detail: "Daily inspection logs, issue reporting and machine status.",
  },
];

const platformStats = [
  { value: "99.8%", label: "Monitoring Uptime" },
  { value: "24/7", label: "Live Alert Coverage" },
  { value: "100+", label: "Companies Supported" },
  { value: "5", label: "Role-Based Access Levels" },
];

export default function FeaturesPage() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
  }, []);

  return (
    <div className="min-h-screen pt-[90px] bg-white text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      <Navbar />

      <main>
        <section className="border-y border-slate-200 bg-white py-20 dark:border-slate-800 dark:bg-slate-950">
          <div className="relative z-10 mx-auto max-w-3xl px-5 text-center sm:px-6 lg:px-8">
            <p className="text-sm font-bold uppercase tracking-[0.32em] text-blue-600">
              Role-Based Access
            </p>

            {/* Heading */}
            <h2 className="mt-5 text-3xl font-extrabold leading-[1.08] tracking-[-0.03em] text-slate-950 dark:text-white sm:text-4xl lg:text-5xl">
              One platform,
              <span className="bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 bg-clip-text text-transparent">
                {" "}
                tuned for every role
              </span>{" "}
              on your team
            </h2>

            {/* Description */}
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
              Every user sees exactly what their role needs—nothing more. Permissions, dashboards,
              and workflows are intelligently tailored for each role, from{" "}
              <span className="font-semibold text-slate-900 dark:text-white">Super Admin</span> to{" "}
              <span className="font-semibold text-slate-900 dark:text-white">Operator</span>.
            </p>

            {/* Accent Divider */}
            <div className="mx-auto mt-8 h-1 w-20 rounded-full bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400" />
          </div>

          {/* Full Width Image */}
          <div className="mt-14 w-full">
            <img
              src={RoleImg}
              alt="Role Based Access"
              className="block h-auto w-full object-cover"
            />
          </div>

          {/* Security Note */}
          <div className="mx-auto mt-8 max-w-3xl px-5 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
              <Lock className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />

              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                Access is enforced server-side for every request, ensuring users can only access the
                resources assigned to their role.
              </p>
            </div>
          </div>

          {/* Role Cards */}
          <div className="mx-auto mt-16 max-w-7xl px-5 sm:px-6 lg:px-8">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
              {roleAccess.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.role}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-blue-400 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-slate-950">
                      <Icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>

                    <h3 className="mt-5 text-lg font-bold text-slate-900 dark:text-white">
                      {item.role}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                      {item.detail}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CORE FEATURES GRID */}
        <section className="bg-slate-50 px-5 py-20 dark:bg-slate-900/30 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600">
                Core Capabilities
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                Component-level intelligence, fleet-wide
              </h2>
            </div>

            <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {coreFeatures.map((feature) => {
                const Icon = feature.icon;

                return (
                  <div
                    key={feature.title}
                    className="group flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-md transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="relative h-56 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                      <img
                        src={featureImages[feature.title] ?? "/images/features/fleet-overview.webp"}
                        alt={feature.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />

                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                    </div>

                    <div className="flex flex-1 flex-col p-6">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white dark:bg-blue-500/10 dark:text-blue-400">
                        <Icon className="h-5 w-5" />
                      </div>

                      <h3 className="mt-4 text-lg font-bold text-slate-950 dark:text-white">
                        {feature.title}
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                        {feature.description}
                      </p>

                      <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                        {feature.points.map((point) => (
                          <li
                            key={point}
                            className="flex items-start gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300"
                          >
                            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
        <section className="border-b border-slate-200 bg-white px-5 py-14 dark:border-slate-800 dark:bg-slate-950 sm:px-6 lg:px-8 lg:py-16">
          <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div
              className={`transition-all duration-700 ${
                visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
              }`}
            >
              <p className="text-xs font-black uppercase tracking-[0.3em] text-blue-600">
                Platform Capabilities
              </p>

              <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight text-slate-950 dark:text-white sm:text-4xl lg:text-5xl">
                Everything you need to keep heavy equipment running
              </h1>

              <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 dark:text-slate-300">
                HMEC brings engine, hydraulic, tyre and suspension monitoring, maintenance reporting
                and role-based fleet management into a single, dependable system built for mining
                and industrial operations.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  to="/plans"
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
                >
                  See Our Plans
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                  to="/company-admin/coming-soon/demo"
                  className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-black text-slate-900 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
                >
                  Book Demo
                </Link>
              </div>
            </div>

            {/* BACKEND TODO / DESIGN TODO: replace this placeholder block with the real hero photo (e.g. machine on-site, dashboard screenshot) */}
            <div
              className={`relative overflow-hidden rounded-[1.1rem] border border-slate-200 bg-slate-50 shadow-xl transition-all duration-700 dark:border-slate-800 dark:bg-slate-900 ${
                visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
              }`}
            >
              <div className="aspect-[16/10] w-full overflow-hidden ">
                <img
                  src={img1}
                  alt="HMEC Heavy Equipment Monitoring Platform"
                  className="h-full w-full object-cover transition duration-700 hover:scale-105"
                />
              </div>

              <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-slate-950/80 px-5 py-3 text-xs font-semibold text-white backdrop-blur">
                <Radio className="h-3.5 w-3.5 text-emerald-400" />
                Live component-level monitoring, fleet-wide
              </div>
            </div>
          </div>

          {/* STATS STRIP */}
          <div className="mx-auto mt-12 grid max-w-5xl grid-cols-2 gap-4 sm:grid-cols-4">
            {platformStats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-center dark:border-slate-800 dark:bg-slate-900"
              >
                <p className="text-2xl font-black text-blue-600 sm:text-3xl">{stat.value}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* PREDICTIVE INSIGHT STRIP */}
        <section className="bg-slate-50 px-5 py-20 dark:bg-slate-900/30 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600">
                Predictive Maintenance
              </p>

              <h2 className="mt-3 text-3xl font-black leading-tight tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                Move from reactive repairs to planned maintenance
              </h2>

              <p className="mt-5 max-w-lg text-sm leading-7 text-slate-600 dark:text-slate-300">
                HMEC correlates component telemetry over time to flag degradation trends early, so
                your team can schedule service before a breakdown takes a machine off the site.
              </p>

              <div className="mt-8 space-y-4">
                {[
                  "Trend analysis across engine, hydraulic and tyre data",
                  "Downtime-risk scoring per machine",
                  "Service scheduling based on real usage, not fixed intervals",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 text-sm font-semibold text-slate-700 dark:text-slate-300"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs text-white">
                      ✓
                    </span>
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* Live mock dashboard card — kept as UI, not a photo slot */}
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
              <div className="rounded-2xl bg-slate-950 p-6 text-white">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-300">
                    Fleet Risk Overview
                  </p>
                  <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-400">
                    <Radio className="h-3 w-3" />
                    Live
                  </span>
                </div>

                <div className="mt-7 space-y-5">
                  {[
                    ["Excavator Unit EX-104", "Low Risk", 18],
                    ["Loader Unit LD-221", "Moderate Risk", 46],
                    ["Dump Truck DT-338", "High Risk", 78],
                  ].map(([label, status, value]) => (
                    <div key={label as string}>
                      <div className="mb-2 flex items-center justify-between text-sm font-bold">
                        <span>{label}</span>
                        <span
                          className={
                            (value as number) > 65
                              ? "text-red-400"
                              : (value as number) > 35
                                ? "text-amber-400"
                                : "text-blue-300"
                          }
                        >
                          {status}
                        </span>
                      </div>

                      <div className="h-2 rounded-full bg-white/10">
                        <div
                          className={`h-2 rounded-full ${
                            (value as number) > 65
                              ? "bg-red-500"
                              : (value as number) > 35
                                ? "bg-amber-500"
                                : "bg-blue-500"
                          }`}
                          style={{ width: `${value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex items-center gap-2 border-t border-white/10 pt-4 text-xs font-semibold text-slate-300">
                  <TrendingUp className="h-4 w-4 text-blue-300" />
                  Risk scores update automatically as new telemetry arrives.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-blue-700 px-5 py-16 text-center text-white lg:px-8">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-3xl font-black leading-tight md:text-4xl">
              See these features running on your fleet
            </h2>

            <p className="mx-auto mt-4 max-w-xl text-blue-100">
              Explore pricing plans or book a walkthrough with our team to see HMEC configured for
              your operation.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/plans"
                className="rounded-xl bg-white px-6 py-3 text-sm font-black text-blue-700 shadow-xl transition hover:bg-blue-50"
              >
                See Our Plans
              </Link>

              <Link
                to="/company-admin/coming-soon/demo"
                className="rounded-xl border border-white/40 bg-transparent px-6 py-3 text-sm font-black text-white transition hover:bg-white/10"
              >
                Book Demo
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
