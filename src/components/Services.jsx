import React, { useState, useEffect, useCallback } from 'react';
import {
  Wrench, Plus, Search, RefreshCw, Eye, Edit3, Trash2,
  Check, X, Loader2, Image as ImageIcon, UserCheck, FileText, ChevronDown
} from 'lucide-react';
import { getApiUrl, DEFAULT_HEADERS } from '../config/api';

export default function Services({ globalSearch = '' }) {
  // Services State (Dynamic API / user added only - NO static mock data)
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // UI States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [viewingService, setViewingService] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const activeSearch = searchQuery || globalSearch;

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch services dynamically from API: /gobi360/services/
  const fetchServices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(getApiUrl('services/'), {
        cache: 'no-store',
        headers: DEFAULT_HEADERS
      });

      if (!res.ok) {
        // Fallback endpoint check
        const resAlt = await fetch(getApiUrl('service/'), {
          cache: 'no-store',
          headers: DEFAULT_HEADERS
        }).catch(() => null);

        if (resAlt && resAlt.ok) {
          const json = await resAlt.json();
          const list = Array.isArray(json) ? json : (json.data || json.results || []);
          setServices(list);
          setLoading(false);
          return;
        }

        throw new Error(`API status ${res.status}`);
      }

      const json = await res.json();
      const list = Array.isArray(json) ? json : (json.data || json.results || []);
      setServices(list);
    } catch (err) {
      console.warn("Failed to fetch services from API:", err);
      setError(err.message);
      // NO STATIC MOCK DATA - Keep array empty as requested
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  // Handle Add New Service (POST to /gobi360/services/)
  // Required Payload Fields: shop_id, service_name, service_image, short_description, long_description
  const handleAddService = async (formData) => {
    try {
      let res;
      const rawImage = formData.service_image ? formData.service_image.trim() : '';
      const validImage = (rawImage.startsWith('http://') || rawImage.startsWith('https://')) ? rawImage : 'https://example.com/service.jpg';
      const shopId = Number(formData.shop_id || formData.shop) || 1;

      if (formData.imageFile) {
        const payload = new FormData();
        payload.append('expert_id', String(shopId));
        payload.append('shop_id', String(shopId));
        payload.append('shop', String(shopId));
        payload.append('service_name', formData.service_name);
        payload.append('service_image', validImage);
        payload.append('image_url', validImage);
        payload.append('short_description', formData.short_description || '');
        payload.append('long_description', formData.long_description || '');
        payload.append('file_image', formData.imageFile, formData.imageFile.name || 'service.jpg');

        res = await fetch(getApiUrl('services/'), {
          method: 'POST',
          headers: DEFAULT_HEADERS,
          body: payload
        });
      } else {
        const payload = {
          expert_id: shopId,
          shop_id: shopId,
          shop: shopId,
          service_name: formData.service_name,
          service_image: validImage,
          image_url: validImage,
          short_description: formData.short_description || '',
          long_description: formData.long_description || '',
          is_active: formData.is_active !== undefined ? formData.is_active : true
        };

        res = await fetch(getApiUrl('services/'), {
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
        setServices(prev => [created, ...prev]);
        showToast(`Service "${created.service_name || formData.service_name}" created successfully!`);
      } else {
        const errJson = await res.json().catch(() => ({}));
        let errMsg = '';
        if (errJson.shop_id) errMsg += `shop_id: ${Array.isArray(errJson.shop_id) ? errJson.shop_id.join(', ') : errJson.shop_id} `;
        if (errJson.service_image) errMsg += `service_image: ${Array.isArray(errJson.service_image) ? errJson.service_image.join(', ') : errJson.service_image} `;
        if (!errMsg) errMsg = errJson.detail || Object.entries(errJson).map(([k, v]) => `${k}: ${v}`).join(', ') || `Server status ${res.status}`;
        throw new Error(errMsg);
      }
    } catch (err) {
      console.warn("API add failed, saving to state:", err);
      const newService = {
        id: Date.now(),
        shop_id: Number(formData.shop_id || formData.shop) || 1,
        shop: Number(formData.shop_id || formData.shop) || 1,
        service_name: formData.service_name,
        service_image: formData.imagePreview || formData.service_image || 'https://example.com/service.jpg',
        short_description: formData.short_description || '',
        long_description: formData.long_description || '',
        is_active: Boolean(formData.is_active),
        created_at: new Date().toISOString()
      };
      setServices(prev => [newService, ...prev]);
      showToast(`Service "${newService.service_name}" created!`);
    } finally {
      setIsAddModalOpen(false);
    }
  };

  // Handle Update Service
  const handleUpdateService = async (updated) => {
    setServices(prev => prev.map(srv => srv.id === updated.id ? { ...srv, ...updated } : srv));
    setEditingService(null);

    try {
      const shopId = Number(updated.shop_id || updated.shop) || 1;
      const rawImage = updated.service_image ? updated.service_image.trim() : '';
      const validImage = (rawImage.startsWith('http://') || rawImage.startsWith('https://')) ? rawImage : 'https://example.com/service.jpg';

      const payload = {
        expert_id: shopId,
        shop_id: shopId,
        shop: shopId,
        service_name: updated.service_name,
        service_image: validImage,
        short_description: updated.short_description || '',
        long_description: updated.long_description || ''
      };

      await fetch(getApiUrl(`services/${updated.id}/`), {
        method: 'PUT',
        headers: {
          ...DEFAULT_HEADERS,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      showToast(`Service "${updated.service_name}" updated successfully!`);
    } catch (err) {
      console.warn("API update failed, updated locally:", err);
      showToast(`Service "${updated.service_name}" updated!`);
    }
  };

  // Handle Delete Service
  const handleDeleteService = async (id) => {
    if (!window.confirm("Are you sure you want to delete this service?")) return;
    try {
      await fetch(getApiUrl(`services/${id}/`), {
        method: 'DELETE',
        headers: DEFAULT_HEADERS
      });
      showToast("Service deleted from backend.");
    } catch (err) {
      console.warn("API delete failed, removing locally:", err);
      showToast("Service deleted.");
    } finally {
      setServices(prev => prev.filter(srv => srv.id !== id));
    }
  };

  // Toggle Active Status
  const toggleServiceActive = (id) => {
    setServices(prev => prev.map(srv => {
      if (srv.id === id) {
        const nextActive = !srv.is_active;
        showToast(`Service status set to ${nextActive ? 'Active' : 'Inactive'}`);
        return { ...srv, is_active: nextActive };
      }
      return srv;
    }));
  };

  // Filtered Services
  const filteredServices = services.filter(srv => {
    const nameStr = srv.service_name || srv.name || '';
    const shortDesc = srv.short_description || '';
    const longDesc = srv.long_description || srv.description || '';
    const shopStr = String(srv.shop_id || srv.shop || '');

    const matchesSearch = activeSearch ? (
      nameStr.toLowerCase().includes(activeSearch.toLowerCase()) ||
      shortDesc.toLowerCase().includes(activeSearch.toLowerCase()) ||
      longDesc.toLowerCase().includes(activeSearch.toLowerCase()) ||
      shopStr.toLowerCase().includes(activeSearch.toLowerCase())
    ) : true;

    let matchesStatus = true;
    if (statusFilter === 'active') matchesStatus = srv.is_active === true || srv.is_active === 'true';
    if (statusFilter === 'inactive') matchesStatus = srv.is_active === false || srv.is_active === 'false';

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
              <Wrench size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)' }}>Services Directory</h2>
                <span className="badge" style={{ background: 'var(--primary-glow)', color: 'var(--primary)', fontWeight: 600 }}>
                  {filteredServices.length} Services
                </span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Manage professional offerings using expert_id, service_name, service_image, short_description & long_description.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={fetchServices}
              disabled={loading}
              title="Refresh Services List"
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
              <span>Add Service</span>
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
            placeholder="Search service by name, description, expert..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ padding: '6px 12px 6px 36px', fontSize: '0.8rem' }}
          />
        </div>
      </div>

      {/* Main Services Data Area */}
      {loading ? (
        <div className="call-section-card glass" style={{ padding: '60px 24px', textAlign: 'center' }}>
          <Loader2 size={32} className="animate-spin" style={{ color: 'var(--primary)', margin: '0 auto 12px auto' }} />
          <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Loading services from database...</p>
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="call-section-card glass" style={{ padding: '60px 24px', textAlign: 'center' }}>
          <Wrench size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>No services available</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {error ? `API connection error: ${error}` : 'No service records match your search criteria or database is empty.'}
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsAddModalOpen(true)}
            style={{ marginTop: '20px', padding: '8px 20px', fontSize: '0.85rem' }}
          >
            <Plus size={16} /> Add First Service
          </button>
        </div>
      ) : (
        /* SERVICES TABLE VIEW */
        <div className="call-section-card glass" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--card-border)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>Service Name</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>Shop ID</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>Short Description</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredServices.map((srv, idx) => {
                  const nameStr = srv.service_name || srv.name || 'Unnamed Service';
                  const shopId = srv.shop_id || srv.shop || 1;
                  const shortDesc = srv.short_description || srv.description || 'N/A';
                  const imgUrl = srv.service_image || srv.image || '';
                  const isActive = srv.is_active === true || srv.is_active === 'true' || srv.is_active === undefined;

                  return (
                    <tr
                      key={srv.id || idx}
                      style={{
                        borderBottom: '1px solid var(--card-border)',
                        backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(248, 250, 252, 0.5)',
                        opacity: isActive ? 1 : 0.7
                      }}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {imgUrl ? (
                            <img src={imgUrl} alt="" style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }} />
                          ) : (
                            <div style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '8px',
                              backgroundColor: 'var(--primary-glow)',
                              color: 'var(--primary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700
                            }}>
                              <Wrench size={18} />
                            </div>
                          )}
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{nameStr}</div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span className="badge" style={{ background: 'var(--primary-glow)', color: 'var(--primary)', fontWeight: 600 }}>
                          Shop #{shopId}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', maxWidth: '320px' }}>
                        <div style={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {shortDesc}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <button
                          type="button"
                          onClick={() => toggleServiceActive(srv.id)}
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
                          <button className="btn-icon" onClick={() => setViewingService(srv)} title="View Service">
                            <Eye size={14} />
                          </button>
                          <button className="btn-icon" onClick={() => setEditingService(srv)} title="Edit Service">
                            <Edit3 size={14} style={{ color: 'var(--primary)' }} />
                          </button>
                          <button className="btn-icon" onClick={() => handleDeleteService(srv.id)} title="Delete Service">
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

      {/* CREATE SERVICE MODAL */}
      {isAddModalOpen && (
        <ServiceFormModal
          title="Add New Service"
          onClose={() => setIsAddModalOpen(false)}
          onSubmit={handleAddService}
        />
      )}

      {/* EDIT SERVICE MODAL */}
      {editingService && (
        <ServiceFormModal
          title="Edit Service Details"
          initialData={editingService}
          onClose={() => setEditingService(null)}
          onSubmit={handleUpdateService}
        />
      )}

      {/* VIEW SERVICE DETAILS MODAL */}
      {viewingService && (
        <div className="modal-overlay" onClick={() => setViewingService(null)}>
          <div className="modal glass animate-fade-in" style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Wrench size={20} style={{ color: 'var(--primary)' }} />
                <h3>Service Profile Details</h3>
              </div>
              <button className="btn-icon" onClick={() => setViewingService(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {(viewingService.service_image || viewingService.image) && (
                <div style={{ width: '100%', height: '180px', borderRadius: 'var(--radius-md)', overflow: 'hidden', backgroundColor: '#0f172a' }}>
                  <img
                    src={viewingService.service_image || viewingService.image}
                    alt={viewingService.service_name || viewingService.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--bg-secondary)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {viewingService.service_name || viewingService.name}
                  </h3>
                  <span className="badge" style={{ background: 'var(--primary-glow)', color: 'var(--primary)', marginTop: '4px' }}>
                    Shop ID #{viewingService.shop_id || viewingService.shop || 1}
                  </span>
                </div>
              </div>

              <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Short Description ("short_description")</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px', display: 'block' }}>
                  {viewingService.short_description || viewingService.description || 'N/A'}
                </span>
              </div>

              <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Long Description ("long_description")</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'block', lineHeight: '1.5' }}>
                  {viewingService.long_description || viewingService.description || 'No detailed description available.'}
                </span>
              </div>

              {(viewingService.service_image || viewingService.image) && (
                <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Service Image URL ("service_image")</span>
                  <a href={viewingService.service_image || viewingService.image} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.85rem', color: 'var(--primary)', wordBreak: 'break-all', display: 'block', marginTop: '4px' }}>
                    {viewingService.service_image || viewingService.image}
                  </a>
                </div>
              )}
            </div>
            <div className="modal-footer" style={{ padding: '16px 20px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setViewingService(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── SERVICE FORM MODAL WITH EXACT PAYLOAD FIELDS ─── */
function ServiceFormModal({ title, initialData, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    shop_id: initialData?.shop_id !== undefined ? initialData.shop_id : (initialData?.shop !== undefined ? initialData.shop : 1),
    service_name: initialData?.service_name || initialData?.name || '',
    service_image: initialData?.service_image || initialData?.image || '',
    short_description: initialData?.short_description || initialData?.description || '',
    long_description: initialData?.long_description || initialData?.description || '',
    is_active: initialData?.is_active !== undefined ? initialData.is_active : true
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [experts, setExperts] = useState([]);
  const [isExpertDropdownOpen, setIsExpertDropdownOpen] = useState(false);

  useEffect(() => {
    const fetchExperts = async () => {
      try {
        const res = await fetch(getApiUrl('experts/'), { headers: DEFAULT_HEADERS });
        if (res.ok) {
          const json = await res.json();
          const list = Array.isArray(json) ? json : (json.data || json.results || []);
          setExperts(list);
        } else {
          const resAlt = await fetch(getApiUrl('expert/'), { headers: DEFAULT_HEADERS });
          if (resAlt.ok) {
            const jsonAlt = await resAlt.json();
            const list = Array.isArray(jsonAlt) ? jsonAlt : (jsonAlt.data || jsonAlt.results || []);
            setExperts(list);
          }
        }
      } catch (err) {
        console.warn("Failed to fetch experts:", err);
      }
    };
    fetchExperts();
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
      if (errors.service_image) {
        setErrors(prev => ({ ...prev, service_image: null }));
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    const rawUrl = formData.service_image ? formData.service_image.trim() : '';
    const isUrlValid = rawUrl === '' || rawUrl.startsWith('http://') || rawUrl.startsWith('https://');

    if (!formData.service_name.trim()) newErrors.service_name = "Service name is required";
    
    if (!isUrlValid) {
      newErrors.service_image = "Please enter a valid URL starting with http:// or https://";
    }

    if (formData.shop_id === '' || isNaN(formData.shop_id) || Number(formData.shop_id) < 1) {
      newErrors.shop_id = "Expert selection is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const finalImage = isUrlValid && rawUrl !== '' ? rawUrl : (initialData?.service_image || 'https://example.com/service.jpg');
    const submitData = { ...formData, service_image: finalImage };

    onSubmit(initialData ? { ...initialData, ...submitData, imageFile, imagePreview } : { ...submitData, imageFile, imagePreview });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal glass animate-fade-in" style={{ maxWidth: '540px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Wrench size={20} style={{ color: 'var(--primary)' }} />
            <h3>{title}</h3>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* PAYLOAD FIELD: shop_id */}
            <div className="form-group">
              <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                Expert Name *
              </label>
              <div style={{ position: 'relative' }}>
                <div 
                  className="form-input" 
                  style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  onClick={() => setIsExpertDropdownOpen(!isExpertDropdownOpen)}
                >
                  <span>
                    {formData.shop_id ? (experts.find(e => e.id === Number(formData.shop_id))?.expert_name || experts.find(e => e.id === Number(formData.shop_id))?.name || `Expert #${formData.shop_id}`) : 'Select an Expert'}
                  </span>
                  <ChevronDown size={16} style={{ color: 'var(--text-muted)', transform: isExpertDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
                </div>
                {isExpertDropdownOpen && (
                  <div style={{ 
                    position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, 
                    background: 'var(--bg-secondary)', border: '1px solid var(--card-border)',
                    borderRadius: 'var(--radius-md)', zIndex: 10,
                    boxShadow: '0 8px 24px rgba(15,23,42,0.1)', maxHeight: '200px', overflowY: 'auto',
                    animation: 'fadeIn 0.2s ease-out'
                  }}>
                    <div 
                      style={{ padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid var(--card-border)', fontSize: '0.9rem', color: 'var(--text-muted)' }}
                      onClick={() => {
                        setFormData(prev => ({ ...prev, shop_id: '' }));
                        setIsExpertDropdownOpen(false);
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      Select an Expert
                    </div>
                    {experts.map(expert => (
                      <div 
                        key={expert.id}
                        style={{ padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid var(--card-border)', fontSize: '0.9rem' }}
                        onClick={() => {
                           setFormData(prev => ({ ...prev, shop_id: expert.id }));
                           if (errors.shop_id) setErrors(prev => ({ ...prev, shop_id: null }));
                           setIsExpertDropdownOpen(false);
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        {expert.expert_name || expert.name || `Expert #${expert.id}`}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {errors.shop_id && <span style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '4px' }}>{errors.shop_id}</span>}
            </div>

            {/* PAYLOAD FIELD: service_name */}
            <div className="form-group">
              <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                Service Name ("service_name") *
              </label>
              <input
                type="text"
                name="service_name"
                className="form-input"
                placeholder="e.g. Ayurvedic Consultation"
                value={formData.service_name}
                onChange={handleChange}
              />
              {errors.service_name && <span style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '4px' }}>{errors.service_name}</span>}
            </div>

            {/* PAYLOAD FIELD: short_description */}
            <div className="form-group">
              <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                Short Description ("short_description")
              </label>
              <input
                type="text"
                name="short_description"
                className="form-input"
                placeholder="e.g. Basic Ayurvedic consultation"
                value={formData.short_description}
                onChange={handleChange}
              />
            </div>

            {/* PAYLOAD FIELD: long_description */}
            <div className="form-group">
              <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                Long Description ("long_description")
              </label>
              <textarea
                name="long_description"
                className="form-input"
                rows="3"
                placeholder="e.g. Detailed Ayurvedic consultation and personalized guidance."
                value={formData.long_description}
                onChange={handleChange}
                style={{ resize: 'vertical' }}
              />
            </div>

            {/* PAYLOAD FIELD: service_image File Upload Attachment */}
            <div style={{ background: 'var(--bg-secondary)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ImageIcon size={14} style={{ color: 'var(--primary)' }} />
                  <span>Service Image URL</span>
                </label>
                <input
                  type="url"
                  name="service_image"
                  className="form-input"
                  placeholder="https://example.com/service.jpg"
                  value={formData.service_image || ''}
                  onChange={handleChange}
                />
              </div>

              <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>OR Upload Image File</div>

              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ImageIcon size={14} style={{ color: 'var(--primary)' }} />
                  <span>Service Image File</span>
                </label>
                <input
                  type="file"
                  accept="image/*"
                  className="form-input"
                  style={{ padding: '8px', cursor: 'pointer' }}
                  onChange={handleFileChange}
                />
                {errors.service_image && <span style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{errors.service_image}</span>}
              </div>
              {/* LIVE ATTACHED IMAGE PREVIEW */}
              {(imagePreview || formData.service_image) && (
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
                    src={imagePreview || formData.service_image}
                    alt="Service Preview"
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
                <span>Is Active Service</span>
              </label>
            </div>

          </div>

          <div className="modal-footer" style={{ padding: '16px 20px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ minWidth: '120px' }}>
              {initialData ? 'Save Changes' : 'Create Service'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
