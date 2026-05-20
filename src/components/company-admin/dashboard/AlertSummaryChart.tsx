export default function AlertSummaryChart() {
  const alerts = [
    {
      title: "Engine Alerts",
      count: 2,
      bg: "bg-blue-50 dark:bg-blue-500/10",
      text: "text-blue-600 dark:text-blue-400",
      border: "border-blue-100 dark:border-blue-500/20",
    },
    {
      title: "Tyre Alerts",
      count: 1,
      bg: "bg-orange-50 dark:bg-orange-500/10",
      text: "text-orange-500 dark:text-orange-400",
      border: "border-orange-100 dark:border-orange-500/20",
    },
    {
      title: "Hydraulic Alerts",
      count: 2,
      bg: "bg-sky-50 dark:bg-sky-500/10",
      text: "text-sky-600 dark:text-sky-400",
      border: "border-sky-100 dark:border-sky-500/20",
    },
    {
      title: "Transmission Alerts",
      count: 1,
      bg: "bg-slate-100 dark:bg-slate-700/30",
      text: "text-slate-700 dark:text-slate-300",
      border: "border-slate-200 dark:border-slate-600/30",
    },
  ];

  return (
    <div className="rounded-[2rem] border border-blue-100 bg-white p-6 shadow-sm transition-all dark:border-slate-700 dark:bg-[#0F172A]">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-500">
            Fleet Monitoring
          </p>

          <h2 className="mt-1 text-xl font-black tracking-tight text-slate-900 dark:text-white">
            Alert Summary
          </h2>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-500 dark:bg-blue-500/10 dark:text-blue-400">
          <span className="text-lg font-black">!</span>
        </div>
      </div>

      {/* Cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {alerts.map((alert, index) => (
          <div
            key={index}
            className={`rounded-2xl border p-4 transition-all hover:scale-[1.02] hover:shadow-md ${alert.bg} ${alert.border}`}
          >
            <div className="flex items-center justify-between">
              
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  {alert.title}
                </p>

                <h3 className={`mt-2 text-3xl font-black ${alert.text}`}>
                  {alert.count}
                </h3>
              </div>

              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${alert.bg}`}
              >
                <div className={`h-3 w-3 rounded-full ${alert.text.replace("text", "bg")}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/50">
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          Total Active Alerts:
          <span className="ml-2 font-black text-blue-600 dark:text-blue-400">
            6 Alerts
          </span>
        </p>
      </div>
    </div>
  );
}