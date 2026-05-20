import { useEffect, useState } from "react";
import { Link } from "react-router";

import Navbar from "../../components/landing/Navbar";
import Footer from "../../components/landing/Footer";

import video1 from "../../assets/images/videos/Untitled design.mp4";

import heavyimge from "../../assets/images/HMEhero.png";
import jcb from "../../assets/images/HMElogo_2.png";

import tyre from "../../assets/images/landingpageimages/tyre.png";
import engine from "../../assets/images/landingpageimages/engine.png";
import hydrulic from "../../assets/images/landingpageimages/hydrulic.png";
import suspension from "../../assets/images/landingpageimages/suspension.png";

const heroTexts = [
  {
    smallTitle: "Heavy Equipment Intelligence",
    title: "HME Component Intelligence System",
    subtitle:
      "Monitor heavy equipment health in real-time and improve daily road operations with data-driven insights.",
  },
  {
    smallTitle: "Engine Health Monitoring",
    title: "Track Engine Health",
    subtitle:
      "Monitor engine temperature, runtime, fuel usage, and performance issues before failures happen.",
  },
  {
    smallTitle: "Tyre Safety Intelligence",
    title: "Tyre Pressure Intelligence",
    subtitle:
      "Track tyre pressure, temperature, and safety alerts for better fleet performance.",
  },
  {
    smallTitle: "Hydraulic System Insights",
    title: "Hydraulic System Monitoring",
    subtitle:
      "Detect pressure drops, leakage risks, and hydraulic component issues with smart alerts.",
  },
  {
    smallTitle: "Real-Time Alerts",
    title: "Smart Alerts & Reports",
    subtitle:
      "Get real-time alerts, maintenance reports, and component-level visibility for faster decisions.",
  },
];

const bottomItems = ["Engine", "Hydraulic", "Tyre", "Alerts", "Reports"];

const aboutPoints = [
  "Real-time component health visibility",
  "Road equipment performance insights",
  "Early maintenance risk detection",
  "Role-based access for admins and teams",
];

const monitoringFeatures = [
  {
    title: "Engine Monitoring",
    image: engine,
    value: "86°C",
    label: "Engine Temperature",
    status: "Normal",
    meter: 72,
    details: ["RPM: 2200", "Runtime: 6.4 hrs", "Load: 68%"],
  },
  {
    title: "Hydraulic System",
    image: hydrulic,
    value: "124 Bar",
    label: "Hydraulic Pressure",
    status: "Stable",
    meter: 78,
    details: ["Leak Risk: Low", "Oil Temp: 54°C", "Flow: Active"],
  },
  {
    title: "Transmission & Suspension",
    image: suspension,
    value: "92%",
    label: "Drive Health",
    status: "Healthy",
    meter: 92,
    details: ["Vibration: Low", "Gear Wear: 8%", "Load Balance: Good"],
  },
  {
    title: "Tyre Pressure",
    image: tyre,
    value: "32 PSI",
    label: "Front Left Tyre",
    status: "Optimal",
    meter: 64,
    details: ["FL: 32 PSI", "FR: 33 PSI", "Rear Avg: 34 PSI"],
  },
];

const maintenancePoints = [
  "Engine Temperature & Runtime Monitoring",
  "Hydraulic Pressure & System Health Tracking",
  "Transmission Condition Analysis",
  "Tyre Pressure & Component Alerts",
];

const reportBullets = [
  "Engine Performance Reports",
  "Hydraulic System Analytics",
  "Transmission & Tyre Health Trends",
  "Downtime & Maintenance Risk Insights",
];

export default function LandingPage() {
  const [active, setActive] = useState("home");
  const [activeTextIndex, setActiveTextIndex] = useState(0);

  useEffect(() => {
    const revealElements = document.querySelectorAll(
      ".reveal, .reveal-left, .reveal-right, .reveal-scale",
    );

    const sectionElements = document.querySelectorAll(
      "section[id], footer[id]",
    );

    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("reveal-visible");
          }
        });
      },
      { threshold: 0.16 },
    );

    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.target.id) {
            setActive(entry.target.id);
          }
        });
      },
      { threshold: 0.45 },
    );

    revealElements.forEach((el) => revealObserver.observe(el));
    sectionElements.forEach((el) => sectionObserver.observe(el));

    return () => {
      revealObserver.disconnect();
      sectionObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveTextIndex((prev) => (prev + 1) % heroTexts.length);
    }, 6000);

    return () => clearInterval(timer);
  }, []);

  const activeText = heroTexts[activeTextIndex];

  return (
    <main className="min-h-screen overflow-x-hidden bg-white text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      <Navbar active={active} setActive={setActive} />

      <section
        id="home"
        className="relative -mt-[90px] h-[100svh] w-full overflow-hidden bg-slate-950 pt-[90px]"
      >
        <video
          src={video1}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          className="absolute inset-0 h-full w-full object-cover object-center brightness-110 contrast-110 saturate-110"
        />

        <div className="absolute inset-0 bg-black/35" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/35 to-black/5" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/70" />

        <div className="relative z-10 flex h-[calc(100svh-90px)] w-full items-center px-5 sm:px-8 lg:px-20">
          <div className="max-w-xl text-left">
            <div
              key={activeTextIndex}
              className="animate-[textSlideRightToLeft_6s_ease-in-out]"
            >
              <p className="mb-3 text-xs font-extrabold uppercase tracking-wide text-orange-400 sm:text-sm">
                {activeText.smallTitle}
              </p>

              <h1 className="max-w-2xl text-4xl font-black uppercase leading-[0.98] tracking-tight text-white sm:text-6xl lg:text-7xl">
                {activeText.title}
              </h1>

              <p className="mt-4 max-w-lg text-sm font-semibold leading-6 text-white/90 sm:text-base">
                {activeText.subtitle}
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to="/plans"
                  className="rounded-full bg-white px-5 py-2 text-xs font-bold text-slate-950 shadow-lg transition hover:-translate-y-1 hover:bg-slate-100 sm:text-sm"
                >
                  See Our Plans
                </Link>
                <Link
                  to="/company-admin/coming-soon/demo"
                  className="rounded-full bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-blue-600/30 transition hover:-translate-y-1 hover:bg-blue-700 sm:text-sm"
                >
                  Book Demo
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 z-20 w-full px-4 py-3">
          <div className="grid w-full grid-cols-5 items-center text-center">
            {bottomItems.map((item) => (
              <div
                key={item}
                className="text-[10px] font-black uppercase tracking-[0.18em] text-white/80 sm:text-xs"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HERO CONTENT */}
      <section className="relative isolate overflow-hidden bg-[#eef2ff] px-4 py-10 dark:bg-slate-950 sm:px-6 lg:px-8 lg:py-14">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.16),transparent_30%),radial-gradient(circle_at_85%_25%,rgba(14,165,233,0.14),transparent_32%)]" />

        <div className="mx-auto grid max-w-7xl items-center gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="reveal-left flex rounded-[1.6rem] border border-white/70 bg-white p-6 shadow-xl shadow-blue-950/5 dark:border-slate-800 dark:bg-slate-900/90 sm:p-7 lg:p-8">
            <div className="my-auto">
              <p className="mb-4 inline-flex rounded-full bg-blue-50 px-3.5 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-blue-600 dark:bg-blue-950/50">
                Component Intelligence
              </p>

              <h1 className="max-w-xl text-3xl font-black leading-[1.08] tracking-tight text-slate-950 dark:text-white sm:text-4xl lg:text-[42px]">
                Keep Every Critical Component
                <span className="block bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                  in Top Condition.
                </span>
              </h1>

              <p className="mt-4 max-w-lg text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
                Monitor engine temperature, hydraulic pressure, suspension
                health and tyre pressure in one intelligent system.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href="#maintenance"
                  className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700"
                >
                  View Component Insights
                </a>

                <Link
                  to="/signin"
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-800 transition hover:border-blue-300 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  Open Dashboard
                </Link>
              </div>
            </div>
          </div>

          <div className="reveal-right flex flex-col">
            <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[1.6rem] border border-white/70 bg-white p-3 shadow-2xl shadow-blue-950/15 dark:border-slate-800 dark:bg-slate-900">
              <img
                src={heavyimge}
                alt="HME system"
                className="h-full w-full rounded-[1.2rem] object-cover object-center"
              />

              <div className="absolute left-5 top-5 rounded-2xl border border-white/30 bg-white/90 px-4 py-3 shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-950/85">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  System Health
                </p>

                <div className="mt-1 flex items-end gap-2">
                  <h3 className="text-2xl font-black text-blue-600">98%</h3>

                  <span className="pb-1 text-[11px] font-bold text-emerald-500">
                    Normal
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section
        id="about"
        className="scroll-mt-24 border-t border-slate-200 bg-white py-24 dark:border-slate-800 dark:bg-slate-950"
      >
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-blue-600">
              About HME
            </p>

            <h2 className="mt-4 max-w-xl text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
              Built to improve road equipment operations with better
              intelligence.
            </h2>

            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 dark:text-slate-300">
              HME Component Intelligence System helps teams monitor machine
              health and reduce downtime using real-time data.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {aboutPoints.map((point) => (
                <div
                  key={point}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900"
                >
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {point}
                  </p>
                </div>
              ))}
            </div>

            <Link
              to="/plans"
              className="mt-8 inline-flex rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700"
            >
              Explore Plans
            </Link>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="rounded-[1.5rem] bg-slate-950 p-6 text-white">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-300">
                Operational Intelligence
              </p>

              <div className="mt-8 space-y-5">
                {[
                  ["Engine Health", "92%"],
                  ["Hydraulic Stability", "87%"],
                  ["Tyre Condition", "78%"],
                  ["Downtime Risk", "Low"],
                ].map(([label, value]) => (
                  <div key={label}>
                    <div className="mb-2 flex items-center justify-between text-sm font-bold">
                      <span>{label}</span>
                      <span className="text-blue-300">{value}</span>
                    </div>

                    <div className="h-2 rounded-full bg-white/10">
                      <div className="h-2 w-4/5 rounded-full bg-blue-500" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section
        id="features"
        className="reveal scroll-mt-24 bg-white px-5 py-20 dark:bg-slate-950 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <p className="text-xs font-black uppercase tracking-wide text-blue-600">
              Why HME Intelligence?
            </p>

            <h2 className="mx-auto mt-3 max-w-3xl text-4xl font-black leading-tight text-slate-950 dark:text-white">
              Real Component Monitoring to Keep Machines Running Smarter
            </h2>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {monitoringFeatures.map((item) => (
              <div
                key={item.title}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="relative h-40 overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-transparent" />

                  <div className="absolute bottom-3 left-3 right-3">
                    <h3 className="text-base font-bold text-white">
                      {item.title}
                    </h3>

                    <p className="text-xs text-slate-200">{item.label}</p>
                  </div>
                </div>

                <div className="p-4">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Current
                      </p>

                      <h4 className="text-lg font-bold text-slate-950 dark:text-white">
                        {item.value}
                      </h4>
                    </div>

                    <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                      {item.status}
                    </span>
                  </div>

                  <div className="mt-4 h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-blue-600"
                      style={{ width: `${item.meter}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MAINTENANCE */}
      <section
        id="maintenance"
        className="reveal scroll-mt-24 border-y border-slate-200 bg-slate-50 py-16 dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="flex justify-center">
              <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-slate-900 p-4 shadow-2xl">
                <img
                  src={jcb}
                  alt="Heavy machine component monitoring"
                  className="h-[300px] w-full rounded-xl object-cover"
                />
              </div>
            </div>

            <div className="relative">
              <div className="reveal-right relative max-w-xl">
                <p className="text-xs font-black uppercase tracking-wide text-blue-600">
                  Component Health Intelligence
                </p>

                <h2 className="mt-3 text-3xl font-black leading-tight text-slate-950 dark:text-white sm:text-4xl">
                  Keep Every Critical Component in
                  <span className="text-blue-600"> Top Condition</span>
                </h2>

                <div className="mt-8 space-y-4">
                  {maintenancePoints.map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-3 text-sm font-semibold text-slate-700 dark:text-slate-300"
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs text-white">
                        ✓
                      </span>

                      {item}
                    </div>
                  ))}
                </div>

                <a
                  href="#reports"
                  className="mt-9 inline-flex rounded-xl bg-blue-600 px-7 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700"
                >
                  View Component Insights →
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* REPORTS */}
      <section
        id="reports"
        className="reveal scroll-mt-24 relative overflow-hidden bg-white px-5 py-20 dark:bg-slate-950 lg:px-8"
      >
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
          <div className="reveal-left">
            <p className="text-xs font-black uppercase tracking-wide text-blue-600">
              Reports & Component Analytics
            </p>

            <h2 className="mt-3 text-4xl font-black leading-tight text-slate-950 dark:text-white">
              Data That Improves
              <span className="block text-blue-600">Machine Performance</span>
            </h2>

            <div className="mt-8 space-y-4">
              {reportBullets.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 text-sm font-semibold text-slate-700 dark:text-slate-300"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs text-white">
                    ✓
                  </span>

                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ["523", "Total Assets"],
                ["416", "Active Fleet"],
                ["26", "Alerts Open"],
                ["18.4", "Downtime Hrs"],
              ].map(([value, label]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
                >
                  <p className="text-xs font-semibold text-slate-500">
                    {label}
                  </p>

                  <h4 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
                    {value}
                  </h4>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="reveal-scale relative overflow-hidden bg-blue-700 px-5 py-20 text-center text-white lg:px-8">
        <div className="relative mx-auto max-w-4xl">
          <h2 className="text-4xl font-black leading-tight md:text-5xl">
            Ready to Improve Machine Performance?
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-blue-100">
            Monitor engine, hydraulics, transmission, and tyre pressure in one
            intelligent system.
          </p>

          <Link
            to="/plans"
            className="mt-8 inline-flex rounded-xl bg-white px-8 py-4 text-sm font-black text-blue-700 shadow-xl hover:bg-blue-50"
          >
            Start Monitoring →
          </Link>
        </div>
      </section>

      <Footer />

      <style>
        {`
          @keyframes textSlideRightToLeft {
            0% {
              opacity: 0;
              transform: translateX(160px);
            }

            25% {
              opacity: 1;
              transform: translateX(0);
            }

            80% {
              opacity: 1;
              transform: translateX(0);
            }

            100% {
              opacity: 0;
              transform: translateX(-80px);
            }
          }
        `}
      </style>
    </main>
  );
}
