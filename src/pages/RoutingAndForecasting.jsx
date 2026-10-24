import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import {
  getRoutingRules,
  createRoutingRule,
  updateRoutingRule,
  deleteRoutingRule,
  evaluateRouting,
  getForecastSummary,
  getForecasts,
  recalculateForecasts,
} from '../api/routingAndForecasting.js';
import { getWarehouses } from '../api/inventory.js';
import {
  DataTable,
  TableToolbar,
  SearchBar,
  TableIconButton,
  InfoTooltip,
  StatusBadge,
} from '../components/common';

export default function RoutingAndForecasting() {
  const [activeTab, setActiveTab] = useState('rules'); // 'rules' | 'simulator' | 'forecasts' | 'deadstock'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Common Metadata
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');

  // 1. Routing Rules State
  const [rules, setRules] = useState([]);
  const [rulesPagination, setRulesPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [ruleSearch, setRuleSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState('all');
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [ruleFormData, setRuleFormData] = useState({
    ruleName: '',
    priority: 10,
    destinationWarehouseId: '',
    channel: 'all',
    pincodePrefixes: '',
    states: '',
    minOrderValue: '',
    maxOrderValue: '',
    requireInStock: true,
    allowSplit: false,
    isActive: true,
  });
  const [savingRule, setSavingRule] = useState(false);

  // 2. Routing Simulator State
  const [simForm, setSimForm] = useState({
    platform: 'flipkart',
    shippingPincode: '110001',
    shippingState: 'Delhi',
    totalAmount: '1499.00',
  });
  const [simulating, setSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState(null);

  // 3. Demand Forecasting State
  const [forecasts, setForecasts] = useState([]);
  const [forecastPagination, setForecastPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [forecastSearch, setForecastSearch] = useState('');
  const [healthStatusFilter, setHealthStatusFilter] = useState('all');
  const [summary, setSummary] = useState({
    totalSkus: 0,
    criticalStockouts: 0,
    reorderNeeded: 0,
    healthyCount: 0,
    deadStockCount: 0,
    totalDeadStockValue: 0,
    totalSuggestedUnitsToProcure: 0,
  });
  const [recalculating, setRecalculating] = useState(false);

  // Load Warehouses on Mount
  useEffect(() => {
    async function loadWhs() {
      try {
        const whData = await getWarehouses().catch(() => []);
        const list = whData || [];
        setWarehouses(list);
        if (list.length > 0) {
          setSelectedWarehouseId(list[0].id);
          setRuleFormData((prev) => ({ ...prev, destinationWarehouseId: list[0].id }));
        }
      } catch (err) {
        console.error('Failed to load warehouses:', err);
      }
    }
    loadWhs();
  }, []);

  // Fetch Routing Rules
  const fetchRules = useCallback(
    async (page = 1) => {
      try {
        const data = await getRoutingRules({
          page,
          limit: rulesPagination.limit,
          channel: channelFilter,
        });
        setRules(data.rules || []);
        setRulesPagination({
          page: data.page || 1,
          limit: data.limit || 15,
          total: data.total || 0,
          totalPages: data.totalPages || 1,
        });
      } catch (err) {
        toast.error('Failed to load routing rules');
        console.error(err);
      }
    },
    [rulesPagination.limit, channelFilter]
  );

  // Fetch Forecasting & Summary
  const fetchForecastsData = useCallback(
    async (page = 1) => {
      try {
        const [fData, sData] = await Promise.all([
          getForecasts({
            page,
            limit: forecastPagination.limit,
            healthStatus: activeTab === 'deadstock' ? 'dead_stock' : healthStatusFilter,
            search: forecastSearch,
            warehouseId: selectedWarehouseId || undefined,
          }),
          getForecastSummary({ warehouseId: selectedWarehouseId || undefined }),
        ]);

        setForecasts(fData.forecasts || []);
        setForecastPagination({
          page: fData.page || 1,
          limit: fData.limit || 15,
          total: fData.total || 0,
          totalPages: fData.totalPages || 1,
        });
        setSummary(sData || {});
      } catch (err) {
        toast.error('Failed to load demand forecasting');
        console.error(err);
      }
    },
    [forecastPagination.limit, activeTab, healthStatusFilter, forecastSearch, selectedWarehouseId]
  );

  // Master Tab Switch Trigger
  useEffect(() => {
    setLoading(true);
    if (activeTab === 'rules') {
      fetchRules(1).finally(() => setLoading(false));
    } else if (activeTab === 'forecasts' || activeTab === 'deadstock') {
      fetchForecastsData(1).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [activeTab, fetchRules, fetchForecastsData]);

  // In-Page Refresh Handler
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (activeTab === 'rules') {
        await fetchRules(rulesPagination.page);
      } else if (activeTab === 'forecasts' || activeTab === 'deadstock') {
        await fetchForecastsData(forecastPagination.page);
      }
      toast.success('Data refreshed');
    } catch {
      toast.error('Refresh failed');
    } finally {
      setRefreshing(false);
    }
  };

  // Recalculate ROP Forecasts
  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      await recalculateForecasts({ warehouseId: selectedWarehouseId || undefined });
      toast.success('Demand forecasting & ROP thresholds recalculated!');
      fetchForecastsData(1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to recalculate forecasting');
    } finally {
      setRecalculating(false);
    }
  };

  // Open Create / Edit Rule Modal
  const handleOpenRuleModal = (rule = null) => {
    if (rule) {
      setEditingRule(rule);
      setRuleFormData({
        ruleName: rule.ruleName,
        priority: rule.priority,
        destinationWarehouseId: rule.destinationWarehouseId,
        channel: rule.channel,
        pincodePrefixes: Array.isArray(rule.pincodePrefixes) ? rule.pincodePrefixes.join(', ') : '',
        states: Array.isArray(rule.states) ? rule.states.join(', ') : '',
        minOrderValue: rule.minOrderValue !== null ? rule.minOrderValue : '',
        maxOrderValue: rule.maxOrderValue !== null ? rule.maxOrderValue : '',
        requireInStock: rule.requireInStock,
        allowSplit: rule.allowSplit,
        isActive: rule.isActive,
      });
    } else {
      setEditingRule(null);
      setRuleFormData({
        ruleName: '',
        priority: 10,
        destinationWarehouseId: warehouses[0]?.id || '',
        channel: 'all',
        pincodePrefixes: '',
        states: '',
        minOrderValue: '',
        maxOrderValue: '',
        requireInStock: true,
        allowSplit: false,
        isActive: true,
      });
    }
    setIsRuleModalOpen(true);
  };

  // Save Rule Submit
  const handleRuleSubmit = async (e) => {
    e.preventDefault();
    if (!ruleFormData.ruleName || !ruleFormData.destinationWarehouseId) {
      toast.error('Please enter rule name and select warehouse');
      return;
    }

    setSavingRule(true);
    try {
      const payload = {
        ...ruleFormData,
        pincodePrefixes: ruleFormData.pincodePrefixes
          ? ruleFormData.pincodePrefixes.split(',').map((p) => p.trim()).filter(Boolean)
          : [],
        states: ruleFormData.states
          ? ruleFormData.states.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        minOrderValue: ruleFormData.minOrderValue !== '' ? parseFloat(ruleFormData.minOrderValue) : null,
        maxOrderValue: ruleFormData.maxOrderValue !== '' ? parseFloat(ruleFormData.maxOrderValue) : null,
      };

      if (editingRule) {
        await updateRoutingRule(editingRule.id, payload);
        toast.success(`Routing rule '${payload.ruleName}' updated!`);
      } else {
        await createRoutingRule(payload);
        toast.success(`Routing rule '${payload.ruleName}' created!`);
      }

      setIsRuleModalOpen(false);
      fetchRules(1);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to save routing rule');
    } finally {
      setSavingRule(false);
    }
  };

  // Delete Rule
  const handleDeleteRule = async (ruleId) => {
    if (!confirm('Are you sure you want to delete this routing rule?')) return;
    try {
      await deleteRoutingRule(ruleId);
      toast.success('Routing rule removed');
      fetchRules(rulesPagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete rule');
    }
  };

  // Run Routing Simulation
  const handleRunSimulation = async (e) => {
    e.preventDefault();
    setSimulating(true);
    try {
      const result = await evaluateRouting({
        simulatedOrder: {
          platform: simForm.platform,
          shippingPincode: simForm.shippingPincode,
          shippingState: simForm.shippingState,
          totalAmount: parseFloat(simForm.totalAmount || 0),
        },
      });
      setSimulationResult(result);
      toast.success('Routing simulation executed!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Simulation failed');
    } finally {
      setSimulating(false);
    }
  };

  // Health Status Badge Helper
  const getHealthBadge = (status) => {
    switch (status) {
      case 'critical_stockout':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            🚨 Critical (&le;7d)
          </span>
        );
      case 'reorder_needed':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            ⚠️ Reorder Needed
          </span>
        );
      case 'dead_stock':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            💤 Dead Stock
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            ✅ Healthy
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface text-ink overflow-hidden">
      {/* 1. Header Bar */}
      <div className="shrink-0 bg-white border-b border-border px-4 py-2.5 flex items-center justify-between shadow-2xs">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-base font-bold text-ink">Smart Order Routing & Demand Forecasting</h1>
            <span className="text-[10px] bg-accent-light text-accent-dark px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
              Phase 5
            </span>
          </div>
          <p className="text-[11px] text-gray-500">
            Pincode proximity allocation, live stock guards, sales velocity run rates, and automated Reorder Points (ROP).
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Quick Refresh */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="h-7 px-2.5 rounded border border-border bg-white text-gray-700 hover:bg-gray-50 flex items-center space-x-1.5 text-xs font-medium cursor-pointer transition-colors shadow-2xs"
            title="Refresh Data"
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

          {/* Recalculate Forecasting */}
          <button
            type="button"
            onClick={handleRecalculate}
            disabled={recalculating}
            className="h-7 px-3 rounded border border-border bg-white hover:bg-gray-50 text-ink flex items-center space-x-1.5 text-xs font-semibold cursor-pointer shadow-2xs transition-colors"
          >
            <svg className={`w-3.5 h-3.5 ${recalculating ? 'animate-spin text-accent' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span>{recalculating ? 'Calculating…' : 'Recalculate ROP'}</span>
          </button>

          {/* New Rule Modal Trigger */}
          <button
            type="button"
            onClick={() => handleOpenRuleModal()}
            className="h-7 px-3 rounded bg-accent hover:bg-accent-dark text-white flex items-center space-x-1.5 text-xs font-semibold cursor-pointer shadow-xs transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>+ New Routing Rule</span>
          </button>
        </div>
      </div>

      {/* 2. Top Metric Cards */}
      <div className="shrink-0 bg-white border-b border-border p-3 grid grid-cols-5 gap-3">
        <div className="bg-gray-50/70 border border-border p-2 rounded">
          <div className="text-[10px] uppercase font-bold text-gray-500">Active Routing Rules</div>
          <div className="text-base font-mono font-bold text-ink">{rulesPagination.total} rules</div>
          <div className="text-[10px] text-gray-500 font-medium">Multi-hub geo priority</div>
        </div>

        <div className="bg-rose-50/70 border border-rose-200 p-2 rounded">
          <div className="text-[10px] uppercase font-bold text-rose-800">Critical Stockouts (&le;7d)</div>
          <div className="text-base font-mono font-bold text-rose-700">{summary.criticalStockouts} SKUs</div>
          <div className="text-[10px] text-rose-700 font-bold">Imminent stockout warning</div>
        </div>

        <div className="bg-amber-50/70 border border-amber-200 p-2 rounded">
          <div className="text-[10px] uppercase font-bold text-amber-800">Reorder Point Breaches</div>
          <div className="text-base font-mono font-bold text-amber-700">{summary.reorderNeeded} SKUs</div>
          <div className="text-[10px] text-amber-700 font-medium">
            Suggested PO: {summary.totalSuggestedUnitsToProcure} units
          </div>
        </div>

        <div className="bg-emerald-50/70 border border-emerald-200 p-2 rounded">
          <div className="text-[10px] uppercase font-bold text-emerald-800">Healthy Buffer SKUs</div>
          <div className="text-base font-mono font-bold text-emerald-700">{summary.healthyCount} SKUs</div>
          <div className="text-[10px] text-emerald-700 font-medium">15 - 45 days DOI runway</div>
        </div>

        <div className="bg-purple-50/70 border border-purple-200 p-2 rounded">
          <div className="text-[10px] uppercase font-bold text-purple-800">Dead Stock Capital Locked</div>
          <div className="text-base font-mono font-bold text-purple-700">
            ₹{summary.totalDeadStockValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-purple-700 font-medium">{summary.deadStockCount} dormant SKUs</div>
        </div>
      </div>

      {/* 3. Tab Bar */}
      <div className="shrink-0 bg-white border-b border-border px-4 flex items-center space-x-6 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('rules')}
          className={`py-2.5 font-semibold border-b-2 flex items-center space-x-2 transition-colors cursor-pointer ${
            activeTab === 'rules'
              ? 'border-accent text-accent'
              : 'border-transparent text-gray-500 hover:text-ink'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span>Order Routing Rules</span>
          <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.2 rounded-full font-bold">
            {rulesPagination.total}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('simulator')}
          className={`py-2.5 font-semibold border-b-2 flex items-center space-x-2 transition-colors cursor-pointer ${
            activeTab === 'simulator'
              ? 'border-accent text-accent'
              : 'border-transparent text-gray-500 hover:text-ink'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <span>Routing Decision Simulator</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('forecasts')}
          className={`py-2.5 font-semibold border-b-2 flex items-center space-x-2 transition-colors cursor-pointer ${
            activeTab === 'forecasts'
              ? 'border-accent text-accent'
              : 'border-transparent text-gray-500 hover:text-ink'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
          <span>Demand Forecasts & Reorder Points</span>
          <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.2 rounded-full font-bold">
            {summary.totalSkus}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('deadstock')}
          className={`py-2.5 font-semibold border-b-2 flex items-center space-x-2 transition-colors cursor-pointer ${
            activeTab === 'deadstock'
              ? 'border-accent text-accent'
              : 'border-transparent text-gray-500 hover:text-ink'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <span>Dead-Stock Liquidation</span>
          <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.2 rounded-full font-bold">
            {summary.deadStockCount}
          </span>
        </button>
      </div>

      {/* 4. Tab Body Area */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
        {/* ======================================================== */}
        {/* TAB 1: ORDER ROUTING RULES */}
        {/* ======================================================== */}
        {activeTab === 'rules' && (
          <div className="space-y-3">
            <TableToolbar>
              <div className="flex items-center space-x-2">
                <SearchBar
                  value={ruleSearch}
                  onChange={(e) => setRuleSearch(e.target.value)}
                  placeholder="Filter rules…"
                  className="w-56"
                />

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
                  <option value="direct">Direct / Shopify</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500">
                  Evaluated in priority order (1 = Highest Priority)
                </span>
              </div>
            </TableToolbar>

            {/* Dense Routing Rules Table */}
            <div className="bg-white border border-border rounded shadow-2xs overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-gray-50 border-b border-border text-gray-600 font-semibold select-none">
                  <tr>
                    <th className="px-2.5 py-2 w-16 text-center">Priority</th>
                    <th className="px-2.5 py-2">Rule Name</th>
                    <th className="px-2.5 py-2">Destination Hub</th>
                    <th className="px-2.5 py-2">Channel</th>
                    <th className="px-2.5 py-2">Pincode Prefixes</th>
                    <th className="px-2.5 py-2">Target States</th>
                    <th className="px-2.5 py-2">Stock Guard</th>
                    <th className="px-2.5 py-2">Status</th>
                    <th className="px-2.5 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {rules.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="px-4 py-8 text-center text-gray-500">
                        No custom routing rules yet. Click <b>"+ New Routing Rule"</b> to configure smart regional order distribution!
                      </td>
                    </tr>
                  ) : (
                    rules.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-2.5 py-2 text-center font-bold text-ink">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-accent-light text-accent-dark font-mono text-xs">
                            #{r.priority}
                          </span>
                        </td>

                        <td className="px-2.5 py-2 font-bold text-ink">
                          {r.ruleName}
                          {r.minOrderValue && (
                            <div className="text-[10px] text-gray-400 font-normal">
                              Min: ₹{r.minOrderValue}
                            </div>
                          )}
                        </td>

                        <td className="px-2.5 py-2 font-semibold text-gray-800">
                          {r.destinationWarehouse?.name || 'Assigned Warehouse'}
                        </td>

                        <td className="px-2.5 py-2 uppercase font-mono text-[10px] font-semibold text-gray-600">
                          {r.channel}
                        </td>

                        <td className="px-2.5 py-2 font-mono text-gray-600 text-[11px] max-w-[150px] truncate" title={JSON.stringify(r.pincodePrefixes)}>
                          {(r.pincodePrefixes || []).length > 0
                            ? (r.pincodePrefixes || []).join(', ')
                            : 'All Pincodes'}
                        </td>

                        <td className="px-2.5 py-2 text-gray-600 text-[11px] max-w-[150px] truncate" title={JSON.stringify(r.states)}>
                          {(r.states || []).length > 0 ? (r.states || []).join(', ') : 'All States'}
                        </td>

                        <td className="px-2.5 py-2">
                          {r.requireInStock ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              In-Stock Only
                            </span>
                          ) : (
                            <span className="text-gray-400 text-[11px]">Ignore</span>
                          )}
                        </td>

                        <td className="px-2.5 py-2">
                          {r.isActive ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500">
                              Disabled
                            </span>
                          )}
                        </td>

                        <td className="px-2.5 py-2 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              type="button"
                              onClick={() => handleOpenRuleModal(r)}
                              className="h-6 px-2 rounded bg-gray-100 hover:bg-gray-200 text-ink text-[11px] font-semibold transition-colors cursor-pointer"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteRule(r.id)}
                              className="h-6 px-2 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-semibold transition-colors cursor-pointer"
                            >
                              Delete
                            </button>
                          </div>
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
        {/* TAB 2: ROUTING DECISION SIMULATOR */}
        {/* ======================================================== */}
        {activeTab === 'simulator' && (
          <div className="grid grid-cols-3 gap-3">
            {/* Input Form */}
            <div className="bg-white border border-border rounded p-4 space-y-3 shadow-2xs">
              <div className="border-b border-border pb-2">
                <h3 className="text-xs font-bold text-ink flex items-center space-x-1.5">
                  <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <span>Order Allocation Simulator</span>
                </h3>
                <p className="text-[11px] text-gray-500">
                  Simulate an incoming buyer order to test rule triggers and warehouse allocation decisions.
                </p>
              </div>

              <form onSubmit={handleRunSimulation} className="space-y-2.5 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                    Marketplace Channel:
                  </label>
                  <select
                    value={simForm.platform}
                    onChange={(e) => setSimForm({ ...simForm, platform: e.target.value })}
                    className="w-full h-7 px-2 border border-border rounded bg-white text-ink"
                  >
                    <option value="flipkart">Flipkart</option>
                    <option value="amazon">Amazon</option>
                    <option value="meesho">Meesho</option>
                    <option value="myntra">Myntra</option>
                    <option value="direct">Direct Website</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                      Buyer Delivery Pincode:
                    </label>
                    <input
                      type="text"
                      value={simForm.shippingPincode}
                      onChange={(e) => setSimForm({ ...simForm, shippingPincode: e.target.value })}
                      className="w-full h-7 px-2 border border-border rounded font-mono font-bold bg-white text-ink"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                      Buyer State:
                    </label>
                    <input
                      type="text"
                      value={simForm.shippingState}
                      onChange={(e) => setSimForm({ ...simForm, shippingState: e.target.value })}
                      className="w-full h-7 px-2 border border-border rounded bg-white text-ink"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                    Order Total Value (₹):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={simForm.totalAmount}
                    onChange={(e) => setSimForm({ ...simForm, totalAmount: e.target.value })}
                    className="w-full h-7 px-2 border border-border rounded font-mono bg-white text-ink font-bold"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={simulating}
                  className="w-full h-8 rounded bg-accent hover:bg-accent-dark text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs mt-2"
                >
                  {simulating ? 'Evaluating Rules…' : 'Run Allocation Test ⚡'}
                </button>
              </form>
            </div>

            {/* Results Output */}
            <div className="col-span-2 bg-white border border-border rounded p-4 space-y-3 shadow-2xs">
              <div className="border-b border-border pb-2 flex items-center justify-between">
                <h3 className="text-xs font-bold text-ink">Evaluation Engine Decision Output</h3>
                {simulationResult && (
                  <span className="text-[11px] font-mono text-emerald-700 font-bold">
                    Confidence: {simulationResult.confidenceScore}%
                  </span>
                )}
              </div>

              {!simulationResult ? (
                <div className="text-center py-16 text-gray-400 text-xs">
                  Fill in order delivery details on the left and click <b>"Run Allocation Test"</b> to simulate routing!
                </div>
              ) : (
                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded border bg-emerald-50/70 border-emerald-200 text-emerald-900 space-y-1.5">
                    <div className="text-xs uppercase font-bold text-emerald-700">
                      🎯 Designated Fulfillment Hub:
                    </div>
                    <div className="text-base font-bold text-ink flex items-center space-x-2">
                      <span>{simulationResult.warehouseName}</span>
                      <span className="text-[11px] bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded font-mono">
                        {simulationResult.routingType}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-700 pt-1">
                      {simulationResult.reason}
                    </p>
                  </div>

                  {simulationResult.ruleName && (
                    <div className="bg-gray-50 border border-border rounded p-2.5 space-y-1">
                      <div className="font-bold text-gray-700">Triggered Routing Rule:</div>
                      <div className="text-xs text-ink">{simulationResult.ruleName}</div>
                    </div>
                  )}

                  <div className="bg-blue-50 border border-blue-200 rounded p-2.5 text-[11px] text-blue-800 space-y-1">
                    <div className="font-bold">Next Operational Step:</div>
                    <p>
                      Orders routed to <b>{simulationResult.warehouseName}</b> will automatically lock stock reservations at that facility and queue into its Wave Picking Batch in Phase 2 WMS Lite.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3 & 4: DEMAND FORECASTING & DEAD STOCK */}
        {/* ======================================================== */}
        {(activeTab === 'forecasts' || activeTab === 'deadstock') && (
          <div className="space-y-3">
            <TableToolbar>
              <div className="flex items-center space-x-2">
                <SearchBar
                  value={forecastSearch}
                  onChange={(e) => setForecastSearch(e.target.value)}
                  placeholder="Search SKU, title…"
                  className="w-56"
                />

                {activeTab === 'forecasts' && (
                  <select
                    value={healthStatusFilter}
                    onChange={(e) => setHealthStatusFilter(e.target.value)}
                    className="h-7 text-xs px-2 border border-border rounded bg-white text-gray-700"
                  >
                    <option value="all">All Health Categories</option>
                    <option value="critical_stockout">Critical (&le;7d Runway)</option>
                    <option value="reorder_needed">Reorder Needed (ROP Breach)</option>
                    <option value="healthy">Healthy Buffer</option>
                    <option value="dead_stock">Dead Stock (0 Sales)</option>
                  </select>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500">
                  Showing <b>{forecasts.length}</b> of <b>{forecastPagination.total}</b> analyzed SKUs
                </span>
              </div>
            </TableToolbar>

            {/* Dense Demand Forecast Table */}
            <div className="bg-white border border-border rounded shadow-2xs overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-gray-50 border-b border-border text-gray-600 font-semibold select-none">
                  <tr>
                    <th className="px-2.5 py-2">Product SKU & Title</th>
                    <th className="px-2.5 py-2">Daily Velocity</th>
                    <th className="px-2.5 py-2">30d / 7d Sales</th>
                    <th className="px-2.5 py-2">Available Stock</th>
                    <th className="px-2.5 py-2">Stock Runway (DOI)</th>
                    <th className="px-2.5 py-2">Safety Buffer</th>
                    <th className="px-2.5 py-2">Reorder Point (ROP)</th>
                    <th className="px-2.5 py-2">Suggested PO Qty</th>
                    <th className="px-2.5 py-2">Health Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {forecasts.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="px-4 py-8 text-center text-gray-500">
                        No forecasting data available. Click <b>"Recalculate ROP"</b> to compute stock velocity!
                      </td>
                    </tr>
                  ) : (
                    forecasts.map((f) => {
                      const runway = parseFloat(f.daysOfInventory || 0);
                      const isStockoutRisk = runway <= 7 && f.dailyVelocity > 0;

                      return (
                        <tr key={f.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="px-2.5 py-2 font-mono font-bold text-ink">
                            <div>{f.product?.internalSku}</div>
                            <div className="text-[10px] text-gray-400 font-normal truncate max-w-[200px]" title={f.product?.title}>
                              {f.product?.title}
                            </div>
                          </td>

                          <td className="px-2.5 py-2 font-mono font-semibold text-ink">
                            {parseFloat(f.dailyVelocity || 0).toFixed(2)} /day
                          </td>

                          <td className="px-2.5 py-2 text-gray-600">
                            <b>{f.sales30d}</b> (30d) / <span className="text-gray-500">{f.sales7d} (7d)</span>
                          </td>

                          <td className="px-2.5 py-2 font-mono font-bold text-ink">
                            {f.currentAvailable} units
                          </td>

                          <td className="px-2.5 py-2 font-mono font-bold">
                            {runway >= 999 ? (
                              <span className="text-purple-600">Dormant</span>
                            ) : isStockoutRisk ? (
                              <span className="text-rose-600 font-bold">{runway} days ⚠️</span>
                            ) : (
                              <span className="text-emerald-700">{runway} days</span>
                            )}
                          </td>

                          <td className="px-2.5 py-2 text-gray-500">
                            {f.safetyStock} units
                          </td>

                          <td className="px-2.5 py-2 font-mono font-semibold text-amber-700">
                            {f.reorderPoint} units
                          </td>

                          <td className="px-2.5 py-2 font-mono font-bold">
                            {f.suggestedReorderQty > 0 ? (
                              <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                +{f.suggestedReorderQty} units
                              </span>
                            ) : (
                              <span className="text-gray-400">0</span>
                            )}
                          </td>

                          <td className="px-2.5 py-2">{getHealthBadge(f.healthStatus)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL: CREATE / EDIT ROUTING RULE */}
      {/* ======================================================== */}
      {isRuleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-border shadow-xl max-w-lg w-full p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="text-xs font-bold text-ink">
                {editingRule ? `Edit Rule: ${editingRule.ruleName}` : 'Create Smart Routing Rule'}
              </h3>
              <button
                type="button"
                onClick={() => setIsRuleModalOpen(false)}
                className="text-gray-400 hover:text-ink text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRuleSubmit} className="space-y-2.5 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">Rule Name:</label>
                  <input
                    type="text"
                    value={ruleFormData.ruleName}
                    onChange={(e) => setRuleFormData({ ...ruleFormData, ruleName: e.target.value })}
                    placeholder="e.g. North Zone Pincodes to Delhi Hub"
                    className="w-full h-7 px-2 border border-border rounded bg-white text-ink font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">Priority Rank:</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={ruleFormData.priority}
                    onChange={(e) => setRuleFormData({ ...ruleFormData, priority: parseInt(e.target.value, 10) || 1 })}
                    className="w-full h-7 px-2 border border-border rounded font-bold text-center bg-white text-ink"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                    Destination Fulfillment Hub:
                  </label>
                  <select
                    value={ruleFormData.destinationWarehouseId}
                    onChange={(e) =>
                      setRuleFormData({ ...ruleFormData, destinationWarehouseId: e.target.value })
                    }
                    className="w-full h-7 px-2 border border-border rounded bg-white text-ink"
                  >
                    {warehouses.map((wh) => (
                      <option key={wh.id} value={wh.id}>
                        {wh.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                    Applicable Marketplace Channel:
                  </label>
                  <select
                    value={ruleFormData.channel}
                    onChange={(e) => setRuleFormData({ ...ruleFormData, channel: e.target.value })}
                    className="w-full h-7 px-2 border border-border rounded bg-white text-ink"
                  >
                    <option value="all">All Channels</option>
                    <option value="flipkart">Flipkart</option>
                    <option value="amazon">Amazon</option>
                    <option value="meesho">Meesho</option>
                    <option value="myntra">Myntra</option>
                    <option value="direct">Direct / Website</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Pincode Prefixes (comma separated):
                </label>
                <input
                  type="text"
                  value={ruleFormData.pincodePrefixes}
                  onChange={(e) => setRuleFormData({ ...ruleFormData, pincodePrefixes: e.target.value })}
                  placeholder="e.g. 110, 121, 122, 201 (leave empty for any pincode)"
                  className="w-full h-7 px-2 border border-border rounded font-mono text-[11px] bg-white text-ink"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Target States (comma separated):
                </label>
                <input
                  type="text"
                  value={ruleFormData.states}
                  onChange={(e) => setRuleFormData({ ...ruleFormData, states: e.target.value })}
                  placeholder="e.g. Delhi, Haryana, Uttar Pradesh"
                  className="w-full h-7 px-2 border border-border rounded text-[11px] bg-white text-ink"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">Min Order Value (₹):</label>
                  <input
                    type="number"
                    value={ruleFormData.minOrderValue}
                    onChange={(e) => setRuleFormData({ ...ruleFormData, minOrderValue: e.target.value })}
                    placeholder="Optional minimum"
                    className="w-full h-7 px-2 border border-border rounded font-mono bg-white text-ink"
                  />
                </div>

                <div className="pt-5 flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="requireInStock"
                    checked={ruleFormData.requireInStock}
                    onChange={(e) => setRuleFormData({ ...ruleFormData, requireInStock: e.target.checked })}
                    className="w-4 h-4 text-accent rounded"
                  />
                  <label htmlFor="requireInStock" className="text-[11px] font-medium text-gray-700 cursor-pointer">
                    Require 100% Stock in Hub
                  </label>
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsRuleModalOpen(false)}
                  className="h-7 px-3 rounded border border-border text-gray-600 hover:bg-gray-50 text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingRule}
                  className="h-7 px-4 rounded bg-accent hover:bg-accent-dark text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs"
                >
                  {savingRule ? 'Saving…' : editingRule ? 'Update Rule' : 'Create Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
