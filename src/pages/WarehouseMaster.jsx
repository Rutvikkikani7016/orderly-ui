import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import {
  getWarehousesList,
  getWarehouse,
  createWarehouse,
  updateWarehouse,
  setPrimaryWarehouse,
  deleteWarehouse,
} from '../api/warehouses.js';
import {
  DataTable,
  TableToolbar,
  SearchBar,
  TableIconButton,
  InfoTooltip,
  StatusBadge,
} from '../components/common';

export default function WarehouseMaster() {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // View details modal
  const [selectedWarehouseDetails, setSelectedWarehouseDetails] = useState(null);

  // Delete confirmation modal
  const [warehouseToDelete, setWarehouseToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const initialFormState = {
    name: '',
    code: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    contactPerson: '',
    contactPhone: '',
    contactEmail: '',
    capacitySqft: '',
    status: 'active',
    isPrimary: false,
  };
  const [formData, setFormData] = useState(initialFormState);

  // Fetch Warehouses
  const fetchWarehouses = useCallback(async (page = 1, limitOverride) => {
    try {
      const activeLimit = limitOverride || pagination.limit || 15;
      const data = await getWarehousesList({
        search: search || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        page,
        limit: activeLimit,
      });

      setWarehouses(data.warehouses || []);
      setPagination({
        page: data.page || 1,
        limit: data.limit || activeLimit,
        total: data.total || 0,
        totalPages: Math.ceil((data.total || 0) / activeLimit) || 1,
      });
    } catch (err) {
      toast.error('Failed to load warehouses');
    }
  }, [search, statusFilter, pagination.limit]);

  // Initial Load
  useEffect(() => {
    setLoading(true);
    fetchWarehouses(1).finally(() => setLoading(false));
  }, [fetchWarehouses]);

  // In-Page Refresh Button
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchWarehouses(pagination.page);
      toast.success('Warehouse list refreshed');
    } finally {
      setRefreshing(false);
    }
  }, [fetchWarehouses, pagination.page]);

  // Open Create Form
  function handleOpenCreate() {
    setEditingWarehouse(null);
    setFormData(initialFormState);
    setIsFormModalOpen(true);
  }

  // Open Edit Form
  function handleOpenEdit(wh) {
    setEditingWarehouse(wh);
    setFormData({
      name: wh.name || '',
      code: wh.code || '',
      address: wh.address || '',
      city: wh.city || '',
      state: wh.state || '',
      pincode: wh.pincode || '',
      contactPerson: wh.contactPerson || '',
      contactPhone: wh.contactPhone || '',
      contactEmail: wh.contactEmail || '',
      capacitySqft: wh.capacitySqft || '',
      status: wh.status || 'active',
      isPrimary: !!wh.isPrimary,
    });
    setIsFormModalOpen(true);
  }

  // Handle Form Submit (Create or Update)
  async function handleSubmit(e) {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Warehouse name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingWarehouse) {
        await updateWarehouse(editingWarehouse.id, formData);
        toast.success(`Warehouse "${formData.name}" updated successfully`);
      } else {
        await createWarehouse(formData);
        toast.success(`Warehouse "${formData.name}" created successfully`);
      }
      setIsFormModalOpen(false);
      fetchWarehouses(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  // Set as Primary Action
  async function handleSetPrimary(wh) {
    if (wh.isPrimary) return;
    try {
      await setPrimaryWarehouse(wh.id);
      toast.success(`"${wh.name}" is now the primary fulfillment hub`);
      fetchWarehouses(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to set primary warehouse');
    }
  }

  // Open Details Modal
  async function handleViewDetails(wh) {
    try {
      const details = await getWarehouse(wh.id);
      setSelectedWarehouseDetails(details);
    } catch (err) {
      toast.error('Failed to load warehouse details');
    }
  }

  // Confirm Delete Action
  async function handleConfirmDelete() {
    if (!warehouseToDelete) return;
    setIsDeleting(true);
    try {
      const res = await deleteWarehouse(warehouseToDelete.id);
      toast.success(res.message || 'Warehouse deleted successfully');
      setWarehouseToDelete(null);
      fetchWarehouses(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete warehouse');
    } finally {
      setIsDeleting(false);
    }
  }

  // Compute Dense Top KPI Summary
  const kpiStats = useMemo(() => {
    const totalCount = warehouses.length;
    const primary = warehouses.find((w) => w.isPrimary);
    const totalCapacity = warehouses.reduce((acc, w) => acc + (parseInt(w.capacitySqft, 10) || 0), 0);
    const totalUnitsOnHand = warehouses.reduce((acc, w) => acc + (parseInt(w.totalOnHand, 10) || 0), 0);

    return {
      totalCount,
      primaryName: primary ? primary.name : 'Not Designated',
      primaryCode: primary ? primary.code : 'N/A',
      totalCapacity: totalCapacity.toLocaleString(),
      totalUnitsOnHand: totalUnitsOnHand.toLocaleString(),
    };
  }, [warehouses]);

  // Standardized Table Columns
  const columns = useMemo(
    () => [
      {
        key: 'name',
        header: 'Facility Name & Code',
        minWidth: 'min-w-[210px]',
        render: (row) => (
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-ink text-[11.5px]">{row.name}</span>
              {row.isPrimary && (
                <span className="inline-flex items-center space-x-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-amber-50 text-amber-700 border border-amber-300">
                  <span>⭐</span>
                  <span>PRIMARY</span>
                </span>
              )}
            </div>
            <div className="font-mono text-[10.5px] text-accent font-semibold mt-0.5">
              {row.code || 'NO-CODE'}
            </div>
          </div>
        ),
      },
      {
        key: 'location',
        header: 'City & Address',
        minWidth: 'min-w-[180px]',
        render: (row) => (
          <div className="text-[11px]">
            <div className="font-medium text-ink">
              {row.city ? `${row.city}, ${row.state || ''}` : row.state || 'Location unassigned'}
              {row.pincode ? ` - ${row.pincode}` : ''}
            </div>
            <div className="text-gray-400 text-[10px] truncate max-w-[220px]">
              {row.address || 'No street address specified'}
            </div>
          </div>
        ),
      },
      {
        key: 'contact',
        header: 'Contact Personnel',
        minWidth: 'min-w-[170px]',
        render: (row) => (
          <div className="text-[11px]">
            <div className="font-medium text-ink">{row.contactPerson || 'Facility Manager'}</div>
            <div className="text-gray-500 font-mono text-[10px]">
              {row.contactPhone || row.contactEmail || 'No contact phone'}
            </div>
          </div>
        ),
      },
      {
        key: 'capacity',
        header: 'Capacity (Sq. Ft)',
        align: 'right',
        render: (row) => (
          <div className="text-right">
            <span className="font-mono text-[11px] font-bold text-ink">
              {row.capacitySqft ? row.capacitySqft.toLocaleString() : '—'}
            </span>
            {row.capacitySqft && <span className="text-[9.5px] text-gray-400 ml-1">sqft</span>}
          </div>
        ),
      },
      {
        key: 'inventory',
        header: 'Stock Managed',
        align: 'center',
        render: (row) => (
          <div className="text-center">
            <div className="font-mono text-[11px] font-bold text-indigo-700">
              {row.totalOnHand || 0} units
            </div>
            <div className="text-[9.5px] text-gray-500">
              {row.totalSkus || 0} unique SKUs
            </div>
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        align: 'center',
        render: (row) => (
          <StatusBadge status={row.status || 'active'} />
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'right',
        minWidth: 'min-w-[120px]',
        render: (row) => (
          <div className="flex items-center justify-end space-x-1">
            {/* View Details */}
            <TableIconButton
              variant="view"
              onClick={() => handleViewDetails(row)}
              tooltip="View Facility Details"
            />

            {/* Set as Primary Hub */}
            {!row.isPrimary && (
              <TableIconButton
                variant="primary"
                onClick={() => handleSetPrimary(row)}
                tooltip="Set as Primary Hub"
              />
            )}

            {/* Edit */}
            <TableIconButton
              variant="edit"
              onClick={() => handleOpenEdit(row)}
              tooltip="Edit Warehouse"
            />

            {/* Delete / Deactivate */}
            {!row.isPrimary && (
              <TableIconButton
                variant="delete"
                onClick={() => setWarehouseToDelete(row)}
                tooltip="Delete Warehouse"
              />
            )}
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden p-3 space-y-2.5">
      {/* 1. Header with Breadcrumbs, Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
        <div>
          <div className="flex items-center space-x-1.5 text-[11px] font-bold text-accent uppercase tracking-wider">
            <span>Enterprise OMS</span>
            <span>&rsaquo;</span>
            <span>Masters</span>
            <span>&rsaquo;</span>
            <span>Warehouse Master</span>
          </div>
          <div className="flex items-center space-x-2">
            <h1 className="text-lg font-bold text-ink flex items-center">
              <span>Warehouse & Facility Master</span>
              <InfoTooltip
                title="Warehouse Topology & Multi-Facility Architecture"
                text="Maintain authoritative multi-location warehouses, distribution centers, and return hubs. Designate a Primary Fulfillment Center for automated inventory reservation, order allocation, and default shipping picklists."
                formula="Available Sellable Stock = On-Hand - Reserved (Locked by Wave Picks)"
              />
            </h1>
          </div>
        </div>

        {/* Top Action Controls */}
        <div className="flex items-center space-x-2">
          {/* In-page Refresh Button */}
          <TableIconButton
            variant="sync"
            onClick={handleRefresh}
            disabled={refreshing}
            tooltip="Refresh Warehouses"
            className={refreshing ? 'animate-spin' : ''}
          />

          {/* Primary Create CTA */}
          <button
            onClick={handleOpenCreate}
            className="h-7 px-3 bg-accent hover:bg-accent-hover text-white rounded text-xs font-semibold shadow-xs flex items-center space-x-1 cursor-pointer transition-colors"
          >
            <span>+</span>
            <span>Add Warehouse</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0">
        <div className="bg-white border border-border rounded-lg p-2.5 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[10.5px] uppercase font-bold text-gray-400 tracking-wider">Total Facilities</div>
            <div className="text-lg font-black text-ink mt-0.5">{kpiStats.totalCount}</div>
          </div>
          <span className="p-2 rounded-lg bg-indigo-50 text-indigo-600 text-sm">🏢</span>
        </div>

        <div className="bg-white border border-border rounded-lg p-2.5 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[10.5px] uppercase font-bold text-gray-400 tracking-wider">Primary Hub</div>
            <div className="text-xs font-black text-amber-700 mt-1 truncate max-w-[130px]">
              {kpiStats.primaryName}
            </div>
            <div className="text-[10px] font-mono text-gray-400">{kpiStats.primaryCode}</div>
          </div>
          <span className="p-2 rounded-lg bg-amber-50 text-amber-600 text-sm">⭐</span>
        </div>

        <div className="bg-white border border-border rounded-lg p-2.5 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[10.5px] uppercase font-bold text-gray-400 tracking-wider">Floor Capacity</div>
            <div className="text-lg font-black text-ink mt-0.5">{kpiStats.totalCapacity} <span className="text-xs text-gray-400 font-normal">sqft</span></div>
          </div>
          <span className="p-2 rounded-lg bg-emerald-50 text-emerald-600 text-sm">📐</span>
        </div>

        <div className="bg-white border border-border rounded-lg p-2.5 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[10.5px] uppercase font-bold text-gray-400 tracking-wider">Stock On-Hand</div>
            <div className="text-lg font-black text-sky-700 mt-0.5">{kpiStats.totalUnitsOnHand} <span className="text-xs text-gray-400 font-normal">units</span></div>
          </div>
          <span className="p-2 rounded-lg bg-sky-50 text-sky-600 text-sm">📦</span>
        </div>
      </div>

      {/* 3. Main Standardized DataTable */}
      <DataTable
        columns={columns}
        data={warehouses}
        loading={loading}
        minWidth="900px"
        toolbar={
          <TableToolbar
            left={
              <>
                <SearchBar
                  value={search}
                  onChange={(v) => setSearch(v)}
                  onClear={() => setSearch('')}
                  placeholder="Search facility name, code, city, contact..."
                />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-7 text-xs bg-white border border-border rounded px-2 text-ink focus:outline-none focus:border-accent"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                </select>
              </>
            }
            right={
              <span className="text-xs font-semibold text-gray-500">
                {pagination.total} warehouse(s) configured
              </span>
            }
          />
        }
        pagination={{
          page: pagination.page,
          limit: pagination.limit,
          total: pagination.total,
          totalPages: pagination.totalPages,
          onPageChange: (p) => fetchWarehouses(p),
          itemName: 'warehouses',
        }}
        emptyState={{
          icon: '🏢',
          title: 'No Warehouses Found',
          description: 'No facilities match your search query. Add your first warehouse location to begin routing stock.',
          actionButton: (
            <button
              onClick={handleOpenCreate}
              className="mt-2 h-7 px-3 bg-accent hover:bg-accent-hover text-white rounded text-xs font-semibold cursor-pointer"
            >
              + Create Warehouse
            </button>
          ),
        }}
      />

      {/* ========================================================
          MODAL 1: Create / Edit Warehouse
          ======================================================== */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-lg shadow-xl border border-border w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden">
            <div className="p-3 border-b border-border flex items-center justify-between bg-gray-50">
              <h3 className="text-xs font-bold text-ink uppercase tracking-wider">
                {editingWarehouse ? `Edit Warehouse: ${editingWarehouse.name}` : 'Create New Warehouse'}
              </h3>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="text-gray-400 hover:text-ink text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-4 space-y-3 text-xs">
              {/* Facility Name & Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-600 uppercase">
                    Warehouse Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Surat Main Central WH"
                    className="w-full h-8 text-xs bg-white border border-border rounded px-2.5 mt-0.5 focus:border-accent focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-600 uppercase">
                    Facility Code
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                    placeholder="e.g. WH-SURAT-01 (Auto-generated if empty)"
                    className="w-full h-8 text-xs bg-white border border-border rounded px-2.5 mt-0.5 font-mono uppercase focus:border-accent focus:outline-none"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="text-[10px] font-bold text-gray-600 uppercase">Street Address</label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))}
                  placeholder="Plot/Gala Number, Industrial Estate, Landmark..."
                  className="w-full text-xs bg-white border border-border rounded p-2 mt-0.5 focus:border-accent focus:outline-none"
                />
              </div>

              {/* City, State, Pincode */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-gray-600 uppercase">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData((p) => ({ ...p, city: e.target.value }))}
                    placeholder="e.g. Surat"
                    className="w-full h-8 text-xs bg-white border border-border rounded px-2 mt-0.5 focus:border-accent focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-600 uppercase">State</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData((p) => ({ ...p, state: e.target.value }))}
                    placeholder="e.g. Gujarat"
                    className="w-full h-8 text-xs bg-white border border-border rounded px-2 mt-0.5 focus:border-accent focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-600 uppercase">Pincode</label>
                  <input
                    type="text"
                    value={formData.pincode}
                    onChange={(e) => setFormData((p) => ({ ...p, pincode: e.target.value }))}
                    placeholder="e.g. 395002"
                    className="w-full h-8 text-xs bg-white border border-border rounded px-2 mt-0.5 font-mono focus:border-accent focus:outline-none"
                  />
                </div>
              </div>

              {/* Contact Information */}
              <div className="border-t border-gray-100 pt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-gray-600 uppercase">Contact Person</label>
                  <input
                    type="text"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData((p) => ({ ...p, contactPerson: e.target.value }))}
                    placeholder="Manager Name"
                    className="w-full h-8 text-xs bg-white border border-border rounded px-2 mt-0.5 focus:border-accent focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-600 uppercase">Phone Number</label>
                  <input
                    type="text"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData((p) => ({ ...p, contactPhone: e.target.value }))}
                    placeholder="+91 98765 43210"
                    className="w-full h-8 text-xs bg-white border border-border rounded px-2 mt-0.5 font-mono focus:border-accent focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-600 uppercase">Email Address</label>
                  <input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData((p) => ({ ...p, contactEmail: e.target.value }))}
                    placeholder="wh@orderly.com"
                    className="w-full h-8 text-xs bg-white border border-border rounded px-2 mt-0.5 focus:border-accent focus:outline-none"
                  />
                </div>
              </div>

              {/* Capacity & Status */}
              <div className="border-t border-gray-100 pt-2 grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-600 uppercase">Floor Capacity (Sq. Ft)</label>
                  <input
                    type="number"
                    value={formData.capacitySqft}
                    onChange={(e) => setFormData((p) => ({ ...p, capacitySqft: e.target.value }))}
                    placeholder="e.g. 15000"
                    className="w-full h-8 text-xs bg-white border border-border rounded px-2.5 mt-0.5 font-mono focus:border-accent focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-600 uppercase">Operating Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData((p) => ({ ...p, status: e.target.value }))}
                    className="w-full h-8 text-xs bg-white border border-border rounded px-2 mt-0.5 focus:border-accent focus:outline-none"
                  >
                    <option value="active">Active (Fulfillment Operational)</option>
                    <option value="inactive">Inactive (Suspended)</option>
                  </select>
                </div>
              </div>

              {/* Primary Designation Checkbox */}
              <div className="p-2.5 rounded-md bg-amber-50/70 border border-amber-200 flex items-start space-x-2">
                <input
                  type="checkbox"
                  id="isPrimaryCheckbox"
                  checked={formData.isPrimary}
                  onChange={(e) => setFormData((p) => ({ ...p, isPrimary: e.target.checked }))}
                  className="rounded border-gray-300 text-accent focus:ring-accent h-4 w-4 mt-0.5 cursor-pointer"
                />
                <label htmlFor="isPrimaryCheckbox" className="text-[11px] text-amber-900 cursor-pointer">
                  <span className="font-bold block">Designate as Primary Fulfillment Center</span>
                  Orders and wave picklists default to this warehouse unless overridden. Setting this un-designates any previous primary hub.
                </label>
              </div>

              <div className="p-3 border-t border-border flex justify-end space-x-2 bg-gray-50 -mx-4 -mb-4 mt-4">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="h-7 px-3 rounded border border-border text-xs text-gray-600 hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-7 px-4 rounded bg-accent hover:bg-accent-hover text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingWarehouse ? 'Update Facility' : 'Create Facility'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 2: Warehouse Details View
          ======================================================== */}
      {selectedWarehouseDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-lg shadow-xl border border-border w-full max-w-lg flex flex-col max-h-[85vh] overflow-hidden">
            <div className="p-3 border-b border-border flex items-center justify-between bg-gray-50">
              <div className="flex items-center space-x-2">
                <h3 className="text-xs font-bold text-ink uppercase tracking-wider">
                  Facility Details: {selectedWarehouseDetails.name}
                </h3>
                {selectedWarehouseDetails.isPrimary && (
                  <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded border border-amber-300">
                    PRIMARY
                  </span>
                )}
              </div>
              <button
                onClick={() => setSelectedWarehouseDetails(null)}
                className="text-gray-400 hover:text-ink text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-auto space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-bold block">Facility Code</span>
                  <span className="font-mono font-bold text-accent text-xs">
                    {selectedWarehouseDetails.code || 'UNASSIGNED'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-bold block">Status</span>
                  <StatusBadge status={selectedWarehouseDetails.status} />
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-bold block">Floor Area</span>
                  <span className="font-bold text-ink">
                    {selectedWarehouseDetails.capacitySqft ? `${selectedWarehouseDetails.capacitySqft.toLocaleString()} sqft` : 'Not specified'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-bold block">Contact Person</span>
                  <span className="font-medium text-ink">
                    {selectedWarehouseDetails.contactPerson || 'Facility Head'} ({selectedWarehouseDetails.contactPhone || 'N/A'})
                  </span>
                </div>
              </div>

              {/* Address info */}
              <div className="border border-border rounded-lg p-3 space-y-1">
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Physical Location</span>
                <div className="text-ink font-medium">
                  {selectedWarehouseDetails.address || 'Street address pending'}
                </div>
                <div className="text-gray-500 text-[11px]">
                  {selectedWarehouseDetails.city}, {selectedWarehouseDetails.state} - {selectedWarehouseDetails.pincode}
                </div>
              </div>

              {/* Stock Overview */}
              <div className="border border-border rounded-lg p-3 space-y-2">
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Inventory Balance Summary</span>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-gray-50 p-2 rounded border border-gray-200">
                    <span className="text-[9px] uppercase font-bold text-gray-400 block">On-Hand</span>
                    <span className="font-mono font-bold text-xs text-ink">{selectedWarehouseDetails.totalOnHand || 0}</span>
                  </div>
                  <div className="bg-amber-50 p-2 rounded border border-amber-200">
                    <span className="text-[9px] uppercase font-bold text-amber-600 block">Reserved</span>
                    <span className="font-mono font-bold text-xs text-amber-700">{selectedWarehouseDetails.totalReserved || 0}</span>
                  </div>
                  <div className="bg-emerald-50 p-2 rounded border border-emerald-200">
                    <span className="text-[9px] uppercase font-bold text-emerald-600 block">Available</span>
                    <span className="font-mono font-bold text-xs text-emerald-700">{selectedWarehouseDetails.totalAvailable || 0}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 border-t border-border flex justify-end bg-gray-50">
              <button
                onClick={() => setSelectedWarehouseDetails(null)}
                className="h-7 px-4 rounded bg-ink text-white text-xs font-semibold hover:bg-gray-800 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 3: Delete Confirmation Dialog
          ======================================================== */}
      {warehouseToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-lg shadow-xl border border-border w-full max-w-sm flex flex-col overflow-hidden">
            <div className="p-3 border-b border-border flex items-center justify-between bg-rose-50">
              <h3 className="text-xs font-bold text-rose-800 uppercase tracking-wider">
                Delete Warehouse
              </h3>
              <button
                onClick={() => setWarehouseToDelete(null)}
                className="text-gray-400 hover:text-ink text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-2 text-xs">
              <p className="text-ink">
                Are you sure you want to delete warehouse <strong>"{warehouseToDelete.name}"</strong>?
              </p>
              {warehouseToDelete.totalOnHand > 0 ? (
                <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-800 text-[11px]">
                  ⚠️ This facility holds <strong>{warehouseToDelete.totalOnHand} units</strong> of stock on-hand. You cannot delete a warehouse with physical inventory. Please transfer or adjust stock first.
                </div>
              ) : (
                <p className="text-gray-500 text-[11px]">
                  This action cannot be undone. Its code and references will be purged.
                </p>
              )}
            </div>

            <div className="p-3 border-t border-border flex justify-end space-x-2 bg-gray-50">
              <button
                onClick={() => setWarehouseToDelete(null)}
                className="h-7 px-3 rounded border border-border text-xs text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting || warehouseToDelete.totalOnHand > 0}
                className="h-7 px-4 rounded bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
