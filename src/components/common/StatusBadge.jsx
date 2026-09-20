import React from 'react';

const STATUS_STYLES = {
  // Company & User Statuses
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  trial: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  suspended: 'bg-rose-50 text-rose-700 border-rose-200',
  inactive: 'bg-gray-100 text-gray-600 border-gray-200',
  // User Roles
  super_admin: 'bg-purple-50 text-purple-700 border-purple-200 font-bold',
  owner: 'bg-blue-50 text-blue-700 border-blue-200',
  admin: 'bg-sky-50 text-sky-700 border-sky-200',
  staff: 'bg-gray-50 text-gray-700 border-gray-200',
  // Orders
  delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  shipped: 'bg-blue-50 text-blue-700 border-blue-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
  returned: 'bg-rose-50 text-rose-700 border-rose-200',
  placed: 'bg-amber-50 text-amber-700 border-amber-200',
  // Platform statuses
  connected: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  disconnected: 'bg-gray-100 text-gray-500 border-gray-200',
};

export default function StatusBadge({ status, label, className = '' }) {
  const normStatus = (status || '').toLowerCase();
  const style = STATUS_STYLES[normStatus] || 'bg-gray-50 text-gray-700 border-gray-200';
  const displayLabel = label || status?.replace(/_/g, ' ') || 'Unknown';

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider border ${style} ${className}`}
    >
      {displayLabel}
    </span>
  );
}
