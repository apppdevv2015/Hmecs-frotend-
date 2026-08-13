import { useEffect, useState } from "react";
import Navbar from "../../components/landing/Navbar";
import Footer from "../../components/landing/Footer";
import Girl from "../../assets/images/landingpageimages/About/Girl.jpg";
import Girl2 from "../../assets/images/landingpageimages/About/girl2.jpg";
import { Link } from "react-router-dom";
import {
  Gauge,
  Thermometer,
  Droplets,
  CircleGauge,
  BellRing,
  ShieldCheck,
  Activity,
  TrendingUp,
  Radio,
  CheckCircle2,
  Phone,
  Search,
  ListChecks,
  Target,
  ArrowRight,
  Truck,
} from "lucide-react";

// BACKEND TODO: replace with live company/about content from
// GET /api/platform/about (mission copy, stats, monitoring capability list)

type MonitorPoint = {
  icon: typeof Gauge;
  title: string;
  description: string;
};

const monitorPoints: MonitorPoint[] = [
  {
    icon: Thermometer,
    title: "Engine Health Tracking",
    description:
      "Engine temperature, RPM and runtime hours are tracked continuously, so overheating or abnormal load shows up long before the engine actually fails.",
  },
  {
    icon: Droplets,
    title: "Hydraulic System Monitoring",
    description:
      "Hydraulic pressure and oil temperature are watched in real time, catching leak risk and pressure drops before they turn into a breakdown on site.",
  },
  {
    icon: CircleGauge,
    title: "Tyre & Suspension Checks",
    description:
      "Tyre pressure, wear rate and suspension performance are logged per machine, reducing blowouts and unplanned stops for your trucks, loaders and dozers.",
  },
];

const processSteps = [
  {
    step: "STEP 1",
    icon: Search,
    title: "Machine Data Collection",
    description:
      "Every excavator, dozer, loader and truck in your fleet is registered on HMEC, and its daily readings start flowing into one dashboard.",
  },
  {
    step: "STEP 2",
    icon: Activity,
    title: "Continuous Monitoring",
    description:
      "Engine, hydraulic and tyre data is tracked around the clock, so your team always knows the real-time condition of every asset on site.",
  },
  {
    step: "STEP 3",
    icon: BellRing,
    title: "Early Warning Alerts",
    description:
      "The moment a reading moves outside a safe range, an alert is sent to the right role — operator, engineer or supervisor — instantly.",
  },
  {
    step: "STEP 4",
    icon: ShieldCheck,
    title: "Preventive Action",
    description:
      "Maintenance is scheduled before the problem becomes a breakdown, keeping machines on the job and cutting unplanned downtime.",
  },
];

const strip = [
  {
    icon: Radio,
    title: "Real-Time Tracking",
    description: "Live status for every machine, every site, all in one place.",
  },
  {
    icon: BellRing,
    title: "Early Warning Alerts",
    description: "Issues flagged before they turn into costly failures.",
  },
  {
    icon: TrendingUp,
    title: "Planned Maintenance",
    description: "Service scheduled on real usage, not guesswork.",
  },
];

const stats = [
  { value: "99.8%", label: "Monitoring Uptime" },
  { value: "24/7", label: "Live Alert Coverage" },
  { value: "100+", label: "Companies Supported" },
  { value: "5", label: "Role-Based Access Levels" },
];

export default function AboutPage() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
  }, []);

  return (
    <div className="min-h-screen pt-[90px] bg-white text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      <Navbar />

      <main>
        {/* HERO */}
        <section className="border-b border-slate-200 bg-white px-5 py-14 dark:border-slate-800 dark:bg-slate-950 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div
              className={`transition-all duration-700 ${
                visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
              }`}
            >
              <p className="text-xs font-black uppercase tracking-[0.3em] text-blue-600">
                About HMEC
              </p>

              <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight text-slate-950 dark:text-white sm:text-4xl lg:text-5xl">
                Track Every Machine.{" "}
                <span className="text-blue-600 dark:text-blue-400">Prevent Every Breakdown.</span>
              </h1>

              <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 dark:text-slate-300">
                HMEC gives you a single dashboard to watch over every truck, dozer, loader and
                excavator in your fleet. Instead of finding out about a problem after a machine
                stops working, your team sees engine, hydraulic and tyre health as it changes — and
                acts before it turns into downtime.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  to="/contact"
                  className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-black text-slate-900 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
                >
                  Contact Us
                </Link>
              </div>
            </div>

            {/* BACKEND TODO: replace this placeholder block with the real hero photo */}
            <div
              className={`relative overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-50 shadow-xl transition-all duration-700 dark:border-slate-800 dark:bg-slate-900 ${
                visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
              }`}
            >
              <img
                src={Girl}
                alt="About HMEC"
                className="aspect-[4/3] h-full w-full object-cover object-center"
              />

              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950/20 via-transparent to-slate-950/30" />
              <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-slate-950/80 px-5 py-3 text-xs font-semibold text-white backdrop-blur">
                <Radio className="h-3.5 w-3.5 text-emerald-400" />
                Live fleet monitoring, on every job site
              </div>
            </div>
          </div>
        </section>

        {/* HOW WE MONITOR */}
        <section className="bg-slate-50 px-5 py-20 dark:bg-slate-900/30 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600">
                How It Works
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                How HMEC Tracks Your Machines
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">
                Component-level data from every machine feeds into one system, so your team knows
                exactly what's happening before a small issue becomes an expensive repair.
              </p>
            </div>

            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {monitorPoints.map((point) => {
                const Icon = point.icon;
                return (
                  <div
                    key={point.title}
                    className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white dark:bg-blue-500/10 dark:text-blue-400">
                      <Icon className="h-5 w-5" />
                    </div>

                    <h3 className="mt-4 text-lg font-bold text-slate-950 dark:text-white">
                      {point.title}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {point.description}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* 3-POINT STRIP */}
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {strip.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-950 dark:text-white">
                        {item.title}
                      </p>
                      <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                        {item.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* REACH OUT STRIP */}
        <section className="border-y border-slate-200 bg-white px-5 py-16 dark:border-slate-800 dark:bg-slate-950 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-2">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600">
                Talk To Us
              </p>
              <h2 className="mt-3 text-3xl font-black leading-tight tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                Reach Out For Better Fleet Uptime
              </h2>
              <p className="mt-4 max-w-md text-sm leading-7 text-slate-600 dark:text-slate-300">
                Whether you run five machines or five hundred, HMEC scales with your fleet and keeps
                every role — from operator to super admin — aligned on machine health.
              </p>

              <div className="mt-6 inline-flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                <Phone className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                {/* BACKEND TODO: replace with real support contact number */}
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  +1 202-620-1020
                </span>
              </div>
            </div>

            {/* BACKEND TODO: replace this placeholder block with the real team/site photo */}
            <div className="relative overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-50 shadow-xl dark:border-slate-800 dark:bg-slate-900">
              <img
                src={Girl2}
                alt="Reach Out For Better Fleet Uptime"
                className="aspect-[16/10] h-full w-full object-cover object-center"
              />

              <div className="absolute inset-0 bg-gradient-to-r from-slate-950/20 via-transparent to-slate-950/30" />
            </div>
          </div>
        </section>

        {/* 4 STEPS PROCESS */}
        <section className="bg-slate-50 px-5 py-20 dark:bg-slate-900/30 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid items-start gap-12 lg:grid-cols-[0.8fr_1.2fr]">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600">
                  The Process
                </p>
                <h2 className="mt-3 text-3xl font-black leading-tight tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                  4 Steps We Use To Prevent Machine Failure
                </h2>
                <p className="mt-5 max-w-md text-sm leading-7 text-slate-600 dark:text-slate-300">
                  From the moment a machine is added to HMEC, it stays under watch — so your team is
                  always a step ahead of a breakdown, not reacting to one.
                </p>

                <div className="mt-7 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                  <Target className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    The goal: fewer surprises on site, more planned service windows.
                  </p>
                </div>
              </div>

              <div className="grid gap-4">
                {processSteps.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.step}
                      className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-black text-white">
                        <Icon className="h-4 w-4" />
                      </div>

                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">
                          {item.step}
                        </p>
                        <h3 className="mt-1 text-sm font-bold text-slate-950 dark:text-white">
                          {item.title}
                        </h3>
                        <p className="mt-1.5 text-xs leading-5 text-slate-600 dark:text-slate-300">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* STATS STRIP */}
        <section className="border-t border-slate-200 bg-white px-5 py-16 dark:border-slate-800 dark:bg-slate-950 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-5xl grid-cols-2 gap-4 sm:grid-cols-4">
            {stats.map((stat) => (
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

        {/* CTA */}
        <section className="bg-blue-700 px-5 py-16 text-center text-white lg:px-8">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-3xl font-black leading-tight md:text-4xl">
              Keep Your Fleet Running, Not Repairing
            </h2>

            <p className="mx-auto mt-4 max-w-xl text-blue-100">
              See how HMEC can track your trucks, dozers and excavators from day one — book a
              walkthrough with our team.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/plans"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-black text-blue-700 shadow-xl transition hover:bg-blue-50"
              >
                See Our Plans
                <ArrowRight className="h-4 w-4" />
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
