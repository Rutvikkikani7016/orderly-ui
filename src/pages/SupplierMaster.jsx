import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier } from '../api/manufacturing.js';
import { DataTable, TableToolbar, SearchBar, TableIconButton } from '../components/common/index.js';

export default function SupplierMaster() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search with 1000ms debouncer
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
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

  const totalSuppliers = filteredSuppliers.length;
  const totalPages = Math.max(1, Math.ceil(totalSuppliers / limit));
  const safePage = Math.min(page, totalPages);
  const paginatedSuppliers = filteredSuppliers.slice((safePage - 1) * limit, safePage * limit);

  const uniqueCities = new Set(suppliers.map((s) => s.city).filter(Boolean)).size;

  // Standardized Table Columns
  const supplierColumns = [
    {
      key: 'index',
      header: '#',
      align: 'center',
      width: '40px',
      render: (_, idx, pageNum, pageSize) => (
        <span className="font-mono text-gray-400 text-[10.5px]">
          {(pageNum - 1) * pageSize + idx + 1}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Supplier / Mill Name',
      minWidth: '200px',
      render: (s) => (
        <div>
          <span className="font-bold text-ink block text-[11.5px] leading-tight">{s.name}</span>
          {s.notes && <span className="text-[10px] text-gray-400 truncate max-w-xs block">{s.notes}</span>}
        </div>
      ),
    },
    {
      key: 'contactPerson',
      header: 'Contact Person',
      minWidth: '140px',
      render: (s) => <span className="text-[11px] text-gray-700">{s.contactPerson || '—'}</span>,
    },
    {
      key: 'phone',
      header: 'Phone / Mobile',
      minWidth: '130px',
      render: (s) => <span className="font-mono text-[11px] text-ink">{s.phone || '—'}</span>,
    },
    {
      key: 'email',
      header: 'Email',
      minWidth: '160px',
      render: (s) => (
        <span className="text-[10.5px] text-gray-600 truncate max-w-[160px] block">{s.email || '—'}</span>
      ),
    },
    {
      key: 'gstin',
      header: 'GSTIN',
      minWidth: '150px',
      render: (s) => <span className="font-mono text-[10.5px] font-medium text-gray-700">{s.gstin || '—'}</span>,
    },
    {
      key: 'city',
      header: 'City / State',
      minWidth: '140px',
      render: (s) => (
        <span className="text-[10.5px] text-gray-600">
          {[s.city, s.state].filter(Boolean).join(', ') || '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      width: '80px',
      render: (s) => (
        <div className="flex items-center justify-end space-x-1">
          <TableIconButton
            variant="edit"
            onClick={() => handleOpenEdit(s)}
            title="Edit supplier record"
          />
          <TableIconButton
            variant="delete"
            onClick={() => handleDelete(s.id)}
            title="Delete supplier"
          />
        </div>
      ),
    },
  ];

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

      {/* Main Table Card via Reusable DataTable */}
      <DataTable
        columns={supplierColumns}
        data={paginatedSuppliers}
        loading={loading}
        minWidth="950px"
        toolbar={
          <TableToolbar>
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Search vendor name, contact person, GSTIN, city…"
            />
          </TableToolbar>
        }
        emptyState={{
          icon: '🏭',
          title: 'No suppliers found',
          description: 'Add your textile mills and packaging vendors to track raw material purchases.',
          actionButton: (
            <button
              onClick={handleOpenAdd}
              className="px-3 py-1.5 text-xs font-semibold bg-ink text-white rounded-md hover:bg-black"
            >
              + Add First Supplier
            </button>
          ),
        }}
        pagination={{
          page: safePage,
          limit,
          total: totalSuppliers,
          totalPages,
          onPageChange: setPage,
          onLimitChange: (newLimit) => {
            setLimit(newLimit);
            setPage(1);
          },
          itemName: 'suppliers',
        }}
      />

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
