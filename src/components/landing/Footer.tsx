import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import Navbar from "./Navbar";
import logo1 from "../../assets/images/landingpageimages/logo1.webp";
const blogImages = import.meta.glob<string>(
  "../../assets/images/landingpageimages/blog/*.{jpg,jpeg,png,webp}",
  {
    eager: true,
    import: "default",
  }
);

interface PrivacySection {
  id: number;
  title: string;
  body: string[];
}

const PRIVACY_TITLE = "Privacy Policy";
const PRIVACY_SUBTITLE = "HME Component Intelligence System";


const PRIVACY_SECTIONS: PrivacySection[] = [
  {
    id: 1,
    title: "Introduction",
    body: ["The Privacy Policy explains how we collect, use, and protect your personal information when you use our services. By using our services, you agree to the terms of this Privacy Policy."],
  },
  {
    id: 2,
    title: "Information We Collect",
    body: ["We may collect personal information such as your name, email address, phone number, and payment information when you use our services. We also collect non-personal information such as your IP address, browser type, and usage data."],
  },
  {
    id: 3,
    title: "How We Use Your Information",
    body: ["We use the information we collect to provide and improve our services, communicate with you, and comply with legal obligations."],
  },
  {
    id: 4,
    title: "Sharing Your Information",
    body: ["We do not sell your personal information. We may share your information with trusted third-party service providers who assist us in providing our services."],
  },
  {
    id: 5,
    title: "Storage and Security",
    body: ["We implement appropriate security measures to protect your personal information from unauthorized access, disclosure, alteration, or destruction."],
  },
  {
    id: 6,
    title: "Access and Responsibilities",
    body: ["Company Admins are responsible for managing user access within their organisation. Users should keep their credentials confidential and notify the relevant administrator if they suspect unauthorised account activity. Companies must ensure they are authorised to provide the data they upload or connect to the Platform."],
  },
  {
    id: 7,
    title: "Third-Party Integrations ",
    body: ["The Platform may connect to telematics, ERP, payment, communication, or other third-party services. Information shared with those services may be subject to their own privacy policies and terms."],
  },
  {
    id: 8,
    title: "Your Rights  ",
    body: ["Depending on applicable law, individuals may have rights to access, correct, delete, or restrict the processing of their personal information, or to raise a complaint. Requests can be submitted using the contact details below. We may need to verify the request and may retain certain information where legally required."],
  },
  {
    id: 9,
    title: "Changes to This Policy ",
    body: ["We may update this Privacy Policy from time to time. The latest version will be published on the Platform with its updated effective date. We encourage you to review this Privacy Policy periodically to stay informed about how we are protecting your information."],
  },
  {
    id: 10,
    title: "Contact",
    body: [
      "Company: HMEC",
      "Email: support@hmec.com",
      "Address: Cape town, South Africa",
      "Applicable jurisdiction: South Africa "
    ],
  },
];

export function PrivacyPolicy() {
  const [active, setActive] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-white pt-[90px] text-slate-900 dark:bg-slate-950 dark:text-white">
      <Navbar active={active} setActive={setActive} />

      {/* Policy content on the full page */}
      <div className="mx-auto max-w-3xl px-6 py-12 text-center">
        <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
          {PRIVACY_TITLE}
        </h1>
        <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
          {PRIVACY_SUBTITLE}
        </p>


        {/* To left-align the policy text, change text-center to text-left on this div */}
        <div className="mt-8 space-y-8 border-t border-slate-200 pt-8 text-left dark:border-slate-800">
          {PRIVACY_SECTIONS.map((section) => (
            <section key={section.id}>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {section.id}. {section.title}
              </h2>
              {section.body.map((paragraph, index) => (
                <p
                  key={index}
                  className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300"
                >
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3 border-t border-slate-200 pt-8 dark:border-slate-800">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-11 items-center justify-center gap-2 rounded-xl border-2 border-slate-200 px-6 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <span aria-hidden="true">&larr;</span>
            Back
          </button>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex h-11 items-center justify-center rounded-xl bg-blue-600 px-8 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20"
          >
            Close
          </button>
        </div>
      </div>

      <Footer />
    </div>
  );
}

const img = (file: string) =>
  blogImages[`../../assets/images/landingpageimages/blog/${file}`];

interface BlogSection {
  id: number;
  title: string;
  body: string[];
  bullets?: { label: string; text: string }[];
  alt: string;
  image: string;
}

const BLOG_SECTIONS: BlogSection[] = [
  {
    id: 1,
    title: "The challenge: information that does not tell the whole story",
    body: [
      "Heavy mining equipment produces and accumulates many types of information. Depending on the machine and available data sources, this may include engine hours, fault codes, temperatures, tyre pressure, payload, inspection results, maintenance jobs, component replacements, downtime and parts consumption.",
      "A single reading rarely explains the full condition of a machine or component. Teams need context: what has changed, what inspections have found, what work has already been performed, and whether operating conditions may be contributing to wear or risk. Missing or delayed information can make planning reactive rather than proactive.",
    ],
    alt: "Technician inspecting a large mining tyre",
    image: img("blog-tyre.jpg"),
  },
  {
    id: 2,
    title: "One connected view of equipment and components",
    body: [
      "A component intelligence platform helps bring available information into a more consistent operational view. Depending on the configured equipment and integrations, the system can support:",
    ],
    bullets: [
      { label: "Equipment health visibility", text: "Organise available machine readings, fault information, and active alerts." },
      { label: "Tyre and component monitoring", text: "Maintain condition, inspection, lifecycle, and replacement information." },
      { label: "Digital inspections and maintenance history", text: "Keep findings, work performed, and component records connected." },
      { label: "Maintenance workflows", text: "Create and track digital job cards, assignments, parts, labour, approvals, and completion." },
      { label: "Financial planning", text: "Connect component condition and lifecycle information with replacement costs, lead times, and budget planning." },
    ],
    alt: "Fleet health dashboard",
    image: img("blog-dashboard.jpg"),
  },
  {
    id: 3,
    title: "From alerts to better maintenance planning",
    body: [
      "Alerts are useful, but they are only one part of the decision process. Maintenance teams also need a way to review an alert, understand the available evidence, assign the work, record findings and close the maintenance loop.",
      "With configured rules and reliable source data, the system can help surface conditions that deserve attention, support prioritisation, and connect an identified issue to a maintenance workflow. More advanced predictive capabilities depend on the quality and history of the data, the availability of relevant integrations, and validated equipment- or site-specific logic.",
    ],
    alt: "Digital job card",
    image: img("jobcard.jpg"),
  },
  {
    id: 4,
    title: "Digital job cards: connecting insight with action",
    body: [
      "When an inspection, breakdown or alert requires work, a digital job card can help carry the task from creation to completion. The workflow may include the machine and component, maintenance type, priority, assigned technician, planned work, labour hours, parts used, photographs, findings, corrective actions, downtime and approvals.",
      "Keeping these details together creates a clearer maintenance history and can support reporting on overdue jobs, parts consumption, labour, mean time to repair (MTTR), mean time between failures (MTBF) and planned maintenance compliance—where the required data is captured.",
    ],
    alt: "Fleet of haul trucks",
    image: img("blog-fleet.jpg"),
  },
  {
    id: 5,
    title: "Why financial intelligence matters",
    body: [
      "Component decisions are also financial decisions. Replacement planning may involve expected remaining life, replacement cost, supplier, lead time and the budget period. Bringing these details into the same view as maintenance and condition information can help teams prepare earlier and make trade-offs with better context.",
      "The goal is not to replace engineering judgement. It is to make relevant information easier to find, compare and use when deciding whether to inspect, repair, monitor or plan a replacement.",
    ],
    alt: "Mining operations at sunset",
    image: img("blog-Sunset(3).jpg"),
  },
];

export function Blog() {
  const [active, setActive] = useState("");

  return (
    <div className="bg-white pt-[90px]">
      <Navbar active={active} setActive={setActive} />
      {/* Top banner: truck in the background, text on top */}
      <div className="relative overflow-hidden bg-[#0b1f3a] text-white">
        <img
          src={img("blog-banner-bg.jpg")}
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
              Mining operations rely on heavy equipment to maintain production. When a machine becomes unavailable, it can disrupt production plans, increase maintenance pressure, and affect operational costs. Equipment health, tyre condition, inspections, maintenance history, component life, and operating costs are often managed across different systems and manual processes, making it difficult to assess asset condition and determine the next steps. The HME Component Intelligence System brings essential equipment and maintenance information together in one platform, helping teams improve visibility, coordinate maintenance activities, and make informed operational decisions.
            </p>
          </div>
        </div>
      </div>

      {/* Blog sections */}
      <div className="mx-auto max-w-6xl space-y-16 px-6 py-14">
        {BLOG_SECTIONS.map((section, index) => (
          <section
            key={section.id}
            className={`flex flex-col items-center gap-8 md:gap-12 ${index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
              }`}
          >
            <div className="md:w-1/2">
              <div className="flex items-center gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-900 text-lg font-bold text-white">
                  {section.id}
                </span>

                <h2 className="text-2xl font-bold text-gray-900">
                  {section.title}
                </h2>
              </div>
              {section.body.map((paragraph, i) => (
                <p key={i} className="mt-4 text-base leading-relaxed text-slate-700">
                  {paragraph}
                </p>
              ))}

              {section.bullets && (
                <ul className="mt-4 space-y-2 text-slate-700">
                  {section.bullets.map((b) => (
                    <li key={b.label} className="flex gap-2">
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-black"></span>
                      <span>
                        <strong className="text-[#0b1f3a]">{b.label}:</strong> {b.text}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="md:w-1/2">
              <img
                src={section.image}
                alt={section.alt}
                className="h-auto w-full  object-contain shadow-md"
              />
            </div>
          </section>
        ))}
      </div>

      <Footer />
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
                  to="/blog"
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

                </Link>
              </li>

              <li>
                <Link
                  to="/privacy-policy"
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
              to="/privacy-policy"
              className="transition hover:text-blue-600"
            >
              Privacy
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
