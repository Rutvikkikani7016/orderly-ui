import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import {
  getStockPositions,
  getLedgerHistory,
  adjustStock,
  inwardStock,
  getWarehouses,
} from '../api/inventory.js';
import { getProducts } from '../api/products.js';
import {
  DataTable,
  TableToolbar,
  SearchBar,
  TableIconButton,
  InfoTooltip,
  ProductSearchSelect,
} from '../components/common';

export default function Inventory() {
  const [activeTab, setActiveTab] = useState('positions'); // 'positions' | 'ledger'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter States
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [search, setSearch] = useState('');
  const [selectedTxType, setSelectedTxType] = useState('all');

  // Stock Positions Data
  const [positions, setPositions] = useState([]);
  const [positionsPagination, setPositionsPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });

  // Ledger History Data
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [ledgerPagination, setLedgerPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });

  // Products for search select
  const [productsList, setProductsList] = useState([]);

  // Modals
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustFormData, setAdjustFormData] = useState({
    warehouseId: '',
    productId: '',
    adjustmentType: 'increase',
    quantity: '',
    notes: '',
  });

  const [isInwardModalOpen, setIsInwardModalOpen] = useState(false);
  const [inwardFormData, setInwardFormData] = useState({
    warehouseId: '',
    productId: '',
    quantity: '',
    referenceType: 'purchase',
    referenceId: '',
    notes: '',
  });

  const [submitting, setSubmitting] = useState(false);

  // Load Initial Warehouses & Products
  useEffect(() => {
    async function loadMeta() {
      try {
        const [whData, prodData] = await Promise.all([
          getWarehouses(),
          getProducts({ page: 1, limit: 100 }),
        ]);
        const whs = whData || [];
        setWarehouses(whs);
        setProductsList(prodData.products || []);
        if (whs.length > 0) {
          setAdjustFormData((prev) => ({ ...prev, warehouseId: whs[0].id }));
          setInwardFormData((prev) => ({ ...prev, warehouseId: whs[0].id }));
        }
      } catch (err) {
        toast.error('Failed to load warehouses or product master');
      }
    }
    loadMeta();
  }, []);

  // Fetch Positions
  const fetchPositions = useCallback(async (page = 1, limitOverride) => {
    try {
      const activeLimit = limitOverride || positionsPagination.limit || 15;
      const data = await getStockPositions({
        warehouseId: selectedWarehouseId || undefined,
        search: search || undefined,
        page,
        limit: activeLimit,
      });
      setPositions(data.items || []);
      setPositionsPagination({
        page: data.page || 1,
        limit: data.limit || activeLimit,
        total: data.total || 0,
        totalPages: data.totalPages || 1,
      });
    } catch (err) {
      toast.error('Failed to load stock positions');
    }
  }, [selectedWarehouseId, search, positionsPagination.limit]);

  // Fetch Ledger History
  const fetchLedger = useCallback(async (page = 1, limitOverride) => {
    try {
      const activeLimit = limitOverride || ledgerPagination.limit || 20;
      const data = await getLedgerHistory({
        warehouseId: selectedWarehouseId || undefined,
        transactionType: selectedTxType !== 'all' ? selectedTxType : undefined,
        page,
        limit: activeLimit,
      });
      setLedgerEntries(data.items || []);
      setLedgerPagination({
        page: data.page || 1,
        limit: data.limit || activeLimit,
        total: data.total || 0,
        totalPages: data.totalPages || 1,
      });
    } catch (err) {
      toast.error('Failed to load inventory ledger');
    }
  }, [selectedWarehouseId, selectedTxType, ledgerPagination.limit]);

  // Main Loader
  useEffect(() => {
    let ignore = false;
    async function run() {
      setLoading(true);
      if (activeTab === 'positions') {
        await fetchPositions(1);
      } else {
        await fetchLedger(1);
      }
      if (!ignore) setLoading(false);
    }
    run();
    return () => {
      ignore = true;
    };
  }, [activeTab, fetchPositions, fetchLedger]);

  // In-page refresh
  async function handleRefresh() {
    setRefreshing(true);
    if (activeTab === 'positions') {
      await fetchPositions(positionsPagination.page);
    } else {
      await fetchLedger(ledgerPagination.page);
    }
    setRefreshing(false);
    toast.success('Inventory refreshed');
  }

  // Handle Adjust Stock Submit
  async function handleAdjustSubmit(e) {
    e.preventDefault();
    if (!adjustFormData.productId || !adjustFormData.warehouseId || !adjustFormData.quantity) {
      toast.error('Please fill all required fields');
      return;
    }
    setSubmitting(true);
    try {
      await adjustStock(adjustFormData);
      toast.success('Stock adjusted and recorded to ledger');
      setIsAdjustModalOpen(false);
      setAdjustFormData((prev) => ({
        ...prev,
        productId: '',
        quantity: '',
        notes: '',
      }));
      fetchPositions(positionsPagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to adjust stock');
    } finally {
      setSubmitting(false);
    }
  }

  // Handle Inward Stock Submit
  async function handleInwardSubmit(e) {
    e.preventDefault();
    if (!inwardFormData.productId || !inwardFormData.warehouseId || !inwardFormData.quantity) {
      toast.error('Please fill all required fields');
      return;
    }
    setSubmitting(true);
    try {
      await inwardStock(inwardFormData);
      toast.success('Stock successfully inwarded and recorded to ledger');
      setIsInwardModalOpen(false);
      setInwardFormData((prev) => ({
        ...prev,
        productId: '',
        quantity: '',
        referenceId: '',
        notes: '',
      }));
      fetchPositions(positionsPagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to inward stock');
    } finally {
      setSubmitting(false);
    }
  }

  // KPI Computations
  const totalOnHand = positions.reduce((acc, p) => acc + parseInt(p.onHand || 0, 10), 0);
  const totalReserved = positions.reduce((acc, p) => acc + parseInt(p.reserved || 0, 10), 0);
  const totalAvailable = positions.reduce((acc, p) => acc + parseInt(p.available || 0, 10), 0);

  // Badge helpers
  function renderTxBadge(type) {
    const map = {
      purchase_inward: { label: 'Purchase Inward', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
      production_output: { label: 'Production Output', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
      order_reserve: { label: 'Order Reserve', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
      order_release: { label: 'Order Release', bg: 'bg-sky-50 text-sky-700 border-sky-200' },
      order_fulfill: { label: 'Order Fulfill', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
      return_restock: { label: 'Return Restock', bg: 'bg-teal-50 text-teal-700 border-teal-200' },
      adjustment_increase: { label: 'Adjustment (+)', bg: 'bg-purple-50 text-purple-700 border-purple-200' },
      adjustment_decrease: { label: 'Adjustment (-)', bg: 'bg-rose-50 text-rose-700 border-rose-200' },
    };
    const b = map[type] || { label: type, bg: 'bg-gray-50 text-gray-700 border-gray-200' };
    return (
      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold border ${b.bg}`}>
        {b.label}
      </span>
    );
  }

  // Standardized Column Schema: Positions
  const positionColumns = useMemo(
    () => [
      {
        key: 'product',
        header: 'SKU & Product Title',
        minWidth: 'min-w-[240px]',
        render: (item) => {
          const prod = item.product || {};
          return (
            <div className="max-w-[240px]">
              <div className="font-mono font-bold text-ink truncate text-[11px]">
                {prod.internalSku || 'NO-SKU'}
              </div>
              <div className="text-gray-500 text-[10.5px] truncate">{prod.title}</div>
            </div>
          );
        },
      },
      {
        key: 'category',
        header: 'Category',
        render: (item) => {
          const cat = item.product?.category;
          return cat ? (
            <span className="px-1.5 py-0.2 rounded-full bg-purple-50 text-purple-700 text-[10px] font-medium border border-purple-200">
              {cat}
            </span>
          ) : (
            <span className="text-gray-400 text-[10px]">-</span>
          );
        },
      },
      {
        key: 'warehouse',
        header: 'Warehouse',
        render: (item) => {
          const wh = item.warehouse || {};
          return (
            <div>
              <span className="font-medium text-gray-700 text-[11px]">{wh.name}</span>
              <span className="block text-[9.5px] text-gray-400 font-mono">{wh.code}</span>
            </div>
          );
        },
      },
      {
        key: 'onHand',
        header: 'Physical On-Hand',
        align: 'right',
        render: (item) => <span className="font-mono font-bold text-ink">{item.onHand}</span>,
      },
      {
        key: 'reserved',
        header: 'Reserved (Locked)',
        align: 'right',
        render: (item) =>
          item.reserved > 0 ? (
            <span className="px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 font-mono font-bold text-amber-700">
              {item.reserved}
            </span>
          ) : (
            <span className="text-gray-400 font-mono">0</span>
          ),
      },
      {
        key: 'available',
        header: 'Available (Sellable)',
        align: 'right',
        render: (item) => (
          <span
            className={`px-1.5 py-0.5 rounded font-mono font-bold ${
              item.available > 0
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}
          >
            {item.available} pcs
          </span>
        ),
      },
      {
        key: 'price',
        header: 'Price',
        align: 'right',
        render: (item) => (
          <span className="font-mono text-gray-700">
            ₹{parseFloat(item.product?.sellingPrice || 0).toFixed(2)}
          </span>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'right',
        render: (item) => (
          <div className="flex items-center justify-end space-x-1">
            <TableIconButton
              variant="inward"
              action="inward"
              title="Inward stock for this SKU"
              onClick={() => {
                setInwardFormData((prev) => ({
                  ...prev,
                  productId: item.productId,
                  warehouseId: item.warehouseId,
                }));
                setIsInwardModalOpen(true);
              }}
            />
            <TableIconButton
              variant="adjust"
              action="adjust"
              title="Adjust stock balance"
              onClick={() => {
                setAdjustFormData((prev) => ({
                  ...prev,
                  productId: item.productId,
                  warehouseId: item.warehouseId,
                }));
                setIsAdjustModalOpen(true);
              }}
            />
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Standardized Column Schema: Stock Ledger
  const ledgerColumns = useMemo(
    () => [
      {
        key: 'created_at',
        header: 'Date & Time',
        render: (row) => (
          <span className="font-mono text-[10px] text-gray-500 whitespace-nowrap">
            {new Date(row.created_at).toLocaleString()}
          </span>
        ),
      },
      {
        key: 'transactionType',
        header: 'Transaction Type',
        render: (row) => renderTxBadge(row.transactionType),
      },
      {
        key: 'product',
        header: 'SKU & Product',
        minWidth: 'min-w-[180px]',
        render: (row) => {
          const prod = row.product || {};
          return (
            <div className="max-w-[180px]">
              <div className="font-mono font-bold text-ink truncate text-[11px]">
                {prod.internalSku || 'NO-SKU'}
              </div>
              <div className="text-gray-500 text-[10px] truncate">{prod.title}</div>
            </div>
          );
        },
      },
      {
        key: 'warehouse',
        header: 'Warehouse',
        render: (row) => <span className="text-[11px] text-gray-700">{row.warehouse?.name}</span>,
      },
      {
        key: 'quantityChange',
        header: 'Change',
        align: 'right',
        render: (row) => {
          const isPositive = row.quantityChange > 0;
          return (
            <span
              className={`font-mono font-bold text-xs ${
                isPositive ? 'text-emerald-700' : 'text-rose-600'
              }`}
            >
              {isPositive ? `+${row.quantityChange}` : row.quantityChange}
            </span>
          );
        },
      },
      {
        key: 'onHandAfter',
        header: 'On-Hand',
        align: 'right',
        render: (row) => (
          <span className="font-mono text-gray-800 font-semibold">{row.onHandAfter}</span>
        ),
      },
      {
        key: 'reservedAfter',
        header: 'Reserved',
        align: 'right',
        render: (row) => <span className="font-mono text-amber-700">{row.reservedAfter}</span>,
      },
      {
        key: 'availableAfter',
        header: 'Available',
        align: 'right',
        render: (row) => (
          <span className="font-mono text-emerald-700 font-bold">{row.availableAfter}</span>
        ),
      },
      {
        key: 'reference',
        header: 'Reference',
        render: (row) =>
          row.referenceType ? (
            <span className="font-mono text-[10px] px-1 py-0.2 rounded bg-gray-100 border border-gray-200 text-gray-600">
              {row.referenceType}#{row.referenceId || ''}
            </span>
          ) : (
            <span className="text-gray-400 text-[10px]">-</span>
          ),
      },
      {
        key: 'notes',
        header: 'Notes',
        render: (row) => (
          <span className="text-[10.5px] text-gray-500 max-w-[150px] truncate block">
            {row.notes || '-'}
          </span>
        ),
      },
      {
        key: 'creator',
        header: 'User',
        render: (row) => (
          <span className="text-[10.5px] text-gray-500">{row.creator?.fullName || 'System'}</span>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden p-3 space-y-2.5">
      {/* 1. Header with Breadcrumbs, Tabs & In-Page Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
        <div>
          <div className="flex items-center space-x-1.5 text-[11px] font-bold text-accent uppercase tracking-wider">
            <span>Enterprise OMS</span>
            <span>&rsaquo;</span>
            <span>Inventory Module</span>
          </div>
          <div className="flex items-center space-x-2">
            <h1 className="text-lg font-bold text-ink flex items-center">
              <span>Inventory & Double-Entry Stock Ledger</span>
              <InfoTooltip
                title="Double-Entry Inventory Ledger"
                text="Authoritative multi-warehouse stock management. Available sellable stock is automatically computed as Physical On-Hand minus Locked Order Reservations. Every movement is logged immutably."
                formula="Available Stock = Physical On-Hand - Reserved (Locked)"
              />
            </h1>
          </div>
        </div>

        {/* Action Controls & Tab Switcher */}
        <div className="flex items-center space-x-2">
          {/* Tab buttons */}
          <div className="bg-gray-100 p-0.5 rounded-lg flex space-x-1 border border-border">
            <button
              onClick={() => setActiveTab('positions')}
              className={`px-3 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'positions'
                  ? 'bg-white text-ink shadow-2xs'
                  : 'text-gray-600 hover:text-ink'
              }`}
            >
              📦 Warehouse Balances
            </button>
            <button
              onClick={() => setActiveTab('ledger')}
              className={`px-3 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'ledger'
                  ? 'bg-white text-ink shadow-2xs'
                  : 'text-gray-600 hover:text-ink'
              }`}
            >
              📜 Stock Ledger Audit Trail
            </button>
          </div>

          {/* Quick Action Buttons */}
          <button
            onClick={() => setIsInwardModalOpen(true)}
            className="h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold flex items-center space-x-1 shadow-2xs transition-colors cursor-pointer"
            title="Inward direct finished goods or purchase shipments"
          >
            <span>+</span>
            <span>Inward Stock</span>
          </button>
          <button
            onClick={() => setIsAdjustModalOpen(true)}
            className="h-7 px-2.5 bg-white border border-border text-ink hover:bg-gray-50 rounded text-xs font-semibold flex items-center space-x-1 shadow-2xs transition-colors cursor-pointer"
            title="Adjust stock with audit note"
          >
            <span>⚙️</span>
            <span>Adjust</span>
          </button>

          {/* In-page Refresh */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="h-7 px-2.5 bg-white border border-border text-ink hover:bg-gray-50 rounded text-xs font-medium flex items-center space-x-1 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh inventory"
          >
            <span className={refreshing ? 'animate-spin' : ''}>🔄</span>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. Top KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
        <div className="bg-white border border-border p-2.5 rounded-lg shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 block leading-tight">
              Sellable Available
            </span>
            <span className="text-base font-bold text-emerald-700 font-mono">
              {totalAvailable.toLocaleString()} <span className="text-xs font-normal text-gray-500">pcs</span>
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm font-bold">
            ✓
          </div>
        </div>

        <div className="bg-white border border-border p-2.5 rounded-lg shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 block leading-tight">
              Reserved for Orders
            </span>
            <span className="text-base font-bold text-amber-700 font-mono">
              {totalReserved.toLocaleString()} <span className="text-xs font-normal text-gray-500">pcs</span>
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center text-sm font-bold">
            🔒
          </div>
        </div>

        <div className="bg-white border border-border p-2.5 rounded-lg shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 block leading-tight">
              Physical On-Hand
            </span>
            <span className="text-base font-bold text-ink font-mono">
              {totalOnHand.toLocaleString()} <span className="text-xs font-normal text-gray-500">pcs</span>
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-sm font-bold">
            📦
          </div>
        </div>

        <div className="bg-white border border-border p-2.5 rounded-lg shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 block leading-tight">
              Active Warehouses
            </span>
            <span className="text-base font-bold text-purple-700 font-mono">
              {warehouses.length} <span className="text-xs font-normal text-gray-500">facilities</span>
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center text-sm font-bold">
            🏭
          </div>
        </div>
      </div>

      {/* 3. Standardized Filters Toolbar */}
      <TableToolbar
        leftSlot={
          <div className="flex flex-wrap items-center gap-2">
            {/* Warehouse Selector */}
            <div className="flex items-center space-x-1.5">
              <span className="text-xs text-gray-500 font-medium">Warehouse:</span>
              <select
                value={selectedWarehouseId}
                onChange={(e) => setSelectedWarehouseId(e.target.value)}
                className="h-7 px-2 bg-gray-50 border border-border rounded text-xs text-ink outline-none focus:border-accent"
              >
                <option value="">All Warehouses</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Tab 2: Transaction Type Filter */}
            {activeTab === 'ledger' && (
              <div className="flex items-center space-x-1.5">
                <span className="text-xs text-gray-500 font-medium">Tx Type:</span>
                <select
                  value={selectedTxType}
                  onChange={(e) => setSelectedTxType(e.target.value)}
                  className="h-7 px-2 bg-gray-50 border border-border rounded text-xs text-ink outline-none focus:border-accent"
                >
                  <option value="all">All Events</option>
                  <option value="purchase_inward">Purchase Inward</option>
                  <option value="production_output">Production Output</option>
                  <option value="order_reserve">Order Reserve</option>
                  <option value="order_fulfill">Order Fulfill</option>
                  <option value="order_release">Order Release</option>
                  <option value="return_restock">Return Restock</option>
                  <option value="adjustment_increase">Adjustment (+)</option>
                  <option value="adjustment_decrease">Adjustment (-)</option>
                </select>
              </div>
            )}
          </div>
        }
        searchSlot={
          activeTab === 'positions' ? (
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Search by SKU or Title..."
              width="w-48 sm:w-64"
            />
          ) : null
        }
        rightSlot={
          <div className="text-[11px] text-gray-400 font-mono">
            {activeTab === 'positions'
              ? `${positionsPagination.total} SKU Positions`
              : `${ledgerPagination.total} Ledger Events`}
          </div>
        }
      />

      {/* 4. Table Views (Standardized DataTable) */}
      {activeTab === 'positions' ? (
        <DataTable
          columns={positionColumns}
          data={positions}
          loading={loading}
          emptyMessage="No stock records found in the inventory ledger. Click '+ Inward Stock' to add your first stock shipment!"
          minWidth="min-w-[960px]"
          pagination={{
            page: positionsPagination.page,
            limit: positionsPagination.limit,
            total: positionsPagination.total,
            totalPages: positionsPagination.totalPages,
            onPageChange: (newPage) => fetchPositions(newPage),
            onLimitChange: (newLimit) => {
              setPositionsPagination((prev) => ({ ...prev, limit: newLimit }));
              fetchPositions(1, newLimit);
            },
            itemName: 'positions',
          }}
        />
      ) : (
        <DataTable
          columns={ledgerColumns}
          data={ledgerEntries}
          loading={loading}
          emptyMessage="No ledger transactions recorded yet."
          minWidth="min-w-[1100px]"
          pagination={{
            page: ledgerPagination.page,
            limit: ledgerPagination.limit,
            total: ledgerPagination.total,
            totalPages: ledgerPagination.totalPages,
            onPageChange: (newPage) => fetchLedger(newPage),
            onLimitChange: (newLimit) => {
              setLedgerPagination((prev) => ({ ...prev, limit: newLimit }));
              fetchLedger(1, newLimit);
            },
            itemName: 'ledger events',
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADJUST STOCK MODAL */}
      {/* ========================================================================= */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-border rounded-xl max-w-md w-full p-4 shadow-xl space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <div>
                <h3 className="text-sm font-bold text-ink">Adjust Stock Balance</h3>
                <p className="text-[10.5px] text-gray-500">Record an audited physical inventory correction</p>
              </div>
              <button
                onClick={() => setIsAdjustModalOpen(false)}
                className="text-gray-400 hover:text-ink font-bold text-base cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="space-y-3">
              <div>
                <label className="block font-medium text-ink mb-1">Target Product *</label>
                <ProductSearchSelect
                  products={productsList}
                  value={adjustFormData.productId}
                  onChange={(id) => setAdjustFormData({ ...adjustFormData, productId: id })}
                  placeholder="Select product to adjust..."
                  required
                />
              </div>

              <div>
                <label className="block font-medium text-ink mb-1">Target Warehouse *</label>
                <select
                  value={adjustFormData.warehouseId}
                  onChange={(e) => setAdjustFormData({ ...adjustFormData, warehouseId: e.target.value })}
                  className="w-full h-8 px-2 bg-white border border-border rounded text-xs outline-none focus:border-accent"
                  required
                >
                  <option value="">Select Warehouse...</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-ink mb-1">Adjustment Type *</label>
                  <select
                    value={adjustFormData.adjustmentType}
                    onChange={(e) =>
                      setAdjustFormData({ ...adjustFormData, adjustmentType: e.target.value })
                    }
                    className="w-full h-8 px-2 bg-white border border-border rounded text-xs outline-none focus:border-accent"
                  >
                    <option value="increase">+ Increase Stock (Found)</option>
                    <option value="decrease">- Decrease Stock (Loss/Damage)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-ink mb-1">Quantity (Units) *</label>
                  <input
                    type="number"
                    min="1"
                    value={adjustFormData.quantity}
                    onChange={(e) =>
                      setAdjustFormData({ ...adjustFormData, quantity: e.target.value })
                    }
                    placeholder="e.g. 5"
                    className="w-full h-8 px-2 bg-white border border-border rounded font-mono text-xs outline-none focus:border-accent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-ink mb-1">Audit Reason / Notes *</label>
                <textarea
                  rows="2"
                  value={adjustFormData.notes}
                  onChange={(e) => setAdjustFormData({ ...adjustFormData, notes: e.target.value })}
                  placeholder="e.g. Annual physical count found 5 extra units in Bin B2"
                  className="w-full p-2 bg-white border border-border rounded text-xs outline-none focus:border-accent resize-none"
                  required
                />
              </div>

              <div className="pt-2 border-t border-border flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-3 py-1.5 bg-white border border-border text-ink rounded hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-ink text-white rounded font-medium hover:bg-black cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {submitting ? 'Recording...' : 'Commit Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: INWARD STOCK MODAL */}
      {/* ========================================================================= */}
      {isInwardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-border rounded-xl max-w-md w-full p-4 shadow-xl space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <div>
                <h3 className="text-sm font-bold text-ink">Inward Finished Goods</h3>
                <p className="text-[10.5px] text-gray-500">Receive stock into warehouse inventory ledger</p>
              </div>
              <button
                onClick={() => setIsInwardModalOpen(false)}
                className="text-gray-400 hover:text-ink font-bold text-base cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleInwardSubmit} className="space-y-3">
              <div>
                <label className="block font-medium text-ink mb-1">Target Product *</label>
                <ProductSearchSelect
                  products={productsList}
                  value={inwardFormData.productId}
                  onChange={(id) => setInwardFormData({ ...inwardFormData, productId: id })}
                  placeholder="Select product to inward..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-ink mb-1">Target Warehouse *</label>
                  <select
                    value={inwardFormData.warehouseId}
                    onChange={(e) =>
                      setInwardFormData({ ...inwardFormData, warehouseId: e.target.value })
                    }
                    className="w-full h-8 px-2 bg-white border border-border rounded text-xs outline-none focus:border-accent"
                    required
                  >
                    <option value="">Select Warehouse...</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-ink mb-1">Inward Quantity *</label>
                  <input
                    type="number"
                    min="1"
                    value={inwardFormData.quantity}
                    onChange={(e) =>
                      setInwardFormData({ ...inwardFormData, quantity: e.target.value })
                    }
                    placeholder="e.g. 100"
                    className="w-full h-8 px-2 bg-white border border-border rounded font-mono text-xs outline-none focus:border-accent"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-ink mb-1">Reference Type</label>
                  <select
                    value={inwardFormData.referenceType}
                    onChange={(e) =>
                      setInwardFormData({ ...inwardFormData, referenceType: e.target.value })
                    }
                    className="w-full h-8 px-2 bg-white border border-border rounded text-xs outline-none focus:border-accent"
                  >
                    <option value="purchase">Purchase Order</option>
                    <option value="initial_stock">Opening Balance</option>
                    <option value="production">Factory Batch</option>
                    <option value="transfer">Inter-warehouse Transfer</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-ink mb-1">Reference ID / PO #</label>
                  <input
                    type="text"
                    value={inwardFormData.referenceId}
                    onChange={(e) =>
                      setInwardFormData({ ...inwardFormData, referenceId: e.target.value })
                    }
                    placeholder="e.g. PO-8921"
                    className="w-full h-8 px-2 bg-white border border-border rounded text-xs outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-ink mb-1">Notes (Optional)</label>
                <input
                  type="text"
                  value={inwardFormData.notes}
                  onChange={(e) => setInwardFormData({ ...inwardFormData, notes: e.target.value })}
                  placeholder="e.g. Delivered by truck DL-01-AB-1234"
                  className="w-full h-8 px-2 bg-white border border-border rounded text-xs outline-none focus:border-accent"
                />
              </div>

              <div className="pt-2 border-t border-border flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsInwardModalOpen(false)}
                  className="px-3 py-1.5 bg-white border border-border text-ink rounded hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-emerald-600 text-white rounded font-medium hover:bg-emerald-700 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {submitting ? 'Inwarding...' : 'Confirm Stock Inward'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
