import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Eye,
  Fuel,
  Gauge,
  MapPin,
  Search,
  ShieldAlert,
  Thermometer,
  Truck,
  Wrench,
  X,
} from "lucide-react";

type MachineStatus = "Good" | "Warning" | "Critical";
type RiskLevel = "Good" | "Normal" | "Warning" | "Critical";

type Machine = {
  id: string;
  name: string;
  location: string;
  health: number;
  status: MachineStatus;
  operator: string;
  lastUpdated: string;
  engineTemp: number;
  hydraulicPressure: number;
  tyrePressure: number;
  runtimeHours: number;
};

const initialMachines: Machine[] = [
  {
    id: "MCH-001",
    name: "CAT 777D",
    location: "Site A",
    health: 72,
    status: "Warning",
    operator: "Operator Thabo Mokoena",
    lastUpdated: "10 min ago",
    engineTemp: 96,
    hydraulicPressure: 210,
    tyrePressure: 32,
    runtimeHours: 1280,
  },
  {
    id: "MCH-002",
    name: "Komatsu HD785",
    location: "Site B",
    health: 85,
    status: "Good",
    operator: "Operator Sipho Dlamini",
    lastUpdated: "18 min ago",
    engineTemp: 82,
    hydraulicPressure: 245,
    tyrePressure: 36,
    runtimeHours: 980,
  },
  {
    id: "MCH-003",
    name: "CAT 740B",
    location: "Site C",
    health: 55,
    status: "Critical",
    operator: "Operator Kabelo Ndlovu",
    lastUpdated: "25 min ago",
    engineTemp: 104,
    hydraulicPressure: 180,
    tyrePressure: 24,
    runtimeHours: 1540,
  },
  {
    id: "MCH-004",
    name: "Liebherr T 264",
    location: "Site A",
    health: 20,
    status: "Good",
    operator: "Operator Mandla Khumalo",
    lastUpdated: "30 min ago",
    engineTemp: 79,
    hydraulicPressure: 250,
    tyrePressure: 38,
    runtimeHours: 760,
  },
  {
    id: "MCH-005",
    name: "Volvo A40G",
    location: "Site B",
    health: 50,
    status: "Warning",
    operator: "Operator Sibusiso Nkosi",
    lastUpdated: "45 min ago",
    engineTemp: 91,
    hydraulicPressure: 205,
    tyrePressure: 31,
    runtimeHours: 1125,
  },
  {
    id: "MCH-006",
    name: "Hitachi EH3500",
    location: "Site C",
    health: 90,
    status: "Critical",
    operator: "Operator Themba Naidoo",
    lastUpdated: "1 hour ago",
    engineTemp: 108,
    hydraulicPressure: 170,
    tyrePressure: 22,
    runtimeHours: 1685,
  },
];

const ITEMS_PER_PAGE = 4;

const getRiskLevel = (risk: number): RiskLevel => {
  if (risk <= 25) return "Good";
  if (risk <= 50) return "Normal";
  if (risk <= 75) return "Warning";
  return "Critical";
};

const getRiskStyle = (risk: number) => {
  const level = getRiskLevel(risk);

  if (level === "Good") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300";
  }

  if (level === "Normal") {
    return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300";
  }

  if (level === "Warning") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300";
  }

  return "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300";
};

const getRiskIcon = (risk: number) => {
  const level = getRiskLevel(risk);

  if (level === "Good") return <CheckCircle2 size={15} strokeWidth={2.4} />;
  if (level === "Normal") return <Gauge size={15} strokeWidth={2.4} />;
  if (level === "Warning") return <Wrench size={15} strokeWidth={2.4} />;
  return <AlertTriangle size={15} strokeWidth={2.4} />;
};

const getRiskMessage = (machine: Machine) => {
  const risk = machine.health;
  const level = getRiskLevel(risk);

  if (level === "Good") {
    return {
      title: "Condition good",
      message:
        "Risk is low. Machine can continue operation. Keep monitoring engine temperature, hydraulic pressure, tyre pressure, and fuel usage during the next inspection cycle.",
    };
  }

  if (level === "Normal") {
    return {
      title: "Normal condition, monitor closely",
      message:
        "Machine is usable but needs observation. Fuel efficiency, tyre pressure, or hydraulic load should be checked before long operation.",
    };
  }

  if (level === "Warning") {
    return {
      title: "Warning: maintenance attention required",
      message:
        "Early failure signs detected. If this machine keeps running without inspection, engine overheating, hydraulic leakage, tyre damage, and downtime cost may increase.",
    };
  }

  return {
    title: "Critical risk: stop machine safely",
    message:
      "Stop this machine safely and inspect immediately. Continuing operation can cause engine failure, hydraulic breakdown, tyre burst, high repair cost, and production downtime.",
  };
};

export default function EngineerMachines() {
  const [machines] = useState<Machine[]>(initialMachines);
  const [searchTerm, setSearchTerm] = useState("");
  const [riskFilter, setRiskFilter] = useState<"All" | RiskLevel>("All");
  const [locationFilter, setLocationFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedMachineId, setSelectedMachineId] = useState(initialMachines[0]?.id ?? "");
  const [detailsMachine, setDetailsMachine] = useState<Machine | null>(null);

  const selectedMachine = useMemo(() => {
    return machines.find((machine) => machine.id === selectedMachineId) ?? machines[0] ?? null;
  }, [machines, selectedMachineId]);

  const locations = useMemo(() => {
    return ["All", ...Array.from(new Set(machines.map((machine) => machine.location)))];
  }, [machines]);

  const stats = useMemo(() => {
    return {
      total: machines.length,
      good: machines.filter((machine) => getRiskLevel(machine.health) === "Good").length,
      normal: machines.filter((machine) => getRiskLevel(machine.health) === "Normal").length,
      warning: machines.filter((machine) => getRiskLevel(machine.health) === "Warning").length,
      critical: machines.filter((machine) => getRiskLevel(machine.health) === "Critical").length,
    };
  }, [machines]);

  const averageRisk = useMemo(() => {
    if (machines.length === 0) return 0;

    const totalRisk = machines.reduce(
      (sum, machine) => sum + Number(machine.health || 0),
      0
    );

    return Math.round(totalRisk / machines.length);
  }, [machines]);

  const filteredMachines = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return machines.filter((machine) => {
      const riskLevel = getRiskLevel(machine.health);

      const matchesSearch =
        machine.id.toLowerCase().includes(search) ||
        machine.name.toLowerCase().includes(search) ||
        machine.location.toLowerCase().includes(search) ||
        machine.operator.toLowerCase().includes(search) ||
        riskLevel.toLowerCase().includes(search);

      const matchesRisk = riskFilter === "All" || riskLevel === riskFilter;
      const matchesLocation =
        locationFilter === "All" || machine.location === locationFilter;

      return matchesSearch && matchesRisk && matchesLocation;
    });
  }, [machines, searchTerm, riskFilter, locationFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredMachines.length / ITEMS_PER_PAGE));

  const paginatedMachines = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredMachines.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredMachines, currentPage]);

  const startItem =
    filteredMachines.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;

  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, filteredMachines.length);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleRiskChange = (value: "All" | RiskLevel) => {
    setRiskFilter(value);
    setCurrentPage(1);
  };

  const handleLocationChange = (value: string) => {
    setLocationFilter(value);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setRiskFilter("All");
    setLocationFilter("All");
    setCurrentPage(1);
  };

  const handleSelectMachine = (machineId: string) => {
    setSelectedMachineId(machineId);
  };

  const handleOpenDetails = (machine: Machine) => {
    setSelectedMachineId(machine.id);
    setDetailsMachine(machine);
  };

  const handleCloseDetails = () => {
    setDetailsMachine(null);
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 font-sans text-slate-900 dark:bg-[#07111f] sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
          <div className="border-b border-slate-200 bg-slate-950 px-5 py-5 dark:border-slate-800">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-md border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-blue-200">
                  <ShieldAlert size={14} />
                  Fleet Failure Risk Control
                </div>

                <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                  Assigned Mining Machines
                </h1>

                <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-300">
                  Monitor failure risk, engine heat, hydraulic pressure, tyre pressure, and downtime cost before breakdown occurs.
                </p>
              </div>

              <div className={`rounded-xl border px-5 py-4 ${getRiskStyle(averageRisk)}`}>
                <p className="text-xs font-extrabold uppercase tracking-[0.16em]">
                  Average Fleet Risk
                </p>
                <p className="mt-1 text-2xl font-extrabold">{averageRisk}%</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard
              title="Machines"
              value={stats.total}
              icon={<Truck size={24} strokeWidth={2.4} />}
              className="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300"
            />

            <StatCard
              title="Good"
              value={stats.good}
              icon={<CheckCircle2 size={24} strokeWidth={2.4} />}
              className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
            />

            <StatCard
              title="Normal"
              value={stats.normal}
              icon={<Gauge size={24} strokeWidth={2.4} />}
              className="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300"
            />

            <StatCard
              title="Warning"
              value={stats.warning}
              icon={<Wrench size={24} strokeWidth={2.4} />}
              className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
            />

            <StatCard
              title="Critical"
              value={stats.critical}
              icon={<AlertTriangle size={24} strokeWidth={2.4} />}
              className="border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
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
                placeholder="Search machine, id, site, operator, risk..."
                className="h-12 w-full rounded-lg border border-slate-300 bg-white pl-11 pr-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <select
                value={selectedMachineId}
                onChange={(event) => handleSelectMachine(event.target.value)}
                className="h-12 min-w-[220px] rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
              >
                {machines.map((machine) => (
                  <option key={machine.id} value={machine.id}>
                    {machine.name} - {machine.id}
                  </option>
                ))}
              </select>

              <select
                value={riskFilter}
                onChange={(event) =>
                  handleRiskChange(event.target.value as "All" | RiskLevel)
                }
                className="h-12 min-w-[160px] rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
              >
                <option value="All">All Risk</option>
                <option value="Good">Good</option>
                <option value="Normal">Normal</option>
                <option value="Warning">Warning</option>
                <option value="Critical">Critical</option>
              </select>

              <select
                value={locationFilter}
                onChange={(event) => handleLocationChange(event.target.value)}
                className="h-12 min-w-[150px] rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
              >
                {locations.map((location) => (
                  <option key={location} value={location}>
                    {location === "All" ? "All Sites" : location}
                  </option>
                ))}
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

          {selectedMachine && (
            <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-white/[0.03]">
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.3fr_0.8fr] lg:items-center">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    Selected Machine Overview
                  </p>

                  <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
                      <Truck size={28} strokeWidth={2.4} />
                    </div>

                    <div>
                      <h3 className="text-xl font-extrabold text-slate-950 dark:text-white">
                        {selectedMachine.name}
                      </h3>
                      <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">
                        {selectedMachine.id} • {selectedMachine.location} • {selectedMachine.operator}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                    <MiniMetric
                      icon={<Thermometer size={16} />}
                      label="Engine"
                      value={`${selectedMachine.engineTemp}°C`}
                    />
                    <MiniMetric
                      icon={<Activity size={16} />}
                      label="Hydraulic"
                      value={`${selectedMachine.hydraulicPressure} bar`}
                    />
                    <MiniMetric
                      icon={<Gauge size={16} />}
                      label="Tyre"
                      value={`${selectedMachine.tyrePressure} PSI`}
                    />
                    <MiniMetric
                      icon={<Fuel size={16} />}
                      label="Runtime"
                      value={`${selectedMachine.runtimeHours} hrs`}
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#101f33]">
                  <SemiGauge
                    value={selectedMachine.health}
                    size="lg"
                    label="Selected Machine Risk"
                    animationKey={selectedMachine.id}
                  />
                </div>
              </div>
            </div>
          )}


          {paginatedMachines.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {paginatedMachines.map((machine) => {
                const riskMessage = getRiskMessage(machine);
                const isSelected = selectedMachineId === machine.id;

                return (
                  <div
                    key={machine.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSelectMachine(machine.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") handleSelectMachine(machine.id);
                    }}
                    className={`rounded-xl border p-5 outline-none transition hover:-translate-y-0.5 hover:bg-white hover:shadow-lg dark:hover:bg-[#12243b] ${
                      isSelected
                        ? "border-blue-500 bg-blue-50 shadow-md ring-2 ring-blue-500/20 dark:border-blue-400 dark:bg-blue-500/10"
                        : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-white/[0.03]"
                    }`}
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
                        <Truck size={24} strokeWidth={2.4} />
                      </div>

                      <Badge className={getRiskStyle(machine.health)}>
                        {getRiskIcon(machine.health)}
                        {getRiskLevel(machine.health)}
                      </Badge>
                    </div>

                    <h3 className="text-lg font-extrabold text-slate-950 dark:text-white">
                      {machine.name}
                    </h3>

                    <p className="mt-1 flex items-center gap-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                      <MapPin size={14} strokeWidth={2.4} />
                      {machine.location}
                    </p>

                    <p className="mt-1 text-xs font-extrabold uppercase tracking-[0.12em] text-slate-400">
                      {machine.id}
                    </p>

                    <div className="mt-5 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-[#101f33]">
                      <SemiGauge
                        value={machine.health}
                        size="sm"
                        label="Failure Risk"
                        animationKey={machine.id}
                      />

                      <div className={`mt-4 rounded-lg border p-3 ${getRiskStyle(machine.health)}`}>
                        <div className="flex items-center gap-2">
                          {getRiskIcon(machine.health)}
                          <p className="text-xs font-extrabold uppercase tracking-[0.14em]">
                            {riskMessage.title}
                          </p>
                        </div>

                        <p className="mt-2 text-xs font-semibold leading-5">
                          {riskMessage.message}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <MiniMetric
                        icon={<Thermometer size={16} />}
                        label="Engine"
                        value={`${machine.engineTemp}°C`}
                      />
                      <MiniMetric
                        icon={<Activity size={16} />}
                        label="Hydraulic"
                        value={`${machine.hydraulicPressure} bar`}
                      />
                      <MiniMetric
                        icon={<Gauge size={16} />}
                        label="Tyre"
                        value={`${machine.tyrePressure} PSI`}
                      />
                      <MiniMetric
                        icon={<Fuel size={16} />}
                        label="Runtime"
                        value={`${machine.runtimeHours} hrs`}
                      />
                    </div>

                    <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-[#101f33]">
                      <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-400">
                        Operator
                      </p>
                      <p className="mt-1 text-sm font-extrabold text-slate-700 dark:text-slate-200">
                        {machine.operator}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleOpenDetails(machine);
                      }}
                      className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-blue-200 bg-white px-4 py-3 text-sm font-bold text-blue-700 transition hover:bg-blue-50 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20"
                    >
                      View Details <Eye size={16} strokeWidth={2.4} />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-white/[0.03]">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300">
                <Search size={26} />
              </div>

              <h3 className="mt-4 text-lg font-extrabold text-slate-950 dark:text-white">
                No machines found
              </h3>

              <p className="mt-1 max-w-md text-sm font-medium text-slate-500 dark:text-slate-400">
                No machine matches your current search or filter.
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

          {filteredMachines.length > 0 && (
            <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Showing {startItem}-{endItem} of {filteredMachines.length} machines
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
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
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  className="h-10 rounded-lg border border-slate-300 px-4 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-white/[0.04]"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {detailsMachine && (
        <div className="fixed inset-0 z-[99999999] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
          <div className="relative z-[100000000] max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#0b1728]">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-extrabold tracking-tight text-slate-950 dark:text-white">
                  Machine Risk Details
                </h2>

                <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                  Real-time failure risk, component condition, and maintenance recommendation.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCloseDetails}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/20"
              >
                <X size={18} />
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-white/[0.03]">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
                    <Truck size={28} strokeWidth={2.4} />
                  </div>

                  <div>
                    <h3 className="text-xl font-extrabold text-slate-950 dark:text-white">
                      {detailsMachine.name}
                    </h3>

                    <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">
                      {detailsMachine.id} • {detailsMachine.location}
                    </p>
                  </div>
                </div>

                <Badge className={getRiskStyle(detailsMachine.health)}>
                  {getRiskIcon(detailsMachine.health)}
                  {getRiskLevel(detailsMachine.health)}
                </Badge>
              </div>

              <div className="mt-6 flex justify-center">
                <SemiGauge
                  value={detailsMachine.health}
                  size="lg"
                  label="Failure Risk"
                  animationKey={`modal-${detailsMachine.id}`}
                />
              </div>

              <div className={`mt-5 rounded-xl border p-4 ${getRiskStyle(detailsMachine.health)}`}>
                <div className="flex items-center gap-2">
                  {getRiskIcon(detailsMachine.health)}
                  <h4 className="text-sm font-extrabold uppercase tracking-[0.14em]">
                    {getRiskMessage(detailsMachine).title}
                  </h4>
                </div>

                <p className="mt-2 text-sm font-semibold leading-6">
                  {getRiskMessage(detailsMachine).message}
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InfoBox label="Operator" value={detailsMachine.operator} />
              <InfoBox label="Last Updated" value={detailsMachine.lastUpdated} />
              <InfoBox
                label="Engine Temperature"
                value={`${detailsMachine.engineTemp}°C`}
                icon={<Thermometer size={18} />}
              />
              <InfoBox
                label="Hydraulic Pressure"
                value={`${detailsMachine.hydraulicPressure} bar`}
                icon={<Activity size={18} />}
              />
              <InfoBox
                label="Tyre Pressure"
                value={`${detailsMachine.tyrePressure} PSI`}
                icon={<Gauge size={18} />}
              />
              <InfoBox
                label="Runtime Hours"
                value={`${detailsMachine.runtimeHours} hrs`}
                icon={<Fuel size={18} />}
              />
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={handleCloseDetails}
                className="h-12 rounded-lg bg-blue-600 px-6 text-sm font-bold text-white transition hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SemiGauge({
  value,
  label,
  size = "sm",
  animationKey,
}: {
  value: number;
  label: string;
  size?: "sm" | "lg";
  animationKey?: string;
}) {
  const targetValue = Math.max(0, Math.min(100, Number(value) || 0));
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    setAnimatedValue(0);

    const timer = window.setTimeout(() => {
      setAnimatedValue(targetValue);
    }, 120);

    return () => window.clearTimeout(timer);
  }, [targetValue, animationKey]);

  const cx = 120;
  const cy = 120;
  const radius = 82;

  const needleAngle = -90 + (animatedValue / 100) * 180;
  const needleLength = size === "lg" ? 66 : 60;

  const wrapperClass = size === "lg" ? "w-[280px]" : "w-full max-w-[230px]";
  const valueClass =
    size === "lg" ? "text-3xl font-extrabold" : "text-2xl font-extrabold";

  const polarToCartesian = (
    centerX: number,
    centerY: number,
    r: number,
    angleInDegrees: number
  ) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;

    return {
      x: centerX + r * Math.cos(angleInRadians),
      y: centerY + r * Math.sin(angleInRadians),
    };
  };

  const describeArc = (
    centerX: number,
    centerY: number,
    r: number,
    startAngle: number,
    endAngle: number
  ) => {
    const start = polarToCartesian(centerX, centerY, r, endAngle);
    const end = polarToCartesian(centerX, centerY, r, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

    return [
      "M",
      start.x,
      start.y,
      "A",
      r,
      r,
      0,
      largeArcFlag,
      0,
      end.x,
      end.y,
    ].join(" ");
  };

  const needleRad = ((needleAngle - 90) * Math.PI) / 180;
  const needleX = cx + needleLength * Math.cos(needleRad);
  const needleY = cy + needleLength * Math.sin(needleRad);

  return (
    <div className={`mx-auto ${wrapperClass}`}>
      <svg viewBox="0 0 240 160" className="h-auto w-full overflow-visible">
        {/* Background base */}
        <path
          d={describeArc(cx, cy, radius, -90, 90)}
          fill="none"
          stroke="currentColor"
          strokeWidth="32"
          strokeLinecap="butt"
          className="text-slate-200 dark:text-slate-800"
        />

        {/* Green zone 0 - 50 */}
        <path
          d={describeArc(cx, cy, radius, -90, 0)}
          fill="none"
          stroke="currentColor"
          strokeWidth="32"
          strokeLinecap="butt"
          className="text-emerald-500"
        />

        {/* Yellow zone 50 - 70 */}
        <path
          d={describeArc(cx, cy, radius, 0, 36)}
          fill="none"
          stroke="currentColor"
          strokeWidth="32"
          strokeLinecap="butt"
          className="text-yellow-400"
        />

        {/* Red zone 70 - 100 */}
        <path
          d={describeArc(cx, cy, radius, 36, 90)}
          fill="none"
          stroke="currentColor"
          strokeWidth="32"
          strokeLinecap="butt"
          className="text-red-500"
        />

        {/* Small inner white cut for clean semi gauge look */}
        <path
          d={describeArc(cx, cy, 50, -90, 90)}
          fill="none"
          stroke="currentColor"
          strokeWidth="28"
          strokeLinecap="butt"
          className="text-white dark:text-[#101f33]"
        />

        {/* Tick labels */}
        {[0, 25, 50, 75, 100].map((tick) => {
          const angle = -90 + (tick / 100) * 180;
          const point = polarToCartesian(cx, cy, 108, angle);

          return (
            <text
              key={tick}
              x={point.x}
              y={point.y + 4}
              textAnchor="middle"
              className="fill-slate-600 text-[11px] font-bold dark:fill-slate-300"
            >
              {tick}
            </text>
          );
        })}

        {/* Needle */}
        <g
          style={{
            transition: "all 1100ms cubic-bezier(0.2, 0.9, 0.25, 1)",
          }}
        >
          <line
            x1={cx}
            y1={cy}
            x2={needleX}
            y2={needleY}
            stroke="currentColor"
            strokeWidth="7"
            strokeLinecap="round"
            className="text-slate-700 dark:text-slate-100"
          />

          <circle
            cx={cx}
            cy={cy}
            r="17"
            className="fill-slate-300 dark:fill-slate-700"
          />

          <circle
            cx={cx}
            cy={cy}
            r="7"
            className="fill-slate-700 dark:fill-white"
          />
        </g>
      </svg>

      <div className="-mt-3 text-center">
        <p className={`${valueClass} tracking-tight text-slate-950 dark:text-white`}>
          {targetValue}%
        </p>

        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
          {label}
        </p>
      </div>
    </div>
  );
}

function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number
) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;

  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function StatCard({
  title,
  value,
  icon,
  className,
}: {
  title: string;
  value: number;
  icon: ReactNode;
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

        <div className={`flex h-12 w-12 items-center justify-center rounded-lg border ${className}`}>
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
  children: ReactNode;
  className: string;
}) {
  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.12em] ${className}`}
    >
      {children}
    </span>
  );
}

function MiniMetric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-[#101f33]">
      <div className="mb-1 flex items-center gap-2 text-slate-500 dark:text-slate-400">
        {icon}
        <p className="text-[10px] font-extrabold uppercase tracking-[0.12em]">
          {label}
        </p>
      </div>
      <p className="text-xs font-extrabold text-slate-950 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function InfoBox({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-white/[0.03]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-400">
            {label}
          </p>
          <h4 className="mt-2 text-lg font-extrabold text-slate-950 dark:text-white">
            {value}
          </h4>
        </div>

        {icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}