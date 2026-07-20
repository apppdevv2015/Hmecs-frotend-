import React, { useEffect, useMemo, useState } from "react";

import Highcharts from "highcharts/highstock";
import HighchartsReact from "highcharts-react-official";

type CandleData = [number, number, number, number, number];

const AnalyticsChart: React.FC = () => {
  const isDark = useMemo(
    () => document.documentElement.classList.contains("dark"),
    [],
  );
  const [selectedPeriod, setSelectedPeriod] = useState<
    "daily" | "weekly" | "monthly" | "yearly"
  >("daily");

  // =========================
  // THEME
  // =========================

  const theme = {
    title: isDark ? "#FFFFFF" : "#0F172A",

    subtitle: isDark ? "#94A3B8" : "#475569",

    text: isDark ? "#CBD5E1" : "#334155",

    axis: isDark ? "#CBD5E1" : "#334155",

    grid: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",

    border: isDark ? "#334155" : "#E2E8F0",

    cardBg: isDark ? "#0F172A" : "#FFFFFF",

    tooltipBg: isDark ? "#1E293B" : "#FFFFFF",

    tooltipText: isDark ? "#FFFFFF" : "#0F172A",

    shadow: isDark ? "none" : "0 12px 30px rgba(15,23,42,0.08)",
  };

  // =========================
  // KPI DATA
  // API READY
  // =========================

  const totalPlansSold = 1248;
  const totalRevenue = 847500;
  const topPlan = "Pro";
  const bestMonth = "June";

  // =========================
  // PLAN SALES DISTRIBUTION
  // =========================

  const planSales = [
    {
      name: "Demo",
      sales: 42,
      color: "#64748B",
    },
    {
      name: "Basic",
      sales: 120,
      color: "#3B82F6",
    },
    {
      name: "Standard",
      sales: 240,
      color: "#8B5CF6",
    },
    {
      name: "Pro",
      sales: 410,
      color: "#10B981",
    },
    {
      name: "Enterprise",
      sales: 92,
      color: "#F59E0B",
    },
  ];

  // =========================
  // DUMMY CANDLE DATA
  // API READY
  // =========================

  const generateDummyData = (
    period: "daily" | "weekly" | "monthly" | "yearly",
  ): CandleData[] => {
    const data: CandleData[] = [];

    let totalPoints = 80;

    let interval = 60000;

    let price = 375;

    switch (period) {
      case "weekly":
        totalPoints = 50;
        interval = 86400000;
        break;

      case "monthly":
        totalPoints = 30;
        interval = 86400000 * 7;
        break;

      case "yearly":
        totalPoints = 12;
        interval = 86400000 * 30;
        break;

      default:
        totalPoints = 80;
        interval = 60000;
    }

    let time = Date.UTC(2025, 0, 1, 9, 20);

    for (let i = 0; i < totalPoints; i++) {
      const open = price;

      const move = (Math.random() - 0.5) * 3;

      const close = open + move;

      const high = Math.max(open, close) + Math.random() * 1.5;

      const low = Math.min(open, close) - Math.random() * 1.5;

      data.push([
        time,
        Number(open.toFixed(2)),
        Number(high.toFixed(2)),
        Number(low.toFixed(2)),
        Number(close.toFixed(2)),
      ]);

      price = close;

      time += interval;
    }

    return data;
  };

  const candleData = useMemo(() => {
    return generateDummyData(selectedPeriod);
  }, [selectedPeriod]);



  const options: Highcharts.Options = {
    chart: {
      backgroundColor: "transparent",
      height: 520,
      spacing: [10, 10, 10, 10],
    },

    title: {
      text: "",
    },

    credits: {
      enabled: false,
    },

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

            style: {
              color: "#fff",
            },
          },
        },
      },

      buttons: [
        {
          type: "minute",
          count: 15,
          text: "15m",
        },
        {
          type: "hour",
          count: 1,
          text: "1h",
        },
        {
          type: "all",
          text: "All",
        },
      ],
    },

    xAxis: {
      type: "datetime",

      ordinal: false,

      minPadding: 0.02,
      maxPadding: 0.02,

      tickPixelInterval: 120,

      gridLineWidth: 1,

      gridLineColor: isDark ? "rgba(255,255,255,0.08)" : "#E5E7EB",

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

      gridLineColor: isDark ? "rgba(255,255,255,0.12)" : "#D1D5DB",

      labels: {
        style: {
          color: isDark ? "#CBD5E1" : "#475569",

          fontWeight: "600",
          fontSize: "13px",
        },

        formatter() {
          return `${this.value}`;
        },
      },

      title: {
        text: "",
      },
    },

    navigator: {
      enabled: true,

      maskFill: isDark ? "rgba(59,130,246,0.15)" : "rgba(59,130,246,0.10)",

      outlineColor: theme.border,

      series: {
        color: "#111827",
        lineColor: "#111827",
      },
    },

    scrollbar: {
      enabled: true,
    },

    tooltip: {
      split: false,

      shared: true,

      backgroundColor: isDark ? "#0F172A" : "#FFFFFF",

      borderColor: isDark ? "#334155" : "#CBD5E1",

      borderRadius: 14,

      shadow: true,

      style: {
        color: isDark ? "#F8FAFC" : "#0F172A",

        fontSize: "13px",
        fontWeight: "500",
      },

      formatter: function () {
        const p = this.points?.[0] as any;

        if (!p) return "";

        return `
      <div style="
        padding:10px;
        color:${isDark ? "#F8FAFC" : "#0F172A"};
      ">
        <div style="
          font-weight:700;
          margin-bottom:8px;
        ">
          ${Highcharts.dateFormat("%I:%M %p", this.x as number)}
        </div>

        <div>
          Open:
          <b>${p.point.open}</b>
        </div>

        <div>
          High:
          <b>${p.point.high}</b>
        </div>

        <div>
          Low:
          <b>${p.point.low}</b>
        </div>

        <div>
          Close:
          <b>${p.point.close}</b>
        </div>
      </div>
    `;
      },
    },

    plotOptions: {
      candlestick: {
        color: "#F87171",
        upColor: "#90EE90",

        lineColor: "#F87171",
        upLineColor: "#90EE90",

        pointPadding: 0.05,
        groupPadding: 0.03,

        dataGrouping: {
          enabled: false,
        },
      },

      series: {
        animation: {
          duration: 500,
        },

        dataGrouping: {
          enabled: false,
        },
      },
    },

    series: [
      {
        type: "candlestick",
        name: "Sales",

        data: candleData,

        lastPrice: {
          enabled: true,

          color: "#F87171",

          label: {
            enabled: true,
            backgroundColor: "#F87171",
          },
        },
      },
    ],
  };
  return (
    <div
      className="
        rounded-[32px]
        border
        border-slate-200
        bg-white
        p-6
        transition-all
        duration-300
        dark:border-slate-800
        dark:bg-slate-900
      "
      style={{
        boxShadow: theme.shadow,
      }}
    >
      {/* HEADER */}
      <div className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2
            className="text-2xl font-bold"
            style={{
              color: theme.title,
            }}
          >
            Sales Analytics
          </h2>

          <p
            className="mt-1 text-sm"
            style={{
              color: theme.subtitle,
            }}
          >
            Track sales trends & business performance
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as any)}
            className="
      rounded-xl
      border
      border-slate-300
      bg-white
      px-4
      py-2
      text-sm
      font-medium
      text-slate-700
      outline-none
      transition-all
      dark:border-slate-700
      dark:bg-slate-900
      dark:text-slate-200
    "
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

            <h3 className="mt-1 text-xl font-bold text-blue-600">
              {totalPlansSold}
            </h3>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
            <p className="text-xs text-slate-500">Revenue</p>

            <h3 className="mt-1 text-xl font-bold text-emerald-600">
              {new Intl.NumberFormat("en-ZA", {
                style: "currency",
                currency: "ZAR",
                maximumFractionDigits: 0,
              }).format(totalRevenue)}
            </h3>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
            <p className="text-xs text-slate-500">Top Plan</p>

            <h3 className="mt-1 text-xl font-bold text-violet-600">
              {topPlan}
            </h3>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
            <p className="text-xs text-slate-500">Best Month</p>

            <h3 className="mt-1 text-xl font-bold text-amber-600">
              {bestMonth}
            </h3>
          </div>
        </div>
      </div>

      {/* GRAPH */}
      <div className="rounded-[24px] border border-slate-200 p-4 dark:border-slate-800">
        <HighchartsReact
          highcharts={Highcharts}
          constructorType="stockChart"
          options={options}
        />
      </div>

      {/* PLAN SALES */}
      <div className="mt-8">
        <h3
          className="mb-5 text-lg font-semibold"
          style={{
            color: theme.title,
          }}
        >
          Plan Sales Distribution
        </h3>

        <div className="space-y-4">
          {planSales.map((plan) => (
            <div key={plan.name}>
              <div className="mb-1 flex items-center justify-between">
                <span
                  className="text-sm font-medium"
                  style={{
                    color: theme.text,
                  }}
                >
                  {plan.name}
                </span>

                <span
                  className="text-sm font-semibold"
                  style={{
                    color: plan.color,
                  }}
                >
                  {plan.sales}
                </span>
              </div>

              <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${(plan.sales / 410) * 100}%`,
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
