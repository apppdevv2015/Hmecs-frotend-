import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import type { ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Cpu,
  Eye,
  Gauge,
  Loader2,
  MapPin,
  Search,
  ServerCrash,
  Truck,
  Wrench,
  X,
  Plus,
  Pencil,
} from "lucide-react";

import {
  superAdminMachineService,
  type SuperAdminCompany,
  type SuperAdminMachine,
  type SuperAdminComponent,
} from "../../../services/SuperAdmin/machineService";

import {
  componentService,
  type ComponentPayload,
} from "../../../services/companyadmin/componentService";

type ComponentStatus = "Healthy" | "Warning" | "Critical";

type Company = SuperAdminCompany;
type Machine = SuperAdminMachine;
type MachineComponent = SuperAdminComponent;

const pageSize = 5;

const statusStyles: Record<ComponentStatus, string> = {
  Healthy:
    "bg-green-100 text-green-700 ring-green-200 dark:bg-green-500/15 dark:text-green-300 dark:ring-green-500/30",
  Warning:
    "bg-yellow-100 text-yellow-700 ring-yellow-200 dark:bg-yellow-500/15 dark:text-yellow-300 dark:ring-yellow-500/30",
  Critical:
    "bg-red-100 text-red-700 ring-red-200 dark:bg-red-500/15 dark:text-red-300 dark:ring-red-500/30",
};

type ComponentCategory =
  | "Brake"
  | "Cabin"
  | "Cooling"
  | "Electrical"
  | "Engine"
  | "Hydraulic"
  | "Structural / Wear"
  | "Transmission"
  | "Tyre"
  | "Custom";

const componentCategories: ComponentCategory[] = [
  "Brake",
  "Cabin",
  "Cooling",
  "Electrical",
  "Engine",
  "Hydraulic",
  "Structural / Wear",
  "Transmission",
  "Tyre",
  "Custom",
];

const healthBarStyles = (health: number) => {
  if (health >= 80) return "bg-green-500";
  if (health >= 60) return "bg-yellow-500";
  return "bg-red-500";
};

const clampPercent = (value: number) => {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
};

const normalizeApiArray = <T,>(response: any): T[] => {
  if (Array.isArray(response)) return response;

  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;

  if (Array.isArray(response?.data?.companies)) return response.data.companies;
  if (Array.isArray(response?.data?.machines)) return response.data.machines;
  if (Array.isArray(response?.data?.components)) {
    return response.data.components;
  }

  if (Array.isArray(response?.companies)) return response.companies;
  if (Array.isArray(response?.machines)) return response.machines;
  if (Array.isArray(response?.components)) return response.components;

  if (Array.isArray(response?.result)) return response.result;
  if (Array.isArray(response?.results)) return response.results;
  if (Array.isArray(response?.items)) return response.items;

  return [];
};

const getCompanyName = (company: Company) => {
  return (
    company.companyName ||
    company.company_name ||
    company.name ||
    "Unnamed Company"
  );
};

const getCompanyCode = (company: Company) => {
  return company.companyCode || company.company_code || "Code not available";
};

const getCompanyAdmin = (company: Company) => {
  return company.adminName || company.adminEmail || company.email || "N/A";
};

const getCompanyLocation = (company: Company) => {
  return (company as any).location || "N/A";
};

const getCompanyMachineCount = (company: Company) => {
  return Number(
    (company as any).machineCount ??
      (company as any).machinesCount ??
      (company as any).totalMachines ??
      (company as any).total_machines ??
      (company as any).machine_count ??
      (company as any).machines_count ??
      (company as any).machines?.length ??
      0,
  );
};

const getCompanyComponentCount = (company: Company) => {
  return Number(
    (company as any).componentCount ??
      (company as any).componentsCount ??
      (company as any).totalComponents ??
      (company as any).total_components ??
      (company as any).component_count ??
      (company as any).components_count ??
      (company as any).components?.length ??
      0,
  );
};

const getCompanyCriticalCount = (company: Company) => {
  return Number(
    (company as any).criticalCount ??
      (company as any).critical_count ??
      (company as any).criticalComponents ??
      (company as any).critical_components ??
      (company as any).totalCritical ??
      (company as any).total_critical ??
      0,
  );
};

const getMachineApiId = (machine: Machine) => {
  return String(
    machine.id ||
      (machine as any).machine?.id ||
      (machine as any).machineId ||
      (machine as any).machine_id ||
      "",
  );
};

const getMachineName = (machine: Machine) => {
  return (
    machine.machineName ||
    machine.machine_name ||
    machine.name ||
    "Unnamed Machine"
  );
};

const getMachineCode = (machine: Machine) => {
  return (
    machine.machineCode ||
    machine.machine_code ||
    machine.registration_number ||
    machine.serialNumber ||
    machine.serial_number ||
    "Code not available"
  );
};

const getMachineType = (machine: Machine) => {
  return machine.equipmentType || machine.equipment_type || "N/A";
};

const getMachineLocation = (machine: Machine) => {
  return machine.location || machine.site || "N/A";
};

const getMachineAverageHealth = (machine: Machine) => {
  return clampPercent(
    Number(
      (machine as any).averageHealth ||
        (machine as any).average_health ||
        (machine as any).avgHealth ||
        (machine as any).avg_health ||
        (machine as any).health ||
        (machine as any).health_percentage ||
        (machine as any).overallHealth ||
        (machine as any).overall_health ||
        (machine as any).machineHealth ||
        (machine as any).machine_health ||
        (machine as any).calculatedHealth ||
        (machine as any).calculated_health ||
        (machine as any).healthScore ||
        (machine as any).health_score ||
        0,
    ),
  );
};

const getMachineComponentCount = (machine: Machine) => {
  return Number(
    (machine as any).componentCount ||
      (machine as any).component_count ||
      (machine as any).componentsCount ||
      (machine as any).components_count ||
      (machine as any).totalComponents ||
      (machine as any).total_components ||
      (machine as any).components?.length ||
      0,
  );
};

const getMachineCriticalCount = (machine: Machine) => {
  return Number(
    (machine as any).criticalCount ||
      (machine as any).critical_count ||
      (machine as any).criticalComponents ||
      (machine as any).critical_components ||
      (machine as any).totalCritical ||
      (machine as any).total_critical ||
      0,
  );
};

const getComponentMachineId = (component: MachineComponent) => {
  return String(
    component.machineId ||
      component.machine_id ||
      (component as any).machine?.machineId ||
      (component as any).machine?.machine_id ||
      (component as any).machine?.id ||
      "",
  );
};

const getComponentName = (component: MachineComponent) => {
  return (
    component.componentName ||
    component.component_name ||
    component.name ||
    component.description ||
    "Unnamed Component"
  );
};

const getComponentCategory = (component: MachineComponent) => {
  return (
    component.category || component.component_type || component.type || "N/A"
  );
};

const getComponentCondition = (component: MachineComponent) => {
  return Number(
    (component as any).condition ||
      (component as any).condition_score ||
      (component as any).intelligence?.condition ||
      0,
  );
};

const getHealthFromCondition = (condition: number) => {
  if (!condition) return 0;

  const safeCondition = Math.max(1, Math.min(5, condition));

  return clampPercent((6 - safeCondition) * 20);
};

const getComponentHealth = (component: MachineComponent) => {
  const directHealth = Number(
    component.health ||
      component.health_percentage ||
      component.condition_score ||
      (component as any).healthScore ||
      (component as any).health_score ||
      (component as any).intelligence?.healthScore ||
      (component as any).intelligence?.health ||
      (component as any).calculatedMetrics?.health ||
      (component as any).calculated_metrics?.health ||
      (component as any).metrics?.health ||
      0,
  );

  if (directHealth > 0) return clampPercent(directHealth);

  const riskStatus = String(
    (component as any).intelligence?.riskStatus ||
      (component as any).riskStatus ||
      (component as any).risk_status ||
      "",
  ).toLowerCase();

  if (riskStatus === "healthy" || riskStatus === "good" || riskStatus === "low")
    return 85;

  if (
    riskStatus === "warning" ||
    riskStatus === "medium" ||
    riskStatus === "monitor"
  )
    return 60;

  if (riskStatus === "critical" || riskStatus === "high") return 35;

  return getHealthFromCondition(getComponentCondition(component));
};

const getComponentStatus = (component: MachineComponent): ComponentStatus => {
  const riskStatus = String(
    (component as any).intelligence?.riskStatus ||
      (component as any).riskStatus ||
      (component as any).risk_status ||
      component.status ||
      "",
  ).toLowerCase();

  if (riskStatus === "healthy" || riskStatus === "good" || riskStatus === "low")
    return "Healthy";

  if (
    riskStatus === "warning" ||
    riskStatus === "monitor" ||
    riskStatus === "medium"
  )
    return "Warning";

  if (riskStatus === "critical" || riskStatus === "high") return "Critical";

  const condition = getComponentCondition(component);

  if (condition >= 4) return "Critical";
  if (condition === 3) return "Warning";

  const health = getComponentHealth(component);

  if (health >= 80) return "Healthy";
  if (health >= 60) return "Warning";

  return "Critical";
};

const getRemainingLife = (component: MachineComponent) => {
  const remainingHours =
    (component as any).intelligence?.remainingHours ||
    (component as any).remainingHours ||
    (component as any).remaining_hours;

  if (remainingHours !== undefined && remainingHours !== null) {
    return `${Math.max(0, Number(remainingHours)).toLocaleString()} h`;
  }

  if (component.remainingLife) return component.remainingLife;
  if (component.remaining_life) return component.remaining_life;
  if (component.remaining_life_days)
    return `${component.remaining_life_days} days`;

  const plannedLife = Number(
    (component as any).plannedLife || (component as any).planned_life || 0,
  );
  const currentHours = Number(
    (component as any).currentHours || (component as any).current_hours || 0,
  );
  const installHours = Number(
    (component as any).installHours || (component as any).install_hours || 0,
  );

  if (plannedLife > 0) {
    const usedHours = Math.max(0, currentHours - installHours);
    const remainingHoursCalculated = Math.max(0, plannedLife - usedHours);
    return `${remainingHoursCalculated.toLocaleString()} h`;
  }

  return "N/A";
};

const getTemperature = (component: MachineComponent) => {
  return (
    component.temperature ||
    (component as any).sensorData?.temperature ||
    (component as any).sensor_data?.temperature ||
    "N/A"
  );
};

const getPressure = (component: MachineComponent) => {
  return (
    component.pressure ||
    (component as any).sensorData?.pressure ||
    (component as any).sensor_data?.pressure ||
    "N/A"
  );
};

const getVibration = (component: MachineComponent) => {
  return (
    component.vibration ||
    (component as any).sensorData?.vibration ||
    (component as any).sensor_data?.vibration ||
    "N/A"
  );
};

const getRecommendation = (component: MachineComponent) => {
  return (
    component.recommendation ||
    component.ai_recommendation ||
    (component as any).intelligence?.recommendation ||
    (component as any).intelligence?.riskDriver ||
    (component as any).riskDriver ||
    "No recommendation available."
  );
};

const getSerialNumber = (component: MachineComponent) => {
  return (
    (component as any).serialNumber ||
    (component as any).serial_number ||
    (component as any).serialNo ||
    (component as any).serial_no ||
    "No Serial"
  );
};

const getSupplier = (component: MachineComponent) => {
  return (component as any).supplier || "N/A";
};

const getLifeUsedPercent = (component: MachineComponent) => {
  const apiLifeUsed =
    (component as any).intelligence?.lifeUsedPercent ||
    (component as any).lifeUsedPercent ||
    (component as any).life_used_percent;

  if (apiLifeUsed !== undefined && apiLifeUsed !== null) {
    return clampPercent(Number(apiLifeUsed));
  }

  const plannedLife = Number(
    (component as any).plannedLife || (component as any).planned_life || 0,
  );
  const installHours = Number(
    (component as any).installHours || (component as any).install_hours || 0,
  );
  const currentHours = Number(
    (component as any).currentHours || (component as any).current_hours || 0,
  );

  if (!plannedLife) return 0;

  const usedHours = Math.max(0, currentHours - installHours);
  return clampPercent((usedHours / plannedLife) * 100);
};

const calculateMachineStatsFromComponents = (
  components: MachineComponent[],
) => {
  const totalComponents = components.length;

  if (totalComponents === 0) {
    return {
      componentsCount: 0,
      criticalCount: 0,
      averageHealth: 0,
    };
  }

  const criticalCount = components.filter(
    (component) => getComponentStatus(component) === "Critical",
  ).length;

  const averageHealth = clampPercent(
    components.reduce((total, component) => {
      return total + getComponentHealth(component);
    }, 0) / totalComponents,
  );

  return {
    componentsCount: totalComponents,
    criticalCount,
    averageHealth,
  };
};

export default function SuperAdminComponents() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [components, setComponents] = useState<MachineComponent[]>([]);

  const [machineStats, setMachineStats] = useState<
    Record<
      string,
      {
        componentsCount: number;
        criticalCount: number;
        averageHealth: number;
      }
    >
  >({});

  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [selectedComponent, setSelectedComponent] =
    useState<MachineComponent | null>(null);

  const [editingComponent, setEditingComponent] =
    useState<MachineComponent | null>(null);

  const [isAddComponentOpen, setIsAddComponentOpen] = useState(false);

  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [machinesLoading, setMachinesLoading] = useState(false);
  const [componentsLoading, setComponentsLoading] = useState(false);

  const [companiesError, setCompaniesError] = useState("");
  const [machinesError, setMachinesError] = useState("");
  const [componentsError, setComponentsError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | ComponentStatus>(
    "All",
  );
  const [page, setPage] = useState(1);

  const fetchCompanies = async () => {
    try {
      setCompaniesLoading(true);
      setCompaniesError("");

      const companyList = await superAdminMachineService.getCompanies();
      const normalizedCompanies = normalizeApiArray<Company>(companyList);

      const companiesWithCounts = await Promise.all(
        normalizedCompanies.map(async (company) => {
          try {
            const machineList =
              await superAdminMachineService.getMachinesByCompanyId(company.id);

            const companyMachines = normalizeApiArray<Machine>(machineList);

            let totalComponents = 0;
            let totalCritical = 0;

            await Promise.all(
              companyMachines.map(async (machine) => {
                const machineId = getMachineApiId(machine);

                if (!machineId) return;

                try {
                  const componentList =
                    await superAdminMachineService.getComponentsByMachineId(
                      company.id,
                      machineId,
                    );

                  const machineComponents =
                    normalizeApiArray<MachineComponent>(componentList);

                  const onlyThisMachineComponents = machineComponents.filter(
                    (component) => {
                      const componentMachineId =
                        getComponentMachineId(component);

                      return (
                        !componentMachineId ||
                        String(componentMachineId) === String(machineId)
                      );
                    },
                  );

                  totalComponents += onlyThisMachineComponents.length;

                  totalCritical += onlyThisMachineComponents.filter(
                    (component) => getComponentStatus(component) === "Critical",
                  ).length;
                } catch {
                  totalComponents += getMachineComponentCount(machine);
                  totalCritical += getMachineCriticalCount(machine);
                }
              }),
            );

            return {
              ...company,

              machineCount: companyMachines.length,
              machinesCount: companyMachines.length,

              componentCount: totalComponents,
              componentsCount: totalComponents,

              criticalCount: totalCritical,
              criticalComponents: totalCritical,
            };
          } catch {
            return {
              ...company,

              machineCount: getCompanyMachineCount(company),
              machinesCount: getCompanyMachineCount(company),

              componentCount: getCompanyComponentCount(company),
              componentsCount: getCompanyComponentCount(company),

              criticalCount: getCompanyCriticalCount(company),
              criticalComponents: getCompanyCriticalCount(company),
            };
          }
        }),
      );

      setCompanies(companiesWithCounts);
    } catch (error: any) {
      setCompaniesError(error?.message || "Failed to fetch companies.");
    } finally {
      setCompaniesLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const companyMachines = useMemo(() => {
    if (!selectedCompany) return [];
    return machines;
  }, [selectedCompany, machines]);

  const machineComponents = useMemo(() => {
    if (!selectedMachine) return [];

    const selectedMachineId = getMachineApiId(selectedMachine);

    return components.filter((component) => {
      const componentMachineId = getComponentMachineId(component);

      const matchesMachine =
        !componentMachineId ||
        String(componentMachineId) === String(selectedMachineId);

      const componentName = getComponentName(component);
      const category = getComponentCategory(component);
      const status = getComponentStatus(component);
      const serialNumber = getSerialNumber(component);
      const supplier = getSupplier(component);

      const searchableText =
        `${componentName} ${category} ${status} ${serialNumber} ${supplier}`.toLowerCase();

      const matchesSearch = searchableText.includes(
        search.trim().toLowerCase(),
      );
      const matchesStatus = statusFilter === "All" || status === statusFilter;

      return matchesMachine && matchesSearch && matchesStatus;
    });
  }, [selectedMachine, components, search, statusFilter]);

  const paginatedComponents = machineComponents.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  const totalPages = Math.ceil(machineComponents.length / pageSize);

  const selectedMachineTotalComponents = machineComponents.length;

  const selectedMachineWarningComponents = machineComponents.filter(
    (component) => getComponentStatus(component) === "Warning",
  ).length;

  const selectedMachineCriticalComponents = machineComponents.filter(
    (component) => getComponentStatus(component) === "Critical",
  ).length;

  const selectedMachineAverageHealth =
    selectedMachineTotalComponents === 0
      ? 0
      : clampPercent(
          machineComponents.reduce(
            (total, component) => total + getComponentHealth(component),
            0,
          ) / selectedMachineTotalComponents,
        );

  const resetToCompanies = () => {
    setSelectedCompany(null);
    setSelectedMachine(null);
    setSelectedComponent(null);
    setIsAddComponentOpen(false);

    setMachines([]);
    setComponents([]);

    setMachinesError("");
    setComponentsError("");

    setSearch("");
    setStatusFilter("All");
    setPage(1);
  };

  const resetToMachines = () => {
    setSelectedMachine(null);
    setSelectedComponent(null);
    setIsAddComponentOpen(false);

    setComponents([]);
    setComponentsError("");

    setSearch("");
    setStatusFilter("All");
    setPage(1);
  };

  const handleCompanySelect = async (company: Company) => {
    try {
      setSelectedCompany(company);
      setSelectedMachine(null);
      setSelectedComponent(null);
      setIsAddComponentOpen(false);

      setMachines([]);
      setComponents([]);
      setMachineStats({});

      setSearch("");
      setStatusFilter("All");
      setPage(1);

      setMachinesLoading(true);
      setMachinesError("");

      const machineList = await superAdminMachineService.getMachinesByCompanyId(
        company.id,
      );

      const normalizedMachines = normalizeApiArray<Machine>(machineList);

      setMachines(normalizedMachines);

      const statsEntries = await Promise.all(
        normalizedMachines.map(async (machine) => {
          const machineId = getMachineApiId(machine);

          if (!machineId) {
            return [
              machineId,
              {
                componentsCount: getMachineComponentCount(machine),
                criticalCount: getMachineCriticalCount(machine),
                averageHealth: getMachineAverageHealth(machine),
              },
            ] as const;
          }

          try {
            const componentList =
              await superAdminMachineService.getComponentsByMachineId(
                company.id,
                machineId,
              );

            const mappedComponents =
              normalizeApiArray<MachineComponent>(componentList);

            const onlyThisMachineComponents = mappedComponents.filter(
              (component) => {
                const componentMachineId = getComponentMachineId(component);

                return (
                  !componentMachineId ||
                  String(componentMachineId) === String(machineId)
                );
              },
            );

            return [
              machineId,
              calculateMachineStatsFromComponents(onlyThisMachineComponents),
            ] as const;
          } catch (error) {
            return [
              machineId,
              {
                componentsCount: getMachineComponentCount(machine),
                criticalCount: getMachineCriticalCount(machine),
                averageHealth: getMachineAverageHealth(machine),
              },
            ] as const;
          }
        }),
      );

      setMachineStats(Object.fromEntries(statsEntries));
    } catch (error: any) {
      setMachinesError(error?.message || "Failed to fetch machines.");
    } finally {
      setMachinesLoading(false);
    }
  };

  const handleMachineSelect = async (machine: Machine) => {
    try {
      setSelectedMachine(machine);
      setSelectedComponent(null);
      setIsAddComponentOpen(false);

      setComponents([]);

      setSearch("");
      setStatusFilter("All");
      setPage(1);

      setComponentsLoading(true);
      setComponentsError("");

      const companyId = selectedCompany?.id || "";
      const machineId = getMachineApiId(machine);

      if (!companyId) {
        throw new Error("Company ID is required");
      }

      if (!machineId) {
        throw new Error("Machine ID is required");
      }

      const componentList =
        await superAdminMachineService.getComponentsByMachineId(
          companyId,
          machineId,
        );

      const mappedComponents =
        normalizeApiArray<MachineComponent>(componentList);

      const safeMachineComponents = mappedComponents.filter((component) => {
        const componentMachineId = getComponentMachineId(component);

        return (
          !componentMachineId ||
          String(componentMachineId) === String(machineId)
        );
      });

     

      setComponents(safeMachineComponents);
    } catch (error: any) {
      console.error("Failed to fetch components:", error);
      setComponentsError(error?.message || "Failed to fetch components.");
    } finally {
      setComponentsLoading(false);
    }
  };

  const openAddComponentModal = () => {
    if (!selectedCompany || !selectedMachine) return;
    setIsAddComponentOpen(true);
  };

  const closeAddComponentModal = () => {
    setIsAddComponentOpen(false);
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <button
          onClick={resetToCompanies}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ${
            !selectedCompany
              ? "bg-blue-600 text-white shadow-md"
              : "border border-blue-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-[#081028] dark:text-slate-300 dark:hover:bg-slate-800"
          }`}
        >
          Companies
        </button>

        <span className="font-bold text-blue-400">/</span>

        <button
          onClick={selectedCompany ? resetToMachines : undefined}
          disabled={!selectedCompany}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${
            selectedCompany && !selectedMachine
              ? "bg-blue-600 text-white shadow-md"
              : "border border-blue-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-[#081028] dark:text-slate-300 dark:hover:bg-slate-800"
          }`}
        >
          {selectedCompany ? getCompanyName(selectedCompany) : "Machines"}
        </button>

        <span className="font-bold text-blue-400">/</span>

        <button
          disabled={!selectedMachine}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${
            selectedMachine
              ? "bg-blue-600 text-white shadow-md"
              : "border border-blue-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-[#081028] dark:text-slate-300"
          }`}
        >
          {selectedMachine ? getMachineName(selectedMachine) : "Components"}
        </button>
      </div>

      {!selectedCompany && (
        <section>
          <SectionTitle
            title="All Companies"
            description="All companies will be shown here for Super Admin."
          />

          {companiesLoading && <LoadingState title="Loading companies..." />}

          {!companiesLoading && companiesError && (
            <ErrorState title={companiesError} />
          )}

          {!companiesLoading && !companiesError && companies.length === 0 && (
            <EmptyState title="No companies found." />
          )}

          {!companiesLoading && !companiesError && companies.length > 0 && (
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {companies.map((company) => (
                <CompanyCard
                  key={company.id}
                  company={company}
                  machinesCount={getCompanyMachineCount(company)}
                  componentsCount={getCompanyComponentCount(company)}
                  criticalCount={getCompanyCriticalCount(company)}
                  onView={() => handleCompanySelect(company)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {selectedCompany && !selectedMachine && (
        <section>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SectionTitle
              title={`${getCompanyName(selectedCompany)} Machines`}
              description="Selected company's machines will be shown here."
            />

            <button
              onClick={resetToCompanies}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <ArrowLeft size={17} />
              Back to Companies
            </button>
          </div>

          {machinesLoading && <LoadingState title="Loading machines..." />}

          {!machinesLoading && machinesError && (
            <ErrorState title={machinesError} />
          )}

          {!machinesLoading &&
            !machinesError &&
            companyMachines.length === 0 && (
              <EmptyState title="No machines found for this company." />
            )}

          {!machinesLoading && !machinesError && companyMachines.length > 0 && (
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {companyMachines.map((machine) => (
                <MachineCard
                  key={getMachineApiId(machine)}
                  machine={machine}
                  componentsCount={
                    machineStats[getMachineApiId(machine)]?.componentsCount ??
                    getMachineComponentCount(machine)
                  }
                  criticalCount={
                    machineStats[getMachineApiId(machine)]?.criticalCount ??
                    getMachineCriticalCount(machine)
                  }
                  averageHealth={
                    machineStats[getMachineApiId(machine)]?.averageHealth ??
                    getMachineAverageHealth(machine)
                  }
                  onView={() => handleMachineSelect(machine)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {selectedCompany && selectedMachine && (
        <section>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SectionTitle
              title={`${getMachineName(selectedMachine)} Components`}
              description="View all components and their health condition for the selected machine."
            />

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <button
                onClick={openAddComponentModal}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                <Plus size={17} />
                Add Component
              </button>

              <button
                onClick={resetToMachines}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <ArrowLeft size={17} />
                Back to Machines
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Average Health"
              value={`${selectedMachineAverageHealth}%`}
              icon={<Activity size={22} />}
              iconClass="bg-green-100 text-green-600 dark:bg-green-500/15 dark:text-green-400"
            />

            <SummaryCard
              label="Machine Components"
              value={selectedMachineTotalComponents}
              icon={<Wrench size={22} />}
              iconClass="bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400"
            />

            <SummaryCard
              label="Warning"
              value={selectedMachineWarningComponents}
              icon={<AlertTriangle size={22} />}
              iconClass="bg-yellow-100 text-yellow-600 dark:bg-yellow-500/15 dark:text-yellow-400"
            />

            <SummaryCard
              label="Critical"
              value={selectedMachineCriticalComponents}
              icon={<AlertTriangle size={22} />}
              iconClass="bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400"
            />
          </div>

          <div className="mt-6 rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex flex-col gap-4 border-b border-gray-200 p-4 dark:border-gray-800 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Components List
                </h2>

                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Showing {paginatedComponents.length} of{" "}
                  {machineComponents.length} components
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative">
                  <Search
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />

                  <input
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setPage(1);
                    }}
                    placeholder="Search component..."
                    className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-700 outline-none transition focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200 sm:w-72"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(
                      event.target.value as "All" | ComponentStatus,
                    );
                    setPage(1);
                  }}
                  className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-700 outline-none transition focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200 sm:w-44"
                >
                  <option value="All">All Status</option>
                  <option value="Healthy">Healthy</option>
                  <option value="Warning">Warning</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-950 dark:text-gray-400">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Component</th>
                    <th className="px-5 py-4 font-semibold">Health</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                    <th className="px-5 py-4 font-semibold">Serial</th>
                    <th className="px-5 py-4 font-semibold">Remaining Life</th>
                    <th className="px-5 py-4 font-semibold">Supplier</th>
                    <th className="px-5 py-4 font-semibold">Life Used</th>
                    <th className="px-5 py-4 text-right font-semibold">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {componentsLoading ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400"
                      >
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Loading components...
                        </div>
                      </td>
                    </tr>
                  ) : componentsError ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-5 py-10 text-center text-sm text-red-600 dark:text-red-400"
                      >
                        {componentsError}
                      </td>
                    </tr>
                  ) : paginatedComponents.length > 0 ? (
                    paginatedComponents.map((item) => {
                      const health = getComponentHealth(item);
                      const status = getComponentStatus(item);
                      const lifeUsed = getLifeUsedPercent(item);

                      return (
                        <tr
                          key={
                            item.id ||
                            `${getComponentMachineId(item)}-${getComponentName(
                              item,
                            )}-${getSerialNumber(item)}`
                          }
                          className="transition hover:bg-gray-50 dark:hover:bg-gray-950/70"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="rounded-xl bg-blue-100 p-2 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
                                <Wrench size={18} />
                              </div>

                              <div>
                                <p className="font-semibold text-gray-900 dark:text-white">
                                  {getComponentName(item)}
                                </p>

                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {item.id || "No ID"}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-2 w-28 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                                <div
                                  className={`h-full rounded-full ${healthBarStyles(
                                    health,
                                  )}`}
                                  style={{ width: `${health}%` }}
                                />
                              </div>

                              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                {health}%
                              </span>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusStyles[status]}`}
                            >
                              {status}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300">
                            {getSerialNumber(item)}
                          </td>

                          <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300">
                            {getRemainingLife(item)}
                          </td>

                          <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300">
                            {getSupplier(item)}
                          </td>

                          <td className="px-5 py-4 text-sm font-semibold text-gray-800 dark:text-gray-200">
                            {lifeUsed}%
                          </td>

                          <td className="px-5 py-4 text-right">
                            <button
                              onClick={() => setSelectedComponent(item)}
                              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
                            >
                              <Eye size={15} />
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400"
                      >
                        No components found for this machine.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Page {totalPages === 0 ? 0 : page} of {totalPages}
              </p>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Previous
                </button>

                <button
                  onClick={() =>
                    setPage((prev) => Math.min(prev + 1, totalPages || 1))
                  }
                  disabled={page === totalPages || totalPages === 0}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {selectedComponent && selectedCompany && selectedMachine && (
        <ComponentDetailsModal
          component={selectedComponent}
          company={selectedCompany}
          machine={selectedMachine}
          onClose={() => setSelectedComponent(null)}
        />
      )}

      {isAddComponentOpen && selectedCompany && selectedMachine && (
        <AddComponentModal
          company={selectedCompany}
          machine={selectedMachine}
          onClose={closeAddComponentModal}
          onCreated={async () => {
            setIsAddComponentOpen(false);
            await handleMachineSelect(selectedMachine);
            await fetchCompanies();
          }}
        />
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  iconClass,
}: {
  label: string;
  value: number | string;
  icon: ReactNode;
  iconClass: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <h2 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {value}
          </h2>
        </div>

        <div className={`rounded-xl p-2.5 ${iconClass}`}>{icon}</div>
      </div>
    </div>
  );
}

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">
        {title}
      </h2>

      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {description}
      </p>
    </div>
  );
}

function CompanyCard({
  company,
  machinesCount,
  componentsCount,
  criticalCount,
  onView,
}: {
  company: Company;
  machinesCount: number;
  componentsCount: number;
  criticalCount: number;
  onView: () => void;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start justify-between gap-3">
        <div className="rounded-xl bg-blue-100 p-3 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
          <Building2 size={24} />
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            criticalCount > 0
              ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300"
              : "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300"
          }`}
        >
          {criticalCount} Critical
        </span>
      </div>

      <h3 className="mt-4 text-lg font-bold text-gray-900 dark:text-white">
        {getCompanyName(company)}
      </h3>

      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Code: {getCompanyCode(company)}
      </p>

      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Admin: {getCompanyAdmin(company)}
      </p>

      <p className="mt-2 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <MapPin size={15} />
        {getCompanyLocation(company)}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <MiniStat label="Machines" value={machinesCount} />
        <MiniStat label="Components" value={componentsCount} />
      </div>

      <button
        onClick={onView}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
      >
        View Machines
        <Truck size={17} />
      </button>
    </div>
  );
}

function MachineCard({
  machine,
  componentsCount,
  criticalCount,
  averageHealth,
  onView,
}: {
  machine: Machine;
  componentsCount: number;
  criticalCount: number;
  averageHealth: number;
  onView: () => void;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start justify-between gap-3">
        <div className="rounded-xl bg-orange-100 p-3 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400">
          <Truck size={24} />
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            criticalCount > 0
              ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300"
              : "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300"
          }`}
        >
          {criticalCount} Critical
        </span>
      </div>

      <h3 className="mt-4 text-lg font-bold text-gray-900 dark:text-white">
        {getMachineName(machine)}
      </h3>

      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Code: {getMachineCode(machine)}
      </p>

      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Type: {getMachineType(machine)}
      </p>

      <p className="mt-2 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <MapPin size={15} />
        {getMachineLocation(machine)}
      </p>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="font-medium text-gray-500 dark:text-gray-400">
            Overall Health
          </span>

          <span className="font-bold text-gray-900 dark:text-white">
            {averageHealth}%
          </span>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className={`h-full rounded-full ${healthBarStyles(averageHealth)}`}
            style={{ width: `${averageHealth}%` }}
          />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <MiniStat label="Components" value={componentsCount} />
        <MiniStat label="Critical" value={criticalCount} />
      </div>

      <button
        onClick={onView}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
      >
        View Components
        <Cpu size={17} />
      </button>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-950">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>

      <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function ComponentDetailsModal({
  component,
  company,
  machine,
  onClose,
}: {
  component: MachineComponent;
  company: Company;
  machine: Machine;
  onClose: () => void;
}) {
  const health = getComponentHealth(component);
  const status = getComponentStatus(component);
  const lifeUsed = getLifeUsedPercent(component);

  return (
    <div className="fixed inset-0 z-[1000000] flex items-center justify-center bg-gray-950/80 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-5 py-4 dark:border-gray-800 dark:bg-gray-900">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Component Details
            </h3>

            <p className="text-sm text-gray-500 dark:text-gray-400">
              Component health, condition and service overview
            </p>
          </div>

          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-600 transition hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-5 p-5">
          <div className="rounded-3xl bg-gray-50 p-5 dark:bg-gray-950">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-blue-100 p-4 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
                  <Wrench size={28} />
                </div>

                <div>
                  <h4 className="text-xl font-bold text-gray-900 dark:text-white">
                    {getComponentName(component)}
                  </h4>

                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {component.id || "No ID"} •{" "}
                    {getComponentCategory(component)}
                  </p>

                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Company: {getCompanyName(company)} ({getCompanyCode(company)})
                  </p>

                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Machine: {getMachineName(machine)} /{" "}
                    {getMachineCode(machine)}
                  </p>
                </div>
              </div>

              <span
                className={`w-fit rounded-full px-4 py-2 text-sm font-bold ring-1 ${statusStyles[status]}`}
              >
                {status}
              </span>
            </div>

            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                  Health Percentage
                </span>

                <span className="text-sm font-bold text-gray-900 dark:text-white">
                  {health}%
                </span>
              </div>

              <div className="h-3 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  className={`h-full rounded-full ${healthBarStyles(health)}`}
                  style={{ width: `${health}%` }}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <DetailCard
              icon={<Gauge size={20} />}
              label="Remaining Life"
              value={getRemainingLife(component)}
            />

            <DetailCard
              icon={<Activity size={20} />}
              label="Serial Number"
              value={getSerialNumber(component)}
            />

            <DetailCard
              icon={<CheckCircle2 size={20} />}
              label="Life Used"
              value={`${lifeUsed}%`}
            />

            <DetailCard
              icon={<AlertTriangle size={20} />}
              label="Supplier"
              value={getSupplier(component)}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <SensorCard
              label="Temperature"
              value={String(getTemperature(component))}
            />

            <SensorCard
              label="Pressure"
              value={String(getPressure(component))}
            />

            <SensorCard
              label="Vibration"
              value={String(getVibration(component))}
            />
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <h5 className="font-bold text-gray-900 dark:text-white">
              Recommendation
            </h5>

            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {getRecommendation(component)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const addComponentSchema = z.object({
  machineId: z.string().trim().min(1, "Machine is required"),
  category: z.enum(
    [
      "Brake",
      "Cabin",
      "Cooling",
      "Electrical",
      "Engine",
      "Hydraulic",
      "Structural / Wear",
      "Transmission",
      "Tyre",
      "Custom",
    ],
    { message: "Select a valid category" },
  ),
 serialNumber: z
  .string()
  .trim()
  .min(1, "Serial number is required")
  .max(60, "Serial number is too long"),

description: z
  .string()
  .trim()
  .min(1, "Description is required")
  .max(150, "Description is too long"),

supplier: z
  .string()
  .trim()
  .min(1, "Supplier is required")
  .max(80, "Supplier is too long"),

installHours: z.coerce
  .number({
    message: "Install hours is required",
  })
  .min(0, "Install hours cannot be negative")
  .max(1000000, "Install hours seems too high"),

currentHours: z.coerce
  .number({
    message: "Current hours is required",
  })
  .min(0, "Current hours cannot be negative")
  .max(1000000, "Current hours seems too high"),

plannedLife: z.coerce
  .number({
    message: "Planned life is required",
  })
  .min(0, "Planned life cannot be negative")
  .max(1000000, "Planned life seems too high"),

replacementCost: z.coerce
  .number({
    message: "Replacement cost is required",
  })
  .min(0, "Replacement cost cannot be negative")
  .max(100000000, "Replacement cost seems too high"),

condition: z.coerce
  .number({
    message: "Condition is required",
  })
  .int("Condition must be a whole number")
  .min(1, "Condition must be between 1 and 5")
  .max(5, "Condition must be between 1 and 5"),
});

type AddComponentFormValues = z.infer<typeof addComponentSchema>;
type AddComponentFormInput = z.input<typeof addComponentSchema>;

function AddComponentModal({
  company,
  machine,
  onClose,
  onCreated,
}: {
  company: Company;
  machine: Machine;
  onClose: () => void;
  onCreated: () => void | Promise<void>;
}) {
  const machineId = getMachineApiId(machine);
  const {
    register: registerAddComponent,
    handleSubmit: handleSubmitAddComponent,
    watch: watchAddComponent,
    setValue: setAddComponentValue,
    setError,
    formState: { errors: addComponentErrors, isValid: isAddComponentFormValid },
  } = useForm<AddComponentFormInput, any, AddComponentFormValues>({
    resolver: zodResolver(addComponentSchema),
    mode: "onChange",
    defaultValues: {
      machineId,
      category: "Brake",
      serialNumber: "",
      description: "",
      supplier: "",
      installHours: 0,
      currentHours: 0,
      plannedLife: 0,
      replacementCost: 0,
      condition: 3,
    },
  });
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const selectedCategory = watchAddComponent("category");

  const inputErrorClass = (hasError: boolean) =>
    hasError
      ? "border-red-400 focus:border-red-500 focus:ring-red-500/10"
      : "border-slate-300 focus:border-blue-500 focus:ring-blue-500/10 dark:border-slate-700";

  const onSubmitAddComponent = async (values: AddComponentFormValues) => {
    const payload: ComponentPayload = {
      machineId: values.machineId,
      category: values.category,
      description: values.description.trim(),
      serialNumber: values.serialNumber.trim(),
      supplier: values.supplier.trim(),
      installHours: values.installHours,
      currentHours: values.currentHours,
      plannedLife: values.plannedLife,
      replacementCost: values.replacementCost,
      condition: values.condition,
    };

    try {
      setSubmitting(true);
      setSubmitError("");

      await componentService.createComponent(payload);

      await onCreated();
    } catch (err: any) {
      if (err?.errors) {
        Object.entries(err.errors).forEach(([field, message]) => {
          setError(field as keyof AddComponentFormValues, {
            type: "server",
            message: String(message),
          });
        });
      }

      setSubmitError(err?.message || "Failed to add component.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000000] flex items-center justify-center bg-gray-950/60 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-900">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Add Component
            </h2>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Register a new component for {getMachineName(machine)}.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-600 transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={handleSubmitAddComponent(onSubmitAddComponent)}
          className="space-y-5 p-6"
          noValidate
        >
          {submitError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              {submitError}
            </div>
          )}

          <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
            Company: <b>{getCompanyName(company)}</b> | Machine:{" "}
            <b>{getMachineName(machine)}</b>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">
                Machine
              </label>

              <select
                {...registerAddComponent("machineId")}
                disabled={submitting}
                className={`h-14 w-full rounded-lg border bg-white px-5 text-sm font-semibold text-slate-700 outline-none transition focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-950 dark:text-slate-200 ${inputErrorClass(!!addComponentErrors.machineId)}`}
              >
                <option value={machineId}>{getMachineName(machine)}</option>
              </select>

              {addComponentErrors.machineId && (
                <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">
                  {addComponentErrors.machineId.message}
                </p>
              )}
            </div>

            <div className="relative">
              <label className="mb-2 block text-xs font-bold uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">
                Category <span className="text-red-500">*</span>
              </label>

              <button
                type="button"
                disabled={submitting}
                onClick={() => setIsCategoryOpen((prev) => !prev)}
                className={`flex h-14 w-full items-center justify-between rounded-lg border bg-white px-5 text-left text-sm font-semibold text-slate-700 outline-none transition focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-950 dark:text-slate-200 ${inputErrorClass(!!addComponentErrors.category)}`}
              >
                {selectedCategory}
                <span className="text-lg leading-none">⌄</span>
              </button>

              {isCategoryOpen && (
                <div className="absolute left-0 right-0 top-[82px] z-[100000] overflow-hidden rounded-md border border-slate-300 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                  {componentCategories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => {
                        setAddComponentValue("category", category, {
                          shouldValidate: true,
                          shouldDirty: true,
                        });
                        setIsCategoryOpen(false);
                      }}
                      className={`w-full px-5 py-2 text-left text-sm font-medium transition ${
                        selectedCategory === category
                          ? "bg-blue-600 text-white"
                          : "text-slate-700 hover:bg-blue-600 hover:text-white dark:text-slate-200"
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              )}

              {addComponentErrors.category && (
                <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">
                  {addComponentErrors.category.message}
                </p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">
                Serial Number <span className="text-red-500">*</span>
              </label>

              <input
                type="text"
                {...registerAddComponent("serialNumber")}
                disabled={submitting}
                placeholder="TY-990-001"
                className={`h-14 w-full rounded-lg border bg-white px-5 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-950 dark:text-slate-200 ${inputErrorClass(!!addComponentErrors.serialNumber)}`}
              />

              {addComponentErrors.serialNumber && (
                <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">
                  {addComponentErrors.serialNumber.message}
                </p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">
                Supplier <span className="text-red-500">*</span>
              </label>

              <input
                type="text"
                {...registerAddComponent("supplier")}
                disabled={submitting}
                placeholder="CK & J Group"
                className={`h-14 w-full rounded-lg border bg-white px-5 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-950 dark:text-slate-200 ${inputErrorClass(!!addComponentErrors.supplier)}`}
              />

              {addComponentErrors.supplier && (
                <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">
                  {addComponentErrors.supplier.message}
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-xs font-bold uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">
                Description <span className="text-red-500">*</span>
              </label>

              <textarea
                {...registerAddComponent("description")}
                disabled={submitting}
                rows={4}
                placeholder="Enter component description..."
                className={`w-full rounded-lg border bg-white px-5 py-3 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:ring-4 resize-none disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-950 dark:text-slate-200 ${inputErrorClass(!!addComponentErrors.description)}`}
              />

              {addComponentErrors.description && (
                <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">
                  {addComponentErrors.description.message}
                </p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">
                Install Hours
              </label>

              <input
                type="number"
                min={0}
                {...registerAddComponent("installHours")}
                disabled={submitting}
                placeholder="800"
                className={`h-14 w-full rounded-lg border bg-white px-5 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-950 dark:text-slate-200 ${inputErrorClass(!!addComponentErrors.installHours)}`}
              />

              {addComponentErrors.installHours && (
                <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">
                  {addComponentErrors.installHours.message}
                </p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">
                Current Hours
              </label>

              <input
                type="number"
                min={0}
                {...registerAddComponent("currentHours")}
                disabled={submitting}
                placeholder="4900"
                className={`h-14 w-full rounded-lg border bg-white px-5 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-950 dark:text-slate-200 ${inputErrorClass(!!addComponentErrors.currentHours)}`}
              />

              {addComponentErrors.currentHours && (
                <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">
                  {addComponentErrors.currentHours.message}
                </p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">
                Planned Life
              </label>

              <input
                type="number"
                min={0}
                {...registerAddComponent("plannedLife")}
                disabled={submitting}
                placeholder="8000"
                className={`h-14 w-full rounded-lg border bg-white px-5 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-950 dark:text-slate-200 ${inputErrorClass(!!addComponentErrors.plannedLife)}`}
              />

              {addComponentErrors.plannedLife && (
                <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">
                  {addComponentErrors.plannedLife.message}
                </p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">
                Replacement Cost
              </label>

              <input
                type="number"
                min={0}
                {...registerAddComponent("replacementCost")}
                disabled={submitting}
                placeholder="14200"
                className={`h-14 w-full rounded-lg border bg-white px-5 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-950 dark:text-slate-200 ${inputErrorClass(!!addComponentErrors.replacementCost)}`}
              />

              {addComponentErrors.replacementCost && (
                <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">
                  {addComponentErrors.replacementCost.message}
                </p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">
                Condition
              </label>

              <select
                {...registerAddComponent("condition")}
                disabled={submitting}
                className={`h-14 w-full rounded-lg border bg-white px-5 text-sm font-semibold text-slate-700 outline-none transition focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-950 dark:text-slate-200 ${inputErrorClass(!!addComponentErrors.condition)}`}
              >
                <option value="1">1 / 5 - Excellent</option>
                <option value="2">2 / 5 - Good</option>
                <option value="3">3 / 5 - Average</option>
                <option value="4">4 / 5 - Poor</option>
                <option value="5">5 / 5 - Critical</option>
              </select>

              {addComponentErrors.condition && (
                <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">
                  {addComponentErrors.condition.message}
                </p>
              )}
            </div>
          </div>

          <div className="sticky bottom-0 -mx-6 -mb-6 mt-6 flex justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="h-12 rounded-lg border border-slate-300 bg-white px-7 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting || !isAddComponentFormValid}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-blue-600 px-7 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? "Saving..." : "Save Component"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FormInput({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-bold uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>

      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        min={type === "number" ? 0 : undefined}
        className="h-14 w-full rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
      />
    </div>
  );
}

function DetailCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="rounded-xl bg-blue-100 p-3 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
        {icon}
      </div>

      <p className="mt-3 text-xs font-medium text-gray-500 dark:text-gray-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-bold text-gray-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function SensorCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
        Sensor
      </p>

      <h5 className="mt-1 font-bold text-gray-900 dark:text-white">{label}</h5>

      <p className="mt-3 text-sm font-semibold text-blue-600 dark:text-blue-400">
        {value}
      </p>
    </div>
  );
}

function LoadingState({ title }: { title: string }) {
  return (
    <div className="mt-4 flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center dark:border-gray-700 dark:bg-gray-900">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />

      <p className="mt-3 text-sm font-semibold text-gray-600 dark:text-gray-300">
        {title}
      </p>
    </div>
  );
}

function ErrorState({ title }: { title: string }) {
  return (
    <div className="mt-4 flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-red-300 bg-red-50 p-10 text-center dark:border-red-500/30 dark:bg-red-500/10">
      <ServerCrash className="h-9 w-9 text-red-600 dark:text-red-400" />

      <p className="mt-3 text-sm font-semibold text-red-700 dark:text-red-300">
        {title}
      </p>
    </div>
  );
}

function EmptyState({ title }: { title: string }) {
  return (
    <div className="mt-4 rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center dark:border-gray-700 dark:bg-gray-900">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
        {title}
      </p>
    </div>
  );
}
