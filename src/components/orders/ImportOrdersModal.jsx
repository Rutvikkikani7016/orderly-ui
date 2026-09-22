import React from 'react';

/**
 * ImportOrdersModal
 * Standalone modular modal dialog for uploading and importing sales order CSV exports
 * with auto-detection for Flipkart, Meesho, Amazon, Myntra, etc.
 */
export default function ImportOrdersModal({
  isOpen,
  onClose,
  onSubmit,
  importPlatform,
  setImportPlatform,
  activePlatforms = [],
  fileInputRef,
  handleFileChange,
  selectedFile,
  detectedPlatform,
  importing,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white border border-border rounded-xl max-w-lg w-full p-5 shadow-xl space-y-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h3 className="text-base font-bold text-ink">Import Orders CSV</h3>
            <p className="text-xs text-gray-500">Upload exported sales orders from your connected sales channels</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-ink text-lg font-bold p-1 rounded hover:bg-gray-100 transition-colors"
          >
            &times;
          </button>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="space-y-3.5 text-xs">
          {/* Channel Selector - Only connected platforms */}
          <div>
            <label className="block font-medium text-ink mb-1">Sales Channel</label>
            <select
              value={importPlatform}
              onChange={(e) => setImportPlatform(e.target.value)}
              className="w-full h-8 px-3 bg-white border border-border rounded-md text-ink text-xs outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            >
              <option value="auto">✨ Auto-detect Platform (Recommended)</option>
              {activePlatforms.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} Seller Portal (CSV)
                </option>
              ))}
            </select>
          </div>

          {/* Drag & Drop File Box */}
          <div>
            <label className="block font-medium text-ink mb-1">Select Order CSV File *</label>
            <input
              type="file"
              accept=".csv"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border hover:border-accent rounded-xl p-5 text-center cursor-pointer bg-surface/50 hover:bg-surface transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-accent-light text-accent border border-accent/20 flex items-center justify-center mx-auto mb-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>

              {selectedFile ? (
                <div className="space-y-0.5">
                  <p className="font-semibold text-ink text-xs">{selectedFile.name}</p>
                  <p className="text-[10px] text-gray-500">
                    {(selectedFile.size / 1024).toFixed(1)} KB &bull; Click to change
                  </p>
                  {detectedPlatform && (
                    <div className="pt-0.5">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        ✨ Detected: {detectedPlatform} Orders Export
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <p className="font-medium text-ink text-xs">
                    Click or drag & drop your order CSV file here
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Supports standard CSV exports from connected channels</p>
                </div>
              )}
            </div>
          </div>

          <div className="p-2.5 bg-blue-50/70 border border-blue-100 rounded-lg text-[10px] text-blue-900 leading-relaxed">
            💡 <strong>Auto-Detection Active:</strong> You can leave the platform on <em>Auto-detect</em>. Our system inspects the column headers and routes to your connected channel accordingly.
          </div>

          <div className="pt-2.5 border-t border-border flex items-center justify-end space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-white hover:bg-gray-50 border border-border text-ink rounded-md transition-colors font-medium text-xs shadow-2xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedFile || importing}
              className="px-3.5 py-1.5 bg-ink text-white hover:bg-black font-semibold rounded-md transition-colors disabled:opacity-50 flex items-center space-x-1.5 text-xs shadow-xs"
            >
              {importing && (
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              <span>{importing ? 'Processing Orders…' : 'Import Orders'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
