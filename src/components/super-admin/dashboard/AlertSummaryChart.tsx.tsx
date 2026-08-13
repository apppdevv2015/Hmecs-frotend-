import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const data = [
  { day: "May 16", critical: 1, warning: 3 },
  { day: "May 17", critical: 2, warning: 6 },
  { day: "May 18", critical: 5, warning: 9 },
  { day: "May 19", critical: 3, warning: 6 },
  { day: "May 20", critical: 2, warning: 5 },
  { day: "May 21", critical: 0, warning: 2 },
  { day: "May 22", critical: 3, warning: 6 },
];

const totalCritical = data.reduce((sum, item) => sum + item.critical, 0);
const totalWarnings = data.reduce((sum, item) => sum + item.warning, 0);
const totalAlerts = totalCritical + totalWarnings;

export default function AlertSummaryChart() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03] xl:col-span-1">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Alert Summary
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Critical vs warning alerts overview
          </p>
        </div>

        <select className="rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm text-gray-600 outline-none dark:border-gray-800 dark:text-gray-300">
          <option>This Week</option>
          <option>This Month</option>
        </select>
      </div>

      <div className="mt-5 h-60">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 8, left: -18, bottom: 0 }}
          >
            <defs>
              <linearGradient id="criticalColor" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.03} />
              </linearGradient>

              <linearGradient id="warningColor" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0.03} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#94a3b8"
              opacity={0.25}
              vertical={false}
            />

            <XAxis
              dataKey="day"
              tick={{ fontSize: 12, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
            />

            <YAxis
              tick={{ fontSize: 12, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />

            <Tooltip
              contentStyle={{
                borderRadius: "12px",
                border: "1px solid #e5e7eb",
                boxShadow: "0 8px 24px rgba(15, 23, 42, 0.12)",
              }}
              formatter={(value, name) => [
                `${value} alerts`,
                name === "critical" ? "Critical" : "Warning",
              ]}
            />

            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              wrapperStyle={{ fontSize: 12, paddingBottom: 10 }}
            />

            <Area
              type="monotone"
              dataKey="warning"
              name="Warning"
              stroke="#f97316"
              strokeWidth={2.5}
              fill="url(#warningColor)"
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />

            <Area
              type="monotone"
              dataKey="critical"
              name="Critical"
              stroke="#ef4444"
              strokeWidth={2.5}
              fill="url(#criticalColor)"
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-gray-50 p-3 dark:bg-white/[0.04]">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Total Alerts
          </p>
          <h3 className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
            {totalAlerts}
          </h3>
        </div>

        <div className="rounded-xl bg-red-50 p-3 dark:bg-red-500/10">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Critical
          </p>
          <h3 className="mt-1 text-lg font-bold text-red-500">
            {totalCritical}
          </h3>
        </div>

        <div className="rounded-xl bg-orange-50 p-3 dark:bg-orange-500/10">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Warnings
          </p>
          <h3 className="mt-1 text-lg font-bold text-orange-500">
            {totalWarnings}
          </h3>
        </div>
      </div>
    </div>
  );
}