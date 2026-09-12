import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getProducts } from '../api/products.js';
import { getPlatformAccounts } from '../api/platformAccounts.js';
import { getOrders } from '../api/orders.js';
import CustomDropdown from '../components/CustomDropdown.jsx';
import DateRangeFilter from '../components/DateRangeFilter.jsx';



export default function Dashboard() {
  const { user, company } = useAuth();
  const navigate = useNavigate();

  // Date Filter State (Defaults to 7 Days for good chart & daily metrics)
  const [datePreset, setDatePreset] = useState('7days');
  const [startDate, setStartDate] = useState(() => {
    const past = new Date();
    past.setDate(past.getDate() - 7);
    return past.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Product & Platform Metrics
  const [productMetrics, setProductMetrics] = useState({
    totalProducts: 0,
    activeProducts: 0,
    draftProducts: 0,
    lowStockProducts: 0,
  });
  const [platforms, setPlatforms] = useState([]);

  // Orders State
  const [recentOrders, setRecentOrders] = useState([]);
  const [orderMetrics, setOrderMetrics] = useState({
    totalOrders: 0,
    deliveredOrders: 0,
    returnedOrders: 0,
    cancelledOrders: 0,
    pendingDispatch: 0,
    totalSales: 0,
    dailyTrends: [],
  });

  const [hoveredDay, setHoveredDay] = useState(null);
  const [loading, setLoading] = useState(true);

  function handleDatePresetChange(preset) {
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

  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true);
      try {
        const [prodData, platformData, ordersData] = await Promise.all([
          getProducts({ page: 1, limit: 1 }),
          getPlatformAccounts(),
          getOrders({
            page: 1,
            limit: 10,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
          }),
        ]);

        if (prodData && prodData.metrics) {
          setProductMetrics(prodData.metrics);
        }

        if (platformData) {
          setPlatforms(platformData);
        }

        if (ordersData) {
          setRecentOrders(ordersData.orders || []);
          if (ordersData.metrics) {
            setOrderMetrics(ordersData.metrics);
          }
        }
      } catch (err) {
        // Non-fatal dashboard load error
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [startDate, endDate]);

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

  function getDatePresetLabel() {
    switch (datePreset) {
      case 'today':
        return "Today's Orders";
      case '7days':
        return 'Last 7 Days Orders';
      case '30days':
        return 'Last 30 Days Orders';
      case 'thisMonth':
        return 'This Month Orders';
      case 'custom':
        return 'Custom Range Orders';
      default:
        return 'All Time Orders';
    }
  }

  // Calculate daily trend chart values
  const dailyData = orderMetrics.dailyTrends && orderMetrics.dailyTrends.length > 0
    ? orderMetrics.dailyTrends
    : [];

  const maxDailyCount = Math.max(...dailyData.map((d) => d.totalOrders || 0), 5);
  const totalPeriodOrders = dailyData.reduce((acc, d) => acc + (d.totalOrders || 0), 0);
  const dailyAverage = dailyData.length > 0 ? (totalPeriodOrders / dailyData.length).toFixed(1) : '0';

  return (
    <div className="p-4 md:p-5 font-sans space-y-3.5 max-w-full">
      {/* Welcome Banner */}
      <div className="bg-white border border-border rounded-xl p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-ink tracking-tight">
              Welcome back, {user?.fullName?.split(' ')[0] || 'Seller'}!
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-accent-light text-accent-dark border border-accent/20 rounded-full">
              {company?.companyName || 'Business Account'}
            </span>
          </div>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Here is your live daily sales performance and product catalog overview.
          </p>
        </div>

        {/* Date Filter Toolbar on Dashboard */}
        <div className="flex items-center space-x-1.5">
          <span className="text-[11px] text-gray-500 font-medium">Period:</span>
          <CustomDropdown
            value={datePreset}
            onChange={(val) => handleDatePresetChange(val)}
            options={[
              { value: 'all', label: 'All Time' },
              { value: 'today', label: 'Today' },
              { value: '7days', label: 'Last 7 Days' },
              { value: '30days', label: 'Last 30 Days' },
              { value: 'thisMonth', label: 'This Month' },
              { value: 'custom', label: 'Custom Range' },
            ]}
            size="sm"
          />
        </div>
      </div>

      {/* Custom Date Pickers (if custom selected) */}
      {datePreset === 'custom' && (
        <DateRangeFilter
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={(val) => setStartDate(val)}
          onEndDateChange={(val) => setEndDate(val)}
          onClear={() => handleDatePresetChange('7days')}
          showClear={true}
        />
      )}

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Total Products */}
        <div
          onClick={() => navigate('/products')}
          className="bg-white border border-border rounded-xl p-3.5 shadow-xs flex items-center justify-between cursor-pointer hover:border-gray-300 transition-colors"
        >
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Total Products</p>
            <h3 className="text-xl font-bold text-ink mt-0.5">{productMetrics.totalProducts}</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">In master catalog</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-accent-light text-accent border border-accent/20 flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
        </div>

        {/* Card 2: Active Catalog */}
        <div
          onClick={() => navigate('/products')}
          className="bg-white border border-border rounded-xl p-3.5 shadow-xs flex items-center justify-between cursor-pointer hover:border-gray-300 transition-colors"
        >
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Active Catalog</p>
            <h3 className="text-xl font-bold text-emerald-600 mt-0.5">{productMetrics.activeProducts}</h3>
            <p className="text-[10px] text-emerald-600 font-medium mt-0.5">Live & selling</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        {/* Combined Orders Box (Spans 2 columns: Total, Delivered/Shipped, Returns/RTO, Cancelled) */}
        <div
          onClick={() => navigate('/orders')}
          className="lg:col-span-2 bg-white border border-border rounded-xl p-3.5 shadow-xs flex flex-col justify-between cursor-pointer hover:border-accent transition-all space-y-2.5"
        >
          <div className="flex items-center justify-between border-b border-border/80 pb-2">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                {getDatePresetLabel()}
              </span>
              <span className="text-xs font-bold text-ink">
                ₹{parseFloat(orderMetrics.totalSales || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })} GMV
              </span>
            </div>
            <span className="text-[11px] text-accent font-semibold flex items-center space-x-1">
              <span>View Orders</span>
              <span>&rarr;</span>
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center divide-x divide-border/60">
            {/* Total Orders */}
            <div className="px-1">
              <p className="text-[10px] font-semibold text-gray-500 uppercase">Orders</p>
              <h3 className="text-lg font-bold text-ink mt-0.5">{orderMetrics.totalOrders}</h3>
              <p className="text-[9px] text-gray-400">Total received</p>
            </div>

            {/* Shipped / Delivered */}
            <div className="px-1 pl-2">
              <p className="text-[10px] font-semibold text-emerald-600 uppercase">Delivered / Ship</p>
              <h3 className="text-lg font-bold text-emerald-600 mt-0.5">{orderMetrics.deliveredOrders}</h3>
              <p className="text-[9px] text-emerald-600 font-medium">
                {orderMetrics.totalOrders > 0
                  ? `${((orderMetrics.deliveredOrders / orderMetrics.totalOrders) * 100).toFixed(0)}% fulfilled`
                  : '0%'}
              </p>
            </div>

            {/* Returns / RTO */}
            <div className="px-1 pl-2">
              <p className="text-[10px] font-semibold text-rose-600 uppercase">RTO / Return</p>
              <h3 className="text-lg font-bold text-rose-600 mt-0.5">{orderMetrics.returnedOrders || 0}</h3>
              <p className="text-[9px] text-rose-600 font-medium">
                {orderMetrics.totalOrders > 0
                  ? `${(((orderMetrics.returnedOrders || 0) / orderMetrics.totalOrders) * 100).toFixed(0)}% return`
                  : '0%'}
              </p>
            </div>

            {/* Cancelled Orders */}
            <div className="px-1 pl-2">
              <p className="text-[10px] font-semibold text-red-600 uppercase">Cancelled</p>
              <h3 className="text-lg font-bold text-red-600 mt-0.5">{orderMetrics.cancelledOrders || 0}</h3>
              <p className="text-[9px] text-red-600 font-medium">
                {orderMetrics.totalOrders > 0
                  ? `${(((orderMetrics.cancelledOrders || 0) / orderMetrics.totalOrders) * 100).toFixed(0)}% cancel`
                  : '0%'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Day-Wise Order Trend Bar Chart Section */}
      <div className="bg-white border border-border rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-2.5">
          <div>
            <h2 className="text-xs font-bold text-ink flex items-center space-x-2">
              <span>Day-wise Order Trend</span>
              <span className="text-[9px] bg-accent-light text-accent px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider">
                Daily Bar Chart
              </span>
            </h2>
            <p className="text-[11px] text-gray-400">
              Daily order volume distribution across connected sales channels
            </p>
          </div>

          <div className="flex items-center space-x-3 text-[11px]">
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded bg-blue-600 inline-block"></span>
              <span className="text-gray-500 font-medium">Flipkart</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded bg-fuchsia-600 inline-block"></span>
              <span className="text-gray-500 font-medium">Meesho</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded bg-amber-500 inline-block"></span>
              <span className="text-gray-500 font-medium">Amazon</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded bg-rose-500 inline-block"></span>
              <span className="text-gray-500 font-medium">Myntra</span>
            </div>
          </div>
        </div>

        {/* Bar Chart Area */}
        {dailyData.length === 0 ? (
          <div className="h-44 flex flex-col items-center justify-center text-center text-gray-400 text-xs">
            <p className="font-semibold text-ink mb-0.5">No day-wise orders recorded yet</p>
            <p className="text-[11px]">Import orders to visualize daily sales volume trends.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="h-44 flex items-end justify-between gap-2 pt-6 px-1 relative">
              {dailyData.map((d, index) => {
                const total = d.totalOrders || 0;
                const heightPercent = maxDailyCount > 0 ? (total / maxDailyCount) * 100 : 0;
                const isHovered = hoveredDay === d.date;

                const fkCount = d.flipkart || 0;
                const msCount = d.meesho || 0;
                const azCount = d.amazon || 0;
                const myCount = d.myntra || 0;

                const fkPercent = total > 0 ? (fkCount / total) * 100 : 0;
                const msPercent = total > 0 ? (msCount / total) * 100 : 0;
                const azPercent = total > 0 ? (azCount / total) * 100 : 0;
                const myPercent = total > 0 ? (myCount / total) * 100 : 0;

                return (
                  <div
                    key={d.date || index}
                    onMouseEnter={() => setHoveredDay(d.date)}
                    onMouseLeave={() => setHoveredDay(null)}
                    className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative"
                  >
                    {/* Hover Tooltip */}
                    {isHovered && (
                      <div className="absolute bottom-full mb-2 z-20 bg-ink text-white p-2.5 rounded-lg text-[10px] shadow-lg whitespace-nowrap pointer-events-none min-w-[130px] border border-gray-700">
                        <p className="font-bold text-white border-b border-gray-700 pb-1 mb-1">
                          {d.dayName}, {d.dayLabel}
                        </p>
                        <div className="space-y-0.5">
                          <p className="flex justify-between font-semibold">
                            <span>Total Orders:</span>
                            <span className="text-accent">{total}</span>
                          </p>
                          <p className="flex justify-between text-gray-300">
                            <span>Revenue:</span>
                            <span>₹{parseFloat(d.totalSales || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                          </p>
                          {fkCount > 0 && (
                            <p className="flex justify-between text-blue-300">
                              <span>Flipkart:</span>
                              <span>{fkCount}</span>
                            </p>
                          )}
                          {msCount > 0 && (
                            <p className="flex justify-between text-fuchsia-300">
                              <span>Meesho:</span>
                              <span>{msCount}</span>
                            </p>
                          )}
                          {azCount > 0 && (
                            <p className="flex justify-between text-amber-300">
                              <span>Amazon:</span>
                              <span>{azCount}</span>
                            </p>
                          )}
                          {myCount > 0 && (
                            <p className="flex justify-between text-rose-300">
                              <span>Myntra:</span>
                              <span>{myCount}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Order Count Label Above Bar */}
                    <span
                      className={`text-[10px] font-bold mb-1 transition-opacity ${
                        total > 0 ? 'text-ink opacity-90' : 'text-gray-300 opacity-40'
                      }`}
                    >
                      {total}
                    </span>

                    {/* Stacked Multi-Channel Bar */}
                    <div
                      className={`w-full max-w-[42px] rounded-t-md overflow-hidden transition-all duration-300 flex flex-col-reverse ${
                        isHovered ? 'ring-2 ring-accent scale-x-105' : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                      style={{
                        height: total > 0 ? `${Math.max(heightPercent, 10)}%` : '4px',
                      }}
                    >
                      {total > 0 ? (
                        <>
                          {fkCount > 0 && (
                            <div
                              style={{ height: `${fkPercent}%` }}
                              className="bg-blue-600 transition-all duration-300"
                              title={`Flipkart: ${fkCount}`}
                            />
                          )}
                          {msCount > 0 && (
                            <div
                              style={{ height: `${msPercent}%` }}
                              className="bg-fuchsia-600 transition-all duration-300"
                              title={`Meesho: ${msCount}`}
                            />
                          )}
                          {azCount > 0 && (
                            <div
                              style={{ height: `${azPercent}%` }}
                              className="bg-amber-500 transition-all duration-300"
                              title={`Amazon: ${azCount}`}
                            />
                          )}
                          {myCount > 0 && (
                            <div
                              style={{ height: `${myPercent}%` }}
                              className="bg-rose-500 transition-all duration-300"
                              title={`Myntra: ${myCount}`}
                            />
                          )}
                        </>
                      ) : (
                        <div className="w-full h-full bg-gray-200" />
                      )}
                    </div>

                    {/* Day / Date Axis Label */}
                    <div className="text-center mt-2">
                      <span className="text-[10px] font-bold text-ink block">{d.dayName}</span>
                      <span className="text-[9px] text-gray-400 block">{d.dayLabel}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Chart Summary Footer Bar */}
            <div className="pt-2 border-t border-border flex flex-wrap items-center justify-between text-[11px] text-gray-500 px-1">
              <div>
                Period Orders: <strong className="text-ink">{totalPeriodOrders}</strong>
              </div>
              <div className="space-x-4">
                <span>Daily Average: <strong className="text-ink">{dailyAverage} orders/day</strong></span>
                <span>Max Day Volume: <strong className="text-emerald-600">{maxDailyCount} orders</strong></span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Grid: Latest 10 Orders & Connected Platforms */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        {/* Latest 10 Orders Table Widget (Spans 2 Columns) */}
        <div className="lg:col-span-2 bg-white border border-border rounded-xl p-3.5 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between border-b border-border pb-2.5">
            <div>
              <h2 className="text-xs font-bold text-ink flex items-center space-x-1.5">
                <span>Latest Orders</span>
                <span className="text-[9px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded font-bold uppercase">
                  {recentOrders.length} Recent
                </span>
              </h2>
              <p className="text-[11px] text-gray-400">
                Latest orders received across connected channels for the selected period
              </p>
            </div>
            <button
              onClick={() => navigate('/orders')}
              className="text-[11px] font-semibold text-accent hover:underline"
            >
              View All Orders →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-ink">
              <thead className="bg-gray-50/80 text-gray-500 uppercase text-[9px] font-semibold tracking-wider border-b border-border">
                <tr>
                  <th className="px-3 py-2 text-center w-10">#</th>
                  <th className="px-3.5 py-2">Order ID & Date</th>
                  <th className="px-3.5 py-2">Channel</th>
                  <th className="px-3.5 py-2">Customer & City</th>
                  <th className="px-3.5 py-2">Amount</th>
                  <th className="px-3.5 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-3.5 py-6 text-center text-gray-500 text-xs">
                      Loading latest orders…
                    </td>
                  </tr>
                ) : recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-3.5 py-8 text-center text-gray-500 text-xs">
                      <p className="font-semibold text-ink mb-1">No orders found for this period</p>
                      <p className="text-gray-400 text-[11px] mb-2">Try changing your date filter or import orders CSV.</p>
                      <button
                        onClick={() => navigate('/orders')}
                        className="px-3 py-1 bg-ink text-white rounded text-xs font-semibold hover:bg-black"
                      >
                        Go to Orders
                      </button>
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((o, idx) => (
                    <tr key={o.id || idx} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-3 py-2 text-center text-[10px] font-mono text-gray-400">
                        {idx + 1}
                      </td>

                      <td className="px-3.5 py-2">
                        <span className="font-mono font-semibold text-ink text-[11px] block truncate max-w-[150px]">
                          {o.platformOrderId}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {o.orderDate ? new Date(o.orderDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                        </span>
                      </td>

                      <td className="px-3.5 py-2">
                        <span className="inline-block text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 capitalize">
                          {o.platform}
                        </span>
                      </td>

                      <td className="px-3.5 py-2">
                        <span className="font-medium text-ink block text-xs truncate max-w-[130px]">{o.buyerName || 'Customer'}</span>
                        <span className="text-[10px] text-gray-400 truncate block max-w-[130px]">
                          {[o.buyerCity, o.buyerState].filter(Boolean).join(', ') || '—'}
                        </span>
                      </td>

                      <td className="px-3.5 py-2 font-bold text-ink text-xs">
                        ₹{parseFloat(o.totalAmount || 0).toFixed(2)}
                      </td>

                      <td className="px-3.5 py-2">
                        <span
                          className={`inline-block text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border ${getStatusBadge(
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
        </div>

        {/* Connected Channels Widget */}
        <div className="bg-white border border-border rounded-xl p-3.5 shadow-xs flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <h2 className="text-xs font-bold text-ink">Connected Channels</h2>
              <button
                onClick={() => navigate('/onboarding')}
                className="text-[11px] font-semibold text-accent hover:underline"
              >
                + Manage
              </button>
            </div>

            <div className="mt-2.5 space-y-2">
              {platforms.length === 0 ? (
                <p className="text-xs text-gray-400 py-3 text-center">No platform channels connected yet.</p>
              ) : (
                platforms.map((p) => (
                  <div key={p.id || p.platform} className="flex items-center justify-between p-2.5 rounded-lg bg-surface border border-border">
                    <span className="text-xs font-bold text-ink capitalize">{p.platform}</span>
                    <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {p.status || 'connected'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <button
            onClick={() => navigate('/onboarding')}
            className="w-full h-9 text-xs font-semibold bg-white hover:bg-gray-50 border border-border text-ink rounded-lg transition-colors shadow-xs flex items-center justify-center"
          >
            Configure Channels →
          </button>
        </div>
      </div>
    </div>
  );
}
