import React from 'react';
import { getStatusBadge } from './OrdersTable.jsx';

/**
 * OrderDetailsModal
 * Standalone modal showing detailed order information, buyer info, line items, and fulfillment tracking
 */
export default function OrderDetailsModal({
  order,
  isOpen,
  onClose,
}) {
  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white border border-border rounded-xl max-w-2xl w-full p-5 shadow-xl space-y-4 max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3 shrink-0">
          <div className="flex items-center space-x-2">
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-ink font-mono">{order.platformOrderId}</h3>
                <span className="text-[9.5px] uppercase font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  {order.platform}
                </span>
                <span
                  className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${getStatusBadge(
                    order.status
                  )}`}
                >
                  {order.status?.replace('_', ' ')}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Ordered on{' '}
                {order.orderDate
                  ? new Date(order.orderDate).toLocaleString('en-IN', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })
                  : 'N/A'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-ink text-lg font-bold p-1 rounded hover:bg-gray-100 transition-colors"
          >
            &times;
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
          {/* Top Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Buyer & Delivery Details */}
            <div className="bg-gray-50/70 border border-border rounded-lg p-3 space-y-1.5">
              <h4 className="text-[11px] font-bold text-ink flex items-center space-x-1.5">
                <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>Customer & Destination</span>
              </h4>
              <div className="text-[11px] text-gray-600 space-y-0.5 pl-5">
                <p className="font-semibold text-ink">{order.buyerName || 'Customer'}</p>
                {order.buyerPhone && <p className="text-gray-500">📞 {order.buyerPhone}</p>}
                {order.buyerAddress && <p className="text-gray-500">{order.buyerAddress}</p>}
                <p className="text-gray-500">
                  {[order.buyerCity, order.buyerState, order.buyerPincode].filter(Boolean).join(', ') || 'Location not provided'}
                </p>
              </div>
            </div>

            {/* Tracking & Logistics */}
            <div className="bg-gray-50/70 border border-border rounded-lg p-3 space-y-1.5">
              <h4 className="text-[11px] font-bold text-ink flex items-center space-x-1.5">
                <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                </svg>
                <span>Logistics & Invoicing</span>
              </h4>
              <div className="text-[11px] text-gray-600 space-y-1 pl-5">
                <div className="flex justify-between">
                  <span className="text-gray-500">Tracking AWB:</span>
                  <span className="font-mono font-medium text-ink">{order.trackingId || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Invoice Number:</span>
                  <span className="font-medium text-ink">{order.invoiceNo || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Payment Mode:</span>
                  <span className="font-medium text-ink capitalize">{order.paymentMethod || 'Prepaid / Channel'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-3 py-2 border-b border-border font-bold text-ink text-[11px]">
              Order Items ({order.items?.length || 0})
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/50 text-gray-500 text-[9.5px] uppercase font-bold border-b border-border">
                <tr>
                  <th className="px-3 py-1.5">SKU & Item Name</th>
                  <th className="px-3 py-1.5 text-center">Qty</th>
                  <th className="px-3 py-1.5 text-right">Unit Price</th>
                  <th className="px-3 py-1.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-[11px]">
                {order.items && order.items.length > 0 ? (
                  order.items.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-gray-50/40">
                      <td className="px-3 py-2">
                        <span className="font-mono font-bold text-ink block">{item.platformSku}</span>
                        {item.title && <span className="text-[10px] text-gray-500 block truncate max-w-xs">{item.title}</span>}
                      </td>
                      <td className="px-3 py-2 text-center font-medium">{item.quantity}</td>
                      <td className="px-3 py-2 text-right text-gray-600 font-mono">
                        ₹{parseFloat(item.price || 0).toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-ink font-mono">
                        ₹{parseFloat((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="px-3 py-4 text-center text-gray-400">
                      No line items recorded
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Financials Summary */}
          <div className="bg-surface/50 border border-border rounded-lg p-3 flex flex-col items-end space-y-1">
            <div className="w-64 space-y-1 text-xs">
              <div className="flex justify-between text-gray-500 text-[11px]">
                <span>Total Amount:</span>
                <span className="font-bold text-ink text-sm">₹{parseFloat(order.totalAmount || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border pt-3 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-ink font-semibold rounded-md transition-colors text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
