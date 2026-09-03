import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { getOrders, importOrdersCsv } from '../api/orders.js';
import { getPlatformAccounts } from '../api/platformAccounts.js';
import IndiaMapModal from '../components/IndiaMapModal.jsx';
import CustomDropdown from '../components/CustomDropdown.jsx';
import DateRangeFilter from '../components/DateRangeFilter.jsx';




export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [connectedPlatforms, setConnectedPlatforms] = useState([]);
  const [metrics, setMetrics] = useState({
    totalOrders: 0,
    deliveredOrders: 0,
    returnedOrders: 0,
    cancelledOrders: 0,
    pendingDispatch: 0,
    totalSales: 0,
    platformMetrics: [],
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [datePreset, setDatePreset] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modal States
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isIndiaMapModalOpen, setIsIndiaMapModalOpen] = useState(false);
  const [importPlatform, setImportPlatform] = useState('auto');
  const [selectedFile, setSelectedFile] = useState(null);
  const [detectedPlatform, setDetectedPlatform] = useState(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  // Load connected platform accounts for the user's company
  useEffect(() => {
    async function loadConnectedPlatforms() {
      try {
        const accounts = await getPlatformAccounts();
        if (accounts && Array.isArray(accounts) && accounts.length > 0) {
          setConnectedPlatforms(accounts.map((a) => (a.platform || '').toLowerCase()));
        }
      } catch (err) {
        // Non-fatal fallback
      }
    }
    loadConnectedPlatforms();
  }, []);

  function applyDatePreset(preset) {
    setDatePreset(preset);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === '7days') {
      const past = new Date();
      past.setDate(past.getDate() - 7);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === '30days') {
      const past = new Date();
      past.setDate(past.getDate() - 30);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === 'thisMonth') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(todayStr);
    }
  }

  async function fetchOrders(
    page = pagination.page,
    platform = platformFilter,
    status = statusFilter,
    query = search,
    start = startDate,
    end = endDate,
    pageLimit = pagination.limit
  ) {
    setLoading(true);
    try {
      const data = await getOrders({
        page,
        limit: pageLimit,
        platform,
        status,
        search: query,
        startDate: start || undefined,
        endDate: end || undefined,
      });
      setOrders(data.orders || []);
      setPagination(data.pagination || { page: 1, limit: pageLimit, total: 0, totalPages: 1 });
      if (data.metrics) {
        setMetrics(data.metrics);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load orders.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchOrders(1, platformFilter, statusFilter, search, startDate, endDate);
  }, [platformFilter, statusFilter, search, startDate, endDate]);

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.csv')) {
        toast.error('Please select a valid .csv file.');
        return;
      }
      setSelectedFile(file);
      setDetectedPlatform(null);

      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result || '';
        const firstLine = text.split(/[\r\n]+/)[0]?.toLowerCase() || '';
        if (firstLine.includes('fsn') || firstLine.includes('order item id') || firstLine.includes('dispatch after date')) {
          setDetectedPlatform('Flipkart');
        } else if (
          firstLine.includes('sub order no') ||
          firstLine.includes('sub-order no') ||
          firstLine.includes('supplier sku') ||
          firstLine.includes('reason for credit entry')
        ) {
          setDetectedPlatform('Meesho');
        } else if (firstLine.includes('amazon-order-id') || firstLine.includes('asin')) {
          setDetectedPlatform('Amazon');
        } else if (firstLine.includes('release order code') || firstLine.includes('vendor sku')) {
          setDetectedPlatform('Myntra');
        } else {
          setDetectedPlatform('Generic CSV');
        }
      };
      reader.readAsText(file.slice(0, 4096));
    }
  }

  async function handleImportSubmit(e) {
    e.preventDefault();
    if (!selectedFile) {
      toast.error('Please select a CSV file to import.');
      return;
    }

    setImporting(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('platform', importPlatform);

    try {
      const result = await importOrdersCsv(formData);
      toast.success(
        `Imported ${result.ordersCreated} new orders (${result.itemsImported} items). ${result.ordersUpdated} updated.`
      );
      setIsImportModalOpen(false);
      setSelectedFile(null);
      fetchOrders(1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to import CSV file.');
    } finally {
      setImporting(false);
    }
  }

  function getStatusBadge(status) {
    switch (status) {
      case 'delivered':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'returned':
      case 'rto_initiated':
      case 'rto_delivered':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'cancelled':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'exchanged':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'shipped':
      case 'out_for_delivery':
      case 'packed':
      case 'accepted':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  }

  const allPlatformsConfig = [
    {
      id: 'flipkart',
      name: 'Flipkart',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      badgeColor: 'text-blue-700',
      icon: (
        <span className="font-extrabold text-[11px] text-[#2874F0]">FK</span>
      ),
    },
    {
      id: 'meesho',
      name: 'Meesho',
      bgColor: 'bg-fuchsia-50',
      borderColor: 'border-fuchsia-200',
      badgeColor: 'text-fuchsia-700',
      icon: (
        <span className="font-extrabold text-[11px] text-[#9C27B0]">MS</span>
      ),
    },
    {
      id: 'amazon',
      name: 'Amazon',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      badgeColor: 'text-amber-800',
      icon: (
        <span className="font-extrabold text-[11px] text-[#E67A00]">AZ</span>
      ),
    },
    {
      id: 'myntra',
      name: 'Myntra',
      bgColor: 'bg-rose-50',
      borderColor: 'border-rose-200',
      badgeColor: 'text-rose-700',
      icon: (
        <span className="font-extrabold text-[11px] text-[#FF3F6C]">MY</span>
      ),
    },
  ];

  const platformMetricsList = metrics.platformMetrics || [];

  // Filter platforms: ONLY show platforms the user selected in the Platforms screen
  const activePlatforms = allPlatformsConfig.filter((p) => {
    if (connectedPlatforms.length > 0) {
      return connectedPlatforms.includes(p.id);
    }
    // If none configured in DB yet, show platforms with orders
    const pStat = platformMetricsList.find((m) => m.platform === p.id);
    return pStat && pStat.totalOrders > 0;
  });

  const totalReturnsAndCancelled = (metrics.returnedOrders || 0) + (metrics.cancelledOrders || 0);
  const totalReturnAndCancelRate =
    metrics.totalOrders > 0 ? ((totalReturnsAndCancelled / metrics.totalOrders) * 100).toFixed(1) : '0';

  const channelOptions = [
    { value: 'all', label: 'All Channels' },
    ...activePlatforms.map((p) => ({
      value: p.id,
      label: p.name,
      icon: p.icon,
    })),
  ];

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'delivered', label: 'Delivered', badge: 'Complete' },
    { value: 'returns_and_cancelled', label: 'Returns & Cancelled', badge: 'Combined' },
    { value: 'returned', label: 'Returns / RTO' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'exchanged', label: 'Exchanged' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'placed', label: 'Placed' },
  ];

  const datePresetOptions = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: '7days', label: 'Last 7 Days' },
    { value: '30days', label: 'Last 30 Days' },
    { value: 'thisMonth', label: 'This Month' },
    { value: 'custom', label: 'Custom Range' },
  ];

  const pageSizeOptions = [
    { value: 5, label: '5 rows' },
    { value: 10, label: '10 rows' },
    { value: 15, label: '15 rows' },
    { value: 20, label: '20 rows' },
    { value: 25, label: '25 rows' },
    { value: 50, label: '50 rows' },
    { value: 100, label: '100 rows' },
  ];


  return (
    <div className="p-4 md:p-5 font-sans space-y-3.5 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-ink tracking-tight">Orders Management</h1>
          <p className="text-[11px] text-gray-500">
            Real-time unified order sync, platform performance analytics, and multi-channel imports
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsIndiaMapModalOpen(true)}
            className="h-9 px-3.5 text-xs font-semibold bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-ink hover:border-gray-400 rounded-lg transition-all flex items-center space-x-2 shadow-2xs group"
          >
            <svg className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <span>State Heatmap</span>
          </button>

          <button
            onClick={() => {
              setSelectedFile(null);
              setIsImportModalOpen(true);
            }}
            className="h-9 px-4 text-xs font-semibold bg-ink text-white hover:bg-black rounded-lg transition-colors flex items-center space-x-2 shadow-xs"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span>Import Orders CSV</span>
          </button>
        </div>
      </div>

      {/* Top High-Level Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-border rounded-xl p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Total Orders</p>
            <h3 className="text-xl font-bold text-ink mt-0.5">{metrics.totalOrders}</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">₹{parseFloat(metrics.totalSales || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })} GMV</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-accent-light text-accent border border-accent/20 flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
        </div>

        <div className="bg-white border border-border rounded-xl p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Delivered</p>
            <h3 className="text-xl font-bold text-emerald-600 mt-0.5">{metrics.deliveredOrders}</h3>
            <p className="text-[10px] text-emerald-600 font-medium mt-0.5">
              {metrics.totalOrders > 0 ? `${((metrics.deliveredOrders / metrics.totalOrders) * 100).toFixed(0)}% fulfillment` : '0%'}
            </p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        {/* Returns & Cancellations Combined Card */}
        <div className="bg-white border border-border rounded-xl p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Returns & Cancelled</p>
            <div className="flex items-baseline space-x-1.5 mt-0.5">
              <h3 className="text-xl font-bold text-rose-600">{totalReturnsAndCancelled}</h3>
              <span className="text-[11px] text-rose-500 font-semibold">({totalReturnAndCancelRate}%)</span>
            </div>
            <p className="text-[10px] text-gray-500 mt-0.5 space-x-1">
              <span className="text-rose-600 font-medium">{metrics.returnedOrders || 0} RTO</span>
              <span>&bull;</span>
              <span className="text-red-500 font-medium">{metrics.cancelledOrders || 0} Cancel</span>
            </p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </div>
        </div>

        <div className="bg-white border border-border rounded-xl p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Pending Dispatch</p>
            <h3 className="text-xl font-bold text-amber-600 mt-0.5">{metrics.pendingDispatch}</h3>
            <p className="text-[10px] text-amber-600 font-medium mt-0.5">Active pipeline</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Platform-Wise Performance Breakdown Section (ONLY for Selected Platforms) */}
      {activePlatforms.length > 0 && (
        <div className="bg-white border border-border rounded-xl p-3.5 shadow-xs space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-border pb-2.5">
            <div>
              <h3 className="text-xs font-bold text-ink flex items-center space-x-1.5">
                <span>Platform-wise Performance & Returns</span>
                <span className="text-[9px] bg-accent-light text-accent px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider">
                  Live Analytics
                </span>
              </h3>
              <p className="text-[11px] text-gray-400">
                Breakdown of orders, fulfillment, returns, and cancellations for your connected sales channels
              </p>
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={() => setPlatformFilter('all')}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                  platformFilter === 'all'
                    ? 'bg-ink text-white shadow-xs'
                    : 'text-gray-500 hover:text-ink hover:bg-gray-100'
                }`}
              >
                All Selected
              </button>
              {activePlatforms.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPlatformFilter(p.id)}
                  className={`px-2 py-1 text-xs rounded-md font-medium transition-all capitalize ${
                    platformFilter === p.id
                      ? 'bg-ink text-white shadow-xs'
                      : 'text-gray-500 hover:text-ink hover:bg-gray-100'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Platform Cards Grid - Dynamically Sized for Selected Platforms Only */}
          <div
            className={`grid grid-cols-1 ${
              activePlatforms.length === 1
                ? 'max-w-md'
                : activePlatforms.length === 2
                ? 'md:grid-cols-2'
                : activePlatforms.length === 3
                ? 'md:grid-cols-3'
                : 'md:grid-cols-2 lg:grid-cols-4'
            } gap-3 pt-0.5`}
          >
            {activePlatforms.map((cfg) => {
              const pStat = platformMetricsList.find((m) => m.platform === cfg.id) || {
                totalOrders: 0,
                totalSales: 0,
                deliveredOrders: 0,
                returnedOrders: 0,
                cancelledOrders: 0,
                pendingDispatch: 0,
                fulfillmentRate: 0,
                returnRate: 0,
                cancelledRate: 0,
              };

              const isSelected = platformFilter === cfg.id;

              return (
                <div
                  key={cfg.id}
                  onClick={() => setPlatformFilter(isSelected ? 'all' : cfg.id)}
                  className={`border rounded-lg p-3 cursor-pointer transition-all hover:shadow-xs ${
                    isSelected
                      ? 'border-accent ring-1.5 ring-accent/30 bg-accent/5'
                      : 'border-border bg-white hover:border-gray-300'
                  }`}
                >
                  {/* Platform Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-1.5">
                      <div className={`w-6 h-6 rounded-md ${cfg.bgColor} border ${cfg.borderColor} flex items-center justify-center`}>
                        {cfg.icon}
                      </div>
                      <span className="font-bold text-xs text-ink">{cfg.name}</span>
                    </div>

                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${cfg.bgColor} ${cfg.borderColor} ${cfg.badgeColor}`}>
                      {pStat.totalOrders} {pStat.totalOrders === 1 ? 'order' : 'orders'}
                    </span>
                  </div>

                  {/* Sales & Orders Stat */}
                  <div className="space-y-1.5 mb-2">
                    <div className="flex items-baseline justify-between text-[11px]">
                      <span className="text-gray-500">Gross Sales</span>
                      <span className="font-bold text-ink">
                        ₹{parseFloat(pStat.totalSales || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </span>
                    </div>

                    {/* Fulfillment Progress Bar */}
                    <div>
                      <div className="flex items-center justify-between text-[10px] mb-0.5">
                        <span className="text-gray-500">Fulfillment</span>
                        <span className="font-semibold text-emerald-600">
                          {pStat.deliveredOrders} ({pStat.fulfillmentRate}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 h-1 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(pStat.fulfillmentRate, 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Return & Cancel Breakdown Bar */}
                    <div>
                      <div className="flex items-center justify-between text-[10px] mb-0.5">
                        <span className="text-gray-500">Returns & Cancel</span>
                        <span className="font-semibold text-rose-600">
                          {(pStat.returnedOrders || 0) + (pStat.cancelledOrders || 0)} (
                          {((pStat.returnRate || 0) + (pStat.cancelledRate || 0)).toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 h-1 rounded-full overflow-hidden flex">
                        <div
                          className="bg-rose-500 h-full transition-all duration-500"
                          style={{ width: `${Math.min(pStat.returnRate, 100)}%` }}
                          title={`Returns: ${pStat.returnRate}%`}
                        ></div>
                        <div
                          className="bg-red-400 h-full transition-all duration-500"
                          style={{ width: `${Math.min(pStat.cancelledRate, 100)}%` }}
                          title={`Cancelled: ${pStat.cancelledRate}%`}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Footer Count Pills */}
                  <div className="pt-2 border-t border-border/80 flex items-center justify-between text-[9px] text-gray-500">
                    <span>Del: <strong className="text-ink">{pStat.deliveredOrders}</strong></span>
                    <span>RTO: <strong className="text-rose-600">{pStat.returnedOrders}</strong></span>
                    <span>Cancel: <strong className="text-red-500">{pStat.cancelledOrders || 0}</strong></span>
                    <span>Pend: <strong className="text-amber-600">{pStat.pendingDispatch}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Orders Table Container */}
      <div className="bg-white border border-border rounded-xl overflow-hidden shadow-xs space-y-0">
        {/* Toolbar & Filter Controls */}
        <div className="p-3.5 border-b border-border space-y-2.5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search Box with explicit padding */}
              <div className="relative min-w-[260px]">
                <svg
                  className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search Order ID, Buyer, City, SKU…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-9 pr-3 text-xs bg-white border border-border text-ink rounded-md outline-none focus:border-accent focus:ring-1 focus:ring-accent placeholder-gray-400"
                  style={{ paddingLeft: '2.2rem' }}
                />
              </div>

              {/* Channel Filter Dropdown (Filtered to Selected Platforms) */}
              <CustomDropdown
                value={platformFilter}
                onChange={(val) => setPlatformFilter(val)}
                options={channelOptions}
                size="sm"
              />

              {/* Status Filter Dropdown */}
              <CustomDropdown
                value={statusFilter}
                onChange={(val) => setStatusFilter(val)}
                options={statusOptions}
                size="sm"
              />
            </div>

            {/* Date Preset Selector */}
            <div className="flex items-center space-x-1.5">
              <span className="text-[11px] text-gray-500 font-medium">Period:</span>
              <CustomDropdown
                value={datePreset}
                onChange={(val) => applyDatePreset(val)}
                options={datePresetOptions}
                size="sm"
              />
            </div>
          </div>

          {/* Date Range Inputs (Visible when custom or date selected) */}
          {(datePreset === 'custom' || startDate || endDate) && (
            <div className="pt-2 border-t border-dashed border-border">
              <DateRangeFilter
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={(val) => {
                  setDatePreset('custom');
                  setStartDate(val);
                }}
                onEndDateChange={(val) => {
                  setDatePreset('custom');
                  setEndDate(val);
                }}
                onClear={() => applyDatePreset('all')}
                showClear={Boolean(startDate || endDate || datePreset !== 'all')}
              />
            </div>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-ink">
            <thead className="bg-gray-50/80 text-gray-500 uppercase text-[9px] font-semibold tracking-wider border-b border-border">
              <tr>
                <th className="px-3.5 py-2.5 text-center w-12">Sr. No</th>
                <th className="px-4 py-2.5">Order ID & Date</th>
                <th className="px-4 py-2.5">Channel</th>
                <th className="px-4 py-2.5">Customer & Location</th>
                <th className="px-4 py-2.5">Items / SKUs</th>
                <th className="px-4 py-2.5">Tracking / Invoice</th>
                <th className="px-4 py-2.5">Amount</th>
                <th className="px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-4 py-6 text-center text-gray-500">
                    Loading orders…
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                    <div className="w-10 h-10 rounded-full bg-gray-100 border border-border flex items-center justify-center mx-auto mb-2 text-gray-400">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                    </div>
                    <p className="font-semibold text-ink text-xs mb-0.5">No matching orders found</p>
                    <p className="text-gray-400 text-[11px] max-w-sm mx-auto mb-3">
                      Try adjusting your date range or filters, or import a new CSV file.
                    </p>
                    <button
                      onClick={() => setIsImportModalOpen(true)}
                      className="px-4 py-2 text-xs font-semibold bg-ink text-white rounded-lg hover:bg-black transition-colors"
                    >
                      Import Orders CSV
                    </button>
                  </td>
                </tr>
              ) : (
                orders.map((o, index) => (
                  <tr key={o.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-3.5 py-2.5 text-center text-[11px] font-mono font-medium text-gray-400">
                      {(pagination.page - 1) * pagination.limit + index + 1}
                    </td>

                    <td className="px-4 py-2.5">
                      <span className="font-mono text-ink font-semibold block text-[11px]">
                        {o.platformOrderId}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {o.orderDate ? new Date(o.orderDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </span>
                    </td>

                    <td className="px-4 py-2.5">
                      <span className="inline-block text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 capitalize">
                        {o.platform}
                      </span>
                    </td>

                    <td className="px-4 py-2.5">
                      <span className="font-medium text-ink block text-xs">{o.buyerName || 'Customer'}</span>
                      <span className="text-[10px] text-gray-400">
                        {[o.buyerCity, o.buyerState].filter(Boolean).join(', ') || '—'}
                      </span>
                    </td>

                    <td className="px-4 py-2.5 max-w-[220px]">
                      {o.items && o.items.length > 0 ? (
                        <div className="space-y-0.5">
                          {o.items.map((it, idx) => (
                            <div key={it.id || idx} className="flex items-center space-x-1 text-[11px]">
                              <span className="font-mono bg-gray-100 text-ink px-1.5 py-0.5 rounded text-[10px] font-medium truncate max-w-[130px]">
                                {it.platformSku}
                              </span>
                              <span className="text-gray-400 font-medium text-[10px]">&times; {it.quantity}</span>
                              {it.productId && (
                                <span className="text-[9px] text-emerald-600 font-bold" title="Linked to product catalog">✓</span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>

                    <td className="px-4 py-2.5 text-[11px]">
                      {o.trackingId ? (
                        <span className="font-mono text-gray-600 block text-[10px]">{o.trackingId}</span>
                      ) : (
                        <span className="text-gray-400 block text-[10px]">—</span>
                      )}
                      {o.invoiceNo && (
                        <span className="text-[9px] text-gray-400">Inv: {o.invoiceNo}</span>
                      )}
                    </td>

                    <td className="px-4 py-2.5 font-bold text-ink">
                      ₹{parseFloat(o.totalAmount || 0).toFixed(2)}
                    </td>

                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-block text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${getStatusBadge(
                          o.status
                        )}`}
                      >
                        {o.status?.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.total > 0 && (
          <div className="p-3 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-[11px] text-gray-500 bg-gray-50/50">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                Showing page <span className="text-ink font-medium">{pagination.page}</span> of{' '}
                <span className="text-ink font-medium">{pagination.totalPages}</span> ({pagination.total} total orders)
              </div>
              <div className="flex items-center space-x-1.5 border-l border-border pl-3">
                <span className="text-gray-500">Rows per page:</span>
                <CustomDropdown
                  value={pagination.limit}
                  onChange={(val) => {
                    const newLimit = parseInt(val, 10);
                    fetchOrders(1, platformFilter, statusFilter, search, startDate, endDate, newLimit);
                  }}
                  options={pageSizeOptions}
                  size="xs"
                />
              </div>
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                onClick={() =>
                  fetchOrders(
                    pagination.page - 1,
                    platformFilter,
                    statusFilter,
                    search,
                    startDate,
                    endDate,
                    pagination.limit
                  )
                }
                disabled={pagination.page <= 1}
                className="px-3 py-1.5 bg-white hover:bg-gray-50 disabled:opacity-40 text-ink rounded border border-border shadow-xs font-medium text-xs"
              >
                &larr; Previous
              </button>
              <button
                onClick={() =>
                  fetchOrders(
                    pagination.page + 1,
                    platformFilter,
                    statusFilter,
                    search,
                    startDate,
                    endDate,
                    pagination.limit
                  )
                }
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-1.5 bg-white hover:bg-gray-50 disabled:opacity-40 text-ink rounded border border-border shadow-xs font-medium text-xs"
              >
                Next &rarr;
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Import Orders Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-border rounded-xl max-w-lg w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-ink">Import Orders CSV</h3>
                <p className="text-xs text-gray-500">Upload exported sales orders from your connected channels</p>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-gray-400 hover:text-ink text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleImportSubmit} className="space-y-3.5 text-xs">
              {/* Channel Selector - Only connected platforms */}
              <div>
                <label className="block font-medium text-ink mb-1">Sales Channel</label>
                <select
                  value={importPlatform}
                  onChange={(e) => setImportPlatform(e.target.value)}
                  className="w-full h-9 px-3 bg-white border border-border rounded-md text-ink text-xs outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                >
                  <option value="auto">✨ Auto-detect Platform (Recommended)</option>
                  {activePlatforms.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} Seller Portal (CSV)
                    </option>
                  ))}
                </select>
              </div>

              {/* Drag & Drop File Box */}
              <div>
                <label className="block font-medium text-ink mb-1">Select Order CSV File *</label>
                <input
                  type="file"
                  accept=".csv"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border hover:border-accent rounded-xl p-5 text-center cursor-pointer bg-surface/50 transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg bg-accent-light text-accent border border-accent/20 flex items-center justify-center mx-auto mb-1.5">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>

                  {selectedFile ? (
                    <div className="space-y-0.5">
                      <p className="font-semibold text-ink text-xs">{selectedFile.name}</p>
                      <p className="text-[10px] text-gray-500">
                        {(selectedFile.size / 1024).toFixed(1)} KB &bull; Click to change
                      </p>
                      {detectedPlatform && (
                        <div className="pt-0.5">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            ✨ Detected: {detectedPlatform} Orders Export
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p className="font-medium text-ink text-xs">
                        Click or drag & drop your order CSV file here
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Supports standard CSV exports from connected channels</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-2.5 bg-blue-50/70 border border-blue-100 rounded-lg text-[10px] text-blue-900 leading-relaxed">
                💡 <strong>Auto-Detection Active:</strong> You can leave the platform on <em>Auto-detect</em>. Our system inspects the column headers and routes to your connected channel accordingly.
              </div>

              <div className="pt-2.5 border-t border-border flex items-center justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-3.5 py-1.5 bg-white hover:bg-gray-50 border border-border text-ink rounded-md transition-colors font-medium text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedFile || importing}
                  className="px-4 py-2 bg-ink text-white hover:bg-black font-semibold rounded-md transition-colors disabled:opacity-50 flex items-center space-x-1.5 text-xs"
                >
                  {importing && (
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  )}
                  <span>{importing ? 'Processing Orders…' : 'Import Orders'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* India State-wise Heatmap Modal */}
      <IndiaMapModal
        isOpen={isIndiaMapModalOpen}
        onClose={() => setIsIndiaMapModalOpen(false)}
      />
    </div>
  );
}

