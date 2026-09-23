import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier } from '../api/manufacturing.js';

export default function SupplierMaster() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search with 1000ms debouncer
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 1000);
    return () => clearTimeout(timer);
  }, [search]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    gstin: '',
    city: '',
    state: '',
    address: '',
    notes: '',
  });

  async function loadSuppliers() {
    setLoading(true);
    try {
      const data = await getSuppliers();
      setSuppliers(data || []);
    } catch (err) {
      toast.error('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSuppliers();
  }, []);

  function handleOpenAdd() {
    setEditingSupplier(null);
    setFormData({
      name: '',
      contactPerson: '',
      phone: '',
      email: '',
      gstin: '',
      city: '',
      state: '',
      address: '',
      notes: '',
    });
    setIsModalOpen(true);
  }

  function handleOpenEdit(supplier) {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name || '',
      contactPerson: supplier.contactPerson || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      gstin: supplier.gstin || '',
      city: supplier.city || '',
      state: supplier.state || '',
      address: supplier.address || '',
      notes: supplier.notes || '',
    });
    setIsModalOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!formData.name) {
      toast.error('Supplier / Vendor name is required');
      return;
    }

    try {
      if (editingSupplier) {
        await updateSupplier(editingSupplier.id, formData);
        toast.success('Supplier updated successfully');
      } else {
        await createSupplier(formData);
        toast.success('Supplier added successfully');
      }
      setIsModalOpen(false);
      loadSuppliers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save supplier');
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Are you sure you want to remove this supplier?')) return;
    try {
      await deleteSupplier(id);
      toast.success('Supplier deleted');
      loadSuppliers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete supplier');
    }
  }

  // Filtered suppliers
  const filteredSuppliers = suppliers.filter((s) => {
    if (!debouncedSearch) return true;
    const q = debouncedSearch.toLowerCase();
    return (
      s.name?.toLowerCase().includes(q) ||
      s.contactPerson?.toLowerCase().includes(q) ||
      s.city?.toLowerCase().includes(q) ||
      s.gstin?.toLowerCase().includes(q)
    );
  });

  const uniqueCities = new Set(suppliers.map((s) => s.city).filter(Boolean)).size;

  return (
    <div className="h-full flex flex-col p-3 md:p-3.5 font-sans space-y-2 max-w-full overflow-hidden">
      {/* Top Header */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
              Masters Module
            </span>
            <h1 className="text-lg font-bold text-ink tracking-tight">Supplier Master</h1>
          </div>
          <p className="text-[10.5px] text-gray-500">
            Manage verified mills, fabric suppliers, trim vendors, GSTIN records & contact info
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Refresh Button */}
          <button
            onClick={() => {
              loadSuppliers();
              toast.success('Suppliers refreshed');
            }}
            disabled={loading}
            className="h-7 px-2.5 text-[11px] font-semibold bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-ink hover:border-gray-400 rounded-md transition-all flex items-center space-x-1.5 shadow-2xs group cursor-pointer"
            title="Refresh suppliers list"
          >
            <svg
              className={`w-3.5 h-3.5 text-gray-500 group-hover:text-ink ${
                loading ? 'animate-spin text-accent' : 'group-hover:rotate-180 transition-transform duration-300'
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span>Refresh</span>
          </button>

          {/* Add Supplier Button */}
          <button
            onClick={handleOpenAdd}
            className="h-7 px-3 text-[11px] font-semibold bg-ink text-white hover:bg-black rounded-md transition-colors flex items-center space-x-1 shadow-xs"
          >
            <span className="text-xs font-bold">+</span>
            <span>Add Supplier</span>
          </button>
        </div>
      </div>

      {/* 4 Compact KPI Cards */}
      <div className="shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-white border border-border rounded-lg px-2.5 py-1.5 shadow-2xs flex items-center justify-between">
          <div className="flex items-center space-x-2 min-w-0">
            <div className="w-6 h-6 rounded bg-indigo-50 text-indigo-600 border border-indigo-200/60 flex items-center justify-center shrink-0">
              🏭
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider truncate">Total Suppliers</p>
              <h3 className="text-xs font-bold text-ink leading-tight">{suppliers.length} Vendors</h3>
            </div>
          </div>
        </div>

        <div className="bg-white border border-border rounded-lg px-2.5 py-1.5 shadow-2xs flex items-center justify-between">
          <div className="flex items-center space-x-2 min-w-0">
            <div className="w-6 h-6 rounded bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center justify-center shrink-0">
              ✓
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-semibold text-emerald-600 uppercase tracking-wider truncate">GST Registered</p>
              <h3 className="text-xs font-bold text-emerald-700 leading-tight">
                {suppliers.filter((s) => s.gstin).length} Verified
              </h3>
            </div>
          </div>
        </div>

        <div className="bg-white border border-border rounded-lg px-2.5 py-1.5 shadow-2xs flex items-center justify-between">
          <div className="flex items-center space-x-2 min-w-0">
            <div className="w-6 h-6 rounded bg-blue-50 text-blue-600 border border-blue-200/60 flex items-center justify-center shrink-0">
              📍
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-semibold text-blue-600 uppercase tracking-wider truncate">Sourcing Hubs</p>
              <h3 className="text-xs font-bold text-blue-700 leading-tight">{uniqueCities} Cities</h3>
            </div>
          </div>
        </div>

        <div className="bg-white border border-border rounded-lg px-2.5 py-1.5 shadow-2xs flex items-center justify-between">
          <div className="flex items-center space-x-2 min-w-0">
            <div className="w-6 h-6 rounded bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center justify-center shrink-0">
              📞
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-semibold text-amber-600 uppercase tracking-wider truncate">With Direct Phone</p>
              <h3 className="text-xs font-bold text-amber-700 leading-tight">
                {suppliers.filter((s) => s.phone).length} Contacts
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="flex-1 min-h-0 flex flex-col bg-white border border-border rounded-lg overflow-hidden shadow-xs">
        {/* Toolbar */}
        <div className="shrink-0 py-1.5 px-3 border-b border-border bg-gray-50/40">
          <div className="relative max-w-sm">
            <svg
              className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search vendor name, contact person, GSTIN, city…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="!h-7 !min-h-0 w-full pr-2.5 text-[11px] bg-white border border-border text-ink rounded-md outline-none focus:border-accent focus:ring-1 focus:ring-accent placeholder-gray-400 !py-0 shadow-2xs"
              style={{ height: '28px', minHeight: '28px', paddingLeft: '2rem' }}
            />
          </div>
        </div>

        {/* Scrollable Table */}
        <div className="flex-1 min-h-0 overflow-auto w-full">
          <table className="w-full min-w-[950px] text-left text-xs text-ink">
            <thead className="sticky top-0 z-10 bg-gray-50 text-gray-500 uppercase text-[9px] font-bold tracking-wider border-b border-border shadow-2xs">
              <tr>
                <th className="px-2.5 py-2 text-center w-10 bg-gray-50">#</th>
                <th className="px-3 py-2 min-w-[200px] bg-gray-50">Supplier / Mill Name</th>
                <th className="px-3 py-2 min-w-[140px] bg-gray-50">Contact Person</th>
                <th className="px-3 py-2 min-w-[130px] bg-gray-50">Phone / Mobile</th>
                <th className="px-3 py-2 min-w-[160px] bg-gray-50">Email</th>
                <th className="px-3 py-2 min-w-[150px] bg-gray-50">GSTIN</th>
                <th className="px-3 py-2 min-w-[140px] bg-gray-50">City / State</th>
                <th className="px-3 py-2 text-right w-24 bg-gray-50">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                    <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <span className="text-xs">Loading suppliers…</span>
                  </td>
                </tr>
              ) : filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                    <p className="font-semibold text-ink text-xs mb-0.5">No suppliers found</p>
                    <p className="text-gray-400 text-[11px] mb-3">Add your textile mills and packaging vendors to track raw material purchases.</p>
                    <button
                      onClick={handleOpenAdd}
                      className="px-3 py-1.5 text-xs font-semibold bg-ink text-white rounded-md hover:bg-black"
                    >
                      + Add First Supplier
                    </button>
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((s, idx) => (
                  <tr key={s.id} className="hover:bg-blue-50/20 transition-colors">
                    <td className="px-2.5 py-1.5 text-center text-[10.5px] font-mono text-gray-400">{idx + 1}</td>
                    <td className="px-3 py-1.5">
                      <span className="font-bold text-ink block text-[11.5px] leading-tight">{s.name}</span>
                      {s.notes && <span className="text-[10px] text-gray-400 truncate max-w-xs block">{s.notes}</span>}
                    </td>
                    <td className="px-3 py-1.5 text-[11px] text-gray-700">{s.contactPerson || '—'}</td>
                    <td className="px-3 py-1.5 font-mono text-[11px] text-ink">{s.phone || '—'}</td>
                    <td className="px-3 py-1.5 text-[10.5px] text-gray-600 truncate max-w-[160px]">{s.email || '—'}</td>
                    <td className="px-3 py-1.5 font-mono text-[10.5px] font-medium text-gray-700">{s.gstin || '—'}</td>
                    <td className="px-3 py-1.5 text-[10.5px] text-gray-600">
                      {[s.city, s.state].filter(Boolean).join(', ') || '—'}
                    </td>
                    <td className="px-3 py-1.5 text-right space-x-1">
                      <button
                        onClick={() => handleOpenEdit(s)}
                        className="px-1.5 py-0.5 text-[10.5px] bg-gray-100 hover:bg-gray-200 text-ink rounded font-medium"
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="px-1.5 py-0.5 text-[10.5px] bg-rose-50 hover:bg-rose-100 text-rose-600 rounded font-medium"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Supplier Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-border rounded-xl max-w-md w-full p-5 shadow-xl space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <h3 className="text-sm font-bold text-ink">
                {editingSupplier ? 'Edit Supplier Record' : 'Add New Supplier / Vendor'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-ink text-lg font-bold">
                &times;
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-2.5">
              <div>
                <label className="block font-medium text-ink mb-1">Company / Mill Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Vardhman Textiles Ltd"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full h-8 px-2.5 bg-white border border-border rounded text-xs outline-none focus:border-accent"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-ink mb-1">Contact Person</label>
                  <input
                    type="text"
                    placeholder="e.g. Rajesh Sharma"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    className="w-full h-8 px-2 bg-white border border-border rounded text-xs outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block font-medium text-ink mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="e.g. +91 98250 12345"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full h-8 px-2 bg-white border border-border rounded text-xs outline-none focus:border-accent font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-ink mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="e.g. sales@vendor.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full h-8 px-2 bg-white border border-border rounded text-xs outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block font-medium text-ink mb-1">GSTIN Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 24AAACV1234F1Z5"
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                    className="w-full h-8 px-2 bg-white border border-border rounded text-xs outline-none focus:border-accent font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-ink mb-1">City</label>
                  <input
                    type="text"
                    placeholder="e.g. Surat"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full h-8 px-2 bg-white border border-border rounded text-xs outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block font-medium text-ink mb-1">State</label>
                  <input
                    type="text"
                    placeholder="e.g. Gujarat"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full h-8 px-2 bg-white border border-border rounded text-xs outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-ink mb-1">Business Address</label>
                <input
                  type="text"
                  placeholder="Plot number, market, road..."
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full h-8 px-2.5 bg-white border border-border rounded text-xs outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block font-medium text-ink mb-1">Notes / Supply Specialties</label>
                <input
                  type="text"
                  placeholder="e.g. Supplies 180 GSM combed cotton, 30 days payment terms"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full h-8 px-2.5 bg-white border border-border rounded text-xs outline-none focus:border-accent"
                />
              </div>

              <div className="pt-2 border-t border-border flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 bg-white border border-border text-ink rounded"
                >
                  Cancel
                </button>
                <button type="submit" className="px-3.5 py-1.5 bg-ink text-white rounded font-medium">
                  {editingSupplier ? 'Update Supplier' : 'Save Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
