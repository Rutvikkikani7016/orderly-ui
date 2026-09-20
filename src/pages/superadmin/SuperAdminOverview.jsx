import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchOverview } from '../../store/slices/superAdminSlice.js';
import StatusBadge from '../../components/common/StatusBadge.jsx';

export default function SuperAdminOverview() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { overview, loading } = useSelector((state) => state.superAdmin);
  const { metrics, platformDistribution, recentCompanies } = overview;

  useEffect(() => {
    dispatch(fetchOverview());
  }, [dispatch]);

  return (
    <div className="p-5 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Super Admin Overview</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            System-wide platform health, tenant companies, user growth, and multi-channel order volume
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => dispatch(fetchOverview())}
            disabled={loading}
            className="h-8 px-3 text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors flex items-center space-x-1.5 shadow-2xs"
          >
            <svg
              className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
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
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Companies */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tenant Companies</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mt-2">{metrics?.totalCompanies ?? 0}</h3>
          <div className="flex items-center space-x-2 mt-2 text-[11px] text-slate-500">
            <span className="text-emerald-600 font-semibold">{metrics?.activeCompanies ?? 0} Active</span>
            <span>&bull;</span>
            <span className="text-indigo-600 font-semibold">{metrics?.trialCompanies ?? 0} Trial</span>
            <span>&bull;</span>
            <span className="text-rose-600 font-semibold">{metrics?.suspendedCompanies ?? 0} Suspended</span>
          </div>
        </div>

        {/* Total Users */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Registered Users</span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mt-2">{metrics?.totalUsers ?? 0}</h3>
          <p className="text-[11px] text-emerald-600 font-medium mt-2">
            {metrics?.activeUsers ?? 0} active accounts
          </p>
        </div>

        {/* Total Orders */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">System Orders</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mt-2">
            {(metrics?.totalOrders || 0).toLocaleString('en-IN')}
          </h3>
          <p className="text-[11px] text-slate-500 mt-2">Aggregated across all channels</p>
        </div>

        {/* Total System GMV */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">System GMV</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center font-bold text-xs">
              ₹
            </div>
          </div>
          <h3 className="text-2xl font-bold text-emerald-600 mt-2">
            ₹{parseFloat(metrics?.totalGMV || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </h3>
          <p className="text-[11px] text-slate-500 mt-2">Gross processed sales</p>
        </div>
      </div>

      {/* Platform Integrations Overview */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              Marketplace Channel Distribution
            </h3>
            <p className="text-[11px] text-slate-400">Total connected seller portal accounts across all companies</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          {['flipkart', 'amazon', 'meesho', 'myntra'].map((platformKey) => {
            const stat = platformDistribution?.find((p) => p.platform === platformKey) || {
              totalAccounts: 0,
              connectedAccounts: 0,
            };
            return (
              <div key={platformKey} className="p-3 bg-slate-50 rounded-lg border border-slate-200/70 space-y-1">
                <span className="text-[11px] font-bold text-slate-700 capitalize block">{platformKey}</span>
                <p className="text-lg font-bold text-slate-900">{stat.connectedAccounts}</p>
                <p className="text-[10px] text-slate-500">{stat.totalAccounts} total configured</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Companies */}
      <div className="bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              Recent Company Registrations
            </h3>
            <p className="text-[11px] text-slate-400">Newly onboarded companies in OrderNest</p>
          </div>
          <button
            onClick={() => navigate('/super-admin/companies')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
          >
            View All Companies &rarr;
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-800">
            <thead className="bg-slate-50/80 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-4 py-2.5">Company Name</th>
                <th className="px-4 py-2.5">Primary Contact</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Registered Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentCompanies && recentCompanies.length > 0 ? (
                recentCompanies.map((comp) => {
                  const owner = comp.users?.[0];
                  return (
                    <tr key={comp.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {comp.companyName}
                        {comp.businessType && (
                          <span className="block text-[10px] font-normal text-slate-400">
                            {comp.businessType}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-800 block">{owner?.fullName || '—'}</span>
                        <span className="text-[10px] text-slate-400">{owner?.email || comp.companyEmail || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={comp.status} />
                      </td>
                      <td className="px-4 py-3 text-[11px] text-slate-500">
                        {new Date(comp.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="4" className="px-4 py-6 text-center text-slate-400">
                    No recent companies found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
