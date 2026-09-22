import React from 'react';

/**
 * PlatformPerformanceAccordion
 * Collapsible platform-wise sales performance, fulfillment & return rate drawer
 */
export default function PlatformPerformanceAccordion({
  activePlatforms = [],
  platformMetricsList = [],
  platformFilter = 'all',
  setPlatformFilter,
  showPlatformBreakdown,
  setShowPlatformBreakdown,
}) {
  if (activePlatforms.length === 0) return null;

  return (
    <div className="shrink-0 bg-white border border-border rounded-lg overflow-hidden shadow-2xs">
      <button
        type="button"
        onClick={() => setShowPlatformBreakdown(!showPlatformBreakdown)}
        className="w-full py-1.5 px-3 flex items-center justify-between hover:bg-gray-50/70 transition-colors text-left"
      >
        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-bold text-ink flex items-center space-x-1.5">
            <span>Platform-wise Performance & Returns</span>
            <span className="text-[8.5px] bg-accent-light text-accent px-1.5 py-0.2 rounded font-semibold uppercase tracking-wider">
              Channel Analytics
            </span>
          </span>
        </div>
        <div className="flex items-center space-x-2 text-xs text-gray-500 font-medium">
          <span className="text-[10px] text-gray-400">
            {showPlatformBreakdown ? 'Hide Breakdown' : 'View Platform Metrics & Return Rates'}
          </span>
          <svg
            className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${
              showPlatformBreakdown ? 'rotate-180' : ''
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {showPlatformBreakdown && (
        <div className="p-2.5 border-t border-border bg-gray-50/30 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10.5px] text-gray-500">
              Breakdown of orders, fulfillment, returns, and cancellations for your connected sales channels
            </p>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setPlatformFilter('all')}
                className={`px-2 py-0.5 text-[10.5px] rounded font-medium transition-all ${
                  platformFilter === 'all'
                    ? 'bg-ink text-white shadow-xs'
                    : 'text-gray-500 hover:text-ink hover:bg-gray-100'
                }`}
              >
                All Selected
              </button>
              {activePlatforms.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPlatformFilter(p.id)}
                  className={`px-2 py-0.5 text-[10.5px] rounded font-medium transition-all capitalize ${
                    platformFilter === p.id
                      ? 'bg-ink text-white shadow-xs'
                      : 'text-gray-500 hover:text-ink hover:bg-gray-100'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Platform Cards Grid */}
          <div
            className={`grid grid-cols-1 ${
              activePlatforms.length === 1
                ? 'max-w-md'
                : activePlatforms.length === 2
                ? 'md:grid-cols-2'
                : activePlatforms.length === 3
                ? 'md:grid-cols-3'
                : 'md:grid-cols-2 lg:grid-cols-4'
            } gap-2.5 pt-0.5`}
          >
            {activePlatforms.map((cfg) => {
              const pStat = platformMetricsList.find((m) => m.platform === cfg.id) || {
                totalOrders: 0,
                totalSales: 0,
                deliveredOrders: 0,
                returnedOrders: 0,
                cancelledOrders: 0,
                pendingDispatch: 0,
                fulfillmentRate: 0,
                returnRate: 0,
                cancelledRate: 0,
              };

              const isSelected = platformFilter === cfg.id;

              return (
                <div
                  key={cfg.id}
                  onClick={() => setPlatformFilter(isSelected ? 'all' : cfg.id)}
                  className={`border rounded-lg p-2.5 cursor-pointer transition-all hover:shadow-xs ${
                    isSelected
                      ? 'border-accent ring-1.5 ring-accent/30 bg-accent/5'
                      : 'border-border bg-white hover:border-gray-300'
                  }`}
                >
                  {/* Platform Header */}
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center space-x-1.5">
                      <div className={`w-5 h-5 rounded ${cfg.bgColor} border ${cfg.borderColor} flex items-center justify-center`}>
                        {cfg.icon}
                      </div>
                      <span className="font-bold text-xs text-ink">{cfg.name}</span>
                    </div>

                    <span className={`text-[8.5px] font-bold px-1.5 py-0.2 rounded-full border ${cfg.bgColor} ${cfg.borderColor} ${cfg.badgeColor}`}>
                      {pStat.totalOrders} {pStat.totalOrders === 1 ? 'order' : 'orders'}
                    </span>
                  </div>

                  {/* Sales & Orders Stat */}
                  <div className="space-y-1 mb-1.5">
                    <div className="flex items-baseline justify-between text-[10.5px]">
                      <span className="text-gray-500">Gross Sales</span>
                      <span className="font-bold text-ink">
                        ₹{parseFloat(pStat.totalSales || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </span>
                    </div>

                    {/* Fulfillment Progress Bar */}
                    <div>
                      <div className="flex items-center justify-between text-[9.5px] mb-0.5">
                        <span className="text-gray-500">Fulfillment</span>
                        <span className="font-semibold text-emerald-600">
                          {pStat.deliveredOrders} ({pStat.fulfillmentRate}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 h-1 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(pStat.fulfillmentRate, 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Return & Cancel Breakdown Bar */}
                    <div>
                      <div className="flex items-center justify-between text-[9.5px] mb-0.5">
                        <span className="text-gray-500">Returns & Cancel</span>
                        <span className="font-semibold text-rose-600">
                          {(pStat.returnedOrders || 0) + (pStat.cancelledOrders || 0)} (
                          {((pStat.returnRate || 0) + (pStat.cancelledRate || 0)).toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 h-1 rounded-full overflow-hidden flex">
                        <div
                          className="bg-rose-500 h-full transition-all duration-500"
                          style={{ width: `${Math.min(pStat.returnRate, 100)}%` }}
                          title={`Returns: ${pStat.returnRate}%`}
                        ></div>
                        <div
                          className="bg-red-400 h-full transition-all duration-500"
                          style={{ width: `${Math.min(pStat.cancelledRate, 100)}%` }}
                          title={`Cancelled: ${pStat.cancelledRate}%`}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Footer Count Pills */}
                  <div className="pt-1.5 border-t border-border/80 flex items-center justify-between text-[8.5px] text-gray-500">
                    <span>Del: <strong className="text-ink">{pStat.deliveredOrders}</strong></span>
                    <span>RTO: <strong className="text-rose-600">{pStat.returnedOrders}</strong></span>
                    <span>Cancel: <strong className="text-red-500">{pStat.cancelledOrders || 0}</strong></span>
                    <span>Pend: <strong className="text-amber-600">{pStat.pendingDispatch}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
