import { useEffect, useMemo, useState } from "react";
import { Building2, Loader2, Search, ServerCrash, Truck } from "lucide-react";

import Pagination from "../../../components/common/Pagination";

import {
  superAdminMachineService,
  type SuperAdminCompany,
  type SuperAdminMachine,
} from "../../../services/SuperAdmin/machineService";

export default function SuperAdminMachinesPage() {
  const [companies, setCompanies] = useState<SuperAdminCompany[]>([]);
  const [machines, setMachines] = useState<SuperAdminMachine[]>([]);

  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [machinesLoading, setMachinesLoading] = useState(false);

  const [companiesError, setCompaniesError] = useState("");
  const [machinesError, setMachinesError] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const selectedCompany = companies.find(
    (company) => company.id === selectedCompanyId,
  );

  const fetchCompanies = async () => {
    try {
      setCompaniesLoading(true);
      setCompaniesError("");

      const companyList = await superAdminMachineService.getCompanies();
      setCompanies(companyList);
    } catch (error: any) {
      // Error toast is already shown automatically by apiCall (service
      // layer). Only the inline banner is set here so the message isn't
      // shown twice.
      setCompaniesError(error?.message || "Something went wrong");
    } finally {
      setCompaniesLoading(false);
    }
  };

  const fetchMachinesByCompany = async (companyId: string) => {
    if (!companyId) return;

    try {
      setMachinesLoading(true);
      setMachinesError("");
      setMachines([]);
      setSearchTerm("");
      setCurrentPage(1);

      // Success toast comes from apiCall automatically, using the
      // backend's own response.message (see getMachinesByCompanyId,
      // which now passes { showSuccess: true }). No manual toast text
      // or counting is done on the frontend.
      const machineList =
        await superAdminMachineService.getMachinesByCompanyId(companyId);

      setMachines(machineList);
    } catch (error: any) {
      // Error toast is already shown automatically by apiCall. Only the
      // inline banner is set here to avoid a duplicate message.
      setMachinesError(error?.message || "Something went wrong");
    } finally {
      setMachinesLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompanyId) {
      fetchMachinesByCompany(selectedCompanyId);
    } else {
      setMachines([]);
      setMachinesError("");
      setSearchTerm("");
      setCurrentPage(1);
    }
  }, [selectedCompanyId]);

  const getCompanyName = (company: SuperAdminCompany) => {
    return (
      company.companyName ||
      company.company_name ||
      company.name ||
      "Unnamed Company"
    );
  };

  const getCompanyCode = (company: SuperAdminCompany) => {
    return company.companyCode || company.company_code || "";
  };

  const getMachineName = (machine: SuperAdminMachine) => {
    return machine.machine_name || machine.name || "Unnamed Machine";
  };

  const getMachineCode = (machine: SuperAdminMachine) => {
    return (
      machine.machine_code ||
      machine.registration_number ||
      machine.serialNumber ||
      machine.serial_number ||
      "Code not available"
    );
  };

  const getMachineType = (machine: SuperAdminMachine) => {
    return machine.equipmentType || machine.equipment_type || "N/A";
  };

  const getMachineLocation = (machine: SuperAdminMachine) => {
    return machine.location || machine.site || "N/A";
  };

  const getCreatedDate = (machine: SuperAdminMachine) => {
    const date = machine.created_at || machine.createdAt;

    if (!date) return "N/A";

    return new Date(date).toLocaleDateString();
  };

  const filteredMachines = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();

    if (!search) return machines;

    return machines.filter((machine) => {
      const machineName = getMachineName(machine);
      const machineCode = getMachineCode(machine);
      const model = machine.model || "";
      const manufacturer = machine.manufacturer || "";
      const status = machine.status || "";
      const location = getMachineLocation(machine);
      const equipmentType = getMachineType(machine);

      return (
        machineName.toLowerCase().includes(search) ||
        machineCode.toLowerCase().includes(search) ||
        model.toLowerCase().includes(search) ||
        manufacturer.toLowerCase().includes(search) ||
        status.toLowerCase().includes(search) ||
        location.toLowerCase().includes(search) ||
        equipmentType.toLowerCase().includes(search)
      );
    });
  }, [machines, searchTerm]);

  const totalPages = Math.ceil(filteredMachines.length / itemsPerPage) || 1;

  const paginatedMachines = filteredMachines.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const totalItems = filteredMachines.length;

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;

  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const getStatusClass = (status?: string) => {
    const value = status?.toLowerCase();

    if (value === "active" || value === "running") {
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20";
    }

    if (value === "inactive" || value === "stopped") {
      return "bg-slate-100 text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700";
    }

    if (value === "maintenance" || value === "under maintenance") {
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20";
    }

    if (value === "critical" || value === "faulty") {
      return "bg-red-50 text-red-700 ring-1 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/20";
    }

    return "bg-blue-50 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20";
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1600px] space-y-6">
        <section className="overflow-hidden rounded-2xl border border-blue-700/30 bg-gradient-to-r from-blue-800 via-blue-700 to-blue-800 shadow-lg">
          <div className="flex flex-col gap-6 px-6 py-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.15em] text-white backdrop-blur-sm">
                <Truck className="h-4 w-4" />
                Super Admin Machine Management
              </div>

              <h1 className="text-3xl font-black tracking-tight text-white">
                Machines by Company
              </h1>

              <p className="mt-2 max-w-2xl text-sm font-medium text-blue-100">
                Select any company from the dropdown and view all machines
                assigned to that company from one centralized location.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:min-w-[360px]">
              <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-sm font-medium text-blue-100">Companies</p>

                <h2 className="mt-2 text-3xl font-black text-white">
                  {companies.length}
                </h2>
              </div>

              <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-sm font-medium text-blue-100">Machines</p>

                <h2 className="mt-2 text-3xl font-black text-white">
                  {machines.length}
                </h2>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200">
                Select Company
              </label>

              <div className="relative">
                <Building2 className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                <select
                  value={selectedCompanyId}
                  onChange={(event) => setSelectedCompanyId(event.target.value)}
                  disabled={companiesLoading}
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-400"
                >
                  <option value="">
                    {companiesLoading
                      ? "Loading companies..."
                      : "Choose company"}
                  </option>

                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {getCompanyName(company)}
                      {getCompanyCode(company)
                        ? ` (${getCompanyCode(company)})`
                        : ""}
                    </option>
                  ))}
                </select>
              </div>

              {companiesError && (
                <p className="mt-2 text-sm font-medium text-red-600 dark:text-red-400">
                  {companiesError}
                </p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200">
                Search Machine
              </label>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                <input
                  value={searchTerm}
                  onChange={(event) => {
                    setSearchTerm(event.target.value);
                    setCurrentPage(1);
                  }}
                  disabled={!selectedCompanyId || machinesLoading}
                  placeholder="Search by name, code, model, site..."
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-400"
                />
              </div>
            </div>
          </div>

          {selectedCompany && (
            <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-500/20 dark:bg-blue-500/10">
              <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                Selected Company
              </p>

              <h3 className="mt-1 text-lg font-bold text-slate-950 dark:text-white">
                {getCompanyName(selectedCompany)}
              </h3>

              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {getCompanyCode(selectedCompany)
                  ? `Company Code: ${getCompanyCode(selectedCompany)}`
                  : "Company code not available"}
              </p>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-950 dark:text-white">
                Machines List
              </h2>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {selectedCompanyId
                  ? `Showing ${filteredMachines.length} machine result(s)`
                  : "Please select company to view machines"}
              </p>
            </div>
          </div>

          {machinesLoading && (
            <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-center dark:border-slate-700 dark:bg-slate-950">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
              <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                Loading machines...
              </p>
            </div>
          )}

          {!machinesLoading && machinesError && (
            <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-red-200 bg-red-50 text-center dark:border-red-500/20 dark:bg-red-500/10">
              <ServerCrash className="h-9 w-9 text-red-600 dark:text-red-400" />
              <p className="mt-3 text-sm font-semibold text-red-700 dark:text-red-300">
                {machinesError}
              </p>
            </div>
          )}

          {!machinesLoading &&
            !machinesError &&
            selectedCompanyId &&
            filteredMachines.length === 0 && (
              <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-center dark:border-slate-700 dark:bg-slate-950">
                <Truck className="h-10 w-10 text-slate-400" />

                <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  No machines found for this company.
                </p>
              </div>
            )}

          {!machinesLoading && !machinesError && !selectedCompanyId && (
            <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-center dark:border-slate-700 dark:bg-slate-950">
              <Building2 className="h-10 w-10 text-slate-400" />

              <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                Select company first.
              </p>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                After selecting company, machines will show here.
              </p>
            </div>
          )}

          {!machinesLoading &&
            !machinesError &&
            selectedCompanyId &&
            filteredMachines.length > 0 && (
              <>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {paginatedMachines.map((machine) => (
                    <article
                      key={machine.id}
                      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-950"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20">
                            <Truck className="h-6 w-6" />
                          </div>

                          <div>
                            <h3 className="text-base font-bold text-slate-950 dark:text-white">
                              {getMachineName(machine)}
                            </h3>

                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                              {getMachineCode(machine)}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${getStatusClass(
                            machine.status,
                          )}`}
                        >
                          {machine.status || "Unknown"}
                        </span>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-900">
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            Model
                          </p>

                          <p className="mt-1 truncate text-sm font-bold text-slate-900 dark:text-white">
                            {machine.model || "N/A"}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-900">
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            Type
                          </p>

                          <p className="mt-1 truncate text-sm font-bold text-slate-900 dark:text-white">
                            {getMachineType(machine)}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-900">
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            Site
                          </p>

                          <p className="mt-1 truncate text-sm font-bold text-slate-900 dark:text-white">
                            {getMachineLocation(machine)}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-900">
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            Created
                          </p>

                          <p className="mt-1 truncate text-sm font-bold text-slate-900 dark:text-white">
                            {getCreatedDate(machine)}
                          </p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    startItem={startItem}
                    endItem={endItem}
                    totalItems={totalItems}
                    onPrev={() =>
                      setCurrentPage((page) => Math.max(page - 1, 1))
                    }
                    onNext={() =>
                      setCurrentPage((page) => Math.min(page + 1, totalPages))
                    }
                  />
                </div>
              </>
            )}
        </section>
      </div>
    </main>
  );
}