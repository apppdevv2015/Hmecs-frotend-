// src/utils/chartTheme.ts

export const getChartTheme = (isDark: boolean) => {
  return {
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
};
