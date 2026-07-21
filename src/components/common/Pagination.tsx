type PaginationProps = {
  currentPage: number;
  totalPages: number;
  startItem: number;
  endItem: number;
  totalItems: number;
  onPrev: () => void;
  onNext: () => void;
};

export default function Pagination({
  currentPage,
  totalPages,
  startItem,
  endItem,
  totalItems,
  onPrev,
  onNext,
}: PaginationProps) {
  if (totalItems === 0) return null;

  return (
    <div className="flex shrink-0 flex-col gap-2 border-t border-gray-200 px-3 py-2 dark:border-[#1F2A44] sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[11px] text-gray-500 dark:text-slate-400">
        Showing {startItem}-{endItem} of {totalItems}
      </p>

      <div className="flex items-center justify-between gap-2 sm:justify-end">
        <button
          disabled={currentPage === 1}
          onClick={onPrev}
          className="h-8 rounded-lg border border-gray-200 px-3 text-[11px] font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-[#1F2A44] dark:text-slate-300 dark:hover:bg-blue-500/10"
        >
          Previous
        </button>

        <span className="text-[11px] font-medium text-gray-600 dark:text-slate-300">
          Page {currentPage} of {totalPages || 1}
        </span>

        <button
          disabled={currentPage === totalPages || totalPages === 0}
          onClick={onNext}
          className="h-8 rounded-lg border border-gray-200 px-3 text-[11px] font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-[#1F2A44] dark:text-slate-300 dark:hover:bg-blue-500/10"
        >
          Next
        </button>
      </div>
    </div>
  );
}
