import React from "react";
import {
  Bell,
  Send,
  UserPlus,
  Settings2,
  Trash2,
  Edit3,
  Plus,
  History,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronDown,
  Zap,
  LayoutGrid,
  Database,
  Pause,
  Mail,
  MessageSquare,
  Phone,
  Check,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type Severity = "Critical" | "Warning" | "Info";
type Channel = "Email" | "SMS" | "WhatsApp";

interface AlertItem {
  id: number;
  machine: string;
  component: string;
  category: string;
  type: string;
  serial: string;
  rule: string;
  life: string;
  hours: string;
  condition: "Critical" | "Warning";
  cost: string;
}

interface HistoryLog {
  id: string;
  date: string;
  recipient: string;
  machine: string;
  component: string;
  severity: Severity;
  channel: Channel[];
  status: "Delivered" | "Failed" | "Pending";
}

interface Contact {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  channels: Channel[];
  severities: Severity[];
  initial: string;
  color: string;
  status: "Active" | "Inactive";
}

interface AlertRule {
  id: string;
  name: string;
  severity: Severity;
  triggerType: "Remaining Life %" | "Remaining Hours" | "Condition Level";
  comparator: "<=" | ">=";
  threshold: string;
  category: string;
  trigger: string;
  active: boolean;
}

/* ------------------------------------------------------------------ */
/* Dummy Data (BACKEND TODO: replace with real API response envelopes) */
/* ------------------------------------------------------------------ */

const ACTIVE_ALERTS: AlertItem[] = [
  { id: 1, machine: "CK&IJ-990-020", component: "Turbocharger", category: "Engine", type: "FEL", serial: "CK-01-002", rule: "Engine Condition Alert", life: "55.0%", hours: "4,400 hrs", condition: "Warning", cost: "R 200K" },
  { id: 2, machine: "CK&IJ-785-011", component: "Front Left Tyre", category: "Tyre", type: "Truck", serial: "TY-01-099", rule: "Critical Tyre Alert", life: "8.0%", hours: "12,800 hrs", condition: "Critical", cost: "R 450K" },
  { id: 3, machine: "CK&IJ-EX300-015", component: "Bucket Teeth Set", category: "Ground Engaging", type: "Excavator", serial: "GET-05-22", rule: "Wear Threshold Alert", life: "32.0%", hours: "850 hrs", condition: "Warning", cost: "R 45K" },
];

const INITIAL_HISTORY: HistoryLog[] = [
  { id: "h1", date: "2026/05/10 15:35", recipient: "Thabo Dlamini", machine: "CK&IJ-990-020", component: "Front Left Tyre", severity: "Critical", channel: ["Email", "WhatsApp"], status: "Delivered" },
  { id: "h2", date: "2026/05/11 15:35", recipient: "Sipho Mokoena", machine: "CK&IJ-785-011", component: "Left Rear Tyre", severity: "Critical", channel: ["Email"], status: "Delivered" },
  { id: "h3", date: "2026/05/12 15:35", recipient: "Nompumelelo Zulu", machine: "CK&IJ-GD-007", component: "Front Tyre LH", severity: "Critical", channel: ["Email", "SMS"], status: "Delivered" },
  { id: "h4", date: "2026/05/13 10:35", recipient: "Pieter Khumalo", machine: "CK&IJ-EX300-015", component: "Bucket Teeth Set", severity: "Warning", channel: ["Email"], status: "Delivered" },
  { id: "h5", date: "2026/05/13 13:35", recipient: "Thabo Dlamini", machine: "CK&IJ-990-020", component: "Turbocharger", severity: "Warning", channel: ["Email", "WhatsApp"], status: "Delivered" },
];

const INITIAL_CONTACTS: Contact[] = [
  { id: "c1", name: "Thabo Dlamini", role: "Fleet Manager", email: "thabo@ckijgroup.co.za", phone: "+27 82 000 1001", channels: ["Email", "SMS", "WhatsApp"], severities: ["Critical", "Warning"], initial: "TD", color: "bg-blue-600", status: "Active" },
  { id: "c2", name: "Sipho Mokoena", role: "Workshop Supervisor", email: "sipho@ckijgroup.co.za", phone: "+27 82 000 1002", channels: ["Email", "SMS", "WhatsApp"], severities: ["Critical", "Warning"], initial: "SM", color: "bg-slate-700", status: "Active" },
  { id: "c3", name: "Nompumelelo Zulu", role: "Safety Officer", email: "nompu@ckijgroup.co.za", phone: "+27 82 000 1003", channels: ["Email", "SMS", "WhatsApp"], severities: ["Critical"], initial: "NZ", color: "bg-blue-800", status: "Active" },
  { id: "c4", name: "Pieter Khumalo", role: "Maintenance Planner", email: "pieter@ckijgroup.co.za", phone: "+27 82 000 1004", channels: ["Email", "SMS", "WhatsApp"], severities: ["Critical", "Warning"], initial: "PK", color: "bg-slate-600", status: "Active" },
  { id: "c5", name: "CK&IJ Operations", role: "Group Email Alias", email: "ops@ckijgroup.co.za", phone: "+27 82 000 1005", channels: ["Email", "SMS", "WhatsApp"], severities: ["Critical", "Warning", "Info"], initial: "CO", color: "bg-blue-700", status: "Active" },
];

const INITIAL_RULES: AlertRule[] = [
  { id: "r1", name: "Critical Life Threshold", severity: "Critical", triggerType: "Remaining Life %", comparator: "<=", threshold: "10", category: "All categories", trigger: "Remaining Life % ≤ 10% · All categories", active: true },
  { id: "r2", name: "Warning Life Threshold", severity: "Warning", triggerType: "Remaining Life %", comparator: "<=", threshold: "25", category: "All categories", trigger: "Remaining Life % ≤ 25% · All categories", active: true },
  { id: "r3", name: "Tyre End-of-Life", severity: "Critical", triggerType: "Remaining Life %", comparator: "<=", threshold: "15", category: "Tyre", trigger: "Remaining Life % ≤ 15% · Category: Tyre", active: true },
  { id: "r4", name: "Engine Condition Alert", severity: "Warning", triggerType: "Condition Level", comparator: ">=", threshold: "4", category: "Engine", trigger: "Condition Level ≥ 4 · Category: Engine", active: true },
  { id: "r5", name: "Near-Zero Hours Warning", severity: "Warning", triggerType: "Remaining Hours", comparator: "<=", threshold: "200", category: "All categories", trigger: "Remaining Hours ≤ 200 hrs · All categories", active: true },
  { id: "r6", name: "Structural Wear Monitor", severity: "Warning", triggerType: "Remaining Life %", comparator: "<=", threshold: "20", category: "Structural / Wear", trigger: "Remaining Life % ≤ 20% · Category: Structural / Wear", active: false },
];

const CHANNEL_ICON: Record<Channel, React.ElementType> = { Email: Mail, SMS: Phone, WhatsApp: MessageSquare };
const AVATAR_COLORS = ["bg-blue-600", "bg-slate-700", "bg-blue-800", "bg-slate-600", "bg-blue-700", "bg-slate-800"];

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

function nowStamp() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* ------------------------------------------------------------------ */
/* Small reusable UI bits                                              */
/* ------------------------------------------------------------------ */

function Toast({ toast }: { toast: { message: string; type: "success" | "error" } | null }) {
  if (!toast) return null;
  return (
    <div className="fixed top-6 right-4 left-4 sm:left-auto z-[200] animate-in slide-in-from-top-4 duration-300">
      <div
        className={`flex items-center gap-3 px-5 py-3.5 rounded-lg shadow-lg border text-[13px] font-medium sm:min-w-[320px] ${
          toast.type === "success"
            ? "bg-slate-900 border-slate-800 text-white"
            : "bg-red-600 border-red-700 text-white"
        }`}
      >
        {toast.type === "success" ? <CheckCircle2 size={16} className="text-blue-400 shrink-0" /> : <AlertCircle size={16} className="shrink-0" />}
        <span>{toast.message}</span>
      </div>
    </div>
  );
}

function ChannelPill({ channel, active, onClick }: { channel: Channel; active: boolean; onClick?: () => void }) {
  const Icon = CHANNEL_ICON[channel];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[11px] font-medium border transition-colors ${
        active
          ? "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-500/10 dark:border-blue-500/30 dark:text-blue-300"
          : "bg-white border-slate-200 text-slate-500 hover:border-slate-300 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400"
      }`}
    >
      <Icon size={13} /> {channel}
    </button>
  );
}

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-medium text-slate-400 tracking-wide">{children}</p>;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-[12px] font-medium text-slate-500 dark:text-slate-400">{children}</label>;
}

const inputClass =
  "w-full px-4 py-2.5 rounded-lg bg-white border border-slate-200 text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 dark:bg-slate-900 dark:border-slate-700 dark:text-white transition-colors";
const selectClass =
  "appearance-none w-full px-4 py-2.5 pr-10 rounded-lg bg-white border border-slate-200 text-[13px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 dark:bg-slate-900 dark:border-slate-700 dark:text-white transition-colors cursor-pointer";

/* ------------------------------------------------------------------ */
/* Main Page                                                            */
/* ------------------------------------------------------------------ */

export default function AlertsPage() {
  /* ---------------- core data state ---------------- */
  const [alertRules, setAlertRules] = React.useState<AlertRule[]>(INITIAL_RULES);
  const [contacts, setContacts] = React.useState<Contact[]>(INITIAL_CONTACTS);
  const [history, setHistory] = React.useState<HistoryLog[]>(INITIAL_HISTORY);
  const [alertFilter, setAlertFilter] = React.useState<"All Alerts" | Severity>("All Alerts");

  /* ---------------- toast ---------------- */
  const [toast, setToast] = React.useState<{ message: string; type: "success" | "error" } | null>(null);
  const toastTimer = React.useRef<number | null>(null);
  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3000);
  };

  /* ---------------- notify modal ---------------- */
  const [notifyModalOpen, setNotifyModalOpen] = React.useState(false);
  const [notifyAlert, setNotifyAlert] = React.useState<AlertItem | null>(null);
  const [selectedContactIds, setSelectedContactIds] = React.useState<string[]>([]);
  const [selectedChannels, setSelectedChannels] = React.useState<Channel[]>(["Email"]);
  const [notifyMessage, setNotifyMessage] = React.useState("");
  const [sending, setSending] = React.useState(false);

  const openNotifyModal = (alert: AlertItem, notifyAll: boolean) => {
    setNotifyAlert(alert);
    setSelectedContactIds(notifyAll ? contacts.filter((c) => c.status === "Active").map((c) => c.id) : []);
    setSelectedChannels(["Email"]);
    setNotifyMessage(
      `${alert.condition} alert: ${alert.component} on ${alert.machine} — remaining life ${alert.life}. Rule triggered: ${alert.rule}.`
    );
    setNotifyModalOpen(true);
  };

  const closeNotifyModal = () => {
    setNotifyModalOpen(false);
    setNotifyAlert(null);
  };

  const toggleContactSelection = (id: string) => {
    setSelectedContactIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleChannel = (ch: Channel) => {
    setSelectedChannels((prev) => (prev.includes(ch) ? prev.filter((x) => x !== ch) : [...prev, ch]));
  };

  const sendNotifications = () => {
    if (!notifyAlert) return;
    if (selectedContactIds.length === 0) {
      showToast("Select at least one contact", "error");
      return;
    }
    if (selectedChannels.length === 0) {
      showToast("Select at least one channel", "error");
      return;
    }
    setSending(true);
    setTimeout(() => {
      const newLogs: HistoryLog[] = selectedContactIds.map((cid) => {
        const contact = contacts.find((c) => c.id === cid)!;
        return {
          id: `h-${Date.now()}-${cid}`,
          date: nowStamp(),
          recipient: contact.name,
          machine: notifyAlert.machine,
          component: notifyAlert.component,
          severity: notifyAlert.condition,
          channel: selectedChannels,
          status: "Delivered",
        };
      });
      setHistory((prev) => [...newLogs, ...prev]);
      setSending(false);
      closeNotifyModal();
      showToast(`Notification sent to ${newLogs.length} contact${newLogs.length > 1 ? "s" : ""}`);
    }, 500);
  };

  /* ---------------- send all (header button) ---------------- */
  const filteredAlerts = ACTIVE_ALERTS.filter((alert) => (alertFilter === "All Alerts" ? true : alert.condition === alertFilter));
  const filteredAlertsRef = React.useRef(filteredAlerts);
  filteredAlertsRef.current = filteredAlerts;

  const sendAllToContacts = () => {
    const activeContacts = contacts.filter((c) => c.status === "Active");
    if (activeContacts.length === 0 || filteredAlertsRef.current.length === 0) {
      showToast("Nothing to send", "error");
      return;
    }
    const newLogs: HistoryLog[] = [];
    filteredAlertsRef.current.forEach((alert) => {
      activeContacts
        .filter((c) => c.severities.includes(alert.condition))
        .forEach((c) => {
          newLogs.push({
            id: `h-${Date.now()}-${alert.id}-${c.id}`,
            date: nowStamp(),
            recipient: c.name,
            machine: alert.machine,
            component: alert.component,
            severity: alert.condition,
            channel: c.channels,
            status: "Delivered",
          });
        });
    });
    if (newLogs.length === 0) {
      showToast("No matching contacts for these alerts", "error");
      return;
    }
    setHistory((prev) => [...newLogs, ...prev]);
    showToast(`Sent ${newLogs.length} notification${newLogs.length > 1 ? "s" : ""} across all active alerts`);
  };

  /* ---------------- rule toggle / CRUD ---------------- */
  const toggleRuleStatus = (id: string) => {
    setAlertRules((prev) => prev.map((rule) => (rule.id === id ? { ...rule, active: !rule.active } : rule)));
  };

  const deleteRule = (id: string) => {
    setAlertRules((prev) => prev.filter((r) => r.id !== id));
    showToast("Alert rule removed");
  };

  const deleteContact = (id: string) => {
    setContacts((prev) => prev.filter((c) => c.id !== id));
    showToast("Contact removed");
  };

  /* ---------------- Add / Edit Contact modal ---------------- */
  const emptyContactForm = { name: "", role: "", email: "", phone: "", channels: ["Email"] as Channel[], severities: ["Critical", "Warning"] as Severity[], status: "Active" as "Active" | "Inactive" };
  const [isAddContactModalOpen, setIsAddContactModalOpen] = React.useState(false);
  const [contactForm, setContactForm] = React.useState(emptyContactForm);
  const [editingContactId, setEditingContactId] = React.useState<string | null>(null);

  const openAddContact = () => {
    setEditingContactId(null);
    setContactForm(emptyContactForm);
    setIsAddContactModalOpen(true);
  };

  const openEditContact = (c: Contact) => {
    setEditingContactId(c.id);
    setContactForm({ name: c.name, role: c.role, email: c.email, phone: c.phone, channels: c.channels, severities: c.severities, status: c.status });
    setIsAddContactModalOpen(true);
  };

  const toggleFormChannel = (ch: Channel) => {
    setContactForm((f) => ({ ...f, channels: f.channels.includes(ch) ? f.channels.filter((x) => x !== ch) : [...f.channels, ch] }));
  };

  const toggleFormSeverity = (sv: Severity) => {
    setContactForm((f) => ({ ...f, severities: f.severities.includes(sv) ? f.severities.filter((x) => x !== sv) : [...f.severities, sv] }));
  };

  const saveContact = () => {
    if (!contactForm.name.trim() || !contactForm.email.trim()) {
      showToast("Name and email are required", "error");
      return;
    }
    if (editingContactId) {
      setContacts((prev) => prev.map((c) => (c.id === editingContactId ? { ...c, ...contactForm, initial: initials(contactForm.name) } : c)));
      showToast("Contact updated");
    } else {
      const newContact: Contact = {
        id: `c-${Date.now()}`,
        ...contactForm,
        initial: initials(contactForm.name),
        color: AVATAR_COLORS[contacts.length % AVATAR_COLORS.length],
      };
      setContacts((prev) => [...prev, newContact]);
      showToast("Contact added");
    }
    setIsAddContactModalOpen(false);
  };

  /* ---------------- Add / Edit Rule modal ---------------- */
  const emptyRuleForm = { name: "", triggerType: "Remaining Life %" as AlertRule["triggerType"], comparator: "<=" as AlertRule["comparator"], threshold: "", category: "All categories", severity: "Warning" as Severity, status: "Active" as "Active" | "Inactive" };
  const [isAddRuleModalOpen, setIsAddRuleModalOpen] = React.useState(false);
  const [ruleForm, setRuleForm] = React.useState(emptyRuleForm);
  const [editingRuleId, setEditingRuleId] = React.useState<string | null>(null);

  const openAddRule = () => {
    setEditingRuleId(null);
    setRuleForm(emptyRuleForm);
    setIsAddRuleModalOpen(true);
  };

  const openEditRule = (r: AlertRule) => {
    setEditingRuleId(r.id);
    setRuleForm({ name: r.name, triggerType: r.triggerType, comparator: r.comparator, threshold: r.threshold, category: r.category, severity: r.severity, status: r.active ? "Active" : "Inactive" });
    setIsAddRuleModalOpen(true);
  };

  const saveRule = () => {
    if (!ruleForm.name.trim() || !ruleForm.threshold.trim()) {
      showToast("Rule name and threshold are required", "error");
      return;
    }
    const comparatorLabel = ruleForm.comparator === "<=" ? "≤" : "≥";
    const unit = ruleForm.triggerType === "Remaining Hours" ? " hrs" : ruleForm.triggerType === "Remaining Life %" ? "%" : "";
    const triggerText = `${ruleForm.triggerType} ${comparatorLabel} ${ruleForm.threshold}${unit} · ${ruleForm.category === "All categories" ? "All categories" : `Category: ${ruleForm.category}`}`;

    if (editingRuleId) {
      setAlertRules((prev) =>
        prev.map((r) =>
          r.id === editingRuleId
            ? { ...r, name: ruleForm.name, triggerType: ruleForm.triggerType, comparator: ruleForm.comparator, threshold: ruleForm.threshold, category: ruleForm.category, severity: ruleForm.severity, trigger: triggerText, active: ruleForm.status === "Active" }
            : r
        )
      );
      showToast("Alert rule updated");
    } else {
      const newRule: AlertRule = {
        id: `r-${Date.now()}`,
        name: ruleForm.name,
        severity: ruleForm.severity,
        triggerType: ruleForm.triggerType,
        comparator: ruleForm.comparator,
        threshold: ruleForm.threshold,
        category: ruleForm.category,
        trigger: triggerText,
        active: ruleForm.status === "Active",
      };
      setAlertRules((prev) => [...prev, newRule]);
      showToast("Alert rule added");
    }
    setIsAddRuleModalOpen(false);
  };

  /* ---------------- Quick Send card (bottom right) ---------------- */
  const [qsRecipientId, setQsRecipientId] = React.useState(contacts[0]?.id ?? "");
  const [qsSeverity, setQsSeverity] = React.useState<Severity>("Warning");
  const [qsChannels, setQsChannels] = React.useState<Channel[]>(["Email"]);
  const [qsMessage, setQsMessage] = React.useState("");

  React.useEffect(() => {
    if (!contacts.find((c) => c.id === qsRecipientId) && contacts[0]) {
      setQsRecipientId(contacts[0].id);
    }
  }, [contacts, qsRecipientId]);

  const toggleQsChannel = (ch: Channel) => {
    setQsChannels((prev) => (prev.includes(ch) ? prev.filter((x) => x !== ch) : [...prev, ch]));
  };

  const sendQuickAlert = () => {
    const contact = contacts.find((c) => c.id === qsRecipientId);
    if (!contact) {
      showToast("Pick a recipient first", "error");
      return;
    }
    if (qsChannels.length === 0) {
      showToast("Select at least one channel", "error");
      return;
    }
    const log: HistoryLog = {
      id: `h-${Date.now()}`,
      date: nowStamp(),
      recipient: contact.name,
      machine: "Manual Alert",
      component: qsMessage.trim() ? qsMessage.trim().slice(0, 40) : "Custom Notification",
      severity: qsSeverity,
      channel: qsChannels,
      status: "Delivered",
    };
    setHistory((prev) => [log, ...prev]);
    setQsMessage("");
    showToast(`Notification sent to ${contact.name}`);
  };

  /* ---------------- misc ---------------- */
  const clearHistory = () => {
    if (history.length === 0) return;
    setHistory([]);
    showToast("Notification history cleared");
  };

  /* ================================================================ */

  return (
    <div className="min-h-screen bg-[#F8F9FB] dark:bg-slate-950 p-3 sm:p-6 lg:p-10 font-sans antialiased" style={{ fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}>
      <Toast toast={toast} />

      <div className="mx-auto max-w-[1600px] grid grid-cols-1 xl:grid-cols-12 gap-5 lg:gap-8">
        {/* Left Column: Alerts & History */}
        <div className="xl:col-span-8 space-y-5 lg:space-y-8">
          {/* Active Alerts Section */}
          <div className="rounded-2xl bg-white shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-800 overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="h-9 w-9 rounded-lg bg-red-50 flex items-center justify-center text-red-500 dark:bg-red-500/10 shrink-0">
                  <AlertCircle size={18} />
                </div>
                <div>
                  <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white tracking-tight">Active Component Alerts</h2>
                  <SectionEyebrow>Auto-detected from current fleet lifecycle data</SectionEyebrow>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative">
                  <select
                    value={alertFilter}
                    onChange={(e) => setAlertFilter(e.target.value as any)}
                    className="appearance-none pl-4 pr-9 py-2.5 rounded-lg bg-white border border-slate-200 text-[12px] font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:bg-slate-800 dark:border-slate-700 dark:text-white cursor-pointer hover:border-slate-300 transition-colors"
                  >
                    <option>All Alerts</option>
                    <option>Critical</option>
                    <option>Warning</option>
                    <option>Info</option>
                  </select>
                  <ChevronDown size={13} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
                <button
                  onClick={sendAllToContacts}
                  className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-[12px] font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm"
                >
                  <Send size={14} /> Send All to Contacts
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
              {filteredAlerts.length > 0 ? (
                filteredAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="relative rounded-xl bg-white border border-slate-150 p-5 sm:p-6 group hover:border-slate-300 hover:shadow-sm transition-all dark:bg-slate-900 dark:border-slate-800 overflow-hidden"
                    style={{ borderColor: "#E5E9F0" }}
                  >
                    <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${alert.condition === "Critical" ? "bg-red-500" : "bg-blue-500"}`} />
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 sm:gap-6 pl-2">
                      <div className="flex items-start gap-4">
                        <div
                          className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                            alert.condition === "Critical" ? "bg-red-50 text-red-500" : "bg-blue-50 text-blue-600 dark:bg-blue-500/10"
                          }`}
                        >
                          <History size={19} />
                        </div>
                        <div className="space-y-2.5">
                          <h3 className="text-[14px] font-semibold text-slate-900 dark:text-white">
                            {alert.component} <span className="text-slate-400 font-normal">— {alert.machine}</span>
                          </h3>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                            <span className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                              <Settings2 size={12} className="text-slate-400" /> {alert.category}
                            </span>
                            <span className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                              <LayoutGrid size={12} className="text-slate-400" /> {alert.type}
                            </span>
                            <span className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                              <Database size={12} className="text-slate-400" /> S/N: {alert.serial}
                            </span>
                            <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                              <Zap size={12} className={alert.condition === "Critical" ? "text-red-500" : "text-blue-500"} /> Rule: {alert.rule}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <span className={`px-2.5 py-1 rounded-md text-[11px] font-medium ${alert.condition === "Critical" ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"}`}>
                              Remaining Life: {alert.life}
                            </span>
                            <span className="px-2.5 py-1 rounded-md bg-slate-100 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                              Remaining Hours: {alert.hours}
                            </span>
                            <span className={`px-2.5 py-1 rounded-md text-[11px] font-medium ${alert.condition === "Critical" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
                              Condition: {alert.condition}
                            </span>
                            <span className="px-2.5 py-1 rounded-md bg-slate-100 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                              Repl. Cost: {alert.cost}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 lg:min-w-[190px]">
                        <button
                          onClick={() => openNotifyModal(alert, true)}
                          className={`flex items-center justify-center gap-2 w-full py-2.5 text-white rounded-lg text-[12px] font-medium transition-colors ${
                            alert.condition === "Critical" ? "bg-red-500 hover:bg-red-600" : "bg-blue-600 hover:bg-blue-700"
                          }`}
                        >
                          <Bell size={13} /> Notify All
                        </button>
                        <p className="text-[10px] text-center text-slate-400">
                          {contacts.filter((c) => c.status === "Active" && c.severities.includes(alert.condition)).length} contacts will be notified
                        </p>
                        <button
                          onClick={() => openNotifyModal(alert, false)}
                          className="flex items-center justify-center gap-2 w-full py-2.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-[12px] font-medium hover:bg-slate-50 hover:border-slate-300 transition-colors dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                        >
                          <UserPlus size={13} /> Select Contact
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-14 sm:p-16 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 dark:bg-slate-800">
                    <CheckCircle2 size={22} />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-slate-900 dark:text-white">No {alertFilter} Alerts</p>
                    <p className="text-[11px] text-slate-400">Everything is running smoothly</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Notification History Table */}
          <div className="rounded-2xl bg-white shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-800 overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 dark:bg-blue-500/10 shrink-0">
                  <History size={18} />
                </div>
                <div>
                  <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white tracking-tight">Notification History</h2>
                  <SectionEyebrow>Log of all sent alerts and notifications</SectionEyebrow>
                </div>
              </div>
              <button
                onClick={clearHistory}
                className="px-3.5 py-2 rounded-lg border border-slate-200 text-[11px] font-medium text-slate-500 hover:bg-slate-50 hover:border-red-200 hover:text-red-600 transition-colors dark:border-slate-700 dark:hover:bg-slate-800"
              >
                Clear History
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[720px]">
                <thead className="bg-slate-50/60 dark:bg-slate-900/60">
                  <tr>
                    <th className="px-6 sm:px-8 py-3.5 text-[11px] font-medium text-slate-400">Sent</th>
                    <th className="px-6 sm:px-8 py-3.5 text-[11px] font-medium text-slate-400">Recipient</th>
                    <th className="px-6 sm:px-8 py-3.5 text-[11px] font-medium text-slate-400">Machine</th>
                    <th className="px-6 sm:px-8 py-3.5 text-[11px] font-medium text-slate-400">Component</th>
                    <th className="px-6 sm:px-8 py-3.5 text-[11px] font-medium text-slate-400 text-center">Severity</th>
                    <th className="px-6 sm:px-8 py-3.5 text-[11px] font-medium text-slate-400 text-center">Channel</th>
                    <th className="px-6 sm:px-8 py-3.5 text-[11px] font-medium text-slate-400 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {history.length > 0 ? (
                    history.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/60 transition-colors dark:hover:bg-slate-800/40">
                        <td className="px-6 sm:px-8 py-4 text-[11px] text-slate-400 whitespace-nowrap">{log.date}</td>
                        <td className="px-6 sm:px-8 py-4 text-[12px] font-medium text-slate-900 dark:text-white whitespace-nowrap">{log.recipient}</td>
                        <td className="px-6 sm:px-8 py-4 text-[12px] text-slate-500 whitespace-nowrap">{log.machine}</td>
                        <td className="px-6 sm:px-8 py-4 text-[12px] text-slate-500 whitespace-nowrap">{log.component}</td>
                        <td className="px-6 sm:px-8 py-4 text-center">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-medium ${log.severity === "Critical" ? "bg-red-50 text-red-700" : log.severity === "Warning" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"}`}>
                            {log.severity}
                          </span>
                        </td>
                        <td className="px-6 sm:px-8 py-4">
                          <div className="flex flex-col items-center gap-0.5">
                            {log.channel.map((ch) => (
                              <span key={ch} className="text-[10px] text-slate-500 whitespace-nowrap">{ch}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 sm:px-8 py-4 text-center">
                          <span className="px-2.5 py-1 rounded-md bg-green-50 text-[10px] font-medium text-green-700 border border-green-100 whitespace-nowrap">
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-8 py-12 text-center text-[12px] text-slate-400">
                        No notifications sent yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-4 bg-slate-50/60 border-t border-slate-100 dark:bg-slate-900/40 dark:border-slate-800 flex items-center justify-between">
              <p className="text-[11px] font-medium text-slate-400">{history.length} notifications sent</p>
            </div>
          </div>
        </div>

        {/* Right Column: Contacts & Rules */}
        <div className="xl:col-span-4 space-y-5 lg:space-y-8">
          {/* Notification Contacts */}
          <div className="rounded-2xl bg-white shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-800 overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 dark:bg-blue-500/10 shrink-0">
                  <UserPlus size={18} />
                </div>
                <div>
                  <h3 className="text-[14px] font-semibold text-slate-900 dark:text-white">Notification Contacts</h3>
                  <SectionEyebrow>Who receives alerts</SectionEyebrow>
                </div>
              </div>
              <button
                onClick={openAddContact}
                className="h-8 w-8 rounded-lg border border-slate-200 text-slate-500 flex items-center justify-center hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-colors dark:border-slate-700 dark:hover:bg-slate-800"
              >
                <Plus size={16} />
              </button>
            </div>
            <div className="p-4 sm:p-5 space-y-2.5">
              {contacts.length > 0 ? (
                contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-100 dark:bg-slate-800/40 dark:border-slate-800 flex items-center justify-between gap-3 group hover:border-slate-200 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`h-9 w-9 rounded-lg ${contact.color} text-white flex items-center justify-center text-[11px] font-semibold shrink-0`}>
                        {contact.initial}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-[13px] font-medium text-slate-900 dark:text-white truncate">{contact.name}</h4>
                        <p className="text-[11px] text-slate-400 truncate">{contact.role}</p>
                        <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
                          {contact.channels.map((ch) => (
                            <span key={ch} className="px-1.5 py-0.5 rounded text-[9px] font-medium text-blue-700 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-300">
                              {ch}
                            </span>
                          ))}
                          {contact.status === "Inactive" && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-800">Inactive</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button onClick={() => openEditContact(contact)} className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-white dark:hover:bg-slate-900">
                        <Edit3 size={13} />
                      </button>
                      <button onClick={() => deleteContact(contact.id)} className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-white dark:hover:bg-slate-900">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-[12px] text-slate-400 py-6">No contacts yet — add one to get started</p>
              )}
            </div>
          </div>

          {/* Alert Rules */}
          <div className="rounded-2xl bg-white shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-800 overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 dark:bg-blue-500/10 shrink-0">
                  <Settings2 size={18} />
                </div>
                <div>
                  <h3 className="text-[14px] font-semibold text-slate-900 dark:text-white">Alert Rules</h3>
                  <SectionEyebrow>Automatic trigger thresholds</SectionEyebrow>
                </div>
              </div>
              <button
                onClick={openAddRule}
                className="h-8 w-8 rounded-lg border border-slate-200 text-slate-500 flex items-center justify-center hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-colors dark:border-slate-700 dark:hover:bg-slate-800"
              >
                <Plus size={16} />
              </button>
            </div>
            <div className="p-4 sm:p-5 space-y-2.5">
              {alertRules.map((rule) => (
                <div key={rule.id} className="p-4 rounded-xl bg-slate-50/70 border border-slate-100 dark:bg-slate-800/40 dark:border-slate-800 hover:border-slate-200 transition-colors group">
                  <div className="flex items-center justify-between mb-1.5 gap-2">
                    <h4 className="text-[13px] font-medium text-slate-900 dark:text-white">{rule.name}</h4>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium shrink-0 ${rule.severity === "Critical" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
                      {rule.severity}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mb-4">Trigger: {rule.trigger}</p>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleRuleStatus(rule.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                          rule.active
                            ? "bg-green-50 text-green-700 border border-green-100 hover:bg-green-100"
                            : "bg-slate-100 text-slate-400 border border-slate-200 hover:bg-slate-200"
                        }`}
                      >
                        {rule.active ? <CheckCircle2 size={12} /> : <Pause size={12} />}
                        {rule.active ? "Active" : "Inactive"}
                      </button>
                      <button onClick={() => openEditRule(rule)} className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-white dark:hover:bg-slate-900 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        <Edit3 size={13} />
                      </button>
                      <button onClick={() => deleteRule(rule.id)} className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-white dark:hover:bg-slate-900 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Send Alert Card */}
          <div className="rounded-2xl bg-white shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-800 overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3.5">
              <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 dark:bg-blue-500/10 shrink-0">
                <Send size={18} />
              </div>
              <div>
                <h3 className="text-[14px] font-semibold text-slate-900 dark:text-white">Quick Send Alert</h3>
                <SectionEyebrow>Manual custom notification</SectionEyebrow>
              </div>
            </div>
            <div className="p-5 sm:p-6 space-y-5">
              <div className="space-y-1.5">
                <FieldLabel>Recipient *</FieldLabel>
                <div className="relative">
                  <select value={qsRecipientId} onChange={(e) => setQsRecipientId(e.target.value)} className={selectClass}>
                    {contacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.role})
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={13} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div className="space-y-1.5">
                <FieldLabel>Severity</FieldLabel>
                <div className="relative">
                  <select value={qsSeverity} onChange={(e) => setQsSeverity(e.target.value as Severity)} className={selectClass}>
                    <option>Warning</option>
                    <option>Critical</option>
                    <option>Info</option>
                  </select>
                  <ChevronDown size={13} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div className="space-y-1.5">
                <FieldLabel>Message</FieldLabel>
                <textarea
                  value={qsMessage}
                  onChange={(e) => setQsMessage(e.target.value)}
                  placeholder="Optional note for the recipient..."
                  rows={2}
                  className={`${inputClass} resize-none`}
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {(["Email", "SMS", "WhatsApp"] as Channel[]).map((ch) => (
                  <ChannelPill key={ch} channel={ch} active={qsChannels.includes(ch)} onClick={() => toggleQsChannel(ch)} />
                ))}
              </div>
              <button
                onClick={sendQuickAlert}
                className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-[12px] font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                <Send size={14} /> Send Notification
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ============================ NOTIFY MODAL ============================ */}
      {notifyModalOpen && notifyAlert && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={closeNotifyModal} />
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl animate-in zoom-in-95 duration-150 dark:bg-slate-900">
            <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-10">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${notifyAlert.condition === "Critical" ? "bg-red-50 text-red-500" : "bg-blue-50 text-blue-600 dark:bg-blue-500/10"}`}>
                  <Bell size={18} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white truncate">Send Notification</h3>
                  <p className="text-[11px] text-slate-400 truncate">
                    {notifyAlert.component} — {notifyAlert.machine}
                  </p>
                </div>
              </div>
              <button onClick={closeNotifyModal} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors dark:hover:bg-slate-800 shrink-0">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-6">
              {/* Alert summary */}
              <div className={`p-4 rounded-lg border ${notifyAlert.condition === "Critical" ? "bg-red-50/60 border-red-100" : "bg-blue-50/60 border-blue-100 dark:bg-blue-500/5 dark:border-blue-500/20"}`}>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium">
                  <span className={notifyAlert.condition === "Critical" ? "text-red-700" : "text-blue-700 dark:text-blue-300"}>{notifyAlert.condition}</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-500 dark:text-slate-400">Remaining Life: {notifyAlert.life}</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-500 dark:text-slate-400">Rule: {notifyAlert.rule}</span>
                </div>
              </div>

              {/* Recipients */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <FieldLabel>Recipients * ({selectedContactIds.length} selected)</FieldLabel>
                  <button
                    onClick={() => setSelectedContactIds(selectedContactIds.length === contacts.length ? [] : contacts.map((c) => c.id))}
                    className="text-[11px] font-medium text-blue-600 hover:text-blue-700"
                  >
                    {selectedContactIds.length === contacts.length ? "Clear all" : "Select all"}
                  </button>
                </div>
                <div className="grid sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                  {contacts.map((c) => {
                    const selected = selectedContactIds.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        onClick={() => toggleContactSelection(c.id)}
                        className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-colors ${
                          selected ? "bg-blue-50 border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/30" : "bg-slate-50/70 border-slate-100 hover:border-slate-200 dark:bg-slate-800/40 dark:border-slate-800"
                        }`}
                      >
                        <div className={`h-8 w-8 rounded-md ${c.color} text-white flex items-center justify-center text-[10px] font-semibold shrink-0`}>{c.initial}</div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] font-medium text-slate-900 dark:text-white truncate">{c.name}</p>
                          <p className="text-[10px] text-slate-400 truncate">{c.role}</p>
                        </div>
                        <div className={`h-4 w-4 rounded flex items-center justify-center shrink-0 border ${selected ? "bg-blue-600 border-blue-600" : "border-slate-300"}`}>
                          {selected && <Check size={11} className="text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Channels */}
              <div className="space-y-2.5">
                <FieldLabel>Send Via</FieldLabel>
                <div className="flex items-center gap-2 flex-wrap">
                  {(["Email", "SMS", "WhatsApp"] as Channel[]).map((ch) => (
                    <ChannelPill key={ch} channel={ch} active={selectedChannels.includes(ch)} onClick={() => toggleChannel(ch)} />
                  ))}
                </div>
              </div>

              {/* Message preview */}
              <div className="space-y-1.5">
                <FieldLabel>Message</FieldLabel>
                <textarea value={notifyMessage} onChange={(e) => setNotifyMessage(e.target.value)} rows={3} className={`${inputClass} resize-none`} />
              </div>

              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  onClick={closeNotifyModal}
                  className="px-5 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-600 text-[12px] font-medium hover:bg-slate-50 transition-colors dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={sendNotifications}
                  disabled={sending}
                  className="px-5 py-2.5 rounded-lg bg-blue-600 text-white text-[12px] font-medium hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-60"
                >
                  <Send size={13} /> {sending ? "Sending..." : "Send Notification"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================ ADD/EDIT CONTACT MODAL ============================ */}
      {isAddContactModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsAddContactModalOpen(false)} />
          <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl animate-in zoom-in-95 duration-150 dark:bg-slate-900">
            <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-10">
              <div className="flex items-center gap-3.5">
                <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 dark:bg-blue-500/10">
                  <UserPlus size={18} />
                </div>
                <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">{editingContactId ? "Edit Contact" : "Add Contact"}</h3>
              </div>
              <button onClick={() => setIsAddContactModalOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors dark:hover:bg-slate-800">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-6">
              <div className="grid sm:grid-cols-2 gap-4 sm:gap-5">
                <div className="space-y-1.5">
                  <FieldLabel>Full Name *</FieldLabel>
                  <input type="text" value={contactForm.name} onChange={(e) => setContactForm((f) => ({ ...f, name: e.target.value }))} placeholder="John Smith" className={inputClass} />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Role / Title</FieldLabel>
                  <input type="text" value={contactForm.role} onChange={(e) => setContactForm((f) => ({ ...f, role: e.target.value }))} placeholder="Fleet Manager" className={inputClass} />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4 sm:gap-5">
                <div className="space-y-1.5">
                  <FieldLabel>Email Address *</FieldLabel>
                  <input type="email" value={contactForm.email} onChange={(e) => setContactForm((f) => ({ ...f, email: e.target.value }))} placeholder="john@ckijgroup.co.za" className={inputClass} />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Mobile / WhatsApp</FieldLabel>
                  <input type="text" value={contactForm.phone} onChange={(e) => setContactForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+27 82 000 0000" className={inputClass} />
                </div>
              </div>

              <div className="space-y-2.5">
                <FieldLabel>Alert Channels</FieldLabel>
                <div className="flex items-center gap-2 flex-wrap">
                  {(["Email", "SMS", "WhatsApp"] as Channel[]).map((ch) => (
                    <ChannelPill key={ch} channel={ch} active={contactForm.channels.includes(ch)} onClick={() => toggleFormChannel(ch)} />
                  ))}
                </div>
              </div>

              <div className="space-y-2.5">
                <FieldLabel>Receive Alerts For</FieldLabel>
                <div className="flex items-center gap-2 flex-wrap">
                  {(["Critical", "Warning", "Info"] as Severity[]).map((sv) => {
                    const active = contactForm.severities.includes(sv);
                    const activeClasses =
                      sv === "Critical" ? "bg-red-50 border-red-100 text-red-700" : sv === "Warning" ? "bg-amber-50 border-amber-100 text-amber-700" : "bg-blue-50 border-blue-100 text-blue-700";
                    return (
                      <button
                        key={sv}
                        type="button"
                        onClick={() => toggleFormSeverity(sv)}
                        className={`px-3.5 py-2 rounded-lg text-[11px] font-medium border transition-colors ${active ? activeClasses : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"}`}
                      >
                        {sv}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <FieldLabel>Status</FieldLabel>
                <div className="relative">
                  <select value={contactForm.status} onChange={(e) => setContactForm((f) => ({ ...f, status: e.target.value as "Active" | "Inactive" }))} className={selectClass}>
                    <option>Active</option>
                    <option>Inactive</option>
                  </select>
                  <ChevronDown size={13} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setIsAddContactModalOpen(false)}
                  className="px-5 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-600 text-[12px] font-medium hover:bg-slate-50 transition-colors dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                >
                  Cancel
                </button>
                <button onClick={saveContact} className="px-5 py-2.5 rounded-lg bg-blue-600 text-white text-[12px] font-medium hover:bg-blue-700 transition-colors shadow-sm">
                  {editingContactId ? "Update Contact" : "Save Contact"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================ ADD/EDIT RULE MODAL ============================ */}
      {isAddRuleModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsAddRuleModalOpen(false)} />
          <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl animate-in zoom-in-95 duration-150 dark:bg-slate-900">
            <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-10">
              <div className="flex items-center gap-3.5">
                <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 dark:bg-blue-500/10">
                  <Settings2 size={18} />
                </div>
                <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">{editingRuleId ? "Edit Alert Rule" : "Add Alert Rule"}</h3>
              </div>
              <button onClick={() => setIsAddRuleModalOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors dark:hover:bg-slate-800">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-6">
              <div className="grid sm:grid-cols-2 gap-4 sm:gap-5">
                <div className="space-y-1.5">
                  <FieldLabel>Rule Name *</FieldLabel>
                  <input type="text" value={ruleForm.name} onChange={(e) => setRuleForm((f) => ({ ...f, name: e.target.value }))} placeholder="Critical Tyre Alert" className={inputClass} />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Trigger Type *</FieldLabel>
                  <div className="relative">
                    <select value={ruleForm.triggerType} onChange={(e) => setRuleForm((f) => ({ ...f, triggerType: e.target.value as AlertRule["triggerType"] }))} className={selectClass}>
                      <option>Remaining Life %</option>
                      <option>Remaining Hours</option>
                      <option>Condition Level</option>
                    </select>
                    <ChevronDown size={13} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4 sm:gap-5">
                <div className="space-y-1.5">
                  <FieldLabel>Threshold Value *</FieldLabel>
                  <input type="text" value={ruleForm.threshold} onChange={(e) => setRuleForm((f) => ({ ...f, threshold: e.target.value }))} placeholder="e.g. 10" className={inputClass} />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Comparator</FieldLabel>
                  <div className="relative">
                    <select value={ruleForm.comparator} onChange={(e) => setRuleForm((f) => ({ ...f, comparator: e.target.value as AlertRule["comparator"] }))} className={selectClass}>
                      <option value="<=">≤ Less than or equal</option>
                      <option value=">=">≥ Greater than or equal</option>
                    </select>
                    <ChevronDown size={13} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4 sm:gap-5">
                <div className="space-y-1.5">
                  <FieldLabel>Category Filter</FieldLabel>
                  <div className="relative">
                    <select value={ruleForm.category} onChange={(e) => setRuleForm((f) => ({ ...f, category: e.target.value }))} className={selectClass}>
                      <option>All categories</option>
                      <option>Tyre</option>
                      <option>Engine</option>
                      <option>Ground Engaging</option>
                      <option>Structural / Wear</option>
                    </select>
                    <ChevronDown size={13} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Severity Level</FieldLabel>
                  <div className="relative">
                    <select value={ruleForm.severity} onChange={(e) => setRuleForm((f) => ({ ...f, severity: e.target.value as Severity }))} className={selectClass}>
                      <option>Critical</option>
                      <option>Warning</option>
                      <option>Info</option>
                    </select>
                    <ChevronDown size={13} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <FieldLabel>Rule Status</FieldLabel>
                <div className="relative">
                  <select value={ruleForm.status} onChange={(e) => setRuleForm((f) => ({ ...f, status: e.target.value as "Active" | "Inactive" }))} className={selectClass}>
                    <option>Active</option>
                    <option>Inactive</option>
                  </select>
                  <ChevronDown size={13} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setIsAddRuleModalOpen(false)}
                  className="px-5 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-600 text-[12px] font-medium hover:bg-slate-50 transition-colors dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                >
                  Cancel
                </button>
                <button onClick={saveRule} className="px-5 py-2.5 rounded-lg bg-blue-600 text-white text-[12px] font-medium hover:bg-blue-700 transition-colors shadow-sm">
                  {editingRuleId ? "Update Rule" : "Save Rule"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}