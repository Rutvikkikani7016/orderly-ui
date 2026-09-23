import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

/**
 * InfoTooltip
 * Immune to overflow:hidden and overflow:auto container clipping using React Portal.
 * Automatically positions above or below based on viewport boundaries.
 */
export default function InfoTooltip({
  title,
  text,
  formula,
  example,
  className = '',
  width = 280,
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, placement: 'top', arrowLeft: 140 });
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);
  const hideTimeoutRef = useRef(null);

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const tooltipWidth = width;
    const estimatedHeight = 120; // approximate height for positioning logic

    // Check if there is enough space above
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;
    const placeBelow = spaceAbove < estimatedHeight + 20 || (spaceBelow > spaceAbove && spaceAbove < 160);

    // Calculate vertical position
    let top = 0;
    if (placeBelow) {
      top = rect.bottom + 8;
    } else {
      top = rect.top - 8; // will be offset by -100% via transform
    }

    // Calculate horizontal center aligned with trigger
    const triggerCenter = rect.left + rect.width / 2;
    let left = triggerCenter - tooltipWidth / 2;

    // Clamp horizontal position inside viewport
    const minLeft = 12;
    const maxLeft = window.innerWidth - tooltipWidth - 12;
    if (left < minLeft) left = minLeft;
    if (left > maxLeft) left = maxLeft;

    // Arrow pointer relative position
    const arrowLeft = Math.max(12, Math.min(tooltipWidth - 12, triggerCenter - left));

    setCoords({
      top,
      left,
      placement: placeBelow ? 'bottom' : 'top',
      arrowLeft,
    });
  }, [width]);

  // Recalculate position when visible or on scroll/resize
  useEffect(() => {
    if (!isVisible) return;
    calculatePosition();

    function handleScrollOrResize() {
      calculatePosition();
    }

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isVisible, calculatePosition]);

  // Handle escape and click outside
  useEffect(() => {
    if (!isVisible) return;

    function handleClickOutside(e) {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target) &&
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target)
      ) {
        setIsVisible(false);
      }
    }

    function handleKeyDown(e) {
      if (e.key === 'Escape') setIsVisible(false);
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isVisible]);

  function handleMouseEnter() {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    calculatePosition();
    setIsVisible(true);
  }

  function handleMouseLeave() {
    hideTimeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 150);
  }

  function handleClick(e) {
    e.preventDefault();
    e.stopPropagation();
    calculatePosition();
    setIsVisible((prev) => !prev);
  }

  return (
    <span
      className={`inline-flex items-center align-middle ml-1 shrink-0 ${className}`}
      ref={triggerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        onClick={handleClick}
        className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold transition-all focus:outline-none cursor-pointer shadow-2xs ${
          isVisible
            ? 'bg-indigo-600 text-white border border-indigo-700 ring-2 ring-indigo-300'
            : 'bg-gray-100 hover:bg-indigo-50 text-gray-500 hover:text-indigo-600 border border-gray-300 hover:border-indigo-300'
        }`}
        aria-label="Information note"
      >
        i
      </button>

      {/* Portal Tooltip: Renders in document.body to bypass all container clipping & overflow:hidden */}
      {isVisible &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={tooltipRef}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className="fixed z-[99999] p-3 bg-slate-900/95 backdrop-blur-xs text-white rounded-xl shadow-2xl text-left text-[11px] leading-relaxed animate-in fade-in zoom-in-95 duration-100 border border-slate-700/80 pointer-events-auto select-text"
            style={{
              width: `${width}px`,
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              transform: coords.placement === 'top' ? 'translateY(-100%)' : 'none',
              filter: 'drop-shadow(0 20px 25px rgba(0, 0, 0, 0.35))',
            }}
          >
            {title && (
              <div className="font-bold text-indigo-300 text-xs mb-1.5 flex items-center gap-1.5 border-b border-slate-700/80 pb-1.5">
                <span>💡</span>
                <span className="tracking-tight">{title}</span>
              </div>
            )}
            <p className="text-slate-200">{text}</p>

            {formula && (
              <div className="mt-2 pt-1.5 border-t border-slate-700/80 text-[10px] text-amber-300 font-mono">
                <span className="font-semibold text-slate-400">Formula: </span>
                {formula}
              </div>
            )}

            {example && (
              <div className="mt-1.5 text-[10px] text-emerald-300 bg-slate-800/80 p-1.5 rounded border border-slate-700/50">
                <span className="font-semibold text-slate-400">Example: </span>
                {example}
              </div>
            )}

            {/* Triangle indicator pointing to the trigger button */}
            <div
              className={`absolute w-0 h-0 border-4 border-transparent ${
                coords.placement === 'top'
                  ? 'top-full border-t-slate-900/95'
                  : 'bottom-full border-b-slate-900/95'
              }`}
              style={{
                left: `${coords.arrowLeft}px`,
                transform: 'translateX(-50%)',
              }}
            />
          </div>,
          document.body
        )}
    </span>
  );
}
