import { useEffect, useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { getSubscriptionPlans } from "../../../services/SuperAdmin/subscriptionService";
import { superAdminMachineService } from "../../../services/SuperAdmin/machineService";

type PlanDistributionItem = {
  name: string;
  value: number; // percentage
  count: number; // active subscriptions count
  color: string;
  sliceValue?: number;
};

const PALETTE = [
  "#2563eb",
  "#10b981",
  "#8b5cf6",
  "#f97316",
  "#64748b",
  "#ec4899",
];

const renderCustomizedLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  payload,
}: any) => {
  if (!payload || payload.value <= 0) return null;
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
      className="text-[10px] font-bold"
    >
      {`${payload.value}%`}
    </text>
  );
};

export default function PlanDistribution() {
  const [distributionData, setDistributionData] = useState<
    PlanDistributionItem[]
  >([]);
  const [totalActiveSubs, setTotalActiveSubs] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    const loadDistribution = async () => {
      try {
        setLoading(true);
        const [plansRes, companiesRes] = await Promise.allSettled([
          getSubscriptionPlans(),
          superAdminMachineService.getCompanies(),
        ]);

        if (!isMounted) return;

        let rawPlans: any[] = [];
        if (plansRes.status === "fulfilled" && plansRes.value) {
          const val: any = plansRes.value;
          rawPlans = Array.isArray(val)
            ? val
            : Array.isArray(val?.data)
              ? val.data
              : Array.isArray(val?.plans)
                ? val.plans
                : Array.isArray(val?.data?.plans)
                  ? val.data.plans
                  : [];
        }

        let rawCompanies: any[] = [];
        if (companiesRes.status === "fulfilled" && companiesRes.value) {
          const val: any = companiesRes.value;
          rawCompanies = Array.isArray(val)
            ? val
            : Array.isArray(val?.data)
              ? val.data
              : Array.isArray(val?.companies)
                ? val.companies
                : [];
        }

        if (rawPlans.length > 0) {
          let totalActive = 0;
          const planCounts: { name: string; count: number }[] = [];

          rawPlans.forEach((p: any) => {
            const rawName = (
              p.planName ||
              p.plan_name ||
              p.name ||
              "Plan"
            ).toString();
            const formattedName =
              rawName.charAt(0).toUpperCase() + rawName.slice(1);
            const planDisplayName = formattedName.endsWith("Plan")
              ? formattedName
              : `${formattedName} Plan`;
            const lowerName = rawName.toLowerCase().trim();

            const subscribedCompanies: string[] = [];

            // 1. Check subscriptions from plan object directly
            if (Array.isArray(p.subscriptions) && p.subscriptions.length > 0) {
              p.subscriptions.forEach((sub: any) => {
                const compName =
                  sub.company?.name || sub.companyName || sub.name;
                if (compName && !subscribedCompanies.includes(compName)) {
                  subscribedCompanies.push(compName);
                }
              });
            }

            // 2. Cross check with rawCompanies list
            rawCompanies.forEach((comp: any) => {
              const compPlan = (
                comp.activePlan?.planName ||
                comp.activePlan?.name ||
                comp.activePlan ||
                comp.planName ||
                comp.plan_name ||
                ""
              )
                .toString()
                .toLowerCase()
                .trim();

              if (
                compPlan &&
                (compPlan === lowerName ||
                  compPlan.includes(lowerName) ||
                  lowerName.includes(compPlan))
              ) {
                const compName =
                  comp.name || comp.company_name || comp.companyName;
                if (compName && !subscribedCompanies.includes(compName)) {
                  subscribedCompanies.push(compName);
                }
              }
            });

            const subsCount = subscribedCompanies.length;
            totalActive += subsCount;

            planCounts.push({
              name: planDisplayName,
              count: subsCount,
            });
          });

          setTotalActiveSubs(totalActive);

          const finalData: PlanDistributionItem[] = planCounts.map((item, idx) => {
            const pct =
              totalActive > 0
                ? Math.round((item.count / totalActive) * 100)
                : 0;
            return {
              name: item.name,
              value: pct,
              count: item.count,
              color: PALETTE[idx % PALETTE.length],
            };
          });

          setDistributionData(finalData);
        }
      } catch (err) {
        console.error("Failed to load plan distribution data:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadDistribution();

    return () => {
      isMounted = false;
    };
  }, []);

  const pieChartData = useMemo(() => {
    if (distributionData.length === 0) return [];
    const activeTotal = distributionData.reduce((acc, curr) => acc + curr.count, 0);

    if (activeTotal > 0) {
      const inactiveItems = distributionData.filter((d) => d.count === 0);
      const inactiveShareTotal = Math.min(24, inactiveItems.length * 6);
      const activeSharePool = 100 - inactiveShareTotal;

      return distributionData.map((item) => {
        if (item.count > 0) {
          const sliceVal = Math.round((item.count / activeTotal) * activeSharePool);
          return { ...item, sliceValue: sliceVal };
        } else {
          const sliceVal = Math.round(inactiveShareTotal / (inactiveItems.length || 1));
          return { ...item, sliceValue: sliceVal };
        }
      });
    } else {
      const equalShare = Math.round(100 / distributionData.length);
      return distributionData.map((item) => ({ ...item, sliceValue: equalShare }));
    }
  }, [distributionData]);

  return (
    <section className="flex h-full min-h-[320px] flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-950 dark:text-white">
            Plan Distribution
          </h2>
          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            Active subscription split ({totalActiveSubs} Active)
          </p>
        </div>

        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          Live DB
        </span>
      </div>

      <div className="flex flex-1 flex-col justify-center">
        <div className="mx-auto mt-3 h-[170px] w-full">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieChartData}
                  innerRadius={48}
                  outerRadius={76}
                  paddingAngle={3}
                  dataKey="sliceValue"
                  labelLine={false}
                  label={renderCustomizedLabel}
                >
                  {pieChartData.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={entry.color || PALETTE[index % PALETTE.length]}
                    />
                  ))}
                </Pie>

                <Tooltip
                  formatter={(value, name, props) => {
                    const safeValue =
                      typeof value === "number" ? value : Number(value ?? 0);
                    const payload = props.payload as PlanDistributionItem;
                    const subLabel =
                      payload?.count !== undefined
                        ? `${payload.count} Subscriptions (${safeValue}%)`
                        : `${safeValue}%`;
                    return [subLabel, "Share"];
                  }}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="mt-4 space-y-2.5">
          {distributionData.map((item) => (
            <div
              key={item.name}
              className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950/50"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: item.color }}
                />

                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {item.name}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                  {item.count} {item.count === 1 ? "Sub" : "Subs"}
                </span>
                <span className="font-bold text-slate-950 dark:text-white text-xs bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                  {item.value}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
