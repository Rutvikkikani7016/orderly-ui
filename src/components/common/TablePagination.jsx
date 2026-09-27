import React from 'react';

/**
 * Standardized Dense Table Pagination Bar for Orderly ERP
 * Features:
 * - Showing X to Y of Z count indicator
 * - Rows per page dropdown selector
 * - Fast navigation buttons: First («), Prev (‹), Page indicator, Next (›), Last (»)
 * - Consistent border, font size, button heights
 */
export default function TablePagination({
  page = 1,
  limit = 15,
  total = 0,
  totalPages,
  onPageChange,
  onLimitChange,
  limitOptions = [10, 15, 20, 25, 50, 100],
  itemName = 'records',
  className = '',
}) {
  const computedTotalPages = totalPages !== undefined ? totalPages : Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(Math.max(1, page), computedTotalPages);

  const startRecord = total > 0 ? (safePage - 1) * limit + 1 : 0;
  const endRecord = Math.min(safePage * limit, total);

  return (
    <div className={`shrink-0 px-3 py-1.5 bg-gray-50/80 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-gray-600 ${className}`}>
      {/* Left: Record Range Summary & Rows Dropdown */}
      <div className="flex items-center space-x-3">
        <div>
          Showing <span className="font-bold text-gray-900">{startRecord}</span> to{' '}
          <span className="font-bold text-gray-900">{endRecord}</span> of{' '}
          <span className="font-bold text-gray-900">{total}</span> {itemName}
        </div>

        {/* Rows Per Page Selector */}
        {onLimitChange && (
          <div className="flex items-center space-x-1.5 pl-2 border-l border-gray-300">
            <span className="text-[11px] text-gray-500">Rows:</span>
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="h-6 px-1.5 bg-white border border-gray-300 rounded text-[11px] text-gray-800 outline-none focus:border-accent cursor-pointer shadow-2xs"
            >
              {limitOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right: Page Navigation Jump Controls */}
      <div className="flex items-center space-x-1">
        <button
          type="button"
          onClick={() => onPageChange && onPageChange(1)}
          disabled={safePage <= 1}
          className="h-6 px-2 text-[11px] font-medium bg-white border border-gray-300 rounded text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs cursor-pointer"
          title="First Page"
        >
          &laquo;
        </button>
        <button
          type="button"
          onClick={() => onPageChange && onPageChange(safePage - 1)}
          disabled={safePage <= 1}
          className="h-6 px-2 text-[11px] font-medium bg-white border border-gray-300 rounded text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs cursor-pointer"
          title="Previous Page"
        >
          &lsaquo; Prev
        </button>

        <span className="px-2 text-[11px] font-mono text-gray-700">
          Page <strong className="text-gray-900">{safePage}</strong> / {computedTotalPages}
        </span>

        <button
          type="button"
          onClick={() => onPageChange && onPageChange(safePage + 1)}
          disabled={safePage >= computedTotalPages}
          className="h-6 px-2 text-[11px] font-medium bg-white border border-gray-300 rounded text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs cursor-pointer"
          title="Next Page"
        >
          Next &rsaquo;
        </button>
        <button
          type="button"
          onClick={() => onPageChange && onPageChange(computedTotalPages)}
          disabled={safePage >= computedTotalPages}
          className="h-6 px-2 text-[11px] font-medium bg-white border border-gray-300 rounded text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs cursor-pointer"
          title="Last Page"
        >
          &raquo;
        </button>
      </div>
    </div>
  );
}
