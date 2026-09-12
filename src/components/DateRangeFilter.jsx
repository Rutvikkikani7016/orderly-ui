import React from 'react';

/**
 * Modern, theme-matching Date Range Filter Component
 * Formats and styles "From" and "To" date pickers with icons, readable date pills & reset button.
 */
export default function DateRangeFilter({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onClear,
  showClear = true,
  className = '',
}) {
  // Format readable date string (e.g., "15 Aug 2026")
  const formatReadable = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const hasFilter = Boolean(startDate || endDate);

  return (
    <div
      className={`bg-white/90 border border-border rounded-xl p-2 sm:px-3 sm:py-2.5 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs transition-all ${className}`}
    >
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {/* Calendar Icon Badge */}
        <div className="flex items-center gap-1.5 text-gray-500 font-medium">
          <div className="w-6 h-6 rounded-md bg-accent-light text-accent flex items-center justify-center flex-shrink-0">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <span className="text-[11px] font-semibold text-gray-600">Date Range:</span>
        </div>

        {/* Inputs Group Container */}
        <div className="flex items-center gap-1.5 bg-gray-50/80 border border-border/80 rounded-lg p-1">
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-gray-400 font-medium pl-1.5">From:</span>
            <input
              type="date"
              value={startDate || ''}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="h-7 px-2 bg-white border border-border rounded-md text-[11px] text-ink font-medium outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 cursor-pointer shadow-2xs"
            />
          </div>

          <span className="text-gray-400 font-medium text-xs px-0.5">→</span>

          <div className="flex items-center gap-1">
            <span className="text-[11px] text-gray-400 font-medium">To:</span>
            <input
              type="date"
              value={endDate || ''}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="h-7 px-2 bg-white border border-border rounded-md text-[11px] text-ink font-medium outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 cursor-pointer shadow-2xs"
            />
          </div>
        </div>

        {/* Human-Readable Range Preview Badge */}
        {hasFilter && (
          <div className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 text-[11px] font-medium border border-blue-200/60">
            <span>{startDate ? formatReadable(startDate) : 'Start'}</span>
            <span className="text-blue-400">to</span>
            <span>{endDate ? formatReadable(endDate) : 'Present'}</span>
          </div>
        )}
      </div>

      {/* Clear/Reset Action */}
      {showClear && hasFilter && (
        <button
          type="button"
          onClick={onClear}
          className="flex items-center gap-1 text-[11px] font-medium text-gray-500 hover:text-red-600 px-2 py-1 rounded-md hover:bg-red-50/60 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span>Reset Range</span>
        </button>
      )}
    </div>
  );
}
