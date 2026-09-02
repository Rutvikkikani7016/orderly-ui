export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-surface p-6">
      <div className="w-full max-w-4xl flex rounded-xl overflow-hidden border border-border shadow-sm">
        {/* Branding panel */}
        <div className="hidden md:flex flex-col justify-between w-2/5 bg-white p-10">
          <div>
            <div className="mb-10">
              <img src="/logo-full.png" alt="Orderly" className="h-8 object-contain" />
            </div>
            <p className="text-xl font-medium leading-snug mb-3">
              One dashboard for every order and every rupee.
            </p>
            <p className="text-sm text-gray-500 leading-relaxed">
              Sync orders from Flipkart, Amazon and Meesho, and know exactly
              what you'll get paid after every cancellation and return.
            </p>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              Real-time order sync across platforms
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              Settlement reconciliation, order by order
            </div>
          </div>
        </div>

        {/* Form panel */}
        <div className="w-full md:w-3/5 bg-white p-8 md:p-10">{children}</div>
      </div>
    </div>
  );
}
