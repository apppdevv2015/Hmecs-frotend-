import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  ClipboardList,
  Search,
  Plus,
  ChevronDown,
  RefreshCcw,
  X,
  Download,
  Loader2,
  Trash2,
  Pencil,
  Calendar,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { userService } from "../../services/userService";
import { machineService } from "../../services/companyadmin/machineService";
import { componentService } from "../../services/companyadmin/componentService";
import { maintenanceService } from "../../services/companyadmin/maintenanceService";

type MaintenanceStatus = "Open" | "Closed";

export type MaintenanceEvent = {
  id?: string | number;
  date: string;
  machine: string;
  component: string;
  technician: string;
  work: string;
  cost: string;
  downtime: string;
  status: MaintenanceStatus;
  dueDate?: string;
};

type MaintenanceLogProps = {
  fetchEvents?: () => Promise<MaintenanceEvent[]>;
  onCreateEvent?: (data: MaintenanceEvent) => Promise<MaintenanceEvent>;
  initialEvents?: MaintenanceEvent[];
};

// Dynamic events will be generated on runtime based on DB records

const PAGE_SIZE_OPTIONS = [5, 10, 20];

const emptyForm: MaintenanceEvent = {
  date: new Date().toISOString().split("T")[0],
  machine: "",
  component: "",
  technician: "",
  work: "",
  cost: "",
  downtime: "",
  status: "Open",
  dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
};

const getNumberFromText = (value: string) => {
  const match = value.replace(/,/g, "").match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : 0;
};

const formatCost = (amount: number) => {
  return `R ${amount.toLocaleString("en-ZA")}`;
};

export default function MaintenanceLog({
  fetchEvents,
  onCreateEvent,
  initialEvents,
}: MaintenanceLogProps) {
  const [events, setEvents] = useState<MaintenanceEvent[]>(() => {
    try {
      const saved = localStorage.getItem("hme_maintenance_events");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // If the saved events contain the old dummy technician names, ignore them completely!
          const isDummy = parsed.some(
            (e) =>
              e.technician === "T. Dlamini" ||
              e.technician === "S. Mokoena" ||
              e.technician === "P. Khumalo" ||
              e.technician === "N. Zulu",
          );
          if (!isDummy) {
            return parsed;
          }
        }
      }
    } catch (err) {
      console.error("Failed to parse hme_maintenance_events", err);
    }
    return [];
  });

  const [engineers, setEngineers] = useState<string[]>([]);
  const [dbMachines, setDbMachines] = useState<any[]>([]);
  const [dbComponents, setDbComponents] = useState<any[]>([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTechnician, setSelectedTechnician] = useState("All Technicians");
  const [selectedStatus, setSelectedStatus] = useState("All Status");
  const [selectedMachine, setSelectedMachine] = useState("All Machines");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<MaintenanceEvent>(emptyForm);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<MaintenanceEvent | null>(null);
  const [editForm, setEditForm] = useState<MaintenanceEvent>(emptyForm);

  const loadEvents = async () => {
    try {
      setIsLoading(true);
      setError("");

      const res = await maintenanceService.getLogs();
      const logsArray = Array.isArray(res) ? res : res?.data || [];

      const mappedLogs = logsArray.map((log: any) => ({
        id: log.id,
        date: log.date ? log.date.split("T")[0] : "",
        machine: log.machine?.name || "N/A",
        component: log.component?.description || log.component?.category || "General Maintenance",
        technician: log.technician || "Unknown",
        work: log.work,
        cost: typeof log.cost === "number" ? `R ${log.cost.toLocaleString()}` : String(log.cost),
        downtime: log.downtime,
        status: log.status === "Closed" || log.status === "Open" ? log.status : "Open",
      }));

      setEvents(mappedLogs);
    } catch (err) {
      console.error(err);
      setError("Failed to load maintenance logs from the database.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteEntry = async (id: string | number) => {
    if (!window.confirm("Are you sure you want to delete this maintenance log?")) return;
    try {
      setIsLoading(true);
      await maintenanceService.deleteLog(String(id));
      toast.success("Maintenance log deleted successfully");
      await loadEvents();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete maintenance log");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (item: MaintenanceEvent) => {
    try {
      const newStatus: MaintenanceStatus = item.status === "Closed" ? "Open" : "Closed";
      await maintenanceService.updateLog(String(item.id), { status: newStatus });
      toast.success(`Status marked as ${newStatus}`);
      await loadEvents();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update status");
    }
  };

  useEffect(() => {
    async function loadDynamicDropdowns() {
      try {
        // Fetch all users scoped to the logged-in company admin's company
        const userRes = (await userService.getUsers({ limit: 1000 })) as any;
        let usersList: any[] = [];
        if (Array.isArray(userRes)) {
          usersList = userRes;
        } else if (userRes) {
          usersList = userRes.users || userRes.results || userRes.data || [];
          if (userRes.data && !Array.isArray(userRes.data) && Array.isArray(userRes.data.users)) {
            usersList = userRes.data.users;
          }
        }

        const filteredEngineers = usersList
          .filter((u: any) => {
            const roleName =
              (typeof u.role === "object" ? u.role?.name : u.role_name || u.role) || "";
            return roleName.toLowerCase() === "engineer" || roleName.toLowerCase() === "mechanic";
          })
          .map((u: any) => {
            const first = u.firstName || u.first_name || u.fname || "";
            const last = u.lastName || u.last_name || u.lname || "";
            return `${first} ${last}`.trim() || u.name || "Unknown Engineer";
          });

        setEngineers(filteredEngineers);

        const machineRes = (await machineService.getMachines()) as any;
        const machinesList = Array.isArray(machineRes) ? machineRes : machineRes?.data || [];
        setDbMachines(machinesList);

        const componentRes = (await componentService.getComponents()) as any;
        const componentsList = Array.isArray(componentRes)
          ? componentRes
          : componentRes?.data || [];
        setDbComponents(componentsList);

        // No sample data generation, only loading real DB dropdown options
      } catch (err) {
        console.error("Failed to load dynamic dropdown options", err);
      }
    }

    loadDynamicDropdowns();
    loadEvents();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, selectedTechnician, selectedStatus, selectedMachine, pageSize]);

  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isModalOpen]);

  const availableFormComponents = useMemo(() => {
    if (!form.machine) return [];
    const selectedMachineObj = dbMachines.find((m) => m.name === form.machine);
    if (!selectedMachineObj) return [];
    return dbComponents.filter((c) => c.machineId === selectedMachineObj.id);
  }, [form.machine, dbMachines, dbComponents]);

  const technicians = useMemo(() => {
    return ["All Technicians", ...Array.from(new Set(events.map((e) => e.technician)))];
  }, [events]);

  const machines = useMemo(() => {
    return ["All Machines", ...Array.from(new Set(events.map((e) => e.machine)))];
  }, [events]);

  const filteredEvents = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return events.filter((item) => {
      const matchesSearch =
        !query ||
        item.date.toLowerCase().includes(query) ||
        item.machine.toLowerCase().includes(query) ||
        item.component.toLowerCase().includes(query) ||
        item.technician.toLowerCase().includes(query) ||
        item.work.toLowerCase().includes(query) ||
        item.cost.toLowerCase().includes(query) ||
        item.downtime.toLowerCase().includes(query) ||
        item.status.toLowerCase().includes(query);

      const matchesTechnician =
        selectedTechnician === "All Technicians" || item.technician === selectedTechnician;

      const matchesStatus = selectedStatus === "All Status" || item.status === selectedStatus;

      const matchesMachine = selectedMachine === "All Machines" || item.machine === selectedMachine;

      return matchesSearch && matchesTechnician && matchesStatus && matchesMachine;
    });
  }, [events, searchTerm, selectedTechnician, selectedStatus, selectedMachine]);

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / pageSize));

  const paginatedEvents = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredEvents.slice(start, start + pageSize);
  }, [filteredEvents, page, pageSize]);

  const totalCost = useMemo(() => {
    return filteredEvents.reduce((sum, item) => sum + getNumberFromText(item.cost), 0);
  }, [filteredEvents]);

  const totalDowntime = useMemo(() => {
    return filteredEvents.reduce((sum, item) => sum + getNumberFromText(item.downtime), 0);
  }, [filteredEvents]);

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedTechnician("All Technicians");
    setSelectedStatus("All Status");
    setSelectedMachine("All Machines");
    setPage(1);
  };

  const exportCSV = () => {
    const headers = [
      "Date",
      "Machine",
      "Component",
      "Technician",
      "Work Performed",
      "Cost",
      "Downtime",
      "Status",
    ];

    const rows = filteredEvents.map((item) => [
      item.date,
      item.machine,
      item.component,
      item.technician,
      item.work,
      item.cost,
      item.downtime,
      item.status,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "maintenance-log.csv";
    link.click();

    URL.revokeObjectURL(url);
  };

  const openCreateModal = () => {
    setError("");
    setForm(emptyForm);
    setIsModalOpen(true);
  };

  const closeCreateModal = () => {
    if (isCreating) return;

    setIsModalOpen(false);
    setForm(emptyForm);
    setError("");
  };

  const handleCreateEntry = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!form.machine || !form.component || !form.technician || !form.work) {
      setError("Please fill all required fields.");
      return;
    }

    try {
      setIsCreating(true);
      setError("");

      const selectedMachineObj = dbMachines.find((m) => m.name === form.machine);
      const selectedComponentObj = dbComponents.find(
        (c) => (c.description || c.category) === form.component,
      );

      if (!selectedMachineObj) {
        throw new Error("Invalid machine selection. Please select a valid machine from the list.");
      }

      await maintenanceService.createLog({
        machineId: selectedMachineObj.id,
        componentId: selectedComponentObj?.id || null,
        technician: form.technician,
        date: new Date().toISOString().split("T")[0], // Dynamically catch today's date on submission!
        work: form.work,
        cost: getNumberFromText(form.cost),
        downtime:
          form.status === "Open"
            ? form.dueDate ||
              new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
            : form.downtime || "0 hrs",
        status: form.status,
      });

      toast.success("Maintenance entry created successfully");
      await loadEvents();
      setForm(emptyForm);
      setIsModalOpen(false);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to create maintenance entry.");
    } finally {
      setIsCreating(false);
    }
  };

  const openEditModal = (item: MaintenanceEvent) => {
    setError("");
    setEditingEvent(item);
    setEditForm({
      ...item,
      cost: item.cost ? String(item.cost).replace(/[^\d.]/g, "") : "",
      downtime: item.downtime ? String(item.downtime).replace(/[^\d.]/g, "") : "",
    });
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    if (isCreating) return;
    setIsEditModalOpen(false);
    setEditingEvent(null);
    setEditForm(emptyForm);
    setError("");
  };

  const handleUpdateEntry = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!editForm.machine || !editForm.component || !editForm.technician || !editForm.work) {
      setError("Please fill all required fields.");
      return;
    }

    try {
      setIsCreating(true);
      setError("");

      const selectedMachineObj = dbMachines.find((m) => m.name === editForm.machine);
      const selectedComponentObj = dbComponents.find(
        (c) => (c.description || c.category) === editForm.component,
      );

      if (!selectedMachineObj) {
        throw new Error("Invalid machine selection. Please select a valid machine from the list.");
      }

      await maintenanceService.updateLog(String(editingEvent?.id), {
        machineId: selectedMachineObj.id,
        componentId: selectedComponentObj?.id || null,
        technician: editForm.technician,
        work: editForm.work,
        cost: getNumberFromText(editForm.cost),
        downtime:
          editForm.status === "Open"
            ? editForm.dueDate ||
              new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
            : editForm.downtime || "0 hrs",
        status: editForm.status,
      });

      toast.success("Maintenance entry updated successfully");
      await loadEvents();
      setIsEditModalOpen(false);
      setEditingEvent(null);
      setEditForm(emptyForm);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to update maintenance entry.");
    } finally {
      setIsCreating(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl dark:bg-slate-800">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              New Maintenance Entry
            </h2>
            <p className="text-xs font-bold text-slate-400">Add a new maintenance log record.</p>
          </div>

          <button
            type="button"
            onClick={closeCreateModal}
            disabled={isCreating}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-slate-700 dark:hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-xs font-bold text-red-600 dark:border-red-500/20 dark:bg-red-500/10">
            {error}
          </div>
        )}

        <form onSubmit={handleCreateEntry} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="flex flex-col">
            <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
              Machine
            </span>
            <select
              value={form.machine}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, machine: e.target.value, component: "" }))
              }
              className="w-full rounded-2xl border border-slate-100 bg-white px-4 py-3.5 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-purple-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <option value="">Select Machine</option>
              {dbMachines.map((m) => (
                <option key={m.id} value={m.name}>
                  {m.name} ({m.model})
                </option>
              ))}
              {dbMachines.length === 0 && (
                <option disabled>No machines found. Please register a machine first.</option>
              )}
            </select>
          </label>

          <label className="flex flex-col">
            <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
              Component
            </span>
            <select
              value={form.component}
              onChange={(e) => setForm((prev) => ({ ...prev, component: e.target.value }))}
              disabled={!form.machine}
              className="w-full rounded-2xl border border-slate-100 bg-white px-4 py-3.5 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-purple-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">
                {!form.machine ? "Select a machine first" : "Select Component"}
              </option>
              {availableFormComponents.map((c) => (
                <option key={c.id} value={c.description || c.category}>
                  {c.description || c.category} ({c.serialNumber})
                </option>
              ))}
              {form.machine && availableFormComponents.length === 0 && (
                <option disabled>No components registered on this machine.</option>
              )}
            </select>
          </label>

          <label className="flex flex-col">
            <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
              Technician (Engineer)
            </span>
            <select
              value={form.technician}
              onChange={(e) => setForm((prev) => ({ ...prev, technician: e.target.value }))}
              className="w-full rounded-2xl border border-slate-100 bg-white px-4 py-3.5 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-purple-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <option value="">Select Technician</option>
              {engineers.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
              {engineers.length === 0 && (
                <option disabled>
                  No engineers found. Please register staff with role 'Engineer' first.
                </option>
              )}
            </select>
          </label>

          <FormInput
            label="Cost"
            value={form.cost}
            placeholder="R 8 500"
            onChange={(value) => setForm((prev) => ({ ...prev, cost: value }))}
          />

          {form.status === "Open" ? (
            <label className="flex flex-col">
              <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                Due Date
              </span>
              <div
                onClick={(e) => {
                  const input = e.currentTarget.querySelector('input[type="date"]');
                  if (input && typeof (input as any).showPicker === "function") {
                    try {
                      (input as any).showPicker();
                    } catch (err) {}
                  }
                }}
                className="relative flex items-center cursor-pointer"
              >
                <Calendar
                  size={16}
                  className="absolute left-4 text-slate-400 pointer-events-none"
                />
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm((prev) => ({ ...prev, dueDate: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-100 bg-white pl-11 pr-4 py-3.5 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-purple-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white cursor-pointer"
                />
              </div>
            </label>
          ) : (
            <FormInput
              label="Downtime"
              value={form.downtime}
              placeholder="6 hrs"
              onChange={(value) => setForm((prev) => ({ ...prev, downtime: value }))}
            />
          )}

          <label className="md:col-span-2">
            <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
              Status
            </span>

            <select
              value={form.status}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  status: e.target.value as MaintenanceStatus,
                }))
              }
              className="w-full rounded-2xl border border-slate-100 bg-white px-4 py-3 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-purple-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <option value="Open">Open</option>
              <option value="Closed">Closed</option>
            </select>
          </label>

          <label className="md:col-span-2">
            <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
              Work Performed
            </span>

            <textarea
              value={form.work}
              onChange={(e) => setForm((prev) => ({ ...prev, work: e.target.value }))}
              rows={4}
              placeholder="Write maintenance work details..."
              className="w-full resize-none rounded-2xl border border-slate-100 bg-white px-4 py-3 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-purple-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </label>

          <div className="mt-3 flex justify-end gap-3 md:col-span-2">
            <button
              type="button"
              onClick={closeCreateModal}
              disabled={isCreating}
              className="rounded-2xl border border-slate-200 px-6 py-3 text-xs font-black text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isCreating}
              className="flex items-center gap-2 rounded-2xl bg-orange-500 px-6 py-3 text-xs font-black text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCreating && <Loader2 size={15} className="animate-spin" />}
              Save Entry
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // Dynamically filter components list in the edit form based on currently selected machine!
  const availableEditFormComponents = useMemo(() => {
    if (!editForm.machine) return [];
    const selectedMachineObj = dbMachines.find((m) => m.name === editForm.machine);
    if (!selectedMachineObj) return [];
    return dbComponents.filter((c) => c.machineId === selectedMachineObj.id);
  }, [editForm.machine, dbMachines, dbComponents]);

  const editModalContent = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl dark:bg-slate-800">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              Edit Maintenance Entry
            </h2>
            <p className="text-xs font-bold text-slate-400">
              Update details for this maintenance log.
            </p>
          </div>

          <button
            type="button"
            onClick={closeEditModal}
            disabled={isCreating}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-slate-700 dark:hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-xs font-bold text-red-600 dark:border-red-500/20 dark:bg-red-500/10">
            {error}
          </div>
        )}

        <form onSubmit={handleUpdateEntry} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="flex flex-col">
            <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
              Machine
            </span>
            <select
              value={editForm.machine}
              onChange={(e) =>
                setEditForm((prev) => ({ ...prev, machine: e.target.value, component: "" }))
              }
              className="w-full rounded-2xl border border-slate-100 bg-white px-4 py-3.5 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-purple-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <option value="">Select Machine</option>
              {dbMachines.map((m) => (
                <option key={m.id} value={m.name}>
                  {m.name} ({m.model})
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col">
            <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
              Component
            </span>
            <select
              value={editForm.component}
              onChange={(e) => setEditForm((prev) => ({ ...prev, component: e.target.value }))}
              disabled={!editForm.machine}
              className="w-full rounded-2xl border border-slate-100 bg-white px-4 py-3.5 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-purple-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">
                {!editForm.machine ? "Select a machine first" : "Select Component"}
              </option>
              {availableEditFormComponents.map((c) => (
                <option key={c.id} value={c.description || c.category}>
                  {c.description || c.category} ({c.serialNumber})
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col">
            <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
              Technician (Engineer)
            </span>
            <select
              value={editForm.technician}
              onChange={(e) => setEditForm((prev) => ({ ...prev, technician: e.target.value }))}
              className="w-full rounded-2xl border border-slate-100 bg-white px-4 py-3.5 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-purple-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <option value="">Select Technician</option>
              {engineers.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>

          <FormInput
            label="Cost"
            value={editForm.cost}
            placeholder="R 8 500"
            onChange={(value) => setEditForm((prev) => ({ ...prev, cost: value }))}
          />

          {editForm.status === "Open" ? (
            <label className="flex flex-col">
              <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                Due Date
              </span>
              <div
                onClick={(e) => {
                  const input = e.currentTarget.querySelector('input[type="date"]');
                  if (input && typeof (input as any).showPicker === "function") {
                    try {
                      (input as any).showPicker();
                    } catch (err) {}
                  }
                }}
                className="relative flex items-center cursor-pointer"
              >
                <Calendar
                  size={16}
                  className="absolute left-4 text-slate-400 pointer-events-none"
                />
                <input
                  type="date"
                  value={
                    editForm.dueDate ||
                    (editForm.downtime && editForm.downtime.includes("-") ? editForm.downtime : "")
                  }
                  onChange={(e) => setEditForm((prev) => ({ ...prev, dueDate: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-100 bg-white pl-11 pr-4 py-3.5 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-purple-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white cursor-pointer"
                />
              </div>
            </label>
          ) : (
            <FormInput
              label="Downtime"
              value={editForm.downtime && editForm.downtime.includes("-") ? "" : editForm.downtime}
              placeholder="6 hrs"
              onChange={(value) => setEditForm((prev) => ({ ...prev, downtime: value }))}
            />
          )}

          <label className="md:col-span-2">
            <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
              Status
            </span>

            <select
              value={editForm.status}
              onChange={(e) =>
                setEditForm((prev) => ({
                  ...prev,
                  status: e.target.value as MaintenanceStatus,
                }))
              }
              className="w-full rounded-2xl border border-slate-100 bg-white px-4 py-3 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-purple-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <option value="Open">Open</option>
              <option value="Closed">Closed</option>
            </select>
          </label>

          <label className="md:col-span-2">
            <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
              Work Performed
            </span>

            <textarea
              value={editForm.work}
              onChange={(e) => setEditForm((prev) => ({ ...prev, work: e.target.value }))}
              rows={4}
              placeholder="Write maintenance work details..."
              className="w-full resize-none rounded-2xl border border-slate-100 bg-white px-4 py-3 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-purple-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </label>

          <div className="mt-3 flex justify-end gap-3 md:col-span-2">
            <button
              type="button"
              onClick={closeEditModal}
              disabled={isCreating}
              className="rounded-2xl border border-slate-200 px-6 py-3 text-xs font-black text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isCreating}
              className="flex items-center gap-2 rounded-2xl bg-orange-500 px-6 py-3 text-xs font-black text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCreating && <Loader2 size={15} className="animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8F9FC] p-4 dark:bg-slate-900 lg:p-10">
      <div className="mx-auto max-w-[1600px]">
        <div className="overflow-hidden rounded-[3rem] border border-slate-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex flex-col justify-between gap-6 border-b border-slate-50 p-6 dark:border-slate-700/50 md:flex-row md:items-center lg:p-10">
            <div className="flex items-center gap-5">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50 text-purple-500 dark:bg-purple-500/10">
                <ClipboardList size={28} />
              </div>

              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  Maintenance Log
                </h1>
                <p className="text-xs font-bold tracking-wider text-slate-400">
                  Full service event history across the fleet
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={loadEvents}
                disabled={!fetchEvents || isLoading}
                className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              >
                {isLoading ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <RefreshCcw size={15} />
                )}
                Refresh
              </button>

              <button
                type="button"
                onClick={exportCSV}
                className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-all hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              >
                <Download size={15} />
                Export
              </button>

              <button
                type="button"
                onClick={openCreateModal}
                className="flex items-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-orange-500 dark:bg-orange-500 dark:hover:bg-orange-600"
              >
                <Plus size={16} />
                New Entry
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-4 border-b border-slate-50 bg-[#FBFCFE] px-6 py-6 dark:border-slate-700/50 dark:bg-slate-900/30 lg:flex-row lg:px-10">
            <div className="group relative flex-1">
              <Search
                className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-hover:text-purple-500"
                size={16}
              />

              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search events, components, technicians or machines..."
                className="w-full rounded-2xl border border-slate-100 bg-white py-4 pl-14 pr-10 text-xs font-bold text-slate-900 transition-all placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />

              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-4">
              <SelectBox value={selectedTechnician} onChange={setSelectedTechnician}>
                {technicians.map((tech) => (
                  <option key={tech} value={tech}>
                    {tech}
                  </option>
                ))}
              </SelectBox>

              <SelectBox value={selectedStatus} onChange={setSelectedStatus}>
                <option value="All Status">All Status</option>
                <option value="Open">Open</option>
                <option value="Closed">Closed</option>
              </SelectBox>

              <SelectBox value={selectedMachine} onChange={setSelectedMachine}>
                {machines.map((machine) => (
                  <option key={machine} value={machine}>
                    {machine}
                  </option>
                ))}
              </SelectBox>

              <button
                type="button"
                onClick={resetFilters}
                className="rounded-2xl border border-slate-100 bg-white px-6 py-4 text-xs font-black text-slate-500 transition-all hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                Reset
              </button>
            </div>
          </div>

          {error && !isModalOpen && (
            <div className="mx-6 mt-5 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-xs font-bold text-red-600 dark:border-red-500/20 dark:bg-red-500/10 lg:mx-10">
              {error}
            </div>
          )}

          <div className="relative overflow-x-auto">
            <div className="absolute bottom-0 left-0 top-0 w-1 bg-orange-500" />

            <table className="w-full border-collapse text-left min-w-[1200px]">
              <thead>
                <tr className="bg-[#FBFCFE] dark:bg-slate-900/50">
                  {[
                    "Date",
                    "Machine",
                    "Component",
                    "Technician",
                    "Work Performed",
                    "Cost",
                    "Downtime",
                    "Status",
                    "Actions",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="px-10 py-16 text-center">
                      <div className="flex items-center justify-center gap-3 text-xs font-black uppercase tracking-widest text-slate-400">
                        <Loader2 size={18} className="animate-spin" />
                        Loading maintenance logs...
                      </div>
                    </td>
                  </tr>
                ) : paginatedEvents.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-10 py-16 text-center">
                      <p className="text-sm font-black text-slate-700 dark:text-white">
                        No maintenance logs found
                      </p>
                      <p className="mt-2 text-xs font-bold text-slate-400">
                        Try changing search or filter values.
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedEvents.map((item) => (
                    <tr
                      key={item.id ?? `${item.date}-${item.machine}-${item.component}`}
                      className="group transition-all hover:bg-slate-50/30 dark:hover:bg-slate-900/30"
                    >
                      <td className="px-10 py-7 text-xs font-bold text-slate-400">{item.date}</td>

                      <td className="px-10 py-7 text-xs font-black text-slate-900 dark:text-white">
                        {item.machine}
                      </td>

                      <td className="px-10 py-7 text-xs font-bold text-slate-600 dark:text-slate-300">
                        {item.component}
                      </td>

                      <td className="px-10 py-7 text-xs font-bold text-slate-500">
                        {item.technician}
                      </td>

                      <td className="max-w-md px-10 py-7 text-xs font-medium italic text-slate-500">
                        {item.work}
                      </td>

                      <td className="px-10 py-7 text-xs font-black text-slate-900 dark:text-white">
                        {item.cost}
                      </td>

                      <td className="px-10 py-7 text-xs font-bold text-slate-500">
                        {item.status === "Open" && item.downtime && item.downtime.includes("-") ? (
                          <span className="inline-flex items-center gap-1.5 text-orange-600 dark:text-orange-400 font-extrabold">
                            Due:{" "}
                            {new Date(item.downtime).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        ) : (
                          item.downtime
                        )}
                      </td>

                      <td className="px-10 py-7">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(item)}
                          title="Click to toggle status"
                          className={`rounded-full border-2 px-4 py-1.5 text-[9px] font-black uppercase transition-all hover:scale-105 active:scale-95 ${
                            item.status === "Closed"
                              ? "border-green-100 bg-green-50 text-green-600 dark:border-green-500/20 dark:bg-green-500/10 hover:bg-green-100"
                              : "border-yellow-100 bg-yellow-50 text-yellow-600 dark:border-yellow-500/20 dark:bg-yellow-500/10 hover:bg-yellow-100"
                          }`}
                        >
                          {item.status}
                        </button>
                      </td>

                      <td className="px-10 py-7 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          title="Edit entry"
                          className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all dark:hover:bg-slate-800 dark:hover:text-white"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteEntry(item.id!)}
                          title="Delete entry"
                          className="rounded-xl p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all dark:hover:bg-red-950/30"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col justify-between gap-5 border-t border-slate-50 bg-[#FBFCFE] p-6 dark:border-slate-700/50 dark:bg-slate-900/30 md:flex-row md:items-center lg:p-8">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Showing {paginatedEvents.length} of {filteredEvents.length} maintenance events
              </p>

              <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Page {page} of {totalPages}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Total cost:
                </span>

                <span className="text-sm font-black text-slate-900 dark:text-white">
                  {formatCost(totalCost)}
                </span>
              </div>

              <div className="hidden h-4 w-px bg-slate-200 md:block" />

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Total downtime:
                </span>

                <span className="text-sm font-black text-slate-900 dark:text-white">
                  {totalDowntime} hrs
                </span>
              </div>

              <SelectBox
                value={String(pageSize)}
                onChange={(value) => setPageSize(Number(value))}
                small
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size} / page
                  </option>
                ))}
              </SelectBox>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page === 1}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
                >
                  Prev
                </button>

                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={page === totalPages}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && createPortal(modalContent, document.body)}
      {isEditModalOpen && createPortal(editModalContent, document.body)}
    </div>
  );
}

type SelectBoxProps = {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  small?: boolean;
};

function SelectBox({ value, onChange, children, small = false }: SelectBoxProps) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`appearance-none rounded-2xl border border-slate-100 bg-white font-bold text-slate-900 transition-all focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white ${
          small ? "py-2 pl-4 pr-10 text-xs" : "py-4 pl-6 pr-12 text-xs"
        }`}
      >
        {children}
      </select>

      <ChevronDown
        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
        size={14}
      />
    </div>
  );
}

type FormInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
};

function FormInput({ label, value, onChange, type = "text", placeholder }: FormInputProps) {
  return (
    <label>
      <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
        {label}
      </span>

      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-slate-100 bg-white px-4 py-3 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-purple-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
      />
    </label>
  );
}
