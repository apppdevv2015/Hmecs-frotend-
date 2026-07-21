import { useState } from "react";
import { toast } from "react-hot-toast";
import { superAdminMachineService } from "../../services/SuperAdmin/machineService";
import SuperAdminMetrics from "./SuperAdminMetrics";
import AdminManagementTable from "./AdminManagementTable";
import PlanDistribution from "./PlanDistribution";
import RecentActivity from "./RecentActivity";
import OperatorsMechanicsChart from "./OperatorsMechanicsChart";
import MachineStatusOverview from "./MachineStatusOverview";
import AlertSummaryChart from "./AlertSummaryChart";
import RoleDetailsPage from "./RoleDetails";
import AnalyticsChart from "./AnalyticsChart";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1600px] space-y-5">
        <header className=" rounded-2xl border-b border-blue-100 bg-gradient-to-r from-blue-800 via-blue-700 to-blue-800 px-6 py-6">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.15em] text-white backdrop-blur-sm">
                  Super Admin
                </span>

                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.15em] text-white backdrop-blur-sm">
                  System Active
                </span>
              </div>

              <h1 className="text-3xl font-black tracking-tight text-white">
                Super Admin Dashboard
              </h1>

              <p className="mt-2 max-w-3xl text-sm font-medium text-blue-100">
                Monitor platform activity, admins, subscription plans, machines, operators,
                mechanics, and alerts from one central dashboard.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-2xl border border-white/20 bg-white/10 px-5 py-4 backdrop-blur-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-blue-100">
                  Today's Overview
                </p>

                <p className="mt-1 text-lg font-bold text-white">Live System Summary</p>
              </div>
            </div>
          </div>
        </header>

        <SuperAdminMetrics />

        <section className="min-w-0">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <AnalyticsChart />
          </div>
        </section>

        <section className="grid grid-cols-1 items-stretch gap-5 xl:grid-cols-12">
          <div className="min-w-0 overflow-hidden xl:col-span-8">
            <div className="h-full min-h-[620px] overflow-hidden rounded-2xl">
              <AdminManagementTable />
            </div>
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-5 xl:col-span-4">
            <PlanDistribution />
            <RecentActivity />
          </div>
        </section>

        <section className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-3">
          <OperatorsMechanicsChart />
          <MachineStatusOverview />
          <AlertSummaryChart />
        </section>

        <section className="min-w-0">
          <RoleDetailsPage />
        </section>
      </div>
    </main>
  );
}
