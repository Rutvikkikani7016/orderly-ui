import React, { useState, useRef, useEffect } from 'react';

/**
 * Reusable, high-aesthetic Custom Dropdown component
 * Matches OrderNest's modern SaaS theme with custom chevron, checkmarks, badges & animations.
 */
export default function CustomDropdown({
  value,
  onChange,
  options = [],
  placeholder = 'Select option...',
  label,
  icon,
  className = '',
  buttonClassName = '',
  menuClassName = '',
  disabled = false,
  size = 'sm', // '2xs', 'xs', 'sm', 'md', 'lg'
  placement = 'auto', // 'auto', 'bottom', 'top'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const containerRef = useRef(null);

  // Close when clicked outside
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
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Determine upward or downward placement when opened
  useEffect(() => {
    if (isOpen) {
      if (placement === 'top') {
        setOpenUpward(true);
      } else if (placement === 'bottom') {
        setOpenUpward(false);
      } else if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        if (spaceBelow < 240 && rect.top > 200) {
          setOpenUpward(true);
        } else {
          setOpenUpward(false);
        }
      }
    }
  }, [isOpen, placement]);

  // Normalize options: allow strings or objects { value, label, icon, badge }
  const normalizedOptions = options.map((opt) => {
    if (typeof opt === 'object' && opt !== null) {
      return opt;
    }
    return { value: opt, label: String(opt) };
  });

  const selectedOption = normalizedOptions.find(
    (opt) => String(opt.value) === String(value)
  );

  const sizeClasses = {
    '2xs': 'h-6 px-2 text-[10.5px] gap-1',
    xs: 'h-7 px-2 text-[11px] gap-1.5',
    sm: 'h-8 px-2.5 text-xs gap-2',
    md: 'h-9 px-3 text-xs gap-2',
    lg: 'h-10 px-3.5 text-sm gap-2.5',
  }[size] || 'h-8 px-2.5 text-xs gap-2';

  return (
    <div className={`relative inline-block text-left select-none ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-semibold text-gray-700 mb-1">
          {label}
        </label>
      )}

      {/* Dropdown Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`flex items-center justify-between bg-white border border-border text-ink rounded-lg font-medium transition-all shadow-2xs hover:border-gray-400 hover:bg-gray-50/70 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent disabled:opacity-50 disabled:cursor-not-allowed ${sizeClasses} ${
          isOpen ? 'border-accent ring-2 ring-accent/15 bg-gray-50/50' : ''
        } ${buttonClassName}`}
      >
        <div className="flex items-center gap-1.5 min-w-0 truncate">
          {icon && <span className="text-gray-400 flex-shrink-0">{icon}</span>}
          {selectedOption?.icon && (
            <span className="flex-shrink-0">{selectedOption.icon}</span>
          )}
          <span className="truncate font-medium">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.badge && (
            <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200">
              {selectedOption.badge}
            </span>
          )}
        </div>

        {/* Animated Chevron Arrow */}
        <svg
          className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 flex-shrink-0 ml-1 ${
            isOpen ? 'rotate-180 text-accent' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Floating Menu */}
      {isOpen && (
        <div
          className={`absolute z-50 min-w-[140px] max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-xl p-1 animate-in fade-in zoom-in-95 duration-100 focus:outline-none ${
            openUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          } ${menuClassName}`}
          style={{ boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}
        >
          {normalizedOptions.map((opt) => {
            const isSelected = String(opt.value) === String(value);

            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-all ${
                  size === 'xs' ? 'text-[11px]' : 'text-xs'
                } ${
                  isSelected
                    ? 'bg-blue-50 text-blue-900 font-semibold'
                    : 'text-gray-700 hover:bg-gray-100/80 hover:text-ink font-medium'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 truncate">
                  {opt.icon && <span className="flex-shrink-0">{opt.icon}</span>}
                  <span className="truncate">{opt.label}</span>
                  {opt.badge && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-gray-100 text-gray-600 font-medium">
                      {opt.badge}
                    </span>
                  )}
                </div>

                {isSelected && (
                  <svg
                    className="w-3.5 h-3.5 text-blue-600 flex-shrink-0 ml-2"
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
              </button>
            );
          })}

          {normalizedOptions.length === 0 && (
            <div className="px-3 py-2 text-xs text-gray-400 text-center">
              No options available
            </div>
          )}
        </div>
      )}
    </div>
  );
}
