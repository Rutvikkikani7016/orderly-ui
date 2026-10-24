import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import {
  getReconciliationSummary,
  getReconciliations,
  getSettlements,
  importSettlement,
  resolveDiscrepancy,
} from '../api/reconciliation.js';
import { getPlatformAccounts } from '../api/platformAccounts.js';
import {
  DataTable,
  TableToolbar,
  SearchBar,
  TableIconButton,
  InfoTooltip,
  StatusBadge,
} from '../components/common';

export default function Reconciliation() {
  const [activeTab, setActiveTab] = useState('audit'); // 'audit' | 'settlements' | 'disputes'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Platform Accounts & Metadata
  const [platformAccounts, setPlatformAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');

  // Summary Metrics
  const [summary, setSummary] = useState({
    totalBankDeposits: 0,
    totalGrossInvoiced: 0,
    totalActualPayout: 0,
    totalDiscrepancyAmount: 0,
    totalDeductionsEstimated: 0,
    matchedCount: 0,
    underpaidCount: 0,
    overpaidCount: 0,
    resolvedCount: 0,
    unsettledCount: 0,
    totalOrdersAudited: 0,
    reconciliationHealthRate: 100,
  });

  // 1. Audit Table State
  const [reconciliations, setReconciliations] = useState([]);
  const [auditPagination, setAuditPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [platformFilter, setPlatformFilter] = useState('all');

  // Selected Reconciliation for Drawer
  const [selectedRec, setSelectedRec] = useState(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolvingStatus, setResolvingStatus] = useState(false);

  // 2. Settlements Table State
  const [settlements, setSettlements] = useState([]);
  const [settlementPagination, setSettlementPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFormData, setImportFormData] = useState({
    platformAccountId: '',
    settlementDate: new Date().toISOString().slice(0, 10),
    sourceType: 'csv_upload',
    csvContent: '',
  });
  const [importing, setImporting] = useState(false);

  // Load Platform Accounts on Mount
  useEffect(() => {
    async function loadAccounts() {
      try {
        const accs = await getPlatformAccounts().catch(() => []);
        const list = accs || [];
        setPlatformAccounts(list);
        if (list.length > 0) {
          setSelectedAccountId(list[0].id);
          setImportFormData((prev) => ({ ...prev, platformAccountId: list[0].id }));
        }
      } catch (err) {
        console.error('Failed to load accounts:', err);
      }
    }
    loadAccounts();
  }, []);

  // Fetch Summary
  const fetchSummary = useCallback(async () => {
    try {
      const data = await getReconciliationSummary({
        platformAccountId: selectedAccountId || undefined,
      });
      setSummary(data || {});
    } catch (err) {
      console.error('Failed to fetch summary:', err);
    }
  }, [selectedAccountId]);

  // Fetch Reconciliations
  const fetchReconciliations = useCallback(
    async (page = 1) => {
      try {
        const data = await getReconciliations({
          page,
          limit: auditPagination.limit,
          status: activeTab === 'disputes' ? 'underpaid' : statusFilter,
          search,
          platform: platformFilter,
        });
        setReconciliations(data.reconciliations || []);
        setAuditPagination({
          page: data.page || 1,
          limit: data.limit || 15,
          total: data.total || 0,
          totalPages: data.totalPages || 1,
        });
      } catch (err) {
        toast.error('Failed to load reconciliations');
        console.error(err);
      }
    },
    [auditPagination.limit, activeTab, statusFilter, search, platformFilter]
  );

  // Fetch Settlements
  const fetchSettlements = useCallback(
    async (page = 1) => {
      try {
        const data = await getSettlements({
          page,
          limit: settlementPagination.limit,
        });
        setSettlements(data.settlements || []);
        setSettlementPagination({
          page: data.page || 1,
          limit: data.limit || 15,
          total: data.total || 0,
          totalPages: data.totalPages || 1,
        });
      } catch (err) {
        toast.error('Failed to load settlements');
        console.error(err);
      }
    },
    [settlementPagination.limit]
  );

  // Master Data Refresh
  useEffect(() => {
    setLoading(true);
    fetchSummary();
    if (activeTab === 'audit' || activeTab === 'disputes') {
      fetchReconciliations(1).finally(() => setLoading(false));
    } else if (activeTab === 'settlements') {
      fetchSettlements(1).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [activeTab, fetchSummary, fetchReconciliations, fetchSettlements]);

  // In-Page Refresh Handler
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchSummary();
      if (activeTab === 'audit' || activeTab === 'disputes') {
        await fetchReconciliations(auditPagination.page);
      } else if (activeTab === 'settlements') {
        await fetchSettlements(settlementPagination.page);
      }
      toast.success('Reconciliation data refreshed');
    } catch {
      toast.error('Refresh failed');
    } finally {
      setRefreshing(false);
    }
  };

  // Import Settlement Batch
  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!importFormData.csvContent.trim()) {
      toast.error('Please paste or upload settlement CSV rows');
      return;
    }
    setImporting(true);
    try {
      const res = await importSettlement(importFormData);
      toast.success(
        `Imported: ${res.totalLines} lines (${res.matchResults?.matchedCount || 0} matched, ${res.matchResults?.discrepancyCount || 0} overcharges flagged)`
      );
      setIsImportModalOpen(false);
      setImportFormData((prev) => ({ ...prev, csvContent: '' }));
      fetchSummary();
      fetchSettlements(1);
      fetchReconciliations(1);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Settlement import failed');
    } finally {
      setImporting(false);
    }
  };

  // Resolve Discrepancy
  const handleResolveSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRec) return;
    setResolvingStatus(true);
    try {
      await resolveDiscrepancy(selectedRec.id, {
        resolutionNotes: resolutionNotes || 'Resolved by finance team.',
        status: 'resolved',
      });
      toast.success(`Discrepancy resolved for Order #${selectedRec.order?.platformOrderId}`);
      setIsDetailDrawerOpen(false);
      fetchSummary();
      fetchReconciliations(auditPagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resolve discrepancy');
    } finally {
      setResolvingStatus(false);
    }
  };

  // Load Preset CSV Template
  const loadPresetCsv = (type) => {
    if (type === 'flipkart') {
      setImportFormData((prev) => ({
        ...prev,
        csvContent: `order_id,sale_amount,commission,fixed_fee,collection_fee,shipping_fee,net_payout
OD-TEST-FLIP-1001,1000.00,120.00,20.00,20.00,60.00,820.00
OD-TEST-FLIP-1002,1500.00,180.00,30.00,30.00,320.00,940.00
OD-TEST-FLIP-1003,2499.00,300.00,45.00,50.00,90.00,2014.00`,
      }));
    } else if (type === 'amazon') {
      setImportFormData((prev) => ({
        ...prev,
        csvContent: `order_id,gross_amount,commission,closing_fee,shipping_fee,net_payout
402-8921841-9218201,1299.00,155.88,25.00,75.00,1043.12
402-8921841-9218202,899.00,107.88,20.00,65.00,706.12
402-8921841-9218203,1999.00,239.88,35.00,210.00,1514.12`,
      }));
    } else {
      setImportFormData((prev) => ({
        ...prev,
        csvContent: `sub_order_no,total_sale_amount,meesho_commission,return_shipping_charge,net_payout
982141098_1,699.00,0.00,0.00,650.00
982141098_2,849.00,0.00,140.00,660.00`,
      }));
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
  const getReconciliationBadge = (status) => {
    const s = (status || 'unsettled').toLowerCase();
    switch (s) {
      case 'matched':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">Matched ✅</span>;
      case 'underpaid':
      case 'discrepancy':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">Overcharged ⚠️</span>;
      case 'overpaid':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">Overpaid 💰</span>;
      case 'resolved':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200">Resolved ⚖️</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-700 border border-gray-200">Unsettled</span>;
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface text-ink overflow-hidden">
      {/* 1. Header Bar */}
      <div className="shrink-0 bg-white border-b border-border px-4 py-2.5 flex items-center justify-between shadow-2xs">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-base font-bold text-ink">Marketplace Financial Reconciliation & Payout Engine</h1>
            <span className="text-[10px] bg-accent-light text-accent-dark px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
              Phase 4
            </span>
          </div>
          <p className="text-[11px] text-gray-500">
            Multi-channel bank settlement ingestion, fee deduction auditing, volumetric weight overcharge detection & claims.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Quick Refresh Button */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="h-7 px-2.5 rounded border border-border bg-white text-gray-700 hover:bg-gray-50 flex items-center space-x-1.5 text-xs font-medium cursor-pointer transition-colors shadow-2xs"
            title="Refresh Financial Data"
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

          {/* Import Settlement Sheet Trigger */}
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="h-7 px-3 rounded bg-accent hover:bg-accent-dark text-white flex items-center space-x-1.5 text-xs font-semibold cursor-pointer shadow-xs transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span>+ Import Settlement Sheet</span>
          </button>
        </div>
      </div>

      {/* 2. Top Metric Cards */}
      <div className="shrink-0 bg-white border-b border-border p-3 grid grid-cols-5 gap-3">
        <div className="bg-gray-50/70 border border-border p-2 rounded">
          <div className="text-[10px] uppercase font-bold text-gray-500">Gross Sales Invoiced</div>
          <div className="text-base font-mono font-bold text-ink">
            ₹{summary.totalGrossInvoiced.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-gray-500 font-medium">Customer order value</div>
        </div>

        <div className="bg-emerald-50/60 border border-emerald-200 p-2 rounded">
          <div className="text-[10px] uppercase font-bold text-emerald-800">Bank Deposits (Net Payout)</div>
          <div className="text-base font-mono font-bold text-emerald-700">
            ₹{summary.totalBankDeposits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-emerald-700 font-medium">Settled to bank account</div>
        </div>

        <div className="bg-gray-50/70 border border-border p-2 rounded">
          <div className="text-[10px] uppercase font-bold text-gray-500">Platform Deductions</div>
          <div className="text-base font-mono font-bold text-ink">
            ₹{summary.totalDeductionsEstimated.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-gray-500 font-medium">Commission, Courier & Taxes</div>
        </div>

        <div className="bg-rose-50/70 border border-rose-200 p-2 rounded">
          <div className="text-[10px] uppercase font-bold text-rose-800">Identified Overcharges</div>
          <div className="text-base font-mono font-bold text-rose-700">
            ₹{summary.totalDiscrepancyAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-rose-700 font-bold">
            {summary.underpaidCount} orders flagged for dispute
          </div>
        </div>

        <div className="bg-indigo-50/60 border border-indigo-200 p-2 rounded">
          <div className="text-[10px] uppercase font-bold text-indigo-800">Reconciliation Health</div>
          <div className="text-base font-mono font-bold text-indigo-700">
            {summary.reconciliationHealthRate}%
          </div>
          <div className="text-[10px] text-indigo-700 font-medium">
            {summary.matchedCount} of {summary.totalOrdersAudited} orders matched
          </div>
        </div>
      </div>

      {/* 3. Tab Bar */}
      <div className="shrink-0 bg-white border-b border-border px-4 flex items-center space-x-6 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={`py-2.5 font-semibold border-b-2 flex items-center space-x-2 transition-colors cursor-pointer ${
            activeTab === 'audit'
              ? 'border-accent text-accent'
              : 'border-transparent text-gray-500 hover:text-ink'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>Order-Level Payout Audit</span>
          <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.2 rounded-full font-bold">
            {auditPagination.total}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('disputes')}
          className={`py-2.5 font-semibold border-b-2 flex items-center space-x-2 transition-colors cursor-pointer ${
            activeTab === 'disputes'
              ? 'border-accent text-accent'
              : 'border-transparent text-gray-500 hover:text-ink'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>Overcharge Recovery & Claims</span>
          <span className="text-[10px] bg-rose-50 text-rose-700 px-1.5 py-0.2 rounded-full font-bold">
            {summary.underpaidCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('settlements')}
          className={`py-2.5 font-semibold border-b-2 flex items-center space-x-2 transition-colors cursor-pointer ${
            activeTab === 'settlements'
              ? 'border-accent text-accent'
              : 'border-transparent text-gray-500 hover:text-ink'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <span>Settlement Batches & Ingestion</span>
          <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.2 rounded-full font-bold">
            {settlementPagination.total}
          </span>
        </button>
      </div>

      {/* 4. Tab Content Area */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
        {/* ======================================================== */}
        {/* TAB 1 & 2: RECONCILIATION AUDIT & DISPUTES */}
        {/* ======================================================== */}
        {(activeTab === 'audit' || activeTab === 'disputes') && (
          <div className="space-y-3">
            <TableToolbar>
              <div className="flex items-center space-x-2">
                <SearchBar
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search Order ID, customer…"
                  className="w-56"
                />

                {activeTab === 'audit' && (
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-7 text-xs px-2 border border-border rounded bg-white text-gray-700"
                  >
                    <option value="all">All Audit Statuses</option>
                    <option value="matched">Matched</option>
                    <option value="underpaid">Overcharged / Short Paid</option>
                    <option value="overpaid">Overpaid</option>
                    <option value="resolved">Resolved</option>
                  </select>
                )}

                <select
                  value={platformFilter}
                  onChange={(e) => setPlatformFilter(e.target.value)}
                  className="h-7 text-xs px-2 border border-border rounded bg-white text-gray-700"
                >
                  <option value="all">All Channels</option>
                  <option value="flipkart">Flipkart</option>
                  <option value="amazon">Amazon</option>
                  <option value="meesho">Meesho</option>
                  <option value="myntra">Myntra</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500">
                  Showing <b>{reconciliations.length}</b> of <b>{auditPagination.total}</b> audited orders
                </span>
              </div>
            </TableToolbar>

            {/* Dense Reconciliations Table */}
            <div className="bg-white border border-border rounded shadow-2xs overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-gray-50 border-b border-border text-gray-600 font-semibold select-none">
                  <tr>
                    <th className="px-2.5 py-2">Order ID & Channel</th>
                    <th className="px-2.5 py-2">Order Date</th>
                    <th className="px-2.5 py-2">Gross Order Value</th>
                    <th className="px-2.5 py-2">Expected Payout</th>
                    <th className="px-2.5 py-2">Actual Bank Payout</th>
                    <th className="px-2.5 py-2">Variance / Discrepancy</th>
                    <th className="px-2.5 py-2">Status</th>
                    <th className="px-2.5 py-2">Audit Diagnosis Reason</th>
                    <th className="px-2.5 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {reconciliations.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="px-4 py-8 text-center text-gray-500">
                        No orders reconciled yet. Click <b>"+ Import Settlement Sheet"</b> to audit marketplace bank payouts!
                      </td>
                    </tr>
                  ) : (
                    reconciliations.map((rec) => {
                      const diff = parseFloat(rec.discrepancyAmount || 0);
                      const isOvercharged = diff > 5.0 && rec.status !== 'resolved';

                      return (
                        <tr key={rec.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="px-2.5 py-2 font-mono font-bold text-ink">
                            <div className="flex items-center space-x-1.5">
                              {renderChannelTag(rec.order?.platform)}
                              <span className="text-ink">{rec.order?.platformOrderId}</span>
                            </div>
                            <div className="text-[10px] text-gray-400 font-normal">
                              {rec.order?.customerName || 'Customer'}
                            </div>
                          </td>

                          <td className="px-2.5 py-2 text-gray-600 text-[11px]">
                            {new Date(rec.order?.orderDate || rec.createdAt).toLocaleDateString()}
                          </td>

                          <td className="px-2.5 py-2 font-mono font-semibold text-ink">
                            ₹{parseFloat(rec.order?.totalAmount || 0).toFixed(2)}
                          </td>

                          <td className="px-2.5 py-2 font-mono font-semibold text-gray-700">
                            ₹{parseFloat(rec.expectedPayout || 0).toFixed(2)}
                          </td>

                          <td className="px-2.5 py-2 font-mono font-bold text-emerald-700">
                            ₹{parseFloat(rec.actualPayout || 0).toFixed(2)}
                          </td>

                          <td className="px-2.5 py-2 font-mono font-bold">
                            {diff === 0 ? (
                              <span className="text-gray-400">₹0.00</span>
                            ) : diff > 0 ? (
                              <span className="text-rose-600 font-bold">+₹{diff.toFixed(2)} short</span>
                            ) : (
                              <span className="text-blue-600 font-bold">-₹{Math.abs(diff).toFixed(2)}</span>
                            )}
                          </td>

                          <td className="px-2.5 py-2">{getReconciliationBadge(rec.status)}</td>

                          <td className="px-2.5 py-2 text-gray-600 max-w-[200px] truncate" title={rec.discrepancyReason}>
                            {rec.discrepancyReason || '—'}
                          </td>

                          <td className="px-2.5 py-2 text-right">
                            <div className="flex items-center justify-end space-x-1">
                              {isOvercharged && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedRec(rec);
                                    setResolutionNotes(rec.resolutionNotes || '');
                                    setIsDetailDrawerOpen(true);
                                  }}
                                  className="h-6 px-2 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-semibold transition-colors cursor-pointer"
                                  title="Raise Dispute Ticket"
                                >
                                  Dispute
                                </button>
                              )}

                              <TableIconButton
                                onClick={() => {
                                  setSelectedRec(rec);
                                  setResolutionNotes(rec.resolutionNotes || '');
                                  setIsDetailDrawerOpen(true);
                                }}
                                title="View Fee Breakdown"
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
        {/* TAB 3: SETTLEMENT BATCHES */}
        {/* ======================================================== */}
        {activeTab === 'settlements' && (
          <div className="space-y-3">
            <div className="bg-white border border-border rounded shadow-2xs overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-gray-50 border-b border-border text-gray-600 font-semibold select-none">
                  <tr>
                    <th className="px-2.5 py-2">Settlement Date</th>
                    <th className="px-2.5 py-2">Platform Account</th>
                    <th className="px-2.5 py-2">Source Type</th>
                    <th className="px-2.5 py-2">Total Lines Processed</th>
                    <th className="px-2.5 py-2">Total Net Deposit</th>
                    <th className="px-2.5 py-2">Imported At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {settlements.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                        No settlement files imported yet. Click <b>"+ Import Settlement Sheet"</b> to ingest marketplace payouts!
                      </td>
                    </tr>
                  ) : (
                    settlements.map((s) => (
                      <tr key={s.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-2.5 py-2 font-mono font-bold text-ink">
                          {s.settlementDate}
                        </td>
                        <td className="px-2.5 py-2">
                          {renderChannelTag(s.platformAccount?.platform)}
                          <span className="ml-1.5 font-medium text-gray-700">
                            {s.platformAccount?.accountName || 'Primary'}
                          </span>
                        </td>
                        <td className="px-2.5 py-2 uppercase text-[10px] text-gray-500 font-bold">
                          {s.sourceType}
                        </td>
                        <td className="px-2.5 py-2 font-semibold text-ink">
                          {(s.lines || []).length} orders
                        </td>
                        <td className="px-2.5 py-2 font-mono font-bold text-emerald-700">
                          ₹{parseFloat(s.totalNetPayout || 0).toFixed(2)}
                        </td>
                        <td className="px-2.5 py-2 text-gray-500 text-[11px]">
                          {new Date(s.importedAt || s.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL: IMPORT SETTLEMENT SHEET */}
      {/* ======================================================== */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-border shadow-xl max-w-xl w-full p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="text-xs font-bold text-ink flex items-center space-x-1.5">
                <span>📥 Import Marketplace Settlement CSV File</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="text-gray-400 hover:text-ink text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleImportSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                    Select Connected Account:
                  </label>
                  <select
                    value={importFormData.platformAccountId}
                    onChange={(e) =>
                      setImportFormData({ ...importFormData, platformAccountId: e.target.value })
                    }
                    className="w-full h-7 px-2 border border-border rounded bg-white text-ink"
                  >
                    {platformAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.accountName} ({acc.platform})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                    Settlement Bank Date:
                  </label>
                  <input
                    type="date"
                    value={importFormData.settlementDate}
                    onChange={(e) =>
                      setImportFormData({ ...importFormData, settlementDate: e.target.value })
                    }
                    className="w-full h-7 px-2 border border-border rounded bg-white text-ink"
                  />
                </div>
              </div>

              {/* Sample Presets */}
              <div className="flex items-center justify-between bg-gray-50 border border-border p-2 rounded">
                <span className="text-[11px] font-medium text-gray-600">Load Sample Template:</span>
                <div className="flex items-center space-x-1.5">
                  <button
                    type="button"
                    onClick={() => loadPresetCsv('flipkart')}
                    className="h-6 px-2 bg-white border border-border rounded text-[10px] font-bold text-amber-700 hover:bg-gray-100 cursor-pointer shadow-2xs"
                  >
                    Flipkart CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => loadPresetCsv('amazon')}
                    className="h-6 px-2 bg-white border border-border rounded text-[10px] font-bold text-orange-700 hover:bg-gray-100 cursor-pointer shadow-2xs"
                  >
                    Amazon MTR
                  </button>
                  <button
                    type="button"
                    onClick={() => loadPresetCsv('meesho')}
                    className="h-6 px-2 bg-white border border-border rounded text-[10px] font-bold text-pink-700 hover:bg-gray-100 cursor-pointer shadow-2xs"
                  >
                    Meesho Payout
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Paste Settlement CSV Content:
                </label>
                <textarea
                  rows="7"
                  value={importFormData.csvContent}
                  onChange={(e) => setImportFormData({ ...importFormData, csvContent: e.target.value })}
                  placeholder="order_id,sale_amount,commission,shipping_fee,net_payout&#10;OD102941,1200,140,60,1000"
                  className="w-full p-2 border border-border rounded font-mono text-[11px] bg-white text-ink"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="h-7 px-3 rounded border border-border text-gray-600 hover:bg-gray-50 text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={importing}
                  className="h-7 px-4 rounded bg-accent hover:bg-accent-dark text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs"
                >
                  {importing ? 'Processing & Auditing…' : 'Run Reconciliation Audit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* DRAWER: FEE BREAKDOWN & DISPUTE RESOLUTION */}
      {/* ======================================================== */}
      {isDetailDrawerOpen && selectedRec && (
        <div className="fixed inset-0 z-50 bg-black/40 flex justify-end">
          <div className="bg-white w-full max-w-md h-full shadow-2xl p-4 flex flex-col justify-between overflow-y-auto space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div>
                  <h3 className="text-sm font-bold text-ink flex items-center space-x-1.5">
                    <span>Order #{selectedRec.order?.platformOrderId}</span>
                    {renderChannelTag(selectedRec.order?.platform)}
                  </h3>
                  <div className="text-[11px] text-gray-500">
                    Customer: {selectedRec.order?.customerName || 'Customer'}
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

              {/* Status and Discrepancy Alert */}
              <div
                className={`p-2.5 rounded border text-xs space-y-1 ${
                  selectedRec.discrepancyAmount > 5
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}
              >
                <div className="font-bold flex items-center justify-between">
                  <span>{getReconciliationBadge(selectedRec.status)}</span>
                  <span className="font-mono text-sm">
                    Variance: ₹{parseFloat(selectedRec.discrepancyAmount || 0).toFixed(2)}
                  </span>
                </div>
                <p className="text-[11px]">
                  <b>Diagnosis:</b> {selectedRec.discrepancyReason || 'Standard reconciliation match.'}
                </p>
              </div>

              {/* Payout Numbers Breakdown */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-gray-500">Gross Invoice Amount:</span>
                  <span className="font-mono font-bold text-ink">
                    ₹{parseFloat(selectedRec.order?.totalAmount || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-gray-500">Expected Net Payout:</span>
                  <span className="font-mono font-bold text-gray-700">
                    ₹{parseFloat(selectedRec.expectedPayout || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-gray-500">Actual Bank Credit:</span>
                  <span className="font-mono font-bold text-emerald-700">
                    ₹{parseFloat(selectedRec.actualPayout || 0).toFixed(2)}
                  </span>
                </div>

                {selectedRec.settlementLine && (
                  <div className="bg-gray-50 p-2 rounded space-y-1 mt-2 text-[11px]">
                    <div className="font-bold text-gray-700">Platform Settlement Line Deductions:</div>
                    <div className="flex justify-between text-gray-600">
                      <span>Commission Fee:</span>
                      <span>₹{parseFloat(selectedRec.settlementLine.commissionFee || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Fixed Fee:</span>
                      <span>₹{parseFloat(selectedRec.settlementLine.fixedFee || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Logistics / Shipping Fee:</span>
                      <span>₹{parseFloat(selectedRec.settlementLine.logisticsFee || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>TCS / TDS Taxes:</span>
                      <span>
                        ₹
                        {(
                          parseFloat(selectedRec.settlementLine.taxTds || 0) +
                          parseFloat(selectedRec.settlementLine.taxTcs || 0)
                        ).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Dispute Resolution Form */}
              <form onSubmit={handleResolveSubmit} className="space-y-2 pt-3 border-t border-border">
                <label className="block text-[11px] font-bold text-gray-700">
                  Auditor Resolution / Dispute Tracking Notes:
                </label>
                <textarea
                  rows="3"
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Record claim ticket #, platform correspondence, or write-off rationale…"
                  className="w-full p-2 border border-border rounded text-xs text-ink bg-white"
                />

                <div className="flex justify-end space-x-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsDetailDrawerOpen(false)}
                    className="h-7 px-3 rounded border border-border text-gray-600 hover:bg-gray-50 text-xs cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={resolvingStatus}
                    className="h-7 px-4 rounded bg-accent hover:bg-accent-dark text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs"
                  >
                    {resolvingStatus ? 'Saving…' : 'Mark as Resolved ⚖️'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
