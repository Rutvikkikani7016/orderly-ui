import { useAuth } from '../context/AuthContext.jsx';

export default function Profile() {
  const { user, company } = useAuth();

  return (
    <div className="p-4 md:p-5 font-sans space-y-3.5 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-ink tracking-tight">Seller Profile</h1>
        <p className="text-[11px] text-gray-500">
          Your personal details and registered business account information
        </p>
      </div>

      {/* Profile Card */}
      <div className="bg-white border border-border rounded-xl p-4 shadow-xs space-y-4">
        <div className="flex items-center space-x-3.5 border-b border-border pb-4">
          <div className="w-12 h-12 rounded-full bg-accent-light border border-accent/20 flex items-center justify-center font-bold text-lg text-accent-dark">
            {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div>
            <h2 className="text-base font-bold text-ink">{user?.fullName || 'Seller Account'}</h2>
            <p className="text-[11px] text-gray-500">{user?.email}</p>
            <span className="inline-block mt-0.5 text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
              {user?.role || 'owner'}
            </span>
          </div>
        </div>

        {/* Company Details */}
        <div className="space-y-2.5">
          <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Business Information</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
            <div className="p-3 rounded-lg bg-surface border border-border">
              <span className="text-gray-500 text-[11px] block mb-0.5">Company Name</span>
              <span className="font-semibold text-ink text-xs">{company?.companyName || '—'}</span>
            </div>

            <div className="p-3 rounded-lg bg-surface border border-border">
              <span className="text-gray-500 text-[11px] block mb-0.5">GSTIN Number</span>
              <span className="font-mono font-semibold text-ink text-xs">{company?.gstin || 'Not specified'}</span>
            </div>

            <div className="p-3 rounded-lg bg-surface border border-border">
              <span className="text-gray-500 text-[11px] block mb-0.5">Business Type</span>
              <span className="font-semibold text-ink text-xs capitalize">{company?.businessType || 'E-Commerce Seller'}</span>
            </div>

            <div className="p-3 rounded-lg bg-surface border border-border">
              <span className="text-gray-500 text-[11px] block mb-0.5">Mobile Number</span>
              <span className="font-semibold text-ink text-xs">{user?.mobile || company?.companyPhone || '—'}</span>
            </div>

            <div className="p-3 rounded-lg bg-surface border border-border md:col-span-2">
              <span className="text-gray-500 text-[11px] block mb-0.5">Business Address</span>
              <span className="font-medium text-ink text-xs">{company?.businessAddress || 'Not specified'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
