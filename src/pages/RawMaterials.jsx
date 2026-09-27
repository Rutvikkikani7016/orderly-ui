import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  getRawMaterials,
  createRawMaterial,
  updateRawMaterial,
  deleteRawMaterial,
  getSuppliers,
  createSupplier,
  recordPurchaseInward,
  getMaterialCategories,
  getUnitsOfMeasure,
} from '../api/manufacturing.js';
import CustomDropdown from '../components/CustomDropdown.jsx';
import { DataTable, TableToolbar, SearchBar, TableIconButton } from '../components/common/index.js';

export default function RawMaterials() {
  const [items, setItems] = useState([]);
  const [metrics, setMetrics] = useState({
    totalItems: 0,
    lowStockCount: 0,
    totalInventoryValue: 0,
  });
  const [suppliers, setSuppliers] = useState([]);
  const [masterCategories, setMasterCategories] = useState([]);
  const [masterUnits, setMasterUnits] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search with 1000ms debouncer
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

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

  useEffect(() => {
    setPage(1);
  }, [categoryFilter]);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isInwardModalOpen, setIsInwardModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    category: 'fabric',
    unitOfMeasure: 'meter',
    currentStock: 0,
    minAlertStock: 10,
    averageCostPerUnit: 0,
    notes: '',
  });

  const [inwardData, setInwardData] = useState({
    supplierId: '',
    invoiceNumber: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    taxAmount: 0,
    items: [{ rawMaterialId: '', quantity: '', unitCost: '' }],
  });

  const [supplierData, setSupplierData] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    gstin: '',
    city: '',
    state: '',
  });

  // Dynamic category options derived from masterCategories if available
  const defaultCategoryOptions = [
    { value: 'all', label: 'All Categories' },
    { value: 'fabric', label: 'Cotton / Fabric (meters/kg)' },
    { value: 'rib', label: 'Neck Rib / Collar' },
    { value: 'thread', label: 'Sewing Thread' },
    { value: 'trim', label: 'Labels, Tags & Trims' },
    { value: 'packaging', label: 'Polybags & Cartons' },
    { value: 'other', label: 'Other Raw Supplies' },
  ];

  const categoryOptions = masterCategories.length > 0
    ? [
        { value: 'all', label: 'All Categories' },
        ...masterCategories.map((c) => ({
          value: c.code || c.name.toLowerCase(),
          label: c.name,
        })),
      ]
    : defaultCategoryOptions;

  async function loadData() {
    setLoading(true);
    try {
      const [data, supps, cats, uoms] = await Promise.all([
        getRawMaterials({
          category: categoryFilter,
          search: debouncedSearch,
        }),
        getSuppliers().catch(() => []),
        getMaterialCategories().catch(() => []),
        getUnitsOfMeasure().catch(() => []),
      ]);

      setItems(data.rawMaterials || []);
      if (data.metrics) {
        setMetrics(data.metrics);
      }
      setSuppliers(supps || []);
      if (cats && cats.length > 0) setMasterCategories(cats);
      if (uoms && uoms.length > 0) setMasterUnits(uoms);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load raw materials');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [categoryFilter, debouncedSearch]);

  function handleOpenAdd() {
    setEditingItem(null);
    setFormData({
      name: '',
      code: '',
      category: 'fabric',
      unitOfMeasure: 'meter',
      currentStock: 0,
      minAlertStock: 10,
      averageCostPerUnit: 0,
      notes: '',
    });
    setIsAddModalOpen(true);
  }

  function handleOpenEdit(item) {
    setEditingItem(item);
    setFormData({
      name: item.name,
      code: item.code || '',
      category: item.category || 'fabric',
      unitOfMeasure: item.unitOfMeasure || 'meter',
      currentStock: item.currentStock || 0,
      minAlertStock: item.minAlertStock || 10,
      averageCostPerUnit: item.averageCostPerUnit || 0,
      notes: item.notes || '',
    });
    setIsAddModalOpen(true);
  }

  async function handleSaveItem(e) {
    e.preventDefault();
    if (!formData.name) {
      toast.error('Please enter a name for the raw material');
      return;
    }

    try {
      if (editingItem) {
        await updateRawMaterial(editingItem.id, formData);
        toast.success('Raw material updated');
      } else {
        await createRawMaterial(formData);
        toast.success('Raw material created');
      }
      setIsAddModalOpen(false);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save raw material');
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this raw material?')) return;
    try {
      await deleteRawMaterial(id);
      toast.success('Raw material deleted');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  }

  async function handleInwardSubmit(e) {
    e.preventDefault();
    const validLines = inwardData.items.filter((it) => it.rawMaterialId && it.quantity && it.unitCost);
    if (validLines.length === 0) {
      toast.error('Please enter at least one raw material line item with quantity and cost');
      return;
    }

    try {
      await recordPurchaseInward({
        ...inwardData,
        items: validLines.map((it) => ({
          rawMaterialId: it.rawMaterialId,
          quantity: parseFloat(it.quantity),
          unitCost: parseFloat(it.unitCost),
        })),
      });
      toast.success('Inventory inward recorded and stock updated!');
      setIsInwardModalOpen(false);
      setInwardData({
        supplierId: '',
        invoiceNumber: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        taxAmount: 0,
        items: [{ rawMaterialId: '', quantity: '', unitCost: '' }],
      });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record purchase inward');
    }
  }

  async function handleSaveSupplier(e) {
    e.preventDefault();
    if (!supplierData.name) {
      toast.error('Please enter supplier name');
      return;
    }
    try {
      await createSupplier(supplierData);
      toast.success('Supplier added');
      setIsSupplierModalOpen(false);
      setSupplierData({
        name: '',
        contactPerson: '',
        phone: '',
        email: '',
        gstin: '',
        city: '',
        state: '',
      });
      const supps = await getSuppliers();
      setSuppliers(supps || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save supplier');
    }
  }

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  const safePage = Math.min(page, totalPages);
  const paginatedItems = items.slice((safePage - 1) * limit, safePage * limit);

  // Standardized Material Columns
  const materialColumns = [
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
      key: 'code',
      header: 'Code',
      minWidth: '130px',
      render: (it) => <span className="font-mono text-ink font-semibold text-[11px]">{it.code}</span>,
    },
    {
      key: 'name',
      header: 'Raw Material Name',
      minWidth: '220px',
      render: (it) => <span className="font-medium text-ink text-[11.5px]">{it.name}</span>,
    },
    {
      key: 'category',
      header: 'Category',
      minWidth: '120px',
      render: (it) => (
        <span className="inline-block text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-gray-100 text-gray-700 capitalize">
          {it.category}
        </span>
      ),
    },
    {
      key: 'currentStock',
      header: 'Current Stock',
      minWidth: '120px',
      render: (it) => {
        const stockNum = parseFloat(it.currentStock || 0);
        const minStock = parseFloat(it.minAlertStock || 0);
        const isLow = stockNum <= minStock;
        return (
          <div className="flex items-center space-x-1.5">
            <span className={`font-bold font-mono text-xs ${isLow ? 'text-rose-600' : 'text-emerald-700'}`}>
              {stockNum.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </span>
            {isLow && (
              <span className="text-[8.5px] bg-rose-50 text-rose-700 border border-rose-200 px-1 py-0.2 rounded font-bold">
                Low
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'unitOfMeasure',
      header: 'UOM',
      minWidth: '100px',
      render: (it) => <span className="text-[10.5px] text-gray-600 font-medium capitalize">{it.unitOfMeasure}</span>,
    },
    {
      key: 'avgRate',
      header: 'Avg Rate / Unit',
      minWidth: '120px',
      render: (it) => <span className="font-mono text-ink font-semibold">₹{parseFloat(it.averageCostPerUnit || 0).toFixed(2)}</span>,
    },
    {
      key: 'valuation',
      header: 'Valuation',
      minWidth: '120px',
      render: (it) => {
        const val = parseFloat(it.currentStock || 0) * parseFloat(it.averageCostPerUnit || 0);
        return <span className="font-mono text-ink font-bold">₹{Math.round(val).toLocaleString('en-IN')}</span>;
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      width: '80px',
      render: (it) => (
        <div className="flex items-center justify-end space-x-1">
          <TableIconButton
            variant="edit"
            onClick={() => handleOpenEdit(it)}
            title="Edit Raw Material"
          />
          <TableIconButton
            variant="delete"
            onClick={() => handleDelete(it.id)}
            title="Delete Raw Material"
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
          <h1 className="text-lg font-bold text-ink tracking-tight">Raw Materials & Sourcing</h1>
          <p className="text-[10.5px] text-gray-500">
            Fabric, trims, threads, labels & packaging procurement for manufacturing
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Refresh Button */}
          <button
            onClick={() => {
              loadData();
              toast.success('Inventory refreshed');
            }}
            disabled={loading}
            className="h-7 px-2.5 text-[11px] font-semibold bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-ink hover:border-gray-400 rounded-md transition-all flex items-center space-x-1.5 shadow-2xs group cursor-pointer"
            title="Refresh inventory data"
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

          {/* New Supplier */}
          <button
            onClick={() => setIsSupplierModalOpen(true)}
            className="h-7 px-2.5 text-[11px] font-semibold bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-ink hover:border-gray-400 rounded-md transition-all flex items-center space-x-1 shadow-2xs"
          >
            <span>+ Supplier</span>
          </button>

          {/* Record Inward Purchase (GRN) */}
          <button
            onClick={() => setIsInwardModalOpen(true)}
            className="h-7 px-2.5 text-[11px] font-semibold bg-emerald-600 text-white hover:bg-emerald-700 rounded-md transition-colors flex items-center space-x-1 shadow-xs"
          >
            <span>📥 Inward Stock (GRN)</span>
          </button>

          {/* Add Material */}
          <button
            onClick={handleOpenAdd}
            className="h-7 px-3 text-[11px] font-semibold bg-ink text-white hover:bg-black rounded-md transition-colors flex items-center space-x-1 shadow-xs"
          >
            <span className="text-xs font-bold">+</span>
            <span>Add Material</span>
          </button>
        </div>
      </div>

      {/* 4 Compact KPI Cards */}
      <div className="shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-white border border-border rounded-lg px-2.5 py-1.5 shadow-2xs flex items-center justify-between">
          <div className="flex items-center space-x-2 min-w-0">
            <div className="w-6 h-6 rounded bg-accent/10 text-accent flex items-center justify-center shrink-0">
              🧵
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider truncate">Materials Catalog</p>
              <h3 className="text-xs font-bold text-ink leading-tight">{metrics.totalItems} Items</h3>
            </div>
          </div>
        </div>

        <div className="bg-white border border-border rounded-lg px-2.5 py-1.5 shadow-2xs flex items-center justify-between">
          <div className="flex items-center space-x-2 min-w-0">
            <div className="w-6 h-6 rounded bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center justify-center shrink-0">
              💰
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-semibold text-emerald-600 uppercase tracking-wider truncate">Total Stock Value</p>
              <h3 className="text-xs font-bold text-emerald-700 leading-tight">
                ₹{Math.round(metrics.totalInventoryValue || 0).toLocaleString('en-IN')}
              </h3>
            </div>
          </div>
        </div>

        <div className="bg-white border border-border rounded-lg px-2.5 py-1.5 shadow-2xs flex items-center justify-between">
          <div className="flex items-center space-x-2 min-w-0">
            <div className="w-6 h-6 rounded bg-rose-50 text-rose-600 border border-rose-200/60 flex items-center justify-center shrink-0">
              ⚠️
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-semibold text-rose-600 uppercase tracking-wider truncate">Low Stock Alerts</p>
              <h3 className="text-xs font-bold text-rose-700 leading-tight">{metrics.lowStockCount} Need Reorder</h3>
            </div>
          </div>
        </div>

        <div className="bg-white border border-border rounded-lg px-2.5 py-1.5 shadow-2xs flex items-center justify-between">
          <div className="flex items-center space-x-2 min-w-0">
            <div className="w-6 h-6 rounded bg-blue-50 text-blue-600 border border-blue-200/60 flex items-center justify-center shrink-0">
              🏭
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-semibold text-blue-600 uppercase tracking-wider truncate">Registered Suppliers</p>
              <h3 className="text-xs font-bold text-blue-700 leading-tight">{suppliers.length} Vendors</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Container via Reusable DataTable */}
      <DataTable
        columns={materialColumns}
        data={paginatedItems}
        loading={loading}
        minWidth="950px"
        toolbar={
          <TableToolbar>
            <div className="flex flex-wrap items-center gap-2 flex-1 max-w-xl">
              <SearchBar
                value={search}
                onChange={setSearch}
                placeholder="Search fabric, thread, label, material code…"
              />
              <CustomDropdown
                value={categoryFilter}
                onChange={(val) => setCategoryFilter(val)}
                options={categoryOptions}
                size="xs"
                buttonClassName="!h-7 !min-h-0 !rounded-md"
              />
            </div>
          </TableToolbar>
        }
        emptyState={{
          icon: '🧵',
          title: 'No raw materials found',
          description: 'Add cotton fabrics, trims, buttons, and polybags to start tracking.',
          actionButton: (
            <button
              onClick={handleOpenAdd}
              className="px-3 py-1.5 text-xs font-semibold bg-ink text-white rounded-md hover:bg-black mt-2"
            >
              + Add First Raw Material
            </button>
          ),
        }}
        pagination={{
          page: safePage,
          limit,
          total: totalItems,
          totalPages,
          onPageChange: setPage,
          onLimitChange: (newLimit) => {
            setLimit(newLimit);
            setPage(1);
          },
          itemName: 'materials',
        }}
      />

      {/* Add / Edit Material Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-border rounded-xl max-w-md w-full p-5 shadow-xl space-y-3.5">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <h3 className="text-sm font-bold text-ink">
                {editingItem ? 'Edit Raw Material' : 'Add New Raw Material'}
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-ink text-lg font-bold">
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-2.5 text-xs">
              <div>
                <label className="block font-medium text-ink mb-1">Material Name *</label>
                <input
                  type="text"
                  placeholder="e.g. 100% Combed Cotton Single Jersey 180 GSM (Black)"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full h-8 px-2.5 bg-white border border-border rounded-md text-ink text-xs outline-none focus:border-accent"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-ink mb-1">Code / SKU</label>
                  <input
                    type="text"
                    placeholder="e.g. RM-COT-BLK-01"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full h-8 px-2.5 bg-white border border-border rounded-md text-ink text-xs outline-none focus:border-accent font-mono"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-medium text-ink">Category</label>
                    <a
                      href="/masters/categories-units"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-accent hover:underline flex items-center gap-0.5"
                      title="Manage Categories in Master"
                    >
                      + Master
                    </a>
                  </div>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full h-8 px-2 bg-white border border-border rounded-md text-ink text-xs outline-none focus:border-accent capitalize"
                  >
                    {masterCategories.length > 0 ? (
                      masterCategories.map((c) => (
                        <option key={c.id} value={c.code || c.name.toLowerCase()}>
                          {c.name}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="fabric">Fabric (Cloth)</option>
                        <option value="rib">Rib / Collar</option>
                        <option value="thread">Sewing Thread</option>
                        <option value="trim">Labels & Trims</option>
                        <option value="packaging">Packaging</option>
                        <option value="other">Other</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-medium text-ink">Unit (UOM)</label>
                    <a
                      href="/masters/categories-units"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-accent hover:underline flex items-center gap-0.5"
                      title="Manage Units in Master"
                    >
                      + Master
                    </a>
                  </div>
                  <select
                    value={formData.unitOfMeasure}
                    onChange={(e) => setFormData({ ...formData, unitOfMeasure: e.target.value })}
                    className="w-full h-8 px-2 bg-white border border-border rounded-md text-ink text-xs outline-none focus:border-accent"
                  >
                    {masterUnits.length > 0 ? (
                      masterUnits.map((u) => (
                        <option key={u.id} value={u.symbol || u.name.toLowerCase()}>
                          {u.name} ({u.symbol || u.name})
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="meter">Meter (m)</option>
                        <option value="kg">Kilogram (kg)</option>
                        <option value="piece">Piece (pc)</option>
                        <option value="spool">Spool / Roll</option>
                        <option value="pack">Pack</option>
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-ink mb-1">Opening Stock</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.currentStock}
                    onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
                    className="w-full h-8 px-2.5 bg-white border border-border rounded-md text-ink text-xs outline-none focus:border-accent font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-ink mb-1">Min Alert Stock</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.minAlertStock}
                    onChange={(e) => setFormData({ ...formData, minAlertStock: e.target.value })}
                    className="w-full h-8 px-2.5 bg-white border border-border rounded-md text-ink text-xs outline-none focus:border-accent font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-ink mb-1">Avg Purchase Rate (₹ / unit)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.averageCostPerUnit}
                  onChange={(e) => setFormData({ ...formData, averageCostPerUnit: e.target.value })}
                  className="w-full h-8 px-2.5 bg-white border border-border rounded-md text-ink text-xs outline-none focus:border-accent font-mono"
                />
              </div>

              <div className="pt-2 border-t border-border flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 bg-white hover:bg-gray-50 border border-border text-ink rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-ink text-white hover:bg-black rounded-md font-semibold"
                >
                  {editingItem ? 'Update' : 'Save Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inward Purchase (GRN) Modal */}
      {isInwardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-border rounded-xl max-w-xl w-full p-5 shadow-xl space-y-3.5 max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-border pb-2.5 shrink-0">
              <div>
                <h3 className="text-sm font-bold text-ink">Inward Purchase Receipt (GRN)</h3>
                <p className="text-[11px] text-gray-500">Record bill invoice from supplier to add raw stock and update average rates</p>
              </div>
              <button onClick={() => setIsInwardModalOpen(false)} className="text-gray-400 hover:text-ink text-lg font-bold">
                &times;
              </button>
            </div>

            <form onSubmit={handleInwardSubmit} className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-medium text-ink mb-1">Supplier</label>
                  <select
                    value={inwardData.supplierId}
                    onChange={(e) => setInwardData({ ...inwardData, supplierId: e.target.value })}
                    className="w-full h-8 px-2 bg-white border border-border rounded-md text-ink text-xs outline-none focus:border-accent"
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-ink mb-1">Bill / Invoice #</label>
                  <input
                    type="text"
                    placeholder="e.g. INV-2026-99"
                    value={inwardData.invoiceNumber}
                    onChange={(e) => setInwardData({ ...inwardData, invoiceNumber: e.target.value })}
                    className="w-full h-8 px-2.5 bg-white border border-border rounded-md text-ink text-xs outline-none focus:border-accent font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-ink mb-1">Purchase Date</label>
                  <input
                    type="date"
                    value={inwardData.purchaseDate}
                    onChange={(e) => setInwardData({ ...inwardData, purchaseDate: e.target.value })}
                    className="w-full h-8 px-2 bg-white border border-border rounded-md text-ink text-xs outline-none focus:border-accent"
                  />
                </div>
              </div>

              {/* Line items table */}
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-3 py-1.5 border-b border-border font-bold text-ink text-[11px] flex justify-between items-center">
                  <span>Materials Received</span>
                  <button
                    type="button"
                    onClick={() =>
                      setInwardData({
                        ...inwardData,
                        items: [...inwardData.items, { rawMaterialId: '', quantity: '', unitCost: '' }],
                      })
                    }
                    className="text-[10px] text-accent font-semibold hover:underline"
                  >
                    + Add Line Item
                  </button>
                </div>
                <div className="p-2 space-y-2">
                  {inwardData.items.map((line, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-5">
                        <select
                          value={line.rawMaterialId}
                          onChange={(e) => {
                            const newItems = [...inwardData.items];
                            newItems[idx].rawMaterialId = e.target.value;
                            setInwardData({ ...inwardData, items: newItems });
                          }}
                          className="w-full h-8 px-2 bg-white border border-border rounded text-xs outline-none focus:border-accent"
                          required
                        >
                          <option value="">Select Material</option>
                          {items.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({m.unitOfMeasure})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-3">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Quantity"
                          value={line.quantity}
                          onChange={(e) => {
                            const newItems = [...inwardData.items];
                            newItems[idx].quantity = e.target.value;
                            setInwardData({ ...inwardData, items: newItems });
                          }}
                          className="w-full h-8 px-2 bg-white border border-border rounded text-xs font-mono"
                          required
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Rate ₹ / unit"
                          value={line.unitCost}
                          onChange={(e) => {
                            const newItems = [...inwardData.items];
                            newItems[idx].unitCost = e.target.value;
                            setInwardData({ ...inwardData, items: newItems });
                          }}
                          className="w-full h-8 px-2 bg-white border border-border rounded text-xs font-mono"
                          required
                        />
                      </div>
                      <div className="col-span-1 text-center">
                        {inwardData.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const newItems = inwardData.items.filter((_, i) => i !== idx);
                              setInwardData({ ...inwardData, items: newItems });
                            }}
                            className="text-rose-500 font-bold hover:text-rose-700 text-sm"
                          >
                            &times;
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-border flex justify-end space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsInwardModalOpen(false)}
                  className="px-3 py-1.5 bg-white hover:bg-gray-50 border border-border text-ink rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-md font-semibold"
                >
                  Confirm Inward & Add Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Supplier Modal */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-border rounded-xl max-w-sm w-full p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h3 className="text-sm font-bold text-ink">Add Raw Material Supplier</h3>
              <button onClick={() => setIsSupplierModalOpen(false)} className="text-gray-400 hover:text-ink font-bold">
                &times;
              </button>
            </div>
            <form onSubmit={handleSaveSupplier} className="space-y-2 text-xs">
              <div>
                <label className="block font-medium text-ink mb-1">Company / Mill Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Vardhman Textiles Ltd"
                  value={supplierData.name}
                  onChange={(e) => setSupplierData({ ...supplierData, name: e.target.value })}
                  className="w-full h-8 px-2 bg-white border border-border rounded text-xs"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-ink mb-1">Phone</label>
                  <input
                    type="text"
                    value={supplierData.phone}
                    onChange={(e) => setSupplierData({ ...supplierData, phone: e.target.value })}
                    className="w-full h-8 px-2 bg-white border border-border rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block font-medium text-ink mb-1">City</label>
                  <input
                    type="text"
                    value={supplierData.city}
                    onChange={(e) => setSupplierData({ ...supplierData, city: e.target.value })}
                    className="w-full h-8 px-2 bg-white border border-border rounded text-xs"
                  />
                </div>
              </div>
              <div className="pt-2 border-t border-border flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsSupplierModalOpen(false)}
                  className="px-3 py-1 bg-white border border-border text-ink rounded"
                >
                  Cancel
                </button>
                <button type="submit" className="px-3 py-1 bg-ink text-white rounded font-medium">
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
