import React, { useState, useMemo } from 'react';
import { INDIA_MAP_VIEWBOX, INDIA_STATES_DATA, findStateByRawName } from '../data/indiaMapPaths';

/**
 * Interpolates color from Light Sky Blue to Extreme Dark Navy Blue based on ratio (0..1)
 */
function getChoroplethColor(orderCount, minOrders, maxOrders) {
  if (!orderCount || orderCount <= 0) {
    return {
      fill: '#F1F5F9', // subtle neutral slate-100
      stroke: '#CBD5E1',
      textColor: '#64748B',
      isZero: true,
    };
  }

  if (maxOrders === minOrders || maxOrders <= 1) {
    return {
      fill: '#3B82F6',
      stroke: '#1D4ED8',
      textColor: '#FFFFFF',
      isZero: false,
    };
  }

  // Normalized ratio (0 to 1)
  const ratio = Math.min(Math.max((orderCount - minOrders) / (maxOrders - minOrders || 1), 0), 1);

  // Gradient stops:
  // 0.0 -> #BAE6FD (Light Blue: 186, 230, 253)
  // 0.4 -> #3B82F6 (Vibrant Blue: 59, 130, 246)
  // 0.75 -> #1D4ED8 (Deep Blue: 29, 78, 216)
  // 1.0 -> #0F172A (Extreme Dark Navy: 15, 23, 42)
  let r, g, b;
  if (ratio <= 0.4) {
    const t = ratio / 0.4;
    r = Math.round(186 + (59 - 186) * t);
    g = Math.round(230 + (130 - 230) * t);
    b = Math.round(253 + (246 - 253) * t);
  } else if (ratio <= 0.75) {
    const t = (ratio - 0.4) / 0.35;
    r = Math.round(59 + (29 - 59) * t);
    g = Math.round(130 + (78 - 130) * t);
    b = Math.round(246 + (216 - 246) * t);
  } else {
    const t = (ratio - 0.75) / 0.25;
    r = Math.round(29 + (15 - 29) * t);
    g = Math.round(78 + (23 - 78) * t);
    b = Math.round(216 + (42 - 216) * t);
  }

  const fill = `rgb(${r}, ${g}, ${b})`;
  const stroke = ratio > 0.6 ? '#93C5FD' : '#1E40AF';
  const textColor = ratio > 0.35 ? '#FFFFFF' : '#0F172A';

  return { fill, stroke, textColor, isZero: false, ratio };
}

export default function IndiaMap({
  stateAnalytics = [],
  selectedStateId = null,
  onSelectState = () => {},
  totalCompanyOrders = 0,
}) {
  const [hoveredState, setHoveredState] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Map incoming analytics data to normalized state ID dictionary
  const analyticsByStateId = useMemo(() => {
    const map = {};
    if (!stateAnalytics || !Array.isArray(stateAnalytics)) return map;

    stateAnalytics.forEach((item) => {
      const match = findStateByRawName(item.rawState || item.stateName || item.stateId);
      if (match) {
        if (!map[match.id]) {
          map[match.id] = {
            ...item,
            stateInfo: match,
          };
        } else {
          // Merge duplicates if raw names had slight differences
          map[match.id].orderCount += item.orderCount || 0;
          map[match.id].totalSales += item.totalSales || 0;
          map[match.id].deliveredCount += item.deliveredCount || 0;
          map[match.id].returnedCount += item.returnedCount || 0;
          map[match.id].cancelledCount += item.cancelledCount || 0;
        }
      }
    });
    return map;
  }, [stateAnalytics]);

  // Determine min & max orders for color scale
  const { minOrders, maxOrders, totalMappedOrders } = useMemo(() => {
    let min = Infinity;
    let max = 0;
    let sum = 0;

    Object.values(analyticsByStateId).forEach((st) => {
      const count = st.orderCount || 0;
      sum += count;
      if (count > 0) {
        if (count < min) min = count;
        if (count > max) max = count;
      }
    });

    return {
      minOrders: min === Infinity ? 0 : min,
      maxOrders: max,
      totalMappedOrders: sum,
    };
  }, [analyticsByStateId]);

  const effectiveTotalOrders = totalCompanyOrders || totalMappedOrders || 1;

  function handleMouseMove(e, stateItem, data) {
    const rect = e.currentTarget.closest('.india-map-container')?.getBoundingClientRect();
    if (rect) {
      setTooltipPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
    setHoveredState({
      stateItem,
      data,
    });
  }

  function handleMouseLeave() {
    setHoveredState(null);
  }

  return (
    <div className="india-map-container relative w-full h-full flex flex-col items-center select-none">
      {/* SVG Map */}
      <div className="w-full flex-1 flex items-center justify-center p-2 min-h-[420px]">
        <svg
          viewBox={INDIA_MAP_VIEWBOX}
          className="w-full h-auto max-h-[520px] filter drop-shadow-sm transition-all duration-200"
          style={{ overflow: 'visible' }}
        >
          <defs>
            <filter id="mapShadow" x="-5%" y="-5%" width="110%" height="110%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.08" />
            </filter>
            <filter id="hoverGlow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#2563EB" floodOpacity="0.3" />
            </filter>
          </defs>

          {/* Render States */}
          <g filter="url(#mapShadow)">
            {INDIA_STATES_DATA.map((state) => {
              const data = analyticsByStateId[state.id];
              const orderCount = data ? data.orderCount : 0;
              const isSelected = selectedStateId === state.id;
              const isHovered = hoveredState?.stateItem?.id === state.id;
              const { fill, stroke } = getChoroplethColor(orderCount, minOrders, maxOrders);

              return (
                <g key={state.id} className="cursor-pointer">
                  <path
                    d={state.path}
                    fill={isSelected ? '#F59E0B' : fill}
                    stroke={isSelected ? '#B45309' : isHovered ? '#1D4ED8' : data?.orderCount > 0 ? stroke : '#CBD5E1'}
                    strokeWidth={isSelected ? 2.5 : isHovered ? 2 : 0.8}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    filter={isHovered ? 'url(#hoverGlow)' : undefined}
                    className="transition-all duration-150 ease-out hover:brightness-105"
                    onMouseMove={(e) => handleMouseMove(e, state, data)}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => onSelectState(data ? { ...data, stateInfo: state } : { stateInfo: state, orderCount: 0 })}
                  />

                  {/* Micro label for top states if order count is significant */}
                  {orderCount > 0 && maxOrders > 0 && orderCount >= maxOrders * 0.35 && (
                    <text
                      x={state.labelCoords.x}
                      y={state.labelCoords.y}
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="font-bold text-[13px] fill-white pointer-events-none select-none drop-shadow-md"
                      style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}
                    >
                      {state.code}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Floating Dynamic Tooltip */}
      {hoveredState && (
        <div
          className="absolute pointer-events-none z-50 bg-gray-900/95 backdrop-blur-md text-white text-xs rounded-xl px-3.5 py-2.5 shadow-2xl border border-gray-700/60 transition-all duration-75 min-w-[190px]"
          style={{
            left: `${Math.min(Math.max(tooltipPos.x + 16, 10), 380)}px`,
            top: `${Math.max(tooltipPos.y - 85, 10)}px`,
          }}
        >
          <div className="flex items-center justify-between gap-2 border-b border-gray-700/80 pb-1.5 mb-1.5">
            <span className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              {hoveredState.stateItem.name}
            </span>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 border border-gray-700">
              {hoveredState.stateItem.code}
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-gray-300">
              <span>Orders:</span>
              <span className="font-bold text-white text-[13px]">
                {(hoveredState.data?.orderCount || 0).toLocaleString()}
              </span>
            </div>

            <div className="flex items-center justify-between text-gray-300">
              <span>Share:</span>
              <span className="font-semibold text-blue-300">
                {(
                  ((hoveredState.data?.orderCount || 0) / effectiveTotalOrders) *
                  100
                ).toFixed(1)}
                %
              </span>
            </div>

            {hoveredState.data?.totalSales !== undefined && (
              <div className="flex items-center justify-between text-gray-300">
                <span>Revenue:</span>
                <span className="font-semibold text-emerald-400">
                  ₹{Number(hoveredState.data.totalSales || 0).toLocaleString()}
                </span>
              </div>
            )}
          </div>

          <div className="mt-2 pt-1.5 border-t border-gray-800 text-[10px] text-gray-400 flex items-center justify-between">
            <span>
              {hoveredState.data?.orderCount === maxOrders && maxOrders > 0
                ? '🏆 Top Regional Hub'
                : hoveredState.data?.orderCount > 0
                ? 'Click to view breakdown'
                : 'No orders recorded yet'}
            </span>
          </div>
        </div>
      )}

      {/* Color Intensity Scale / Legend */}
      <div className="w-full max-w-sm px-4 py-2 mt-auto bg-white/90 backdrop-blur-xs border border-gray-200 rounded-xl shadow-xs">
        <div className="flex items-center justify-between text-[11px] font-medium text-gray-600 mb-1">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#F1F5F9] border border-gray-300" />
            0 Orders
          </span>
          <span className="text-gray-400 font-semibold">Order Density</span>
          <span className="flex items-center gap-1 text-ink font-bold">
            Max ({maxOrders.toLocaleString()})
          </span>
        </div>
        <div
          className="h-2.5 w-full rounded-full border border-gray-200"
          style={{
            background:
              'linear-gradient(to right, #BAE6FD 0%, #60A5FA 35%, #2563EB 65%, #0F172A 100%)',
          }}
        />
        <div className="flex justify-between text-[10px] text-gray-400 mt-1">
          <span>{minOrders > 0 ? `${minOrders} orders (Light Blue)` : 'Low Volume'}</span>
          <span>Medium</span>
          <span>Highest (Deep Navy Blue)</span>
        </div>
      </div>
    </div>
  );
}
