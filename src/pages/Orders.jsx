import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { getOrders, importOrdersCsv } from '../api/orders.js';
import { getPlatformAccounts } from '../api/platformAccounts.js';
import IndiaMapModal from '../components/IndiaMapModal.jsx';
import CustomDropdown from '../components/CustomDropdown.jsx';
import DateRangeFilter from '../components/DateRangeFilter.jsx';

// Modular Order Components
import OrderKpiCards from '../components/orders/OrderKpiCards.jsx';
import PlatformPerformanceAccordion from '../components/orders/PlatformPerformanceAccordion.jsx';
import OrdersTable from '../components/orders/OrdersTable.jsx';
import ImportOrdersModal from '../components/orders/ImportOrdersModal.jsx';
import OrderDetailsModal from '../components/orders/OrderDetailsModal.jsx';

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

  // Filters with 1000ms (1s) Search Debouncer
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [datePreset, setDatePreset] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Platform performance breakdown collapsible toggle
  const [showPlatformBreakdown, setShowPlatformBreakdown] = useState(false);

  // Selected order for detailed modal view
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Debounce search input by 1000ms (1 second)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 1000);

    return () => clearTimeout(timer);
  }, [search]);

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
    query = debouncedSearch,
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
    fetchOrders(1, platformFilter, statusFilter, debouncedSearch, startDate, endDate);
  }, [platformFilter, statusFilter, debouncedSearch, startDate, endDate]);

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

  const allPlatformsConfig = [
    {
      id: 'flipkart',
      name: 'Flipkart',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      badgeColor: 'text-blue-700',
      icon: <span className="font-extrabold text-[11px] text-[#2874F0]">FK</span>,
    },
    {
      id: 'meesho',
      name: 'Meesho',
      bgColor: 'bg-fuchsia-50',
      borderColor: 'border-fuchsia-200',
      badgeColor: 'text-fuchsia-700',
      icon: <span className="font-extrabold text-[11px] text-[#9C27B0]">MS</span>,
    },
    {
      id: 'amazon',
      name: 'Amazon',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      badgeColor: 'text-amber-800',
      icon: <span className="font-extrabold text-[11px] text-[#E67A00]">AZ</span>,
    },
    {
      id: 'myntra',
      name: 'Myntra',
      bgColor: 'bg-rose-50',
      borderColor: 'border-rose-200',
      badgeColor: 'text-rose-700',
      icon: <span className="font-extrabold text-[11px] text-[#FF3F6C]">MY</span>,
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
    <div className="h-full flex flex-col p-3 md:p-3.5 font-sans space-y-2 max-w-full overflow-hidden">
      {/* Compact Header */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold text-ink tracking-tight">Orders Management</h1>
          <p className="text-[10.5px] text-gray-500">
            Real-time multi-channel order sync (Flipkart, Meesho, Amazon), return analytics & CSV imports
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Refresh Button */}
          <button
            onClick={async () => {
              await fetchOrders(
                pagination.page,
                platformFilter,
                statusFilter,
                debouncedSearch,
                startDate,
                endDate,
                pagination.limit
              );
              toast.success('Orders refreshed');
            }}
            disabled={loading}
            className="h-7 px-2.5 text-[11px] font-semibold bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-ink hover:border-gray-400 rounded-md transition-all flex items-center space-x-1.5 shadow-2xs group cursor-pointer"
            title="Refresh orders without reloading web page"
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

          <button
            onClick={() => setIsIndiaMapModalOpen(true)}
            className="h-7 px-2.5 text-[11px] font-semibold bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-ink hover:border-gray-400 rounded-md transition-all flex items-center space-x-1.5 shadow-2xs group"
          >
            <svg
              className="w-3.5 h-3.5 text-blue-600 group-hover:scale-110 transition-transform"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
              />
            </svg>
            <span>State Heatmap</span>
          </button>

          <button
            onClick={() => {
              setSelectedFile(null);
              setIsImportModalOpen(true);
            }}
            className="h-7 px-3 text-[11px] font-semibold bg-ink text-white hover:bg-black rounded-md transition-colors flex items-center space-x-1 shadow-xs"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span>Import Orders CSV</span>
          </button>
        </div>
      </div>

      {/* Small Compact 4-KPI Cards */}
      <OrderKpiCards
        metrics={metrics}
        totalReturnsAndCancelled={totalReturnsAndCancelled}
        totalReturnAndCancelRate={totalReturnAndCancelRate}
      />

      {/* Collapsible Platform-Wise Performance & Returns Accordion */}
      <PlatformPerformanceAccordion
        activePlatforms={activePlatforms}
        platformMetricsList={platformMetricsList}
        platformFilter={platformFilter}
        setPlatformFilter={setPlatformFilter}
        showPlatformBreakdown={showPlatformBreakdown}
        setShowPlatformBreakdown={setShowPlatformBreakdown}
      />

      {/* Orders Table Container (Fills remaining height, contains internal table scroll) */}
      <div className="flex-1 min-h-0 flex flex-col bg-white border border-border rounded-lg overflow-hidden shadow-xs">
        {/* Compact Search & Filter Toolbar (Fixed inside card top) */}
        <div className="shrink-0 py-1.5 px-3 border-b border-border space-y-1.5 bg-gray-50/40">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 flex-1 max-w-2xl">
              {/* Search Box */}
              <div className="relative flex-1 min-w-[220px]">
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
                  placeholder="Search Order ID, Buyer, City, SKU…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="!h-7 !min-h-0 w-full pr-2.5 text-[11px] bg-white border border-border text-ink rounded-md outline-none focus:border-accent focus:ring-1 focus:ring-accent placeholder-gray-400 !py-0 shadow-2xs"
                  style={{ height: '28px', minHeight: '28px', paddingLeft: '2rem' }}
                />
              </div>

              {/* Channel Filter Dropdown */}
              <CustomDropdown
                value={platformFilter}
                onChange={(val) => setPlatformFilter(val)}
                options={channelOptions}
                size="xs"
                buttonClassName="!h-7 !min-h-0 !rounded-md"
              />

              {/* Status Filter Dropdown */}
              <CustomDropdown
                value={statusFilter}
                onChange={(val) => setStatusFilter(val)}
                options={statusOptions}
                size="xs"
                buttonClassName="!h-7 !min-h-0 !rounded-md"
              />
            </div>

            {/* Date Preset Selector */}
            <div className="flex items-center space-x-1.5">
              <span className="text-[11px] text-gray-500 font-medium">Period:</span>
              <CustomDropdown
                value={datePreset}
                onChange={(val) => applyDatePreset(val)}
                options={datePresetOptions}
                size="xs"
                buttonClassName="!h-7 !min-h-0 !rounded-md"
              />
            </div>
          </div>

          {/* Date Range Inputs (Visible when custom or date selected) */}
          {(datePreset === 'custom' || startDate || endDate) && (
            <div className="pt-1.5 border-t border-dashed border-border">
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

        {/* Modular Table - In-Page Vertical & Horizontal Scrollable Container */}
        <OrdersTable
          orders={orders}
          loading={loading}
          pagination={pagination}
          onOpenImportModal={() => setIsImportModalOpen(true)}
          onViewOrder={(order) => setSelectedOrder(order)}
        />

        {/* Pagination (Fixed at bottom of Card) */}
        {pagination.total > 0 && (
          <div className="shrink-0 relative z-20 p-2 px-3 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-gray-500 bg-gray-50/50">
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
                    fetchOrders(1, platformFilter, statusFilter, debouncedSearch, startDate, endDate, newLimit);
                  }}
                  options={pageSizeOptions}
                  size="xs"
                  placement="top"
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
                    debouncedSearch,
                    startDate,
                    endDate,
                    pagination.limit
                  )
                }
                disabled={pagination.page <= 1}
                className="px-3 py-1.5 bg-white hover:bg-gray-50 disabled:opacity-40 text-ink rounded border border-border shadow-xs font-medium text-xs cursor-pointer"
              >
                &larr; Previous
              </button>
              <button
                onClick={() =>
                  fetchOrders(
                    pagination.page + 1,
                    platformFilter,
                    statusFilter,
                    debouncedSearch,
                    startDate,
                    endDate,
                    pagination.limit
                  )
                }
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-1.5 bg-white hover:bg-gray-50 disabled:opacity-40 text-ink rounded border border-border shadow-xs font-medium text-xs cursor-pointer"
              >
                Next &rarr;
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modular Import Orders Modal */}
      <ImportOrdersModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSubmit={handleImportSubmit}
        importPlatform={importPlatform}
        setImportPlatform={setImportPlatform}
        activePlatforms={activePlatforms}
        fileInputRef={fileInputRef}
        handleFileChange={handleFileChange}
        selectedFile={selectedFile}
        detectedPlatform={detectedPlatform}
        importing={importing}
      />

      {/* Modular Order Details Modal */}
      <OrderDetailsModal
        order={selectedOrder}
        isOpen={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
      />

      {/* India State-wise Heatmap Modal */}
      <IndiaMapModal
        isOpen={isIndiaMapModalOpen}
        onClose={() => setIsIndiaMapModalOpen(false)}
      />
    </div>
  );
}
