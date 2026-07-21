import { useEffect, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { superAdminMachineService } from "../../services/SuperAdmin/machineService";

const colors = ["#2563eb", "#0f766e", "#f97316", "#8b5cf6", "#10b981", "#ef4444", "#f59e0b"];

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="#fff"
      textAnchor="middle"
      dominantBaseline="central"
      className="text-[11px] font-bold"
    >
      {percent > 0 ? `${(percent * 100).toFixed(0)}%` : ""}
    </text>
  );
};

export default function PlanDistribution() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadStats = async () => {
      try {
        setLoading(true);
        const dist = await superAdminMachineService.getDashboardPlanDistribution();
        if (!isMounted) return;

        const mappedData = (Array.isArray(dist) ? dist : []).map((item: any) => ({
          name: item.name,
          value: item.value, // percentage
          count: item.count,
        }));
        setData(mappedData);
      } catch (err) {
        console.error("Error loading dashboard stats in PlanDistribution:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadStats();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="flex h-full min-h-[320px] flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-950 dark:text-white">Plan Distribution</h2>
          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            Active subscription split
          </p>
        </div>

        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/50 dark:text-blue-400">
          Live
        </span>
      </div>

      {loading ? (
        <div className="flex flex-1 flex-col items-center justify-center py-6 text-sm font-semibold text-slate-400">
          Loading plan split...
        </div>
      ) : data.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-6 text-sm font-semibold text-slate-400">
          No active plans found.
        </div>
      ) : (
        <div className="flex flex-1 flex-col justify-center">
          <div className="mx-auto mt-3 h-[170px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  innerRadius={48}
                  outerRadius={76}
                  paddingAngle={3}
                  dataKey="value"
                  labelLine={false}
                  label={renderCustomizedLabel}
                >
                  {data.map((_, index) => (
                    <Cell key={index} fill={colors[index % colors.length]} />
                  ))}
                </Pie>

                <Tooltip
                  formatter={(value) => {
                    const safeValue = typeof value === "number" ? value : Number(value ?? 0);
                    return [`${safeValue}%`, "Share"];
                  }}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 space-y-3">
            {data.map((item, index) => (
              <div
                key={item.name}
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950/50"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: colors[index % colors.length] }}
                  />

                  <span className="font-medium text-slate-600 dark:text-slate-300">
                    {item.name}
                  </span>
                </div>

                <span className="font-bold text-slate-950 dark:text-white">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
