import { Plus, ChevronDown, Save } from "lucide-react";

export default function AddComponent() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 dark:bg-slate-950 lg:p-10">
      <div className="mx-auto max-w-[1400px]">
        {/* Main Form Container */}
        <div className="overflow-hidden rounded-[2.5rem] border border-blue-100 bg-white shadow-sm dark:border-slate-700 dark:bg-[#0F172A]">
          {/* Header */}
          <div className="flex items-center gap-5 border-b border-blue-50 p-10 dark:border-slate-700/50">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
              <Plus size={28} />
            </div>

            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-500">
                Component Management
              </p>

              <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Add New Component
              </h1>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Register a component to the lifecycle tracker
              </p>
            </div>
          </div>

          <form className="space-y-12 p-10">
            {/* Machine & Equipment */}
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-500">
                  Machine & Equipment
                </p>

                <div className="h-px flex-1 bg-blue-100 dark:bg-slate-700" />
              </div>

              <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="ml-1 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Machine ID
                    <span className="text-orange-500">*</span>
                  </label>

                  <input
                    type="text"
                    placeholder="CK&IJ-990-020"
                    className="w-full rounded-2xl border border-blue-100 bg-[#F8FAFC] px-6 py-4 text-sm font-bold text-slate-900 placeholder:text-slate-300 transition-all focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="ml-1 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Equipment Type
                  </label>

                  <input
                    type="text"
                    placeholder="FEL"
                    className="w-full rounded-2xl border border-blue-100 bg-[#F8FAFC] px-6 py-4 text-sm font-bold text-slate-900 placeholder:text-slate-300 transition-all focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="ml-1 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Supplier
                  </label>

                  <input
                    type="text"
                    placeholder="CK & IJ Group"
                    className="w-full rounded-2xl border border-blue-100 bg-[#F8FAFC] px-6 py-4 text-sm font-bold text-slate-900 placeholder:text-slate-300 transition-all focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Component Details */}
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-500">
                  Component Details
                </p>

                <div className="h-px flex-1 bg-blue-100 dark:bg-slate-700" />
              </div>

              <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="ml-1 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Category
                    <span className="text-orange-500">*</span>
                  </label>

                  <div className="relative">
                    <select className="appearance-none w-full rounded-2xl border border-blue-100 bg-[#F8FAFC] px-6 py-4 text-sm font-bold text-slate-900 transition-all focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                      <option>Tyre</option>
                      <option>Engine</option>
                      <option>Hydraulic</option>
                      <option>Brake</option>
                    </select>

                    <ChevronDown
                      size={16}
                      className="pointer-events-none absolute right-6 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="ml-1 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Description
                    <span className="text-orange-500">*</span>
                  </label>

                  <input
                    type="text"
                    placeholder="Front Left Tyre"
                    className="w-full rounded-2xl border border-blue-100 bg-[#F8FAFC] px-6 py-4 text-sm font-bold text-slate-900 placeholder:text-slate-300 transition-all focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="ml-1 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Serial Number
                  </label>

                  <input
                    type="text"
                    placeholder="TY-990-001"
                    className="w-full rounded-2xl border border-blue-100 bg-[#F8FAFC] px-6 py-4 text-sm font-bold text-slate-900 placeholder:text-slate-300 transition-all focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Lifecycle & Cost */}
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-500">
                  Lifecycle & Cost
                </p>

                <div className="h-px flex-1 bg-blue-100 dark:bg-slate-700" />
              </div>

              <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                {[
                  "Install Hours",
                  "Current Hours",
                  "Planned Life (hrs)",
                  "Replacement Cost (R)",
                ].map((label, index) => (
                  <div key={index} className="space-y-2">
                    <label className="ml-1 text-[10px] font-black uppercase tracking-wider text-slate-500">
                      {label}
                    </label>

                    <input
                      type="number"
                      defaultValue={0}
                      className="w-full rounded-2xl border border-blue-100 bg-[#F8FAFC] px-6 py-4 text-sm font-bold text-slate-900 transition-all focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                ))}

                <div className="space-y-2">
                  <label className="ml-1 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Condition
                  </label>

                  <div className="relative">
                    <select
                      defaultValue="3 - Monitor"
                      className="appearance-none w-full rounded-2xl border border-blue-100 bg-[#F8FAFC] px-6 py-4 text-sm font-bold text-slate-900 transition-all focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    >
                      <option>1 - New</option>
                      <option>2 - Good</option>
                      <option>3 - Monitor</option>
                      <option>4 - Warning</option>
                      <option>5 - Critical</option>
                    </select>

                    <ChevronDown
                      size={16}
                      className="pointer-events-none absolute right-6 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-4 border-t border-blue-50 pt-10 dark:border-slate-700/50">
              <button
                type="reset"
                className="rounded-2xl border border-blue-100 bg-white px-10 py-4 text-xs font-black uppercase tracking-[0.16em] text-slate-600 transition-all hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              >
                Clear Form
              </button>

              <button
                type="submit"
                className="flex items-center gap-3 rounded-2xl bg-blue-500 px-12 py-4 text-xs font-black uppercase tracking-[0.16em] text-white shadow-xl shadow-blue-500/20 transition-all hover:bg-blue-600"
              >
                <Save size={16} />
                Save Component
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
