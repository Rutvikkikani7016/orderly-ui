import React, { useState, useRef, useEffect, useMemo } from 'react';

/**
 * ProductSearchSelect
 * High-performance, searchable product dropdown designed for dense ERP forms.
 * Replaces cumbersome native OS <select> tags with clean SKU badges, title truncation,
 * instant search, and stock/price previews.
 */
export default function ProductSearchSelect({
  products = [],
  value,
  onChange,
  placeholder = 'Select Master Product...',
  disabled = false,
  required = false,
  className = '',
  buttonClassName = '',
  showStock = true,
  showPrice = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Selected product object
  const selectedProduct = useMemo(() => {
    if (!value) return null;
    return products.find((p) => String(p.id) === String(value)) || null;
  }, [products, value]);

  // Filter products by SKU or Title
  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase().trim();
    return products.filter((p) => {
      const sku = (p.internalSku || p.sku || '').toLowerCase();
      const title = (p.title || p.name || '').toLowerCase();
      const cat = (p.category || '').toLowerCase();
      return sku.includes(q) || title.includes(q) || cat.includes(q);
    });
  }, [products, search]);

  // Handle click outside & escape
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      // Auto focus search input when opened
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  function handleSelect(product) {
    onChange(product.id, product);
    setIsOpen(false);
    setSearch('');
  }

  function handleClear(e) {
    e.stopPropagation();
    onChange('', null);
    setSearch('');
  }

  return (
    <div className={`relative select-none ${className}`} ref={containerRef}>
      {/* Hidden input for HTML form validation */}
      {required && (
        <input
          type="text"
          value={value || ''}
          onChange={() => {}}
          required={required}
          className="opacity-0 absolute -z-10 h-0 w-0 pointer-events-none"
          tabIndex={-1}
        />
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full h-8 px-2.5 bg-white border border-border text-ink rounded-md text-xs font-normal flex items-center justify-between gap-1.5 transition-all outline-none hover:border-gray-400 focus:border-accent focus:ring-1 focus:ring-accent/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
          isOpen ? 'border-accent ring-1 ring-accent/20' : ''
        } ${buttonClassName}`}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1 truncate">
          {selectedProduct ? (
            <>
              <span
                className="shrink-0 font-mono font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-800 text-[10.5px] border border-gray-200 max-w-[150px] truncate"
                title={selectedProduct.internalSku || selectedProduct.sku || 'NO-SKU'}
              >
                {selectedProduct.internalSku || selectedProduct.sku || 'NO-SKU'}
              </span>
              <span className="truncate text-[11px] text-gray-600 font-medium">
                {selectedProduct.title || selectedProduct.name}
              </span>
            </>
          ) : (
            <span className="text-gray-400 text-xs">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-1">
          {selectedProduct && !disabled && (
            <span
              role="button"
              onClick={handleClear}
              className="text-gray-400 hover:text-rose-600 p-0.5 rounded transition-colors text-xs font-bold leading-none cursor-pointer"
              title="Clear selection"
            >
              &times;
            </span>
          )}
          <svg
            className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-accent' : ''
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute z-50 top-full mt-1 left-0 right-0 w-full min-w-[320px] bg-white border border-border rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col"
          style={{
            boxShadow: '0 12px 28px -4px rgba(0, 0, 0, 0.18), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
          }}
        >
          {/* Search Header */}
          <div className="p-2 bg-gray-50/90 border-b border-border shrink-0">
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search SKU or product title..."
                className="w-full h-7 pl-7 pr-6 bg-white border border-gray-300 rounded text-xs text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent/20"
              />
              <svg
                className="w-3.5 h-3.5 text-gray-400 absolute left-2 top-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1.5 text-gray-400 hover:text-ink text-xs font-bold"
                >
                  &times;
                </button>
              )}
            </div>
            <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1 px-0.5">
              <span>
                {filteredProducts.length} of {products.length} products
              </span>
              {search && <span>Filtered by "{search}"</span>}
            </div>
          </div>

          {/* Product Items List */}
          <div className="max-h-56 overflow-y-auto divide-y divide-gray-100">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((p) => {
                const isSelected = selectedProduct && String(selectedProduct.id) === String(p.id);

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelect(p)}
                    className={`w-full text-left px-2.5 py-2 transition-colors cursor-pointer flex flex-col gap-0.5 ${
                      isSelected
                        ? 'bg-accent-light/70 text-ink'
                        : 'hover:bg-gray-50/80 text-gray-700'
                    }`}
                  >
                    {/* Top Row: SKU + Stock + Badges */}
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-mono font-bold text-xs text-ink">
                          {p.internalSku || p.sku || 'NO-SKU'}
                        </span>
                        {p.category && (
                          <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-gray-100 text-gray-600 font-medium">
                            {p.category}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {showStock && (
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                              (p.stock || 0) > 10
                                ? 'bg-emerald-50 text-emerald-700'
                                : (p.stock || 0) > 0
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-rose-50 text-rose-600'
                            }`}
                          >
                            Stock: {p.stock ?? 0}
                          </span>
                        )}
                        {showPrice && p.sellingPrice !== undefined && (
                          <span className="text-[10.5px] font-mono font-bold text-ink">
                            ₹{Number(p.sellingPrice).toFixed(0)}
                          </span>
                        )}
                        {isSelected && (
                          <svg
                            className="w-3.5 h-3.5 text-accent shrink-0"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2.5}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </div>
                    </div>

                    {/* Bottom Row: Truncated Title */}
                    <p className="text-[11px] text-gray-500 truncate w-full" title={p.title || p.name}>
                      {p.title || p.name}
                    </p>
                  </button>
                );
              })
            ) : (
              <div className="py-6 px-3 text-center text-xs text-gray-400">
                <p>No products found matching "{search}"</p>
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="mt-1.5 text-accent text-[11px] hover:underline font-semibold"
                  >
                    Clear search filter
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
