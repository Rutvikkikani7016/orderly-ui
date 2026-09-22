import React from 'react';
import { toast } from 'react-hot-toast';

export default function ProductDetailsModal({ product, onClose, onEdit }) {
  if (!product) return null;

  const hasDimensions = product.packageLength || product.packageBreadth || product.packageHeight;
  const dimStr = hasDimensions
    ? `${parseFloat(product.packageLength || 0)} × ${parseFloat(product.packageBreadth || 0)} × ${parseFloat(product.packageHeight || 0)} cm`
    : null;

  const volumetricWeight = hasDimensions
    ? ((parseFloat(product.packageLength || 0) * parseFloat(product.packageBreadth || 0) * parseFloat(product.packageHeight || 0)) / 5000).toFixed(2)
    : null;

  const discountPercent =
    product.mrp && product.sellingPrice && product.mrp > product.sellingPrice
      ? Math.round(((product.mrp - product.sellingPrice) / product.mrp) * 100)
      : null;

  function handleCopyDetails() {
    const text = `OrderNest Product Specifications:
SKU: ${product.internalSku}
Title: ${product.title}
Category: ${product.category || 'N/A'}
Selling Price: ₹${product.sellingPrice !== null ? parseFloat(product.sellingPrice).toFixed(2) : '0.00'}
MRP: ₹${product.mrp !== null ? parseFloat(product.mrp).toFixed(2) : '0.00'}
Payout/Settlement: ₹${product.costPrice !== null ? parseFloat(product.costPrice).toFixed(2) : '0.00'}
Weight: ${product.weightKg !== null ? `${parseFloat(product.weightKg).toFixed(2)} kg` : 'N/A'}
Dimensions: ${dimStr || 'N/A'}
HSN Code: ${product.hsnCode || 'N/A'}
Tax Code: ${product.taxCode || 'N/A'}
Stock: ${product.stock} units`;

    navigator.clipboard.writeText(text);
    toast.success('Product details copied to clipboard!');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white border border-border rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-4 my-8 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-border pb-3.5">
          <div className="space-y-1 pr-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold bg-gray-100 text-gray-800 px-2 py-0.5 rounded border border-gray-200">
                SKU: {product.internalSku}
              </span>
              {product.category && (
                <span className="text-[11px] font-medium bg-slate-50 text-slate-700 px-2 py-0.5 rounded border border-slate-200 capitalize">
                  {product.category.replace(/_/g, ' ')}
                </span>
              )}
              <span
                className={`inline-flex items-center space-x-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                  product.status === 'active'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    product.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                ></span>
                <span>{product.status}</span>
              </span>
            </div>
            <h3 className="text-base font-bold text-ink leading-snug pt-1">
              {product.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-ink text-2xl font-bold leading-none p-1 transition-colors"
          >
            &times;
          </button>
        </div>

        {/* Modal Content - Organized Sections */}
        <div className="space-y-4 text-xs">
          {/* Section 1: Financials & Pricing Overview */}
          <div>
            <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
              <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Pricing & Settlements</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="bg-gray-50/80 border border-border/80 rounded-xl p-3">
                <p className="text-[10px] text-gray-500 font-medium">Selling Price</p>
                <p className="text-lg font-bold text-ink mt-0.5">
                  {product.sellingPrice !== null
                    ? `₹${parseFloat(product.sellingPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                    : '—'}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">Listing Price</p>
              </div>

              <div className="bg-gray-50/80 border border-border/80 rounded-xl p-3">
                <p className="text-[10px] text-gray-500 font-medium">MRP (Maximum Retail Price)</p>
                <p className="text-lg font-bold text-gray-700 mt-0.5">
                  {product.mrp !== null
                    ? `₹${parseFloat(product.mrp).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                    : '—'}
                </p>
                {discountPercent !== null && (
                  <p className="text-[10px] font-semibold text-emerald-600 mt-0.5">
                    {discountPercent}% off MRP
                  </p>
                )}
              </div>

              <div className="bg-emerald-50/60 border border-emerald-200/70 rounded-xl p-3">
                <p className="text-[10px] text-emerald-800 font-medium">Payout / Settlement (Cost)</p>
                <p className="text-lg font-bold text-emerald-700 mt-0.5">
                  {product.costPrice !== null
                    ? `₹${parseFloat(product.costPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                    : '—'}
                </p>
                <p className="text-[10px] text-emerald-600 font-medium mt-0.5">Expected net bank settlement</p>
              </div>
            </div>
          </div>

          {/* Section 2: Package, Weight & Dimensions (For Marketplace Shipping) */}
          <div>
            <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
              <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <span>Shipping & Package Logistics</span>
            </h4>
            <div className="bg-gray-50/70 border border-border rounded-xl p-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <p className="text-[10px] text-gray-400 font-medium">Dead Weight</p>
                <p className="text-sm font-bold text-ink mt-0.5">
                  {product.weightKg !== null && product.weightKg !== undefined
                    ? `${parseFloat(product.weightKg).toFixed(2)} kg`
                    : '—'}
                </p>
                {product.weightKg !== null && (
                  <p className="text-[10px] text-gray-400">({parseFloat(product.weightKg) * 1000} g)</p>
                )}
              </div>

              <div>
                <p className="text-[10px] text-gray-400 font-medium">Dimensions (L × B × H)</p>
                <p className="text-xs font-mono font-bold text-ink mt-0.5">
                  {dimStr || '—'}
                </p>
                {volumetricWeight && (
                  <p className="text-[10px] text-gray-400">
                    Volumetric: {volumetricWeight} kg
                  </p>
                )}
              </div>

              <div>
                <p className="text-[10px] text-gray-400 font-medium">Procurement SLA</p>
                <p className="text-sm font-bold text-ink mt-0.5">
                  {product.procurementSla || 1} day(s)
                </p>
                <p className="text-[10px] text-gray-400">Dispatch turnaround</p>
              </div>

              <div>
                <p className="text-[10px] text-gray-400 font-medium">Country of Origin</p>
                <p className="text-sm font-bold text-ink mt-0.5">
                  {product.countryOfOrigin || 'India (IN)'}
                </p>
                <p className="text-[10px] text-gray-400">Mandatory compliance</p>
              </div>
            </div>
          </div>

          {/* Section 3: Tax & GST Compliance */}
          <div>
            <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
              <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Taxation & GST</span>
            </h4>
            <div className="bg-gray-50/70 border border-border rounded-xl p-3.5 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <p className="text-[10px] text-gray-400 font-medium">HSN Code</p>
                <p className="text-sm font-mono font-bold text-ink mt-0.5">
                  {product.hsnCode || '—'}
                </p>
              </div>

              <div>
                <p className="text-[10px] text-gray-400 font-medium">GST Tax Code</p>
                <p className="text-xs font-semibold text-ink bg-white px-2 py-0.5 rounded border border-border inline-block mt-0.5">
                  {product.taxCode || '—'}
                </p>
              </div>

              <div>
                <p className="text-[10px] text-gray-400 font-medium">Stock Inventory</p>
                <p className="text-sm font-bold text-ink mt-0.5">
                  {product.stock} units
                </p>
              </div>
            </div>
          </div>

          {/* Section 4: Multi-Channel Marketplace Mappings */}
          <div>
            <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
              <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <span>Multi-Channel Marketplace Mappings</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Flipkart Mapping */}
              <div className="p-3 rounded-xl border bg-blue-50/50 border-blue-200/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-700 text-xs flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                    <span>Flipkart Listing</span>
                  </span>
                  <span className="text-[10px] bg-blue-100/70 text-blue-800 font-semibold px-1.5 py-0.2 rounded">
                    Connected
                  </span>
                </div>
                {(() => {
                  const fl = (product.platformListings || []).find(
                    (l) => (l.platform || '').toLowerCase() === 'flipkart'
                  );
                  return (
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-gray-500">Channel SKU:</span>
                        <span className="font-mono font-bold text-ink truncate max-w-[170px]" title={fl?.platformSku || product.internalSku}>
                          {fl?.platformSku || product.internalSku}
                        </span>
                      </div>
                      {fl?.fsnOrAsin && (
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-gray-500">Flipkart FSN:</span>
                          <span className="font-mono font-bold text-blue-900 bg-white px-1.5 py-0.2 rounded border border-blue-200">
                            {fl.fsnOrAsin}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Meesho Mapping */}
              <div className="p-3 rounded-xl border bg-fuchsia-50/50 border-fuchsia-200/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-fuchsia-700 text-xs flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-fuchsia-600"></span>
                    <span>Meesho Catalog</span>
                  </span>
                </div>
                {(() => {
                  const ms = (product.platformListings || []).find(
                    (l) => (l.platform || '').toLowerCase() === 'meesho'
                  );
                  return (
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-gray-500">Supplier SKU:</span>
                        <span className="font-mono font-bold text-ink truncate max-w-[170px]">
                          {ms?.platformSku || '—'}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Amazon Mapping */}
              <div className="p-3 rounded-xl border bg-amber-50/50 border-amber-200/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-800 text-xs flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <span>Amazon India</span>
                  </span>
                </div>
                {(() => {
                  const am = (product.platformListings || []).find(
                    (l) => (l.platform || '').toLowerCase() === 'amazon'
                  );
                  return (
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-gray-500">Seller SKU / ASIN:</span>
                        <span className="font-mono font-bold text-ink truncate max-w-[170px]">
                          {am?.platformSku || '—'}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Myntra Mapping */}
              <div className="p-3 rounded-xl border bg-rose-50/50 border-rose-200/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-rose-700 text-xs flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    <span>Myntra</span>
                  </span>
                </div>
                {(() => {
                  const my = (product.platformListings || []).find(
                    (l) => (l.platform || '').toLowerCase() === 'myntra'
                  );
                  return (
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-gray-500">Vendor SKU:</span>
                        <span className="font-mono font-bold text-ink truncate max-w-[170px]">
                          {my?.platformSku || '—'}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="pt-3.5 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={handleCopyDetails}
            className="text-xs font-semibold text-accent hover:underline flex items-center space-x-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
            <span>Copy All Product Details</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-gray-50 border border-border text-ink rounded-lg transition-colors font-medium text-xs shadow-2xs"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(product);
              }}
              className="px-4 py-2 bg-ink text-white hover:bg-black font-semibold rounded-lg transition-colors text-xs flex items-center space-x-1.5 shadow-xs"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>Edit Product</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
