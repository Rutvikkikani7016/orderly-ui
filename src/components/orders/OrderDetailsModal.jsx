import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { getStatusBadge } from './OrdersTable.jsx';
import {
  transitionOrderStatus,
  holdOrder,
  releaseHold,
  cancelOrder,
  getOrderTimeline,
} from '../../api/orders.js';

/**
 * OrderDetailsModal
 * Interactive Enterprise Order Lifecycle Management Hub:
 * - Canonical Stepper (Placed -> Confirmed [Stock Reserved] -> Packed -> Shipped -> Delivered)
 * - State machine transition actions (Confirm, Pack, Ship, Deliver, Hold, Cancel)
 * - Complete audit history timeline
 */
export default function OrderDetailsModal({
  order: initialOrder,
  isOpen,
  onClose,
  onOrderUpdated,
}) {
  const [order, setOrder] = useState(initialOrder);
  const [activeTab, setActiveTab] = useState('details'); // 'details' | 'timeline'
  const [timeline, setTimeline] = useState([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Sync initial order
  useEffect(() => {
    setOrder(initialOrder);
    setActiveTab('details');
  }, [initialOrder]);

  // Load timeline when modal opens or tab switched
  useEffect(() => {
    if (isOpen && order?.id) {
      loadTimeline();
    }
  }, [isOpen, order?.id]);

  async function loadTimeline() {
    if (!order?.id) return;
    setLoadingTimeline(true);
    try {
      const res = await getOrderTimeline(order.id);
      setTimeline(res.history || []);
      if (res.order) {
        setOrder((prev) => ({ ...prev, ...res.order }));
      }
    } catch (err) {
      // Non-critical, ignore silent timeline fail
    } finally {
      setLoadingTimeline(false);
    }
  }

  if (!isOpen || !order) return null;

  const currentStatus = (order.status || 'placed').toLowerCase();

  // Canonical Stepper calculation
  const steps = [
    { key: 'placed', label: 'Placed' },
    { key: 'confirmed', label: 'Confirmed (Reserved)' },
    { key: 'packed', label: 'Packed' },
    { key: 'shipped', label: 'Shipped' },
    { key: 'delivered', label: 'Delivered' },
  ];

  function getStepIndex(st) {
    switch (st) {
      case 'placed':
      case 'new':
      case 'validated':
        return 0;
      case 'confirmed':
      case 'allocated':
      case 'picking':
        return 1;
      case 'packed':
        return 2;
      case 'shipped':
      case 'out_for_delivery':
        return 3;
      case 'delivered':
        return 4;
      default:
        return -1;
    }
  }

  const currentStepIdx = getStepIndex(currentStatus);

  // Transition handler
  async function handleTransition(targetStatus, defaultReason) {
    setActionLoading(true);
    try {
      const res = await transitionOrderStatus(order.id, {
        targetStatus,
        reason: defaultReason,
      });
      toast.success(`Order moved to ${targetStatus.toUpperCase()}`);
      setOrder(res.order);
      await loadTimeline();
      if (onOrderUpdated) onOrderUpdated();
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to advance order to ${targetStatus}`);
    } finally {
      setActionLoading(false);
    }
  }

  // Hold handler
  async function handleHold() {
    const reason = window.prompt('Enter reason for placing this order on hold:', 'Customer requested verification');
    if (!reason) return;
    setActionLoading(true);
    try {
      const res = await holdOrder(order.id, { reason });
      toast.success('Order placed on hold');
      setOrder(res.order);
      await loadTimeline();
      if (onOrderUpdated) onOrderUpdated();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to place order on hold');
    } finally {
      setActionLoading(false);
    }
  }

  // Release Hold handler
  async function handleRelease() {
    setActionLoading(true);
    try {
      const res = await releaseHold(order.id);
      toast.success('Order released from hold');
      setOrder(res.order);
      await loadTimeline();
      if (onOrderUpdated) onOrderUpdated();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to release order from hold');
    } finally {
      setActionLoading(false);
    }
  }

  // Cancel handler
  async function handleCancel() {
    const reason = window.prompt('Enter reason for cancellation (Reserved stock will be automatically released):', 'Buyer cancelled on marketplace');
    if (!reason) return;
    setActionLoading(true);
    try {
      const res = await cancelOrder(order.id, { reason });
      toast.success('Order cancelled & reserved inventory released');
      setOrder(res.order);
      await loadTimeline();
      if (onOrderUpdated) onOrderUpdated();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel order');
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white border border-border rounded-xl max-w-3xl w-full p-4 sm:p-5 shadow-2xl space-y-3.5 max-h-[92vh] flex flex-col overflow-hidden text-xs">
        {/* 1. Header with Channel & Status */}
        <div className="flex items-center justify-between border-b border-border pb-3 shrink-0">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold text-ink font-mono">{order.platformOrderId}</h3>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                {order.platform}
              </span>
              <span
                className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${getStatusBadge(
                  currentStatus
                )}`}
              >
                {currentStatus.replace('_', ' ')}
              </span>
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Placed on{' '}
              {order.orderDate
                ? new Date(order.orderDate).toLocaleString('en-IN', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })
                : 'N/A'}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {/* Tab Switcher */}
            <div className="bg-gray-100 p-0.5 rounded-lg flex space-x-1 border border-border text-[11px]">
              <button
                type="button"
                onClick={() => setActiveTab('details')}
                className={`px-2.5 py-1 rounded font-semibold transition-all cursor-pointer ${
                  activeTab === 'details' ? 'bg-white text-ink shadow-2xs' : 'text-gray-600 hover:text-ink'
                }`}
              >
                Details & Items
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('timeline')}
                className={`px-2.5 py-1 rounded font-semibold transition-all cursor-pointer ${
                  activeTab === 'timeline' ? 'bg-white text-ink shadow-2xs' : 'text-gray-600 hover:text-ink'
                }`}
              >
                📜 Lifecycle Timeline ({timeline.length})
              </button>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-ink text-xl font-bold p-1 rounded hover:bg-gray-100 transition-colors cursor-pointer"
            >
              &times;
            </button>
          </div>
        </div>

        {/* 2. Visual Stepper Progress Bar */}
        {currentStatus !== 'cancelled' && currentStatus !== 'on_hold' && currentStepIdx >= 0 && (
          <div className="bg-slate-50 border border-border rounded-lg p-2.5 shrink-0">
            <div className="flex items-center justify-between relative">
              <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-gray-200 -translate-y-1/2 z-0" />
              <div
                className="absolute top-1/2 left-4 h-0.5 bg-accent -translate-y-1/2 z-0 transition-all duration-300"
                style={{
                  width: `${(currentStepIdx / (steps.length - 1)) * 92}%`,
                }}
              />
              {steps.map((st, idx) => {
                const isCompleted = idx <= currentStepIdx;
                const isCurrent = idx === currentStepIdx;
                return (
                  <div key={st.key} className="flex flex-col items-center relative z-10">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] transition-all ${
                        isCurrent
                          ? 'bg-accent text-white ring-4 ring-accent/20'
                          : isCompleted
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white border-2 border-gray-300 text-gray-400'
                      }`}
                    >
                      {isCompleted && !isCurrent ? '✓' : idx + 1}
                    </div>
                    <span
                      className={`text-[9.5px] mt-1 font-semibold whitespace-nowrap ${
                        isCurrent ? 'text-accent font-bold' : isCompleted ? 'text-ink' : 'text-gray-400'
                      }`}
                    >
                      {st.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Alert Banners for Hold or Cancelled */}
        {currentStatus === 'on_hold' && (
          <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-base">⏸️</span>
              <div>
                <span className="font-bold">Order On Hold:</span>{' '}
                <span>{order.metadata?.holdReason || 'Manual review required'}</span>
              </div>
            </div>
            <button
              onClick={handleRelease}
              disabled={actionLoading}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-semibold cursor-pointer shadow-2xs"
            >
              ▶️ Release Hold
            </button>
          </div>
        )}

        {currentStatus === 'cancelled' && (
          <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2 shrink-0">
            <span className="text-base">❌</span>
            <div>
              <span className="font-bold">Order Cancelled:</span>{' '}
              <span>{order.metadata?.lastTransitionReason || 'Order has been cancelled. Inventory reserved has been released.'}</span>
            </div>
          </div>
        )}

        {/* 3. Action Buttons Toolbar */}
        {currentStatus !== 'cancelled' && (
          <div className="bg-gray-50 border border-border p-2 rounded-lg flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-gray-500 uppercase">Lifecycle Actions:</span>
              {/* Placed -> Confirm & Reserve Stock */}
              {['placed', 'new', 'validated'].includes(currentStatus) && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleTransition('confirmed', 'Order confirmed - stock reserved')}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  ✓ Confirm & Reserve Stock
                </button>
              )}

              {/* Confirmed -> Pack */}
              {['confirmed', 'allocated', 'picking'].includes(currentStatus) && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleTransition('packed', 'Order picked & packed at warehouse station')}
                  className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  📦 Mark Packed
                </button>
              )}

              {/* Packed -> Ship */}
              {currentStatus === 'packed' && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleTransition('shipped', 'Handed over to carrier for delivery')}
                  className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  🚚 Mark Shipped
                </button>
              )}

              {/* Shipped -> Deliver */}
              {['shipped', 'out_for_delivery'].includes(currentStatus) && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleTransition('delivered', 'Package delivered to customer')}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  ✓ Mark Delivered
                </button>
              )}
            </div>

            {/* Exception buttons: Hold & Cancel */}
            <div className="flex items-center gap-1.5">
              {currentStatus !== 'on_hold' && !['delivered', 'cancelled'].includes(currentStatus) && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleHold}
                  className="px-2 py-1 bg-white hover:bg-amber-50 text-amber-700 border border-amber-300 rounded text-xs font-semibold cursor-pointer"
                  title="Pause order fulfillment"
                >
                  ⏸️ Hold
                </button>
              )}

              {!['delivered', 'cancelled', 'shipped'].includes(currentStatus) && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleCancel}
                  className="px-2 py-1 bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 rounded text-xs font-semibold cursor-pointer"
                  title="Cancel order and release reserved stock"
                >
                  Cancel Order
                </button>
              )}
            </div>
          </div>
        )}

        {/* 4. Tab 1: Order Details & Items View */}
        {activeTab === 'details' && (
          <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
            {/* Customer & Logistics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Customer */}
              <div className="bg-gray-50/70 border border-border rounded-lg p-2.5 space-y-1">
                <h4 className="text-[11px] font-bold text-ink flex items-center space-x-1">
                  <span>👤</span>
                  <span>Customer & Shipping Address</span>
                </h4>
                <div className="text-[11px] text-gray-600 space-y-0.5">
                  <p className="font-semibold text-ink">{order.buyerName || 'Valued Customer'}</p>
                  {order.buyerPhone && <p className="text-gray-500">📞 {order.buyerPhone}</p>}
                  {order.shippingAddress && <p className="text-gray-500">{order.shippingAddress}</p>}
                  <p className="text-gray-500">
                    {[order.buyerCity, order.buyerState, order.buyerPincode].filter(Boolean).join(', ') ||
                      'Location details not provided'}
                  </p>
                </div>
              </div>

              {/* Logistics & Payment */}
              <div className="bg-gray-50/70 border border-border rounded-lg p-2.5 space-y-1">
                <h4 className="text-[11px] font-bold text-ink flex items-center space-x-1">
                  <span>🚚</span>
                  <span>Logistics & Payment Info</span>
                </h4>
                <div className="text-[11px] text-gray-600 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Tracking AWB:</span>
                    <span className="font-mono font-bold text-ink">{order.trackingId || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Invoice No:</span>
                    <span className="font-mono font-medium text-ink">{order.invoiceNo || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Payment Mode:</span>
                    <span className="font-medium text-ink uppercase">{order.paymentMode || 'PREPAID / MARKETPLACE'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Stock Reserved Status:</span>
                    <span className="font-semibold text-emerald-700">
                      {order.metadata?.isStockReserved ? '✓ Reserved in Warehouse' : 'Pending / Dispatched'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-3 py-1.5 border-b border-border font-bold text-ink text-[11px] flex justify-between">
                <span>Order Items ({order.items?.length || 0})</span>
                <span className="text-gray-500 font-mono text-[10px]">Currency: INR (₹)</span>
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
                          {item.title && (
                            <span className="text-[10px] text-gray-500 block truncate max-w-sm">
                              {item.title}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center font-bold font-mono">{item.quantity}</td>
                        <td className="px-3 py-2 text-right text-gray-600 font-mono">
                          ₹{parseFloat(item.sellingPrice || item.price || 0).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-ink font-mono">
                          ₹{parseFloat((item.sellingPrice || item.price || 0) * (item.quantity || 1)).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="px-3 py-4 text-center text-gray-400">
                        No line items recorded for this order
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Total Financial Summary */}
            <div className="bg-surface/50 border border-border rounded-lg p-2.5 flex justify-end">
              <div className="w-64 flex justify-between items-center text-xs">
                <span className="font-semibold text-gray-600">Total Order Amount:</span>
                <span className="font-bold text-ink text-sm font-mono">
                  ₹{parseFloat(order.totalAmount || 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 5. Tab 2: Lifecycle Timeline Audit Trail */}
        {activeTab === 'timeline' && (
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {loadingTimeline ? (
              <div className="text-center py-10 text-gray-400">Loading timeline events...</div>
            ) : timeline.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                No state machine transitions recorded yet. Use the lifecycle action buttons above to progress this order!
              </div>
            ) : (
              <div className="space-y-2">
                {timeline.map((evt, idx) => (
                  <div
                    key={evt.id || idx}
                    className="p-2.5 rounded-lg border border-border bg-gray-50/60 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-accent-light text-accent-dark flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-ink uppercase text-[11px]">{evt.status}</span>
                          {evt.rawEvent?.fromStatus && (
                            <span className="text-[10px] text-gray-400">
                              (from {evt.rawEvent.fromStatus})
                            </span>
                          )}
                        </div>
                        {evt.rawEvent?.reason && (
                          <p className="text-[11px] text-gray-600 mt-0.5">
                            <strong>Reason:</strong> {evt.rawEvent.reason}
                          </p>
                        )}
                        {evt.rawEvent?.notes && (
                          <p className="text-[10.5px] text-gray-500 mt-0.5 italic">{evt.rawEvent.notes}</p>
                        )}
                      </div>
                    </div>
                    <span className="font-mono text-[10px] text-gray-400 whitespace-nowrap">
                      {new Date(evt.changedAt || evt.changed_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-border pt-2.5 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-ink font-semibold rounded-md transition-colors text-xs cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
