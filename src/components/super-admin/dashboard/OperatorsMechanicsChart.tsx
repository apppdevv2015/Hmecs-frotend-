import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const data = [
  { name: "Operators", value: 156 },
  { name: "Mechanics", value: 72 },
];

const colors = ["#16a34a", "#2563eb"];

const total = data.reduce((sum, item) => sum + item.value, 0);

const renderCustomizedLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: any) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;

  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="#ffffff"
      textAnchor="middle"
      dominantBaseline="central"
      className="text-[11px] font-bold"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default function OperatorsMechanicsChart() {
  return (
    <section className="flex h-full min-h-[360px] flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-950 dark:text-white">
            Operators vs Mechanics
          </h2>
          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            Workforce role distribution
          </p>
        </div>

        <div className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
          Total {total}
        </div>
      </div>

      <div className="mt-4 flex flex-1 flex-col justify-between">
        <div className="relative mx-auto h-[190px] w-full outline-none [&_.recharts-surface]:outline-none [&_.recharts-wrapper]:outline-none">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                innerRadius={58}
                outerRadius={88}
                dataKey="value"
                paddingAngle={4}
                labelLine={false}
                label={renderCustomizedLabel}
                stroke="none"
              >
                {data.map((_, index) => (
                  <Cell key={index} fill={colors[index]} />
                ))}
              </Pie>

              <Tooltip
                formatter={(value) => {
                  const safeValue =
                    typeof value === "number" ? value : Number(value ?? 0);

                  return [safeValue, "Count"];
                }}
                contentStyle={{
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Total
              </p>
              <p className="text-lg font-bold text-slate-950 dark:text-white">
                {total}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {data.map((item, index) => {
            const percentage = Math.round((item.value / total) * 100);

            return (
              <div
                key={item.name}
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-800 dark:bg-slate-950/50"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: colors[index] }}
                  />

                  <span className="truncate font-medium text-slate-600 dark:text-slate-300">
                    {item.name}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {percentage}%
                  </span>

                  <span className="min-w-8 text-right font-bold text-slate-950 dark:text-white">
                    {item.value}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}