import React, { useState, useEffect } from 'react';
import { getProductBundle, setProductBundle, getProducts } from '../../api/products';
import { toast } from 'react-hot-toast';

export default function BundleComponentsModal({ product, isOpen, onClose, onSaved }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [components, setComponents] = useState([]);
  const [availableProducts, setAvailableProducts] = useState([]);

  // New component draft line
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedQty, setSelectedQty] = useState(1);
  const [selectedNotes, setSelectedNotes] = useState('');

  useEffect(() => {
    if (isOpen && product) {
      setLoading(true);
      Promise.all([
        getProductBundle(product.id),
        getProducts({ limit: 300, status: 'active' }),
      ])
        .then(([bundleData, prodsData]) => {
          const comps = (bundleData?.components || []).map((c) => ({
            componentProductId: c.componentProductId,
            quantity: c.quantity,
            notes: c.notes || '',
            product: c.componentProduct || {},
          }));
          setComponents(comps);
          // Filter out the parent product from available options to prevent cycles
          setAvailableProducts(
            (prodsData.products || []).filter((p) => p.id !== product.id && p.type !== 'bundle')
          );
        })
        .catch((err) => {
          console.error(err);
          toast.error('Failed to load bundle details');
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  const handleAddComponent = () => {
    if (!selectedProductId) {
      toast.error('Please select a component product');
      return;
    }

    const existingIndex = components.findIndex((c) => c.componentProductId === selectedProductId);
    const prodObj = availableProducts.find((p) => p.id === selectedProductId);

    if (existingIndex >= 0) {
      const updated = [...components];
      updated[existingIndex].quantity += parseInt(selectedQty, 10) || 1;
      setComponents(updated);
    } else {
      setComponents([
        ...components,
        {
          componentProductId: selectedProductId,
          quantity: Math.max(1, parseInt(selectedQty, 10) || 1),
          notes: selectedNotes,
          product: prodObj || {},
        },
      ]);
    }

    setSelectedProductId('');
    setSelectedQty(1);
    setSelectedNotes('');
  };

  const handleRemoveComponent = (index) => {
    setComponents(components.filter((_, idx) => idx !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = components.map((c) => ({
        componentProductId: c.componentProductId,
        quantity: c.quantity,
        notes: c.notes,
      }));
      await setProductBundle(product.id, payload);
      toast.success(
        payload.length > 0
          ? `Bundle kit saved with ${payload.length} component items`
          : 'Bundle items removed. Reverted to standard product.'
      );
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save bundle');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-3">
      <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-base">📦</span>
              <h2 className="text-sm font-bold text-gray-900">Configure Combo / Bundle Kit</h2>
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Parent SKU: <span className="font-mono font-bold text-accent">{product.internalSku}</span> ({product.title})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs flex-1">
          <div className="bg-indigo-50/60 border border-indigo-100 rounded p-2.5 text-indigo-900 text-[11px] leading-relaxed">
            <strong>How Bundles Work in Orderly OMS:</strong> When an order containing this bundle is confirmed, the inventory ledger automatically explodes this SKU and reserves the exact quantities of each individual component product below.
          </div>

          {/* Add Component Line */}
          <div className="bg-gray-50 border border-gray-200 rounded p-2.5 space-y-2">
            <span className="font-bold text-gray-800 text-[11px] block">Add Component Product</span>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="sm:col-span-7">
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full h-8 text-xs border border-gray-300 rounded px-2 bg-white font-mono"
                >
                  <option value="">-- Select Component SKU --</option>
                  {availableProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.internalSku} - {p.title} (Stock: {p.stock})
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-3">
                <input
                  type="number"
                  min="1"
                  placeholder="Qty"
                  value={selectedQty}
                  onChange={(e) => setSelectedQty(e.target.value)}
                  className="w-full h-8 text-xs border border-gray-300 rounded px-2"
                />
              </div>

              <div className="sm:col-span-2">
                <button
                  type="button"
                  onClick={handleAddComponent}
                  className="w-full h-8 text-xs font-semibold bg-accent text-white hover:bg-accent-dark rounded transition-colors cursor-pointer"
                >
                  + Add
                </button>
              </div>
            </div>
          </div>

          {/* Existing Components List */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-gray-800 text-xs">Bundle Components ({components.length})</span>
            </div>

            {loading ? (
              <div className="py-6 text-center text-gray-400">Loading components...</div>
            ) : components.length === 0 ? (
              <div className="p-4 border border-dashed border-gray-300 rounded text-center text-gray-500">
                No components added yet. This is currently treated as a standard simple SKU.
              </div>
            ) : (
              <div className="border border-gray-200 rounded divide-y divide-gray-100 overflow-hidden">
                {components.map((comp, idx) => (
                  <div key={comp.componentProductId} className="p-2 flex items-center justify-between hover:bg-gray-50">
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-mono font-bold text-accent text-[11px]">
                          {comp.product.internalSku || 'SKU'}
                        </span>
                        <span className="text-[10px] text-gray-500 truncate max-w-[200px]">
                          {comp.product.title}
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        In Stock: {comp.product.stock || 0} units
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <span className="font-bold text-gray-900 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded text-[11px]">
                        x{comp.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveComponent(idx)}
                        className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                        title="Remove component"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between shrink-0">
          <span className="text-[10px] text-gray-500">
            {components.length > 0 ? 'Will be marked as type "bundle"' : 'Will be marked as type "simple"'}
          </span>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="h-7 px-3 text-xs text-gray-700 hover:bg-gray-100 rounded border border-gray-300 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="h-7 px-4 text-xs font-semibold text-white bg-accent hover:bg-accent-dark rounded shadow-2xs cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Bundle Kit'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
