import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../api/products.js';
import CustomDropdown from '../components/CustomDropdown.jsx';


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

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

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
    stock: 0,
    status: 'active',
    platformSkus: {
      flipkart: '',
      meesho: '',
      amazon: '',
      myntra: '',
    },
  });
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Load products from backend
  async function fetchCatalog(page = pagination.page, filter = statusFilter, query = search, pageLimit = pagination.limit) {
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

  useEffect(() => {
    fetchCatalog(1, statusFilter, search, pagination.limit);
  }, [statusFilter, search]);

  // Open Modal for Create
  function handleOpenCreate() {
    setEditingProduct(null);
    setFormData({
      internalSku: '',
      title: '',
      category: '',
      costPrice: '',
      sellingPrice: '',
      stock: 0,
      status: 'active',
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
      costPrice: product.costPrice !== null ? product.costPrice : '',
      sellingPrice: product.sellingPrice !== null ? product.sellingPrice : '',
      stock: product.stock !== undefined ? product.stock : 0,
      status: product.status || 'active',
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
        stock: parseInt(formData.stock, 10) || 0,
        status: formData.status,
        platformSkus: formData.platformSkus,
      };

      if (editingProduct) {
        await updateProduct(editingProduct.id, payload);
        toast.success('Product and marketplace SKU mappings updated successfully');
      } else {
        await createProduct(payload);
        toast.success('Product and marketplace SKU mappings created successfully');
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

  return (
    <div className="p-4 md:p-5 font-sans space-y-3.5 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-ink tracking-tight">Products Catalog</h1>
          <p className="text-[11px] text-gray-500">
            Manage master SKUs, multi-channel platform mappings (Flipkart, Meesho, Amazon), stock & pricing
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="h-9 px-4 text-xs font-semibold bg-ink text-white hover:bg-black rounded-lg transition-colors flex items-center space-x-1.5 shadow-xs"
        >
          <span className="text-base font-bold">+</span>
          <span>Add Product</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-border rounded-xl p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Total Products</p>
            <h3 className="text-xl font-bold text-ink mt-0.5">{metrics.totalProducts}</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">In master catalog</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-accent-light text-accent border border-accent/20 flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
        </div>

        <div className="bg-white border border-border rounded-xl p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Active Products</p>
            <h3 className="text-xl font-bold text-emerald-600 mt-0.5">{metrics.activeProducts}</h3>
            <p className="text-[10px] text-emerald-600 font-medium mt-0.5">Live on sales channels</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        <div className="bg-white border border-border rounded-xl p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Draft Products</p>
            <h3 className="text-xl font-bold text-amber-600 mt-0.5">{metrics.draftProducts}</h3>
            <p className="text-[10px] text-amber-600 font-medium mt-0.5">Unpublished SKUs</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
        </div>

        <div className="bg-white border border-border rounded-xl p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Low Stock (≤ 5)</p>
            <h3 className="text-xl font-bold text-rose-600 mt-0.5">{metrics.lowStockProducts}</h3>
            <p className="text-[10px] text-rose-600 font-medium mt-0.5">Needs restock</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Main Catalog Card */}
      <div className="bg-white border border-border rounded-xl overflow-hidden shadow-xs">
        {/* Toolbar */}
        <div className="p-3.5 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          <div className="flex items-center space-x-2.5">
            <div className="relative min-w-[260px]">
              <svg
                className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search SKU, title, or category…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-9 pr-3 text-xs bg-white border border-border text-ink rounded-md outline-none focus:border-accent focus:ring-1 focus:ring-accent placeholder-gray-400"
                style={{ paddingLeft: '2.2rem' }}
              />
            </div>

            <CustomDropdown
              value={statusFilter}
              onChange={(val) => setStatusFilter(val)}
              options={statusFilterOptions}
              size="sm"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-ink">
            <thead className="bg-gray-50/80 text-gray-500 uppercase text-[9px] font-semibold tracking-wider border-b border-border">
              <tr>
                <th className="px-3.5 py-2.5 text-center w-12">Sr. No</th>
                <th className="px-4 py-2.5">Master SKU & Title</th>
                <th className="px-4 py-2.5">Marketplace Channel SKUs</th>
                <th className="px-4 py-2.5">Category</th>
                <th className="px-4 py-2.5">Cost Price</th>
                <th className="px-4 py-2.5">Selling Price</th>
                <th className="px-4 py-2.5">Stock</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
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
                    No products found. Click <span className="text-ink font-semibold">"+ Add Product"</span> to create your first SKU.
                  </td>
                </tr>
              ) : (
                products.map((p, index) => (
                  <tr key={p.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-3.5 py-2.5 text-center text-[11px] font-mono font-medium text-gray-400">
                      {(pagination.page - 1) * pagination.limit + index + 1}
                    </td>

                    <td className="px-4 py-2.5">
                      <span className="font-mono text-ink font-bold bg-gray-100 px-1.5 py-0.5 rounded text-[11px] block w-fit mb-0.5">
                        {p.internalSku}
                      </span>
                      <span className="font-medium text-ink text-xs block">{p.title}</span>
                    </td>

                    {/* Marketplace Channel SKUs */}
                    <td className="px-4 py-2.5 max-w-[240px]">
                      {p.platformListings && p.platformListings.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {p.platformListings.map((l) => (
                            <span
                              key={l.id || l.platform}
                              className={`inline-flex items-center space-x-1 text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                                l.platform === 'flipkart'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : l.platform === 'meesho'
                                  ? 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200'
                                  : l.platform === 'amazon'
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : 'bg-rose-50 text-rose-700 border-rose-200'
                              }`}
                              title={`${l.platform.toUpperCase()}: ${l.platformSku}`}
                            >
                              <strong className="uppercase font-bold text-[9px]">{l.platform.slice(0, 2)}:</strong>
                              <span className="truncate max-w-[110px]">{l.platformSku}</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-[11px] italic">Uses Master SKU</span>
                      )}
                    </td>

                    <td className="px-4 py-2.5 text-gray-500 text-xs">{p.category || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-600 text-xs">{p.costPrice !== null ? `₹${parseFloat(p.costPrice).toFixed(2)}` : '—'}</td>
                    <td className="px-4 py-2.5 text-accent-dark font-semibold text-xs">{p.sellingPrice !== null ? `₹${parseFloat(p.sellingPrice).toFixed(2)}` : '—'}</td>
                    <td className="px-4 py-2.5">
                      <span className={`font-semibold text-xs ${p.stock <= 5 ? 'text-rose-600' : 'text-ink'}`}>
                        {p.stock}
                      </span>
                      {p.stock <= 5 && (
                        <span className="ml-1 text-[9px] font-semibold px-1 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200">
                          Low
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-block text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded ${
                          p.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : p.status === 'draft'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-gray-100 text-gray-600 border border-gray-200'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right space-x-1.5">
                      <button
                        onClick={() => handleOpenEdit(p)}
                        className="px-2.5 py-1 text-xs font-semibold bg-white hover:bg-gray-50 border border-border text-ink rounded transition-colors shadow-xs"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        disabled={deletingId === p.id}
                        className="px-2.5 py-1 text-xs font-semibold bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded transition-colors disabled:opacity-50"
                      >
                        {deletingId === p.id ? '…' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.total > 0 && (
          <div className="p-3 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-[11px] text-gray-500 bg-gray-50/50">
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
                    fetchCatalog(1, statusFilter, search, newLimit);
                  }}
                  options={pageSizeOptions}
                  size="xs"
                />
              </div>
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => fetchCatalog(pagination.page - 1, statusFilter, search, pagination.limit)}
                disabled={pagination.page <= 1}
                className="px-3 py-1.5 bg-white hover:bg-gray-50 disabled:opacity-40 text-ink rounded border border-border shadow-xs font-medium text-xs"
              >
                &larr; Previous
              </button>
              <button
                onClick={() => fetchCatalog(pagination.page + 1, statusFilter, search, pagination.limit)}
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-1.5 bg-white hover:bg-gray-50 disabled:opacity-40 text-ink rounded border border-border shadow-xs font-medium text-xs"
              >
                Next &rarr;
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Modal with Multi-Platform SKU Mapping */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white border border-border rounded-xl max-w-xl w-full p-5 shadow-xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-ink">
                  {editingProduct ? 'Edit Product Catalog' : 'Add New Master Product'}
                </h3>
                <p className="text-[11px] text-gray-500">
                  Define master inventory details and marketplace SKU mappings
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-ink text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-3.5 text-xs">
              {/* Section 1: Master Product Information */}
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Master SKU */}
                  <div>
                    <label className="block font-medium text-ink mb-1">Master Internal SKU *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. TSHIRT-BLK-M"
                      value={formData.internalSku}
                      onChange={(e) => setFormData({ ...formData, internalSku: e.target.value })}
                      className="w-full h-9 px-3 bg-white border border-border rounded text-ink text-xs outline-none focus:border-accent font-mono font-medium"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block font-medium text-ink mb-1">Category</label>
                    <input
                      type="text"
                      placeholder="e.g. Apparel"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full h-9 px-3 bg-white border border-border rounded text-ink text-xs outline-none focus:border-accent"
                    />
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block font-medium text-ink mb-1">Product Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Men's Classic Cotton T-Shirt"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full h-9 px-3 bg-white border border-border rounded text-ink text-xs outline-none focus:border-accent"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Cost Price */}
                  <div>
                    <label className="block font-medium text-ink mb-1">Cost Price (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="e.g. 150.00"
                      value={formData.costPrice}
                      onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                      className="w-full h-9 px-3 bg-white border border-border rounded text-ink text-xs outline-none focus:border-accent"
                    />
                  </div>

                  {/* Selling Price */}
                  <div>
                    <label className="block font-medium text-ink mb-1">Selling Price (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="e.g. 299.00"
                      value={formData.sellingPrice}
                      onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                      className="w-full h-9 px-3 bg-white border border-border rounded text-ink text-xs outline-none focus:border-accent"
                    />
                  </div>

                  {/* Stock */}
                  <div>
                    <label className="block font-medium text-ink mb-1">Stock Units</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                      className="w-full h-9 px-3 bg-white border border-border rounded text-ink text-xs outline-none focus:border-accent"
                    />
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="block font-medium text-ink mb-1">Status</label>
                  <CustomDropdown
                    value={formData.status}
                    onChange={(val) => setFormData({ ...formData, status: val })}
                    options={statusFormOptions}
                    size="sm"
                    className="w-full"
                    buttonClassName="w-full"
                  />
                </div>
              </div>

              {/* Section 2: Marketplace Channel SKUs (Multi-Platform Aliases) */}
              <div className="pt-3 border-t border-border space-y-2.5">
                <div>
                  <h4 className="text-xs font-bold text-ink flex items-center space-x-1.5">
                    <span>Marketplace Channel SKUs</span>
                    <span className="text-[9px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.2 rounded font-semibold">
                      Auto-Link
                    </span>
                  </h4>
                  <p className="text-[10px] text-gray-400">
                    If Flipkart, Meesho, or Amazon use different SKU codes for this product, enter them below. CSV imports will automatically recognize them!
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 bg-gray-50/70 border border-border rounded-lg p-3">
                  {/* Flipkart SKU */}
                  <div>
                    <label className="block font-semibold text-[11px] text-blue-700 mb-1 flex items-center space-x-1">
                      <span className="w-2 h-2 rounded-full bg-blue-600 inline-block"></span>
                      <span>Flipkart SKU / FSN</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. FK-TSHIRT-BLK-M"
                      value={formData.platformSkus.flipkart}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          platformSkus: { ...formData.platformSkus, flipkart: e.target.value },
                        })
                      }
                      className="w-full h-8 px-2.5 bg-white border border-border rounded text-ink text-xs outline-none focus:border-accent font-mono"
                    />
                  </div>

                  {/* Meesho SKU */}
                  <div>
                    <label className="block font-semibold text-[11px] text-fuchsia-700 mb-1 flex items-center space-x-1">
                      <span className="w-2 h-2 rounded-full bg-fuchsia-600 inline-block"></span>
                      <span>Meesho Supplier SKU</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Dimple New or MS-TSHIRT"
                      value={formData.platformSkus.meesho}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          platformSkus: { ...formData.platformSkus, meesho: e.target.value },
                        })
                      }
                      className="w-full h-8 px-2.5 bg-white border border-border rounded text-ink text-xs outline-none focus:border-accent font-mono"
                    />
                  </div>

                  {/* Amazon SKU */}
                  <div>
                    <label className="block font-semibold text-[11px] text-amber-800 mb-1 flex items-center space-x-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                      <span>Amazon Seller SKU / ASIN</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. AZ-TSHIRT-BLK-M"
                      value={formData.platformSkus.amazon}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          platformSkus: { ...formData.platformSkus, amazon: e.target.value },
                        })
                      }
                      className="w-full h-8 px-2.5 bg-white border border-border rounded text-ink text-xs outline-none focus:border-accent font-mono"
                    />
                  </div>

                  {/* Myntra SKU */}
                  <div>
                    <label className="block font-semibold text-[11px] text-rose-700 mb-1 flex items-center space-x-1">
                      <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>
                      <span>Myntra Vendor SKU</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. MY-TSHIRT-BLK-M"
                      value={formData.platformSkus.myntra}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          platformSkus: { ...formData.platformSkus, myntra: e.target.value },
                        })
                      }
                      className="w-full h-8 px-2.5 bg-white border border-border rounded text-ink text-xs outline-none focus:border-accent font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2.5 border-t border-border flex items-center justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 bg-white hover:bg-gray-50 border border-border text-ink rounded transition-colors font-medium text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-ink text-white hover:bg-black font-semibold rounded transition-colors disabled:opacity-50 text-xs"
                >
                  {submitting ? 'Saving…' : editingProduct ? 'Update Product' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
