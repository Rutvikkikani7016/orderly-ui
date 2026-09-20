import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import {
  fetchCompanies,
  changeCompanyStatus,
  fetchCompanyDetails,
  setCompaniesSearch,
  setCompaniesStatusFilter,
  setCompaniesPage,
  setCompaniesPageLimit,
} from '../../store/slices/superAdminSlice.js';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import CustomDropdown from '../../components/CustomDropdown.jsx';

export default function SuperAdminCompanies() {
  const dispatch = useDispatch();
  const { companies, companiesPagination, companiesFilter, selectedCompany, loading, actionLoading } =
    useSelector((state) => state.superAdmin);

  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [statusChangeModalOpen, setStatusChangeModalOpen] = useState(false);
  const [targetCompany, setTargetCompany] = useState(null);
  const [newStatus, setNewStatus] = useState('active');

  useEffect(() => {
    dispatch(fetchCompanies());
  }, [dispatch, companiesFilter.search, companiesFilter.status, companiesPagination.page, companiesPagination.limit]);

  const handleOpenDetails = async (company) => {
    setDetailsModalOpen(true);
    dispatch(fetchCompanyDetails(company.id));
  };

  const handleOpenStatusModal = (company) => {
    setTargetCompany(company);
    setNewStatus(company.status);
    setStatusChangeModalOpen(true);
  };

  const handleSaveStatus = async () => {
    if (!targetCompany) return;
    try {
      await dispatch(changeCompanyStatus({ id: targetCompany.id, status: newStatus })).unwrap();
      toast.success(`Company status updated to '${newStatus}'`);
      setStatusChangeModalOpen(false);
      setTargetCompany(null);
    } catch (err) {
      toast.error(err || 'Failed to update company status');
    }
  };

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'active', label: 'Active' },
    { value: 'trial', label: 'Trial' },
    { value: 'suspended', label: 'Suspended' },
  ];

  const pageSizeOptions = [
    { value: 10, label: '10 per page' },
    { value: 15, label: '15 per page' },
    { value: 25, label: '25 per page' },
    { value: 50, label: '50 per page' },
  ];

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Tenant Companies</h1>
          <p className="text-xs text-slate-500">
            Manage all registered seller companies, status lifecycle, and connected accounts
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
            {companiesPagination.total} Total Companies
          </span>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            {/* Search Box */}
            <div className="relative min-w-[280px] flex-1 max-w-md">
              <svg
                className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by Company, GSTIN, Email, Phone…"
                value={companiesFilter.search}
                onChange={(e) => dispatch(setCompaniesSearch(e.target.value))}
                className="w-full h-9 pl-9 pr-3 text-xs bg-white border border-slate-200 text-slate-900 rounded-md outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Status Dropdown Filter */}
            <CustomDropdown
              value={companiesFilter.status}
              onChange={(val) => dispatch(setCompaniesStatusFilter(val))}
              options={statusOptions}
              size="sm"
            />
          </div>

          <button
            onClick={() => dispatch(fetchCompanies())}
            className="h-9 px-3 text-xs font-medium bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-md transition-colors"
          >
            Refresh List
          </button>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto border border-slate-100 rounded-lg">
          <table className="w-full text-left text-xs text-slate-800">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-3.5 py-2.5">Company</th>
                <th className="px-3.5 py-2.5">GSTIN / Contact</th>
                <th className="px-3.5 py-2.5">Users</th>
                <th className="px-3.5 py-2.5">Channels</th>
                <th className="px-3.5 py-2.5">Total Orders</th>
                <th className="px-3.5 py-2.5">GMV (₹)</th>
                <th className="px-3.5 py-2.5">Status</th>
                <th className="px-3.5 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-slate-400">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading companies…</span>
                    </div>
                  </td>
                </tr>
              ) : companies.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-slate-400">
                    No companies found matching the filters.
                  </td>
                </tr>
              ) : (
                companies.map((comp) => (
                  <tr key={comp.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-3.5 py-2.5">
                      <span className="font-bold text-slate-900 block">{comp.companyName}</span>
                      <span className="text-[10px] text-slate-400">
                        Created {new Date(comp.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </td>

                    <td className="px-3.5 py-2.5">
                      <span className="font-mono text-[11px] text-slate-700 block">{comp.gstin || 'No GSTIN'}</span>
                      <span className="text-[10px] text-slate-400">{comp.companyEmail || comp.companyPhone || '—'}</span>
                    </td>

                    <td className="px-3.5 py-2.5">
                      <span className="font-medium text-slate-700">{comp.userCount} users</span>
                    </td>

                    <td className="px-3.5 py-2.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        {comp.connectedPlatformsCount} Active
                      </span>
                    </td>

                    <td className="px-3.5 py-2.5 font-medium text-slate-800">
                      {comp.totalOrders.toLocaleString('en-IN')}
                    </td>

                    <td className="px-3.5 py-2.5 font-bold text-slate-900">
                      ₹{comp.totalGMV.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </td>

                    <td className="px-3.5 py-2.5">
                      <StatusBadge status={comp.status} />
                    </td>

                    <td className="px-3.5 py-2.5 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => handleOpenDetails(comp)}
                        className="px-2.5 py-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition-colors"
                      >
                        Details
                      </button>
                      <button
                        onClick={() => handleOpenStatusModal(comp)}
                        className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                      >
                        Change Status
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {companiesPagination.total > 0 && (
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500">
            <div className="flex items-center space-x-3">
              <span>
                Page <strong className="text-slate-800">{companiesPagination.page}</strong> of{' '}
                <strong className="text-slate-800">{companiesPagination.totalPages}</strong> ({companiesPagination.total} total)
              </span>
              <CustomDropdown
                value={companiesPagination.limit}
                onChange={(val) => dispatch(setCompaniesPageLimit(parseInt(val, 10)))}
                options={pageSizeOptions}
                size="xs"
              />
            </div>
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => dispatch(setCompaniesPage(companiesPagination.page - 1))}
                disabled={companiesPagination.page <= 1}
                className="px-2.5 py-1 bg-white hover:bg-slate-50 disabled:opacity-40 rounded border border-slate-200 shadow-2xs"
              >
                &larr; Prev
              </button>
              <button
                onClick={() => dispatch(setCompaniesPage(companiesPagination.page + 1))}
                disabled={companiesPagination.page >= companiesPagination.totalPages}
                className="px-2.5 py-1 bg-white hover:bg-slate-50 disabled:opacity-40 rounded border border-slate-200 shadow-2xs"
              >
                Next &rarr;
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Company Details Modal */}
      {detailsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {selectedCompany?.companyName || 'Company Details'}
                </h3>
                <p className="text-xs text-slate-400">Complete organization breakdown & connected channels</p>
              </div>
              <button
                onClick={() => setDetailsModalOpen(false)}
                className="text-slate-400 hover:text-slate-800 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            {actionLoading ? (
              <div className="py-12 text-center text-xs text-slate-500">Loading details…</div>
            ) : selectedCompany ? (
              <div className="space-y-4 text-xs">
                {/* Meta stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase">Status</span>
                    <StatusBadge status={selectedCompany.status} />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase">Total Orders</span>
                    <span className="font-bold text-slate-800 text-sm">
                      {selectedCompany.metrics?.totalOrders || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase">Delivered</span>
                    <span className="font-bold text-emerald-600 text-sm">
                      {selectedCompany.metrics?.deliveredOrders || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase">Gross Sales</span>
                    <span className="font-bold text-slate-900 text-sm">
                      ₹{parseFloat(selectedCompany.metrics?.totalGMV || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>

                {/* Company Info */}
                <div className="border border-slate-100 rounded-lg p-3 space-y-1.5">
                  <h4 className="font-bold text-slate-900 text-xs">Company Profile</h4>
                  <p><strong className="text-slate-600">GSTIN:</strong> {selectedCompany.gstin || 'Not provided'}</p>
                  <p><strong className="text-slate-600">Email:</strong> {selectedCompany.companyEmail || '—'}</p>
                  <p><strong className="text-slate-600">Phone:</strong> {selectedCompany.companyPhone || '—'}</p>
                  <p><strong className="text-slate-600">Address:</strong> {selectedCompany.businessAddress || '—'}</p>
                </div>

                {/* Associated Users */}
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-900 text-xs">Associated Users ({selectedCompany.users?.length || 0})</h4>
                  <div className="border border-slate-100 rounded-lg divide-y divide-slate-100">
                    {selectedCompany.users && selectedCompany.users.length > 0 ? (
                      selectedCompany.users.map((u) => (
                        <div key={u.id} className="p-2.5 flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-slate-800 block">{u.fullName}</span>
                            <span className="text-[10px] text-slate-400">{u.email} &bull; {u.mobile || 'No mobile'}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <StatusBadge status={u.role} />
                            <StatusBadge status={u.status} />
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="p-3 text-center text-slate-400">No users found.</p>
                    )}
                  </div>
                </div>

                {/* Platform Accounts */}
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-900 text-xs">Connected Channels ({selectedCompany.platformAccounts?.length || 0})</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedCompany.platformAccounts && selectedCompany.platformAccounts.length > 0 ? (
                      selectedCompany.platformAccounts.map((p) => (
                        <div key={p.id} className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-between">
                          <div>
                            <span className="font-bold capitalize text-slate-800 block">{p.platform}</span>
                            <span className="text-[10px] text-slate-400">{p.platformSellerId || 'Primary Account'}</span>
                          </div>
                          <StatusBadge status={p.status} />
                        </div>
                      ))
                    ) : (
                      <p className="col-span-2 p-3 text-center text-slate-400">No platform accounts configured.</p>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setDetailsModalOpen(false)}
                className="px-4 py-2 bg-slate-900 text-white rounded-md font-semibold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Status Modal */}
      {statusChangeModalOpen && targetCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Update Company Status</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Set active lifecycle status for <strong>{targetCompany.companyName}</strong>
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <label className="block font-semibold text-slate-700">Select Status</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full h-9 px-3 bg-white border border-slate-200 rounded-md text-slate-900 outline-none focus:border-indigo-500"
              >
                <option value="active">Active (Full Access)</option>
                <option value="trial">Trial Period</option>
                <option value="suspended">Suspended (Access Restricted)</option>
              </select>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
              <button
                onClick={() => setStatusChangeModalOpen(false)}
                className="px-3.5 py-1.5 text-xs font-medium bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveStatus}
                className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-md hover:bg-indigo-700 shadow-2xs"
              >
                Save Status
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
