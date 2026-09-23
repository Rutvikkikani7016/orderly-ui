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

export default function CategoryUnitMaster() {
  const [activeTab, setActiveTab] = useState('categories'); // 'categories' | 'units'

  // Categories state
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
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

      {/* Main Table Card */}
      <div className="flex-1 min-h-0 flex flex-col bg-white border border-border rounded-lg overflow-hidden shadow-xs">
        {/* Categories Tab */}
        {activeTab === 'categories' && (
          <div className="flex-1 min-h-0 overflow-auto w-full">
            <table className="w-full min-w-[750px] text-left text-xs text-ink">
              <thead className="sticky top-0 z-10 bg-gray-50 text-gray-500 uppercase text-[9px] font-bold tracking-wider border-b border-border shadow-2xs">
                <tr>
                  <th className="px-2.5 py-2 text-center w-10 bg-gray-50">#</th>
                  <th className="px-3 py-2 min-w-[100px] bg-gray-50">Code</th>
                  <th className="px-3 py-2 min-w-[200px] bg-gray-50">Category Name</th>
                  <th className="px-3 py-2 min-w-[250px] bg-gray-50">Description</th>
                  <th className="px-3 py-2 text-center min-w-[90px] bg-gray-50">Status</th>
                  <th className="px-3 py-2 text-right w-24 bg-gray-50">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loadingCategories ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                      <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                      <span className="text-xs">Loading categories…</span>
                    </td>
                  </tr>
                ) : categories.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                      <p className="font-semibold text-ink text-xs mb-0.5">No material categories found</p>
                      <button
                        onClick={handleOpenAddCategory}
                        className="px-3 py-1.5 text-xs font-semibold bg-ink text-white rounded-md mt-2"
                      >
                        + Add First Category
                      </button>
                    </td>
                  </tr>
                ) : (
                  categories.map((c, idx) => (
                    <tr key={c.id} className="hover:bg-blue-50/20 transition-colors">
                      <td className="px-2.5 py-2 text-center text-[10.5px] font-mono text-gray-400">{idx + 1}</td>
                      <td className="px-3 py-2 font-mono font-bold text-xs text-ink">{c.code || '—'}</td>
                      <td className="px-3 py-2 font-semibold text-ink text-xs">{c.name}</td>
                      <td className="px-3 py-2 text-gray-500 text-[11px]">{c.description || '—'}</td>
                      <td className="px-3 py-2 text-center">
                        <span className="inline-block text-[8.5px] uppercase font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {c.status || 'Active'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right space-x-1">
                        <button
                          onClick={() => handleOpenEditCategory(c)}
                          className="px-1.5 py-0.5 text-[10.5px] bg-gray-100 hover:bg-gray-200 text-ink rounded font-medium"
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(c.id)}
                          className="px-1.5 py-0.5 text-[10.5px] bg-rose-50 hover:bg-rose-100 text-rose-600 rounded font-medium"
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Units Tab */}
        {activeTab === 'units' && (
          <div className="flex-1 min-h-0 overflow-auto w-full">
            <table className="w-full min-w-[750px] text-left text-xs text-ink">
              <thead className="sticky top-0 z-10 bg-gray-50 text-gray-500 uppercase text-[9px] font-bold tracking-wider border-b border-border shadow-2xs">
                <tr>
                  <th className="px-2.5 py-2 text-center w-10 bg-gray-50">#</th>
                  <th className="px-3 py-2 min-w-[120px] bg-gray-50">Symbol / Code</th>
                  <th className="px-3 py-2 min-w-[180px] bg-gray-50">Unit Name</th>
                  <th className="px-3 py-2 min-w-[250px] bg-gray-50">Description / Usage</th>
                  <th className="px-3 py-2 text-center min-w-[90px] bg-gray-50">Status</th>
                  <th className="px-3 py-2 text-right w-24 bg-gray-50">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loadingUnits ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                      <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                      <span className="text-xs">Loading units…</span>
                    </td>
                  </tr>
                ) : units.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                      <p className="font-semibold text-ink text-xs mb-0.5">No units of measure found</p>
                      <button
                        onClick={handleOpenAddUnit}
                        className="px-3 py-1.5 text-xs font-semibold bg-ink text-white rounded-md mt-2"
                      >
                        + Add First Unit
                      </button>
                    </td>
                  </tr>
                ) : (
                  units.map((u, idx) => (
                    <tr key={u.id} className="hover:bg-blue-50/20 transition-colors">
                      <td className="px-2.5 py-2 text-center text-[10.5px] font-mono text-gray-400">{idx + 1}</td>
                      <td className="px-3 py-2">
                        <span className="font-mono font-bold text-xs bg-gray-100 text-ink px-1.5 py-0.5 rounded border border-gray-200">
                          {u.symbol}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-semibold text-ink text-xs">{u.name}</td>
                      <td className="px-3 py-2 text-gray-500 text-[11px]">{u.description || '—'}</td>
                      <td className="px-3 py-2 text-center">
                        <span className="inline-block text-[8.5px] uppercase font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {u.status || 'Active'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right space-x-1">
                        <button
                          onClick={() => handleOpenEditUnit(u)}
                          className="px-1.5 py-0.5 text-[10.5px] bg-gray-100 hover:bg-gray-200 text-ink rounded font-medium"
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteUnit(u.id)}
                          className="px-1.5 py-0.5 text-[10.5px] bg-rose-50 hover:bg-rose-100 text-rose-600 rounded font-medium"
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
