import React from 'react';
import CustomDropdown from '../CustomDropdown.jsx';

export default function ProductFormModal({
  isOpen,
  onClose,
  onSubmit,
  formData,
  setFormData,
  editingProduct,
  submitting,
  statusFormOptions,
}) {
  if (!isOpen) return null;

  const discountPercent =
    formData.mrp && formData.sellingPrice && parseFloat(formData.mrp) > parseFloat(formData.sellingPrice)
      ? Math.round(((parseFloat(formData.mrp) - parseFloat(formData.sellingPrice)) / parseFloat(formData.mrp)) * 100)
      : null;

  const volumetricWeight =
    formData.packageLength && formData.packageBreadth && formData.packageHeight
      ? ((parseFloat(formData.packageLength || 0) * parseFloat(formData.packageBreadth || 0) * parseFloat(formData.packageHeight || 0)) / 5000).toFixed(2)
      : null;

  const estimatedMargin =
    formData.sellingPrice && formData.costPrice && parseFloat(formData.sellingPrice) > 0
      ? (parseFloat(formData.sellingPrice) - parseFloat(formData.costPrice)).toFixed(2)
      : null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex flex-col justify-between overflow-hidden animate-in fade-in duration-150">
      {/* Top Sticky Header */}
      <div className="bg-white border-b border-border px-5 py-3.5 sm:px-8 flex items-center justify-between shadow-xs shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-ink text-white flex items-center justify-center font-bold text-sm shadow-xs">
            {editingProduct ? '✏️' : '✨'}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base sm:text-lg font-bold text-ink">
                {editingProduct ? `Edit Product: ${editingProduct.internalSku}` : 'Add New Master Product'}
              </h2>
              {editingProduct && (
                <span
                  className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                    formData.status === 'active'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {formData.status}
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-500">
              {editingProduct
                ? 'Update master inventory, dimensions, HSN codes, and multi-channel marketplace mappings'
                : 'Create a new master catalog SKU with shipping specs and marketplace aliases'}
            </p>
          </div>
        </div>

        <div className="flex items-center">
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-ink text-xl font-bold transition-colors"
            title="Close"
          >
            &times;
          </button>
        </div>
      </div>

      {/* Main Scrollable Form Body */}
      <form onSubmit={onSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-gray-50/70">
        <div className="max-w-6xl mx-auto space-y-6 text-xs">
          {/* Top 2-Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Main Column: Identity & Channel SKUs (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Card 1: Master Product Information */}
              <div className="bg-white border border-border rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center space-x-2 border-b border-gray-100 pb-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-accent"></span>
                  <h3 className="font-bold text-sm text-ink">Master Product Identity</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Master SKU */}
                  <div>
                    <label className="block font-semibold text-ink mb-1 text-xs">
                      Master Internal SKU <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. CHOLI-9-GOLD-5"
                      value={formData.internalSku}
                      onChange={(e) => setFormData({ ...formData, internalSku: e.target.value })}
                      className="w-full h-9 px-3 bg-white border border-border rounded-lg text-ink text-xs outline-none focus:border-accent focus:ring-1 focus:ring-accent font-mono font-bold"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">Unique primary key identifier across all channels</p>
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block font-semibold text-ink mb-1 text-xs">
                      Category / Subcategory
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Kids Lehenga Choli or Apparel"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full h-9 px-3 bg-white border border-border rounded-lg text-ink text-xs outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                    />
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block font-semibold text-ink mb-1 text-xs">
                    Product Title / Listing Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MADHAV IMPEX Girls Lehenga Choli Ethnic Wear Set"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full h-9 px-3 bg-white border border-border rounded-lg text-ink text-xs outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  />
                </div>

                {/* Stock & Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-gray-100">
                  <div>
                    <label className="block font-semibold text-ink mb-1 text-xs">
                      Available Stock (Units)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="100"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                      className="w-full h-9 px-3 bg-white border border-border rounded-lg text-ink text-xs outline-none focus:border-accent focus:ring-1 focus:ring-accent font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-ink mb-1 text-xs">
                      Publication Status
                    </label>
                    <CustomDropdown
                      value={formData.status}
                      onChange={(val) => setFormData({ ...formData, status: val })}
                      options={statusFormOptions}
                      size="sm"
                      className="w-full"
                      buttonClassName="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Card 2: Multi-Platform Marketplace Mappings */}
              <div className="bg-white border border-border rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                    <h3 className="font-bold text-sm text-ink">Marketplace Channel SKUs & Mappings</h3>
                  </div>
                  <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded font-semibold">
                    Auto-Linked on Order Sync
                  </span>
                </div>
                <p className="text-[11px] text-gray-500">
                  If Flipkart, Meesho, or Amazon use alias SKU codes for this master product, enter them below. Order sync will automatically map incoming orders!
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Flipkart SKU */}
                  <div className="p-3 bg-blue-50/50 border border-blue-200/80 rounded-xl space-y-1.5">
                    <label className="block font-semibold text-[11px] text-blue-900 flex items-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                      <span>Flipkart SKU / FSN</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. CHOLI 9_Gold Mix 5"
                      value={formData.platformSkus.flipkart}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          platformSkus: { ...formData.platformSkus, flipkart: e.target.value },
                        })
                      }
                      className="w-full h-8 px-2.5 bg-white border border-blue-200 rounded text-ink text-xs outline-none focus:border-blue-500 font-mono"
                    />
                  </div>

                  {/* Meesho SKU */}
                  <div className="p-3 bg-fuchsia-50/50 border border-fuchsia-200/80 rounded-xl space-y-1.5">
                    <label className="block font-semibold text-[11px] text-fuchsia-900 flex items-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-fuchsia-600"></span>
                      <span>Meesho Supplier SKU</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. MS-CHOLI-9"
                      value={formData.platformSkus.meesho}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          platformSkus: { ...formData.platformSkus, meesho: e.target.value },
                        })
                      }
                      className="w-full h-8 px-2.5 bg-white border border-fuchsia-200 rounded text-ink text-xs outline-none focus:border-fuchsia-500 font-mono"
                    />
                  </div>

                  {/* Amazon SKU */}
                  <div className="p-3 bg-amber-50/50 border border-amber-200/80 rounded-xl space-y-1.5">
                    <label className="block font-semibold text-[11px] text-amber-900 flex items-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      <span>Amazon Seller SKU / ASIN</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. AZ-CHOLI-9"
                      value={formData.platformSkus.amazon}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          platformSkus: { ...formData.platformSkus, amazon: e.target.value },
                        })
                      }
                      className="w-full h-8 px-2.5 bg-white border border-amber-200 rounded text-ink text-xs outline-none focus:border-amber-500 font-mono"
                    />
                  </div>

                  {/* Myntra SKU */}
                  <div className="p-3 bg-rose-50/50 border border-rose-200/80 rounded-xl space-y-1.5">
                    <label className="block font-semibold text-[11px] text-rose-900 flex items-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                      <span>Myntra Vendor SKU</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. MY-CHOLI-9"
                      value={formData.platformSkus.myntra}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          platformSkus: { ...formData.platformSkus, myntra: e.target.value },
                        })
                      }
                      className="w-full h-8 px-2.5 bg-white border border-rose-200 rounded text-ink text-xs outline-none focus:border-rose-500 font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Sidebar Column: Pricing & Logistics (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Card 3: Pricing & Settlement Financials */}
              <div className="bg-white border border-border rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center space-x-2 border-b border-gray-100 pb-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <h3 className="font-bold text-sm text-ink">Pricing & Settlements</h3>
                </div>

                <div className="space-y-3">
                  {/* Selling Price */}
                  <div>
                    <label className="block font-semibold text-ink mb-1 text-xs">
                      Selling Price (₹) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">₹</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="890.00"
                        value={formData.sellingPrice}
                        onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                        className="w-full h-9 pl-7 pr-3 bg-white border border-border rounded-lg text-ink text-xs outline-none focus:border-accent font-bold text-emerald-700"
                      />
                    </div>
                  </div>

                  {/* MRP */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-ink text-xs">MRP (Maximum Retail Price)</label>
                      {discountPercent !== null && (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded">
                          {discountPercent}% OFF
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">₹</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="2599.00"
                        value={formData.mrp}
                        onChange={(e) => setFormData({ ...formData, mrp: e.target.value })}
                        className="w-full h-9 pl-7 pr-3 bg-white border border-border rounded-lg text-ink text-xs outline-none focus:border-accent"
                      />
                    </div>
                  </div>

                  {/* Cost / Payout */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-ink text-xs">Expected Net Bank Settlement (₹)</label>
                      {estimatedMargin !== null && (
                        <span className="text-[10px] text-gray-500">
                          Fee/Deduction: ₹{estimatedMargin}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">₹</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="784.00"
                        value={formData.costPrice}
                        onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                        className="w-full h-9 pl-7 pr-3 bg-white border border-border rounded-lg text-ink text-xs outline-none focus:border-accent"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 4: Shipping Logistics & Package Dimensions */}
              <div className="bg-white border border-border rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    <h3 className="font-bold text-sm text-ink">Shipping & Package Dimensions</h3>
                  </div>
                  {volumetricWeight && (
                    <span className="text-[10px] font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                      Vol: {volumetricWeight} kg
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  {/* Weight */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-ink mb-1 text-xs">
                        Dead Weight (Kg)
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        placeholder="0.30"
                        value={formData.weightKg}
                        onChange={(e) => setFormData({ ...formData, weightKg: e.target.value })}
                        className="w-full h-9 px-3 bg-white border border-border rounded-lg text-ink text-xs outline-none focus:border-accent font-semibold"
                      />
                      {formData.weightKg && (
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          = {parseFloat(formData.weightKg || 0) * 1000} grams
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block font-semibold text-ink mb-1 text-xs">
                        Procurement SLA
                      </label>
                      <input
                        type="number"
                        min="1"
                        placeholder="1"
                        value={formData.procurementSla}
                        onChange={(e) => setFormData({ ...formData, procurementSla: e.target.value })}
                        className="w-full h-9 px-3 bg-white border border-border rounded-lg text-ink text-xs outline-none focus:border-accent"
                      />
                      <p className="text-[10px] text-gray-400 mt-0.5">Days to dispatch</p>
                    </div>
                  </div>

                  {/* Dimensions */}
                  <div>
                    <label className="block font-semibold text-ink mb-1 text-xs">
                      Package Size (L × B × H in cm)
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="L (cm)"
                        value={formData.packageLength}
                        onChange={(e) => setFormData({ ...formData, packageLength: e.target.value })}
                        className="w-full h-8 px-2 bg-white border border-border rounded text-ink text-xs outline-none focus:border-accent text-center font-mono"
                      />
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="B (cm)"
                        value={formData.packageBreadth}
                        onChange={(e) => setFormData({ ...formData, packageBreadth: e.target.value })}
                        className="w-full h-8 px-2 bg-white border border-border rounded text-ink text-xs outline-none focus:border-accent text-center font-mono"
                      />
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="H (cm)"
                        value={formData.packageHeight}
                        onChange={(e) => setFormData({ ...formData, packageHeight: e.target.value })}
                        className="w-full h-8 px-2 bg-white border border-border rounded text-ink text-xs outline-none focus:border-accent text-center font-mono"
                      />
                    </div>
                  </div>

                  {/* Origin */}
                  <div>
                    <label className="block font-semibold text-ink mb-1 text-xs">
                      Country of Origin
                    </label>
                    <input
                      type="text"
                      placeholder="IN or India"
                      value={formData.countryOfOrigin}
                      onChange={(e) => setFormData({ ...formData, countryOfOrigin: e.target.value })}
                      className="w-full h-9 px-3 bg-white border border-border rounded-lg text-ink text-xs outline-none focus:border-accent"
                    />
                  </div>
                </div>
              </div>

              {/* Card 5: Tax & GST Compliance */}
              <div className="bg-white border border-border rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center space-x-2 border-b border-gray-100 pb-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-violet-600"></span>
                  <h3 className="font-bold text-sm text-ink">Taxation & GST Compliance</h3>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-ink mb-1 text-xs">
                      HSN Code
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 6109"
                      value={formData.hsnCode}
                      onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })}
                      className="w-full h-9 px-3 bg-white border border-border rounded-lg text-ink text-xs outline-none focus:border-accent font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-ink mb-1 text-xs">
                      GST Tax Code
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. GST_APPAREL"
                      value={formData.taxCode}
                      onChange={(e) => setFormData({ ...formData, taxCode: e.target.value })}
                      className="w-full h-9 px-3 bg-white border border-border rounded-lg text-ink text-xs outline-none focus:border-accent font-medium"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Sticky Bottom Action Footer */}
      <div className="bg-white border-t border-border px-5 py-3.5 sm:px-8 flex items-center justify-between shadow-xs shrink-0">
        <p className="text-[11px] text-gray-400">
          All changes will automatically sync to OrderNest master catalog and CSV order imports.
        </p>

        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 rounded-lg transition-colors shadow-2xs"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className="px-5 py-2 bg-ink text-white hover:bg-black font-semibold rounded-lg transition-colors disabled:opacity-50 text-xs flex items-center space-x-1.5 shadow-xs"
          >
            {submitting ? 'Saving…' : editingProduct ? 'Update Product' : 'Create Product'}
          </button>
        </div>
      </div>
    </div>
  );
}
