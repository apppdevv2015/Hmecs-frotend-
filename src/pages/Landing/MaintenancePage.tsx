import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Hero from "../../assets/images/landingpageimages/Maintenance/Hero.jpg"
import {
  Wrench,
  CalendarClock,
  Activity,
  ShieldAlert,
  ClipboardList,
  FileCheck2,
  CheckCircle2,
  Clock,
  Thermometer,
  Droplets,
  CircleGauge,
  Cog,
  BellRing,
  TrendingDown,
} from "lucide-react";

import Navbar from "../../components/landing/Navbar";
import Footer from "../../components/landing/Footer";

// BACKEND TODO: replace with live data from
// GET /api/maintenance/summary (open work orders, overdue services, schedule)
// GET /api/maintenance/schedule?range=30d (upcoming service calendar)

type MaintenanceType = {
  icon: typeof Wrench;
  title: string;
  description: string;
  cadence: string;
};

const maintenanceTypes: MaintenanceType[] = [
  {
    icon: CalendarClock,
    title: "Preventive Maintenance",
    description:
      "Scheduled servicing at fixed intervals to keep machines within manufacturer-recommended limits.",
    cadence: "Every 250 engine hours",
  },
  {
    icon: Activity,
    title: "Predictive Maintenance",
    description:
      "Component telemetry trends flag degradation early so service is scheduled before failure occurs.",
    cadence: "Triggered by risk score",
  },
  {
    icon: ShieldAlert,
    title: "Corrective Maintenance",
    description:
      "Immediate repair work raised from operator-reported issues or critical alert conditions.",
    cadence: "As reported",
  },
  {
    icon: CircleGauge,
    title: "Condition-Based Maintenance",
    description:
      "Live sensor thresholds on pressure, temperature and wear decide exactly when service is due.",
    cadence: "Threshold driven",
  },
];

const componentSchedule = [
  {
    icon: Thermometer,
    component: "Engine",
    lastService: "12 Jun 2026",
    nextDue: "18 Jul 2026",
    status: "On Track",
  },
  {
    icon: Droplets,
    component: "Hydraulic System",
    lastService: "02 Jun 2026",
    nextDue: "10 Jul 2026",
    status: "Due Soon",
  },
  {
    icon: CircleGauge,
    component: "Tyres",
    lastService: "28 May 2026",
    nextDue: "05 Jul 2026",
    status: "Overdue",
  },
  {
    icon: Cog,
    component: "Transmission",
    lastService: "20 Jun 2026",
    nextDue: "28 Aug 2026",
    status: "On Track",
  },
];

const statusStyles: Record<string, string> = {
  "On Track":
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  "Due Soon":
    "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  Overdue: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
};

const workflowSteps = [
  {
    icon: BellRing,
    title: "Issue Detected",
    detail: "Operator report or automated alert flags a component issue.",
  },
  {
    icon: ClipboardList,
    title: "Work Order Created",
    detail: "Supervisor logs a maintenance report with severity and notes.",
  },
  {
    icon: FileCheck2,
    title: "Approval",
    detail: "Supervisor or Admin reviews and approves the maintenance request.",
  },
  {
    icon: Wrench,
    title: "Service Performed",
    detail: "Engineer/Artisan carries out repair or scheduled service.",
  },
  {
    icon: CheckCircle2,
    title: "Closed & Logged",
    detail: "Report is closed and added to the machine's service history.",
  },
];

const summaryStats = [
  { value: "342", label: "Services Completed (30d)" },
  { value: "18", label: "Open Work Orders" },
  { value: "6", label: "Overdue Services" },
  { value: "94%", label: "On-Time Completion Rate" },
];

export default function MaintenancePage() {
  const [active, setActive] = useState("maintenance");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden pt-[90px] bg-white text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      {/* Header */}
      <Navbar active={active} setActive={setActive} />

      {/* Page Content */}
      <main>
        {/* INTRO */}
    <section
  className="relative overflow-hidden border-b border-slate-200 dark:border-slate-800"
  style={{
    backgroundImage:
      `url(${Hero})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
  }}
>
  {/* Dark Overlay */}
  <div className="absolute inset-0 bg-slate-950/65" />

  {/* Optional Blue Gradient */}
  <div className="absolute inset-0 bg-gradient-to-r from-blue-950/40 via-slate-950/20 to-slate-950/50" />

  <div className="relative z-10 px-5 py-16 sm:px-6 lg:px-8 lg:py-24">
    <div
      className={`mx-auto max-w-4xl text-center transition-all duration-700 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
      }`}
    >
      <p className="text-xs font-black uppercase tracking-[0.3em] text-blue-300">
        Maintenance
      </p>

      <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl lg:text-6xl">
        Keep every machine serviced, on schedule
      </h1>

      <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-200">
        Track preventive, predictive and corrective maintenance across your
        fleet in one place — from the first alert to a closed, logged service
        record.
      </p>
    </div>

    {/* Stats */}
    <div className="mx-auto mt-14 grid max-w-5xl grid-cols-2 gap-4 sm:grid-cols-4">
      {summaryStats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-2xl border border-white/20 bg-white/10 px-4 py-6 text-center backdrop-blur-md"
        >
          <p className="text-2xl font-black text-white sm:text-3xl">
            {stat.value}
          </p>

          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-200">
            {stat.label}
          </p>
        </div>
      ))}
    </div>
  </div>
</section>

        {/* MAINTENANCE TYPES */}
        <section className="bg-slate-50 px-5 py-20 dark:bg-slate-900/30 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600">
                Maintenance Strategy
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                Four ways HMEC keeps machines in service
              </h2>
            </div>

            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {maintenanceTypes.map((type) => {
                const Icon = type.icon;

                return (
                  <div
                    key={type.title}
                    className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white dark:bg-blue-500/10 dark:text-blue-400">
                      <Icon className="h-5 w-5" />
                    </div>

                    <h3 className="mt-4 text-base font-bold text-slate-950 dark:text-white">
                      {type.title}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {type.description}
                    </p>

                    <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4 text-xs font-bold text-slate-500 dark:border-slate-800 dark:text-slate-400">
                      <Clock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                      {type.cadence}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* COMPONENT SCHEDULE */}
        <section className="border-y border-slate-200 bg-white px-5 py-20 dark:border-slate-800 dark:bg-slate-950 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid items-start gap-12 lg:grid-cols-[0.8fr_1.2fr]">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600">
                  Service Schedule
                </p>

                <h2 className="mt-3 text-3xl font-black leading-tight tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                  Component-level service tracking
                </h2>

                <p className="mt-5 max-w-md text-sm leading-7 text-slate-600 dark:text-slate-300">
                  Every major component carries its own service history and
                  next-due date, so nothing slips through on a busy site.
                </p>

                <div className="mt-7 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                  <TrendingDown className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Overdue components are automatically escalated to the
                    Supervisor alerts queue.
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="hidden grid-cols-[1.4fr_1fr_1fr_0.9fr] gap-3 bg-slate-50 px-5 py-3 text-xs font-black uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400 sm:grid">
                  <span>Component</span>
                  <span>Last Service</span>
                  <span>Next Due</span>
                  <span>Status</span>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {componentSchedule.map((row) => {
                    const Icon = row.icon;

                    return (
                      <div
                        key={row.component}
                        className="grid grid-cols-2 gap-3 px-5 py-4 sm:grid-cols-[1.4fr_1fr_1fr_0.9fr] sm:items-center"
                      >
                        <div className="flex items-center gap-2.5 text-sm font-bold text-slate-950 dark:text-white">
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                            <Icon className="h-4 w-4" />
                          </span>
                          {row.component}
                        </div>

                        <div className="text-sm text-slate-600 dark:text-slate-300">
                          {row.lastService}
                        </div>

                        <div className="text-sm text-slate-600 dark:text-slate-300">
                          {row.nextDue}
                        </div>

                        <div>
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${statusStyles[row.status]}`}
                          >
                            {row.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* WORKFLOW */}
        <section className="bg-slate-50 px-5 py-20 dark:bg-slate-900/30 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600">
                How It Works
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                From reported issue to closed service record
              </h2>
            </div>

            <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
              {workflowSteps.map((step, index) => {
                const Icon = step.icon;

                return (
                  <div key={step.title} className="relative flex flex-col">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/25">
                        <Icon className="h-5 w-5" />
                      </div>

                      <span className="text-xs font-black uppercase tracking-wide text-slate-400 dark:text-slate-500">
                        Step {index + 1}
                      </span>
                    </div>

                    <h3 className="mt-4 text-sm font-bold text-slate-950 dark:text-white">
                      {step.title}
                    </h3>

                    <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
                      {step.detail}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-blue-700 px-5 py-16 text-center text-white lg:px-8">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-3xl font-black leading-tight md:text-4xl">
              Stay ahead of every service window
            </h2>

            <p className="mx-auto mt-4 max-w-xl text-blue-100">
              See how HMEC's maintenance workflow fits your fleet size and
              service policy.
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

      {/* Footer */}
      <Footer />
    </div>
  );
}