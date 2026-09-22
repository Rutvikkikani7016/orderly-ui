import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  importCatalogSpreadsheet,
} from '../api/products.js';
import CustomDropdown from '../components/CustomDropdown.jsx';
import ProductFormModal from '../components/products/ProductFormModal.jsx';
import ProductDetailsModal from '../components/products/ProductDetailsModal.jsx';
import ImportCatalogModal from '../components/products/ImportCatalogModal.jsx';

export default function Products() {
  // State for products list and summary
  const [products, setProducts] = useState([]);
  const [metrics, setMetrics] = useState({
    totalProducts: 0,
    activeProducts: 0,
    draftProducts: 0,
    lowStockProducts: 0,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);

  // Quick Details Modal State
  const [detailsModalProduct, setDetailsModalProduct] = useState(null);

  // Filters & Search with 1000ms (1s) Debouncer
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Debounce search input by 1000ms (1 second)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 1000);

    return () => clearTimeout(timer);
  }, [search]);

  const statusFilterOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'active', label: 'Active', badge: 'Live' },
    { value: 'draft', label: 'Draft' },
    { value: 'archived', label: 'Archived' },
  ];

  const pageSizeOptions = [
    { value: 5, label: '5 rows' },
    { value: 10, label: '10 rows' },
    { value: 15, label: '15 rows' },
    { value: 20, label: '20 rows' },
    { value: 25, label: '25 rows' },
    { value: 50, label: '50 rows' },
    { value: 100, label: '100 rows' },
  ];

  const statusFormOptions = [
    { value: 'active', label: 'Active', badge: 'Live' },
    { value: 'draft', label: 'Draft' },
    { value: 'archived', label: 'Archived' },
  ];

  // Modal State for Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    internalSku: '',
    title: '',
    category: '',
    costPrice: '',
    sellingPrice: '',
    mrp: '',
    stock: 0,
    status: 'active',
    hsnCode: '',
    taxCode: '',
    weightKg: '',
    packageLength: '',
    packageBreadth: '',
    packageHeight: '',
    procurementSla: 1,
    countryOfOrigin: 'IN',
    platformSkus: {
      flipkart: '',
      meesho: '',
      amazon: '',
      myntra: '',
    },
  });
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importPlatform, setImportPlatform] = useState('auto');

  // Load products from backend
  async function fetchCatalog(page = pagination.page, filter = statusFilter, query = debouncedSearch, pageLimit = pagination.limit) {
    setLoading(true);
    try {
      const data = await getProducts({ page, limit: pageLimit, status: filter, search: query });
      setProducts(data.products || []);
      setPagination(data.pagination || { page: 1, limit: pageLimit, total: 0, totalPages: 1 });
      if (data.metrics) {
        setMetrics(data.metrics);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load products.');
    } finally {
      setLoading(false);
    }
  }

  // Trigger catalog fetch when debouncedSearch, statusFilter, or limit change
  useEffect(() => {
    fetchCatalog(1, statusFilter, debouncedSearch, pagination.limit);
  }, [statusFilter, debouncedSearch]);

  // Open Modal for Create
  function handleOpenCreate() {
    setEditingProduct(null);
    setFormData({
      internalSku: '',
      title: '',
      category: '',
      costPrice: '',
      sellingPrice: '',
      mrp: '',
      stock: 0,
      status: 'active',
      hsnCode: '',
      taxCode: '',
      weightKg: '',
      packageLength: '',
      packageBreadth: '',
      packageHeight: '',
      procurementSla: 1,
      countryOfOrigin: 'IN',
      platformSkus: {
        flipkart: '',
        meesho: '',
        amazon: '',
        myntra: '',
      },
    });
    setIsModalOpen(true);
  }

  // Open Modal for Edit
  function handleOpenEdit(product) {
    setEditingProduct(product);

    // Extract platform mappings from listings array
    const pSkus = {
      flipkart: '',
      meesho: '',
      amazon: '',
      myntra: '',
    };
    if (product.platformListings && Array.isArray(product.platformListings)) {
      product.platformListings.forEach((l) => {
        const p = (l.platform || '').toLowerCase();
        if (pSkus[p] !== undefined) {
          pSkus[p] = l.platformSku || '';
        }
      });
    }

    setFormData({
      internalSku: product.internalSku || '',
      title: product.title || '',
      category: product.category || '',
      costPrice: product.costPrice !== null && product.costPrice !== undefined ? product.costPrice : '',
      sellingPrice: product.sellingPrice !== null && product.sellingPrice !== undefined ? product.sellingPrice : '',
      mrp: product.mrp !== null && product.mrp !== undefined ? product.mrp : '',
      stock: product.stock !== undefined ? product.stock : 0,
      status: product.status || 'active',
      hsnCode: product.hsnCode || '',
      taxCode: product.taxCode || '',
      weightKg: product.weightKg !== null && product.weightKg !== undefined ? product.weightKg : '',
      packageLength: product.packageLength !== null && product.packageLength !== undefined ? product.packageLength : '',
      packageBreadth: product.packageBreadth !== null && product.packageBreadth !== undefined ? product.packageBreadth : '',
      packageHeight: product.packageHeight !== null && product.packageHeight !== undefined ? product.packageHeight : '',
      procurementSla: product.procurementSla || 1,
      countryOfOrigin: product.countryOfOrigin || 'IN',
      platformSkus: pSkus,
    });
    setIsModalOpen(true);
  }

  // Submit Create or Edit Form
  async function handleSubmitForm(e) {
    e.preventDefault();
    if (!formData.internalSku.trim() || !formData.title.trim()) {
      toast.error('SKU and Product Title are required.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        internalSku: formData.internalSku.trim(),
        title: formData.title.trim(),
        category: formData.category ? formData.category.trim() : null,
        costPrice: formData.costPrice !== '' ? parseFloat(formData.costPrice) : null,
        sellingPrice: formData.sellingPrice !== '' ? parseFloat(formData.sellingPrice) : null,
        mrp: formData.mrp !== '' ? parseFloat(formData.mrp) : null,
        stock: parseInt(formData.stock, 10) || 0,
        status: formData.status,
        hsnCode: formData.hsnCode ? formData.hsnCode.trim() : null,
        taxCode: formData.taxCode ? formData.taxCode.trim() : null,
        weightKg: formData.weightKg !== '' ? parseFloat(formData.weightKg) : null,
        packageLength: formData.packageLength !== '' ? parseFloat(formData.packageLength) : null,
        packageBreadth: formData.packageBreadth !== '' ? parseFloat(formData.packageBreadth) : null,
        packageHeight: formData.packageHeight !== '' ? parseFloat(formData.packageHeight) : null,
        procurementSla: parseInt(formData.procurementSla, 10) || 1,
        countryOfOrigin: formData.countryOfOrigin ? formData.countryOfOrigin.trim() : 'IN',
        platformSkus: formData.platformSkus,
      };

      if (editingProduct) {
        await updateProduct(editingProduct.id, payload);
        toast.success('Product and marketplace attributes updated successfully');
      } else {
        await createProduct(payload);
        toast.success('Product and marketplace attributes created successfully');
      }

      setIsModalOpen(false);
      fetchCatalog(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save product.');
    } finally {
      setSubmitting(false);
    }
  }

  // Delete Product
  async function handleDelete(id) {
    if (!window.confirm('Are you sure you want to delete this product?')) return;

    setDeletingId(id);
    try {
      await deleteProduct(id);
      toast.success('Product deleted');
      fetchCatalog(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete product.');
    } finally {
      setDeletingId(null);
    }
  }

  // Handle Catalog File Upload
  async function handleImportCatalogSubmit(e) {
    e.preventDefault();
    if (!selectedFile) {
      toast.error('Please select a catalog spreadsheet file (.xls, .xlsx, or .csv)');
      return;
    }

    setImporting(true);
    try {
      const dataForm = new FormData();
      dataForm.append('file', selectedFile);
      dataForm.append('platform', importPlatform);

      const result = await importCatalogSpreadsheet(dataForm);
      const totalCreated = result.createdCount || 0;
      const totalUpdated = result.updatedCount || 0;
      const totalRows = result.totalRows || 0;

      toast.success(
        `Catalog imported successfully! ${totalCreated} new products added, ${totalUpdated} updated out of ${totalRows} items.`
      );

      setIsImportModalOpen(false);
      setSelectedFile(null);
      fetchCatalog(1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to import catalog spreadsheet.');
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="h-full flex flex-col p-3 md:p-3.5 font-sans space-y-2 max-w-full overflow-hidden">
      {/* Compact Top Header (Fixed at top) */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold text-ink tracking-tight">Products Catalog</h1>
          <p className="text-[10.5px] text-gray-500">
            Manage master inventory, marketplace SKU & FSN mappings, stock & multi-channel pricing
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Refresh Button */}
          <button
            onClick={async () => {
              await fetchCatalog(pagination.page, statusFilter, debouncedSearch, pagination.limit);
              toast.success('Products refreshed');
            }}
            disabled={loading}
            className="h-7 px-2.5 text-[11px] font-semibold bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-ink hover:border-gray-400 rounded-md transition-all flex items-center space-x-1.5 shadow-2xs group cursor-pointer"
            title="Refresh products without reloading web page"
          >
            <svg
              className={`w-3.5 h-3.5 text-gray-500 group-hover:text-ink ${
                loading ? 'animate-spin text-accent' : 'group-hover:rotate-180 transition-transform duration-300'
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
            <span>Refresh</span>
          </button>

          {/* Import Catalog Button */}
          <button
            onClick={() => {
              setSelectedFile(null);
              setIsImportModalOpen(true);
            }}
            className="h-7 px-2.5 text-[11px] font-semibold bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-ink hover:border-gray-400 rounded-md transition-all flex items-center space-x-1.5 shadow-2xs group"
          >
            <svg className="w-3.5 h-3.5 text-accent group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span>Import (.xls / .csv)</span>
          </button>

          {/* Add Product Button */}
          <button
            onClick={handleOpenCreate}
            className="h-7 px-3 text-[11px] font-semibold bg-ink text-white hover:bg-black rounded-md transition-colors flex items-center space-x-1 shadow-xs"
          >
            <span className="text-xs font-bold">+</span>
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Small Compact 4-KPI Cards Grid (Fixed at top) */}
      <div className="shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* Total SKUs */}
        <div className="bg-white border border-border rounded-lg px-2.5 py-1.5 shadow-2xs flex items-center justify-between">
          <div className="flex items-center space-x-2 min-w-0">
            <div className="w-6 h-6 rounded bg-accent/10 text-accent flex items-center justify-center shrink-0">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider truncate">Total Products</p>
              <h3 className="text-xs font-bold text-ink leading-tight">{metrics.totalProducts}</h3>
            </div>
          </div>
        </div>

        {/* Active Products */}
        <div className="bg-white border border-border rounded-lg px-2.5 py-1.5 shadow-2xs flex items-center justify-between">
          <div className="flex items-center space-x-2 min-w-0">
            <div className="w-6 h-6 rounded bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center justify-center shrink-0">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-semibold text-emerald-600 uppercase tracking-wider truncate">Active</p>
              <h3 className="text-xs font-bold text-emerald-700 leading-tight">{metrics.activeProducts}</h3>
            </div>
          </div>
        </div>

        {/* Draft Products */}
        <div className="bg-white border border-border rounded-lg px-2.5 py-1.5 shadow-2xs flex items-center justify-between">
          <div className="flex items-center space-x-2 min-w-0">
            <div className="w-6 h-6 rounded bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center justify-center shrink-0">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-semibold text-amber-600 uppercase tracking-wider truncate">Drafts</p>
              <h3 className="text-xs font-bold text-amber-700 leading-tight">{metrics.draftProducts}</h3>
            </div>
          </div>
        </div>

        {/* Low Stock Products */}
        <div className="bg-white border border-border rounded-lg px-2.5 py-1.5 shadow-2xs flex items-center justify-between">
          <div className="flex items-center space-x-2 min-w-0">
            <div className="w-6 h-6 rounded bg-rose-50 text-rose-600 border border-rose-200/60 flex items-center justify-center shrink-0">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-semibold text-rose-600 uppercase tracking-wider truncate">Low Stock (≤ 5)</p>
              <h3 className="text-xs font-bold text-rose-700 leading-tight">{metrics.lowStockProducts}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Main Catalog Card (Fills remaining height, contains internal table scroll) */}
      <div className="flex-1 min-h-0 flex flex-col bg-white border border-border rounded-lg overflow-hidden shadow-xs">
        {/* Compact Search & Filter Toolbar (Fixed inside card top) */}
        <div className="shrink-0 py-1.5 px-3 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-gray-50/40">
          <div className="flex items-center space-x-2 flex-1 max-w-lg">
            <div className="relative flex-1">
              <svg
                className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search SKU, title, category, or HSN…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="!h-7 !min-h-0 w-full pr-2.5 text-[11px] bg-white border border-border text-ink rounded-md outline-none focus:border-accent focus:ring-1 focus:ring-accent placeholder-gray-400 !py-0 shadow-2xs"
                style={{ height: '28px', minHeight: '28px', paddingLeft: '2rem' }}
              />
            </div>

            <CustomDropdown
              value={statusFilter}
              onChange={(val) => setStatusFilter(val)}
              options={statusFilterOptions}
              size="xs"
              buttonClassName="!h-7 !min-h-0 !rounded-md"
            />
          </div>

          <div className="text-[10.5px] text-gray-500 font-medium">
            Total {pagination.total} SKUs
          </div>
        </div>

        {/* Table - In-Page Vertical & Horizontal Scrollable Container */}
        <div className="flex-1 min-h-0 overflow-auto w-full">
          <table className="w-full min-w-[1300px] text-left text-xs text-ink">
            <thead className="sticky top-0 z-10 bg-gray-50 text-gray-500 uppercase text-[9px] font-bold tracking-wider border-b border-border shadow-2xs">
              <tr>
                <th className="px-2.5 py-2 text-center w-10 bg-gray-50">#</th>
                <th className="px-3 py-2 min-w-[260px] bg-gray-50">Product Name & Category</th>
                <th className="px-3 py-2 min-w-[150px] bg-gray-50">Master SKU</th>
                <th className="px-3 py-2 min-w-[190px] bg-gray-50">Marketplace SKU</th>
                <th className="px-3 py-2 min-w-[150px] bg-gray-50">FSN / ASIN</th>
                <th className="px-3 py-2 min-w-[130px] bg-gray-50">Price / MRP</th>
                <th className="px-3 py-2 min-w-[90px] bg-gray-50">Stock</th>
                <th className="px-3 py-2 text-center w-20 bg-gray-50">Status</th>
                <th className="px-3 py-2 text-right w-24 bg-gray-50">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan="9" className="px-4 py-6 text-center text-gray-500">
                    Loading product catalog…
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-4 py-8 text-center text-gray-500">
                    No products found. Click <span className="text-ink font-semibold">"Import Catalog"</span> or <span className="text-ink font-semibold">"+ Add Product"</span> to populate your catalog.
                  </td>
                </tr>
              ) : (
                products.map((p, index) => {
                  return (
                    <tr key={p.id} className="hover:bg-blue-50/20 transition-colors">
                      {/* Sr. No */}
                      <td className="px-2.5 py-1.5 text-center text-[10.5px] font-mono font-medium text-gray-400">
                        {(pagination.page - 1) * pagination.limit + index + 1}
                      </td>

                      {/* Product Name & Category */}
                      <td className="px-3 py-1.5 max-w-[280px]">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-ink text-[11.5px] leading-tight truncate" title={p.title}>
                            {p.title}
                          </p>
                          {p.category && (
                            <p className="text-[9px] font-medium text-gray-500 capitalize truncate" title={p.category}>
                              {p.category.replace(/_/g, ' ')}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Master SKU (Dedicated Column) */}
                      <td className="px-3 py-1.5 min-w-[150px]">
                        <span className="inline-block font-mono text-[10px] font-bold bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded border border-gray-200 truncate max-w-[140px]" title={p.internalSku}>
                          {p.internalSku}
                        </span>
                      </td>

                      {/* Marketplace Channel SKUs (Dedicated Column) */}
                      <td className="px-3 py-1.5 min-w-[190px]">
                        {p.platformListings && p.platformListings.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-1">
                            {p.platformListings.map((l) => (
                              <span
                                key={l.id || l.platform}
                                title={`${l.platform.toUpperCase()} SKU: ${l.platformSku}`}
                                className="inline-flex items-center space-x-1 font-mono text-[9px] px-1.5 py-0.5 rounded border bg-blue-50/80 border-blue-200/80 text-blue-800 font-medium"
                              >
                                <span className="font-bold uppercase text-blue-600">
                                  {l.platform === 'flipkart' ? 'FK' : l.platform === 'meesho' ? 'MS' : l.platform === 'amazon' ? 'AZ' : l.platform}:
                                </span>
                                <span className="text-gray-900 truncate max-w-[110px]">{l.platformSku || '—'}</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-[10px] font-mono italic">Same as Master</span>
                        )}
                      </td>

                      {/* FSN / ASIN (Dedicated Column) */}
                      <td className="px-3 py-1.5 min-w-[150px]">
                        {p.platformListings && p.platformListings.some((l) => l.fsnOrAsin) ? (
                          <div className="flex flex-wrap items-center gap-1">
                            {p.platformListings
                              .filter((l) => l.fsnOrAsin)
                              .map((l) => (
                                <span
                                  key={l.id || l.platform}
                                  title={`${l.platform.toUpperCase()} FSN / ASIN: ${l.fsnOrAsin}`}
                                  className="inline-flex items-center space-x-1 font-mono text-[9px] px-1.5 py-0.5 rounded border bg-slate-50 border-slate-200 text-slate-800 font-medium"
                                >
                                  <span className="text-slate-500 font-bold uppercase text-[8px]">
                                    {l.platform === 'flipkart' ? 'FSN' : l.platform === 'amazon' ? 'ASIN' : 'ID'}:
                                  </span>
                                  <span className="font-bold text-ink truncate max-w-[100px]">{l.fsnOrAsin}</span>
                                </span>
                              ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs font-mono">—</span>
                        )}
                      </td>

                      {/* Pricing & Settlement */}
                      <td className="px-3 py-1.5 min-w-[130px]">
                        <div className="space-y-0.2">
                          <div className="flex items-baseline space-x-1.5">
                            <span className="text-xs font-bold text-ink">
                              {p.sellingPrice !== null ? `₹${parseFloat(p.sellingPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                            </span>
                            {p.mrp !== null && (
                              <span className="text-[9px] text-gray-400 line-through">
                                ₹{parseFloat(p.mrp).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                            )}
                          </div>
                          {p.costPrice !== null && (
                            <div className="text-[8.5px] font-medium text-emerald-700">
                              Payout: ₹{parseFloat(p.costPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Stock */}
                      <td className="px-3 py-1.5 min-w-[90px]">
                        <div className="flex items-center space-x-1.5">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              p.stock > 5 ? 'bg-emerald-500' : p.stock > 0 ? 'bg-amber-500' : 'bg-rose-500'
                            }`}
                          ></span>
                          <span className="font-bold text-xs text-ink">{p.stock}</span>
                          <span className="text-[9px] text-gray-400">units</span>
                        </div>
                        {p.stock <= 5 && (
                          <span className="inline-block text-[8px] font-bold px-1 rounded bg-rose-50 text-rose-700 border border-rose-200">
                            {p.stock === 0 ? 'Out of Stock' : 'Low Stock'}
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-3 py-1.5 text-center w-20">
                        <span
                          className={`inline-flex items-center space-x-1 text-[8.5px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded-full ${
                            p.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : p.status === 'draft'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-gray-100 text-gray-600 border border-gray-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              p.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}
                          ></span>
                          <span>{p.status}</span>
                        </span>
                      </td>

                      {/* Actions: 3-Dot Full Details Modal, Edit Icon, Delete Icon */}
                      <td className="px-3 py-1.5 text-right w-24">
                        <div className="flex items-center justify-end space-x-1">
                          {/* Three-Dot (Opens Full Organized Product Details Modal) */}
                          <button
                            onClick={() => setDetailsModalProduct(p)}
                            title="View All Organized Product Details (Weight, Dimensions, Tax, SLA & Channel SKUs)"
                            className="p-1 rounded border border-gray-200 bg-white hover:bg-gray-100 text-gray-600 hover:text-ink transition-all shadow-2xs"
                          >
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                              <circle cx="12" cy="5" r="2" />
                              <circle cx="12" cy="12" r="2" />
                              <circle cx="12" cy="19" r="2" />
                            </svg>
                          </button>

                          {/* Edit Icon Button */}
                          <button
                            onClick={() => handleOpenEdit(p)}
                            title="Edit Product"
                            className="p-1 rounded border border-gray-200 bg-white hover:bg-gray-100 text-gray-600 hover:text-ink transition-all shadow-2xs group"
                          >
                            <svg className="w-3.5 h-3.5 text-gray-500 group-hover:text-ink transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>

                          {/* Delete Icon Button */}
                          <button
                            onClick={() => handleDelete(p.id)}
                            disabled={deletingId === p.id}
                            title="Delete Product"
                            className="p-1 rounded border border-rose-200 bg-rose-50/60 hover:bg-rose-100 text-rose-600 hover:text-rose-700 transition-all shadow-2xs disabled:opacity-50 group"
                          >
                            {deletingId === p.id ? (
                              <svg className="animate-spin w-3.5 h-3.5 text-rose-600" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                              </svg>
                            ) : (
                              <svg className="w-3.5 h-3.5 text-rose-600 group-hover:scale-105 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination (Fixed at bottom of Card) */}
        {pagination.total > 0 && (
          <div className="shrink-0 relative z-20 p-2 px-3 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-gray-500 bg-gray-50/50">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                Showing page <span className="text-ink font-medium">{pagination.page}</span> of{' '}
                <span className="text-ink font-medium">{pagination.totalPages}</span> ({pagination.total} total items)
              </div>
              <div className="flex items-center space-x-1.5 border-l border-border pl-3">
                <span className="text-gray-500">Rows per page:</span>
                <CustomDropdown
                  value={pagination.limit}
                  onChange={(val) => {
                    const newLimit = parseInt(val, 10);
                    fetchCatalog(1, statusFilter, debouncedSearch, newLimit);
                  }}
                  options={pageSizeOptions}
                  size="xs"
                  placement="top"
                />
              </div>
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => fetchCatalog(pagination.page - 1, statusFilter, debouncedSearch, pagination.limit)}
                disabled={pagination.page <= 1}
                className="px-3 py-1.5 bg-white hover:bg-gray-50 disabled:opacity-40 text-ink rounded border border-border shadow-xs font-medium text-xs"
              >
                &larr; Previous
              </button>
              <button
                onClick={() => fetchCatalog(pagination.page + 1, statusFilter, debouncedSearch, pagination.limit)}
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-1.5 bg-white hover:bg-gray-50 disabled:opacity-40 text-ink rounded border border-border shadow-xs font-medium text-xs"
              >
                Next &rarr;
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Import Catalog Modal */}
      <ImportCatalogModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSubmit={handleImportCatalogSubmit}
        importPlatform={importPlatform}
        setImportPlatform={setImportPlatform}
        selectedFile={selectedFile}
        setSelectedFile={setSelectedFile}
        importing={importing}
      />

      {/* Full-Screen Create / Edit Master Product Modal */}
      <ProductFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmitForm}
        formData={formData}
        setFormData={setFormData}
        editingProduct={editingProduct}
        submitting={submitting}
        statusFormOptions={statusFormOptions}
      />

      {/* Product Full Details & Logistics Modal (Opened on Three-Dot Click) */}
      <ProductDetailsModal
        product={detailsModalProduct}
        onClose={() => setDetailsModalProduct(null)}
        onEdit={(prod) => handleOpenEdit(prod)}
      />
    </div>
  );
}
