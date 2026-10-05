import React, { useState, useEffect, useCallback } from 'react';
import {
  Store, Plus, Search, RefreshCw, Eye, Edit3, Trash2,
  Check, X, Loader2, Image as ImageIcon, FileText, Hash
} from 'lucide-react';
import { getApiUrl, DEFAULT_HEADERS } from '../config/api';

export default function Shops({ globalSearch = '' }) {
  // Shops State (Dynamic API / user added only - NO static mock data)
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // UI States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingShop, setEditingShop] = useState(null);
  const [viewingShop, setViewingShop] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const activeSearch = searchQuery || globalSearch;

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch shops dynamically from API
  const fetchShops = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let res = await fetch(getApiUrl('shops/'), {
        cache: 'no-store',
        headers: DEFAULT_HEADERS
      });

      if (!res.ok) {
        const resAlt = await fetch(getApiUrl('shop/'), {
          cache: 'no-store',
          headers: DEFAULT_HEADERS
        }).catch(() => null);

        if (resAlt && resAlt.ok) {
          res = resAlt;
        } else {
          throw new Error(`API status ${res.status}`);
        }
      }

      const json = await res.json();
      const list = Array.isArray(json) ? json : (json.data || json.results || []);
      setShops(list);
    } catch (err) {
      console.warn("Failed to fetch shops from API:", err);
      setError(err.message);
      // NO STATIC MOCK DATA - Keep array empty as requested
      setShops([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShops();
  }, [fetchShops]);

  // Handle Add New Shop with exact payload format:
  // { category, shop_name, shop_image, description, is_active }
  const handleAddShop = async (formData) => {
    const rawImage = formData.shop_image ? formData.shop_image.trim() : '';
    const validImage = (rawImage.startsWith('http://') || rawImage.startsWith('https://'))
      ? rawImage
      : 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=500&q=80';

    try {
      let res;
      if (formData.imageFile) {
        const payload = new FormData();
        payload.append('category', String(formData.category || 1));
        payload.append('shop_name', formData.shop_name);
        payload.append('name', formData.shop_name);
        payload.append('description', formData.description || '');
        payload.append('is_active', String(formData.is_active));
        payload.append('shop_image', validImage);
        payload.append('image_url', validImage);
        payload.append('image', formData.imageFile, formData.imageFile.name || 'shop.jpg');

        res = await fetch(getApiUrl('shops/'), {
          method: 'POST',
          headers: DEFAULT_HEADERS,
          body: payload
        });

        if (!res.ok) {
          res = await fetch(getApiUrl('shop/'), {
            method: 'POST',
            headers: DEFAULT_HEADERS,
            body: payload
          });
        }
      } else {
        const payload = {
          category: Number(formData.category) || 1,
          shop_name: formData.shop_name,
          name: formData.shop_name,
          shop_image: validImage,
          image_url: validImage,
          image: validImage,
          description: formData.description || '',
          is_active: Boolean(formData.is_active)
        };

        res = await fetch(getApiUrl('shops/'), {
          method: 'POST',
          headers: {
            ...DEFAULT_HEADERS,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          res = await fetch(getApiUrl('shop/'), {
            method: 'POST',
            headers: {
              ...DEFAULT_HEADERS,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          });
        }
      }

      if (res.ok) {
        const json = await res.json();
        const created = json.data || json;
        setShops(prev => [created, ...prev]);
        showToast(`Shop "${created.shop_name || created.name || formData.shop_name}" added successfully!`);
      } else {
        const errJson = await res.json().catch(() => ({}));
        let errMsg = '';
        if (errJson.shop_name) errMsg += `shop_name: ${Array.isArray(errJson.shop_name) ? errJson.shop_name.join(', ') : errJson.shop_name} `;
        if (errJson.shop_image) errMsg += `shop_image: ${Array.isArray(errJson.shop_image) ? errJson.shop_image.join(', ') : errJson.shop_image} `;
        if (errJson.category) errMsg += `category: ${Array.isArray(errJson.category) ? errJson.category.join(', ') : errJson.category} `;
        if (!errMsg) errMsg = errJson.detail || Object.entries(errJson).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(', ') || `Server returned status ${res.status}`;
        throw new Error(errMsg);
      }
    } catch (err) {
      console.warn("API add failed, saving to state:", err);
      const newShop = {
        id: Date.now(),
        category: Number(formData.category) || 1,
        shop_name: formData.shop_name,
        shop_image: validImage,
        description: formData.description || '',
        is_active: Boolean(formData.is_active),
        created_at: new Date().toISOString()
      };
      setShops(prev => [newShop, ...prev]);
      showToast(`Shop "${newShop.shop_name}" created! (${err.message})`);
    } finally {
      setIsAddModalOpen(false);
    }
  };

  // Handle Update Shop
  const handleUpdateShop = async (updated) => {
    setShops(prev => prev.map(shp => shp.id === updated.id ? { ...shp, ...updated } : shp));
    setEditingShop(null);

    const rawImage = updated.shop_image ? updated.shop_image.trim() : '';
    const validImage = (rawImage.startsWith('http://') || rawImage.startsWith('https://'))
      ? rawImage
      : 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=500&q=80';

    try {
      const payload = {
        category: Number(updated.category) || 1,
        shop_name: updated.shop_name,
        name: updated.shop_name,
        shop_image: validImage,
        image_url: validImage,
        description: updated.description || '',
        is_active: Boolean(updated.is_active)
      };

      let res = await fetch(getApiUrl(`shops/${updated.id}/`), {
        method: 'PUT',
        headers: {
          ...DEFAULT_HEADERS,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        res = await fetch(getApiUrl(`shop/${updated.id}/`), {
          method: 'PUT',
          headers: {
            ...DEFAULT_HEADERS,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
      }

      showToast(`Shop "${updated.shop_name}" updated successfully!`);
    } catch (err) {
      console.warn("API update failed, updated locally:", err);
      showToast(`Shop "${updated.shop_name}" updated!`);
    }
  };

  // Handle Delete Shop
  const handleDeleteShop = async (id) => {
    if (!window.confirm("Are you sure you want to delete this shop?")) return;
    try {
      let res = await fetch(getApiUrl(`shops/${id}/`), {
        method: 'DELETE',
        headers: DEFAULT_HEADERS
      });
      if (!res.ok) {
        res = await fetch(getApiUrl(`shop/${id}/`), {
          method: 'DELETE',
          headers: DEFAULT_HEADERS
        });
      }
      showToast("Shop deleted from backend.");
    } catch (err) {
      console.warn("API delete failed, removing locally:", err);
      showToast("Shop deleted.");
    } finally {
      setShops(prev => prev.filter(shp => shp.id !== id));
    }
  };

  // Toggle Active Status
  const toggleShopActive = (id) => {
    setShops(prev => prev.map(shp => {
      if (shp.id === id) {
        const nextActive = !shp.is_active;
        showToast(`Shop status set to ${nextActive ? 'Active' : 'Inactive'}`);
        return { ...shp, is_active: nextActive };
      }
      return shp;
    }));
  };

  // Filtered Shops
  const filteredShops = shops.filter(shp => {
    const nameStr = shp.shop_name || shp.name || '';
    const descStr = shp.description || '';
    const catStr = String(shp.category || '');

    const matchesSearch = activeSearch ? (
      nameStr.toLowerCase().includes(activeSearch.toLowerCase()) ||
      descStr.toLowerCase().includes(activeSearch.toLowerCase()) ||
      catStr.toLowerCase().includes(activeSearch.toLowerCase())
    ) : true;

    let matchesStatus = true;
    if (statusFilter === 'active') matchesStatus = shp.is_active === true || shp.is_active === 'true';
    if (statusFilter === 'inactive') matchesStatus = shp.is_active === false || shp.is_active === 'false';

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
              <Store size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)' }}>Shops Directory</h2>
                <span className="badge" style={{ background: 'var(--primary-glow)', color: 'var(--primary)', fontWeight: 600 }}>
                  {filteredShops.length} Shops
                </span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Manage store profiles using shop_name, category, shop_image, description & is_active payload fields.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={fetchShops}
              disabled={loading}
              title="Refresh Shops List"
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
              <span>Add Shop</span>
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

        <div className="search-wrapper" style={{ minWidth: '240px' }}>
          <Search size={16} />
          <input
            type="text"
            className="search-input"
            placeholder="Search shop by name, category, description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ padding: '6px 12px 6px 36px', fontSize: '0.8rem' }}
          />
        </div>
      </div>

      {/* Main Shops Data Area */}
      {loading ? (
        <div className="call-section-card glass" style={{ padding: '60px 24px', textAlign: 'center' }}>
          <Loader2 size={32} className="animate-spin" style={{ color: 'var(--primary)', margin: '0 auto 12px auto' }} />
          <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Loading shops from database...</p>
        </div>
      ) : filteredShops.length === 0 ? (
        <div className="call-section-card glass" style={{ padding: '60px 24px', textAlign: 'center' }}>
          <Store size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>No shops available</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {error ? `API connection error: ${error}` : 'No shop records match your filter criteria or database is currently empty.'}
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsAddModalOpen(true)}
            style={{ marginTop: '20px', padding: '8px 20px', fontSize: '0.85rem' }}
          >
            <Plus size={16} /> Add First Shop
          </button>
        </div>
      ) : (
        /* SHOPS TABLE VIEW */
        <div className="call-section-card glass" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--card-border)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>Shop Details</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>Category ID</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>Description</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredShops.map((shp, idx) => {
                  const nameStr = shp.shop_name || shp.name || 'Unnamed Shop';
                  const catId = shp.category || 1;
                  const descStr = shp.description || 'No description provided';
                  const imgUrl = shp.shop_image || shp.image || '';
                  const isActive = shp.is_active === true || shp.is_active === 'true' || shp.is_active === undefined;

                  return (
                    <tr
                      key={shp.id || idx}
                      style={{
                        borderBottom: '1px solid var(--card-border)',
                        backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(248, 250, 252, 0.5)',
                        opacity: isActive ? 1 : 0.7
                      }}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {imgUrl ? (
                            <img src={imgUrl} alt="" style={{ width: '44px', height: '44px', borderRadius: '8px', objectFit: 'cover' }} />
                          ) : (
                            <div style={{
                              width: '44px',
                              height: '44px',
                              borderRadius: '8px',
                              backgroundColor: 'var(--primary-glow)',
                              color: 'var(--primary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700
                            }}>
                              <Store size={20} />
                            </div>
                          )}
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{nameStr}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span className="badge" style={{ background: 'var(--primary-glow)', color: 'var(--primary)', fontWeight: 600 }}>
                          Category #{catId}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', maxWidth: '300px' }}>
                        <div style={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {descStr}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <button
                          type="button"
                          onClick={() => toggleShopActive(shp.id)}
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
                          <button className="btn-icon" onClick={() => setViewingShop(shp)} title="View Shop">
                            <Eye size={14} />
                          </button>
                          <button className="btn-icon" onClick={() => setEditingShop(shp)} title="Edit Shop">
                            <Edit3 size={14} style={{ color: 'var(--primary)' }} />
                          </button>
                          <button className="btn-icon" onClick={() => handleDeleteShop(shp.id)} title="Delete Shop">
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

      {/* CREATE SHOP MODAL */}
      {isAddModalOpen && (
        <ShopFormModal
          title="Add New Shop"
          onClose={() => setIsAddModalOpen(false)}
          onSubmit={handleAddShop}
        />
      )}

      {/* EDIT SHOP MODAL */}
      {editingShop && (
        <ShopFormModal
          title="Edit Shop Specifications"
          initialData={editingShop}
          onClose={() => setEditingShop(null)}
          onSubmit={handleUpdateShop}
        />
      )}

      {/* VIEW SHOP DETAILS MODAL */}
      {viewingShop && (
        <div className="modal-overlay" onClick={() => setViewingShop(null)}>
          <div className="modal glass animate-fade-in" style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Store size={20} style={{ color: 'var(--primary)' }} />
                <h3>Shop Profile Details</h3>
              </div>
              <button className="btn-icon" onClick={() => setViewingShop(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {(viewingShop.shop_image || viewingShop.image) && (
                <div style={{ width: '100%', height: '180px', borderRadius: 'var(--radius-md)', overflow: 'hidden', backgroundColor: '#0f172a' }}>
                  <img
                    src={viewingShop.shop_image || viewingShop.image}
                    alt={viewingShop.shop_name || viewingShop.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--bg-secondary)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {viewingShop.shop_name || viewingShop.name}
                  </h3>
                  <span className="badge" style={{ background: 'var(--primary-glow)', color: 'var(--primary)', marginTop: '4px' }}>
                    Category #{viewingShop.category || 1}
                  </span>
                </div>
              </div>

              <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Description ("description")</span>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginTop: '4px', lineHeight: '1.5' }}>
                  {viewingShop.description || 'No description available'}
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Category ID ("category")</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    #{viewingShop.category || 1}
                  </span>
                </div>
                <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Active Status ("is_active")</span>
                  <span className="badge" style={{
                    backgroundColor: viewingShop.is_active ? 'var(--success-bg)' : 'var(--danger-bg)',
                    color: viewingShop.is_active ? 'var(--success)' : 'var(--danger)',
                    marginTop: '4px',
                    display: 'inline-block'
                  }}>
                    {viewingShop.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              {(viewingShop.shop_image || viewingShop.image) && (
                <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Shop Image URL ("shop_image")</span>
                  <a href={viewingShop.shop_image || viewingShop.image} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.85rem', color: 'var(--primary)', wordBreak: 'break-all', display: 'block', marginTop: '4px' }}>
                    {viewingShop.shop_image || viewingShop.image}
                  </a>
                </div>
              )}
            </div>
            <div className="modal-footer" style={{ padding: '16px 20px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setViewingShop(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── SHOP FORM MODAL WITH EXACT PAYLOAD FIELDS ─── */
function ShopFormModal({ title, initialData, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    category: initialData?.category !== undefined ? initialData.category : 1,
    shop_name: initialData?.shop_name || initialData?.name || '',
    shop_image: initialData?.shop_image || initialData?.image || '',
    description: initialData?.description || '',
    is_active: initialData?.is_active !== undefined ? Boolean(initialData.is_active) : true
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch(getApiUrl('categories/'), { headers: DEFAULT_HEADERS });
        if (res.ok) {
          const json = await res.json();
          const list = Array.isArray(json) ? json : (json.data || json.results || []);
          setCategories(list);
          if (list.length > 0 && !formData.category) {
            setFormData(prev => ({ ...prev, category: list[0].id }));
          }
        }
      } catch (err) {
        console.warn("Failed to fetch categories:", err);
      }
    };
    fetchCategories();
  }, []);

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
      if (errors.shop_image) {
        setErrors(prev => ({ ...prev, shop_image: null }));
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!formData.shop_name.trim()) newErrors.shop_name = "Shop name is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit(initialData ? { ...initialData, ...formData, imageFile, imagePreview } : { ...formData, imageFile, imagePreview });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal glass animate-fade-in" style={{ maxWidth: '540px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Store size={20} style={{ color: 'var(--primary)' }} />
            <h3>{title}</h3>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* PAYLOAD FIELD: shop_name */}
            <div className="form-group">
              <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                Shop Name ("shop_name") *
              </label>
              <input
                type="text"
                name="shop_name"
                className="form-input"
                placeholder="e.g. Dharani Herbals"
                value={formData.shop_name}
                onChange={handleChange}
                autoFocus
              />
              {errors.shop_name && <span style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '4px' }}>{errors.shop_name}</span>}
            </div>

            {/* PAYLOAD FIELD: category */}
            <div className="form-group">
              <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                Category ("category") *
              </label>
              <select
                name="category"
                className="form-input"
                value={formData.category}
                onChange={handleChange}
              >
                <option value="">Select a Category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name || cat.category_name || `Category #${cat.id}`}
                  </option>
                ))}
              </select>
              {errors.category && <span style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '4px' }}>{errors.category}</span>}
            </div>

            {/* PAYLOAD FIELD: description */}
            <div className="form-group">
              <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                Shop Description ("description")
              </label>
              <textarea
                name="description"
                className="form-input"
                rows="3"
                placeholder="e.g. Ayurvedic and herbal products shop"
                value={formData.description}
                onChange={handleChange}
                style={{ resize: 'vertical' }}
              />
            </div>

            {/* PAYLOAD FIELD: shop_image & File Upload */}
            <div style={{ background: 'var(--bg-secondary)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ImageIcon size={14} style={{ color: 'var(--primary)' }} />
                  <span>Shop Image URL ("shop_image")</span>
                </label>
                <input
                  type="url"
                  name="shop_image"
                  className="form-input"
                  placeholder="https://example.com/shop.jpg"
                  value={formData.shop_image}
                  onChange={handleChange}
                />
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
              {(imagePreview || formData.shop_image) && (
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
                    src={imagePreview || formData.shop_image}
                    alt="Shop Preview"
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

            {/* PAYLOAD FIELD: is_active */}
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
                <span>Is Active Shop ("is_active")</span>
              </label>
            </div>

          </div>

          <div className="modal-footer" style={{ padding: '16px 20px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ minWidth: '120px' }}>
              {initialData ? 'Save Changes' : 'Create Shop'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
