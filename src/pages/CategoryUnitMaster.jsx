import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  getMaterialCategories,
  createMaterialCategory,
  updateMaterialCategory,
  deleteMaterialCategory,
  getUnitsOfMeasure,
  createUnitOfMeasure,
  updateUnitOfMeasure,
  deleteUnitOfMeasure,
} from '../api/manufacturing.js';
import { DataTable, TableToolbar, SearchBar, TableIconButton } from '../components/common/index.js';

export default function CategoryUnitMaster() {
  const [activeTab, setActiveTab] = useState('categories'); // 'categories' | 'units'

  // Categories state
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [catSearch, setCatSearch] = useState('');
  const [catPage, setCatPage] = useState(1);
  const [catLimit, setCatLimit] = useState(15);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    code: '',
    description: '',
    status: 'active',
  });

  // Units state
  const [units, setUnits] = useState([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [unitSearch, setUnitSearch] = useState('');
  const [unitPage, setUnitPage] = useState(1);
  const [unitLimit, setUnitLimit] = useState(15);
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [unitFormData, setUnitFormData] = useState({
    name: '',
    symbol: '',
    description: '',
    status: 'active',
  });

  async function loadCategories() {
    setLoadingCategories(true);
    try {
      const data = await getMaterialCategories();
      setCategories(data || []);
    } catch (err) {
      toast.error('Failed to load categories');
    } finally {
      setLoadingCategories(false);
    }
  }

  async function loadUnits() {
    setLoadingUnits(true);
    try {
      const data = await getUnitsOfMeasure();
      setUnits(data || []);
    } catch (err) {
      toast.error('Failed to load units');
    } finally {
      setLoadingUnits(false);
    }
  }

  useEffect(() => {
    loadCategories();
    loadUnits();
  }, []);

  // Category Handlers
  function handleOpenAddCategory() {
    setEditingCategory(null);
    setCategoryFormData({ name: '', code: '', description: '', status: 'active' });
    setIsCategoryModalOpen(true);
  }

  function handleOpenEditCategory(cat) {
    setEditingCategory(cat);
    setCategoryFormData({
      name: cat.name,
      code: cat.code || '',
      description: cat.description || '',
      status: cat.status || 'active',
    });
    setIsCategoryModalOpen(true);
  }

  async function handleSaveCategory(e) {
    e.preventDefault();
    if (!categoryFormData.name) {
      toast.error('Category name is required');
      return;
    }
    try {
      if (editingCategory) {
        await updateMaterialCategory(editingCategory.id, categoryFormData);
        toast.success('Category updated');
      } else {
        await createMaterialCategory(categoryFormData);
        toast.success('Category created');
      }
      setIsCategoryModalOpen(false);
      loadCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save category');
    }
  }

  async function handleDeleteCategory(id) {
    if (!window.confirm('Delete this category?')) return;
    try {
      await deleteMaterialCategory(id);
      toast.success('Category deleted');
      loadCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete category');
    }
  }

  // Unit Handlers
  function handleOpenAddUnit() {
    setEditingUnit(null);
    setUnitFormData({ name: '', symbol: '', description: '', status: 'active' });
    setIsUnitModalOpen(true);
  }

  function handleOpenEditUnit(u) {
    setEditingUnit(u);
    setUnitFormData({
      name: u.name,
      symbol: u.symbol || '',
      description: u.description || '',
      status: u.status || 'active',
    });
    setIsUnitModalOpen(true);
  }

  async function handleSaveUnit(e) {
    e.preventDefault();
    if (!unitFormData.name || !unitFormData.symbol) {
      toast.error('Unit name and symbol are required');
      return;
    }
    try {
      if (editingUnit) {
        await updateUnitOfMeasure(editingUnit.id, unitFormData);
        toast.success('Unit updated');
      } else {
        await createUnitOfMeasure(unitFormData);
        toast.success('Unit created');
      }
      setIsUnitModalOpen(false);
      loadUnits();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save unit');
    }
  }

  async function handleDeleteUnit(id) {
    if (!window.confirm('Delete this unit of measure?')) return;
    try {
      await deleteUnitOfMeasure(id);
      toast.success('Unit deleted');
      loadUnits();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete unit');
    }
  }

  // Filtered & Paginated Categories
  const filteredCategories = categories.filter((c) => {
    if (!catSearch) return true;
    const q = catSearch.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.code?.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q)
    );
  });
  const totalCategories = filteredCategories.length;
  const totalCatPages = Math.max(1, Math.ceil(totalCategories / catLimit));
  const safeCatPage = Math.min(catPage, totalCatPages);
  const paginatedCategories = filteredCategories.slice((safeCatPage - 1) * catLimit, safeCatPage * catLimit);

  // Filtered & Paginated Units
  const filteredUnits = units.filter((u) => {
    if (!unitSearch) return true;
    const q = unitSearch.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.symbol?.toLowerCase().includes(q) ||
      u.description?.toLowerCase().includes(q)
    );
  });
  const totalUnits = filteredUnits.length;
  const totalUnitPages = Math.max(1, Math.ceil(totalUnits / unitLimit));
  const safeUnitPage = Math.min(unitPage, totalUnitPages);
  const paginatedUnits = filteredUnits.slice((safeUnitPage - 1) * unitLimit, safeUnitPage * unitLimit);

  // Standardized Category Columns
  const categoryColumns = [
    {
      key: 'index',
      header: '#',
      align: 'center',
      width: '40px',
      render: (_, idx, pageNum, pageSize) => (
        <span className="font-mono text-gray-400 text-[10.5px]">
          {(pageNum - 1) * pageSize + idx + 1}
        </span>
      ),
    },
    {
      key: 'code',
      header: 'Code',
      minWidth: '100px',
      render: (c) => <span className="font-mono font-bold text-xs text-ink">{c.code || '—'}</span>,
    },
    {
      key: 'name',
      header: 'Category Name',
      minWidth: '200px',
      render: (c) => <span className="font-semibold text-ink text-xs">{c.name}</span>,
    },
    {
      key: 'description',
      header: 'Description',
      minWidth: '250px',
      render: (c) => <span className="text-gray-500 text-[11px]">{c.description || '—'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      minWidth: '90px',
      render: (c) => (
        <span className="inline-block text-[8.5px] uppercase font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
          {c.status || 'Active'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      width: '80px',
      render: (c) => (
        <div className="flex items-center justify-end space-x-1">
          <TableIconButton
            variant="edit"
            onClick={() => handleOpenEditCategory(c)}
            title="Edit Category"
          />
          <TableIconButton
            variant="delete"
            onClick={() => handleDeleteCategory(c.id)}
            title="Delete Category"
          />
        </div>
      ),
    },
  ];

  // Standardized Unit Columns
  const unitColumns = [
    {
      key: 'index',
      header: '#',
      align: 'center',
      width: '40px',
      render: (_, idx, pageNum, pageSize) => (
        <span className="font-mono text-gray-400 text-[10.5px]">
          {(pageNum - 1) * pageSize + idx + 1}
        </span>
      ),
    },
    {
      key: 'symbol',
      header: 'Symbol / Code',
      minWidth: '120px',
      render: (u) => (
        <span className="font-mono font-bold text-xs bg-gray-100 text-ink px-1.5 py-0.5 rounded border border-gray-200">
          {u.symbol}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Unit Name',
      minWidth: '180px',
      render: (u) => <span className="font-semibold text-ink text-xs">{u.name}</span>,
    },
    {
      key: 'description',
      header: 'Description / Usage',
      minWidth: '250px',
      render: (u) => <span className="text-gray-500 text-[11px]">{u.description || '—'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      minWidth: '90px',
      render: (u) => (
        <span className="inline-block text-[8.5px] uppercase font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
          {u.status || 'Active'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      width: '80px',
      render: (u) => (
        <div className="flex items-center justify-end space-x-1">
          <TableIconButton
            variant="edit"
            onClick={() => handleOpenEditUnit(u)}
            title="Edit Unit"
          />
          <TableIconButton
            variant="delete"
            onClick={() => handleDeleteUnit(u.id)}
            title="Delete Unit"
          />
        </div>
      ),
    },
  ];

  return (
    <div className="h-full flex flex-col p-3 md:p-3.5 font-sans space-y-2 max-w-full overflow-hidden">
      {/* Top Header */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
              Masters Module
            </span>
            <h1 className="text-lg font-bold text-ink tracking-tight">Category & Unit Masters</h1>
          </div>
          <p className="text-[10.5px] text-gray-500">
            Define material categories (fabric, rib, packaging) and units of measure (meter, kg, piece, spool)
          </p>
        </div>

        {/* Tab Switcher & Action Button */}
        <div className="flex items-center space-x-2">
          <div className="bg-gray-100 p-0.5 rounded-lg flex items-center space-x-1 border border-border">
            <button
              onClick={() => setActiveTab('categories')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                activeTab === 'categories' ? 'bg-white text-ink shadow-2xs' : 'text-gray-500 hover:text-ink'
              }`}
            >
              🏷️ Material Categories ({categories.length})
            </button>
            <button
              onClick={() => setActiveTab('units')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                activeTab === 'units' ? 'bg-white text-ink shadow-2xs' : 'text-gray-500 hover:text-ink'
              }`}
            >
              📏 Units of Measure ({units.length})
            </button>
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => {
              loadCategories();
              loadUnits();
              toast.success('Masters refreshed');
            }}
            disabled={loadingCategories || loadingUnits}
            className="h-7 px-2.5 text-[11px] font-semibold bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-ink hover:border-gray-400 rounded-md transition-all flex items-center space-x-1.5 shadow-2xs group cursor-pointer"
            title="Refresh categories and units"
          >
            <svg
              className={`w-3.5 h-3.5 text-gray-500 group-hover:text-ink ${
                loadingCategories || loadingUnits ? 'animate-spin text-accent' : 'group-hover:rotate-180 transition-transform duration-300'
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

          <button
            onClick={activeTab === 'categories' ? handleOpenAddCategory : handleOpenAddUnit}
            className="h-7 px-3 text-[11px] font-semibold bg-ink text-white hover:bg-black rounded-md transition-colors flex items-center space-x-1 shadow-xs cursor-pointer"
          >
            <span className="text-xs font-bold">+</span>
            <span>{activeTab === 'categories' ? 'Add Category' : 'Add Unit (UOM)'}</span>
          </button>
        </div>
      </div>

      {/* Main Table Card via Reusable DataTable */}
      {activeTab === 'categories' ? (
        <DataTable
          columns={categoryColumns}
          data={paginatedCategories}
          loading={loadingCategories}
          minWidth="750px"
          toolbar={
            <TableToolbar>
              <SearchBar
                value={catSearch}
                onChange={(val) => {
                  setCatSearch(val);
                  setCatPage(1);
                }}
                placeholder="Search material categories by name, code..."
              />
            </TableToolbar>
          }
          emptyState={{
            icon: '🏷️',
            title: 'No material categories found',
            description: 'Add your textile categories (fabric, rib, thread, trim) to organize production.',
            actionButton: (
              <button
                onClick={handleOpenAddCategory}
                className="px-3 py-1.5 text-xs font-semibold bg-ink text-white rounded-md mt-2 hover:bg-black"
              >
                + Add First Category
              </button>
            ),
          }}
          pagination={{
            page: safeCatPage,
            limit: catLimit,
            total: totalCategories,
            totalPages: totalCatPages,
            onPageChange: setCatPage,
            onLimitChange: (newLimit) => {
              setCatLimit(newLimit);
              setCatPage(1);
            },
            itemName: 'categories',
          }}
        />
      ) : (
        <DataTable
          columns={unitColumns}
          data={paginatedUnits}
          loading={loadingUnits}
          minWidth="750px"
          toolbar={
            <TableToolbar>
              <SearchBar
                value={unitSearch}
                onChange={(val) => {
                  setUnitSearch(val);
                  setUnitPage(1);
                }}
                placeholder="Search units of measure by name, symbol..."
              />
            </TableToolbar>
          }
          emptyState={{
            icon: '📏',
            title: 'No units of measure found',
            description: 'Add standard units of measure (meter, kg, piece, spool) for inventory.',
            actionButton: (
              <button
                onClick={handleOpenAddUnit}
                className="px-3 py-1.5 text-xs font-semibold bg-ink text-white rounded-md mt-2 hover:bg-black"
              >
                + Add First Unit
              </button>
            ),
          }}
          pagination={{
            page: safeUnitPage,
            limit: unitLimit,
            total: totalUnits,
            totalPages: totalUnitPages,
            onPageChange: setUnitPage,
            onLimitChange: (newLimit) => {
              setUnitLimit(newLimit);
              setUnitPage(1);
            },
            itemName: 'units',
          }}
        />
      )}

      {/* Add / Edit Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-border rounded-xl max-w-sm w-full p-4 shadow-xl space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h3 className="text-sm font-bold text-ink">
                {editingCategory ? 'Edit Material Category' : 'Add Material Category'}
              </h3>
              <button onClick={() => setIsCategoryModalOpen(false)} className="text-gray-400 hover:text-ink font-bold">
                &times;
              </button>
            </div>
            <form onSubmit={handleSaveCategory} className="space-y-2.5">
              <div>
                <label className="block font-medium text-ink mb-1">Category Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Fabric / Textiles"
                  value={categoryFormData.name}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                  className="w-full h-8 px-2 bg-white border border-border rounded text-xs"
                  required
                />
              </div>
              <div>
                <label className="block font-medium text-ink mb-1">Category Code</label>
                <input
                  type="text"
                  placeholder="e.g. FAB"
                  value={categoryFormData.code}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, code: e.target.value })}
                  className="w-full h-8 px-2 bg-white border border-border rounded text-xs font-mono uppercase"
                />
              </div>
              <div>
                <label className="block font-medium text-ink mb-1">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Single jersey, cotton, polyester blends"
                  value={categoryFormData.description}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                  className="w-full h-8 px-2 bg-white border border-border rounded text-xs"
                />
              </div>
              <div className="pt-2 border-t border-border flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-3 py-1 bg-white border border-border text-ink rounded"
                >
                  Cancel
                </button>
                <button type="submit" className="px-3 py-1 bg-ink text-white rounded font-medium">
                  {editingCategory ? 'Update Category' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Unit Modal */}
      {isUnitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-border rounded-xl max-w-sm w-full p-4 shadow-xl space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h3 className="text-sm font-bold text-ink">
                {editingUnit ? 'Edit Unit of Measure' : 'Add Unit of Measure (UOM)'}
              </h3>
              <button onClick={() => setIsUnitModalOpen(false)} className="text-gray-400 hover:text-ink font-bold">
                &times;
              </button>
            </div>
            <form onSubmit={handleSaveUnit} className="space-y-2.5">
              <div>
                <label className="block font-medium text-ink mb-1">Unit Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Meter, Kilogram, Spool"
                  value={unitFormData.name}
                  onChange={(e) => setUnitFormData({ ...unitFormData, name: e.target.value })}
                  className="w-full h-8 px-2 bg-white border border-border rounded text-xs"
                  required
                />
              </div>
              <div>
                <label className="block font-medium text-ink mb-1">Symbol / Code *</label>
                <input
                  type="text"
                  placeholder="e.g. meter, kg, piece, spool"
                  value={unitFormData.symbol}
                  onChange={(e) => setUnitFormData({ ...unitFormData, symbol: e.target.value })}
                  className="w-full h-8 px-2 bg-white border border-border rounded text-xs font-mono"
                  required
                />
              </div>
              <div>
                <label className="block font-medium text-ink mb-1">Description / Usage</label>
                <input
                  type="text"
                  placeholder="e.g. Length measurement for roll fabric"
                  value={unitFormData.description}
                  onChange={(e) => setUnitFormData({ ...unitFormData, description: e.target.value })}
                  className="w-full h-8 px-2 bg-white border border-border rounded text-xs"
                />
              </div>
              <div className="pt-2 border-t border-border flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsUnitModalOpen(false)}
                  className="px-3 py-1 bg-white border border-border text-ink rounded"
                >
                  Cancel
                </button>
                <button type="submit" className="px-3 py-1 bg-ink text-white rounded font-medium">
                  {editingUnit ? 'Update Unit' : 'Save Unit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
