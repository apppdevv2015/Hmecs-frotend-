// src/utils/chartHelpers.ts

export type CandleData = [number, number, number, number, number];

/**
 * Generates dummy OHLC data for the Sales Candlestick Chart.
 */
export const generateDummyCandleData = (
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

/**
 * Generates dummy monthly sales numbers for each Subscription Plan.
 */
export const generatePlanTrendData = () => {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const demoData = [120, 135, 140, 145, 160, 155, 170, 165, 180, 175, 190, 200];
  const basicData = [80, 95, 110, 105, 120, 130, 145, 140, 160, 165, 170, 185];
  const standardData = [40, 45, 55, 60, 75, 80, 90, 85, 100, 110, 115, 125];
  const proData = [20, 28, 30, 35, 45, 50, 58, 62, 70, 75, 85, 95];
  const enterpriseData = [5, 8, 10, 12, 15, 14, 18, 20, 22, 25, 28, 32];

  return {
    categories: months,
    series: [
      { name: "Demo", data: demoData, color: "#64748B" },
      { name: "Basic", data: basicData, color: "#3B82F6" },
      { name: "Standard", data: standardData, color: "#8B5CF6" },
      { name: "Pro", data: proData, color: "#10B981" },
      { name: "Enterprise", data: enterpriseData, color: "#F59E0B" },
    ],
  };
};
