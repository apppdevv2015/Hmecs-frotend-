import { useState } from "react";
import { ClipboardCheck } from "lucide-react";
import { operatorTasks } from "./operatorData";

const OperatorTasks = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const totalPages = Math.ceil(operatorTasks.length / itemsPerPage);
  const paginatedTasks = operatorTasks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
              Daily Work
            </p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
              My Tasks
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Track assigned work, priority and task completion status.
            </p>
          </div>
          <ClipboardCheck className="h-9 w-9 text-blue-600" />
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
              <tr>
                <th className="px-5 py-4">Task</th>
                <th className="px-5 py-4">Machine</th>
                <th className="px-5 py-4">Priority</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Due Date</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTasks.map((task) => (
                <tr
                  key={task.id}
                  className="border-t border-slate-100 dark:border-slate-800"
                >
                  <td className="px-5 py-4 font-medium text-slate-900 dark:text-white">
                    {task.title}
                  </td>
                  <td className="px-5 py-4 text-slate-600 dark:text-slate-400">
                    {task.machine}
                  </td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                      {task.priority}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-600 dark:text-slate-400">
                    {task.status}
                  </td>
                  <td className="px-5 py-4 text-slate-600 dark:text-slate-400">
                    {task.dueDate}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 p-4 dark:border-slate-800">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => prev - 1)}
              className="rounded-xl border px-4 py-2 text-sm disabled:opacity-50 dark:border-slate-700"
            >
              Previous
            </button>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((prev) => prev + 1)}
              className="rounded-xl border px-4 py-2 text-sm disabled:opacity-50 dark:border-slate-700"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OperatorTasks;