import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { getStateAnalytics } from '../api/orders';
import IndiaMap from './IndiaMap';
import { INDIA_STATES_DATA, findStateByRawName } from '../data/indiaMapPaths';

export default function IndiaMapModal({ isOpen, onClose }) {
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [platformFilter, setPlatformFilter] = useState('all');
  const [datePreset, setDatePreset] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState(null);

  // Handle date preset change
  function handlePresetChange(preset) {
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

  // Fetch analytics data when modal is open and filters change
  useEffect(() => {
    if (!isOpen) return;

    async function loadData() {
      setLoading(true);
      try {
        const data = await getStateAnalytics({
          platform: platformFilter,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        });
        setAnalyticsData(data);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to load regional analytics.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [isOpen, platformFilter, startDate, endDate]);

  // Merge full 36 states/UT list with backend analytics for rich list view
  const combinedStateList = useMemo(() => {
    const rawList = analyticsData?.states || [];
    const stateMap = {};

    // Map existing stats by normalized code/id
    rawList.forEach((st) => {
      const matched = findStateByRawName(st.rawState);
      const key = matched ? matched.id : st.rawState;
      if (!stateMap[key]) {
        stateMap[key] = {
          ...st,
          name: matched ? matched.name : st.rawState,
          code: matched ? matched.code : 'IN',
          stateId: matched ? matched.id : null,
        };
      } else {
        stateMap[key].orderCount += st.orderCount || 0;
        stateMap[key].totalSales += st.totalSales || 0;
        stateMap[key].deliveredCount += st.deliveredCount || 0;
        stateMap[key].returnedCount += st.returnedCount || 0;
        stateMap[key].cancelledCount += st.cancelledCount || 0;
        stateMap[key].pendingCount += st.pendingCount || 0;
      }
    });

    // Populate all 36 states so user can search or see 0-order states too
    const full = INDIA_STATES_DATA.map((meta) => {
      if (stateMap[meta.id]) {
        return stateMap[meta.id];
      }
      return {
        name: meta.name,
        code: meta.code,
        stateId: meta.id,
        rawState: meta.name,
        orderCount: 0,
        totalSales: 0,
        deliveredCount: 0,
        returnedCount: 0,
        cancelledCount: 0,
        percentage: 0,
      };
    });

    // Sort by orderCount descending, then alphabetically
    return full.sort((a, b) => b.orderCount - a.orderCount || a.name.localeCompare(b.name));
  }, [analyticsData]);

  // Filtered state list for search
  const filteredStates = useMemo(() => {
    if (!searchQuery.trim()) return combinedStateList;
    const q = searchQuery.trim().toLowerCase();
    return combinedStateList.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        (s.rawState && s.rawState.toLowerCase().includes(q))
    );
  }, [combinedStateList, searchQuery]);

  if (!isOpen) return null;

  const totalOrders = analyticsData?.totalOrders || 0;
  const totalSales = analyticsData?.totalSales || 0;
  const statesCovered = combinedStateList.filter((s) => s.orderCount > 0).length;
  const topState = combinedStateList.length > 0 && combinedStateList[0].orderCount > 0 ? combinedStateList[0] : null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-slate-50 via-white to-blue-50/40">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                />
              </svg>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-ink">India Regional Order Heatmap</h2>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  Dynamic Choropleth
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Visualizing order density across all 28 States & 8 Union Territories
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filter Controls & Key Stats Bar */}
        <div className="px-6 py-3 bg-gray-50/60 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Platform Filter */}
            <div className="flex items-center bg-white border border-gray-200 rounded-lg p-0.5 shadow-2xs">
              {['all', 'flipkart', 'meesho', 'amazon', 'myntra'].map((plat) => (
                <button
                  key={plat}
                  onClick={() => setPlatformFilter(plat)}
                  className={`px-2.5 py-1 rounded-md capitalize font-medium transition-all ${
                    platformFilter === plat
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-gray-600 hover:text-ink hover:bg-gray-50'
                  }`}
                >
                  {plat}
                </button>
              ))}
            </div>

            {/* Date Preset */}
            <div className="flex items-center bg-white border border-gray-200 rounded-lg p-0.5 shadow-2xs">
              {[
                { id: 'all', label: 'All Time' },
                { id: 'today', label: 'Today' },
                { id: '7days', label: '7D' },
                { id: '30days', label: '30D' },
                { id: 'thisMonth', label: 'This Month' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => handlePresetChange(p.id)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    datePreset === p.id
                      ? 'bg-ink text-white shadow-xs'
                      : 'text-gray-600 hover:text-ink hover:bg-gray-50'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Stat Badges */}
          <div className="flex items-center gap-2">
            <div className="px-3 py-1 bg-white border border-gray-200 rounded-lg shadow-2xs text-xs">
              <span className="text-gray-400">Total Orders: </span>
              <span className="font-bold text-ink">{totalOrders.toLocaleString()}</span>
            </div>
            <div className="px-3 py-1 bg-white border border-gray-200 rounded-lg shadow-2xs text-xs">
              <span className="text-gray-400">Total Revenue: </span>
              <span className="font-bold text-emerald-600">₹{totalSales.toLocaleString()}</span>
            </div>
            <div className="px-3 py-1 bg-white border border-gray-200 rounded-lg shadow-2xs text-xs">
              <span className="text-gray-400">Reach: </span>
              <span className="font-bold text-blue-600">{statesCovered}/36 States</span>
            </div>
          </div>
        </div>

        {/* Modal Main Content Area */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-0">
          {/* Left: Map Visualization (7 cols) */}
          <div className="lg:col-span-7 p-4 bg-slate-50/40 border-r border-gray-100 flex flex-col justify-between overflow-y-auto">
            {loading ? (
              <div className="h-full min-h-[400px] flex flex-col items-center justify-center space-y-3">
                <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-medium text-gray-500">Calculating state order intensities...</p>
              </div>
            ) : (
              <IndiaMap
                stateAnalytics={analyticsData?.states || []}
                selectedStateId={selectedState?.stateId || selectedState?.stateInfo?.id}
                onSelectState={(st) => setSelectedState(st)}
                totalCompanyOrders={totalOrders}
              />
            )}
          </div>

          {/* Right: Ranked Leaderboard & Details (5 cols) */}
          <div className="lg:col-span-5 p-4 flex flex-col min-h-0 bg-white">
            {/* Search Bar */}
            <div className="relative mb-3">
              <svg
                className="w-4 h-4 text-gray-400 absolute left-3 top-2.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search state (e.g. Maharashtra, Gujarat, Delhi)..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Selected State Detail Card (if any selected) */}
            {selectedState && (
              <div className="mb-3 p-3 bg-blue-50/70 border border-blue-200 rounded-xl relative animate-fade-in">
                <button
                  onClick={() => setSelectedState(null)}
                  className="absolute right-2 top-2 text-blue-500 hover:text-blue-800 text-xs font-bold"
                >
                  ✕
                </button>
                <div className="flex items-center space-x-2 mb-1.5">
                  <span className="font-bold text-xs text-blue-950">
                    {selectedState.name || selectedState.stateInfo?.name || selectedState.rawState}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 bg-blue-200/80 text-blue-900 rounded font-mono font-bold">
                    {selectedState.code || selectedState.stateInfo?.code}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs mt-2">
                  <div className="bg-white/80 p-1.5 rounded-lg border border-blue-100">
                    <div className="text-[10px] text-gray-500">Orders</div>
                    <div className="font-bold text-ink text-sm">
                      {(selectedState.orderCount || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-white/80 p-1.5 rounded-lg border border-blue-100">
                    <div className="text-[10px] text-gray-500">Revenue</div>
                    <div className="font-bold text-emerald-600 text-sm">
                      ₹{Number(selectedState.totalSales || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-white/80 p-1.5 rounded-lg border border-blue-100">
                    <div className="text-[10px] text-gray-500">Share</div>
                    <div className="font-bold text-blue-700 text-sm">
                      {totalOrders > 0
                        ? (((selectedState.orderCount || 0) / totalOrders) * 100).toFixed(1)
                        : 0}
                      %
                    </div>
                  </div>
                </div>

                {/* Additional fulfillment metrics if available */}
                {(selectedState.deliveredCount > 0 || selectedState.returnedCount > 0 || selectedState.cancelledCount > 0) && (
                  <div className="flex items-center justify-between text-[11px] text-gray-600 mt-2 pt-2 border-t border-blue-200/60">
                    <span className="text-emerald-700">Delivered: {selectedState.deliveredCount || 0}</span>
                    <span className="text-rose-600">Returns: {selectedState.returnedCount || 0}</span>
                    <span className="text-red-600">Cancelled: {selectedState.cancelledCount || 0}</span>
                  </div>
                )}
              </div>
            )}

            {/* Ranked State Leaderboard Header */}
            <div className="flex items-center justify-between text-xs font-bold text-gray-700 pb-1.5 border-b border-gray-100">
              <span>State / Territory</span>
              <span>Orders & Share</span>
            </div>

            {/* State List with Progress Bars */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 mt-2">
              {filteredStates.map((st, idx) => {
                const isTop = idx === 0 && st.orderCount > 0;
                const sharePercent = totalOrders > 0 ? (st.orderCount / totalOrders) * 100 : 0;
                const isSelected =
                  (selectedState?.stateId && selectedState.stateId === st.stateId) ||
                  selectedState?.name === st.name;

                return (
                  <div
                    key={st.name + idx}
                    onClick={() => setSelectedState(st)}
                    className={`p-2 rounded-xl text-xs transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-blue-50/90 border-blue-300 shadow-xs'
                        : 'bg-white border-gray-100 hover:bg-gray-50 hover:border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            isTop
                              ? 'bg-amber-100 text-amber-800'
                              : st.orderCount > 0
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-gray-100 text-gray-400'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-gray-800 flex items-center gap-1.5">
                          {st.name}
                          {isTop && (
                            <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1 rounded">
                              Top Hub
                            </span>
                          )}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="font-bold text-ink text-[13px]">
                          {st.orderCount.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-gray-400 ml-1">
                          ({sharePercent.toFixed(1)}%)
                        </span>
                      </div>
                    </div>

                    {/* Progress bar visual */}
                    <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isTop
                            ? 'bg-blue-900'
                            : st.orderCount > 0
                            ? 'bg-blue-600'
                            : 'bg-transparent'
                        }`}
                        style={{
                          width: `${Math.min(Math.max(sharePercent * 2.5, st.orderCount > 0 ? 4 : 0), 100)}%`,
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1">
                      <span>Rev: ₹{Number(st.totalSales || 0).toLocaleString()}</span>
                      {st.deliveredCount > 0 && (
                        <span className="text-emerald-600">
                          {st.deliveredCount} Delivered
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {filteredStates.length === 0 && (
                <div className="text-center py-8 text-xs text-gray-400">
                  No states found matching "{searchQuery}"
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            <span>State data synchronized from buyer shipping addresses</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-ink text-white font-medium rounded-lg hover:bg-black transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
