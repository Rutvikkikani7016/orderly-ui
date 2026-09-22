import React from 'react';

export default function ImportCatalogModal({
  isOpen,
  onClose,
  onSubmit,
  importPlatform,
  setImportPlatform,
  selectedFile,
  setSelectedFile,
  importing,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white border border-border rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 my-8 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h3 className="text-base font-bold text-ink">Import Product Catalog / Listing Sheet</h3>
            <p className="text-[11px] text-gray-500">
              Upload your Flipkart Excel export (.xls / .xlsx) or product CSV sheet
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-ink text-2xl font-bold leading-none p-1 transition-colors"
          >
            &times;
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 text-xs">
          {/* Platform Selector */}
          <div>
            <label className="block font-medium text-ink mb-1">File Format / Platform</label>
            <select
              value={importPlatform}
              onChange={(e) => setImportPlatform(e.target.value)}
              className="w-full h-9 px-3 bg-white border border-border rounded-lg text-ink text-xs outline-none focus:border-accent"
            >
              <option value="auto">Auto-Detect (Flipkart, Meesho, or Generic CSV)</option>
              <option value="flipkart">Flipkart Seller Listing Sheet (.xls / .xlsx)</option>
              <option value="meesho">Meesho Catalog Sheet</option>
              <option value="generic">OrderNest Master CSV Template</option>
            </select>
          </div>

          {/* Drag & Drop File Zone */}
          <div>
            <label className="block font-medium text-ink mb-1">Select Spreadsheet File</label>
            <div className="border-2 border-dashed border-gray-300 hover:border-accent rounded-xl p-5 text-center bg-gray-50/60 hover:bg-accent-light/10 transition-all cursor-pointer relative group">
              <input
                type="file"
                accept=".xls,.xlsx,.csv"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setSelectedFile(e.target.files[0]);
                  }
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
                <div className="w-10 h-10 rounded-full bg-accent/10 text-accent flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                {selectedFile ? (
                  <div>
                    <p className="font-bold text-ink text-xs">{selectedFile.name}</p>
                    <p className="text-[10px] text-gray-400">
                      {(selectedFile.size / 1024).toFixed(1)} KB • Click to change file
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="font-semibold text-ink text-xs">
                      Click to browse or drag & drop file here
                    </p>
                    <p className="text-[10px] text-gray-400">
                      Supports Flipkart .xls, Excel .xlsx, and .csv (up to 25MB)
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Information Callout */}
          <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl text-blue-900 text-[11px] space-y-1">
            <p className="font-semibold flex items-center space-x-1.5">
              <span>💡</span>
              <span>Flipkart Listing Sheet Auto-Mapping:</span>
            </p>
            <p className="text-[10px] text-blue-800 leading-relaxed">
              Upload the <strong>S_listing--ui--group...xls</strong> file directly from Flipkart Seller Hub. OrderNest will automatically parse FSNs, MRP, selling prices, HSN codes, and package dimensions!
            </p>
          </div>

          <div className="pt-2 border-t border-border flex items-center justify-end space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 bg-white hover:bg-gray-50 border border-border text-ink rounded-lg transition-colors font-medium text-xs shadow-2xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedFile || importing}
              className="px-4 py-2 bg-ink text-white hover:bg-black font-semibold rounded-lg transition-colors disabled:opacity-50 text-xs flex items-center space-x-1.5 shadow-xs"
            >
              {importing ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                  <span>Importing Catalog…</span>
                </>
              ) : (
                <span>Upload & Import</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
