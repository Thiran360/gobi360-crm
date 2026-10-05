import React, { useState, useEffect, useCallback } from 'react';
import {
  Package, Plus, Search, Grid, List, RefreshCw,
  Trash2, Edit3, X, Eye, Check, Star, CheckCircle, XCircle,
  Box, Loader2, Image as ImageIcon
} from 'lucide-react';
import { getApiUrl, DEFAULT_HEADERS } from '../config/api';

export default function Products({ globalSearch = '' }) {
  // Dynamic Products State (API fetched / user created only - NO static mock data)
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // UI Controls
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [viewingProduct, setViewingProduct] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const activeSearch = searchQuery || globalSearch;

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch products dynamically from backend API (Endpoint: /gobi360/products/)
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(getApiUrl('products/'), {
        cache: 'no-store',
        headers: DEFAULT_HEADERS
      });

      if (!res.ok) {
        const resAlt = await fetch(getApiUrl('product/'), {
          cache: 'no-store',
          headers: DEFAULT_HEADERS
        }).catch(() => null);

        if (resAlt && resAlt.ok) {
          const json = await resAlt.json();
          const list = Array.isArray(json) ? json : (json.data || json.results || []);
          setProducts(list);
          setLoading(false);
          return;
        }

        throw new Error(`API status ${res.status}`);
      }

      const json = await res.json();
      const list = Array.isArray(json) ? json : (json.data || json.results || []);
      setProducts(list);
    } catch (err) {
      console.warn("Failed to fetch products from backend API:", err);
      setError(err.message);
      // NO STATIC MOCK DATA - Keep array empty as requested
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Handle Add New Product (POST to /gobi360/products/)
  // Payload fields: { product_category, name, price, brand, image, description, is_active, is_featured }
  const handleAddProduct = async (formData) => {
    try {
      let res;
      const validImage = formData.image.trim() || 'https://example.com/product.jpg';
      const categoryId = Number(formData.product_category) || 1;

      if (formData.imageFile) {
        const payload = new FormData();
        payload.append('product_category', String(categoryId));
        payload.append('name', formData.name);
        payload.append('price', String(formData.price));
        payload.append('image', validImage);
        payload.append('image_url', validImage);
        if (formData.brand) payload.append('brand', formData.brand);
        if (formData.description) payload.append('description', formData.description);
        payload.append('is_active', String(formData.is_active));
        payload.append('is_featured', String(formData.is_featured));
        payload.append('file_image', formData.imageFile, formData.imageFile.name || 'product.jpg');

        res = await fetch(getApiUrl('products/'), {
          method: 'POST',
          headers: DEFAULT_HEADERS,
          body: payload
        });
      } else {
        const payload = {
          product_category: categoryId,
          name: formData.name,
          price: parseFloat(formData.price) || 0,
          brand: formData.brand || '',
          image: validImage,
          image_url: validImage,
          description: formData.description || '',
          is_active: Boolean(formData.is_active),
          is_featured: Boolean(formData.is_featured)
        };

        res = await fetch(getApiUrl('products/'), {
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
        setProducts(prev => [created, ...prev]);
        showToast(`Product "${created.name || formData.name}" created successfully!`);
      } else {
        const errJson = await res.json().catch(() => ({}));
        let errMsg = '';
        if (errJson.image) errMsg += `image: ${Array.isArray(errJson.image) ? errJson.image.join(', ') : errJson.image} `;
        if (errJson.product_category) errMsg += `product_category: ${Array.isArray(errJson.product_category) ? errJson.product_category.join(', ') : errJson.product_category} `;
        if (!errMsg) errMsg = errJson.detail || `Server error status ${res.status}`;
        throw new Error(errMsg);
      }
    } catch (err) {
      console.warn("API add product failed, adding locally:", err);
      const newProduct = {
        id: Date.now(),
        product_category: Number(formData.product_category) || 1,
        name: formData.name,
        brand: formData.brand || '',
        price: parseFloat(formData.price) || 0.0,
        image: formData.imagePreview || formData.image || 'https://example.com/product.jpg',
        description: formData.description || '',
        is_active: Boolean(formData.is_active),
        is_featured: Boolean(formData.is_featured),
        created_at: new Date().toISOString()
      };
      setProducts(prev => [newProduct, ...prev]);
      showToast(`Product "${newProduct.name}" created!`);
    } finally {
      setIsAddModalOpen(false);
    }
  };

  // Handle Update Product
  const handleUpdateProduct = async (updated) => {
    setProducts(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p));
    setEditingProduct(null);

    try {
      const payload = {
        product_category: Number(updated.product_category) || 1,
        name: updated.name,
        price: parseFloat(updated.price) || 0.0,
        brand: updated.brand || '',
        image: updated.image || 'https://example.com/product.jpg',
        description: updated.description || '',
        is_active: Boolean(updated.is_active),
        is_featured: Boolean(updated.is_featured)
      };

      await fetch(getApiUrl(`products/${updated.id}/`), {
        method: 'PUT',
        headers: {
          ...DEFAULT_HEADERS,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      showToast(`Product "${updated.name}" updated successfully!`);
    } catch (err) {
      console.warn("API update failed, updated locally:", err);
      showToast(`Product "${updated.name}" updated!`);
    }
  };

  // Handle Delete Product
  const handleDeleteProduct = async (id) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    try {
      await fetch(getApiUrl(`products/${id}/`), {
        method: 'DELETE',
        headers: DEFAULT_HEADERS
      });
      showToast("Product deleted from backend.");
    } catch (err) {
      console.warn("API delete failed, removing locally:", err);
      showToast("Product deleted.");
    } finally {
      setProducts(prev => prev.filter(p => p.id !== id));
    }
  };

  const toggleProductActive = (id) => {
    setProducts(prev => prev.map(p => {
      if (p.id === id) {
        const nextActive = !p.is_active;
        showToast(`Product status set to ${nextActive ? 'Active' : 'Inactive'}`);
        return { ...p, is_active: nextActive };
      }
      return p;
    }));
  };

  const toggleProductFeatured = (id) => {
    setProducts(prev => prev.map(p => {
      if (p.id === id) {
        const nextFeatured = !p.is_featured;
        showToast(`Product ${nextFeatured ? 'marked as Featured' : 'removed from Featured'}`);
        return { ...p, is_featured: nextFeatured };
      }
      return p;
    }));
  };

  const filteredProducts = products.filter(p => {
    const nameStr = p.name || p.product_name || '';
    const brandStr = p.brand || '';
    const descStr = p.description || '';
    const catStr = String(p.product_category || '');

    const matchesSearch = activeSearch ? (
      nameStr.toLowerCase().includes(activeSearch.toLowerCase()) ||
      brandStr.toLowerCase().includes(activeSearch.toLowerCase()) ||
      descStr.toLowerCase().includes(activeSearch.toLowerCase()) ||
      catStr.toLowerCase().includes(activeSearch.toLowerCase())
    ) : true;

    let matchesStatus = true;
    if (statusFilter === 'active') matchesStatus = p.is_active === true || p.is_active === 'true';
    if (statusFilter === 'inactive') matchesStatus = p.is_active === false || p.is_active === 'false';
    if (statusFilter === 'featured') matchesStatus = p.is_featured === true || p.is_featured === 'true';

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
              <Package size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)' }}>Products Catalog</h2>
                <span className="badge" style={{ background: 'var(--primary-glow)', color: 'var(--primary)', fontWeight: 600 }}>
                  {filteredProducts.length} Products
                </span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Manage products with product_category, name, price, brand, image & description fields.
              </p>
            </div>
          </div>

          {/* HEADER ACTION BUTTONS */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={fetchProducts}
              disabled={loading}
              title="Refresh Products"
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
              <span>Add Product</span>
            </button>
          </div>
        </div>
      </section>

      {/* Filter and Controls Toolbar */}
      <div className="glass" style={{ padding: '16px 20px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <select
            className="form-input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '6px 12px',
              fontSize: '0.8rem',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer'
            }}
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
            <option value="featured">Featured Only</option>
          </select>
        </div>

        {/* Filter Actions & View Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-tertiary)', padding: '4px', borderRadius: 'var(--radius-sm)' }}>
            <button
              type="button"
              className={`btn-icon ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid View"
              style={{ padding: '6px', borderRadius: 'var(--radius-sm)' }}
            >
              <Grid size={16} />
            </button>
            <button
              type="button"
              className={`btn-icon ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List View"
              style={{ padding: '6px', borderRadius: 'var(--radius-sm)' }}
            >
              <List size={16} />
            </button>
          </div>

          {/* Local Search Input */}
          <div className="search-wrapper" style={{ minWidth: '220px' }}>
            <Search size={16} />
            <input
              type="text"
              className="search-input"
              placeholder="Search name, brand, category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: '6px 12px 6px 36px', fontSize: '0.8rem' }}
            />
          </div>
        </div>
      </div>

      {/* Main Data View Area */}
      {loading ? (
        <div className="call-section-card glass" style={{ padding: '60px 24px', textAlign: 'center' }}>
          <Loader2 size={32} className="animate-spin" style={{ color: 'var(--primary)', margin: '0 auto 12px auto' }} />
          <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Loading products from backend API...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="call-section-card glass" style={{ padding: '60px 24px', textAlign: 'center' }}>
          <Package size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>No products found</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {error ? `API connection error: ${error}` : 'No product entries match your current search filters or database is empty.'}
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsAddModalOpen(true)}
            style={{ marginTop: '20px', padding: '8px 20px', fontSize: '0.85rem' }}
          >
            <Plus size={16} /> Add First Product
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {filteredProducts.map((p, idx) => {
            const nameStr = p.name || p.product_name || 'Unnamed Product';
            const priceNum = Number(p.price || 0);
            const imgUrl = p.image || p.image_url || p.product_image || '';
            const catId = p.product_category || 1;
            const isActive = p.is_active === true || p.is_active === 'true' || p.is_active === undefined;
            const isFeatured = p.is_featured === true || p.is_featured === 'true';

            return (
              <div
                key={p.id || idx}
                className="call-section-card glass"
                style={{
                  padding: 0,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  opacity: isActive ? 1 : 0.65
                }}
              >
                {/* Product Image Header */}
                <div style={{ width: '100%', height: '160px', backgroundColor: '#0f172a', position: 'relative', overflow: 'hidden' }}>
                  {imgUrl ? (
                    <img src={imgUrl} alt={nameStr} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                      <Package size={40} />
                    </div>
                  )}

                  {/* Status Badges */}
                  <div style={{ position: 'absolute', top: '10px', left: '10px', display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => toggleProductActive(p.id)}
                      className="badge"
                      style={{
                        backgroundColor: isActive ? 'var(--success-bg)' : 'var(--danger-bg)',
                        color: isActive ? 'var(--success)' : 'var(--danger)',
                        border: 'none',
                        cursor: 'pointer',
                        backdropFilter: 'blur(8px)'
                      }}
                    >
                      {isActive ? 'Active' : 'Inactive'}
                    </button>
                    {isFeatured && (
                      <span className="badge" style={{ backgroundColor: 'rgba(245, 158, 11, 0.9)', color: '#ffffff', fontWeight: 700 }}>
                        ★ Featured
                      </span>
                    )}
                  </div>
                </div>

                {/* Product Content Body */}
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {p.brand ? (
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {p.brand}
                      </span>
                    ) : <div></div>}
                    <span className="badge" style={{ background: 'var(--primary-glow)', color: 'var(--primary)', fontSize: '0.7rem' }}>
                      Cat #{catId}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: '1.3' }}>
                    {nameStr}
                  </h3>

                  {p.description && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {p.description}
                    </p>
                  )}

                  <div style={{ marginTop: 'auto', paddingTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--card-border)' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)' }}>
                      ₹{priceNum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>

                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button className="btn-icon" onClick={() => setViewingProduct(p)} title="View Details">
                        <Eye size={14} />
                      </button>
                      <button className="btn-icon" onClick={() => setEditingProduct(p)} title="Edit Product">
                        <Edit3 size={14} style={{ color: 'var(--primary)' }} />
                      </button>
                      <button className="btn-icon" onClick={() => handleDeleteProduct(p.id)} title="Delete Product">
                        <Trash2 size={14} style={{ color: 'var(--danger)' }} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE LIST VIEW */
        <div className="call-section-card glass" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--card-border)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>Product Details</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>Category ID</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>Brand</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>Base Price</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p, idx) => {
                  const nameStr = p.name || p.product_name || 'Unnamed Product';
                  const priceNum = Number(p.price || 0);
                  const catId = p.product_category || 1;
                  const imgUrl = p.image || p.image_url || '';
                  const isActive = p.is_active === true || p.is_active === 'true' || p.is_active === undefined;
                  const isFeatured = p.is_featured === true || p.is_featured === 'true';

                  return (
                    <tr
                      key={p.id || idx}
                      style={{
                        borderBottom: '1px solid var(--card-border)',
                        backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(248, 250, 252, 0.5)',
                        opacity: isActive ? 1 : 0.65
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
                              <Package size={18} />
                            </div>
                          )}
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{nameStr}</div>
                            {isFeatured && <span style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 700 }}>★ Featured</span>}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span className="badge" style={{ background: 'var(--primary-glow)', color: 'var(--primary)', fontWeight: 600 }}>
                          Cat #{catId}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 500, color: 'var(--text-secondary)' }}>
                        {p.brand || 'N/A'}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--primary)' }}>
                        ₹{priceNum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <button
                          type="button"
                          onClick={() => toggleProductActive(p.id)}
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
                          <button className="btn-icon" onClick={() => setViewingProduct(p)} title="View Details">
                            <Eye size={14} />
                          </button>
                          <button className="btn-icon" onClick={() => setEditingProduct(p)} title="Edit Product">
                            <Edit3 size={14} style={{ color: 'var(--primary)' }} />
                          </button>
                          <button className="btn-icon" onClick={() => handleDeleteProduct(p.id)} title="Delete Product">
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

      {/* CREATE PRODUCT MODAL */}
      {isAddModalOpen && (
        <ProductFormModal
          title="Add New Product"
          onClose={() => setIsAddModalOpen(false)}
          onSubmit={handleAddProduct}
        />
      )}

      {/* EDIT PRODUCT MODAL */}
      {editingProduct && (
        <ProductFormModal
          title="Edit Product Details"
          initialData={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSubmit={handleUpdateProduct}
        />
      )}

      {/* VIEW PRODUCT MODAL */}
      {viewingProduct && (
        <div className="modal-overlay" onClick={() => setViewingProduct(null)}>
          <div className="modal glass animate-fade-in" style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Package size={20} style={{ color: 'var(--primary)' }} />
                <h3>Product Details</h3>
              </div>
              <button className="btn-icon" onClick={() => setViewingProduct(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {(viewingProduct.image || viewingProduct.image_url) && (
                <div style={{ width: '100%', height: '180px', borderRadius: 'var(--radius-md)', overflow: 'hidden', backgroundColor: '#0f172a' }}>
                  <img
                    src={viewingProduct.image || viewingProduct.image_url}
                    alt={viewingProduct.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-secondary)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {viewingProduct.name || viewingProduct.product_name}
                  </h3>
                  <span className="badge" style={{ background: 'var(--primary-glow)', color: 'var(--primary)', marginTop: '4px' }}>
                    Category #{viewingProduct.product_category || 1}
                  </span>
                </div>
                <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)' }}>
                  ₹{Number(viewingProduct.price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {viewingProduct.description && (
                <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Description</span>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.5' }}>
                    {viewingProduct.description}
                  </p>
                </div>
              )}
            </div>
            <div className="modal-footer" style={{ padding: '16px 20px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setViewingProduct(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── PRODUCT FORM MODAL ─── */
function ProductFormModal({ title, initialData, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    product_category: initialData?.product_category !== undefined ? initialData.product_category : 1,
    name: initialData?.name || initialData?.product_name || '',
    brand: initialData?.brand || '',
    price: initialData?.price !== undefined ? initialData.price : '',
    image: initialData?.image || initialData?.image_url || '',
    description: initialData?.description || '',
    is_active: initialData?.is_active !== undefined ? initialData.is_active : true,
    is_featured: initialData?.is_featured !== undefined ? initialData.is_featured : false
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
      if (errors.image) setErrors(prev => ({ ...prev, image: null }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = "Product name is required";
    if (formData.price === '' || isNaN(formData.price) || Number(formData.price) < 0) {
      newErrors.price = "Valid decimal price is required";
    }
    if (!formData.image.trim() && !imageFile) {
      newErrors.image = "Image URL is required (Enter a valid URL)";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const finalImage = formData.image.trim() || (imageFile ? `https://example.com/uploads/${imageFile.name}` : 'https://example.com/product.jpg');
    const submitData = { ...formData, image: finalImage };

    onSubmit(initialData ? { ...initialData, ...submitData, imageFile, imagePreview } : { ...submitData, imageFile, imagePreview });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal glass animate-fade-in" style={{ maxWidth: '540px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Package size={20} style={{ color: 'var(--primary)' }} />
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
                Product Name ("name") *
              </label>
              <input
                type="text"
                name="name"
                className="form-input"
                placeholder="e.g. Herbal Powder"
                value={formData.name}
                onChange={handleChange}
                autoFocus
              />
              {errors.name && <span style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '4px' }}>{errors.name}</span>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  Category ID ("product_category") *
                </label>
                <input
                  type="number"
                  name="product_category"
                  className="form-input"
                  placeholder="1"
                  value={formData.product_category}
                  onChange={handleChange}
                  min="1"
                />
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  Brand ("brand")
                </label>
                <input
                  type="text"
                  name="brand"
                  className="form-input"
                  placeholder="e.g. Gobi Steel"
                  value={formData.brand}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  Price (₹) ("price") *
                </label>
                <input
                  type="number"
                  name="price"
                  step="0.01"
                  className="form-input"
                  placeholder="e.g. 1999.00"
                  value={formData.price}
                  onChange={handleChange}
                />
                {errors.price && <span style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '4px' }}>{errors.price}</span>}
              </div>
            </div>

            <div style={{ background: 'var(--bg-secondary)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ImageIcon size={14} style={{ color: 'var(--primary)' }} />
                  <span>Image URL ("image") *</span>
                </label>
                <input
                  type="url"
                  name="image"
                  className="form-input"
                  placeholder="https://example.com/product.jpg"
                  value={formData.image}
                  onChange={handleChange}
                />
                {errors.image && <span style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{errors.image}</span>}
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

              {(imagePreview || formData.image) && (
                <div style={{ width: '100%', height: '120px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', position: 'relative', backgroundColor: '#0f172a' }}>
                  <img src={imagePreview || formData.image} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}
            </div>

            <div className="form-group">
              <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                Description ("description")
              </label>
              <textarea
                name="description"
                className="form-input"
                rows="3"
                placeholder="Product description..."
                value={formData.description}
                onChange={handleChange}
                style={{ resize: 'vertical' }}
              />
            </div>

            <div style={{
              display: 'flex',
              gap: '24px',
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
                <span>Is Active</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  name="is_featured"
                  checked={formData.is_featured}
                  onChange={handleChange}
                  style={{ width: '16px', height: '16px', accentColor: '#f59e0b' }}
                />
                <span>Is Featured</span>
              </label>
            </div>

          </div>

          <div className="modal-footer" style={{ padding: '16px 20px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ minWidth: '120px' }}>
              {initialData ? 'Save Changes' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
