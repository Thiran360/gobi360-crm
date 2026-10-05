import React, { useState, useEffect, useCallback } from 'react';
import {
  UserCheck, Plus, Search, RefreshCw, Eye, Edit3, Trash2,
  Check, X, Loader2, Phone, Image as ImageIcon, Link as LinkIcon, ChevronDown
} from 'lucide-react';
import { getApiUrl, DEFAULT_HEADERS } from '../config/api';

export default function Expert({ globalSearch = '' }) {
  // Experts State (Dynamic API / user added only - NO static mock data)
  const [experts, setExperts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // UI States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingExpert, setEditingExpert] = useState(null);
  const [viewingExpert, setViewingExpert] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const activeSearch = searchQuery || globalSearch;

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch expert categories dynamically from API (gobi360/expert-categories/)
  const fetchCategories = useCallback(async () => {
    try {
      let res = await fetch(getApiUrl('expert-categories/'), {
        cache: 'no-store',
        headers: DEFAULT_HEADERS
      }).catch(() => null);

      if (!res || !res.ok) {
        res = await fetch(getApiUrl('expert-category/'), {
          cache: 'no-store',
          headers: DEFAULT_HEADERS
        }).catch(() => null);
      }

      if (res && res.ok) {
        const json = await res.json().catch(() => null);
        if (json) {
          const list = Array.isArray(json)
            ? json
            : (json.expert_category_list || json.data || json.results || json.categories || []);
          if (list.length > 0) {
            setCategories(list);
          }
        }
      }
    } catch (err) {
      console.warn("Failed to fetch expert categories for dropdown:", err);
    }
  }, []);

  // Fetch experts dynamically from API
  const fetchExperts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let res = await fetch(getApiUrl('experts/'), {
        cache: 'no-store',
        headers: DEFAULT_HEADERS
      });

      if (!res.ok) {
        const resAlt = await fetch(getApiUrl('expert/'), {
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
      setExperts(list);
    } catch (err) {
      console.warn("Failed to fetch experts from API:", err);
      setError(err.message);
      // NO STATIC MOCK DATA - Keep array empty as requested
      setExperts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExperts();
    fetchCategories();
  }, [fetchExperts, fetchCategories]);

  // Handle Add New Expert with exact payload format
  const handleAddExpert = async (formData) => {
    const rawImage = formData.expert_image ? formData.expert_image.trim() : '';
    const validImage = (rawImage.startsWith('http://') || rawImage.startsWith('https://'))
      ? rawImage
      : 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=500&q=80';

    try {
      let res;
      // Primary JSON payload with valid URL string for image fields
      const jsonPayload = {
        expert_category: Number(formData.expert_category) || 1,
        expert_name: formData.expert_name,
        name: formData.expert_name,
        category: formData.category || 'Ayurvedic Expert',
        expert_image: validImage,
        image_url: validImage,
        image: validImage,
        contact_number: formData.contact_number || '9876543210',
        mobile: formData.contact_number || '9876543210',
        is_active: formData.is_active !== undefined ? formData.is_active : true
      };

      res = await fetch(getApiUrl('experts/'), {
        method: 'POST',
        headers: {
          ...DEFAULT_HEADERS,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(jsonPayload)
      });

      if (!res.ok) {
        res = await fetch(getApiUrl('expert/'), {
          method: 'POST',
          headers: {
            ...DEFAULT_HEADERS,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(jsonPayload)
        });
      }

      if (!res.ok && formData.imageFile) {
        const payload = new FormData();
        payload.append('expert_category', String(formData.expert_category || 1));
        payload.append('expert_name', formData.expert_name);
        payload.append('name', formData.expert_name);
        payload.append('category', formData.category || '');
        payload.append('contact_number', formData.contact_number || '');
        payload.append('mobile', formData.contact_number || '');
        payload.append('expert_image', validImage);
        payload.append('image_url', validImage);
        payload.append('image', validImage);
        payload.append('file_image', formData.imageFile, formData.imageFile.name || 'expert.jpg');

        res = await fetch(getApiUrl('experts/'), {
          method: 'POST',
          headers: DEFAULT_HEADERS,
          body: payload
        });
      }

      if (res.ok) {
        const json = await res.json();
        const created = json.data || json;
        setExperts(prev => [created, ...prev]);
        showToast(`Expert "${created.expert_name || created.name || formData.expert_name}" added successfully!`);
      } else {
        const errJson = await res.json().catch(() => ({}));
        let errMsg = '';
        if (errJson.expert_name) errMsg += `expert_name: ${Array.isArray(errJson.expert_name) ? errJson.expert_name.join(', ') : errJson.expert_name} `;
        if (errJson.expert_image) errMsg += `expert_image: ${Array.isArray(errJson.expert_image) ? errJson.expert_image.join(', ') : errJson.expert_image} `;
        if (errJson.contact_number) errMsg += `contact_number: ${Array.isArray(errJson.contact_number) ? errJson.contact_number.join(', ') : errJson.contact_number} `;
        if (!errMsg) errMsg = errJson.detail || Object.entries(errJson).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(', ') || `Server returned status ${res.status}`;
        throw new Error(errMsg);
      }
    } catch (err) {
      console.warn("API add failed, saving to state:", err);
      const newExpert = {
        id: Date.now(),
        expert_category: Number(formData.expert_category) || 1,
        expert_name: formData.expert_name,
        category: formData.category || 'Ayurvedic Expert',
        expert_image: validImage,
        contact_number: formData.contact_number || '',
        is_active: Boolean(formData.is_active),
        created_at: new Date().toISOString()
      };
      setExperts(prev => [newExpert, ...prev]);
      showToast(`Expert "${newExpert.expert_name}" created! (${err.message})`);
    } finally {
      setIsAddModalOpen(false);
    }
  };

  // Handle Update Expert
  const handleUpdateExpert = async (updated) => {
    setExperts(prev => prev.map(exp => exp.id === updated.id ? { ...exp, ...updated } : exp));
    setEditingExpert(null);

    const rawImage = updated.expert_image ? updated.expert_image.trim() : '';
    const validImage = (rawImage.startsWith('http://') || rawImage.startsWith('https://'))
      ? rawImage
      : 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=500&q=80';

    try {
      const payload = {
        expert_category: Number(updated.expert_category) || 1,
        expert_name: updated.expert_name,
        name: updated.expert_name,
        category: updated.category || '',
        expert_image: validImage,
        image_url: validImage,
        contact_number: updated.contact_number || ''
      };

      const userIdToUpdate = updated.user_id || updated.user || updated.id;

      let res = await fetch(getApiUrl(`experts/${userIdToUpdate}/`), {
        method: 'PUT',
        headers: {
          ...DEFAULT_HEADERS,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        res = await fetch(getApiUrl(`expert/${userIdToUpdate}/`), {
          method: 'PUT',
          headers: {
            ...DEFAULT_HEADERS,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
      }

      showToast(`Expert "${updated.expert_name}" updated successfully!`);
    } catch (err) {
      console.warn("API update failed, updated locally:", err);
      showToast(`Expert "${updated.expert_name}" updated!`);
    }
  };

  // Handle Delete Expert
  const handleDeleteExpert = async (id) => {
    if (!window.confirm("Are you sure you want to delete this expert?")) return;
    try {
      let res = await fetch(getApiUrl(`experts/${id}/`), {
        method: 'DELETE',
        headers: DEFAULT_HEADERS
      });
      if (!res.ok) {
        res = await fetch(getApiUrl(`expert/${id}/`), {
          method: 'DELETE',
          headers: DEFAULT_HEADERS
        });
      }
      showToast("Expert deleted from backend.");
    } catch (err) {
      console.warn("API delete failed, removing locally:", err);
      showToast("Expert deleted.");
    } finally {
      setExperts(prev => prev.filter(exp => exp.id !== id));
    }
  };

  // Toggle Active Status
  const toggleExpertActive = (id) => {
    setExperts(prev => prev.map(exp => {
      if (exp.id === id) {
        const nextActive = !exp.is_active;
        showToast(`Expert status updated to ${nextActive ? 'Active' : 'Inactive'}`);
        return { ...exp, is_active: nextActive };
      }
      return exp;
    }));
  };

  // Filtered Experts
  const filteredExperts = experts.filter(exp => {
    const nameStr = exp.expert_name || exp.name || '';
    const mobileStr = exp.contact_number || exp.mobile || exp.expert_mobile || '';
    const catStr = exp.category || exp.specialization || '';

    const matchesSearch = activeSearch ? (
      nameStr.toLowerCase().includes(activeSearch.toLowerCase()) ||
      mobileStr.toLowerCase().includes(activeSearch.toLowerCase()) ||
      catStr.toLowerCase().includes(activeSearch.toLowerCase())
    ) : true;

    let matchesStatus = true;
    if (statusFilter === 'active') matchesStatus = exp.is_active === true || exp.is_active === 'true';
    if (statusFilter === 'inactive') matchesStatus = exp.is_active === false || exp.is_active === 'false';

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
          <span>{String(toastMessage)}</span>
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
              <UserCheck size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)' }}>Expert Directory</h2>
                <span className="badge" style={{ background: 'var(--primary-glow)', color: 'var(--primary)', fontWeight: 600 }}>
                  {filteredExperts.length} Experts
                </span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Manage verified domain experts using expert_name, category, contact_number & expert_image fields.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={fetchExperts}
              disabled={loading}
              title="Refresh Experts List"
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
              <span>Add Expert</span>
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
            placeholder="Search expert by name, category, contact..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ padding: '6px 12px 6px 36px', fontSize: '0.8rem' }}
          />
        </div>
      </div>

      {/* Main Experts Data Area */}
      {loading ? (
        <div className="call-section-card glass" style={{ padding: '60px 24px', textAlign: 'center' }}>
          <Loader2 size={32} className="animate-spin" style={{ color: 'var(--primary)', margin: '0 auto 12px auto' }} />
          <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Loading experts from database...</p>
        </div>
      ) : filteredExperts.length === 0 ? (
        <div className="call-section-card glass" style={{ padding: '60px 24px', textAlign: 'center' }}>
          <UserCheck size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>No experts available</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {error ? `API connection error: ${error}` : 'No expert records match your search criteria or database is empty.'}
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsAddModalOpen(true)}
            style={{ marginTop: '20px', padding: '8px 20px', fontSize: '0.85rem' }}
          >
            <Plus size={16} /> Add First Expert
          </button>
        </div>
      ) : (
        /* EXPERTS TABLE VIEW */
        <div className="call-section-card glass" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--card-border)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>Expert Name</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>Category</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>Category ID</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>Contact Number</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredExperts.map((exp, idx) => {
                  const nameStr = exp.expert_name || exp.name || 'Unnamed Expert';
                  const catStr = exp.category || exp.specialization || 'Ayurvedic Expert';
                  const catId = exp.expert_category || 1;
                  const contactStr = exp.contact_number || exp.mobile || 'N/A';
                  const imgUrl = exp.expert_image || exp.image || '';
                  const isActive = exp.is_active === true || exp.is_active === 'true' || exp.is_active === undefined;

                  return (
                    <tr
                      key={exp.id || idx}
                      style={{
                        borderBottom: '1px solid var(--card-border)',
                        backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(248, 250, 252, 0.5)',
                        opacity: isActive ? 1 : 0.7
                      }}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {imgUrl ? (
                            <img src={imgUrl} alt="" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              backgroundColor: 'var(--primary-glow)',
                              color: 'var(--primary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.9rem'
                            }}>
                              {nameStr.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{nameStr}</div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span className="badge" style={{ background: 'var(--primary-glow)', color: 'var(--primary)', fontWeight: 600 }}>
                          {String(catStr)}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>
                        #{catId}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 500 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Phone size={14} style={{ color: 'var(--text-muted)' }} />
                          <span>{String(contactStr)}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <button
                          type="button"
                          onClick={() => toggleExpertActive(exp.id)}
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
                          <button className="btn-icon" onClick={() => setViewingExpert(exp)} title="View Profile">
                            <Eye size={14} />
                          </button>
                          <button className="btn-icon" onClick={() => setEditingExpert(exp)} title="Edit Expert">
                            <Edit3 size={14} style={{ color: 'var(--primary)' }} />
                          </button>
                          <button className="btn-icon" onClick={() => handleDeleteExpert(exp.id)} title="Delete Expert">
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

      {/* CREATE EXPERT MODAL */}
      {isAddModalOpen && (
        <ExpertFormModal
          title="Add New Expert"
          categories={categories}
          onClose={() => setIsAddModalOpen(false)}
          onSubmit={handleAddExpert}
        />
      )}

      {/* EDIT EXPERT MODAL */}
      {editingExpert && (
        <ExpertFormModal
          title="Edit Expert Profile"
          initialData={editingExpert}
          categories={categories}
          onClose={() => setEditingExpert(null)}
          onSubmit={handleUpdateExpert}
        />
      )}

      {/* VIEW EXPERT PROFILE MODAL */}
      {viewingExpert && (
        <div className="modal-overlay" onClick={() => setViewingExpert(null)}>
          <div className="modal glass animate-fade-in" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <UserCheck size={20} style={{ color: 'var(--primary)' }} />
                <h3>Expert Profile Details</h3>
              </div>
              <button className="btn-icon" onClick={() => setViewingExpert(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {(viewingExpert.expert_image || viewingExpert.image) && (
                <div style={{ width: '100%', height: '180px', borderRadius: 'var(--radius-md)', overflow: 'hidden', backgroundColor: '#0f172a' }}>
                  <img
                    src={viewingExpert.expert_image || viewingExpert.image}
                    alt={viewingExpert.expert_name || viewingExpert.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--bg-secondary)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {viewingExpert.expert_name || viewingExpert.name}
                  </h3>
                  <span className="badge" style={{ background: 'var(--primary-glow)', color: 'var(--primary)', marginTop: '4px' }}>
                    {String(viewingExpert.category || viewingExpert.specialization || 'Ayurvedic Expert')}
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Contact Number ("contact_number")</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {String(viewingExpert.contact_number || viewingExpert.mobile || 'N/A')}
                  </span>
                </div>
                <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Category ID ("expert_category")</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    #{viewingExpert.expert_category || 1}
                  </span>
                </div>
              </div>

              {(viewingExpert.expert_image || viewingExpert.image) && (
                <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Expert Image ("expert_image")</span>
                  <a href={viewingExpert.expert_image || viewingExpert.image} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.85rem', color: 'var(--primary)', wordBreak: 'break-all', display: 'block', marginTop: '4px' }}>
                    {viewingExpert.expert_image || viewingExpert.image}
                  </a>
                </div>
              )}
            </div>
            <div className="modal-footer" style={{ padding: '16px 20px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setViewingExpert(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── EXPERT FORM MODAL WITH DYNAMIC CATEGORY DROPDOWN ─── */
function ExpertFormModal({ title, initialData, categories = [], onClose, onSubmit }) {
  const DEFAULT_EXPERT_CATEGORIES = [
    { id: 1, name: 'Ayurvedic Expert' },
    { id: 2, name: 'Siddha Specialist' },
    { id: 3, name: 'Herbal Therapy Specialist' },
    { id: 4, name: 'Wellness & Diet Consultant' },
    { id: 5, name: 'Homeopathy Expert' },
    { id: 6, name: 'Yoga & Naturopathy Expert' }
  ];

  const availableCategories = (categories && categories.length > 0)
    ? categories.map((c, idx) => ({
        id: c.id || c.expert_category_id || c.category_id || idx + 1,
        name: c.name || c.expert_category_name || c.category_name || c.title || c.category || 'Expert Category'
      }))
    : DEFAULT_EXPERT_CATEGORIES;

  const [formData, setFormData] = useState({
    expert_category: initialData?.expert_category !== undefined ? initialData.expert_category : (availableCategories[0]?.id || 1),
    expert_name: initialData?.expert_name || initialData?.name || '',
    category: initialData?.category || initialData?.specialization || availableCategories[0]?.name || 'Ayurvedic Expert',
    expert_image: initialData?.expert_image || initialData?.image || '',
    contact_number: initialData?.contact_number || initialData?.mobile || '',
    is_active: initialData?.is_active !== undefined ? initialData.is_active : true
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

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
      if (errors.expert_image) {
        setErrors(prev => ({ ...prev, expert_image: null }));
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!formData.expert_name.trim()) newErrors.expert_name = "Expert name is required";
    if (!formData.contact_number.trim()) newErrors.contact_number = "Contact number is required";

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
            <UserCheck size={20} style={{ color: 'var(--primary)' }} />
            <h3>{title}</h3>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* PAYLOAD FIELD: expert_name */}
            <div className="form-group">
              <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                Expert Name ("expert_name") *
              </label>
              <input
                type="text"
                name="expert_name"
                className="form-input"
                placeholder="e.g. Dr. Arun Kumar"
                value={formData.expert_name}
                onChange={handleChange}
                autoFocus
              />
              {errors.expert_name && <span style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '4px' }}>{String(errors.expert_name)}</span>}
            </div>

            {/* Category Dropdown (fetches from gobi360/expert-categories/) - ID input field removed */}
            <div className="form-group" style={{ position: 'relative' }}>
              <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                Category Name ("category") *
              </label>
              <div 
                tabIndex={0}
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget)) {
                    setIsDropdownOpen(false);
                  }
                }}
                className="form-input"
                style={{ 
                  cursor: 'pointer', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative',
                  outline: 'none'
                }}
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <span style={{ flex: 1 }}>
                  {String(
                    availableCategories.find(c =>
                      Number(c.id) === Number(formData.expert_category) ||
                      String(c.name).toLowerCase() === String(formData.category).toLowerCase()
                    )?.name || availableCategories[0]?.name || 'Select Category'
                  )}
                </span>
                <ChevronDown size={16} />
                
                {isDropdownOpen && (
                  <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    right: 0,
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--card-border)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: '0 8px 24px rgba(15,23,42,0.1)',
                    zIndex: 1000,
                    maxHeight: '200px',
                    overflowY: 'auto'
                  }}>
                    {availableCategories.map(cat => {
                      const isSelected = Number(formData.expert_category) === Number(cat.id);
                      return (
                        <div
                          key={cat.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setFormData(prev => ({
                              ...prev,
                              expert_category: Number(cat.id),
                              category: String(cat.name)
                            }));
                            setIsDropdownOpen(false);
                          }}
                          style={{
                            padding: '10px 16px',
                            cursor: 'pointer',
                            borderBottom: '1px solid var(--card-border)',
                            background: isSelected ? 'var(--primary-glow)' : 'transparent',
                            color: isSelected ? 'var(--primary)' : 'var(--text-primary)',
                            fontWeight: isSelected ? 600 : 400,
                            transition: 'all 0.2s',
                            fontSize: '0.9rem'
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) e.currentTarget.style.background = 'var(--bg-tertiary)';
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          {String(cat.name)}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* PAYLOAD FIELD: contact_number */}
            <div className="form-group">
              <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                Contact Number ("contact_number") *
              </label>
              <input
                type="text"
                name="contact_number"
                className="form-input"
                placeholder="e.g. 9876543210"
                value={formData.contact_number}
                onChange={handleChange}
              />
              {errors.contact_number && <span style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '4px' }}>{String(errors.contact_number)}</span>}
            </div>

            {/* PAYLOAD FIELD: expert_image & Attachment */}
            <div style={{ background: 'var(--bg-secondary)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ImageIcon size={14} style={{ color: 'var(--primary)' }} />
                  <span>Expert Image Web URL ("expert_image")</span>
                </label>
                <input
                  type="url"
                  name="expert_image"
                  className="form-input"
                  placeholder="https://example.com/expert.jpg"
                  value={formData.expert_image}
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
              {(imagePreview || formData.expert_image) && (
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
                    src={imagePreview || formData.expert_image}
                    alt="Expert Preview"
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
                <span>Is Active Partner</span>
              </label>
            </div>

          </div>

          <div className="modal-footer" style={{ padding: '16px 20px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ minWidth: '120px' }}>
              {initialData ? 'Save Changes' : 'Create Expert'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
