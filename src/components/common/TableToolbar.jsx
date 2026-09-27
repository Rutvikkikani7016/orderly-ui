import React from 'react';

/**
 * Standardized Search Bar for Orderly ERP
 * Features:
 * - 28px dense height (!h-7 / 28px)
 * - Magnifying glass search icon
 * - Clear (X) button when text is present
 * - Consistent border, focus ring, placeholder, font size
 */
export function SearchBar({
  value = '',
  onChange,
  onClear,
  placeholder = 'Search...',
  className = '',
  style = {},
  autoFocus = false,
  disabled = false,
}) {
  return (
    <div className={`relative max-w-sm w-full ${className}`}>
      {/* Search Icon */}
      <svg
        className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>

      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange && onChange(e.target.value)}
        disabled={disabled}
        autoFocus={autoFocus}
        className="!h-7 !min-h-0 w-full pr-7 text-[11px] bg-white border border-border text-ink rounded-md outline-none focus:border-accent focus:ring-1 focus:ring-accent placeholder-gray-400 !py-0 shadow-2xs transition-colors"
        style={{ height: '28px', minHeight: '28px', paddingLeft: '2rem', ...style }}
      />

      {/* Clear Button */}
      {value && (
        <button
          type="button"
          onClick={() => {
            if (onClear) onClear();
            else if (onChange) onChange('');
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-ink text-xs font-bold w-4 h-4 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          title="Clear search"
        >
          &times;
        </button>
      )}
    </div>
  );
}

/**
 * Standardized Toolbar container positioned at the top of tables/cards
 * Features:
 * - Left slot for search and filter controls
 * - Right slot for buttons and actions
 */
export function TableToolbar({
  children,
  left,
  right,
  className = '',
}) {
  return (
    <div className={`shrink-0 py-1.5 px-3 border-b border-border bg-gray-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${className}`}>
      {/* If left/right props provided, use structured slots */}
      {left || right ? (
        <>
          <div className="flex flex-wrap items-center gap-2 flex-1">
            {left}
          </div>
          {right && (
            <div className="flex items-center space-x-1.5 shrink-0">
              {right}
            </div>
          )}
        </>
      ) : (
        // Otherwise render children directly
        children
      )}
    </div>
  );
}

export default TableToolbar;
