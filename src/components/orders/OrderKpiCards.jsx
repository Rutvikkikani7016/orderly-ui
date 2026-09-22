import React from 'react';

/**
 * OrderKpiCards
 * Small compact 4-KPI metrics cards for Orders management
 */
export default function OrderKpiCards({ metrics = {}, totalReturnsAndCancelled = 0, totalReturnAndCancelRate = '0' }) {
  const deliveredRate = metrics.totalOrders > 0 
    ? ((metrics.deliveredOrders / metrics.totalOrders) * 100).toFixed(0) 
    : 0;

  return (
    <div className="shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-2">
      {/* Total Orders */}
      <div className="bg-white border border-border rounded-lg px-2.5 py-1.5 shadow-2xs flex items-center justify-between">
        <div className="flex items-center space-x-2 min-w-0">
          <div className="w-6 h-6 rounded bg-accent/10 text-accent flex items-center justify-center shrink-0">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider truncate">Total Orders</p>
            <div className="flex items-baseline space-x-1">
              <h3 className="text-xs font-bold text-ink leading-tight">{metrics.totalOrders || 0}</h3>
              <span className="text-[9px] text-gray-400 font-medium truncate">
                ₹{parseFloat(metrics.totalSales || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Delivered */}
      <div className="bg-white border border-border rounded-lg px-2.5 py-1.5 shadow-2xs flex items-center justify-between">
        <div className="flex items-center space-x-2 min-w-0">
          <div className="w-6 h-6 rounded bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center justify-center shrink-0">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-semibold text-emerald-600 uppercase tracking-wider truncate">Delivered</p>
            <div className="flex items-baseline space-x-1">
              <h3 className="text-xs font-bold text-emerald-700 leading-tight">{metrics.deliveredOrders || 0}</h3>
              <span className="text-[9px] text-emerald-600 font-medium">({deliveredRate}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Returns & Cancelled */}
      <div className="bg-white border border-border rounded-lg px-2.5 py-1.5 shadow-2xs flex items-center justify-between">
        <div className="flex items-center space-x-2 min-w-0">
          <div className="w-6 h-6 rounded bg-rose-50 text-rose-600 border border-rose-200/60 flex items-center justify-center shrink-0">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-semibold text-rose-600 uppercase tracking-wider truncate">Returns / Cancel</p>
            <div className="flex items-baseline space-x-1">
              <h3 className="text-xs font-bold text-rose-700 leading-tight">{totalReturnsAndCancelled}</h3>
              <span className="text-[9px] text-rose-500 font-semibold">({totalReturnAndCancelRate}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Dispatch */}
      <div className="bg-white border border-border rounded-lg px-2.5 py-1.5 shadow-2xs flex items-center justify-between">
        <div className="flex items-center space-x-2 min-w-0">
          <div className="w-6 h-6 rounded bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center justify-center shrink-0">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-semibold text-amber-600 uppercase tracking-wider truncate">Pending Dispatch</p>
            <h3 className="text-xs font-bold text-amber-700 leading-tight">{metrics.pendingDispatch || 0}</h3>
          </div>
        </div>
      </div>
    </div>
  );
}
