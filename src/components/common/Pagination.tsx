import React from "react";

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
  onPageChange?: (page: number) => void;
  onItemsPerPageChange?: (val: number | "all") => void;
};

export default function Pagination({
  currentPage,
  totalPages,
  startItem,
  endItem,
  totalItems,
  itemsPerPage = 10,
  itemLabel = "entries",
  pageSizeOptions = [5, 10, 25, 50],
  onPrev,
  onNext,
  onPageChange,
  onItemsPerPageChange,
}: PaginationProps) {
  if (totalItems === 0) return null;

  const isShowAll = itemsPerPage === "all";

  // Generate page numbers for quick jump if page count is reasonable
  const renderPageNumbers = () => {
    if (!onPageChange || totalPages <= 1) return null;
    const pages: number[] = [];
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <div className="hidden sm:flex items-center gap-1">
        {startPage > 1 && (
          <>
            <button
              type="button"
              onClick={() => onPageChange(1)}
              className="h-8 w-8 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              1
            </button>
            {startPage > 2 && <span className="px-1 text-xs text-slate-400">...</span>}
          </>
        )}
        {pages.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            className={`h-8 w-8 rounded-lg text-xs font-bold transition-all ${
              currentPage === p
                ? "bg-blue-600 text-white shadow-sm"
                : "border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            {p}
          </button>
        ))}
        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="px-1 text-xs text-slate-400">...</span>}
            <button
              type="button"
              onClick={() => onPageChange(totalPages)}
              className="h-8 w-8 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {totalPages}
            </button>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="flex shrink-0 flex-col gap-3 border-t border-slate-200 px-6 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
      {/* Information & Page Size Selector */}
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          {isShowAll
            ? `Showing all ${totalItems} ${itemLabel}`
            : `Showing ${startItem} to ${endItem} of ${totalItems} ${itemLabel}`}
        </p>

        {onItemsPerPageChange && (
          <div className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-[#101f33]">
            <span className="px-2 text-[11px] font-bold uppercase text-slate-400">
              Per Page:
            </span>
            {pageSizeOptions.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => onItemsPerPageChange(size)}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                  itemsPerPage === size
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:bg-slate-800"
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
                  : "text-slate-600 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              Show All
            </button>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      {!isShowAll && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={onPrev}
            className="h-8 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Previous
          </button>

          {renderPageNumbers()}

          <div className="sm:hidden rounded-lg bg-blue-600 px-3 py-1 text-xs font-bold text-white shadow-xs">
            {currentPage} / {totalPages || 1}
          </div>

          <button
            type="button"
            disabled={currentPage === totalPages || totalPages === 0}
            onClick={onNext}
            className="h-8 rounded-xl bg-blue-600 px-3 text-xs font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}