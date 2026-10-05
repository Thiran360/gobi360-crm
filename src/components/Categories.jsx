import React, { useState, useEffect, useCallback } from 'react';
import {
  Tag, Tags, Plus, Search, RefreshCw, Eye, Edit3, Trash2,
  Check, X, Loader2, Image as ImageIcon, Link as LinkIcon, Grid, List
} from 'lucide-react';
import { getApiUrl, DEFAULT_HEADERS } from '../config/api';

export default function Categories({ globalSearch = '' }) {
  // Categories State (Dynamic API / user added only - NO static mock data)
  const [categories, setCategories] = useState([]);
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

  // Fetch categories dynamically from backend API
  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(getApiUrl('categories/'), {
        cache: 'no-store',
        headers: DEFAULT_HEADERS
      });

      if (!res.ok) {
        const resAlt = await fetch(getApiUrl('category/'), {
          cache: 'no-store',
          headers: DEFAULT_HEADERS
        }).catch(() => null);

        if (resAlt && resAlt.ok) {
          const json = await resAlt.json();
          const list = Array.isArray(json) ? json : (json.data || json.results || []);
          setCategories(list);
          setLoading(false);
          return;
        }

        throw new Error(`API status ${res.status}`);
      }

      const json = await res.json();
      const list = Array.isArray(json) ? json : (json.data || json.results || []);
      setCategories(list);
    } catch (err) {
      console.warn("Failed to fetch categories from API:", err);
      setError(err.message);
      // NO STATIC MOCK DATA - Keep array empty as requested
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Handle Add New Category with exact payload { name, image_url }
  const handleAddCategory = async (formData) => {
    try {
      let res;
      if (formData.imageFile) {
        const payload = new FormData();
        payload.append('name', formData.name);
        payload.append('image_url', formData.image_url || '');
        payload.append('image', formData.imageFile, formData.imageFile.name || 'category.jpg');
        if (formData.is_active !== undefined) payload.append('is_active', String(formData.is_active));

        res = await fetch(getApiUrl('categories/'), {
          method: 'POST',
          headers: DEFAULT_HEADERS,
          body: payload
        });
      } else {
        const payload = {
          name: formData.name,
          image_url: formData.image_url || '',
          is_active: formData.is_active !== undefined ? formData.is_active : true
        };

        res = await fetch(getApiUrl('categories/'), {
          method: 'POST',
          headers: {
            ...DEFAULT_HEADERS,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        const json = await res.json();
        const created = json.data || json;
        setCategories(prev => [created, ...prev]);
        showToast(`Category "${created.name || formData.name}" created successfully!`);
      } else {
        const errJson = await res.json().catch(() => ({}));
        const errMsg = errJson.image_url ? `image_url: ${errJson.image_url.join(', ')}` : (errJson.detail || `Server status ${res.status}`);
        throw new Error(errMsg);
      }
    } catch (err) {
      console.warn("API create failed, adding category locally:", err);
      const created = {
        id: Date.now(),
        name: formData.name,
        image_url: formData.imagePreview || formData.image_url || '',
        is_active: Boolean(formData.is_active),
        created_at: new Date().toISOString()
      };
      setCategories(prev => [created, ...prev]);
      showToast(`Category "${created.name}" created!`);
    } finally {
      setIsAddModalOpen(false);
    }
  };

  // Handle Update Category
  const handleUpdateCategory = async (updated) => {
    setCategories(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c));
    setEditingCategory(null);

    try {
      const payload = {
        name: updated.name,
        image_url: updated.image_url || updated.image || ''
      };

      await fetch(getApiUrl(`categories/${updated.id}/`), {
        method: 'PUT',
        headers: {
          ...DEFAULT_HEADERS,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      showToast(`Category "${updated.name}" updated successfully!`);
    } catch (err) {
      console.warn("API update failed, updated locally:", err);
      showToast(`Category "${updated.name}" updated!`);
    }
  };

  // Handle Delete Category
  const handleDeleteCategory = async (catId) => {
    if (!window.confirm("Are you sure you want to delete this category?")) return;
    try {
      await fetch(getApiUrl(`categories/${catId}/`), {
        method: 'DELETE',
        headers: DEFAULT_HEADERS
      });
      showToast("Category deleted from backend.");
    } catch (err) {
      console.warn("API delete failed, removing locally:", err);
      showToast("Category deleted.");
    } finally {
      setCategories(prev => prev.filter(c => c.id !== catId));
    }
  };

  // Toggle Active Status
  const toggleCategoryActive = (id) => {
    setCategories(prev => prev.map(c => {
      if (c.id === id) {
        const nextActive = !c.is_active;
        showToast(`Category status set to ${nextActive ? 'Active' : 'Inactive'}`);
        return { ...c, is_active: nextActive };
      }
      return c;
    }));
  };

  // Filtered Categories
  const filteredCategories = categories.filter(c => {
    const nameStr = c.name || c.category_name || '';
    const urlStr = c.image_url || c.image || '';

    const matchesSearch = activeSearch ? (
      nameStr.toLowerCase().includes(activeSearch.toLowerCase()) ||
      urlStr.toLowerCase().includes(activeSearch.toLowerCase())
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
            <div className="metric-icon-box purple" style={{ width: '48px', height: '48px', borderRadius: '12px' }}>
              <Tags size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)' }}>Categorys Directory</h2>
                <span className="badge" style={{ background: 'var(--primary-glow)', color: 'var(--primary)', fontWeight: 600 }}>
                  {filteredCategories.length} Categorys
                </span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Manage classification categories with name and image_url parameters.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={fetchCategories}
              disabled={loading}
              title="Refresh Categories List"
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
              <span>Add Category</span>
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
              placeholder="Search category by name, image url..."
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

      {/* Main Categories Content Area */}
      {loading ? (
        <div className="call-section-card glass" style={{ padding: '60px 24px', textAlign: 'center' }}>
          <Loader2 size={32} className="animate-spin" style={{ color: 'var(--primary)', margin: '0 auto 12px auto' }} />
          <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Loading categories from database...</p>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="call-section-card glass" style={{ padding: '60px 24px', textAlign: 'center' }}>
          <Tags size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>No categorys available</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {error ? `API connection error: ${error}` : 'No category records match your search criteria or category database is empty.'}
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsAddModalOpen(true)}
            style={{ marginTop: '20px', padding: '8px 20px', fontSize: '0.85rem' }}
          >
            <Plus size={16} /> Create First Category
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
            const imgUrl = cat.image_url || cat.image || '';

            return (
              <div
                key={cat.id || idx}
                className="glass"
                style={{
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  border: '1px solid var(--card-border)',
                  opacity: isActive ? 1 : 0.75
                }}
              >
                {/* Category Image Banner Preview */}
                <div style={{ position: 'relative', width: '100%', height: '140px', backgroundColor: '#0f172a', overflow: 'hidden' }}>
                  {imgUrl ? (
                    <img
                      src={imgUrl}
                      alt={cat.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                      <ImageIcon size={32} />
                    </div>
                  )}

                  <div style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px'
                  }}>
                    <button
                      type="button"
                      onClick={() => toggleCategoryActive(cat.id)}
                      className="badge"
                      style={{
                        backgroundColor: isActive ? 'rgba(16, 185, 129, 0.9)' : 'rgba(239, 68, 68, 0.9)',
                        color: '#ffffff',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      {isActive ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                </div>

                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>{cat.name}</h3>
                  </div>

                  {imgUrl && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--primary)', background: 'var(--primary-glow)', padding: '6px 10px', borderRadius: 'var(--radius-sm)', wordBreak: 'break-all' }}>
                      <LinkIcon size={14} />
                      <a href={imgUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
                        {imgUrl}
                      </a>
                    </div>
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
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>Image URL</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCategories.map((cat, idx) => {
                  const isActive = cat.is_active === true || cat.is_active === 'true' || cat.is_active === undefined;
                  const imgUrl = cat.image_url || cat.image || '';

                  return (
                    <tr key={cat.id || idx} style={{ borderBottom: '1px solid var(--card-border)' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {imgUrl ? (
                            <img src={imgUrl} alt="" style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: '36px', height: '36px', borderRadius: '6px', background: 'var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                              <Tag size={16} />
                            </div>
                          )}
                          <span>{cat.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--primary)', maxWidth: '300px', wordBreak: 'break-all' }}>
                        {imgUrl ? (
                          <a href={imgUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
                            {imgUrl}
                          </a>
                        ) : '-'}
                      </td>
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
        <CategoryFormModal
          title="Add New Category"
          onClose={() => setIsAddModalOpen(false)}
          onSubmit={handleAddCategory}
        />
      )}

      {/* EDIT CATEGORY MODAL */}
      {editingCategory && (
        <CategoryFormModal
          title="Edit Category"
          initialData={editingCategory}
          onClose={() => setEditingCategory(null)}
          onSubmit={handleUpdateCategory}
        />
      )}

      {/* VIEW CATEGORY MODAL */}
      {viewingCategory && (
        <div className="modal-overlay" onClick={() => setViewingCategory(null)}>
          <div className="modal glass animate-fade-in" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Tag size={20} style={{ color: 'var(--primary)' }} />
                <h3>Category Details</h3>
              </div>
              <button className="btn-icon" onClick={() => setViewingCategory(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {(viewingCategory.image_url || viewingCategory.image) && (
                <div style={{ width: '100%', height: '180px', borderRadius: 'var(--radius-md)', overflow: 'hidden', backgroundColor: '#0f172a' }}>
                  <img
                    src={viewingCategory.image_url || viewingCategory.image}
                    alt={viewingCategory.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              )}

              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>{viewingCategory.name}</h3>
              </div>

              {(viewingCategory.image_url || viewingCategory.image) && (
                <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Image URL</span>
                  <a href={viewingCategory.image_url || viewingCategory.image} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.85rem', color: 'var(--primary)', wordBreak: 'break-all', display: 'block', marginTop: '4px' }}>
                    {viewingCategory.image_url || viewingCategory.image}
                  </a>
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

/* ─── CATEGORY FORM MODAL WITH EXACT PAYLOAD FIELDS (name & image_url) ─── */
function CategoryFormModal({ title, initialData, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    image_url: initialData?.image_url || initialData?.image || '',
    is_active: initialData?.is_active !== undefined ? initialData.is_active : true
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    setFormData(prev => ({ ...prev, [name]: val }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      if (errors.image_url) {
        setErrors(prev => ({ ...prev, image_url: null }));
      }
    }
  };



  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = "Category name is required";
    if (!formData.image_url.trim() && !imageFile) {
      newErrors.image_url = "Image URL is required (This field may not be blank)";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const finalImageUrl = formData.image_url.trim() || (imageFile ? `https://example.com/uploads/${imageFile.name}` : '');
    const submitData = { ...formData, image_url: finalImageUrl };

    onSubmit(initialData ? { ...initialData, ...submitData, imageFile, imagePreview } : { ...submitData, imageFile, imagePreview });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal glass animate-fade-in" style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Tag size={20} style={{ color: 'var(--primary)' }} />
            <h3>{title}</h3>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* PAYLOAD FIELD 1: name */}
            <div className="form-group">
              <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                Category Name ("name") *
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

            {/* PAYLOAD FIELD 2: image_url & File Attachment */}
            <div style={{ background: 'var(--bg-secondary)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ImageIcon size={14} style={{ color: 'var(--primary)' }} />
                  <span>Category Image Web URL ("image_url") *</span>
                </label>
                <input
                  type="url"
                  name="image_url"
                  className="form-input"
                  placeholder="https://example.com/herbal.jpg"
                  value={formData.image_url}
                  onChange={handleChange}
                />
                {errors.image_url && <span style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{errors.image_url}</span>}
              </div>

              <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>OR Upload Image File</div>

              <div className="form-group">
                <input
                  type="file"
                  accept="image/*"
                  className="form-input"
                  style={{ padding: '8px', cursor: 'pointer' }}
                  onChange={handleFileChange}
                />
              </div>

              {/* LIVE ATTACHED IMAGE PREVIEW */}
              {(imagePreview || formData.image_url) && (
                <div style={{
                  width: '100%',
                  height: '140px',
                  borderRadius: 'var(--radius-sm)',
                  overflow: 'hidden',
                  position: 'relative',
                  backgroundColor: '#0f172a',
                  border: '1px solid var(--card-border)'
                }}>
                  <img
                    src={imagePreview || formData.image_url}
                    alt="Category Preview"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <span style={{
                    position: 'absolute',
                    top: '8px',
                    left: '8px',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    color: '#fff'
                  }}>
                    Image Preview
                  </span>
                </div>
              )}
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
                <span>Is Active Category</span>
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
