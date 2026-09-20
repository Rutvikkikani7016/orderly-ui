import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import {
  fetchUsers,
  changeUserStatus,
  changeUserRole,
  setUsersSearch,
  setUsersRoleFilter,
  setUsersStatusFilter,
  setUsersPage,
  setUsersPageLimit,
} from '../../store/slices/superAdminSlice.js';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import CustomDropdown from '../../components/CustomDropdown.jsx';

export default function SuperAdminUsers() {
  const dispatch = useDispatch();
  const { users, usersPagination, usersFilter, loading } = useSelector((state) => state.superAdmin);
  const currentUser = useSelector((state) => state.auth.user);

  const [editRoleModalOpen, setEditRoleModalOpen] = useState(false);
  const [targetUser, setTargetUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState('staff');

  useEffect(() => {
    dispatch(fetchUsers());
  }, [dispatch, usersFilter.search, usersFilter.role, usersFilter.status, usersPagination.page, usersPagination.limit]);

  const handleToggleStatus = async (user) => {
    const nextStatus = user.status === 'active' ? 'inactive' : 'active';
    if (user.id === currentUser?.id && nextStatus === 'inactive') {
      toast.error('You cannot deactivate your own Super Admin account.');
      return;
    }

    try {
      await dispatch(changeUserStatus({ id: user.id, status: nextStatus })).unwrap();
      toast.success(`User '${user.fullName}' status changed to ${nextStatus}.`);
    } catch (err) {
      toast.error(err || 'Failed to update user status');
    }
  };

  const handleOpenRoleModal = (user) => {
    setTargetUser(user);
    setSelectedRole(user.role);
    setEditRoleModalOpen(true);
  };

  const handleSaveRole = async () => {
    if (!targetUser) return;
    try {
      await dispatch(changeUserRole({ id: targetUser.id, role: selectedRole })).unwrap();
      toast.success(`User role updated to '${selectedRole}'.`);
      setEditRoleModalOpen(false);
      setTargetUser(null);
    } catch (err) {
      toast.error(err || 'Failed to update role');
    }
  };

  const roleOptions = [
    { value: 'all', label: 'All Roles' },
    { value: 'super_admin', label: 'Super Admin' },
    { value: 'owner', label: 'Company Owner' },
    { value: 'admin', label: 'Company Admin' },
    { value: 'staff', label: 'Staff' },
  ];

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
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
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">System Users</h1>
          <p className="text-xs text-slate-500">
            Global directory of all platform administrators, company owners, and staff members
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
            {usersPagination.total} Total Users
          </span>
        </div>
      </div>

      {/* Toolbar & Filter Controls */}
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
                placeholder="Search user name, email, phone, company…"
                value={usersFilter.search}
                onChange={(e) => dispatch(setUsersSearch(e.target.value))}
                className="w-full h-9 pl-9 pr-3 text-xs bg-white border border-slate-200 text-slate-900 rounded-md outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Role Dropdown Filter */}
            <CustomDropdown
              value={usersFilter.role}
              onChange={(val) => dispatch(setUsersRoleFilter(val))}
              options={roleOptions}
              size="sm"
            />

            {/* Status Dropdown Filter */}
            <CustomDropdown
              value={usersFilter.status}
              onChange={(val) => dispatch(setUsersStatusFilter(val))}
              options={statusOptions}
              size="sm"
            />
          </div>

          <button
            onClick={() => dispatch(fetchUsers())}
            className="h-9 px-3 text-xs font-medium bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-md transition-colors"
          >
            Refresh List
          </button>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto border border-slate-100 rounded-lg">
          <table className="w-full text-left text-xs text-slate-800">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-3.5 py-2.5">User</th>
                <th className="px-3.5 py-2.5">Email / Mobile</th>
                <th className="px-3.5 py-2.5">Tenant Company</th>
                <th className="px-3.5 py-2.5">Role</th>
                <th className="px-3.5 py-2.5">Status</th>
                <th className="px-3.5 py-2.5">Joined Date</th>
                <th className="px-3.5 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-slate-400">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading user accounts…</span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-slate-400">
                    No users found matching the selected filters.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-3.5 py-2.5">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0">
                          {u.fullName?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block">{u.fullName}</span>
                          {u.id === currentUser?.id && (
                            <span className="text-[9px] font-semibold text-indigo-600">(Current Session)</span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-3.5 py-2.5">
                      <span className="font-mono text-slate-800 block text-[11px]">{u.email}</span>
                      <span className="text-[10px] text-slate-400">{u.mobile || 'No mobile'}</span>
                    </td>

                    <td className="px-3.5 py-2.5">
                      <span className="font-medium text-slate-800 block">{u.company?.companyName || 'Platform Headquarters'}</span>
                      {u.company && (
                        <span className="text-[10px] text-slate-400">Status: {u.company.status}</span>
                      )}
                    </td>

                    <td className="px-3.5 py-2.5">
                      <StatusBadge status={u.role} />
                    </td>

                    <td className="px-3.5 py-2.5">
                      <StatusBadge status={u.status} />
                    </td>

                    <td className="px-3.5 py-2.5 text-[11px] text-slate-500">
                      {new Date(u.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>

                    <td className="px-3.5 py-2.5 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => handleOpenRoleModal(u)}
                        className="px-2.5 py-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition-colors"
                      >
                        Edit Role
                      </button>
                      <button
                        onClick={() => handleToggleStatus(u)}
                        disabled={u.id === currentUser?.id}
                        className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-colors ${
                          u.status === 'active'
                            ? 'text-rose-600 hover:text-rose-800 hover:bg-rose-50'
                            : 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50'
                        } disabled:opacity-30`}
                      >
                        {u.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {usersPagination.total > 0 && (
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500">
            <div className="flex items-center space-x-3">
              <span>
                Page <strong className="text-slate-800">{usersPagination.page}</strong> of{' '}
                <strong className="text-slate-800">{usersPagination.totalPages}</strong> ({usersPagination.total} total)
              </span>
              <CustomDropdown
                value={usersPagination.limit}
                onChange={(val) => dispatch(setUsersPageLimit(parseInt(val, 10)))}
                options={pageSizeOptions}
                size="xs"
              />
            </div>
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => dispatch(setUsersPage(usersPagination.page - 1))}
                disabled={usersPagination.page <= 1}
                className="px-2.5 py-1 bg-white hover:bg-slate-50 disabled:opacity-40 rounded border border-slate-200 shadow-2xs"
              >
                &larr; Prev
              </button>
              <button
                onClick={() => dispatch(setUsersPage(usersPagination.page + 1))}
                disabled={usersPagination.page >= usersPagination.totalPages}
                className="px-2.5 py-1 bg-white hover:bg-slate-50 disabled:opacity-40 rounded border border-slate-200 shadow-2xs"
              >
                Next &rarr;
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Role Modal */}
      {editRoleModalOpen && targetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Change User Role</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Assign new access permissions to <strong>{targetUser.fullName}</strong> ({targetUser.email})
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <label className="block font-semibold text-slate-700">Assign Role</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full h-9 px-3 bg-white border border-slate-200 rounded-md text-slate-900 outline-none focus:border-indigo-500"
              >
                <option value="owner">Company Owner (Full Company Access)</option>
                <option value="admin">Company Admin (Operations & Orders)</option>
                <option value="staff">Staff (Limited Access)</option>
                <option value="super_admin">⚡ Super Admin (Global Platform Access)</option>
              </select>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
              <button
                onClick={() => setEditRoleModalOpen(false)}
                className="px-3.5 py-1.5 text-xs font-medium bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRole}
                className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-md hover:bg-indigo-700 shadow-2xs"
              >
                Save Role
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
