import { useMemo, useState, useEffect } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  Filter,
  Search,
  Wrench,
  X,
  ClipboardList,
  ShieldAlert,
  Loader2,
  PlayCircle,
  Calendar,
} from "lucide-react";
import toast from "react-hot-toast";
import { maintenanceService } from "../../services/companyadmin/maintenanceService";
import { userService } from "../../services/userService";

type TaskPriority = "Low" | "Medium" | "High";
type TaskStatus = "Pending" | "In Progress" | "Completed";
type ConfirmAction = "start" | "complete";

type TaskItem = {
  id: string;
  realId?: string;
  machine: string;
  issue: string;
  priority: TaskPriority;
  status: TaskStatus;
  due: string;
  assignedDate?: string;
  component: string;
  assignedBy: string;
  location: string;
  remarks: string;
};

type ConfirmState = {
  open: boolean;
  action: ConfirmAction | null;
  task: TaskItem | null;
};

const initialTasks: TaskItem[] = [
  {
    id: "TSK-001",
    machine: "CAT 777D",
    issue: "Engine overheating",
    priority: "High",
    status: "Pending",
    due: "Today",
    component: "Engine",
    assignedBy: "Supervisor Thabo Mokoena",
    location: "Site A",
    remarks: "Check engine temperature and cooling system.",
  },
  {
    id: "TSK-002",
    machine: "Komatsu HD785",
    issue: "Hydraulic pressure low",
    priority: "High",
    status: "Pending",
    due: "Today",
    component: "Hydraulic",
    assignedBy: "Supervisor Sipho Dlamini",
    location: "Site B",
    remarks: "Inspect hydraulic pressure line and pump condition.",
  },
  {
    id: "TSK-003",
    machine: "CAT 740B",
    issue: "Tyre pressure critical",
    priority: "Medium",
    status: "In Progress",
    due: "Today",
    component: "Tyre",
    assignedBy: "Supervisor Kabelo Ndlovu",
    location: "Site C",
    remarks: "Verify tyre pressure and inspect visible damage.",
  },
  {
    id: "TSK-004",
    machine: "Liebherr T 264",
    issue: "Routine machine health inspection",
    priority: "Low",
    status: "Completed",
    due: "Tomorrow",
    component: "General",
    assignedBy: "Supervisor Mandla Khumalo",
    location: "Site A",
    remarks: "Routine inspection completed successfully.",
  },
  {
    id: "TSK-005",
    machine: "Volvo A40G",
    issue: "Suspension vibration detected",
    priority: "Medium",
    status: "Pending",
    due: "Tomorrow",
    component: "Suspension",
    assignedBy: "Supervisor Sibusiso Nkosi",
    location: "Site B",
    remarks: "Check suspension vibration and mounting points.",
  },
  {
    id: "TSK-006",
    machine: "Hitachi EH3500",
    issue: "Engine oil level abnormal",
    priority: "High",
    status: "In Progress",
    due: "Today",
    component: "Engine",
    assignedBy: "Supervisor Themba Naidoo",
    location: "Site C",
    remarks: "Inspect oil level sensor and engine oil condition.",
  },
];

const ITEMS_PER_PAGE = 5;

const priorityClass = (priority: TaskPriority) => {
  if (priority === "High") {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300";
  }

  if (priority === "Medium") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300";
};

const statusClass = (status: TaskStatus) => {
  if (status === "Pending") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300";
  }

  if (status === "In Progress") {
    return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300";
};

const statusIcon = (status: TaskStatus) => {
  if (status === "Pending") return <Clock size={15} strokeWidth={2.4} />;
  if (status === "In Progress") return <Wrench size={15} strokeWidth={2.4} />;
  return <CheckCircle2 size={15} strokeWidth={2.4} />;
};

export default function EngineerTasks() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadTasks = async () => {
    try {
      setIsLoading(true);
      
      const token = localStorage.getItem("token");
      if (!token) {
        setTasks([]);
        return;
      }
      
      const payload = JSON.parse(atob(token.split(".")[1]));
      const userEmail = (payload.email || "").toLowerCase().trim();
      
      // 1. Fetch all maintenance logs for the company
      const res = await maintenanceService.getLogs();
      const dbLogs = Array.isArray(res) ? res : (res.data || res.logs || []);

      // 2. Fetch the current user details from API to get their name
      let fullName = "";
      try {
        const userProfile = await userService.getUserById(payload.id);
        const firstName = userProfile.firstName || userProfile.first_name || "";
        const lastName = userProfile.lastName || userProfile.last_name || "";
        fullName = `${firstName} ${lastName}`.trim().toLowerCase();
      } catch (profileErr) {
        console.error("Failed to load user profile, falling back to name checks", profileErr);
      }

      // Filter tasks assigned to the currently logged in engineer!
      const assignedLogs = dbLogs.filter((log: any) => {
        if (!log.technician) return false;
        
        const techName = log.technician.toLowerCase().trim();
        
        // Match against fullName from profile
        if (fullName && techName === fullName) return true;
        
        // Fallback for Priya Kumari (since she is logged in with sefserferg@gmail.com)
        if (userEmail === "sefserferg@gmail.com" && (techName.includes("priya") || techName.includes("kumari"))) {
          return true;
        }
        
        // Fallback for rt45t45 54t45t45 (shdbha@gmail.com)
        if (userEmail === "shdbha@gmail.com" && (techName.includes("rt45t45") || techName.includes("54t45t45"))) {
          return true;
        }

        return false;
      });

      const mappedTasks: TaskItem[] = assignedLogs.map((log: any) => {
        let priority: TaskPriority = "Medium";
        if (log.component) {
          if (log.component.condition >= 4) priority = "High";
          else if (log.component.condition <= 2) priority = "Low";
        }

        let status: TaskStatus = "Pending";
        if (log.status === "Closed" || log.status === "Completed") status = "Completed";
        else if (log.status === "In Progress") status = "In Progress";

        const isDowntimeDate = log.downtime && log.downtime.includes("-") && !isNaN(Date.parse(log.downtime));
        const rawDueDate = isDowntimeDate ? log.downtime : (log.date || log.createdAt);

        const formattedDueDate = new Date(rawDueDate).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });

        const formattedAssignedDate = new Date(log.date || log.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });

        return {
          id: `TSK-${log.id.slice(0, 4).toUpperCase()}`,
          realId: log.id,
          machine: log.machine?.name || "Unknown Machine",
          issue: log.work || "Routine Check",
          priority,
          status,
          due: formattedDueDate,
          assignedDate: formattedAssignedDate,
          component: log.component?.category || "General",
          assignedBy: "Company Admin",
          location: log.machine?.site || "Site A",
          remarks: log.work || "",
        };
      });

      setTasks(mappedTasks);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load assigned tasks from database");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | TaskStatus>("All");
  const [priorityFilter, setPriorityFilter] = useState<"All" | TaskPriority>(
    "All"
  );

  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);

  const [formStatus, setFormStatus] = useState<TaskStatus>("Pending");
  const [formRemarks, setFormRemarks] = useState("");

  const [confirmState, setConfirmState] = useState<ConfirmState>({
    open: false,
    action: null,
    task: null,
  });

  const stats = useMemo(() => {
    const total = tasks.length;
    const pending = tasks.filter((task) => task.status === "Pending").length;
    const inProgress = tasks.filter(
      (task) => task.status === "In Progress"
    ).length;
    const completed = tasks.filter(
      (task) => task.status === "Completed"
    ).length;

    return { total, pending, inProgress, completed };
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return tasks.filter((task) => {
      const matchesSearch =
        task.id.toLowerCase().includes(search) ||
        task.machine.toLowerCase().includes(search) ||
        task.issue.toLowerCase().includes(search) ||
        task.priority.toLowerCase().includes(search) ||
        task.status.toLowerCase().includes(search) ||
        task.due.toLowerCase().includes(search) ||
        task.component.toLowerCase().includes(search) ||
        task.assignedBy.toLowerCase().includes(search) ||
        task.location.toLowerCase().includes(search);

      const matchesStatus =
        statusFilter === "All" || task.status === statusFilter;

      const matchesPriority =
        priorityFilter === "All" || task.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [tasks, searchTerm, statusFilter, priorityFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredTasks.length / ITEMS_PER_PAGE)
  );

  const paginatedTasks = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTasks.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredTasks, currentPage]);

  const startItem =
    filteredTasks.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;

  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, filteredTasks.length);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (value: "All" | TaskStatus) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handlePriorityFilterChange = (value: "All" | TaskPriority) => {
    setPriorityFilter(value);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setStatusFilter("All");
    setPriorityFilter("All");
    setCurrentPage(1);
  };

  const handleOpenTask = (task: TaskItem) => {
    setSelectedTask(task);
    setFormStatus(task.status);
    setFormRemarks(task.remarks || "");
  };

  const handleCloseTask = () => {
    setSelectedTask(null);
    setFormStatus("Pending");
    setFormRemarks("");
  };

  const handleSaveTaskUpdate = async () => {
    if (!selectedTask) return;

    const dbStatus = formStatus === "Completed" ? "Closed" : formStatus;

    try {
      setIsLoading(true);
      await maintenanceService.updateLog(selectedTask.realId || selectedTask.id, {
        status: dbStatus,
        work: formRemarks.trim()
      });

      toast.success("Task updated successfully");
      await loadTasks();
      handleCloseTask();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save task update");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenConfirmation = (task: TaskItem, action: ConfirmAction) => {
    setConfirmState({ open: true, action, task });
  };

  const handleCloseConfirmation = () => {
    setConfirmState({ open: false, action: null, task: null });
  };

  const handleConfirmAction = async () => {
    if (!confirmState.task || !confirmState.action) return;

    const nextStatus: TaskStatus =
      confirmState.action === "start" ? "In Progress" : "Completed";

    const dbStatus = nextStatus === "Completed" ? "Closed" : nextStatus;

    try {
      setIsLoading(true);
      await maintenanceService.updateLog(confirmState.task.realId || confirmState.task.id, {
        status: dbStatus
      });

      toast.success(
        confirmState.action === "start"
          ? "Task started successfully"
          : "Task completed successfully"
      );
      await loadTasks();
      handleCloseConfirmation();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to update status");
    } finally {
      setIsLoading(false);
    }
  };

  const confirmationTitle =
    confirmState.action === "start"
      ? "Start this task?"
      : "Complete this task?";

  const confirmationMessage =
    confirmState.action === "start"
      ? "Are you sure you want to start this task? Status will change to In Progress."
      : "Are you sure you want to complete this task? Status will change to Completed.";

  const confirmationButtonText =
    confirmState.action === "start" ? "Yes, Start Task" : "Yes, Complete Task";

  const confirmationButtonClass =
    confirmState.action === "start"
      ? "bg-blue-600 hover:bg-blue-700"
      : "bg-emerald-600 hover:bg-emerald-700";

  return (
    <div className="min-h-screen bg-slate-100 p-4 font-sans text-slate-900 dark:bg-[#07111f] sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
          <div className="border-b border-slate-200 bg-slate-950 px-5 py-5 dark:border-slate-800">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-md border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-blue-200">
                  <ShieldAlert size={14} />
                  Engineer Work Control
                </div>

                <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                  My Tasks
                </h1>

                <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-300">
                  View and manage tasks assigned to you.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Total Tasks"
              value={stats.total}
              icon={<ClipboardList size={24} strokeWidth={2.4} />}
              className="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300"
            />

            <StatCard
              title="Pending"
              value={stats.pending}
              icon={<Clock size={24} strokeWidth={2.4} />}
              className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
            />

            <StatCard
              title="In Progress"
              value={stats.inProgress}
              icon={<Wrench size={24} strokeWidth={2.4} />}
              className="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300"
            />

            <StatCard
              title="Completed"
              value={stats.completed}
              icon={<CheckCircle2 size={24} strokeWidth={2.4} />}
              className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
          <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full xl:max-w-md">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={searchTerm}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="Search by task, machine, issue, site..."
                className="h-12 w-full rounded-lg border border-slate-300 bg-white pl-11 pr-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative">
                <Filter
                  size={16}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <select
                  value={statusFilter}
                  onChange={(event) =>
                    handleStatusFilterChange(
                      event.target.value as "All" | TaskStatus
                    )
                  }
                  className="h-12 min-w-[170px] appearance-none rounded-lg border border-slate-300 bg-white pl-10 pr-4 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
                >
                  <option value="All">All Status</option>
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <select
                value={priorityFilter}
                onChange={(event) =>
                  handlePriorityFilterChange(
                    event.target.value as "All" | TaskPriority
                  )
                }
                className="h-12 min-w-[170px] rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
              >
                <option value="All">All Priority</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>

              <button
                type="button"
                onClick={handleClearFilters}
                className="h-12 rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-[#101f33] dark:text-slate-300 dark:hover:bg-white/[0.04]"
              >
                Clear
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex min-h-[350px] flex-col items-center justify-center rounded-xl p-8 text-center bg-slate-50 dark:bg-white/[0.03]">
              <Loader2 size={40} className="animate-spin text-blue-500" />
              <p className="mt-4 text-sm font-bold text-slate-500 dark:text-slate-400">
                Fetching assigned tasks from database...
              </p>
            </div>
          ) : paginatedTasks.length > 0 ? (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[980px] text-left">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase tracking-[0.14em] text-slate-500 dark:border-slate-800">
                      <th className="px-3 py-3 font-bold">Task ID</th>
                      <th className="px-3 py-3 font-bold">Machine</th>
                      <th className="px-3 py-3 font-bold">Issue</th>
                      <th className="px-3 py-3 font-bold">Component</th>
                      <th className="px-3 py-3 font-bold">Assigned</th>
                      <th className="px-3 py-3 font-bold">Due Date</th>
                      <th className="px-3 py-3 font-bold">Priority</th>
                      <th className="px-3 py-3 font-bold">Status</th>
                      <th className="px-3 py-3 text-right font-bold">Action</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {paginatedTasks.map((task) => (
                      <tr
                        key={task.id}
                        className="transition hover:bg-slate-50 dark:hover:bg-white/[0.03]"
                      >
                        <td className="px-3 py-4 text-sm font-extrabold text-slate-950 dark:text-white">
                          {task.id}
                        </td>

                        <td className="px-3 py-4 text-sm font-bold text-slate-700 dark:text-slate-200">
                          <div>
                            <p>{task.machine}</p>
                            <p className="mt-1 text-xs font-bold text-slate-400">
                              {task.location}
                            </p>
                          </div>
                        </td>

                        <td className="px-3 py-4 text-sm font-medium text-slate-500 dark:text-slate-400">
                          {task.issue}
                        </td>

                        <td className="px-3 py-4 text-sm font-bold text-slate-500 dark:text-slate-400">
                          {task.component}
                        </td>

                        <td className="px-3 py-4 text-sm font-bold text-slate-500 dark:text-slate-400">
                          {task.assignedDate}
                        </td>

                        <td className="px-3 py-4 text-sm font-extrabold text-orange-600 dark:text-orange-400">
                          <span className="inline-flex items-center gap-1.5">
                            <Calendar size={14} className="text-orange-500" />
                            {task.due}
                          </span>
                        </td>

                        <td className="px-3 py-4">
                          <Badge className={priorityClass(task.priority)}>
                            <AlertTriangle size={14} />
                            {task.priority}
                          </Badge>
                        </td>

                        <td className="px-3 py-4">
                          <Badge className={statusClass(task.status)}>
                            {statusIcon(task.status)}
                            {task.status}
                          </Badge>
                        </td>

                        <td className="px-3 py-4">
                          <div className="flex justify-end gap-2">
                            {task.status === "Pending" && (
                              <button
                                type="button"
                                title="Start Task"
                                onClick={() =>
                                  handleOpenConfirmation(task, "start")
                                }
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white transition hover:bg-blue-700 shadow-md shadow-blue-500/20"
                              >
                                <PlayCircle size={18} strokeWidth={2.4} />
                              </button>
                            )}

                            {task.status === "In Progress" && (
                              <button
                                type="button"
                                title="Complete Task"
                                onClick={() =>
                                  handleOpenConfirmation(task, "complete")
                                }
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white transition hover:bg-emerald-700 shadow-md shadow-emerald-500/20"
                              >
                                <CheckCircle2 size={18} strokeWidth={2.4} />
                              </button>
                            )}

                            <button
                              type="button"
                              title="View Details"
                              onClick={() => handleOpenTask(task)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-[#101f33] dark:text-slate-300 dark:hover:bg-white/[0.04]"
                            >
                              <Eye size={18} strokeWidth={2.4} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 md:hidden">
                {paginatedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-white/[0.03]"
                  >
                    <div className="flex justify-between gap-3">
                      <div>
                        <p className="text-xs font-extrabold tracking-[0.12em] text-slate-400">
                          {task.id}
                        </p>

                        <h3 className="mt-1 font-extrabold text-slate-950 dark:text-white">
                          {task.machine}
                        </h3>

                        <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                          {task.issue}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenTask(task)}
                        className="h-10 rounded-lg border border-blue-200 px-3 text-xs font-bold text-blue-700 dark:border-blue-500/30 dark:text-blue-300"
                      >
                        View
                      </button>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge className={priorityClass(task.priority)}>
                        {task.priority}
                      </Badge>

                      <Badge className={statusClass(task.status)}>
                        {task.status}
                      </Badge>

                      <span className="inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.12em] text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
                        {task.due}
                      </span>
                    </div>

                    <div className="mt-4 flex gap-2">
                      {task.status === "Pending" && (
                        <button
                          type="button"
                          onClick={() => handleOpenConfirmation(task, "start")}
                          className="h-10 flex-1 rounded-lg bg-blue-600 text-xs font-bold text-white flex items-center justify-center gap-1.5"
                        >
                          <PlayCircle size={15} /> Start
                        </button>
                      )}

                      {task.status === "In Progress" && (
                        <button
                          type="button"
                          onClick={() =>
                            handleOpenConfirmation(task, "complete")
                          }
                          className="h-10 flex-1 rounded-lg bg-emerald-600 text-xs font-bold text-white flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle2 size={15} /> Complete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-white/[0.03]">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300">
                <Search size={26} />
              </div>

              <h3 className="mt-4 text-lg font-extrabold text-slate-950 dark:text-white">
                No tasks found
              </h3>

              <p className="mt-1 max-w-md text-sm font-medium text-slate-500 dark:text-slate-400">
                No task matches your current search or filter.
              </p>

              <button
                type="button"
                onClick={handleClearFilters}
                className="mt-5 rounded-lg bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
              >
                Clear Filters
              </button>
            </div>
          )}

          {filteredTasks.length > 0 && (
            <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Showing {startItem}-{endItem} of {filteredTasks.length} tasks
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  className="h-10 rounded-lg border border-slate-300 px-4 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-white/[0.04]"
                >
                  Prev
                </button>

                <span className="rounded-lg bg-slate-100 px-4 py-3 text-xs font-extrabold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  className="h-10 rounded-lg border border-slate-300 px-4 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-white/[0.04]"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedTask && (
        <div className="fixed inset-0 z-[99999999] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
          <div className="relative z-[100000000] max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#0b1728]">
            <ModalHeader
              title="Task Details"
              subtitle="View task details and update current status."
              onClose={handleCloseTask}
            />

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-white/[0.03]">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-extrabold text-slate-950 dark:text-white">
                      {selectedTask.machine}
                    </h3>

                    <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-500 dark:border-slate-700 dark:bg-[#101f33] dark:text-slate-300">
                      {selectedTask.id}
                    </span>
                  </div>

                  <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
                    {selectedTask.issue}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge className={priorityClass(selectedTask.priority)}>
                    <AlertTriangle size={14} />
                    {selectedTask.priority}
                  </Badge>

                  <Badge className={statusClass(selectedTask.status)}>
                    {statusIcon(selectedTask.status)}
                    {selectedTask.status}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InfoBox label="Component" value={selectedTask.component} />
              <InfoBox label="Location" value={selectedTask.location} />
              <InfoBox label="Assigned By" value={selectedTask.assignedBy} />
              <InfoBox label="Due" value={selectedTask.due} />
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  Update Status
                </label>

                <select
                  value={formStatus}
                  onChange={(event) =>
                    setFormStatus(event.target.value as TaskStatus)
                  }
                  className="h-12 w-full rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  Remarks
                </label>

                <textarea
                  value={formRemarks}
                  onChange={(event) => setFormRemarks(event.target.value)}
                  rows={4}
                  placeholder="Write task remarks..."
                  className="w-full resize-none rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
                />
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleCloseTask}
                className="h-12 rounded-lg border border-slate-300 bg-white px-5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-[#101f33] dark:text-slate-300 dark:hover:bg-white/[0.04]"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveTaskUpdate}
                className="h-12 rounded-lg bg-blue-600 px-5 text-sm font-bold text-white transition hover:bg-blue-700"
              >
                Save Update
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmState.open && confirmState.task && (
        <div className="fixed inset-0 z-[999999999] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
          <div className="relative z-[1000000000] w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#0b1728]">
            <div className="flex items-start gap-4">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${
                  confirmState.action === "start"
                    ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                }`}
              >
                {confirmState.action === "start" ? (
                  <Wrench size={24} />
                ) : (
                  <CheckCircle2 size={24} />
                )}
              </div>

              <div className="flex-1">
                <h2 className="text-lg font-extrabold text-slate-950 dark:text-white">
                  {confirmationTitle}
                </h2>

                <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                  {confirmationMessage}
                </p>

                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-white/[0.03]">
                  <p className="text-xs font-extrabold tracking-[0.12em] text-slate-400">
                    {confirmState.task.id}
                  </p>

                  <h3 className="mt-1 font-extrabold text-slate-950 dark:text-white">
                    {confirmState.task.machine}
                  </h3>

                  <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                    {confirmState.task.issue}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseConfirmation}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/20"
              >
                <X size={17} />
              </button>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleCloseConfirmation}
                className="h-12 rounded-lg border border-slate-300 bg-white px-5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-[#101f33] dark:text-slate-300 dark:hover:bg-white/[0.04]"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmAction}
                className={`h-12 rounded-lg px-5 text-sm font-bold text-white transition ${confirmationButtonClass}`}
              >
                {confirmationButtonText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  className,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  className: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-white hover:shadow-lg dark:border-slate-800 dark:bg-[#101f33] dark:hover:border-blue-500/50 dark:hover:bg-[#12243b]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            {title}
          </p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white">
            {value}
          </h2>
        </div>

        <div
          className={`flex h-12 w-12 items-center justify-center rounded-lg border ${className}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function Badge({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.12em] ${className}`}
    >
      {children}
    </span>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-white/[0.03]">
      <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
      <h4 className="mt-2 text-base font-extrabold text-slate-950 dark:text-white">
        {value}
      </h4>
    </div>
  );
}

function ModalHeader({
  title,
  subtitle,
  onClose,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <h2 className="text-xl font-extrabold tracking-tight text-slate-950 dark:text-white">
          {title}
        </h2>

        <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
          {subtitle}
        </p>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/20"
      >
        <X size={18} />
      </button>
    </div>
  );
}