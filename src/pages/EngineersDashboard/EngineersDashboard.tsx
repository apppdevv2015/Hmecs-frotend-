import { Truck, ClipboardCheck, AlertTriangle, Wrench } from "lucide-react";

export default function EngineersDashboard() {
  const stats = [
    {
      label: "Assigned Machines",
      value: 12,
      icon: <Truck className="h-6 w-6 text-blue-500" />,
    },
    {
      label: "Pending Tasks",
      value: 5,
      icon: <ClipboardCheck className="h-6 w-6 text-amber-500" />,
    },
    {
      label: "Active Alerts",
      value: 3,
      icon: <AlertTriangle className="h-6 w-6 text-red-500" />,
    },
    {
      label: "Under Maintenance",
      value: 2,
      icon: <Wrench className="h-6 w-6 text-emerald-500" />,
    },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
        Engineers Dashboard
      </h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Welcome back! Here's an overview of your assigned work.
      </p>

      {/* Stats Grid */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
              {stat.icon}
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">
                {stat.value}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {stat.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity (dummy) */}
      <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
          Recent Activity
        </h2>

        <div className="mt-4 space-y-3">
          {[
            "Machine MC-102 inspection completed",
            "New task assigned: Fix hydraulic leak",
            "Alert resolved on MC-098",
          ].map((activity, index) => (
            <div
              key={index}
              className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-200"
            >
              <span>{activity}</span>
              <span className="text-xs text-gray-400">Just now</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}