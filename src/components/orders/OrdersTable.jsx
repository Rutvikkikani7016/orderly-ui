import React from 'react';

export function getStatusBadge(status) {
  switch (status) {
    case 'delivered':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'returned':
    case 'rto_initiated':
    case 'rto_delivered':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    case 'cancelled':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'exchanged':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'shipped':
    case 'out_for_delivery':
    case 'packed':
    case 'accepted':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    default:
      return 'bg-amber-50 text-amber-700 border-amber-200';
  }
}

/**
 * OrdersTable
 * Modular high-density table for orders with in-page vertical and horizontal scrolling
 */
export default function OrdersTable({
  orders = [],
  loading = false,
  pagination = { page: 1, limit: 15 },
  onOpenImportModal,
  onViewOrder,
}) {
  return (
    <div className="flex-1 min-h-0 overflow-auto w-full">
      <table className="w-full min-w-[1250px] text-left text-xs text-ink">
        <thead className="sticky top-0 z-10 bg-gray-50 text-gray-500 uppercase text-[9px] font-bold tracking-wider border-b border-border shadow-2xs">
          <tr>
            <th className="px-2.5 py-2 text-center w-10 bg-gray-50">#</th>
            <th className="px-3 py-2 min-w-[170px] bg-gray-50">Order ID & Date</th>
            <th className="px-3 py-2 min-w-[110px] bg-gray-50">Channel</th>
            <th className="px-3 py-2 min-w-[180px] bg-gray-50">Customer & Location</th>
            <th className="px-3 py-2 min-w-[220px] bg-gray-50">Items / SKUs</th>
            <th className="px-3 py-2 min-w-[150px] bg-gray-50">Tracking / Invoice</th>
            <th className="px-3 py-2 min-w-[110px] bg-gray-50">Amount</th>
            <th className="px-3 py-2 text-center w-24 bg-gray-50">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {loading ? (
            <tr>
              <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <span className="text-xs">Loading orders…</span>
              </td>
            </tr>
          ) : orders.length === 0 ? (
            <tr>
              <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                <div className="w-10 h-10 rounded-full bg-gray-100 border border-border flex items-center justify-center mx-auto mb-2 text-gray-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <p className="font-semibold text-ink text-xs mb-0.5">No matching orders found</p>
                <p className="text-gray-400 text-[11px] max-w-sm mx-auto mb-3">
                  Try adjusting your date range or filters, or import a new CSV file.
                </p>
                {onOpenImportModal && (
                  <button
                    onClick={onOpenImportModal}
                    className="px-4 py-2 text-xs font-semibold bg-ink text-white rounded-lg hover:bg-black transition-colors"
                  >
                    Import Orders CSV
                  </button>
                )}
              </td>
            </tr>
          ) : (
            orders.map((o, index) => (
              <tr
                key={o.id}
                onClick={() => onViewOrder && onViewOrder(o)}
                className={`hover:bg-blue-50/20 transition-colors ${onViewOrder ? 'cursor-pointer' : ''}`}
              >
                <td className="px-2.5 py-1.5 text-center text-[10.5px] font-mono font-medium text-gray-400">
                  {(pagination.page - 1) * pagination.limit + index + 1}
                </td>

                <td className="px-3 py-1.5 min-w-[170px]">
                  <span className="font-mono text-ink font-semibold block text-[11.5px] leading-tight">
                    {o.platformOrderId}
                  </span>
                  <span className="text-[9.5px] text-gray-400">
                    {o.orderDate
                      ? new Date(o.orderDate).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '—'}
                  </span>
                </td>

                <td className="px-3 py-1.5 min-w-[110px]">
                  <span className="inline-block text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200 capitalize">
                    {o.platform}
                  </span>
                </td>

                <td className="px-3 py-1.5 min-w-[180px]">
                  <span className="font-medium text-ink block text-xs leading-tight">
                    {o.buyerName || 'Customer'}
                  </span>
                  <span className="text-[9.5px] text-gray-400">
                    {[o.buyerCity, o.buyerState].filter(Boolean).join(', ') || '—'}
                  </span>
                </td>

                <td className="px-3 py-1.5 max-w-[220px]">
                  {o.items && o.items.length > 0 ? (
                    <div className="space-y-0.5">
                      {o.items.map((it, idx) => (
                        <div key={it.id || idx} className="flex items-center space-x-1 text-[10.5px]">
                          <span className="font-mono bg-gray-100 text-ink px-1 py-0.2 rounded text-[9.5px] font-medium truncate max-w-[130px]">
                            {it.platformSku}
                          </span>
                          <span className="text-gray-400 font-medium text-[9.5px]">&times; {it.quantity}</span>
                          {it.productId && (
                            <span className="text-[9px] text-emerald-600 font-bold" title="Linked to product catalog">
                              ✓
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>

                <td className="px-3 py-1.5 min-w-[150px] text-[10.5px]">
                  {o.trackingId ? (
                    <span className="font-mono text-gray-600 block text-[10px]">{o.trackingId}</span>
                  ) : (
                    <span className="text-gray-400 block text-[10px]">—</span>
                  )}
                  {o.invoiceNo && <span className="text-[9px] text-gray-400">Inv: {o.invoiceNo}</span>}
                </td>

                <td className="px-3 py-1.5 font-bold text-ink min-w-[110px]">
                  ₹{parseFloat(o.totalAmount || 0).toFixed(2)}
                </td>

                <td className="px-3 py-1.5 text-center w-24">
                  <span
                    className={`inline-block text-[8.5px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded border ${getStatusBadge(
                      o.status
                    )}`}
                  >
                    {o.status?.replace('_', ' ')}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
