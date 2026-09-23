import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import {
  getProductionBatches,
  createProductionBatch,
  completeProductionBatch,
  getProductBom,
  saveProductBom,
  getRawMaterials,
} from '../api/manufacturing.js';
import { getProducts } from '../api/products.js';
import CustomDropdown from '../components/CustomDropdown.jsx';
import ProductSearchSelect from '../components/common/ProductSearchSelect.jsx';
import InfoTooltip from '../components/common/InfoTooltip.jsx';

export default function Manufacturing() {
  const [activeTab, setActiveTab] = useState('batches'); // 'batches' | 'bom'

  // Products & Raw Materials Master Data
  const [products, setProducts] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Batches state
  const [batches, setBatches] = useState([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [batchSearch, setBatchSearch] = useState('');
  const [batchStatusFilter, setBatchStatusFilter] = useState('all');

  // Modals
  const [isNewBatchModalOpen, setIsNewBatchModalOpen] = useState(false);
  const [isCompleteBatchModalOpen, setIsCompleteBatchModalOpen] = useState(false);
  const [selectedBatchForCompletion, setSelectedBatchForCompletion] = useState(null);
  const [showWorkflowGuide, setShowWorkflowGuide] = useState(true);

  // New Batch Form
  const [newBatchData, setNewBatchData] = useState({
    productId: '',
    quantityPlanned: 100,
    startDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // Complete Batch Form
  const [completeBatchData, setCompleteBatchData] = useState({
    quantityCompleted: '',
    quantityRejected: 0,
    completionDate: new Date().toISOString().split('T')[0],
  });

  // BOM Designer State
  const [selectedProductForBom, setSelectedProductForBom] = useState('');
  const [loadingBom, setLoadingBom] = useState(false);
  const [savingBom, setSavingBom] = useState(false);
  const [bomData, setBomData] = useState({
    cuttingLaborCost: 6,
    stitchingLaborCost: 18,
    printingEmbroideryCost: 15,
    finishingPackingCost: 4,
    otherOverheadCost: 5,
    items: [],
    notes: '',
  });

  // Simulator Selling Price & Channel Fee Preset
  const [simulatedPrice, setSimulatedPrice] = useState(0);
  const [platformPreset, setPlatformPreset] = useState('meesho'); // 'meesho' | 'amazon' | 'flipkart' | 'custom'
  const [customPlatformFeePercent, setCustomPlatformFeePercent] = useState(25);

  async function loadInitialData() {
    setLoadingInitial(true);
    try {
      const pData = await getProducts({ page: 1, limit: 100 });
      const prods = pData.products || [];
      setProducts(prods);
      if (prods.length > 0 && !selectedProductForBom) {
        setSelectedProductForBom(prods[0].id);
        setSimulatedPrice(parseFloat(prods[0].sellingPrice || 499));
      }
      const rmData = await getRawMaterials({ category: 'all' });
      setRawMaterials(rmData.rawMaterials || []);
    } catch (err) {
      toast.error('Failed to load products or raw materials');
    } finally {
      setLoadingInitial(false);
    }
  }

  async function loadBatches() {
    setLoadingBatches(true);
    try {
      const data = await getProductionBatches({});
      setBatches(data || []);
    } catch (err) {
      toast.error('Failed to load production batches');
    } finally {
      setLoadingBatches(false);
    }
  }

  async function loadBom(productId) {
    if (!productId) return;
    setLoadingBom(true);
    try {
      const prod = products.find((p) => p.id === productId);
      if (prod && prod.sellingPrice) {
        setSimulatedPrice(parseFloat(prod.sellingPrice));
      }

      const data = await getProductBom(productId);
      if (data) {
        setBomData({
          cuttingLaborCost: data.cuttingLaborCost || 0,
          stitchingLaborCost: data.stitchingLaborCost || 0,
          printingEmbroideryCost: data.printingEmbroideryCost || 0,
          finishingPackingCost: data.finishingPackingCost || 0,
          otherOverheadCost: data.otherOverheadCost || 0,
          items:
            data.items && data.items.length > 0
              ? data.items.map((it) => ({
                  rawMaterialId: it.rawMaterialId,
                  quantityRequired: it.quantityRequired,
                  wastagePercent: it.wastagePercent,
                }))
              : [{ rawMaterialId: '', quantityRequired: 1, wastagePercent: 0 }],
          notes: data.notes || '',
        });
      } else {
        // Sensible default starter recipe for garment manufacturing
        setBomData({
          cuttingLaborCost: 6,
          stitchingLaborCost: 18,
          printingEmbroideryCost: 15,
          finishingPackingCost: 4,
          otherOverheadCost: 5,
          items: [
            {
              rawMaterialId: rawMaterials[0]?.id || '',
              quantityRequired: 0.5,
              wastagePercent: 5,
            },
          ],
          notes: '',
        });
      }
    } catch (err) {
      toast.error('Failed to load BOM');
    } finally {
      setLoadingBom(false);
    }
  }

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (activeTab === 'batches') {
      loadBatches();
    } else if (activeTab === 'bom' && selectedProductForBom) {
      loadBom(selectedProductForBom);
    }
  }, [activeTab, selectedProductForBom]);

  // Handle New Batch Creation
  async function handleCreateBatch(e) {
    e.preventDefault();
    if (!newBatchData.productId || !newBatchData.quantityPlanned) {
      toast.error('Please select a product and planned quantity');
      return;
    }
    try {
      await createProductionBatch(newBatchData);
      toast.success('Production batch launched successfully!');
      setIsNewBatchModalOpen(false);
      setNewBatchData({
        productId: '',
        quantityPlanned: 100,
        startDate: new Date().toISOString().split('T')[0],
        notes: '',
      });
      loadBatches();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create batch');
    }
  }

  // Handle Batch Completion
  async function handleCompleteBatchSubmit(e) {
    e.preventDefault();
    if (!selectedBatchForCompletion) return;
    try {
      await completeProductionBatch(selectedBatchForCompletion.id, completeBatchData);
      toast.success('Batch completed! Raw materials deducted and finished goods added to inventory.');
      setIsCompleteBatchModalOpen(false);
      setSelectedBatchForCompletion(null);
      loadBatches();
      loadInitialData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete batch');
    }
  }

  // Live BOM Calculations
  const activeProduct = products.find((p) => p.id === selectedProductForBom);

  const rawMaterialLinesTotal = bomData.items.reduce((sum, line) => {
    const rm = rawMaterials.find((r) => r.id === line.rawMaterialId);
    if (!rm) return sum;
    const qty = parseFloat(line.quantityRequired || 0);
    const waste = parseFloat(line.wastagePercent || 0);
    const effQty = qty * (1 + waste / 100);
    const rate = parseFloat(rm.averageCostPerUnit || 0);
    return sum + effQty * rate;
  }, 0);

  const totalLaborOverheads =
    parseFloat(bomData.cuttingLaborCost || 0) +
    parseFloat(bomData.stitchingLaborCost || 0) +
    parseFloat(bomData.printingEmbroideryCost || 0) +
    parseFloat(bomData.finishingPackingCost || 0) +
    parseFloat(bomData.otherOverheadCost || 0);

  const totalCOGM = rawMaterialLinesTotal + totalLaborOverheads;

  // Platform deduction %
  const effectivePlatformRate =
    platformPreset === 'meesho'
      ? 0.18
      : platformPreset === 'amazon'
      ? 0.28
      : platformPreset === 'flipkart'
      ? 0.26
      : customPlatformFeePercent / 100;

  const currentSellingPrice = simulatedPrice > 0 ? simulatedPrice : activeProduct?.sellingPrice || 0;
  const estimatedPlatformFees = currentSellingPrice > 0 ? currentSellingPrice * effectivePlatformRate + 45 : 0;
  const estimatedNetProfit = currentSellingPrice - estimatedPlatformFees - totalCOGM;
  const netMarginPercent =
    currentSellingPrice > 0 ? ((estimatedNetProfit / currentSellingPrice) * 100).toFixed(1) : 0;

  async function handleSaveBom(e) {
    e.preventDefault();
    if (!selectedProductForBom) return;
    setSavingBom(true);
    try {
      await saveProductBom(selectedProductForBom, bomData);
      toast.success(
        `BOM saved! Cost of Goods Manufactured updated to ₹${totalCOGM.toFixed(2)} / unit`
      );
      loadInitialData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save BOM');
    } finally {
      setSavingBom(false);
    }
  }

  // Filtered batches
  const filteredBatches = useMemo(() => {
    return batches.filter((b) => {
      const matchesStatus =
        batchStatusFilter === 'all'
          ? true
          : batchStatusFilter === 'completed'
          ? b.status === 'completed'
          : b.status !== 'completed';

      if (!batchSearch.trim()) return matchesStatus;
      const q = batchSearch.toLowerCase().trim();
      const num = (b.batchNumber || '').toLowerCase();
      const sku = (b.product?.internalSku || '').toLowerCase();
      const title = (b.product?.title || '').toLowerCase();
      return matchesStatus && (num.includes(q) || sku.includes(q) || title.includes(q));
    });
  }, [batches, batchStatusFilter, batchSearch]);

  // Batch Metrics
  const batchMetrics = useMemo(() => {
    const total = batches.length;
    const wip = batches.filter((b) => b.status !== 'completed').length;
    const completed = batches.filter((b) => b.status === 'completed').length;
    const totalProduced = batches.reduce((sum, b) => sum + parseInt(b.quantityCompleted || 0, 10), 0);
    return { total, wip, completed, totalProduced };
  }, [batches]);

  return (
    <div className="h-full flex flex-col p-3 md:p-3.5 font-sans space-y-2.5 max-w-full overflow-hidden">
      {/* Top Header */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-2.5">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
              Manufacturing Module
            </span>
            <h1 className="text-lg font-bold text-ink tracking-tight flex items-center gap-1.5">
              <span>Manufacturing & True Costing</span>
              <InfoTooltip
                title="Manufacturing & True Costing"
                text="Turn raw materials (cloth, trims, packaging) into finished goods with Bill of Materials (BOM). Auto-deduct inventory when batches complete, and calculate your true net cash profit per piece after all marketplace commissions and shipping."
              />
            </h1>
          </div>
          <p className="text-[10.5px] text-gray-500">
            Bill of Materials (BOM recipes), factory floor WIP batches, automated raw stock deduction & true net profitability
          </p>
        </div>

        {/* Tab Switcher & Action Buttons */}
        <div className="flex items-center space-x-2">
          {/* Refresh Button */}
          <button
            onClick={() => {
              if (activeTab === 'batches') loadBatches();
              else if (selectedProductForBom) loadBom(selectedProductForBom);
              loadInitialData();
              toast.success('Data refreshed');
            }}
            disabled={loadingBatches || loadingBom}
            className="h-7 px-2.5 text-[11px] font-semibold bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-ink hover:border-gray-400 rounded-md transition-all flex items-center space-x-1.5 shadow-2xs group cursor-pointer"
            title="Refresh manufacturing data"
          >
            <svg
              className={`w-3.5 h-3.5 text-gray-500 group-hover:text-ink ${
                loadingBatches || loadingBom ? 'animate-spin text-accent' : 'group-hover:rotate-180 transition-transform duration-300'
              }`}
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
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <div className="bg-gray-100 p-0.5 rounded-lg flex items-center space-x-1 border border-border">
            <button
              onClick={() => setActiveTab('batches')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'batches' ? 'bg-white text-ink shadow-2xs' : 'text-gray-500 hover:text-ink'
              }`}
            >
              <span>🏭 Production Batches</span>
              <span className="text-[10px] bg-gray-200 text-gray-700 font-bold px-1.5 py-0.2 rounded-full">
                {batches.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('bom')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'bom' ? 'bg-white text-ink shadow-2xs' : 'text-gray-500 hover:text-ink'
              }`}
            >
              <span>📐 Product BOM & Profit Simulator</span>
              <InfoTooltip
                title="What is BOM?"
                text="BOM (Bill of Materials) is the exact recipe for 1 finished product. It lists the meters of fabric, thread spools, polybags, plus direct worker stitching & cutting labor required."
              />
            </button>
          </div>

          {activeTab === 'batches' && (
            <button
              onClick={() => setIsNewBatchModalOpen(true)}
              className="h-7 px-3 text-[11px] font-semibold bg-ink text-white hover:bg-black rounded-md transition-colors flex items-center space-x-1 shadow-xs cursor-pointer"
            >
              <span className="text-xs font-bold">+</span>
              <span>Launch Batch</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: PRODUCTION BATCHES VIEW */}
      {/* ========================================================================= */}
      {activeTab === 'batches' && (
        <div className="flex-1 min-h-0 flex flex-col space-y-2.5 overflow-hidden">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
            <div className="bg-white border border-border p-2.5 rounded-lg shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold text-gray-500 uppercase flex items-center">
                  Total Batches
                  <InfoTooltip text="Total production runs created in your factory history." />
                </p>
                <p className="text-lg font-bold text-ink">{batchMetrics.total}</p>
              </div>
              <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
                📋
              </span>
            </div>

            <div className="bg-white border border-border p-2.5 rounded-lg shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold text-amber-700 uppercase flex items-center">
                  Work-In-Progress (WIP)
                  <InfoTooltip text="Batches currently being cut, stitched, or printed on the factory floor. Raw materials have not yet been deducted." />
                </p>
                <p className="text-lg font-bold text-amber-700">{batchMetrics.wip}</p>
              </div>
              <span className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-sm">
                ⚙️
              </span>
            </div>

            <div className="bg-white border border-border p-2.5 rounded-lg shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold text-emerald-700 uppercase flex items-center">
                  Completed Lots
                  <InfoTooltip text="Finished production batches whose raw materials were consumed and finished stock credited to sellable inventory." />
                </p>
                <p className="text-lg font-bold text-emerald-700">{batchMetrics.completed}</p>
              </div>
              <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm">
                ✅
              </span>
            </div>

            <div className="bg-white border border-border p-2.5 rounded-lg shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold text-gray-500 uppercase flex items-center">
                  Total Units Produced
                  <InfoTooltip text="Cumulative count of all finished garments/products manufactured and added to warehouse inventory." />
                </p>
                <p className="text-lg font-bold text-ink">{batchMetrics.totalProduced.toLocaleString()}</p>
              </div>
              <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                📦
              </span>
            </div>
          </div>

          {/* Workflow Guide Banner */}
          {showWorkflowGuide && (
            <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-lg p-2.5 shrink-0 flex items-center justify-between text-xs text-indigo-950">
              <div className="flex items-center space-x-2">
                <span className="text-base">🚀</span>
                <div>
                  <span className="font-bold">How Production Batches Work: </span>
                  <span className="text-[11px] text-indigo-900">
                    <strong>1. Launch Batch</strong> (plans quantity to cut) → <strong>2. Factory Floor Cut & Stitch (WIP)</strong> →{' '}
                    <strong>3. Click "Complete"</strong> (Orderly automatically consumes required cloth/threads from Raw Material inventory and adds finished units to your Sellable Stock!)
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowWorkflowGuide(false)}
                className="text-indigo-400 hover:text-indigo-700 font-bold ml-2 text-sm leading-none cursor-pointer"
                title="Dismiss guide"
              >
                &times;
              </button>
            </div>
          )}

          {/* Main Batches Card */}
          <div className="flex-1 min-h-0 flex flex-col bg-white border border-border rounded-lg overflow-hidden shadow-xs">
            {/* Filter Bar */}
            <div className="shrink-0 py-2 px-3 border-b border-border bg-gray-50/60 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    placeholder="Search by Batch #, SKU or Title..."
                    value={batchSearch}
                    onChange={(e) => setBatchSearch(e.target.value)}
                    className="w-full h-7 pl-7 pr-6 bg-white border border-border rounded-md text-xs text-ink outline-none focus:border-accent"
                  />
                  <svg
                    className="w-3.5 h-3.5 text-gray-400 absolute left-2 top-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  {batchSearch && (
                    <button
                      onClick={() => setBatchSearch('')}
                      className="absolute right-2 top-1.5 text-gray-400 hover:text-ink text-xs font-bold cursor-pointer"
                    >
                      &times;
                    </button>
                  )}
                </div>

                <div className="flex items-center space-x-1 bg-white border border-border rounded-md p-0.5">
                  <button
                    onClick={() => setBatchStatusFilter('all')}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${
                      batchStatusFilter === 'all' ? 'bg-gray-100 text-ink' : 'text-gray-500 hover:text-ink'
                    }`}
                  >
                    All ({batches.length})
                  </button>
                  <button
                    onClick={() => setBatchStatusFilter('wip')}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${
                      batchStatusFilter === 'wip' ? 'bg-amber-100 text-amber-800' : 'text-gray-500 hover:text-ink'
                    }`}
                  >
                    WIP ({batchMetrics.wip})
                  </button>
                  <button
                    onClick={() => setBatchStatusFilter('completed')}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${
                      batchStatusFilter === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'text-gray-500 hover:text-ink'
                    }`}
                  >
                    Completed ({batchMetrics.completed})
                  </button>
                </div>
              </div>

              <span className="text-[11px] text-gray-400">
                Showing {filteredBatches.length} of {batches.length} batches
              </span>
            </div>

            {/* Scrollable Table */}
            <div className="flex-1 min-h-0 overflow-auto w-full">
              <table className="w-full min-w-[950px] text-left text-xs text-ink">
                <thead className="sticky top-0 z-10 bg-gray-50 text-gray-500 uppercase text-[9px] font-bold tracking-wider border-b border-border shadow-2xs">
                  <tr>
                    <th className="px-2.5 py-2 text-center w-10 bg-gray-50">#</th>
                    <th className="px-3 py-2 min-w-[120px] bg-gray-50">Batch Number</th>
                    <th className="px-3 py-2 min-w-[220px] bg-gray-50">Master Product SKU</th>
                    <th className="px-3 py-2 min-w-[160px] bg-gray-50">
                      <span className="flex items-center">
                        Production Progress
                        <InfoTooltip text="Ratio of planned units vs actual finished units inspected and approved." />
                      </span>
                    </th>
                    <th className="px-3 py-2 text-center min-w-[90px] bg-gray-50">
                      <span className="flex items-center justify-center">
                        Scrap / Defect
                        <InfoTooltip text="Pieces rejected due to stitching defects, fabric stains, or printing issues." />
                      </span>
                    </th>
                    <th className="px-3 py-2 min-w-[110px] bg-gray-50">
                      <span className="flex items-center">
                        Est. Unit Cost
                        <InfoTooltip text="Manufacturing cost per finished piece (Raw Materials + Labor) calculated from your BOM recipe." />
                      </span>
                    </th>
                    <th className="px-3 py-2 min-w-[120px] bg-gray-50">Start Date</th>
                    <th className="px-3 py-2 text-center min-w-[110px] bg-gray-50">Status</th>
                    <th className="px-3 py-2 text-right w-28 bg-gray-50">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loadingBatches ? (
                    <tr>
                      <td colSpan="9" className="px-4 py-8 text-center text-gray-500">
                        <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        <span className="text-xs">Loading production batches…</span>
                      </td>
                    </tr>
                  ) : filteredBatches.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="px-4 py-8 text-center text-gray-500">
                        <p className="font-semibold text-ink text-xs mb-0.5">No production batches found</p>
                        <p className="text-gray-400 text-[11px] mb-3">
                          Launch a batch to manufacture T-shirts or items from your raw material inventory.
                        </p>
                        <button
                          onClick={() => setIsNewBatchModalOpen(true)}
                          className="px-3 py-1.5 text-xs font-semibold bg-ink text-white rounded-md hover:bg-black cursor-pointer shadow-xs"
                        >
                          + Launch First Batch
                        </button>
                      </td>
                    </tr>
                  ) : (
                    filteredBatches.map((b, idx) => {
                      const planned = parseInt(b.quantityPlanned || 0, 10);
                      const done = parseInt(b.quantityCompleted || 0, 10);
                      const pct = planned > 0 ? Math.min(100, Math.round((done / planned) * 100)) : 0;
                      const isCompleted = b.status === 'completed';

                      return (
                        <tr key={b.id} className="hover:bg-blue-50/20 transition-colors">
                          <td className="px-2.5 py-1.5 text-center text-[10.5px] font-mono text-gray-400">
                            {idx + 1}
                          </td>
                          <td className="px-3 py-1.5 font-mono text-ink font-bold text-[11px]">
                            {b.batchNumber}
                          </td>
                          <td className="px-3 py-1.5 font-medium text-ink">
                            <span className="font-mono text-xs font-bold block text-ink">
                              {b.product?.internalSku || '—'}
                            </span>
                            <span className="text-[10.5px] text-gray-500 truncate max-w-xs block" title={b.product?.title}>
                              {b.product?.title}
                            </span>
                          </td>
                          <td className="px-3 py-1.5">
                            <div className="space-y-1">
                              <div className="flex justify-between text-[10.5px] font-mono">
                                <span className={isCompleted ? 'text-emerald-700 font-bold' : 'text-gray-600'}>
                                  {done} / {planned} units
                                </span>
                                <span className="font-semibold text-gray-500">{pct}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full transition-all duration-300 ${
                                    isCompleted ? 'bg-emerald-600' : pct > 0 ? 'bg-amber-500' : 'bg-gray-300'
                                  }`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-1.5 text-center">
                            {b.quantityRejected > 0 ? (
                              <span className="text-rose-600 font-mono font-semibold text-[11px] bg-rose-50 px-1.5 py-0.5 rounded">
                                {b.quantityRejected} pcs
                              </span>
                            ) : (
                              <span className="text-gray-400 text-[11px]">0</span>
                            )}
                          </td>
                          <td className="px-3 py-1.5 font-mono text-ink font-semibold">
                            ₹{parseFloat(b.unitCost || 0).toFixed(2)}
                          </td>
                          <td className="px-3 py-1.5 text-gray-500 text-[11px] font-mono">
                            {b.startDate ? new Date(b.startDate).toLocaleDateString() : '—'}
                          </td>
                          <td className="px-3 py-1.5 text-center">
                            <span
                              className={`inline-block text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${
                                isCompleted
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              {isCompleted ? 'Completed' : 'In Progress'}
                            </span>
                          </td>
                          <td className="px-3 py-1.5 text-right">
                            {!isCompleted ? (
                              <button
                                onClick={() => {
                                  setSelectedBatchForCompletion(b);
                                  setCompleteBatchData({
                                    quantityCompleted: b.quantityPlanned,
                                    quantityRejected: 0,
                                    completionDate: new Date().toISOString().split('T')[0],
                                  });
                                  setIsCompleteBatchModalOpen(true);
                                }}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10.5px] font-semibold transition-colors shadow-2xs cursor-pointer"
                                title="Finish this batch and credit stock"
                              >
                                ✓ Complete Batch
                              </button>
                            ) : (
                              <span className="text-gray-400 text-[10.5px] font-medium">Stock Credited</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PRODUCT BOM & TRUE PROFITABILITY DESIGNER */}
      {/* ========================================================================= */}
      {activeTab === 'bom' && (
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 overflow-y-auto">
          {/* Left Form: Recipe Builder */}
          <div className="lg:col-span-8 bg-white border border-border rounded-lg p-3.5 space-y-3.5 shadow-xs flex flex-col">
            {/* Top Product Selector & Comprehensive Product Details Card */}
            <div className="bg-slate-50/80 border border-border rounded-lg p-3 space-y-3">
              {/* Product Selector Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs font-bold text-ink flex items-center">
                    Select Finished Product:
                  </span>
                  <InfoTooltip
                    title="Finished Product"
                    text="Choose the master garment or product SKU to formulate the Bill of Materials (BOM) recipe for. Saving updates its Master Cost Price."
                  />
                </div>
                <div className="w-full sm:w-96">
                  <ProductSearchSelect
                    products={products}
                    value={selectedProductForBom}
                    onChange={(id) => setSelectedProductForBom(id)}
                    placeholder="Search product by SKU or Title..."
                    showPrice={true}
                  />
                </div>
              </div>

              {/* Selected Finished Product Details Card */}
              {activeProduct ? (
                <div className="pt-2.5 border-t border-border/80 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-2.5 rounded-md border border-gray-200/90 shadow-2xs">
                  {/* Left: Product Identity & Badges */}
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 font-bold text-base shadow-2xs">
                      👗
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        <h3 className="text-xs font-bold text-ink leading-tight">
                          {activeProduct.title || 'Untitled Product'}
                        </h3>
                        {activeProduct.category && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-semibold">
                            {activeProduct.category}
                          </span>
                        )}
                        {activeProduct.color && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-gray-100 text-gray-600 font-medium">
                            Color: {activeProduct.color}
                          </span>
                        )}
                        {activeProduct.size && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-gray-100 text-gray-600 font-medium">
                            Size: {activeProduct.size}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-gray-500">
                        <span className="text-gray-400 font-medium">Internal SKU:</span>
                        <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-800 font-mono font-bold text-[11px] border border-gray-200 select-all">
                          {activeProduct.internalSku || activeProduct.sku || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Key Financial & Inventory Metrics */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {/* Warehouse Available Stock */}
                    <div className="px-2.5 py-1 rounded bg-blue-50/70 border border-blue-200/80 text-center min-w-[80px]">
                      <span className="block text-[9px] uppercase font-bold text-blue-600 leading-tight">
                        Current Stock
                      </span>
                      <span className="text-xs font-bold text-blue-800 font-mono">
                        {activeProduct.stock ?? 0} <span className="text-[10px] font-normal text-blue-600">pcs</span>
                      </span>
                    </div>

                    {/* Master Cost Price */}
                    <div className="px-2.5 py-1 rounded bg-gray-50 border border-border text-center min-w-[85px]">
                      <span className="block text-[9px] uppercase font-bold text-gray-500 leading-tight">
                        Master Cost
                      </span>
                      <span className="text-xs font-bold text-ink font-mono">
                        ₹{parseFloat(activeProduct.costPrice || 0).toFixed(2)}
                      </span>
                    </div>

                    {/* Marketplace Selling Price */}
                    <div className="px-2.5 py-1 rounded bg-emerald-50/80 border border-emerald-200 text-center min-w-[90px]">
                      <span className="block text-[9px] uppercase font-bold text-emerald-700 leading-tight">
                        Selling Price
                      </span>
                      <span className="text-xs font-bold text-emerald-800 font-mono">
                        ₹{parseFloat(activeProduct.sellingPrice || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="pt-2 text-[11.5px] text-amber-700 bg-amber-50/60 px-3 py-2 rounded border border-amber-200 flex items-center gap-1.5">
                  <span>⚠️</span>
                  <span>Please choose a product from the dropdown above to view its details and formulate its BOM recipe.</span>
                </div>
              )}
            </div>

            <form onSubmit={handleSaveBom} className="space-y-4 text-xs flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                {/* 1. Raw Materials Consumption */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <h4 className="font-bold text-ink text-xs flex items-center">
                      <span>1. Raw Materials Ingredients (Fabric, Rib, Thread, Packaging)</span>
                      <InfoTooltip
                        title="Raw Material Consumption"
                        text="Specify how many meters/kg of fabric, thread spools, or packaging items are consumed to produce 1 single finished garment."
                        formula="Effective Qty = Qty Required × (1 + Wastage% / 100)"
                      />
                    </h4>
                    <button
                      type="button"
                      onClick={() =>
                        setBomData({
                          ...bomData,
                          items: [
                            ...bomData.items,
                            { rawMaterialId: '', quantityRequired: 1, wastagePercent: 0 },
                          ],
                        })
                      }
                      className="text-[11px] font-semibold text-accent hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <span>+ Add Material Ingredient</span>
                    </button>
                  </div>

                  <div className="border border-border rounded-lg p-2.5 bg-gray-50/60 space-y-2">
                    {/* Column Headers */}
                    <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-gray-500 uppercase px-1">
                      <div className="col-span-5 flex items-center">
                        Material Ingredient
                        <InfoTooltip text="Raw material loaded from your Raw Materials Master." />
                      </div>
                      <div className="col-span-2 text-center flex items-center justify-center">
                        Qty / Piece
                        <InfoTooltip text="Quantity needed per finished garment (e.g. 0.45 meters of fabric)." />
                      </div>
                      <div className="col-span-2 text-center flex items-center justify-center">
                        Wastage %
                        <InfoTooltip
                          title="Cutting Wastage"
                          text="Shrinkage or scrap off-cuts during pattern cutting. Example: 5% adds 5% extra cloth requirement."
                        />
                      </div>
                      <div className="col-span-2 text-right flex items-center justify-end">
                        Line Cost (₹)
                      </div>
                      <div className="col-span-1 text-center">Del</div>
                    </div>

                    {bomData.items.map((line, idx) => {
                      const matchedRm = rawMaterials.find((r) => r.id === line.rawMaterialId);
                      const lineRate = matchedRm ? parseFloat(matchedRm.averageCostPerUnit || 0) : 0;
                      const lineTotal =
                        lineRate *
                        parseFloat(line.quantityRequired || 0) *
                        (1 + parseFloat(line.wastagePercent || 0) / 100);

                      return (
                        <div
                          key={idx}
                          className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded-md border border-border/80 shadow-2xs text-xs"
                        >
                          <div className="col-span-5">
                            <select
                              value={line.rawMaterialId}
                              onChange={(e) => {
                                const newItems = [...bomData.items];
                                newItems[idx].rawMaterialId = e.target.value;
                                setBomData({ ...bomData, items: newItems });
                              }}
                              className="w-full h-8 px-2 bg-white border border-border rounded text-xs outline-none focus:border-accent capitalize"
                              required
                            >
                              <option value="">Select Material Ingredient...</option>
                              {rawMaterials.map((rm) => (
                                <option key={rm.id} value={rm.id}>
                                  {rm.name} (Rate: ₹{parseFloat(rm.averageCostPerUnit || 0).toFixed(2)} / {rm.unitOfMeasure})
                                </option>
                              ))}
                            </select>
                            {matchedRm && (
                              <div className="flex items-center justify-between text-[9.5px] text-gray-500 mt-0.5 px-0.5">
                                <span>Avg Rate: ₹{lineRate.toFixed(2)}/{matchedRm.unitOfMeasure}</span>
                                <span className={matchedRm.currentStock <= 10 ? 'text-amber-600 font-semibold' : 'text-emerald-700'}>
                                  Stock: {matchedRm.currentStock} {matchedRm.unitOfMeasure}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="col-span-2">
                            <input
                              type="number"
                              step="0.001"
                              placeholder="0.00"
                              value={line.quantityRequired}
                              onChange={(e) => {
                                const newItems = [...bomData.items];
                                newItems[idx].quantityRequired = e.target.value;
                                setBomData({ ...bomData, items: newItems });
                              }}
                              className="w-full h-8 px-2 bg-white border border-border rounded text-xs font-mono text-center"
                              title="Required per finished piece"
                              required
                            />
                          </div>
                          <div className="col-span-2">
                            <input
                              type="number"
                              step="0.5"
                              placeholder="0%"
                              value={line.wastagePercent}
                              onChange={(e) => {
                                const newItems = [...bomData.items];
                                newItems[idx].wastagePercent = e.target.value;
                                setBomData({ ...bomData, items: newItems });
                              }}
                              className="w-full h-8 px-2 bg-white border border-border rounded text-xs font-mono text-center"
                              title="Cutting wastage / shrinkage %"
                            />
                          </div>
                          <div className="col-span-2 font-mono text-ink font-bold text-right text-xs">
                            ₹{lineTotal.toFixed(2)}
                          </div>
                          <div className="col-span-1 text-center">
                            {bomData.items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const newItems = bomData.items.filter((_, i) => i !== idx);
                                  setBomData({ ...bomData, items: newItems });
                                }}
                                className="w-6 h-6 rounded hover:bg-rose-50 text-rose-500 hover:text-rose-700 font-bold transition-colors cursor-pointer"
                                title="Remove ingredient"
                              >
                                &times;
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    <div className="border-t border-border/80 pt-2 flex justify-between font-bold text-xs text-ink px-2">
                      <span className="text-gray-700">Total Direct Materials Cost:</span>
                      <span className="font-mono text-emerald-700 text-sm">
                        ₹{rawMaterialLinesTotal.toFixed(2)} / piece
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Direct Labor & Operational Overheads */}
                <div>
                  <h4 className="font-bold text-ink text-xs mb-1.5 flex items-center">
                    <span>2. Direct Labor & Operational Overheads (Per Piece)</span>
                    <InfoTooltip
                      title="Labor & Factory Overheads"
                      text="Worker piece-rate stitching, cutting masters, iron packing, and allocated factory utility expenses per unit."
                    />
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    <div>
                      <label className="block text-[11px] text-gray-500 mb-1 flex items-center">
                        <span>Pattern Cutting (₹)</span>
                        <InfoTooltip text="Piece rate paid to cutting master per garment." />
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={bomData.cuttingLaborCost}
                        onChange={(e) => setBomData({ ...bomData, cuttingLaborCost: e.target.value })}
                        className="w-full h-8 px-2 bg-white border border-border rounded font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-500 mb-1 flex items-center">
                        <span>Stitching / Sew (₹)</span>
                        <InfoTooltip text="Tailor sewing and overlocking labor per piece." />
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={bomData.stitchingLaborCost}
                        onChange={(e) => setBomData({ ...bomData, stitchingLaborCost: e.target.value })}
                        className="w-full h-8 px-2 bg-white border border-border rounded font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-500 mb-1 flex items-center">
                        <span>Printing / DTF (₹)</span>
                        <InfoTooltip text="Screen print, vinyl, DTF, or embroidery cost per piece." />
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={bomData.printingEmbroideryCost}
                        onChange={(e) => setBomData({ ...bomData, printingEmbroideryCost: e.target.value })}
                        className="w-full h-8 px-2 bg-white border border-border rounded font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-500 mb-1 flex items-center">
                        <span>Finishing & Iron (₹)</span>
                        <InfoTooltip text="Thread trimming, steam press, tag pinning, and bagging labor." />
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={bomData.finishingPackingCost}
                        onChange={(e) => setBomData({ ...bomData, finishingPackingCost: e.target.value })}
                        className="w-full h-8 px-2 bg-white border border-border rounded font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-500 mb-1 flex items-center">
                        <span>Overheads (₹)</span>
                        <InfoTooltip text="Allocated factory electricity, space rent, needle breakage reserve." />
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={bomData.otherOverheadCost}
                        onChange={(e) => setBomData({ ...bomData, otherOverheadCost: e.target.value })}
                        className="w-full h-8 px-2 bg-white border border-border rounded font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center bg-gray-50/80 p-2 rounded border border-border mt-2 text-xs">
                    <span className="text-gray-600 font-medium">Labor & Overheads Subtotal:</span>
                    <span className="font-mono font-bold text-ink">₹{totalLaborOverheads.toFixed(2)} / piece</span>
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="pt-3 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">True Cost of Goods Manufactured (COGM):</span>
                  <span className="text-base font-extrabold font-mono text-ink">
                    ₹{totalCOGM.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-gray-400">/ piece</span>
                </div>

                <button
                  type="submit"
                  disabled={savingBom}
                  className="px-4 py-2 bg-ink text-white hover:bg-black font-semibold rounded-md shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  <span>💾</span>
                  <span>{savingBom ? 'Saving Recipe...' : 'Save BOM & Update Cost Price'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right Card: True Profitability Analysis & Simulator */}
          <div className="lg:col-span-4 space-y-3 flex flex-col">
            <div className="bg-white border border-border rounded-lg p-4 shadow-xs space-y-3.5 flex-1">
              <div className="border-b border-border pb-2.5 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-ink text-xs flex items-center">
                    <span>True Net Profitability Simulator</span>
                    <InfoTooltip
                      title="Net Cash Profit"
                      text="Real profitability after subtracting both your factory manufacturing cost and marketplace deductions (commissions, payment gateway fees, return shipping reserve)."
                    />
                  </h3>
                  <p className="text-[10.5px] text-gray-500">Live unit economics based on this BOM recipe</p>
                </div>
                <span className="text-lg">💰</span>
              </div>

              {/* Interactive Selling Price Simulator Input */}
              <div className="bg-gray-50 p-2.5 rounded-lg border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-ink flex items-center">
                    Marketplace Selling Price (₹)
                    <InfoTooltip text="Test different selling prices on Meesho, Flipkart, or Amazon to see how your profit margin shifts in real time." />
                  </label>
                  <span className="text-[10px] font-mono text-gray-400">Interactive</span>
                </div>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-xs font-bold text-gray-400">₹</span>
                  <input
                    type="number"
                    step="1"
                    value={simulatedPrice}
                    onChange={(e) => setSimulatedPrice(parseFloat(e.target.value) || 0)}
                    placeholder="Enter selling price"
                    className="w-full h-8 pl-6 pr-3 bg-white border border-gray-300 rounded text-xs font-mono font-bold text-ink outline-none focus:border-accent"
                  />
                </div>

                {/* Preset Marketplace Fee Selector */}
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1 font-semibold">
                    Simulate Platform Fees:
                  </label>
                  <div className="grid grid-cols-4 gap-1 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setPlatformPreset('meesho')}
                      className={`py-1 rounded font-semibold border cursor-pointer ${
                        platformPreset === 'meesho'
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      Meesho (~18%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlatformPreset('flipkart')}
                      className={`py-1 rounded font-semibold border cursor-pointer ${
                        platformPreset === 'flipkart'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      Flipkart (~26%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlatformPreset('amazon')}
                      className={`py-1 rounded font-semibold border cursor-pointer ${
                        platformPreset === 'amazon'
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      Amazon (~28%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlatformPreset('custom')}
                      className={`py-1 rounded font-semibold border cursor-pointer ${
                        platformPreset === 'custom'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      Custom %
                    </button>
                  </div>

                  {platformPreset === 'custom' && (
                    <div className="mt-2 flex items-center justify-between bg-white px-2.5 py-1.5 rounded border border-border text-[11px]">
                      <span className="text-gray-600 font-medium">Custom Fee Rate:</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max="90"
                          step="0.5"
                          value={customPlatformFeePercent}
                          onChange={(e) => setCustomPlatformFeePercent(parseFloat(e.target.value) || 0)}
                          className="w-16 h-6 px-1.5 text-center font-mono font-bold bg-gray-50 border border-gray-300 rounded text-xs outline-none focus:border-accent"
                        />
                        <span className="font-bold text-gray-500">%</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Visual Multi-Segment Cost Breakdown Bar */}
              {currentSellingPrice > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-[10.5px] font-semibold text-gray-600">
                    <span>Revenue Distribution</span>
                    <span>100%</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-gray-100 overflow-hidden flex shadow-inner">
                    <div
                      className="bg-emerald-500 transition-all duration-300"
                      style={{
                        width: `${Math.min(100, Math.max(0, (rawMaterialLinesTotal / currentSellingPrice) * 100))}%`,
                      }}
                      title={`Fabric & Trims: ₹${rawMaterialLinesTotal.toFixed(1)}`}
                    />
                    <div
                      className="bg-blue-500 transition-all duration-300"
                      style={{
                        width: `${Math.min(100, Math.max(0, (totalLaborOverheads / currentSellingPrice) * 100))}%`,
                      }}
                      title={`Labor & Overheads: ₹${totalLaborOverheads.toFixed(1)}`}
                    />
                    <div
                      className="bg-amber-500 transition-all duration-300"
                      style={{
                        width: `${Math.min(100, Math.max(0, (estimatedPlatformFees / currentSellingPrice) * 100))}%`,
                      }}
                      title={`Platform Commission & Ship: ₹${estimatedPlatformFees.toFixed(1)}`}
                    />
                    <div
                      className="bg-teal-600 transition-all duration-300"
                      style={{
                        width: `${Math.min(100, Math.max(0, (estimatedNetProfit / currentSellingPrice) * 100))}%`,
                      }}
                      title={`Net Cash Profit: ₹${estimatedNetProfit.toFixed(1)}`}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[9px] text-gray-400">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Fabric
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span> Labor
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span> Platform
                    </span>
                    <span className="flex items-center gap-1 font-bold text-teal-700">
                      <span className="w-2 h-2 rounded-full bg-teal-600"></span> Net Profit
                    </span>
                  </div>
                </div>
              )}

              {/* Detailed Waterfall Breakdown */}
              <div className="p-3 bg-gradient-to-b from-gray-50 to-white border border-border rounded-lg space-y-2 text-xs">
                <div className="flex justify-between font-semibold text-ink">
                  <span>Marketplace Selling Price:</span>
                  <span className="font-mono text-sm">₹{currentSellingPrice.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-gray-500 text-[11px]">
                  <span className="flex items-center">
                    Est. Platform Deductions:
                    <InfoTooltip text="Includes marketplace commission, payment processing, fixed closing fees, and outbound delivery." />
                  </span>
                  <span className="font-mono text-rose-600 font-medium">
                    -₹{estimatedPlatformFees.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between text-gray-500 text-[11px]">
                  <span className="flex items-center">
                    Raw Material (Cloth + Trims):
                    <InfoTooltip text="Sum of fabric, rib, thread, labels, and polybag costs per piece." />
                  </span>
                  <span className="font-mono text-rose-600 font-medium">
                    -₹{rawMaterialLinesTotal.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between text-gray-500 text-[11px]">
                  <span className="flex items-center">
                    Direct Labor & Overheads:
                    <InfoTooltip text="Sum of cutting, stitching, printing, and packaging worker piece-rates." />
                  </span>
                  <span className="font-mono text-rose-600 font-medium">
                    -₹{totalLaborOverheads.toFixed(2)}
                  </span>
                </div>

                <div className="border-t border-emerald-300 pt-2 flex justify-between font-bold text-emerald-900 bg-emerald-50/80 -mx-3 -mb-3 p-3 rounded-b-lg">
                  <div>
                    <span className="block text-xs">True In-Pocket Net Profit:</span>
                    <span className="text-[10px] text-emerald-700 font-normal">Per single piece sold</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-lg font-black text-emerald-700 block">
                      ₹{estimatedNetProfit.toFixed(2)}
                    </span>
                    <span
                      className={`inline-block text-[9.5px] font-bold px-2 py-0.2 rounded-full text-white ${
                        parseFloat(netMarginPercent) > 25
                          ? 'bg-emerald-600'
                          : parseFloat(netMarginPercent) > 10
                          ? 'bg-amber-600'
                          : 'bg-rose-600'
                      }`}
                    >
                      {netMarginPercent}% Net Margin
                    </span>
                  </div>
                </div>
              </div>

              {/* Monthly Batch Volume Potential */}
              <div className="p-2.5 bg-slate-900 text-white rounded-lg space-y-1 text-xs shadow-xs">
                <div className="flex justify-between items-center text-[10.5px] text-slate-300">
                  <span>Monthly Earnings (500 units/mo):</span>
                  <span className="font-bold text-amber-400 font-mono">
                    ₹{(Math.max(0, estimatedNetProfit) * 500).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <p className="text-[9.5px] text-slate-400">
                  Producing 500 units generates ₹
                  {(currentSellingPrice * 500).toLocaleString('en-IN', { maximumFractionDigits: 0 })}{' '}
                  marketplace gross revenue.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: START NEW PRODUCTION BATCH */}
      {/* ========================================================================= */}
      {isNewBatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-border rounded-xl max-w-md w-full p-5 shadow-xl space-y-3.5 text-xs">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <div>
                <h3 className="text-sm font-bold text-ink">Launch New Production Batch</h3>
                <p className="text-[10.5px] text-gray-500">Plan cutting & stitching run on the factory floor</p>
              </div>
              <button
                onClick={() => setIsNewBatchModalOpen(false)}
                className="text-gray-400 hover:text-ink font-bold text-base cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateBatch} className="space-y-3">
              <div>
                <label className="block font-medium text-ink mb-1 flex items-center">
                  Select Product to Produce *
                  <InfoTooltip text="Choose the finished SKU you are manufacturing. Raw materials will be deducted upon completion according to this product's BOM recipe." />
                </label>
                <ProductSearchSelect
                  products={products}
                  value={newBatchData.productId}
                  onChange={(id) => setNewBatchData({ ...newBatchData, productId: id })}
                  placeholder="Search product by SKU or Title..."
                  required
                />
                {(() => {
                  const p = products.find((x) => x.id === newBatchData.productId);
                  if (!p) return null;
                  return (
                    <div className="mt-2 p-2 bg-slate-50 border border-border rounded-md text-[11px] flex items-center justify-between gap-2 shadow-2xs">
                      <div className="min-w-0 flex-1 truncate">
                        <span className="font-mono font-bold text-ink mr-1.5 px-1 py-0.2 rounded bg-white border border-gray-200 text-[10.5px]">
                          {p.internalSku || p.sku}
                        </span>
                        <span className="text-gray-700 font-medium">{p.title}</span>
                      </div>
                      <span className="shrink-0 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold border border-blue-200 text-[10.5px]">
                        Stock: {p.stock ?? 0} pcs
                      </span>
                    </div>
                  );
                })()}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-ink mb-1 flex items-center">
                    Planned Quantity (Units) *
                    <InfoTooltip text="Total number of finished pieces to cut and stitch in this production run." />
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newBatchData.quantityPlanned}
                    onChange={(e) => setNewBatchData({ ...newBatchData, quantityPlanned: e.target.value })}
                    className="w-full h-8 px-2 bg-white border border-border rounded font-mono text-xs outline-none focus:border-accent"
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium text-ink mb-1 flex items-center">
                    Production Start Date
                    <InfoTooltip text="The date fabric cutting commences in the factory." />
                  </label>
                  <input
                    type="date"
                    value={newBatchData.startDate}
                    onChange={(e) => setNewBatchData({ ...newBatchData, startDate: e.target.value })}
                    className="w-full h-8 px-2 bg-white border border-border rounded text-xs outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-ink mb-1">Production Notes (Optional)</label>
                <textarea
                  rows="2"
                  placeholder="e.g. Master cutter: Ramesh, Batch color: Navy Blue, Size ratio: M-30, L-40, XL-30"
                  value={newBatchData.notes}
                  onChange={(e) => setNewBatchData({ ...newBatchData, notes: e.target.value })}
                  className="w-full p-2 bg-white border border-border rounded text-xs outline-none focus:border-accent resize-none"
                />
              </div>

              <div className="p-2.5 bg-indigo-50/70 border border-indigo-200/80 rounded text-[11px] text-indigo-950 flex items-start gap-1.5">
                <span className="text-indigo-600 mt-0.5">ℹ️</span>
                <span>
                  Launching creates a <strong>Work-In-Progress (WIP)</strong> batch. Raw stock will only be deducted when you inspect and mark the batch as <strong>Complete</strong>.
                </span>
              </div>

              <div className="pt-2 border-t border-border flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsNewBatchModalOpen(false)}
                  className="px-3 py-1.5 bg-white border border-border text-ink rounded hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-ink text-white rounded font-medium hover:bg-black cursor-pointer shadow-xs"
                >
                  🚀 Launch Production Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: COMPLETE BATCH MODAL */}
      {/* ========================================================================= */}
      {isCompleteBatchModalOpen && selectedBatchForCompletion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-border rounded-xl max-w-md w-full p-5 shadow-xl space-y-3.5 text-xs">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <div>
                <h3 className="text-sm font-bold text-ink">
                  Complete Batch: {selectedBatchForCompletion.batchNumber}
                </h3>
                <p className="text-[10.5px] text-gray-500">
                  {selectedBatchForCompletion.product?.internalSku} —{' '}
                  {selectedBatchForCompletion.product?.title}
                </p>
              </div>
              <button
                onClick={() => setIsCompleteBatchModalOpen(false)}
                className="text-gray-400 hover:text-ink font-bold text-base cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCompleteBatchSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-ink mb-1 flex items-center">
                    Passed / Good Units *
                    <InfoTooltip text="Finished garments that passed quality inspection. These will be automatically added to your product's available warehouse stock." />
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={completeBatchData.quantityCompleted}
                    onChange={(e) =>
                      setCompleteBatchData({ ...completeBatchData, quantityCompleted: e.target.value })
                    }
                    className="w-full h-8 px-2 bg-white border border-border rounded font-mono text-xs font-bold text-emerald-700 outline-none focus:border-accent"
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium text-ink mb-1 flex items-center">
                    Rejected / Scrap Units
                    <InfoTooltip text="Units with stitching faults, dye spots, or tears that cannot be sold." />
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={completeBatchData.quantityRejected}
                    onChange={(e) =>
                      setCompleteBatchData({ ...completeBatchData, quantityRejected: e.target.value })
                    }
                    className="w-full h-8 px-2 bg-white border border-border rounded font-mono text-xs font-semibold text-rose-600 outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-ink mb-1">Completion Date</label>
                <input
                  type="date"
                  value={completeBatchData.completionDate}
                  onChange={(e) =>
                    setCompleteBatchData({ ...completeBatchData, completionDate: e.target.value })
                  }
                  className="w-full h-8 px-2 bg-white border border-border rounded text-xs outline-none focus:border-accent"
                />
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg space-y-1 text-[11px] text-emerald-950">
                <div className="font-bold flex items-center gap-1 text-emerald-900">
                  <span>⚡ Automatic Inventory Updates:</span>
                </div>
                <p>
                  1. <strong>+{completeBatchData.quantityCompleted || 0} units</strong> will be added directly to your finished goods stock for{' '}
                  <strong>{selectedBatchForCompletion.product?.internalSku}</strong>.
                </p>
                <p>
                  2. Required cloth, thread & polybags will be automatically deducted from your raw materials stock based on the product's BOM recipe.
                </p>
              </div>

              <div className="pt-2 border-t border-border flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCompleteBatchModalOpen(false)}
                  className="px-3 py-1.5 bg-white border border-border text-ink rounded hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium transition-colors cursor-pointer shadow-xs"
                >
                  ✓ Approve & Credit Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
