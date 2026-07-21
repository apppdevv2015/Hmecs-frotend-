import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../../components/landing/Navbar";
import Footer from "../../components/landing/Footer";
import {
  BarChart3,
  Settings,
  Wrench,
  CircleGauge,
  TrendingUp,
  AlertTriangle,
  FileText,
  Zap,
  ShieldCheck,
  ArrowRight,
  Database,
  Cpu,
  ClipboardCheck,
} from "lucide-react";

// BACKEND TODO: replace with live reporting stats from
// GET /api/reports/summary (fleet availability, machine health, compliance, alerts)

const reportingSummary = [
  { label: "Fleet Availability", value: "96%", width: "w-[96%]" },
  { label: "Machine Health", value: "92%", width: "w-[92%]" },
  { label: "Maintenance Compliance", value: "89%", width: "w-[89%]" },
  { label: "Critical Alerts", value: "12", width: "w-[40%]" },
];

const summaryCards = [
  { value: "128", label: "Reports Generated" },
  { value: "48", label: "Active Machines" },
];

type ReportCategory = {
  icon: typeof BarChart3;
  title: string;
  description: string;
};

const reportCategories: ReportCategory[] = [
  {
    icon: BarChart3,
    title: "Fleet Reports",
    description:
      "Monitor fleet utilization, equipment availability, and overall operational performance.",
  },
  {
    icon: Settings,
    title: "Machine Reports",
    description: "Analyze machine runtime, health score, operating hours, and productivity trends.",
  },
  {
    icon: Wrench,
    title: "Maintenance Reports",
    description:
      "Review completed services, pending maintenance schedules, and work order history.",
  },
  {
    icon: CircleGauge,
    title: "Component Reports",
    description:
      "Track engine, tyre, hydraulic, and transmission health with detailed component reports.",
  },
  {
    icon: TrendingUp,
    title: "Performance Reports",
    description:
      "Compare equipment performance, productivity, utilization, and fuel efficiency trends.",
  },
  {
    icon: AlertTriangle,
    title: "Alert Reports",
    description:
      "View alert history, critical incidents, risk trends, and resolution status across your fleet.",
  },
];

const analyticsStats = [
  {
    label: "Fleet Health",
    value: "96%",
    note: "Excellent Condition",
    tone: "text-emerald-600 dark:text-emerald-400",
  },
  {
    label: "Machines Online",
    value: "48",
    note: "Active Equipment",
    tone: "text-slate-500 dark:text-slate-400",
  },
  {
    label: "Reports Generated",
    value: "128",
    note: "This Month",
    tone: "text-slate-500 dark:text-slate-400",
  },
  {
    label: "Critical Alerts",
    value: "06",
    note: "Immediate Action",
    tone: "text-red-500 dark:text-red-400",
    valueTone: "text-red-500 dark:text-red-400",
  },
];

const analyticsProgress = [
  { title: "Machine Utilization", value: "92%", width: "w-[92%]" },
  { title: "Maintenance Compliance", value: "88%", width: "w-[88%]" },
  { title: "Component Health", value: "95%", width: "w-[95%]" },
  { title: "Fuel Efficiency", value: "81%", width: "w-[81%]" },
];

const analyticsHighlights = [
  "Real-time operational reporting",
  "Automatic maintenance summaries",
  "Component health analytics",
  "Fleet utilization reports",
  "Downtime trend analysis",
  "Historical performance tracking",
];

const workflowSteps = [
  {
    icon: Database,
    title: "Machine Data",
    description:
      "Live telemetry is captured from every engine, hydraulic and tyre sensor across your fleet.",
  },
  {
    icon: Cpu,
    title: "Sensor Analysis",
    description:
      "Raw readings are cleaned and checked against safe operating ranges for each component.",
  },
  {
    icon: Zap,
    title: "AI Processing",
    description:
      "Patterns and degradation trends are identified across engine, hydraulic and tyre data.",
  },
  {
    icon: FileText,
    title: "Report Generation",
    description: "Structured reports are compiled automatically, ready for export as PDF or Excel.",
  },
  {
    icon: ClipboardCheck,
    title: "Management Review",
    description:
      "Supervisors and admins review, approve and act on the findings from a single dashboard.",
  },
];

const whyHmec = [
  {
    icon: BarChart3,
    title: "Accurate Analytics",
    description:
      "Generate detailed operational reports using live equipment and component data collected from across your fleet.",
  },
  {
    icon: Zap,
    title: "Real-Time Insights",
    description:
      "Instantly monitor machine health, maintenance activities and operational performance without waiting for manual reports.",
  },
  {
    icon: FileText,
    title: "Export Ready",
    description:
      "Download professional PDF and Excel reports for audits, compliance reviews and management presentations.",
  },
  {
    icon: ShieldCheck,
    title: "Enterprise Security",
    description:
      "Role-based permissions ensure reports are securely accessed only by authorized users across the organization.",
  },
];

const platformBenefits = [
  "Centralized Reporting",
  "Live Equipment Analytics",
  "Maintenance History",
  "Fleet Performance Tracking",
  "Component Health Monitoring",
  "Role-Based Report Access",
  "Automated Report Generation",
  "Easy PDF & Excel Export",
];

export default function ReportsPage() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
  }, []);

  return (
    <div className="min-h-screen pt-[90px] bg-white text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      <Navbar />

      <main>
        {/* HERO */}
        <section className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50 px-5 py-16 dark:border-slate-800 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950 sm:px-6 lg:px-8 lg:py-20">
          {/* Background Effects */}
          <div className="absolute -left-40 top-10 h-96 w-96 rounded-full bg-blue-400/15 blur-[120px]" />

          <div className="absolute -right-32 bottom-0 h-[420px] w-[420px] rounded-full bg-cyan-400/15 blur-[140px]" />

          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: `
        linear-gradient(to right,#2563eb 1px,transparent 1px),
        linear-gradient(to bottom,#2563eb 1px,transparent 1px)
      `,
              backgroundSize: "52px 52px",
            }}
          />

          <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-2">
            {/* Left */}
            <div
              className={`transition-all duration-700 ${
                visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
              }`}
            >
              <p className="text-sm font-bold uppercase tracking-[0.32em] text-blue-600">
                Reports & Analytics
              </p>

              <h1 className="mt-5 text-4xl font-extrabold leading-[1.08] tracking-[-0.03em] text-slate-950 dark:text-white sm:text-5xl lg:text-6xl">
                Make Better Decisions
                <span className="bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 bg-clip-text text-transparent">
                  {" "}
                  With Intelligent Reports
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600 dark:text-slate-300">
                HMEC delivers AI-powered reports, maintenance analytics, machine performance
                insights, and component health summaries to help mining teams improve operational
                efficiency, increase productivity, and reduce unexpected downtime.
              </p>

              <div className="mt-10 flex flex-wrap gap-4">
                <Link
                  to="/plans"
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition-all duration-300 hover:-translate-y-1 hover:bg-blue-700 hover:shadow-blue-600/30"
                >
                  Explore Plans
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                  to="/company-admin/coming-soon/demo"
                  className="rounded-xl border border-slate-300 bg-white/90 px-6 py-3 text-sm font-bold text-slate-800 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-blue-600 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-900/80 dark:text-white dark:hover:border-blue-500 dark:hover:text-blue-400"
                >
                  Book Demo
                </Link>
              </div>
            </div>

            {/* Right Dashboard */}
            <div
              className={`rounded-3xl border border-white/60 bg-white/80 p-7 shadow-2xl backdrop-blur-xl transition-all duration-700 dark:border-slate-800 dark:bg-slate-900/80 ${
                visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
              }`}
            >
              <p className="text-sm font-bold uppercase tracking-[0.28em] text-blue-600">
                Reporting Summary
              </p>

              <div className="mt-8 space-y-6">
                {reportingSummary.map((item) => (
                  <div key={item.label}>
                    <div className="mb-2 flex items-center justify-between text-sm font-semibold text-slate-900 dark:text-white">
                      <span>{item.label}</span>

                      <span className="font-bold text-blue-600 dark:text-blue-400">
                        {item.value}
                      </span>
                    </div>

                    <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800">
                      <div
                        className={`h-2 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 ${item.width}`}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 grid grid-cols-2 gap-4">
                {summaryCards.map((card) => (
                  <div
                    key={card.label}
                    className="rounded-2xl border border-slate-100 bg-white p-5 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 dark:bg-slate-950"
                  >
                    <h3 className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">
                      {card.value}
                    </h3>

                    <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                      {card.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* REPORT CATEGORIES */}
        <section className="bg-slate-50 px-5 py-20 dark:bg-slate-900/30 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600">
                Report Categories
              </p>

              <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                Comprehensive Reporting Across Your Fleet
              </h2>

              <p className="mt-5 text-base leading-7 text-slate-600 dark:text-slate-300">
                Access detailed reports for every machine, component, maintenance activity, and
                operational performance from a single platform.
              </p>
            </div>

            <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {reportCategories.map((category) => {
                const Icon = category.icon;
                return (
                  <div
                    key={category.title}
                    className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white dark:bg-blue-500/10 dark:text-blue-400">
                      <Icon className="h-5 w-5" />
                    </div>

                    <h3 className="mt-5 text-lg font-bold text-slate-950 dark:text-white">
                      {category.title}
                    </h3>

                    <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                      {category.description}
                    </p>

                    <button
                      type="button"
                      className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-blue-600 transition hover:gap-2.5 dark:text-blue-400"
                    >
                      View Details
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ANALYTICS DASHBOARD */}
        <section className="border-y border-slate-200 bg-white px-5 py-20 dark:border-slate-800 dark:bg-slate-950 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-2">
            {/* Left Dashboard */}
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-950 dark:text-white">
                  Analytics Dashboard
                </h3>

                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                  Live
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {analyticsStats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-xl bg-white p-5 shadow-sm dark:bg-slate-950"
                  >
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {stat.label}
                    </p>

                    <h4
                      className={`mt-2 text-3xl font-black ${
                        stat.valueTone ?? "text-blue-600 dark:text-blue-400"
                      }`}
                    >
                      {stat.value}
                    </h4>

                    <p className={`mt-2 text-xs ${stat.tone}`}>{stat.note}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 space-y-5">
                {analyticsProgress.map((item) => (
                  <div key={item.title}>
                    <div className="mb-2 flex justify-between text-sm font-semibold text-slate-900 dark:text-white">
                      <span>{item.title}</span>
                      <span className="text-blue-600 dark:text-blue-400">{item.value}</span>
                    </div>

                    <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800">
                      <div className={`h-2 rounded-full bg-blue-600 ${item.width}`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right */}
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600">
                Analytics Overview
              </p>

              <h2 className="mt-3 text-4xl font-black leading-tight text-slate-950 dark:text-white">
                Turn Operational Data
                <span className="block text-blue-600 dark:text-blue-400">
                  Into Actionable Insights
                </span>
              </h2>

              <p className="mt-6 text-base leading-8 text-slate-600 dark:text-slate-300">
                HMEC transforms machine telemetry into meaningful operational reports. Track fleet
                utilization, maintenance performance, component condition, downtime trends, and
                productivity metrics through one intelligent reporting platform.
              </p>

              <div className="mt-8 space-y-5">
                {analyticsHighlights.map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-black text-white">
                      ✓
                    </div>

                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{item}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8">
                <Link
                  to="/plans"
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-blue-700"
                >
                  Explore Reporting
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* REPORT WORKFLOW */}
        <section className="bg-slate-50 px-5 py-20 dark:bg-slate-900/30 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600">
                Reporting Workflow
              </p>

              <h2 className="mt-3 text-3xl font-black text-slate-950 dark:text-white">
                From Machine Data to Final Report
              </h2>

              <p className="mt-5 text-slate-600 dark:text-slate-300">
                Every report generated by HMEC follows an automated workflow that converts raw
                machine information into meaningful operational insights.
              </p>
            </div>

            <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-5">
              {workflowSteps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.title}
                    className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-lg font-black text-white">
                      {index + 1}
                    </div>

                    <div className="mx-auto mt-4 flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                      <Icon className="h-4.5 w-4.5" />
                    </div>

                    <h3 className="mt-4 text-base font-bold text-slate-950 dark:text-white">
                      {step.title}
                    </h3>

                    <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                      {step.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* WHY HMEC REPORTS */}
        <section className="border-y border-slate-200 bg-white px-5 py-20 dark:border-slate-800 dark:bg-slate-950 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600">
                Why HMEC Reports
              </p>

              <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                Reliable Reporting for Better Business Decisions
              </h2>

              <p className="mt-5 text-base leading-7 text-slate-600 dark:text-slate-300">
                Every report generated by HMEC is designed to improve operational visibility, reduce
                downtime, optimize maintenance planning and help organizations make data-driven
                decisions with confidence.
              </p>
            </div>

            <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {whyHmec.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-7 transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-500/40"
                  >
                    <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                      <Icon className="h-6 w-6" />
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {item.title}
                    </h3>

                    <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                      {item.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* PLATFORM BENEFITS */}
        <section className="bg-slate-50 px-5 py-20 dark:bg-slate-900/30 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600">
                  Platform Benefits
                </p>

                <h2 className="mt-3 text-4xl font-black leading-tight text-slate-950 dark:text-white">
                  Everything Your Team Needs
                  <span className="block text-blue-600 dark:text-blue-400">
                    In One Reporting Platform
                  </span>
                </h2>

                <p className="mt-6 text-base leading-8 text-slate-600 dark:text-slate-300">
                  HMEC centralizes operational reporting, maintenance history, machine analytics and
                  component health into one intelligent dashboard, enabling faster and smarter
                  decisions.
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                {platformBenefits.map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-black text-white">
                      ✓
                    </div>

                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-blue-700 px-5 py-20 text-center text-white sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-blue-100">
              Ready To Get Started?
            </p>

            <h2 className="mt-4 text-4xl font-black leading-tight sm:text-5xl">
              Transform Operational Data
              <span className="block">Into Business Intelligence</span>
            </h2>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-blue-100">
              Generate powerful reports, monitor equipment performance, and gain complete visibility
              into your mining operations with HMEC.
            </p>

            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link
                to="/plans"
                className="rounded-xl bg-white px-7 py-3 text-sm font-bold text-blue-700 shadow-lg transition hover:bg-slate-100"
              >
                Explore Plans
              </Link>

              <Link
                to="/company-admin/coming-soon/demo"
                className="rounded-xl border border-white/30 px-7 py-3 text-sm font-bold text-white transition hover:bg-white/10"
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
