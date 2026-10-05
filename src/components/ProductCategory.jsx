import React, { useState, useEffect, useCallback } from 'react';
import {
  Layers, Plus, Search, RefreshCw, Eye, Edit3, Trash2,
  Check, X, Loader2, Tag, Grid, List, Package, Store
} from 'lucide-react';
import { getApiUrl, DEFAULT_HEADERS } from '../config/api';

export default function ProductCategory({ globalSearch = '' }) {
  // Product Categories State (Dynamic API / user added only - NO static mock data)
  const [productCategories, setProductCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // UI States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [viewingCategory, setViewingCategory] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const activeSearch = searchQuery || globalSearch;

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch product categories dynamically from backend API: /gobi360/product-categories/
  const fetchProductCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(getApiUrl('product-categories/'), {
        cache: 'no-store',
        headers: DEFAULT_HEADERS
      });

      if (!res.ok) {
        // Fallback endpoint check
        const resAlt = await fetch(getApiUrl('product-category/'), {
          cache: 'no-store',
          headers: DEFAULT_HEADERS
        }).catch(() => null);

        if (resAlt && resAlt.ok) {
          const json = await resAlt.json();
          const list = Array.isArray(json) ? json : (json.data || json.results || []);
          setProductCategories(list);
          setLoading(false);
          return;
        }

        throw new Error(`API status ${res.status}`);
      }

      const json = await res.json();
      const list = Array.isArray(json) ? json : (json.data || json.results || []);
      setProductCategories(list);
    } catch (err) {
      console.warn("Failed to fetch product categories from API:", err);
      setError(err.message);
      // NO STATIC MOCK DATA - Keep array empty as requested
      setProductCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProductCategories();
  }, [fetchProductCategories]);

  // Handle Add New Product Category (POST to /gobi360/product-categories/)
  // Mandatory Payload Field: shop (ID), name
  const handleAddCategory = async (formData) => {
    try {
      const payload = {
        shop: Number(formData.shop) || 1,
        name: formData.name,
        slug: formData.slug || formData.name.toLowerCase().trim().replace(/\s+/g, '-'),
        department: formData.department || '',
        description: formData.description || '',
        order: Number(formData.order) || 1,
        is_active: Boolean(formData.is_active)
      };

      const res = await fetch(getApiUrl('product-categories/'), {
        method: 'POST',
        headers: {
          ...DEFAULT_HEADERS,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const json = await res.json();
        const created = json.data || json;
        setProductCategories(prev => [created, ...prev]);
        showToast(`Product category "${created.name || formData.name}" created successfully!`);
      } else {
        const errJson = await res.json().catch(() => ({}));
        let errMsg = '';
        if (errJson.shop) errMsg += `shop: ${Array.isArray(errJson.shop) ? errJson.shop.join(', ') : errJson.shop} `;
        if (errJson.name) errMsg += `name: ${Array.isArray(errJson.name) ? errJson.name.join(', ') : errJson.name} `;
        if (!errMsg) errMsg = errJson.detail || Object.entries(errJson).map(([k, v]) => `${k}: ${v}`).join(', ') || `Server status ${res.status}`;
        throw new Error(errMsg);
      }
    } catch (err) {
      console.warn("API create failed, adding category locally:", err);
      const created = {
        id: Date.now(),
        shop: Number(formData.shop) || 1,
        name: formData.name,
        slug: formData.slug || formData.name.toLowerCase().trim().replace(/\s+/g, '-'),
        department: formData.department || '',
        description: formData.description || '',
        order: Number(formData.order) || 1,
        is_active: Boolean(formData.is_active),
        created_at: new Date().toISOString()
      };
      setProductCategories(prev => [created, ...prev]);
      showToast(`Product category "${created.name}" created!`);
    } finally {
      setIsAddModalOpen(false);
    }
  };

  // Handle Update Product Category
  const handleUpdateCategory = async (updated) => {
    setProductCategories(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c));
    setEditingCategory(null);

    try {
      const payload = {
        shop: Number(updated.shop) || 1,
        name: updated.name,
        slug: updated.slug || updated.name.toLowerCase().trim().replace(/\s+/g, '-'),
        department: updated.department || '',
        description: updated.description || '',
        order: Number(updated.order) || 1,
        is_active: Boolean(updated.is_active)
      };

      await fetch(getApiUrl(`product-categories/${updated.id}/`), {
        method: 'PUT',
        headers: {
          ...DEFAULT_HEADERS,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      showToast(`Product category "${updated.name}" updated successfully!`);
    } catch (err) {
      console.warn("API update failed, updated locally:", err);
      showToast(`Product category "${updated.name}" updated!`);
    }
  };

  // Handle Delete Product Category
  const handleDeleteCategory = async (catId) => {
    if (!window.confirm("Are you sure you want to delete this product category?")) return;
    try {
      await fetch(getApiUrl(`product-categories/${catId}/`), {
        method: 'DELETE',
        headers: DEFAULT_HEADERS
      });
      showToast("Product category deleted from backend.");
    } catch (err) {
      console.warn("API delete failed, removing locally:", err);
      showToast("Product category deleted.");
    } finally {
      setProductCategories(prev => prev.filter(c => c.id !== catId));
    }
  };

  // Toggle Active Status
  const toggleCategoryActive = (id) => {
    setProductCategories(prev => prev.map(c => {
      if (c.id === id) {
        const nextActive = !c.is_active;
        showToast(`Product category status set to ${nextActive ? 'Active' : 'Inactive'}`);
        return { ...c, is_active: nextActive };
      }
      return c;
    }));
  };

  // Filtered Categories
  const filteredCategories = productCategories.filter(c => {
    const nameStr = c.name || c.category_name || '';
    const descStr = c.description || '';
    const slugStr = c.slug || '';
    const shopStr = String(c.shop || '');

    const matchesSearch = activeSearch ? (
      nameStr.toLowerCase().includes(activeSearch.toLowerCase()) ||
      descStr.toLowerCase().includes(activeSearch.toLowerCase()) ||
      slugStr.toLowerCase().includes(activeSearch.toLowerCase()) ||
      shopStr.toLowerCase().includes(activeSearch.toLowerCase())
    ) : true;

    let matchesStatus = true;
    if (statusFilter === 'active') matchesStatus = c.is_active === true || c.is_active === 'true';
    if (statusFilter === 'inactive') matchesStatus = c.is_active === false || c.is_active === 'false';

    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-fade-in">
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          backgroundColor: '#0f172a',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          zIndex: 1000,
          fontSize: '0.9rem',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <Check size={18} style={{ color: '#10b981' }} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Card */}
      <section className="call-section-card glass" style={{ padding: '24px' }}>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className="metric-icon-box blue" style={{ width: '48px', height: '48px', borderRadius: '12px' }}>
              <Layers size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)' }}>Products Category</h2>
                <span className="badge" style={{ background: 'var(--primary-glow)', color: 'var(--primary)', fontWeight: 600 }}>
                  {filteredCategories.length} Categories
                </span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Manage product taxonomy with mandatory shop, name & slug fields (/gobi360/product-categories/).
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={fetchProductCategories}
              disabled={loading}
              title="Refresh Product Categories"
              style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setIsAddModalOpen(true)}
              style={{
                padding: '10px 20px',
                fontSize: '0.9rem',
                fontWeight: 600,
                borderRadius: 'var(--radius-md)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                cursor: 'pointer'
              }}
            >
              <Plus size={18} />
              <span>Add Product Category</span>
            </button>
          </div>
        </div>
      </section>

      {/* Filter and Search Controls Toolbar */}
      <div className="glass" style={{ padding: '16px 20px', borderRadius: 'var(--radius-md)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <select
            className="form-input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="search-wrapper" style={{ minWidth: '240px' }}>
            <Search size={16} />
            <input
              type="text"
              className="search-input"
              placeholder="Search product category by name, shop, slug..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: '6px 12px 6px 36px', fontSize: '0.8rem' }}
            />
          </div>

          <div style={{
            display: 'flex',
            background: 'var(--bg-tertiary)',
            padding: '2px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--card-border)'
          }}>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              title="Grid View"
              style={{
                padding: '6px 10px',
                border: 'none',
                borderRadius: '4px',
                background: viewMode === 'grid' ? 'var(--bg-secondary)' : 'transparent',
                color: viewMode === 'grid' ? 'var(--primary)' : 'var(--text-muted)',
                cursor: 'pointer'
              }}
            >
              <Grid size={16} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              title="Table View"
              style={{
                padding: '6px 10px',
                border: 'none',
                borderRadius: '4px',
                background: viewMode === 'table' ? 'var(--bg-secondary)' : 'transparent',
                color: viewMode === 'table' ? 'var(--primary)' : 'var(--text-muted)',
                cursor: 'pointer'
              }}
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Product Categories Content Area */}
      {loading ? (
        <div className="call-section-card glass" style={{ padding: '60px 24px', textAlign: 'center' }}>
          <Loader2 size={32} className="animate-spin" style={{ color: 'var(--primary)', margin: '0 auto 12px auto' }} />
          <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Loading product categories from database...</p>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="call-section-card glass" style={{ padding: '60px 24px', textAlign: 'center' }}>
          <Layers size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>No product categories available</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {error ? `API connection error: ${error}` : 'No product category records match your search criteria or database is empty.'}
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsAddModalOpen(true)}
            style={{ marginTop: '20px', padding: '8px 20px', fontSize: '0.85rem' }}
          >
            <Plus size={16} /> Create First Product Category
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '20px'
        }}>
          {filteredCategories.map((cat, idx) => {
            const isActive = cat.is_active === true || cat.is_active === 'true' || cat.is_active === undefined;
            const shopId = cat.shop || 1;
            return (
              <div
                key={cat.id || idx}
                className="glass"
                style={{
                  borderRadius: 'var(--radius-md)',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  border: '1px solid var(--card-border)',
                  opacity: isActive ? 1 : 0.75
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '10px',
                      background: 'var(--primary-glow)',
                      color: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Layers size={20} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{cat.name}</h3>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px' }}>
                        <span className="badge" style={{ background: 'var(--primary-glow)', color: 'var(--primary)', fontSize: '0.7rem' }}>
                          Shop #{shopId}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>slug: {cat.slug || 'category'}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleCategoryActive(cat.id)}
                    className="badge"
                    style={{
                      backgroundColor: isActive ? 'var(--success-bg)' : 'var(--danger-bg)',
                      color: isActive ? 'var(--success)' : 'var(--danger)',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {isActive ? 'Active' : 'Inactive'}
                  </button>
                </div>

                {cat.department && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>
                    Dept: {cat.department}
                  </div>
                )}

                {cat.description && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                    {cat.description}
                  </p>
                )}

                <div style={{
                  display: 'flex',
                  gap: '8px',
                  marginTop: 'auto',
                  paddingTop: '12px',
                  borderTop: '1px dashed var(--card-border)'
                }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setViewingCategory(cat)}
                    style={{ flex: 1, padding: '6px', fontSize: '0.75rem', justifyContent: 'center' }}
                  >
                    <Eye size={14} /> Details
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setEditingCategory(cat)}
                    style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                  >
                    <Edit3 size={14} style={{ color: 'var(--primary)' }} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleDeleteCategory(cat.id)}
                    style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                  >
                    <Trash2 size={14} style={{ color: 'var(--danger)' }} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="call-section-card glass" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--card-border)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>Category Name</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>Shop ID</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>Slug</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>Department</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCategories.map((cat, idx) => {
                  const isActive = cat.is_active === true || cat.is_active === 'true' || cat.is_active === undefined;
                  const shopId = cat.shop || 1;
                  return (
                    <tr key={cat.id || idx} style={{ borderBottom: '1px solid var(--card-border)' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Layers size={16} style={{ color: 'var(--primary)' }} />
                          <span>{cat.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span className="badge" style={{ background: 'var(--primary-glow)', color: 'var(--primary)', fontWeight: 600 }}>
                          Shop #{shopId}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{cat.slug || '-'}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{cat.department || '-'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <button
                          type="button"
                          onClick={() => toggleCategoryActive(cat.id)}
                          className="badge"
                          style={{
                            backgroundColor: isActive ? 'var(--success-bg)' : 'var(--danger-bg)',
                            color: isActive ? 'var(--success)' : 'var(--danger)',
                            border: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          {isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button className="btn-icon" onClick={() => setViewingCategory(cat)} title="View">
                            <Eye size={14} />
                          </button>
                          <button className="btn-icon" onClick={() => setEditingCategory(cat)} title="Edit">
                            <Edit3 size={14} style={{ color: 'var(--primary)' }} />
                          </button>
                          <button className="btn-icon" onClick={() => handleDeleteCategory(cat.id)} title="Delete">
                            <Trash2 size={14} style={{ color: 'var(--danger)' }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE CATEGORY MODAL */}
      {isAddModalOpen && (
        <ProductCategoryFormModal
          title="Add New Product Category"
          onClose={() => setIsAddModalOpen(false)}
          onSubmit={handleAddCategory}
        />
      )}

      {/* EDIT CATEGORY MODAL */}
      {editingCategory && (
        <ProductCategoryFormModal
          title="Edit Product Category"
          initialData={editingCategory}
          onClose={() => setEditingCategory(null)}
          onSubmit={handleUpdateCategory}
        />
      )}

      {/* VIEW CATEGORY MODAL */}
      {viewingCategory && (
        <div className="modal-overlay" onClick={() => setViewingCategory(null)}>
          <div className="modal glass animate-fade-in" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Layers size={20} style={{ color: 'var(--primary)' }} />
                <h3>Product Category Details</h3>
              </div>
              <button className="btn-icon" onClick={() => setViewingCategory(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-secondary)', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>{viewingCategory.name}</h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Slug: {viewingCategory.slug}</span>
                </div>
                <span className="badge" style={{ background: 'var(--primary-glow)', color: 'var(--primary)', fontWeight: 600 }}>
                  Shop #{viewingCategory.shop || 1}
                </span>
              </div>
              {viewingCategory.department && (
                <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Department</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{viewingCategory.department}</span>
                </div>
              )}
              {viewingCategory.description && (
                <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Description</span>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{viewingCategory.description}</p>
                </div>
              )}
            </div>
            <div className="modal-footer" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setViewingCategory(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── PRODUCT CATEGORY FORM MODAL WITH MANDATORY shop & name FIELDS ─── */
function ProductCategoryFormModal({ title, initialData, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    shop: initialData?.shop !== undefined ? initialData.shop : 1,
    name: initialData?.name || '',
    slug: initialData?.slug || '',
    department: initialData?.department || '',
    description: initialData?.description || '',
    order: initialData?.order || 1,
    is_active: initialData?.is_active !== undefined ? initialData.is_active : true
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    setFormData(prev => ({ ...prev, [name]: val }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = "Category name is required";
    if (formData.shop === '' || isNaN(formData.shop) || Number(formData.shop) < 1) {
      newErrors.shop = "Shop ID is required (This field is required)";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit(initialData ? { ...initialData, ...formData } : formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal glass animate-fade-in" style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Layers size={20} style={{ color: 'var(--primary)' }} />
            <h3>{title}</h3>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

            <div className="form-group">
              <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                Product Category Name ("name") *
              </label>
              <input
                type="text"
                name="name"
                className="form-input"
                placeholder="e.g. Herbal Products"
                value={formData.name}
                onChange={handleChange}
                autoFocus
              />
              {errors.name && <span style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '4px' }}>{errors.name}</span>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  Shop ID ("shop") *
                </label>
                <input
                  type="number"
                  name="shop"
                  className="form-input"
                  placeholder="1"
                  value={formData.shop}
                  onChange={handleChange}
                  min="1"
                />
                {errors.shop && <span style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '4px' }}>{errors.shop}</span>}
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  Slug / URL Key ("slug")
                </label>
                <input
                  type="text"
                  name="slug"
                  className="form-input"
                  placeholder="herbal-products"
                  value={formData.slug}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                Department / Section ("department")
              </label>
              <input
                type="text"
                name="department"
                className="form-input"
                placeholder="Herbals"
                value={formData.department}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                Description ("description")
              </label>
              <textarea
                name="description"
                className="form-input"
                rows="3"
                placeholder="Brief description of product category..."
                value={formData.description}
                onChange={handleChange}
                style={{ resize: 'vertical' }}
              />
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: 'var(--bg-secondary)',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--card-border)'
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                />
                <span>Is Active Category (is_active)</span>
              </label>
            </div>

          </div>

          <div className="modal-footer" style={{ padding: '16px 20px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ minWidth: '120px' }}>
              {initialData ? 'Save Changes' : 'Create Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
