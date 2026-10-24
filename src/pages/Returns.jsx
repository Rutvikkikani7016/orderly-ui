import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import {
  getReturns,
  getReturnDetails,
  createReturn,
  inwardScan,
  submitQcInspection,
  restockReturnItems,
  getClaims,
  fileClaim,
  updateClaim,
} from '../api/returns.js';
import { getWarehouses } from '../api/inventory.js';
import { getOrders } from '../api/orders.js';
import { getProducts } from '../api/products.js';
import {
  DataTable,
  TableToolbar,
  SearchBar,
  TableIconButton,
  InfoTooltip,
  StatusBadge,
} from '../components/common';

export default function Returns() {
  const [activeTab, setActiveTab] = useState('returns'); // 'returns' | 'qc' | 'claims' | 'dock'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Common Metadata
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [productsList, setProductsList] = useState([]);

  // 1. Returns Tab State
  const [returnsList, setReturnsList] = useState([]);
  const [returnsPagination, setReturnsPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [channelFilter, setChannelFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  // Selected Return & Detail Drawer
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);

  // Manual Create Return Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    channel: 'flipkart',
    type: 'customer_return',
    trackingAwb: '',
    courierName: 'Delhivery',
    warehouseId: '',
    returnReason: 'Customer Return: Defective / Damaged',
    orderNumber: '',
    productId: '',
    expectedQuantity: 1,
  });
  const [creatingReturn, setCreatingReturn] = useState(false);

  // 2. QC Station State
  const [activeQcReturn, setActiveQcReturn] = useState(null);
  const [qcInspections, setQcInspections] = useState({});
  const [submittingQc, setSubmittingQc] = useState(false);

  // 3. Claims Tab State
  const [claimsList, setClaimsList] = useState([]);
  const [claimsPagination, setClaimsPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [claimSearch, setClaimSearch] = useState('');
  const [claimStatusFilter, setClaimStatusFilter] = useState('all');
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [claimFormData, setClaimFormData] = useState({
    returnOrderId: '',
    channel: 'flipkart',
    claimType: 'damaged_product',
    claimNumber: '',
    claimAmount: '',
    incidentDescription: '',
    evidenceUrls: '',
    carrierName: 'Delhivery',
  });
  const [submittingClaim, setSubmittingClaim] = useState(false);

  // Claim Status Update Modal
  const [selectedClaimForUpdate, setSelectedClaimForUpdate] = useState(null);
  const [updateClaimStatusVal, setUpdateClaimStatusVal] = useState('approved');
  const [updateClaimApprovedAmt, setUpdateClaimApprovedAmt] = useState('');
  const [updatingClaim, setUpdatingClaim] = useState(false);

  // 4. Dock Scanner State
  const [dockScanCode, setDockScanCode] = useState('');
  const [dockScanning, setDockScanning] = useState(false);
  const [dockScanLogs, setDockScanLogs] = useState([]);

  // Load Warehouses & Products on Mount
  useEffect(() => {
    async function loadMeta() {
      try {
        const [whData, prodData] = await Promise.all([
          getWarehouses().catch(() => []),
          getProducts({ limit: 100 }).catch(() => ({ products: [] })),
        ]);
        const whs = whData || [];
        setWarehouses(whs);
        if (whs.length > 0) {
          setSelectedWarehouseId(whs[0].id);
          setCreateFormData((prev) => ({ ...prev, warehouseId: whs[0].id }));
        }
        setProductsList(prodData?.products || prodData || []);
      } catch (err) {
        console.error('Failed to load metadata:', err);
      }
    }
    loadMeta();
  }, []);

  // Fetch Returns List
  const fetchReturnsData = useCallback(
    async (page = 1) => {
      try {
        const res = await getReturns({
          page,
          limit: returnsPagination.limit,
          search,
          status: statusFilter,
          channel: channelFilter,
          type: typeFilter,
          warehouseId: selectedWarehouseId,
        });
        setReturnsList(res.returns || []);
        setReturnsPagination({
          page: res.page || 1,
          limit: res.limit || 15,
          total: res.total || 0,
          totalPages: res.totalPages || 1,
        });
      } catch (err) {
        toast.error('Failed to load returns list');
        console.error(err);
      }
    },
    [returnsPagination.limit, search, statusFilter, channelFilter, typeFilter, selectedWarehouseId]
  );

  // Fetch Claims List
  const fetchClaimsData = useCallback(
    async (page = 1) => {
      try {
        const res = await getClaims({
          page,
          limit: claimsPagination.limit,
          search: claimSearch,
          status: claimStatusFilter,
        });
        setClaimsList(res.claims || []);
        setClaimsPagination({
          page: res.page || 1,
          limit: res.limit || 15,
          total: res.total || 0,
          totalPages: res.totalPages || 1,
        });
      } catch (err) {
        toast.error('Failed to load marketplace claims');
        console.error(err);
      }
    },
    [claimsPagination.limit, claimSearch, claimStatusFilter]
  );

  // Trigger Data Fetch based on active tab
  useEffect(() => {
    setLoading(true);
    if (activeTab === 'returns' || activeTab === 'qc') {
      fetchReturnsData(1).finally(() => setLoading(false));
    } else if (activeTab === 'claims') {
      fetchClaimsData(1).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [activeTab, fetchReturnsData, fetchClaimsData]);

  // In-page refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (activeTab === 'returns' || activeTab === 'qc') {
        await fetchReturnsData(returnsPagination.page);
      } else if (activeTab === 'claims') {
        await fetchClaimsData(claimsPagination.page);
      }
      toast.success('Data refreshed');
    } catch {
      toast.error('Refresh failed');
    } finally {
      setRefreshing(false);
    }
  };

  // KPI Calculations
  const kpiMetrics = useMemo(() => {
    const total = returnsPagination.total || returnsList.length;
    const pendingQc = returnsList.filter(
      (r) => r.status === 'received_at_hub' || r.status === 'qc_in_progress'
    ).length;
    const restocked = returnsList.filter((r) => r.status === 'restocked').length;
    const disputes = returnsList.filter((r) => r.status === 'dispute_filed').length;
    return { total, pendingQc, restocked, disputes };
  }, [returnsPagination.total, returnsList]);

  // Handle Quick Inward Dock Scan
  const handleDockScan = async (e) => {
    e.preventDefault();
    const code = dockScanCode.trim();
    if (!code) return;

    setDockScanning(true);
    try {
      const res = await inwardScan({
        scanCode: code,
        warehouseId: selectedWarehouseId || (warehouses[0]?.id || null),
      });

      const entry = {
        id: Date.now(),
        code,
        timestamp: new Date().toLocaleTimeString(),
        success: res.status !== 404 && res.data?.success !== false,
        message: res.message || 'Scanned successfully',
        returnOrder: res.data?.returnOrder,
      };

      setDockScanLogs((prev) => [entry, ...prev.slice(0, 19)]);
      if (entry.success) {
        toast.success(entry.message);
      } else {
        toast.error(entry.message);
      }
      setDockScanCode('');
      // Refresh list in background
      fetchReturnsData(1);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Scan inward failed');
    } finally {
      setDockScanning(false);
    }
  };

  // Open QC Station for a specific Return Order
  const handleOpenQcStation = (ret) => {
    setActiveQcReturn(ret);
    // Initialize inspection form for all return items
    const initialInspections = {};
    (ret.items || []).forEach((item) => {
      initialInspections[item.id] = {
        returnItemId: item.id,
        qcStatus: item.qcStatus !== 'pending' ? item.qcStatus : 'pass_grade_a',
        qcNotes: item.qcNotes || '',
        disposition: item.disposition !== 'pending' ? item.disposition : 'restock_inventory',
        receivedQuantity: item.receivedQuantity > 0 ? item.receivedQuantity : item.expectedQuantity || 1,
      };
    });
    setQcInspections(initialInspections);
    setActiveTab('qc');
  };

  // Submit QC Inspection
  const handleSubmitQc = async () => {
    if (!activeQcReturn) return;
    setSubmittingQc(true);
    try {
      const payload = {
        itemInspections: Object.values(qcInspections),
      };
      const updated = await submitQcInspection(activeQcReturn.id, payload);
      toast.success('QC Inspection submitted successfully!');
      setActiveQcReturn(updated);
      fetchReturnsData(returnsPagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit QC inspection');
    } finally {
      setSubmittingQc(false);
    }
  };

  // Execute Restock into Inventory Ledger
  const handleExecuteRestock = async (returnId) => {
    try {
      const res = await restockReturnItems(returnId, {
        warehouseId: selectedWarehouseId,
      });
      toast.success(`Items restocked into inventory ledger for #${res.returnNumber}`);
      fetchReturnsData(returnsPagination.page);
      if (activeQcReturn?.id === returnId) {
        setActiveQcReturn(res);
      }
      if (selectedReturn?.id === returnId) {
        setSelectedReturn(res);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to restock items');
    }
  };

  // Open File Claim Modal
  const handleOpenFileClaim = (ret, item = null) => {
    setClaimFormData({
      returnOrderId: ret.id,
      returnItemId: item?.id || '',
      channel: ret.channel || 'flipkart',
      claimType: item?.qcStatus === 'wrong_item_fraud' ? 'wrong_item' : 'damaged_product',
      claimNumber: `CLM-${(ret.channel || 'FLI').toUpperCase().slice(0, 3)}-${Date.now().toString().slice(-5)}`,
      claimAmount: '1299.00',
      incidentDescription: `Return package for #${ret.returnNumber} received with ${item?.qcStatus || 'damage'}.`,
      evidenceUrls: '',
      carrierName: ret.courierName || 'Delhivery',
    });
    setIsClaimModalOpen(true);
  };

  // Submit Marketplace Claim
  const handleSubmitClaim = async (e) => {
    e.preventDefault();
    if (!claimFormData.returnOrderId || !claimFormData.claimNumber) {
      toast.error('Please fill required fields');
      return;
    }
    setSubmittingClaim(true);
    try {
      const urls = claimFormData.evidenceUrls
        ? claimFormData.evidenceUrls.split(',').map((u) => u.trim()).filter(Boolean)
        : [];
      await fileClaim({
        ...claimFormData,
        evidenceUrls: urls,
      });
      toast.success(`Claim ${claimFormData.claimNumber} filed successfully!`);
      setIsClaimModalOpen(false);
      fetchClaimsData(1);
      fetchReturnsData(returnsPagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to file claim');
    } finally {
      setSubmittingClaim(false);
    }
  };

  // Submit Claim Update (Approve / Settle)
  const handleUpdateClaimStatus = async (e) => {
    e.preventDefault();
    if (!selectedClaimForUpdate) return;
    setUpdatingClaim(true);
    try {
      await updateClaim(selectedClaimForUpdate.id, {
        status: updateClaimStatusVal,
        approvedAmount: updateClaimApprovedAmt ? parseFloat(updateClaimApprovedAmt) : 0,
      });
      toast.success(`Claim ${selectedClaimForUpdate.claimNumber} marked as ${updateClaimStatusVal}!`);
      setSelectedClaimForUpdate(null);
      fetchClaimsData(claimsPagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update claim');
    } finally {
      setUpdatingClaim(false);
    }
  };

  // Submit Manual Return Creation
  const handleCreateReturnSubmit = async (e) => {
    e.preventDefault();
    if (!createFormData.warehouseId) {
      toast.error('Please select a warehouse');
      return;
    }
    setCreatingReturn(true);
    try {
      const payload = {
        channel: createFormData.channel,
        type: createFormData.type,
        trackingAwb: createFormData.trackingAwb,
        courierName: createFormData.courierName,
        warehouseId: createFormData.warehouseId,
        returnReason: createFormData.returnReason,
        items: createFormData.productId
          ? [
              {
                productId: createFormData.productId,
                expectedQuantity: parseInt(createFormData.expectedQuantity || 1, 10),
              },
            ]
          : [],
      };
      const res = await createReturn(payload);
      toast.success(`Return #${res.returnNumber} created successfully!`);
      setIsCreateModalOpen(false);
      fetchReturnsData(1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create return');
    } finally {
      setCreatingReturn(false);
    }
  };

  // Channel Badge Helper
  const renderChannelTag = (channel) => {
    const ch = (channel || 'direct').toLowerCase();
    const map = {
      flipkart: { bg: 'bg-yellow-50 text-yellow-800 border-yellow-200', label: 'Flipkart' },
      amazon: { bg: 'bg-orange-50 text-orange-800 border-orange-200', label: 'Amazon' },
      meesho: { bg: 'bg-pink-50 text-pink-800 border-pink-200', label: 'Meesho' },
      myntra: { bg: 'bg-purple-50 text-purple-800 border-purple-200', label: 'Myntra' },
      shopify: { bg: 'bg-green-50 text-green-800 border-green-200', label: 'Shopify' },
      direct: { bg: 'bg-gray-100 text-gray-800 border-gray-200', label: 'Direct' },
    };
    const c = map[ch] || map.direct;
    return (
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${c.bg}`}>
        {c.label}
      </span>
    );
  };

  // Status Badge Mapping
  const getStatusBadge = (status) => {
    const s = (status || 'initiated').toLowerCase();
    switch (s) {
      case 'initiated':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">Initiated</span>;
      case 'received_at_hub':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">Dock Inwarded</span>;
      case 'qc_in_progress':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">QC In Progress</span>;
      case 'qc_completed':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200">QC Graded</span>;
      case 'restocked':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">Restocked ✅</span>;
      case 'dispute_filed':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">Claim / Dispute ⚠️</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-700 border border-gray-200">{status}</span>;
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface text-ink overflow-hidden">
      {/* 1. Header Bar */}
      <div className="shrink-0 bg-white border-b border-border px-4 py-2.5 flex items-center justify-between shadow-2xs">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-base font-bold text-ink">Reverse Logistics & Returns Hub</h1>
            <span className="text-[10px] bg-accent-light text-accent-dark px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
              Phase 3
            </span>
          </div>
          <p className="text-[11px] text-gray-500">
            Dock inwarding, barcode verification, QC inspection grading, inventory restock & marketplace claims.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Quick Refresh Button */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="h-7 px-2.5 rounded border border-border bg-white text-gray-700 hover:bg-gray-50 flex items-center space-x-1.5 text-xs font-medium cursor-pointer transition-colors shadow-2xs"
            title="Refresh Table Data"
          >
            <svg
              className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-accent' : 'text-gray-500'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{refreshing ? 'Refreshing…' : 'Refresh'}</span>
          </button>

          {/* New Return Manual Modal Trigger */}
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="h-7 px-3 rounded bg-accent hover:bg-accent-dark text-white flex items-center space-x-1.5 text-xs font-semibold cursor-pointer shadow-xs transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>+ New Return</span>
          </button>
        </div>
      </div>

      {/* 2. Top Dense Navigation Tabs */}
      <div className="shrink-0 bg-white border-b border-border px-4 flex items-center space-x-6 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('returns')}
          className={`py-2.5 font-semibold border-b-2 flex items-center space-x-2 transition-colors cursor-pointer ${
            activeTab === 'returns'
              ? 'border-accent text-accent'
              : 'border-transparent text-gray-500 hover:text-ink'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
          </svg>
          <span>Returns & RTO Queue</span>
          <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.2 rounded-full font-bold">
            {kpiMetrics.total}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('qc')}
          className={`py-2.5 font-semibold border-b-2 flex items-center space-x-2 transition-colors cursor-pointer ${
            activeTab === 'qc'
              ? 'border-accent text-accent'
              : 'border-transparent text-gray-500 hover:text-ink'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>QC & Grading Station</span>
          {activeQcReturn && (
            <span className="text-[10px] bg-accent-light text-accent-dark px-1.5 py-0.2 rounded-full font-bold">
              Active: #{activeQcReturn.returnNumber}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('claims')}
          className={`py-2.5 font-semibold border-b-2 flex items-center space-x-2 transition-colors cursor-pointer ${
            activeTab === 'claims'
              ? 'border-accent text-accent'
              : 'border-transparent text-gray-500 hover:text-ink'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>Marketplace Claims (SPF/Safe-T)</span>
          <span className="text-[10px] bg-rose-50 text-rose-700 px-1.5 py-0.2 rounded-full font-bold">
            {claimsPagination.total}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('dock')}
          className={`py-2.5 font-semibold border-b-2 flex items-center space-x-2 transition-colors cursor-pointer ${
            activeTab === 'dock'
              ? 'border-accent text-accent'
              : 'border-transparent text-gray-500 hover:text-ink'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
          <span>Dock Barcode Scanner</span>
        </button>
      </div>

      {/* 3. Main Body Tabs */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
        {/* ======================================================== */}
        {/* TAB 1: RETURNS & RTO QUEUE */}
        {/* ======================================================== */}
        {activeTab === 'returns' && (
          <div className="space-y-3">
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-white border border-border p-2.5 rounded shadow-2xs flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold text-gray-500">Total Returns</div>
                  <div className="text-lg font-bold text-ink">{kpiMetrics.total}</div>
                </div>
                <div className="w-8 h-8 rounded bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  📦
                </div>
              </div>
              <div className="bg-white border border-border p-2.5 rounded shadow-2xs flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold text-gray-500">Pending Inspection</div>
                  <div className="text-lg font-bold text-indigo-600">{kpiMetrics.pendingQc}</div>
                </div>
                <div className="w-8 h-8 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  🔍
                </div>
              </div>
              <div className="bg-white border border-border p-2.5 rounded shadow-2xs flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold text-gray-500">Restocked to Ledger</div>
                  <div className="text-lg font-bold text-emerald-600">{kpiMetrics.restocked}</div>
                </div>
                <div className="w-8 h-8 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  ✅
                </div>
              </div>
              <div className="bg-white border border-border p-2.5 rounded shadow-2xs flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold text-gray-500">Marketplace Claims</div>
                  <div className="text-lg font-bold text-rose-600">{kpiMetrics.disputes}</div>
                </div>
                <div className="w-8 h-8 rounded bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                  ⚖️
                </div>
              </div>
            </div>

            {/* Filter Toolbar */}
            <TableToolbar>
              <div className="flex items-center space-x-2">
                <SearchBar
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search Return #, AWB, reason…"
                  className="w-56"
                />

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-7 text-xs px-2 border border-border rounded bg-white text-gray-700"
                >
                  <option value="all">All Statuses</option>
                  <option value="initiated">Initiated</option>
                  <option value="received_at_hub">Dock Inwarded</option>
                  <option value="qc_in_progress">QC In Progress</option>
                  <option value="qc_completed">QC Graded</option>
                  <option value="restocked">Restocked</option>
                  <option value="dispute_filed">Dispute Filed</option>
                </select>

                {/* Channel Filter */}
                <select
                  value={channelFilter}
                  onChange={(e) => setChannelFilter(e.target.value)}
                  className="h-7 text-xs px-2 border border-border rounded bg-white text-gray-700"
                >
                  <option value="all">All Channels</option>
                  <option value="flipkart">Flipkart</option>
                  <option value="amazon">Amazon</option>
                  <option value="meesho">Meesho</option>
                  <option value="myntra">Myntra</option>
                  <option value="direct">Direct</option>
                </select>

                {/* Type Filter */}
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="h-7 text-xs px-2 border border-border rounded bg-white text-gray-700"
                >
                  <option value="all">All Types</option>
                  <option value="customer_return">Customer Return</option>
                  <option value="rto">Return To Origin (RTO)</option>
                  <option value="courier_return">Courier Return</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500">
                  Showing <b>{returnsList.length}</b> of <b>{returnsPagination.total}</b> returns
                </span>
              </div>
            </TableToolbar>

            {/* Dense Returns Table */}
            <div className="bg-white border border-border rounded shadow-2xs overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-gray-50 border-b border-border text-gray-600 font-semibold select-none">
                  <tr>
                    <th className="px-2.5 py-2">Return Number</th>
                    <th className="px-2.5 py-2">Channel / Type</th>
                    <th className="px-2.5 py-2">Tracking AWB & Carrier</th>
                    <th className="px-2.5 py-2">Warehouse</th>
                    <th className="px-2.5 py-2">Items</th>
                    <th className="px-2.5 py-2">Reason</th>
                    <th className="px-2.5 py-2">Status</th>
                    <th className="px-2.5 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {returnsList.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                        No returns found. Click <b>"+ New Return"</b> or scan an incoming package in the Dock Scanner!
                      </td>
                    </tr>
                  ) : (
                    returnsList.map((ret) => {
                      const totalExpected = (ret.items || []).reduce(
                        (sum, i) => sum + (parseInt(i.expectedQuantity, 10) || 1),
                        0
                      );
                      const isRestockable =
                        ret.status === 'qc_completed' &&
                        (ret.items || []).some(
                          (i) => i.disposition === 'restock_inventory' && parseInt(i.restockedQuantity, 10) === 0
                        );

                      return (
                        <tr key={ret.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="px-2.5 py-2 font-mono font-bold text-ink">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedReturn(ret);
                                setIsDetailDrawerOpen(true);
                              }}
                              className="hover:underline text-accent cursor-pointer"
                            >
                              {ret.returnNumber}
                            </button>
                            <div className="text-[10px] text-gray-400 font-normal">
                              {new Date(ret.created_at || ret.createdAt).toLocaleDateString()}
                            </div>
                          </td>

                          <td className="px-2.5 py-2">
                            <div className="flex items-center space-x-1.5">
                              {renderChannelTag(ret.channel)}
                              <span className="text-[10px] font-medium text-gray-600 capitalize">
                                {ret.type === 'customer_return' ? 'Customer' : 'RTO'}
                              </span>
                            </div>
                          </td>

                          <td className="px-2.5 py-2">
                            <div className="font-mono text-ink text-[11px]">
                              {ret.trackingAwb || '—'}
                            </div>
                            <div className="text-[10px] text-gray-500">{ret.courierName || 'Carrier'}</div>
                          </td>

                          <td className="px-2.5 py-2 text-gray-700">
                            {ret.warehouse?.name || 'Primary Hub'}
                          </td>

                          <td className="px-2.5 py-2">
                            <span className="font-semibold text-ink">{totalExpected} units</span>
                            <div className="text-[10px] text-gray-500">
                              {(ret.items || []).length} SKU(s)
                            </div>
                          </td>

                          <td className="px-2.5 py-2 text-gray-600 max-w-[180px] truncate" title={ret.returnReason}>
                            {ret.returnReason || 'Customer return'}
                          </td>

                          <td className="px-2.5 py-2">{getStatusBadge(ret.status)}</td>

                          <td className="px-2.5 py-2 text-right">
                            <div className="flex items-center justify-end space-x-1">
                              {/* Open QC Inspection Station */}
                              <button
                                type="button"
                                onClick={() => handleOpenQcStation(ret)}
                                className="h-6 px-2 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-semibold transition-colors cursor-pointer"
                                title="Inspect & Grade Items"
                              >
                                🔍 Inspect
                              </button>

                              {/* Restock Action if QC passed */}
                              {isRestockable && (
                                <button
                                  type="button"
                                  onClick={() => handleExecuteRestock(ret.id)}
                                  className="h-6 px-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold transition-colors cursor-pointer shadow-2xs"
                                  title="Restock Grade A Items into Inventory Ledger"
                                >
                                  Restock
                                </button>
                              )}

                              {/* File Claim Button if fraud or damaged */}
                              <button
                                type="button"
                                onClick={() => handleOpenFileClaim(ret)}
                                className="h-6 px-2 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-semibold transition-colors cursor-pointer"
                                title="File Marketplace SPF/Safe-T Claim"
                              >
                                ⚖️ Claim
                              </button>

                              {/* View Details Drawer */}
                              <TableIconButton
                                onClick={() => {
                                  setSelectedReturn(ret);
                                  setIsDetailDrawerOpen(true);
                                }}
                                title="View Details"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </TableIconButton>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: QC & GRADING STATION */}
        {/* ======================================================== */}
        {activeTab === 'qc' && (
          <div className="space-y-3">
            {!activeQcReturn ? (
              <div className="bg-white border border-border rounded p-8 text-center space-y-3">
                <div className="text-3xl">🔍</div>
                <h3 className="text-sm font-bold text-ink">No Return Active in QC Station</h3>
                <p className="text-xs text-gray-500 max-w-md mx-auto">
                  Select a return from the <b>Returns Queue</b> or scan an incoming package barcode to begin physical inspection and quality grading.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('returns')}
                  className="h-7 px-3 rounded bg-accent text-white text-xs font-semibold hover:bg-accent-dark transition-colors cursor-pointer"
                >
                  Go to Returns Queue
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {/* Left Column: Return Consignment Card */}
                <div className="bg-white border border-border rounded p-3 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between pb-2 border-b border-border">
                    <div>
                      <div className="text-xs font-bold text-ink flex items-center space-x-1.5">
                        <span>Return #{activeQcReturn.returnNumber}</span>
                        {renderChannelTag(activeQcReturn.channel)}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        Type: <b className="capitalize">{activeQcReturn.type}</b>
                      </div>
                    </div>
                    {getStatusBadge(activeQcReturn.status)}
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Tracking AWB:</span>
                      <span className="font-mono font-bold text-ink">{activeQcReturn.trackingAwb || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Courier:</span>
                      <span className="font-semibold text-gray-700">{activeQcReturn.courierName || 'Courier'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Warehouse:</span>
                      <span className="font-semibold text-gray-700">{activeQcReturn.warehouse?.name || 'Primary'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Reason:</span>
                      <span className="text-gray-700">{activeQcReturn.returnReason || '—'}</span>
                    </div>
                  </div>

                  {/* Restock Callout if already inspected */}
                  {activeQcReturn.status === 'qc_completed' && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded p-2 text-xs space-y-2">
                      <div className="font-bold text-emerald-800 flex items-center space-x-1">
                        <span>✅ QC Inspection Complete</span>
                      </div>
                      <p className="text-[11px] text-emerald-700">
                        Items are graded and ready to be inwarded into physical warehouse stock balances.
                      </p>
                      <button
                        type="button"
                        onClick={() => handleExecuteRestock(activeQcReturn.id)}
                        className="w-full h-7 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors cursor-pointer shadow-2xs"
                      >
                        Restock Grade-A Items to Ledger
                      </button>
                    </div>
                  )}

                  {/* Marketplace Claim Callout if fraud detected */}
                  {Object.values(qcInspections).some(
                    (i) => i.qcStatus === 'wrong_item_fraud' || i.qcStatus === 'empty_box_fraud'
                  ) && (
                    <div className="bg-rose-50 border border-rose-200 rounded p-2 text-xs space-y-2">
                      <div className="font-bold text-rose-800 flex items-center space-x-1">
                        <span>🚨 Potential Marketplace Fraud</span>
                      </div>
                      <p className="text-[11px] text-rose-700">
                        Item flagged as wrong product or empty box. File an immediate SPF/Safe-T claim with courier and platform.
                      </p>
                      <button
                        type="button"
                        onClick={() => handleOpenFileClaim(activeQcReturn)}
                        className="w-full h-7 rounded bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-colors cursor-pointer shadow-2xs"
                      >
                        ⚖️ Launch SPF / Safe-T Claim
                      </button>
                    </div>
                  )}
                </div>

                {/* Right 2 Columns: Item-by-Item QC Station */}
                <div className="col-span-2 bg-white border border-border rounded p-3 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between pb-2 border-b border-border">
                    <h3 className="text-xs font-bold text-ink">
                      Item Inspection & Quality Grading ({(activeQcReturn.items || []).length} Items)
                    </h3>
                    <div className="text-[11px] text-gray-500">
                      Step 2 of Reverse Logistics Lifecycle
                    </div>
                  </div>

                  <div className="space-y-3">
                    {(activeQcReturn.items || []).map((item, index) => {
                      const cur = qcInspections[item.id] || {};
                      return (
                        <div
                          key={item.id}
                          className="border border-border rounded p-2.5 space-y-2.5 bg-gray-50/50"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="w-5 h-5 rounded-full bg-accent-light text-accent-dark font-bold text-[10px] flex items-center justify-center">
                                {index + 1}
                              </span>
                              <div>
                                <div className="text-xs font-bold text-ink">
                                  {item.product?.title || 'Product SKU'}
                                </div>
                                <div className="text-[10px] text-gray-500 font-mono">
                                  SKU: {item.product?.internalSku || item.productId} | Expected Qty: {item.expectedQuantity}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <label className="text-[11px] text-gray-600 font-medium">Received Qty:</label>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={cur.receivedQuantity || 1}
                                onChange={(e) =>
                                  setQcInspections((prev) => ({
                                    ...prev,
                                    [item.id]: { ...prev[item.id], receivedQuantity: parseInt(e.target.value, 10) || 0 },
                                  }))
                                }
                                className="w-16 h-6 px-1.5 text-xs text-center border border-border rounded bg-white font-bold"
                              />
                            </div>
                          </div>

                          {/* Grade Selection Buttons */}
                          <div>
                            <div className="text-[10px] uppercase font-bold text-gray-500 mb-1">
                              Select Physical Inspection Grade & Disposition
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setQcInspections((prev) => ({
                                    ...prev,
                                    [item.id]: {
                                      ...prev[item.id],
                                      qcStatus: 'pass_grade_a',
                                      disposition: 'restock_inventory',
                                    },
                                  }))
                                }
                                className={`p-2 rounded border text-left cursor-pointer transition-all ${
                                  cur.qcStatus === 'pass_grade_a'
                                    ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500'
                                    : 'bg-white border-border hover:bg-gray-50'
                                }`}
                              >
                                <div className="text-[11px] font-bold text-emerald-800 flex items-center space-x-1">
                                  <span>🟢 Grade A</span>
                                </div>
                                <div className="text-[10px] text-gray-500 leading-tight">Like-New / Restock</div>
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setQcInspections((prev) => ({
                                    ...prev,
                                    [item.id]: {
                                      ...prev[item.id],
                                      qcStatus: 'refurbish_grade_b',
                                      disposition: 'quarantine',
                                    },
                                  }))
                                }
                                className={`p-2 rounded border text-left cursor-pointer transition-all ${
                                  cur.qcStatus === 'refurbish_grade_b'
                                    ? 'bg-amber-50 border-amber-500 ring-1 ring-amber-500'
                                    : 'bg-white border-border hover:bg-gray-50'
                                }`}
                              >
                                <div className="text-[11px] font-bold text-amber-800 flex items-center space-x-1">
                                  <span>🟡 Grade B</span>
                                </div>
                                <div className="text-[10px] text-gray-500 leading-tight">Refurbish / Quarantine</div>
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setQcInspections((prev) => ({
                                    ...prev,
                                    [item.id]: {
                                      ...prev[item.id],
                                      qcStatus: 'damaged_grade_c',
                                      disposition: 'scrap',
                                    },
                                  }))
                                }
                                className={`p-2 rounded border text-left cursor-pointer transition-all ${
                                  cur.qcStatus === 'damaged_grade_c'
                                    ? 'bg-rose-50 border-rose-500 ring-1 ring-rose-500'
                                    : 'bg-white border-border hover:bg-gray-50'
                                }`}
                              >
                                <div className="text-[11px] font-bold text-rose-800 flex items-center space-x-1">
                                  <span>🔴 Grade C</span>
                                </div>
                                <div className="text-[10px] text-gray-500 leading-tight">Damaged / Scrap</div>
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setQcInspections((prev) => ({
                                    ...prev,
                                    [item.id]: {
                                      ...prev[item.id],
                                      qcStatus: 'wrong_item_fraud',
                                      disposition: 'marketplace_claim',
                                    },
                                  }))
                                }
                                className={`p-2 rounded border text-left cursor-pointer transition-all ${
                                  cur.qcStatus === 'wrong_item_fraud'
                                    ? 'bg-purple-50 border-purple-500 ring-1 ring-purple-500'
                                    : 'bg-white border-border hover:bg-gray-50'
                                }`}
                              >
                                <div className="text-[11px] font-bold text-purple-800 flex items-center space-x-1">
                                  <span>🚨 Fraud / Wrong</span>
                                </div>
                                <div className="text-[10px] text-gray-500 leading-tight">Claim SPF / Safe-T</div>
                              </button>
                            </div>
                          </div>

                          {/* Notes input */}
                          <div>
                            <input
                              type="text"
                              value={cur.qcNotes || ''}
                              onChange={(e) =>
                                setQcInspections((prev) => ({
                                  ...prev,
                                  [item.id]: { ...prev[item.id], qcNotes: e.target.value },
                                }))
                              }
                              placeholder="Inspector remarks (e.g. tag intact, polybag opened, missing belt)…"
                              className="w-full h-7 px-2 text-xs border border-border rounded bg-white text-ink"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Submit QC Button */}
                  <div className="pt-2 flex items-center justify-end space-x-2 border-t border-border">
                    <button
                      type="button"
                      onClick={() => setActiveQcReturn(null)}
                      className="h-7 px-3 rounded border border-border text-gray-600 hover:bg-gray-50 text-xs font-medium cursor-pointer"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={handleSubmitQc}
                      disabled={submittingQc}
                      className="h-7 px-4 rounded bg-accent hover:bg-accent-dark text-white text-xs font-semibold cursor-pointer shadow-xs transition-colors flex items-center space-x-1"
                    >
                      {submittingQc ? (
                        <span>Saving QC…</span>
                      ) : (
                        <>
                          <span>Save QC Grading</span>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: MARKETPLACE CLAIMS & DISPUTES */}
        {/* ======================================================== */}
        {activeTab === 'claims' && (
          <div className="space-y-3">
            {/* Claims Table Toolbar */}
            <TableToolbar>
              <div className="flex items-center space-x-2">
                <SearchBar
                  value={claimSearch}
                  onChange={(e) => setClaimSearch(e.target.value)}
                  placeholder="Search Claim #, carrier, description…"
                  className="w-56"
                />

                <select
                  value={claimStatusFilter}
                  onChange={(e) => setClaimStatusFilter(e.target.value)}
                  className="h-7 text-xs px-2 border border-border rounded bg-white text-gray-700"
                >
                  <option value="all">All Claim Statuses</option>
                  <option value="submitted">Submitted</option>
                  <option value="under_investigation">Under Investigation</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="settled">Settled</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsClaimModalOpen(true)}
                  className="h-7 px-3 rounded bg-rose-600 hover:bg-rose-700 text-white flex items-center space-x-1.5 text-xs font-semibold cursor-pointer shadow-xs transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>+ File Marketplace Claim</span>
                </button>
              </div>
            </TableToolbar>

            {/* Claims DataTable */}
            <div className="bg-white border border-border rounded shadow-2xs overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-gray-50 border-b border-border text-gray-600 font-semibold select-none">
                  <tr>
                    <th className="px-2.5 py-2">Claim Number</th>
                    <th className="px-2.5 py-2">Marketplace</th>
                    <th className="px-2.5 py-2">Claim Type</th>
                    <th className="px-2.5 py-2">Claimed Amount</th>
                    <th className="px-2.5 py-2">Approved Amount</th>
                    <th className="px-2.5 py-2">Status</th>
                    <th className="px-2.5 py-2">Filed At</th>
                    <th className="px-2.5 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {claimsList.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                        No marketplace claims filed yet. When fraudulent or damaged returns arrive, file SPF/Safe-T claims here!
                      </td>
                    </tr>
                  ) : (
                    claimsList.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-2.5 py-2 font-mono font-bold text-ink">
                          {c.claimNumber}
                          <div className="text-[10px] text-gray-400 font-normal">
                            Carrier: {c.carrierName || 'Courier'}
                          </div>
                        </td>

                        <td className="px-2.5 py-2">{renderChannelTag(c.channel)}</td>

                        <td className="px-2.5 py-2 capitalize font-medium text-gray-700">
                          {c.claimType?.replace(/_/g, ' ')}
                        </td>

                        <td className="px-2.5 py-2 font-mono font-bold text-ink">
                          ₹{parseFloat(c.claimAmount || 0).toFixed(2)}
                        </td>

                        <td className="px-2.5 py-2 font-mono font-bold text-emerald-700">
                          ₹{parseFloat(c.approvedAmount || 0).toFixed(2)}
                        </td>

                        <td className="px-2.5 py-2">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                              c.status === 'approved' || c.status === 'settled'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : c.status === 'rejected'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {c.status?.toUpperCase()}
                          </span>
                        </td>

                        <td className="px-2.5 py-2 text-gray-500 text-[11px]">
                          {new Date(c.claimFiledAt || c.created_at).toLocaleDateString()}
                        </td>

                        <td className="px-2.5 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedClaimForUpdate(c);
                              setUpdateClaimStatusVal(c.status);
                              setUpdateClaimApprovedAmt(c.approvedAmount || c.claimAmount);
                            }}
                            className="h-6 px-2 rounded bg-gray-100 hover:bg-gray-200 text-ink text-[11px] font-semibold transition-colors cursor-pointer"
                          >
                            Update Status
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: DOCK SCANNER */}
        {/* ======================================================== */}
        {activeTab === 'dock' && (
          <div className="grid grid-cols-3 gap-3">
            {/* Left: Barcode Scanner Input Panel */}
            <div className="bg-white border border-border rounded p-4 space-y-4 shadow-2xs">
              <div className="border-b border-border pb-2">
                <h3 className="text-xs font-bold text-ink flex items-center space-x-1.5">
                  <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                  <span>Inbound Dock Return Scanner</span>
                </h3>
                <p className="text-[11px] text-gray-500">
                  Scan return labels or AWB barcodes as courier drivers hand over return bags.
                </p>
              </div>

              <form onSubmit={handleDockScan} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                    Receiving Warehouse Facility:
                  </label>
                  <select
                    value={selectedWarehouseId}
                    onChange={(e) => setSelectedWarehouseId(e.target.value)}
                    className="w-full h-8 text-xs px-2 border border-border rounded bg-white font-medium text-ink"
                  >
                    {warehouses.map((wh) => (
                      <option key={wh.id} value={wh.id}>
                        {wh.name} ({wh.code || 'WH'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                    Scan Return AWB / Barcode / Order #:
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={dockScanCode}
                      onChange={(e) => setDockScanCode(e.target.value)}
                      placeholder="e.g. RET-AWB-..., Delhivery AWB, or Order ID…"
                      autoFocus
                      className="w-full h-9 px-3 text-xs font-mono font-bold border-2 border-accent/40 focus:border-accent rounded bg-white text-ink outline-none shadow-xs"
                    />
                    <button
                      type="submit"
                      disabled={dockScanning}
                      className="absolute right-1 top-1 h-7 px-3 bg-accent hover:bg-accent-dark text-white rounded text-xs font-semibold cursor-pointer shadow-2xs transition-colors"
                    >
                      {dockScanning ? 'Inwarding…' : 'Scan'}
                    </button>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded p-2.5 text-[11px] text-blue-800 space-y-1">
                  <div className="font-bold">⚡ Rapid Inwarding Workflow:</div>
                  <ul className="list-disc list-inside space-y-0.5 text-blue-700">
                    <li>Compatible with handheld 1D/2D USB & Bluetooth scanners.</li>
                    <li>Auto-detects courier return AWB or original forward shipment AWB.</li>
                    <li>Instantly updates return status to <b>Dock Inwarded</b> for QC.</li>
                  </ul>
                </div>
              </form>
            </div>

            {/* Right: Live Scan Audit Feed */}
            <div className="col-span-2 bg-white border border-border rounded p-4 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <h3 className="text-xs font-bold text-ink">Recent Scan Inwarding History</h3>
                <span className="text-[11px] text-gray-500 font-mono">
                  {dockScanLogs.length} Scans recorded this session
                </span>
              </div>

              <div className="space-y-2 max-h-[460px] overflow-y-auto">
                {dockScanLogs.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 text-xs">
                    No scans recorded in this session. Start scanning packages above!
                  </div>
                ) : (
                  dockScanLogs.map((log) => (
                    <div
                      key={log.id}
                      className={`p-2.5 rounded border text-xs flex items-center justify-between transition-colors ${
                        log.success
                          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                          : 'bg-rose-50/70 border-rose-200 text-rose-900'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-sm">{log.success ? '✅' : '❌'}</span>
                        <div>
                          <div className="font-mono font-bold">{log.code}</div>
                          <div className="text-[11px]">{log.message}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-gray-500 font-mono">{log.timestamp}</div>
                        {log.returnOrder && (
                          <button
                            type="button"
                            onClick={() => handleOpenQcStation(log.returnOrder)}
                            className="mt-1 text-[10px] font-bold text-accent hover:underline cursor-pointer"
                          >
                            Inspect in QC Station &rarr;
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: MANUAL CREATE RETURN */}
      {/* ======================================================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-border shadow-xl max-w-md w-full p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="text-xs font-bold text-ink">Register New Return / RTO</h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-gray-400 hover:text-ink text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateReturnSubmit} className="space-y-2.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">Channel:</label>
                  <select
                    value={createFormData.channel}
                    onChange={(e) => setCreateFormData({ ...createFormData, channel: e.target.value })}
                    className="w-full h-7 px-2 border border-border rounded bg-white text-ink"
                  >
                    <option value="flipkart">Flipkart</option>
                    <option value="amazon">Amazon</option>
                    <option value="meesho">Meesho</option>
                    <option value="myntra">Myntra</option>
                    <option value="direct">Direct / Website</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">Return Type:</label>
                  <select
                    value={createFormData.type}
                    onChange={(e) => setCreateFormData({ ...createFormData, type: e.target.value })}
                    className="w-full h-7 px-2 border border-border rounded bg-white text-ink"
                  >
                    <option value="customer_return">Customer Return</option>
                    <option value="rto">Return to Origin (RTO)</option>
                    <option value="courier_return">Courier Return</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Return Courier Tracking AWB:
                </label>
                <input
                  type="text"
                  value={createFormData.trackingAwb}
                  onChange={(e) => setCreateFormData({ ...createFormData, trackingAwb: e.target.value })}
                  placeholder="e.g. RET-DEL-984128"
                  className="w-full h-7 px-2 border border-border rounded font-mono bg-white text-ink"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">Courier Partner:</label>
                  <input
                    type="text"
                    value={createFormData.courierName}
                    onChange={(e) => setCreateFormData({ ...createFormData, courierName: e.target.value })}
                    placeholder="Delhivery, Ekart, etc."
                    className="w-full h-7 px-2 border border-border rounded bg-white text-ink"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">Destination Warehouse:</label>
                  <select
                    value={createFormData.warehouseId}
                    onChange={(e) => setCreateFormData({ ...createFormData, warehouseId: e.target.value })}
                    className="w-full h-7 px-2 border border-border rounded bg-white text-ink"
                  >
                    {warehouses.map((wh) => (
                      <option key={wh.id} value={wh.id}>
                        {wh.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Returned Product SKU:</label>
                <select
                  value={createFormData.productId}
                  onChange={(e) => setCreateFormData({ ...createFormData, productId: e.target.value })}
                  className="w-full h-7 px-2 border border-border rounded bg-white text-ink"
                >
                  <option value="">-- Select Product SKU --</option>
                  {productsList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.internalSku} - {p.title?.slice(0, 35)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Customer / Courier Reason:</label>
                <input
                  type="text"
                  value={createFormData.returnReason}
                  onChange={(e) => setCreateFormData({ ...createFormData, returnReason: e.target.value })}
                  placeholder="e.g. Size mismatch, Customer refused delivery"
                  className="w-full h-7 px-2 border border-border rounded bg-white text-ink"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="h-7 px-3 rounded border border-border text-gray-600 hover:bg-gray-50 text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingReturn}
                  className="h-7 px-4 rounded bg-accent hover:bg-accent-dark text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs"
                >
                  {creatingReturn ? 'Creating…' : 'Create Return'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: FILE MARKETPLACE CLAIM (SPF / SAFE-T) */}
      {/* ======================================================== */}
      {isClaimModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-border shadow-xl max-w-md w-full p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="text-xs font-bold text-rose-700 flex items-center space-x-1.5">
                <span>⚖️ File Marketplace SPF / Safe-T Claim</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsClaimModalOpen(false)}
                className="text-gray-400 hover:text-ink text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitClaim} className="space-y-2.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">Marketplace:</label>
                  <select
                    value={claimFormData.channel}
                    onChange={(e) => setClaimFormData({ ...claimFormData, channel: e.target.value })}
                    className="w-full h-7 px-2 border border-border rounded bg-white text-ink"
                  >
                    <option value="flipkart">Flipkart SPF Claim</option>
                    <option value="amazon">Amazon Safe-T Claim</option>
                    <option value="meesho">Meesho Claim</option>
                    <option value="myntra">Myntra Dispute</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">Claim Type:</label>
                  <select
                    value={claimFormData.claimType}
                    onChange={(e) => setClaimFormData({ ...claimFormData, claimType: e.target.value })}
                    className="w-full h-7 px-2 border border-border rounded bg-white text-ink"
                  >
                    <option value="damaged_product">Damaged / Broken Product</option>
                    <option value="wrong_item">Wrong Item Returned (Fraud)</option>
                    <option value="empty_box">Empty Box / Soap / Stone</option>
                    <option value="used_product">Used / Soiled Item</option>
                    <option value="missing_quantity">Missing Unit in Combo</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">Claim ID / Number:</label>
                  <input
                    type="text"
                    value={claimFormData.claimNumber}
                    onChange={(e) => setClaimFormData({ ...claimFormData, claimNumber: e.target.value })}
                    className="w-full h-7 px-2 border border-border rounded font-mono bg-white text-ink"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">Claim Amount (₹):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={claimFormData.claimAmount}
                    onChange={(e) => setClaimFormData({ ...claimFormData, claimAmount: e.target.value })}
                    className="w-full h-7 px-2 border border-border rounded font-mono font-bold bg-white text-ink"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Incident Description:</label>
                <textarea
                  rows="2"
                  value={claimFormData.incidentDescription}
                  onChange={(e) => setClaimFormData({ ...claimFormData, incidentDescription: e.target.value })}
                  placeholder="Detail exact condition of return, outer packaging, polybag seal status…"
                  className="w-full p-2 border border-border rounded bg-white text-ink text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Evidence Photo / Video URLs (comma separated):
                </label>
                <input
                  type="text"
                  value={claimFormData.evidenceUrls}
                  onChange={(e) => setClaimFormData({ ...claimFormData, evidenceUrls: e.target.value })}
                  placeholder="https://orderly-storage/img1.jpg, https://.../img2.jpg"
                  className="w-full h-7 px-2 border border-border rounded font-mono text-[11px] bg-white text-ink"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsClaimModalOpen(false)}
                  className="h-7 px-3 rounded border border-border text-gray-600 hover:bg-gray-50 text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingClaim}
                  className="h-7 px-4 rounded bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs"
                >
                  {submittingClaim ? 'Filing…' : 'Submit Claim'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: UPDATE CLAIM STATUS */}
      {/* ======================================================== */}
      {selectedClaimForUpdate && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-border shadow-xl max-w-sm w-full p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="text-xs font-bold text-ink">
                Update Claim #{selectedClaimForUpdate.claimNumber}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedClaimForUpdate(null)}
                className="text-gray-400 hover:text-ink text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateClaimStatus} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Claim Status:</label>
                <select
                  value={updateClaimStatusVal}
                  onChange={(e) => setUpdateClaimStatusVal(e.target.value)}
                  className="w-full h-7 px-2 border border-border rounded bg-white text-ink font-semibold"
                >
                  <option value="submitted">Submitted</option>
                  <option value="under_investigation">Under Investigation</option>
                  <option value="approved">Approved</option>
                  <option value="settled">Settled / Payout Credited</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Approved Payout Amount (₹):</label>
                <input
                  type="number"
                  step="0.01"
                  value={updateClaimApprovedAmt}
                  onChange={(e) => setUpdateClaimApprovedAmt(e.target.value)}
                  className="w-full h-7 px-2 border border-border rounded font-mono font-bold bg-white text-emerald-700"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setSelectedClaimForUpdate(null)}
                  className="h-7 px-3 rounded border border-border text-gray-600 hover:bg-gray-50 text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingClaim}
                  className="h-7 px-4 rounded bg-accent hover:bg-accent-dark text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs"
                >
                  {updatingClaim ? 'Updating…' : 'Save Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* DRAWER: RETURN DETAILS */}
      {/* ======================================================== */}
      {isDetailDrawerOpen && selectedReturn && (
        <div className="fixed inset-0 z-50 bg-black/40 flex justify-end">
          <div className="bg-white w-full max-w-md h-full shadow-2xl p-4 flex flex-col justify-between overflow-y-auto space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div>
                  <h3 className="text-sm font-bold text-ink">Return #{selectedReturn.returnNumber}</h3>
                  <div className="text-[11px] text-gray-500">
                    Logged on {new Date(selectedReturn.created_at || selectedReturn.createdAt).toLocaleString()}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDetailDrawerOpen(false)}
                  className="text-gray-400 hover:text-ink text-sm"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-gray-500">Channel / Platform:</span>
                  <span>{renderChannelTag(selectedReturn.channel)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-gray-500">Consignment Type:</span>
                  <span className="font-semibold capitalize text-ink">{selectedReturn.type}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-gray-500">Tracking AWB:</span>
                  <span className="font-mono font-bold text-ink">{selectedReturn.trackingAwb || '—'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-gray-500">Courier Partner:</span>
                  <span className="font-semibold text-gray-700">{selectedReturn.courierName || '—'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-gray-500">Warehouse Destination:</span>
                  <span className="font-semibold text-gray-700">{selectedReturn.warehouse?.name || 'Primary'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-gray-500">Lifecycle Status:</span>
                  <span>{getStatusBadge(selectedReturn.status)}</span>
                </div>
                <div className="py-1 border-b border-border/40">
                  <span className="text-gray-500 block mb-0.5">Return Reason:</span>
                  <span className="text-gray-800 italic">{selectedReturn.returnReason || 'None specified'}</span>
                </div>
              </div>

              {/* Items Breakdown */}
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-bold text-ink">Return Line Items ({(selectedReturn.items || []).length})</h4>
                <div className="space-y-1.5">
                  {(selectedReturn.items || []).map((item) => (
                    <div key={item.id} className="border border-border rounded p-2 text-xs bg-gray-50">
                      <div className="font-bold text-ink">{item.product?.title || 'Product'}</div>
                      <div className="text-[10px] text-gray-500 font-mono">
                        SKU: {item.product?.internalSku || item.productId}
                      </div>
                      <div className="flex items-center justify-between mt-1 text-[11px]">
                        <span>Expected: <b>{item.expectedQuantity}</b></span>
                        <span>QC: <b className="capitalize">{item.qcStatus?.replace(/_/g, ' ')}</b></span>
                        <span>Restocked: <b className="text-emerald-700">{item.restockedQuantity}</b></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-border flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setIsDetailDrawerOpen(false);
                  handleOpenQcStation(selectedReturn);
                }}
                className="h-7 px-3 rounded bg-accent text-white font-semibold text-xs cursor-pointer shadow-xs"
              >
                Open in QC Station &rarr;
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
