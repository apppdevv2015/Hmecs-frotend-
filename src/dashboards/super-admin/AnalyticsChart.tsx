import React, { useEffect, useMemo, useState } from "react";
import Highcharts from "highcharts/highstock";
import HighchartsReact from "highcharts-react-official";
import { superAdminMachineService } from "../../services/SuperAdmin/machineService";
import { getChartTheme } from "../../utils/chartTheme";
import { generateDummyCandleData, generatePlanTrendData } from "../../utils/chartHelpers";

interface PlanSalesItem {
  name: string;
  sales: number;
  color: string;
}

interface PlanDistItem {
  name: string;
  count: number;
  price?: number;
  value?: number;
}

const AnalyticsChart: React.FC = () => {
  const isDark = useMemo(() => document.documentElement.classList.contains("dark"), []);

  const [selectedPeriod, setSelectedPeriod] = useState<"daily" | "weekly" | "monthly" | "yearly">(
    "daily",
  );

  const theme = useMemo(() => getChartTheme(isDark), [isDark]);

  // ==========================================
  // Backend API Integration (Plans & KPIs)
  // ==========================================
  const [planSales, setPlanSales] = useState<PlanSalesItem[]>([]);
  const [kpis, setKpis] = useState({
    totalPlansSold: 0,
    totalRevenue: 0,
    topPlan: "—",
    bestMonth: "June",
  });

  useEffect(() => {
    let isMounted = true;
    const loadStats = async () => {
      try {
        const dist = await superAdminMachineService.getDashboardPlanDistribution();
        if (!isMounted) return;

        const colorMap: Record<string, string> = {
          demo: "#64748B",
          basic: "#3B82F6",
          standard: "#8B5CF6",
          pro: "#10B981",
          enterprise: "#F59E0B",
        };

        const mappedPlanSales = dist.map((item: PlanDistItem) => {
          const lowerName = item.name.toLowerCase();
          return {
            name: item.name,
            sales: item.count,
            color: colorMap[lowerName] || "#3B82F6",
          };
        });

        // Compute KPIs from dynamic backend data
        const totalPlans = dist.reduce((acc: number, item: PlanDistItem) => acc + item.count, 0);
        const revenue = dist.reduce(
          (acc: number, item: PlanDistItem) => acc + item.count * (item.price || 0),
          0,
        );

        let top = "—";
        if (dist.length > 0) {
          const sorted = [...dist].sort((a: PlanDistItem, b: PlanDistItem) => b.count - a.count);
          top = sorted[0].name;
        }

        setPlanSales(mappedPlanSales);
        setKpis({
          totalPlansSold: totalPlans,
          totalRevenue: revenue,
          topPlan: top,
          bestMonth: "June",
        });
      } catch (err) {
        console.error("Error loading dashboard stats in AnalyticsChart:", err);
      }
    };

    loadStats();
    return () => {
      isMounted = false;
    };
  }, []);

  const maxSales = useMemo(() => {
    if (planSales.length === 0) return 1;
    const maxVal = Math.max(...planSales.map((p) => p.sales));
    return maxVal > 0 ? maxVal : 1;
  }, [planSales]);

  // ==========================================
  // Dynamic Charts Options Setup
  // ==========================================

  // 1. Sales Candlestick Chart (Profit/Loss trends)
  const candleData = useMemo(() => {
    return generateDummyCandleData(selectedPeriod);
  }, [selectedPeriod]);

  const salesChartOptions: Highcharts.Options = {
    chart: {
      backgroundColor: "transparent",
      height: 400,
      spacing: [10, 10, 10, 10],
    },
    title: { text: "" },
    credits: { enabled: false },
    rangeSelector: {
      selected: 1,
      inputEnabled: false,
      buttonTheme: {
        fill: isDark ? "#111827" : "#F8FAFC",
        stroke: "transparent",
        r: 6,
        style: {
          color: theme.text,
          fontWeight: "500",
        },
        states: {
          hover: {
            fill: isDark ? "#1E293B" : "#E2E8F0",
          },
          select: {
            fill: "#1D4ED8",
            style: { color: "#fff" },
          },
        },
      },
      buttons: [
        { type: "minute", count: 15, text: "15m" },
        { type: "hour", count: 1, text: "1h" },
        { type: "all", text: "All" },
      ],
    },
    xAxis: {
      type: "datetime",
      ordinal: false,
      minPadding: 0.02,
      maxPadding: 0.02,
      tickPixelInterval: 120,
      gridLineWidth: 1,
      gridLineColor: theme.grid,
      lineColor: theme.border,
      tickColor: theme.border,
      labels: {
        style: {
          color: theme.axis,
          fontSize: "12px",
        },
      },
    },
    yAxis: {
      opposite: true,
      gridLineWidth: 1,
      gridLineColor: theme.grid,
      labels: {
        style: {
          color: isDark ? "#CBD5E1" : "#475569",
          fontWeight: "600",
          fontSize: "13px",
        },
      },
      title: { text: "" },
    },
    navigator: {
      enabled: true,
      maskFill: isDark ? "rgba(59,130,246,0.15)" : "rgba(59,130,246,0.10)",
      outlineColor: theme.border,
      series: {
        color: "#3B82F6",
        lineColor: "#3B82F6",
      },
    },
    scrollbar: { enabled: true },
    tooltip: {
      split: false,
      shared: true,
      backgroundColor: theme.tooltipBg,
      borderColor: theme.border,
      borderRadius: 14,
      shadow: true,
      style: {
        color: theme.tooltipText,
        fontSize: "13px",
        fontWeight: "500",
      },
      formatter: function () {
        const p = this.points?.[0] as unknown as {
          point: { open: number; high: number; low: number; close: number };
        };
        if (!p) return "";
        return `
          <div style="padding:10px; color:${theme.tooltipText};">
            <div style="font-weight:700; margin-bottom:8px;">
              ${Highcharts.dateFormat("%I:%M %p", this.x as number)}
            </div>
            <div>Open: <b>${p.point.open}</b></div>
            <div>High: <b><span style="color:#22c55e">${p.point.high}</span></b></div>
            <div>Low: <b><span style="color:#ef4444">${p.point.low}</span></b></div>
            <div>Close: <b>${p.point.close}</b></div>
          </div>
        `;
      },
    },
    plotOptions: {
      candlestick: {
        color: "#EF4444", // Red for sales drop
        upColor: "#22C55E", // Green for sales growth (profit)
        lineColor: "#EF4444",
        upLineColor: "#22C55E",
        pointPadding: 0.05,
        groupPadding: 0.03,
        dataGrouping: { enabled: false },
      },
      series: {
        animation: { duration: 500 },
        dataGrouping: { enabled: false },
      },
    },
    series: [
      {
        type: "candlestick",
        name: "Sales Volume",
        data: candleData,
        lastPrice: {
          enabled: true,
          color: "#3B82F6",
          label: {
            enabled: true,
            backgroundColor: "#3B82F6",
          },
        },
      },
    ],
  };

  // 2. Plans Trend Line Chart (kaunsa plan kis month zyada chal raha hai)
  const planTrendData = useMemo(() => generatePlanTrendData(), []);

  const planTrendOptions: Highcharts.Options = {
    chart: {
      type: "spline", // Curved lines for smooth visual trend representation
      backgroundColor: "transparent",
      height: 380,
      spacing: [10, 10, 10, 10],
    },
    title: { text: "" },
    credits: { enabled: false },
    xAxis: {
      categories: planTrendData.categories,
      gridLineWidth: 1,
      gridLineColor: theme.grid,
      lineColor: theme.border,
      tickColor: theme.border,
      labels: {
        style: {
          color: theme.axis,
          fontSize: "12px",
        },
      },
    },
    yAxis: {
      gridLineWidth: 1,
      gridLineColor: theme.grid,
      labels: {
        style: {
          color: isDark ? "#CBD5E1" : "#475569",
          fontWeight: "600",
          fontSize: "13px",
        },
      },
      title: {
        text: "Plans Purchased",
        style: {
          color: theme.axis,
          fontWeight: "500",
        },
      },
    },
    tooltip: {
      shared: true,
      backgroundColor: theme.tooltipBg,
      borderColor: theme.border,
      borderRadius: 14,
      shadow: true,
      style: {
        color: theme.tooltipText,
        fontSize: "13px",
      },
    },
    legend: {
      enabled: true,
      itemStyle: {
        color: theme.text,
        fontWeight: "600",
      },
    },
    plotOptions: {
      series: {
        marker: {
          enabled: true,
          radius: 4,
        },
        lineWidth: 3,
      },
    },
    series: planTrendData.series as Highcharts.SeriesOptionsType[],
  };

  return (
    <div className="rounded-[32px] border border-slate-200 bg-white p-6 transition-all duration-300 dark:border-slate-800 dark:bg-slate-900 shadow-xl dark:shadow-none">
      {/* HEADER */}
      <div className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-950 dark:text-white">
            Super Admin Sales & Subscription Analytics
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Track business revenue, sales trends, and plans performance metrics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as typeof selectedPeriod)}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 outline-none transition-all dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
            <p className="text-xs text-slate-500">Total Plans</p>
            <h3 className="mt-1 text-xl font-bold text-blue-600">{kpis.totalPlansSold}</h3>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
            <p className="text-xs text-slate-500">Revenue</p>
            <h3 className="mt-1 text-xl font-bold text-emerald-600">
              {new Intl.NumberFormat("en-ZA", {
                style: "currency",
                currency: "ZAR",
                maximumFractionDigits: 0,
              }).format(kpis.totalRevenue)}
            </h3>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
            <p className="text-xs text-slate-500">Top Plan</p>
            <h3 className="mt-1 text-xl font-bold text-violet-600">{kpis.topPlan}</h3>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
            <p className="text-xs text-slate-500">Best Month</p>
            <h3 className="mt-1 text-xl font-bold text-amber-600">{kpis.bestMonth}</h3>
          </div>
        </div>
      </div>

      {/* GRAPH GRIDS */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Sales Candlestick Chart (Profit / Loss Tracker) */}
        <div className="rounded-[24px] border border-slate-200 p-4 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-950 dark:text-white">
              Sales Volume Trend (Profit vs Loss)
            </h3>
            <p className="text-xs text-slate-500">
              Green represents sales growth (Profit); Red represents sales decrease (Loss).
            </p>
          </div>
          <HighchartsReact
            highcharts={Highcharts}
            constructorType="stockChart"
            options={salesChartOptions}
          />
        </div>

        {/* Plans Monthly Performance Trend */}
        <div className="rounded-[24px] border border-slate-200 p-4 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-950 dark:text-white">
              Monthly Plan Performance Trends
            </h3>
            <p className="text-xs text-slate-500">
              Compare sales performance of different plans (Demo, Basic, Standard, etc.) by month.
            </p>
          </div>
          <HighchartsReact
            highcharts={Highcharts}
            constructorType="chart"
            options={planTrendOptions}
          />
        </div>
      </div>

      {/* PLAN SALES DISTRIBUTION (Progress bars at bottom) */}
      <div className="mt-8">
        <h3 className="mb-5 text-lg font-semibold text-slate-950 dark:text-white">
          Active Plan Sales Share
        </h3>

        <div className="space-y-4">
          {planSales.map((plan) => (
            <div key={plan.name}>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {plan.name}
                </span>

                <span className="text-sm font-semibold" style={{ color: plan.color }}>
                  {plan.sales} Sold
                </span>
              </div>

              <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${(plan.sales / maxSales) * 100}%`,
                    background: plan.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsChart;
