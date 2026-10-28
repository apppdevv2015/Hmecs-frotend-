import { Link } from "react-router";
import logo1 from "../../assets/images/landingpageimages/logo1.webp";
import heroTruck from "../../assets/images/landingpageimages/blog/blog-banner-bg.jpg";
import tyre from "../../assets/images/landingpageimages/blog/blog-tyre.jpg";
import dashboard from "../../assets/images/landingpageimages/blog/blog-dashboard.jpg";
import jobcard from "../../assets/images/landingpageimages/blog/blog-jobcard.jpg";
import fleet from "../../assets/images/landingpageimages/blog/blog-fleet.jpg";
import sunset from "../../assets/images/landingpageimages/blog/blog-sunset.jpg";

export function Blog() {
  return (
    <div className="bg-white">
      {/* Top banner: truck is in the background, text is on top */}
      <div className="relative overflow-hidden bg-[#0b1f3a] text-white">
        <img
          src={heroTruck}
          alt="Haul truck in an open-pit mine"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0b1f3a] via-[#0b1f3a]/75 to-transparent"></div>

        <div className="relative mx-auto max-w-6xl px-6 py-14 md:py-20">
          <div className="md:w-1/2">

            <h1 className="mt-5 font-sans text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
              From Equipment Data to Better Mining Decisions
            </h1>
            <div className="mt-4 h-1 w-16 bg-orange-500"></div>
            <p className="mt-4 text-lg text-slate-100">
              Mining operations rely on heavy equipment to maintain production. When a machine becomes unavailable, it can disrupt production plans, increase maintenance pressure, and affect operational costs.
              Equipment health, tyre condition, inspections, maintenance history, component life, and operating costs are often managed across different systems and manual processes, making it difficult to assess asset condition and determine the next steps.
              The HME Component Intelligence System brings essential equipment and maintenance information together in one platform, helping teams improve visibility, coordinate maintenance activities, and make informed operational decisions.
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-12 px-6 py-12">
        {/* 1 */}
        <div className="flex flex-col items-center gap-8 md:flex-row">
          <div className="md:w-1/2">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-900 font-bold text-white">
                1
              </span>
              <h2 className="text-2xl font-bold text-blue-900">
                The challenge: information that does not tell the whole story
              </h2>
            </div>
            <p className="mt-4 text-slate-700">
              Heavy mining equipment produces and accumulates many types of information. Depending on the machine and available data sources, this may include engine hours, fault codes, temperatures, tyre pressure, payload, inspection results, maintenance jobs, component replacements, downtime and parts consumption.

            
            </p>
            <p className="mt-3 text-slate-700">
              A single reading rarely explains the full condition of a machine or component. Teams need context: what has changed, what inspections have found, what work has already been performed, and whether operating conditions may be contributing to wear or risk. Missing or delayed information can make planning reactive rather than proactive.
            </p>
          </div>
          <img
            src={tyre}
            alt="Technician inspecting a large mining tyre"
            className="h-auto w-full self-stretch object-cover md:w-1/2"
          />
        </div>

        {/* 2 */}
        <div className="flex flex-col items-center gap-8 md:flex-row-reverse">
          <div className="md:w-1/2">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-900 font-bold text-white">
                2
              </span>
              <h2 className="text-2xl font-bold text-blue-900">
                One connected view of equipment and components
              </h2>
            </div>
            <p className="mt-4 text-slate-700">
              A component intelligence platform helps bring available information into a more consistent operational view. Depending on the configured equipment and integrations, the system can support:

            </p>
            <p className="mt-3 text-slate-700">
              Equipment health visibility: Organise available machine readings, fault information, and active alerts. Tyre and component monitoring: Maintain condition, inspection, lifecycle, and replacement information. Digital inspections and maintenance history: Keep findings, work performed, and component records connected. Maintenance workflows: Create and track digital job cards, assignments, parts, labour, approvals, and completion. Operational and management reporting: Review downtime, maintenance costs, work status, and component trends. Financial planning: Connect component condition and lifecycle information with replacement costs, lead times, and budget planning.
            </p>
          </div>
          <img
            src={dashboard}
            alt="Fleet health dashboard (illustrative)"
            className="h-auto w-full self-stretch object-cover md:w-1/2"
          />
        </div>

        {/* 3 */}
        <div className="flex flex-col items-center gap-8 md:flex-row">
          <div className="md:w-1/2">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-900 font-bold text-white">
                3
              </span>
              <h2 className="text-2xl font-bold text-blue-900">
                From alerts to better maintenance planning
              </h2>
            </div>
            <p className="mt-4 text-slate-700">
              Alerts are useful, but they are only one part of the decision process. Maintenance teams also need a way to review an alert, understand the available evidence, assign the work, record findings and close the maintenance loop.
            </p>
            <p className="mt-3 text-slate-700">
              With configured rules and reliable source data, the system can help surface conditions that deserve attention, support prioritisation, and connect an identified issue to a maintenance workflow. More advanced predictive capabilities depend on the quality and history of the data, the availability of relevant integrations, and validated equipment- or site-specific logic.
            </p>
          </div>
          <img
            src={jobcard}
            alt="Technician using a digital job card on a tablet"
            className="h-auto w-full self-stretch object-cover md:w-1/2"
          />
        </div>

        {/* 4 */}
        <div className="flex flex-col items-center gap-8 md:flex-row-reverse">
          <div className="md:w-1/2">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-900 font-bold text-white">
                4
              </span>
              <h2 className="text-2xl font-bold text-blue-900">
                Digital job cards: connecting insight with action
              </h2>
            </div>
            <p className="mt-4 text-slate-700">
              When an inspection, breakdown or alert requires work, a digital job card can help carry the task from creation to completion. The workflow may include the machine and component, maintenance type, priority, assigned technician, planned work, labour hours, parts used, photographs, findings, corrective actions, downtime and approvals.
            </p>
            <p className="mt-3 text-slate-700">
              Keeping these details together creates a clearer maintenance history and can support reporting on overdue jobs, parts consumption, labour, mean time to repair (MTTR), mean time between failures (MTBF) and planned maintenance compliance—where the required data is captured.
            </p>
          </div>
          <img
            src={fleet}
            alt="Fleet of haul trucks with monitoring icons"
            className="h-auto w-full self-stretch object-cover md:w-1/2"
          />
        </div>

        {/* 5 */}
        <div className="flex flex-col items-center gap-8 md:flex-row">
          <div className="md:w-1/2">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-900 font-bold text-white">
                5
              </span>
              <h2 className="text-2xl font-bold text-blue-900">
                Why financial intelligence matters
              </h2>
            </div>
            <p className="mt-4 text-slate-700">
              Component decisions are also financial decisions. Replacement planning may involve expected remaining life, replacement cost, supplier, lead time and the budget period. Bringing these details into the same view as maintenance and condition information can help teams prepare earlier and make trade-offs with better context.
            </p>
            <p className="mt-3 text-slate-700">
              The goal is not to replace engineering judgement. It is to make relevant information easier to find, compare and use when deciding whether to inspect, repair, monitor or plan a replacement.
            </p>
          </div>
          <img
            src={sunset}
            alt="Reduce downtime, extend component life, improve efficiency, control costs"
            className="h-auto w-full self-stretch object-cover md:w-1/2"
          />
        </div>
      </div>
    </div>
  );
}

export default function Footer() {
  return (
    <footer
      id="contact"
      className="border-t border-slate-200 bg-white px-5 py-10 text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 lg:px-8"
    >
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          {/* Company */}
          <div className="flex flex-col">
            <Link to="/" className="inline-flex w-fit">
              <img
                src={logo1}
                alt="HMEC Logo"
                className="h-20 w-auto object-contain"
              />
            </Link>

            <p className="mt-6 max-w-[340px] text-[16px] leading-8 text-slate-600 dark:text-slate-400">
              AI-powered fleet intelligence platform for heavy mining
              operations. Monitor machine health, manage maintenance, generate
              intelligent reports, and optimize fleet performance from one
              unified dashboard.
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-[15px] font-extrabold uppercase tracking-[0.22em] text-slate-950 dark:text-white">
              Product
            </h3>

            <ul className="mt-6 space-y-4">
              <li>
                <Link
                  to="/features"
                  className="text-[16px] text-slate-600 transition-all duration-300 hover:translate-x-1 hover:text-blue-600"
                >
                  Features
                </Link>
              </li>

              <li>
                <Link
                  to="/maintenance"
                  className="text-[16px] text-slate-600 transition-all duration-300 hover:translate-x-1 hover:text-blue-600"
                >
                  Maintenance
                </Link>
              </li>

              <li>
                <Link
                  to="/reports"
                  className="text-[16px] text-slate-600 transition-all duration-300 hover:translate-x-1 hover:text-blue-600"
                >
                  Reports
                </Link>
              </li>

              <li>
                <Link
                  to="/plans"
                  className="text-[16px] text-slate-600 transition-all duration-300 hover:translate-x-1 hover:text-blue-600"
                >
                  Pricing Plans
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-[15px] font-extrabold uppercase tracking-[0.22em] text-slate-950 dark:text-white">
              Company
            </h3>

            <ul className="mt-6 space-y-4">
              <li>
                <Link
                  to="/about"
                  className="text-[16px] text-slate-600 transition-all duration-300 hover:translate-x-1 hover:text-blue-600"
                >
                  About Us
                </Link>
              </li>

              <li>
                <Link
                  to="/company-admin/coming-soon/careers"
                  className="text-[16px] text-slate-600 transition-all duration-300 hover:translate-x-1 hover:text-blue-600"
                >
                  Careers
                </Link>
              </li>

              <li>
                <Link
                  to="/company-admin/coming-soon/blog"
                  className="text-[16px] text-slate-600 transition-all duration-300 hover:translate-x-1 hover:text-blue-600"
                >
                  Blog
                </Link>
              </li>

              <li>
                <Link
                  to="/contact"
                  className="text-[16px] text-slate-600 transition-all duration-300 hover:translate-x-1 hover:text-blue-600"
                >
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-[15px] font-extrabold uppercase tracking-[0.22em] text-slate-950 dark:text-white">
              Support
            </h3>

            <ul className="mt-6 space-y-4">
              <li>
                <Link
                  to="/company-admin/coming-soon/help-center"
                  className="text-[16px] text-slate-600 transition-all duration-300 hover:translate-x-1 hover:text-blue-600"
                >
                  Terms of Service
                </Link>
              </li>

              <li>
                <Link
                  to="/company-admin/coming-soon/privacy-policy"
                  className="text-[16px] text-slate-600 transition-all duration-300 hover:translate-x-1 hover:text-blue-600"
                >
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-500 md:flex-row">
          <p>
            © 2026{" "}
            <span className="font-semibold text-slate-700 dark:text-white">
              HMEC
            </span>
            . All rights reserved.
          </p>

          <div className="flex items-center gap-6">
            <Link
              to="/company-admin/coming-soon/privacy-policy"
              className="transition hover:text-blue-600"
            >
              Privacy
            </Link>

            <Link
              to="/company-admin/coming-soon/terms"
              className="transition hover:text-blue-600"
            >
              Terms
            </Link>

            <Link to="/contact" className="transition hover:text-blue-600">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}