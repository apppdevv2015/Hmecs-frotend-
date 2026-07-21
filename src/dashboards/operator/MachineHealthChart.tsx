import React, { useEffect, useState } from "react";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ComponentType = {
  category: string;
  condition?: number;
};

type MachineType = {
  machineId: string;
  machineName: string;
  machineType: string;
  fleetId: string;
  hoursRun?: number;

  components?: {
    tyre?: {
      health: number;
    };

    engine?: {
      health: number;
    };

    hydraulic?: {
      health: number;
    };

    transmission?: {
      health: number;
    };
  };
};

type Props = {
  machine?: MachineType;
};

const MachineHealthDashboard: React.FC<Props> = ({ machine }) => {
  const [chartData, setChartData] = useState<{ time: string; machineHealth: number }[]>([]);

  const getComponentHealth = (category: string) => {
    switch (category.toLowerCase()) {
      case "engine":
        return machine?.components?.engine?.health ?? 0;

      case "tyre":
        return machine?.components?.tyre?.health ?? 0;

      case "hydraulic":
        return machine?.components?.hydraulic?.health ?? 0;

      case "transmission":
        return machine?.components?.transmission?.health ?? 0;

      default:
        return 0;
    }
  };

  const engineHealth = getComponentHealth("engine");

  const tyreHealth = getComponentHealth("tyre");

  const hydraulicHealth = getComponentHealth("hydraulic");

  const transmissionHealth = getComponentHealth("transmission");

  const overallHealth = Math.round(
    (engineHealth + tyreHealth + hydraulicHealth + transmissionHealth) / 4,
  );

  const miniHealth = [
    {
      name: "Engine",
      value: engineHealth,
    },
    {
      name: "Tyre",
      value: tyreHealth,
    },
    {
      name: "Hydraulic",
      value: hydraulicHealth,
    },
    {
      name: "Transmission",
      value: transmissionHealth,
    },
  ];

  const healthyCount = miniHealth.filter((item) => item.value >= 80).length;

  const warningCount = miniHealth.filter((item) => item.value >= 50 && item.value < 80).length;

  const criticalCount = miniHealth.filter((item) => item.value < 50).length;

  useEffect(() => {
    const interval = setInterval(() => {
      const time = new Date().toLocaleTimeString([], {
        minute: "2-digit",
        second: "2-digit",
      });

      setChartData((prev) => [
        ...prev.slice(-35),
        {
          time,
          machineHealth: overallHealth,
        },
      ]);
    }, 1500);

    return () => clearInterval(interval);
  }, [overallHealth]);

  return (
    <div className="min-h-screen bg-[#0B1120] p-6">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        {/* Main Chart */}
        <div className="rounded-2xl border border-slate-800 bg-[#081226] p-4 shadow-xl sm:p-5 xl:col-span-9">
          {/* Heading */}
          <div className="mb-5">
            <h2 className="text-xl font-bold text-white sm:text-2xl">Machine Health Monitoring</h2>

            <p className="text-sm text-slate-400">Realtime Operator Monitoring</p>
          </div>

          {/* Real Machine Health Graph */}
          <div className="rounded-2xl bg-[#0F172A] p-4 sm:p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-semibold text-white sm:text-lg">
                  Machine Health Signal
                </h3>

                <p className="text-sm text-slate-500">Live Machine Monitoring</p>
              </div>

              <div className="flex w-fit items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />

                <span className="text-sm font-medium text-emerald-400">Live</span>
              </div>
            </div>

            <div className="h-[280px] w-full sm:h-[380px] lg:h-[520px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{
                    top: 20,
                    right: 15,
                    left: -15,
                    bottom: 0,
                  }}
                >
                  {/* Grid */}
                  <CartesianGrid stroke="#172033" strokeDasharray="2 4" />

                  {/* X Axis */}
                  <XAxis
                    dataKey="time"
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                    minTickGap={35}
                    tick={{
                      fill: "#64748B",
                      fontSize: 12,
                    }}
                  />

                  {/* Y Axis */}
                  <YAxis
                    width={35}
                    domain={[40, 100]}
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill: "#64748B",
                      fontSize: 12,
                    }}
                  />

                  {/* Tooltip */}
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#081226",
                      border: "1px solid #1E293B",
                      borderRadius: "14px",
                      color: "#fff",
                      boxShadow: "0px 10px 40px rgba(0,0,0,0.45)",
                    }}
                  />

                  {/* Machine Health Signal */}
                  <Area
                    type="linear"
                    dataKey="machineHealth"
                    stroke="#00E676"
                    fill="transparent"
                    strokeWidth={2}
                    dot={false}
                    activeDot={false}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Health Side Card */}
        <div className="rounded-2xl border border-slate-800 bg-[#081226] p-4 sm:p-5 xl:col-span-3">
          <h2 className="mb-6 text-lg font-semibold text-white">Component Health</h2>

          <div className="space-y-5">
            {miniHealth.map((item) => (
              <div key={item.name}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm text-slate-300">{item.name}</span>

                  <span className="text-sm font-semibold text-green-400">{item.value}%</span>
                </div>

                <div className="h-3 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-green-500 transition-all duration-700"
                    style={{
                      width: `${item.value}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Overall Health Card */}
          <div className="mt-8 rounded-2xl border border-slate-700 bg-[#0F172A] p-4 sm:p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-sm font-semibold text-white sm:text-base">
                Overall Machine Health
              </h3>

              <span className="w-fit rounded-full bg-green-500/20 px-3 py-1 text-xs font-semibold text-green-400">
                {overallHealth >= 80 ? "Healthy" : overallHealth >= 50 ? "Warning" : "Critical"}
              </span>
            </div>

            <div className="rounded-xl bg-[#081226] p-3 sm:p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="text-sm text-slate-400">Current Status</span>

                <span className="text-base font-bold text-green-400 sm:text-lg">
                  {overallHealth}%
                </span>
              </div>

              <div className="h-3 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-green-500 transition-all duration-700"
                  style={{
                    width: `${overallHealth}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:col-span-12 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-[#081226] p-5">
            <p className="text-sm text-slate-400">Healthy Components</p>

            <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-green-400">{healthyCount}</h2>

            <p className="mt-2 text-sm text-slate-500">Running stable</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#081226] p-5">
            <p className="text-sm text-slate-400">Warning Alerts</p>

            <h2 className="mt-2 text-3xl font-bold text-yellow-400">{warningCount}</h2>

            <p className="mt-2 text-sm text-yellow-500">Needs attention</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#081226] p-5">
            <p className="text-sm text-slate-400">Critical Issues</p>

            <h2 className="mt-2 text-3xl font-bold text-red-400">{criticalCount}</h2>

            <p className="mt-2 text-sm text-red-500">Immediate action</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MachineHealthDashboard;
