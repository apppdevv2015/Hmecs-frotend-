import { useEffect, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import Navbar from "../../components/landing/Navbar";
import Footer from "../../components/landing/Footer";
import { Controller } from "react-hook-form";
import PhoneField from "../../components/common/PhoneField";
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  Loader2,
  CheckCircle2,
  Building2,
  MessageSquare,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";

// BACKEND TODO: replace with live company contact data from
// GET /api/platform/contact-info (support email/phone, office address, hours)

const contactInfo = [
  {
    icon: Phone,
    label: "Call Us",
    value: "+1 202-620-1020",
    sub: "Mon - Sat, 9:00 AM - 7:00 PM",
  },
  {
    icon: Mail,
    label: "Email Us",
    value: "support@hmec.com",
    sub: "We reply within 24 hours",
  },
  {
    icon: MapPin,
    label: "Visit Us",
    value: "Panchkula, Haryana, India",
    sub: "By appointment only",
  },
  {
    icon: Clock,
    label: "Working Hours",
    value: "Mon - Sat: 9 AM - 7 PM",
    sub: "Sunday: Closed",
  },
];

const subjectOptions = [
  { value: "sales", label: "Sales & Pricing" },
  { value: "demo", label: "Book A Demo" },
  { value: "support", label: "Technical Support" },
  { value: "partnership", label: "Partnership" },
  { value: "other", label: "Other" },
] as const;

const faqs = [
  {
    question: "How quickly can HMEC be set up for my fleet?",
    answer:
      "Most companies are onboarded and tracking their first machines within a week, depending on fleet size and how many roles need access.",
  },
  {
    question: "Can HMEC handle 100+ machines across multiple companies?",
    answer:
      "Yes. The Super Admin view is built for cross-company fleets with searchable dashboards, so scale isn't a problem.",
  },
  {
    question: "Do you offer a demo before we subscribe?",
    answer:
      "Yes, you can book a walkthrough with our team using the form on this page or the Book Demo button above.",
  },
];
const contactSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "Full name is required.")
    .max(80, "Name cannot exceed 80 characters.")
    .regex(/^[A-Za-z\s.'-]+$/, "Name can only contain letters."),

  email: z
    .string()
    .trim()
    .min(1, "Email is required.")
    .email("Please enter a valid email address."),

  phone: z.string().trim().optional().or(z.literal("")),

  company: z
    .string()
    .trim()
    .max(120, "Company name cannot exceed 120 characters.")
    .optional()
    .or(z.literal("")),

  subject: z.enum(["sales", "demo", "support", "partnership", "other"], {
    message: "Please select a subject.",
  }),

  message: z
    .string()
    .trim()
    .min(1, "Message is required.")
    .max(1000, "Message cannot exceed 1000 characters."),
});

type ContactFormInput = z.input<typeof contactSchema>;
type ContactFormOutput = z.output<typeof contactSchema>;

export default function ContactPage() {
  const [visible, setVisible] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    setVisible(true);
  }, []);

  const {
    control,
    register,
    handleSubmit,
    reset,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormInput, any, ContactFormOutput>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      company: "",
      subject: undefined,
      message: "",
    },
    mode: "onTouched",

    reValidateMode: "onChange",

    shouldFocusError: true,
  });

  const onSubmit: SubmitHandler<ContactFormOutput> = async (data) => {
    try {
      clearErrors();
      // BACKEND TODO: replace with real API call
      // POST /api/contact  { fullName, email, phone, company, subject, message }

      await new Promise((resolve) => setTimeout(resolve, 1200));

      const payload = {
        fullName: data.fullName.trim(),

        email: data.email.trim().toLowerCase(),

        phone: data.phone?.trim(),

        company: data.company?.trim(),

        subject: data.subject,

        message: data.message.trim(),
      };
     

      toast.success("Message sent! Our team will get back to you shortly.");
      setSubmitted(true);
      reset();

      setTimeout(() => setSubmitted(false), 4000);
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="min-h-screen pt-[90px] bg-white text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      <Navbar />

      <main>
        {/* HERO */}
        <section className="relative overflow-hidden border-b border-slate-200 bg-white px-5 py-16 dark:border-slate-800 dark:bg-slate-950 sm:px-6 lg:px-8 lg:py-20">
          {/* Background Gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-slate-950 dark:via-slate-950 dark:to-blue-950/40" />

          {/* Animated Blue Glow */}
          <div className="absolute -left-40 top-10 h-96 w-96 rounded-full bg-blue-400/20 blur-[120px] animate-pulse" />

          <div
            className="absolute -right-32 bottom-0 h-[420px] w-[420px] rounded-full bg-cyan-400/20 blur-[140px] animate-pulse"
            style={{ animationDelay: "1.5s" }}
          />

          {/* Grid Pattern */}
          <div
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage: `
      linear-gradient(to right,#2563eb 1px,transparent 1px),
      linear-gradient(to bottom,#2563eb 1px,transparent 1px)
    `,
              backgroundSize: "48px 48px",
            }}
          />

          {/* Decorative Rings */}
          <div className="absolute left-16 top-20 h-40 w-40 rounded-full border border-blue-300/30" />

          <div className="absolute right-24 bottom-16 h-56 w-56 rounded-full border border-cyan-300/20" />

          {/* Floating Dots */}
          <div className="absolute left-[15%] top-[25%] h-3 w-3 rounded-full bg-blue-500 animate-ping" />

          <div
            className="absolute right-[18%] top-[40%] h-2 w-2 rounded-full bg-cyan-500 animate-ping"
            style={{ animationDelay: "1s" }}
          />

          <div
            className="absolute left-[40%] bottom-[22%] h-2 w-2 rounded-full bg-blue-400 animate-ping"
            style={{ animationDelay: "2s" }}
          />

          {/* Content */}
          <div
            className={`relative z-10 mx-auto max-w-4xl text-center transition-all duration-700 ${
              visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
          >
            <p className="text-xs font-black uppercase tracking-[0.35em] text-blue-600">
              Get In Touch
            </p>

            <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl">
              Let's talk about
              <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                {" "}
                your fleet
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
              Have a question about pricing, want a walkthrough of HMEC, or need
              support with your account? Reach out and our team will get back to
              you within 24 hours.
            </p>

            {/* Bottom Divider */}
            <div className="mx-auto mt-10 h-1 w-24 rounded-full bg-gradient-to-r from-blue-600 to-cyan-400" />
          </div>
        </section>

        {/* CONTACT INFO CARDS */}
        <section className="bg-slate-50 px-5 py-16 dark:bg-slate-900/30 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {contactInfo.map((item, index) => {
              const Icon = item.icon;

              return (
                <div key={item.label} className="group relative">
                  {/* Icon */}
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 transition-colors duration-300 group-hover:bg-blue-100 dark:bg-blue-500/10 dark:group-hover:bg-blue-500/20">
                    <Icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>

                  {/* Content */}
                  <div className="mt-5">
                    <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600 dark:text-blue-400">
                      {item.label}
                    </p>

                    <p className="mt-2 text-lg font-bold text-slate-900 dark:text-white">
                      {item.value}
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                      {item.sub}
                    </p>
                  </div>

                  {/* Bottom Line */}
                  <div className="mt-6 h-px w-full bg-slate-200 transition-all duration-300 group-hover:bg-blue-500 dark:bg-slate-700" />

                  {/* Vertical Divider */}
                  {index !== contactInfo.length - 1 && (
                    <div className="absolute -right-5 top-0 hidden h-full w-px bg-slate-200 lg:block dark:bg-slate-700" />
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* FORM + INFO PANEL */}
        {/* FORM + INFO PANEL */}
        <section className="border-y border-slate-200 bg-white px-5 py-20 dark:border-slate-800 dark:bg-slate-950 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1fr_1.15fr] lg:gap-16">
            {/* LEFT INFO PANEL — no filled box, just border-top accent */}
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600">
                Why Reach Out
              </p>
              <h2 className="mt-3 text-2xl font-black leading-tight tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                We'll help you find the right fit for your fleet
              </h2>
              <p className="mt-5 max-w-md text-sm leading-7 text-slate-600 dark:text-slate-300">
                Tell us a bit about your operation — fleet size, number of sites
                and which roles need access — and our team will follow up with
                the right plan and a live walkthrough.
              </p>

              <div className="mt-8 space-y-4 border-t border-slate-200 pt-6 dark:border-slate-800">
                {[
                  "Response within 24 hours, guaranteed",
                  "Free walkthrough of the full platform",
                  "No commitment required to talk to us",
                ].map((point) => (
                  <div
                    key={point}
                    className="flex items-start gap-3 text-sm font-semibold text-slate-700 dark:text-slate-300"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                    {point}
                  </div>
                ))}
              </div>

              <div className="mt-8 flex items-start gap-3 border-t border-slate-200 pt-6 dark:border-slate-800">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                <p className="text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">
                  Your information is only used to respond to your enquiry.
                </p>
              </div>
            </div>

            {/* RIGHT FORM — flat border, no shadow, no filled bg */}
            <div className="border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950 sm:p-8">
              {submitted ? (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                  <CheckCircle2
                    className="h-8 w-8 text-blue-600 dark:text-blue-400"
                    strokeWidth={1.75}
                  />
                  <h3 className="text-lg font-bold text-slate-950 dark:text-white">
                    Message sent successfully
                  </h3>
                  <p className="max-w-xs text-sm text-slate-600 dark:text-slate-300">
                    Thanks for reaching out. Our team will get back to you
                    shortly.
                  </p>
                </div>
              ) : (
                <form
                  onSubmit={handleSubmit(onSubmit)}
                  noValidate
                  autoComplete="off"
                  className="space-y-5"
                >
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Full Name
                      </label>

                      <input
                        type="text"
                        autoComplete="off"
                        placeholder="John Doe"
                        {...register("fullName", {
                          onChange: () => {
                            if (errors.fullName) {
                              clearErrors("fullName");
                            }
                          },
                        })}
                        className={`w-full rounded-lg border bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition

${
  errors.fullName
    ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
    : "border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
}

dark:border-slate-700
dark:bg-slate-900
dark:text-white`}
                      />

                      {errors.fullName && (
                        <p className="mt-1 text-xs font-medium text-red-500">
                          {errors.fullName.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Email Address
                      </label>
                      <input
                        type="email"
                        autoComplete="off"
                        placeholder="john@company.com"
                        {...register("email")}
                        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                      {errors.email && (
                        <p className="mt-1 text-xs font-semibold text-red-500">
                          {errors.email.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Phone Number{" "}
                        <span className="text-slate-400">(optional)</span>
                      </label>

                      <Controller
                        name="phone"
                        control={control}
                        render={({ field }) => (
                          <PhoneField
                            value={field.value ?? ""}
                            onChange={(value) => {
                              field.onChange(value);

                              if (errors.phone) {
                                clearErrors("phone");
                              }
                            }}
                            error={errors.phone?.message}
                            label=""
                            required={false}
                            defaultCountry="ZA"
                          />
                        )}
                      />

                      {errors.phone?.message && (
                        <p className="mt-1 text-xs font-medium text-red-500">
                          {errors.phone.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Company{" "}
                        <span className="text-slate-400">(optional)</span>
                      </label>
                      <div className="relative">
                        <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          autoComplete="off"
                          placeholder="Your Company Ltd."
                          {...register("company")}
                          className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                      </div>
                      {errors.company && (
                        <p className="mt-1 text-xs font-semibold text-red-500">
                          {errors.company.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Subject
                    </label>
                    <select
                      {...register("subject")}
                      defaultValue=""
                      className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    >
                      <option value="" disabled>
                        Select a subject
                      </option>
                      {subjectOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    {errors.subject && (
                      <p className="mt-1 text-xs font-semibold text-red-500">
                        {errors.subject.message as string}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Message
                    </label>
                    <div className="relative">
                      <MessageSquare className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                      <textarea
                        rows={5}
                        placeholder="Tell us about your fleet and what you need help with..."
                        {...register("message")}
                        className="w-full resize-none rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                    </div>
                    {errors.message && (
                      <p className="mt-1 text-xs font-semibold text-red-500">
                        {errors.message.message}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Send Message
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>

        {/* MAP / LOCATION PLACEHOLDER */}
        <section className="bg-slate-50 px-5 py-16 dark:bg-slate-900/30 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto mb-12 max-w-3xl text-center">
              {/* Badge */}
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-5 py-2 shadow-sm dark:border-blue-900/50 dark:bg-blue-950/40">
                <MapPin className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-extrabold uppercase tracking-[0.25em] text-blue-700 dark:text-blue-400">
                  Our Office
                </span>
              </div>

              {/* Heading */}
              <h2 className="text-3xl font-black leading-tight tracking-tight text-slate-900 dark:text-white sm:text-4xl lg:text-5xl">
                Visit Our{" "}
                <span className="bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-500 bg-clip-text text-transparent">
                  Headquarters
                </span>
              </h2>

              {/* Description */}
              <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-600 dark:text-slate-400 sm:text-lg">
                We'd love to connect with you. Visit our office, schedule a
                meeting, or explore our location directly through the
                interactive map below.
              </p>

              {/* Decorative Divider */}
              <div className="mt-8 flex justify-center">
                <div className="h-1 w-24 rounded-full bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-500" />
              </div>
            </div>

            <div className="overflow-hidden rounded-[2px] border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
              <iframe
                title="AtAppiSoft Technologies LLP"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3430.5488944912668!2d76.68061769678955!3d30.702965999999996!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x390fef3de9c94d33%3A0x338cdaeb90c66a5f!2sAtAppiSoft%20Technologies%20LLP!5e0!3m2!1sen!2sin!4v1783602649275!5m2!1sen!2sin"
                className="h-[450px] w-full"
                loading="lazy"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-t border-slate-200 bg-white px-5 py-20 dark:border-slate-800 dark:bg-slate-950 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <div className="mb-10 text-center">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600">
                FAQ
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                Common questions
              </h2>
            </div>

            <div className="space-y-3">
              {faqs.map((faq, index) => {
                const isOpen = openFaq === index;
                return (
                  <div
                    key={faq.question}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : index)}
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                    >
                      <span className="text-sm font-bold text-slate-950 dark:text-white">
                        {faq.question}
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-blue-600 transition-transform dark:text-blue-400 ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {isOpen && (
                      <div className="border-t border-slate-200 px-5 pb-4 pt-3 dark:border-slate-800">
                        <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                          {faq.answer}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
