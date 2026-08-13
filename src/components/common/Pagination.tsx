type PaginationProps = {
  currentPage: number;
  totalPages: number;
  startItem: number;
  endItem: number;
  totalItems: number;
  itemsPerPage?: number | "all";
  itemLabel?: string;
  pageSizeOptions?: number[];
  onPrev: () => void;
  onNext: () => void;
  onItemsPerPageChange?: (val: number | "all") => void;
};

export default function Pagination({
  currentPage,
  totalPages,
  startItem,
  endItem,
  totalItems,
  itemsPerPage = 10,
  itemLabel = "items",
  pageSizeOptions = [5, 10, 20, 50],
  onPrev,
  onNext,
  onItemsPerPageChange,
}: PaginationProps) {
  if (totalItems === 0) return null;

  const isShowAll = itemsPerPage === "all";

  return (
    <div className="flex shrink-0 flex-col gap-3 border-t border-slate-200 px-5 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          {isShowAll
            ? `Showing all ${totalItems} ${itemLabel}`
            : `Showing ${startItem} - ${endItem} of ${totalItems} ${itemLabel}`}
        </p>

        {onItemsPerPageChange && (
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50/80 p-1 dark:border-slate-700/60 dark:bg-[#0b1728]">
            <span className="px-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              Show:
            </span>
            {pageSizeOptions.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => onItemsPerPageChange(size)}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                  itemsPerPage === size
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                {size}
              </button>
            ))}
            <button
              type="button"
              onClick={() => onItemsPerPageChange("all")}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                isShowAll
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              Show All
            </button>
          </div>
        )}
      </div>

      {!isShowAll && (
        <div className="flex items-center justify-between gap-2.5 sm:justify-end">
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={onPrev}
            className="h-9 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Previous
          </button>

          <div className="rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-extrabold text-white shadow-xs">
            {currentPage} / {totalPages || 1}
          </div>

          <button
            type="button"
            disabled={currentPage === totalPages || totalPages === 0}
            onClick={onNext}
            className="h-9 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}