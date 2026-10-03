import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getListings,
  getListingMetrics,
  mapListing,
  updateListing,
  deleteListing,
  syncInventoryNow,
} from '../api/listings';
import { getProducts } from '../api/products';
import { toast } from 'react-hot-toast';
import { DataTable, TableToolbar, SearchBar, TableIconButton } from '../components/common';

export default function ChannelListings() {
  const [listings, setListings] = useState([]);
  const [metrics, setMetrics] = useState({
    totalListings: 0,
    activeListings: 0,
    unmappedListings: 0,
    bufferProtected: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [platformFilter, setPlatformFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [pagination, setPagination] = useState({ totalPages: 1, total: 0 });

  // Products lookup for mapping modal
  const [availableProducts, setAvailableProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);

  // Map modal form
  const [mapForm, setMapForm] = useState({
    platform: 'flipkart',
    platformSku: '',
    fsnOrAsin: '',
    internalSku: '',
    listingPrice: '',
    bufferStock: 0,
  });

  // Edit modal form
  const [editForm, setEditForm] = useState({
    bufferStock: 0,
    syncInventory: true,
    listingPrice: '',
    channelUrl: '',
    status: 'active',
  });

  // In-page refresh function
  const fetchData = useCallback(
    async (isManualRefresh = false) => {
      try {
        if (isManualRefresh) setRefreshing(true);
        else setLoading(true);

        const [listData, metricsData] = await Promise.all([
          getListings({
            page,
            limit,
            platform: platformFilter,
            status: statusFilter,
            search,
          }),
          getListingMetrics(),
        ]);

        setListings(listData.listings || []);
        setPagination(listData.pagination || { totalPages: 1, total: 0 });
        setMetrics(metricsData || {});
      } catch (err) {
        console.error('Error fetching listings:', err);
        toast.error('Failed to load channel listings');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, limit, platformFilter, statusFilter, search]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Load master products for dropdown mapping
  const loadMasterProducts = useCallback(async () => {
    try {
      setLoadingProducts(true);
      const data = await getProducts({ limit: 500, status: 'all' });
      setAvailableProducts(data.products || []);
    } catch (err) {
      console.error('Failed to prefetch master products:', err);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    loadMasterProducts();
  }, [loadMasterProducts]);

  const handleOpenMapModal = (listing = null) => {
    if (availableProducts.length === 0) {
      loadMasterProducts();
    }
    if (listing) {
      setMapForm({
        platform: listing.platform || 'flipkart',
        platformSku: listing.platformSku || '',
        fsnOrAsin: listing.fsnOrAsin || '',
        internalSku: listing.product ? listing.product.internalSku : '',
        listingPrice: listing.listingPrice || '',
        bufferStock: listing.bufferStock || 0,
      });
    } else {
      setMapForm({
        platform: 'flipkart',
        platformSku: '',
        fsnOrAsin: '',
        internalSku: '',
        listingPrice: '',
        bufferStock: 0,
      });
    }
    setIsMapModalOpen(true);
  };

  const handleSaveMap = async (e) => {
    e.preventDefault();
    if (!mapForm.platformSku || !mapForm.internalSku) {
      toast.error('Platform SKU and Internal SKU are required');
      return;
    }

    try {
      await mapListing(mapForm);
      toast.success(`Mapped ${mapForm.platformSku} to ${mapForm.internalSku}`);
      setIsMapModalOpen(false);
      fetchData(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to map listing');
    }
  };

  const handleOpenEditModal = (listing) => {
    setSelectedListing(listing);
    setEditForm({
      bufferStock: listing.bufferStock ?? 0,
      syncInventory: listing.syncInventory ?? true,
      listingPrice: listing.listingPrice || '',
      channelUrl: listing.channelUrl || '',
      status: listing.status || 'active',
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!selectedListing) return;

    try {
      await updateListing(selectedListing.id, editForm);
      toast.success('Listing settings updated');
      setIsEditModalOpen(false);
      fetchData(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update listing');
    }
  };

  const handleToggleSync = async (listing) => {
    try {
      const nextSync = !listing.syncInventory;
      await updateListing(listing.id, { syncInventory: nextSync });
      toast.success(`Inventory sync ${nextSync ? 'Enabled' : 'Paused'}`);
      setListings((prev) =>
        prev.map((item) => (item.id === listing.id ? { ...item, syncInventory: nextSync } : item))
      );
    } catch {
      toast.error('Failed to toggle sync status');
    }
  };

  const handleSyncNow = async (listing) => {
    try {
      const res = await syncInventoryNow(listing.id);
      toast.success(res.message || 'Inventory push triggered!');
      fetchData(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Sync failed');
    }
  };

  const handleDelete = async (listing) => {
    if (!window.confirm(`Unlink mapping for ${listing.platformSku}?`)) return;
    try {
      await deleteListing(listing.id);
      toast.success('Listing unlinked');
      fetchData(true);
    } catch {
      toast.error('Failed to delete mapping');
    }
  };

  const getPlatformBadge = (platform) => {
    switch (platform?.toLowerCase()) {
      case 'flipkart':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            Flipkart
          </span>
        );
      case 'amazon':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 text-amber-400 border border-slate-700">
            Amazon
          </span>
        );
      case 'meesho':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-pink-50 text-pink-700 border border-pink-200">
            Meesho
          </span>
        );
      case 'shopify':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Shopify
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-700 border border-gray-200 uppercase">
            {platform}
          </span>
        );
    }
  };

  // Standardized Column Schema
  const listingColumns = useMemo(
    () => [
      {
        key: 'platform',
        header: 'Platform',
        width: 'w-24',
        render: (row) => getPlatformBadge(row.platform),
      },
      {
        key: 'platformSku',
        header: 'Channel SKU / External ID',
        minWidth: 'min-w-[180px]',
        render: (row) => (
          <div>
            <div className="font-semibold text-gray-900 font-mono text-[11px]">{row.platformSku}</div>
            {row.fsnOrAsin && (
              <div className="text-[10px] text-gray-400 font-mono">ID: {row.fsnOrAsin}</div>
            )}
          </div>
        ),
      },
      {
        key: 'internalProduct',
        header: 'Mapped Internal Product',
        minWidth: 'min-w-[240px]',
        render: (row) => {
          const p = row.product;
          if (!p) {
            return (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                ⚠️ Unmapped
              </span>
            );
          }
          return (
            <div className="flex items-center space-x-1.5">
              <div className="min-w-0">
                <div className="flex items-center space-x-1">
                  <span className="font-mono font-bold text-accent text-[11px]">
                    {p.internalSku}
                  </span>
                  {p.type === 'bundle' && (
                    <span className="bg-purple-100 text-purple-700 px-1 py-0.2 rounded text-[9px] font-bold">
                      COMBO
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-gray-600 truncate max-w-xs">{p.title}</div>
              </div>
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-bold shrink-0 ${
                  p.stock > 0
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                Stock: {p.stock}
              </span>
            </div>
          );
        },
      },
      {
        key: 'listingPrice',
        header: 'Listing Price',
        align: 'right',
        minWidth: 'min-w-[100px]',
        render: (row) => (
          <span className="font-medium">
            {row.listingPrice ? `₹${parseFloat(row.listingPrice).toFixed(2)}` : '—'}
          </span>
        ),
      },
      {
        key: 'bufferStock',
        header: 'Buffer',
        align: 'center',
        minWidth: 'min-w-[90px]',
        render: (row) =>
          row.bufferStock > 0 ? (
            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {row.bufferStock} units
            </span>
          ) : (
            <span className="text-gray-400 text-[10px]">0</span>
          ),
      },
      {
        key: 'syncInventory',
        header: 'Sync Push',
        align: 'center',
        minWidth: 'min-w-[100px]',
        render: (row) => (
          <button
            type="button"
            onClick={() => handleToggleSync(row)}
            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
              row.syncInventory
                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title="Click to toggle sync"
          >
            {row.syncInventory ? '● Active' : '○ Paused'}
          </button>
        ),
      },
      {
        key: 'lastSyncedAt',
        header: 'Last Synced',
        minWidth: 'min-w-[130px]',
        render: (row) => (
          <span className="text-[10px] text-gray-500">
            {row.lastSyncedAt
              ? new Date(row.lastSyncedAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })
              : 'Never'}
          </span>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'right',
        width: 'w-28',
        render: (row) => (
          <div className="flex items-center justify-end space-x-1">
            <TableIconButton
              variant="map"
              action="map"
              title={row.product ? 'Re-map Master SKU' : 'Map to Master SKU'}
              onClick={() => handleOpenMapModal(row)}
            />
            <TableIconButton
              variant="edit"
              action="edit"
              title="Edit Listing Settings & Buffer Stock"
              onClick={() => handleOpenEditModal(row)}
            />
            {row.product && (
              <TableIconButton
                variant="sync"
                action="sync"
                title="Push inventory stock now"
                onClick={() => handleSyncNow(row)}
              />
            )}
            {row.channelUrl && (
              <TableIconButton
                variant="external"
                action="external"
                title="Open marketplace listing page"
                href={row.channelUrl}
              />
            )}
            <TableIconButton
              variant="delete"
              action="delete"
              title="Unlink mapping"
              onClick={() => handleDelete(row)}
            />
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden p-3 space-y-2.5 max-w-full">
      {/* Dense Header */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-200 pb-2">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-lg font-bold text-gray-900 tracking-tight">Channel Listings & SKU Mappings</h1>
            <span className="text-[11px] font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200">
              Module 4 & 2
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Synchronize external marketplace SKUs (Flipkart, Amazon, Meesho, Shopify) with internal Master SKUs, configure buffer stocks & auto-push.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* In-page Refresh Button */}
          <button
            type="button"
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="h-7 px-2.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 flex items-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh Listings (In-Page)"
          >
            <svg
              className={`w-3.5 h-3.5 text-gray-500 ${refreshing ? 'animate-spin text-accent' : ''}`}
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
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenMapModal()}
            className="h-7 px-3 text-xs font-semibold text-white bg-accent hover:bg-accent-dark rounded flex items-center space-x-1.5 transition-colors shadow-2xs cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Map New SKU</span>
          </button>
        </div>
      </div>

      {/* 4 Dense KPI Cards */}
      <div className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-2">
        <div className="bg-white border border-gray-200 rounded-lg p-2 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] text-gray-500 font-medium">Total Listings</div>
            <div className="text-base font-bold text-gray-900 mt-0.5">{metrics.totalListings || 0}</div>
          </div>
          <div className="w-7 h-7 rounded bg-gray-100 text-gray-600 flex items-center justify-center text-xs font-bold">
            📋
          </div>
        </div>

        <div className="bg-white border border-emerald-200 rounded-lg p-2 shadow-2xs flex items-center justify-between bg-emerald-50/20">
          <div>
            <div className="text-[11px] text-emerald-700 font-medium">Active Mapped</div>
            <div className="text-base font-bold text-emerald-800 mt-0.5">{metrics.activeListings || 0}</div>
          </div>
          <div className="w-7 h-7 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
            ✓
          </div>
        </div>

        <div className="bg-white border border-amber-200 rounded-lg p-2 shadow-2xs flex items-center justify-between bg-amber-50/20">
          <div>
            <div className="text-[11px] text-amber-700 font-medium">Unmapped SKUs</div>
            <div className="text-base font-bold text-amber-800 mt-0.5">{metrics.unmappedListings || 0}</div>
          </div>
          <div className="w-7 h-7 rounded bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">
            ⚠
          </div>
        </div>

        <div className="bg-white border border-indigo-200 rounded-lg p-2 shadow-2xs flex items-center justify-between bg-indigo-50/20">
          <div>
            <div className="text-[11px] text-indigo-700 font-medium">Buffer Protected</div>
            <div className="text-base font-bold text-indigo-800 mt-0.5">{metrics.bufferProtected || 0}</div>
          </div>
          <div className="w-7 h-7 rounded bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
            🛡️
          </div>
        </div>
      </div>

      {/* Standardized Table Toolbar */}
      <TableToolbar
        leftSlot={
          <div className="flex flex-wrap items-center gap-1.5">
            {['all', 'flipkart', 'amazon', 'meesho', 'shopify'].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setPlatformFilter(p);
                  setPage(1);
                }}
                className={`h-6 px-2 rounded text-[11px] font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                  platformFilter === p
                    ? 'bg-accent text-white shadow-2xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {p}
              </button>
            ))}

            <div className="h-4 w-px bg-gray-300 mx-1 hidden sm:block" />

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="h-6 text-[11px] border border-gray-300 rounded px-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Mapped</option>
              <option value="unmapped">Unmapped Only</option>
              <option value="inactive">Inactive / Paused</option>
            </select>
          </div>
        }
        searchSlot={
          <SearchBar
            value={search}
            onChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            placeholder="Search SKU, ASIN, FSN..."
            width="w-full sm:w-64"
          />
        }
      />

      {/* Standardized DataTable */}
      <DataTable
        columns={listingColumns}
        data={listings}
        loading={loading}
        emptyMessage="No channel listings found matching criteria. Click 'Map New SKU' to link your first product."
        minWidth="min-w-[980px]"
        pagination={{
          page,
          limit,
          total: pagination.total,
          totalPages: pagination.totalPages,
          onPageChange: (newPage) => setPage(newPage),
          onLimitChange: (newLimit) => {
            setLimit(newLimit);
            setPage(1);
          },
          itemName: 'listings',
        }}
      />

      {/* Map Channel SKU Modal */}
      {isMapModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-3">
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900">Map Marketplace SKU to Internal Product</h2>
              <button
                type="button"
                onClick={() => setIsMapModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMap} className="p-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Marketplace</label>
                  <select
                    value={mapForm.platform}
                    onChange={(e) => setMapForm({ ...mapForm, platform: e.target.value })}
                    className="w-full h-8 border border-gray-300 rounded px-2 bg-white font-medium"
                  >
                    <option value="flipkart">Flipkart</option>
                    <option value="amazon">Amazon</option>
                    <option value="meesho">Meesho</option>
                    <option value="shopify">Shopify</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-1">External ID (FSN/ASIN)</label>
                  <input
                    type="text"
                    placeholder="e.g. B08XY... / FSN123"
                    value={mapForm.fsnOrAsin}
                    onChange={(e) => setMapForm({ ...mapForm, fsnOrAsin: e.target.value })}
                    className="w-full h-8 border border-gray-300 rounded px-2 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">
                  Channel / Platform SKU <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. FK-TSHIRT-BLK-M"
                  value={mapForm.platformSku}
                  onChange={(e) => setMapForm({ ...mapForm, platformSku: e.target.value })}
                  required
                  className="w-full h-8 border border-gray-300 rounded px-2 font-mono"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-gray-700 font-semibold">
                    Internal Master Product SKU <span className="text-red-500">*</span>
                  </label>
                  {loadingProducts && (
                    <span className="text-[10px] text-primary-600 font-medium animate-pulse">Loading products...</span>
                  )}
                </div>
                <select
                  value={mapForm.internalSku}
                  onChange={(e) => setMapForm({ ...mapForm, internalSku: e.target.value })}
                  required
                  disabled={loadingProducts}
                  className="w-full h-8 border border-gray-300 rounded px-2 bg-white font-mono"
                >
                  <option value="">
                    {loadingProducts
                      ? '-- Loading Master Products... --'
                      : availableProducts.length === 0
                      ? '-- No Master Products Found --'
                      : '-- Select Master Product --'}
                  </option>
                  {availableProducts.map((p) => (
                    <option key={p.id} value={p.internalSku}>
                      {p.internalSku} - {p.title} ({p.type === 'bundle' ? 'COMBO' : `Stock: ${p.stock ?? 0}`})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Listing Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 499"
                    value={mapForm.listingPrice}
                    onChange={(e) => setMapForm({ ...mapForm, listingPrice: e.target.value })}
                    className="w-full h-8 border border-gray-300 rounded px-2 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Buffer Stock</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 2"
                    value={mapForm.bufferStock}
                    onChange={(e) => setMapForm({ ...mapForm, bufferStock: e.target.value })}
                    className="w-full h-8 border border-gray-300 rounded px-2"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsMapModalOpen(false)}
                  className="h-7 px-3 text-xs text-gray-700 hover:bg-gray-100 rounded border border-gray-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-7 px-4 text-xs font-semibold text-white bg-accent hover:bg-accent-dark rounded shadow-2xs cursor-pointer"
                >
                  Save Mapping
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Listing Settings Modal */}
      {isEditModalOpen && selectedListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-3">
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900">
                Listing Settings: {selectedListing.platformSku}
              </h2>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-4 space-y-3 text-xs">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Safety Buffer Stock</label>
                <input
                  type="number"
                  min="0"
                  value={editForm.bufferStock}
                  onChange={(e) => setEditForm({ ...editForm, bufferStock: e.target.value })}
                  className="w-full h-8 border border-gray-300 rounded px-2 font-mono"
                />
                <p className="text-[10px] text-gray-500 mt-0.5">
                  Withheld from channel push to protect against overselling during spikes.
                </p>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Listing Price (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editForm.listingPrice}
                  onChange={(e) => setEditForm({ ...editForm, listingPrice: e.target.value })}
                  className="w-full h-8 border border-gray-300 rounded px-2 font-mono"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Marketplace URL</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={editForm.channelUrl}
                  onChange={(e) => setEditForm({ ...editForm, channelUrl: e.target.value })}
                  className="w-full h-8 border border-gray-300 rounded px-2 font-mono text-[11px]"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="font-semibold text-gray-700">Inventory Sync Push</span>
                <input
                  type="checkbox"
                  checked={editForm.syncInventory}
                  onChange={(e) => setEditForm({ ...editForm, syncInventory: e.target.checked })}
                  className="w-4 h-4 text-accent rounded border-gray-300 focus:ring-accent"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="h-7 px-3 text-xs text-gray-700 hover:bg-gray-100 rounded border border-gray-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-7 px-4 text-xs font-semibold text-white bg-accent hover:bg-accent-dark rounded shadow-2xs cursor-pointer"
                >
                  Update Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
