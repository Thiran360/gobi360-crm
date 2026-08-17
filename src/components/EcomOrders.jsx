import React, { useState, useEffect, useRef } from 'react';
import {
  ShoppingCart, Store, Search, RefreshCw, X, Loader2,
  Package, Tag, DollarSign, Phone, CheckCircle, Clock,
  AlertCircle, ShieldCheck, ArrowRight, Eye, Layers, ChevronDown
} from 'lucide-react';
import { fetchShops, fetchOrderCallbackData } from '../services/api';

export default function EcomOrders() {
  const [shops, setShops] = useState([]);
  const [loadingShops, setLoadingShops] = useState(true);
  const [shopsError, setShopsError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Shop & Order Callback State
  const [selectedShop, setSelectedShop] = useState(null);
  const [orderData, setOrderData] = useState(null);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [orderError, setOrderError] = useState(null);

  // Ref to auto scroll down to orders section when a shop is clicked
  const ordersSectionRef = useRef(null);

  // Load shops from API on mount
  const loadShopsList = async () => {
    try {
      setLoadingShops(true);
      setShopsError(null);
      const data = await fetchShops();
      setShops(data);
    } catch (err) {
      console.error("Failed to load shops:", err);
      setShopsError(err.message || 'Failed to load shops list');
    } finally {
      setLoadingShops(false);
    }
  };

  useEffect(() => {
    loadShopsList();
  }, []);

  // Handle clicking a shop card to fetch order callback data
  const handleSelectShop = async (shop) => {
    setSelectedShop(shop);
    setOrderData(null);
    setOrderError(null);
    setLoadingOrder(true);

    // Scroll to orders section smoothly
    setTimeout(() => {
      if (ordersSectionRef.current) {
        ordersSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 100);

    try {
      const data = await fetchOrderCallbackData(shop.id);
      setOrderData(data);
    } catch (err) {
      console.error(`Failed to fetch order callback data for shop #${shop.id}:`, err);
      setOrderError(err.message || 'Could not retrieve order callback data');
    } finally {
      setLoadingOrder(false);
    }
  };

  const clearSelection = () => {
    setSelectedShop(null);
    setOrderData(null);
    setOrderError(null);
  };

  const filteredShops = shops.filter(s => {
    const q = searchQuery.toLowerCase();
    const name = (s.shop_name || s.name || '').toLowerCase();
    const desc = (s.description || '').toLowerCase();
    const cat = String(s.category || '').toLowerCase();
    return name.includes(q) || desc.includes(q) || cat.includes(q);
  });

  // Normalize orderData response into an array to support multi-order display
  const getOrderList = () => {
    if (!orderData) return [];
    if (Array.isArray(orderData)) return orderData;
    if (Array.isArray(orderData.orders)) return orderData.orders;
    if (Array.isArray(orderData.data)) return orderData.data;
    if (typeof orderData === 'object' && (orderData.order_id !== undefined || orderData.customer_mobile !== undefined)) {
      return [orderData];
    }
    return [];
  };

  const orderList = getOrderList();

  return (
    <section className="call-section-card glass" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        borderBottom: '1px solid var(--card-border)',
        paddingBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div className="metric-icon-box green" style={{ width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShoppingCart size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0 }}>Ecom Orders & Shops</h2>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Browse shops and inspect order callback details below.
            </span>
          </div>
        </div>
      </div>

      {/* Loading state for shops */}
      {loadingShops && (
        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 12px auto', color: 'var(--primary)' }} />
          <p style={{ fontWeight: 500 }}>Fetching shops directory...</p>
        </div>
      )}

      {/* Error state for shops */}
      {!loadingShops && shopsError && (
        <div style={{
          padding: '24px',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(220, 38, 38, 0.08)',
          border: '1px solid rgba(220, 38, 38, 0.2)',
          color: 'var(--danger)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertCircle size={20} />
            <span>{shopsError}</span>
          </div>
          <button className="btn btn-secondary" onClick={loadShopsList} style={{ padding: '6px 16px', fontSize: '0.85rem' }}>
            Retry
          </button>
        </div>
      )}

      {/* Empty Shops state */}
      {!loadingShops && !shopsError && shops.length === 0 && (
        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Store size={48} style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
          <p style={{ fontSize: '1rem', fontWeight: 500 }}>No shops available.</p>
        </div>
      )}

      {/* 4-COLUMN SHOPS GRID */}
      {!loadingShops && !shopsError && shops.length > 0 && (
        <div>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Available Shops ({shops.length}) — Click any shop to view its order details below
          </h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: '20px'
          }}>
            {shops.map((shop) => {
              const isSelected = selectedShop && selectedShop.id === shop.id;

              return (
                <div
                  key={shop.id}
                  onClick={() => handleSelectShop(shop)}
                  className="glass"
                  style={{
                    borderRadius: 'var(--radius-md)',
                    border: isSelected ? '2px solid var(--primary)' : '1px solid var(--card-border)',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.25s ease',
                    background: isSelected ? 'rgba(37, 99, 235, 0.04)' : 'var(--bg-secondary)',
                    boxShadow: isSelected ? '0 0 0 3px rgba(37, 99, 235, 0.18)' : 'none',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.borderColor = 'var(--primary)';
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(37, 99, 235, 0.12)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.borderColor = 'var(--card-border)';
                      e.currentTarget.style.boxShadow = 'none';
                    }
                  }}
                >
                  {/* Card Header & Avatar */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '10px',
                        background: 'var(--primary-gradient)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '1.1rem',
                        boxShadow: '0 4px 10px rgba(37, 99, 235, 0.25)'
                      }}>
                        {(shop.shop_name || shop.name || 'S').charAt(0).toUpperCase()}
                      </div>

                      <span className={`badge ${shop.is_active !== false ? 'badge-completed' : 'badge-busy'}`} style={{ fontSize: '0.7rem', padding: '3px 8px' }}>
                        {shop.is_active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    {/* Shop Name & Meta */}
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                      {shop.shop_name || shop.name || `Shop #${shop.id}`}
                    </h3>
                    
                    <p style={{
                      fontSize: '0.825rem',
                      color: 'var(--text-secondary)',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      lineHeight: '1.4',
                      marginBottom: '10px'
                    }}>
                      {shop.description || 'No detailed shop description available.'}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <Tag size={12} />
                      <span>Category ID: #{shop.category || 'N/A'}</span>
                    </div>
                  </div>

                  {/* Card Action Footer */}
                  <div style={{
                    paddingTop: '12px',
                    borderTop: '1px dashed var(--card-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)' }}>
                      Shop ID: #{shop.id}
                    </span>

                    <button
                      type="button"
                      className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.775rem',
                        borderRadius: 'var(--radius-sm)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Eye size={14} />
                      <span>{isSelected ? 'Viewing Orders' : 'View Orders'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* INLINE ORDERS SECTION BELOW THE GRID */}
      {selectedShop && (
        <div
          ref={ordersSectionRef}
          style={{
            marginTop: '4px',
            borderRadius: 'var(--radius-md)',
            border: '1.5px solid var(--primary)',
            background: 'var(--bg-secondary)',
            boxShadow: '0 8px 24px rgba(37, 99, 235, 0.06)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            animation: 'fadeIn 0.25s ease'
          }}
        >
          {/* Section Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--card-border)',
            paddingBottom: '10px'
          }}>
            <div>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                Shop Order Callback Details
              </span>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginTop: '2px', color: 'var(--text-primary)' }}>
                {selectedShop.shop_name || 'Shop'} — Order Records
              </h3>
            </div>

            <button
              className="btn btn-secondary"
              onClick={clearSelection}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.775rem',
                padding: '4px 10px'
              }}
            >
              <X size={14} />
              <span>Hide Details</span>
            </button>
          </div>

          {/* Loading State */}
          {loadingOrder && (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px auto', color: 'var(--primary)' }} />
              <p style={{ fontWeight: 500, fontSize: '0.85rem' }}>Fetching order callback data for Shop #{selectedShop.id}...</p>
            </div>
          )}

          {/* Error State */}
          {!loadingOrder && orderError && (
            <div style={{
              padding: '14px 16px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(220, 38, 38, 0.08)',
              border: '1px solid rgba(220, 38, 38, 0.2)',
              color: 'var(--danger)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.85rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} />
                <span>{orderError}</span>
              </div>
              <button className="btn btn-secondary" onClick={() => handleSelectShop(selectedShop)} style={{ padding: '4px 10px', fontSize: '0.775rem' }}>
                Retry
              </button>
            </div>
          )}

          {/* Order Data Display (Supports Single or Multi Orders) */}
          {!loadingOrder && !orderError && (
            <div>
              {orderList.length === 0 ? (
                <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  <Package size={32} style={{ margin: '0 auto 8px auto', opacity: 0.4 }} />
                  <p style={{ fontWeight: 500 }}>No order records found for this shop.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Total Orders Found: <strong style={{ color: 'var(--primary)' }}>{orderList.length}</strong>
                  </div>

                  {/* ORDERS GRID: STRICTLY 4 COLUMNS PER ROW */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                    gap: '16px',
                    alignItems: 'start'
                  }}>
                    {orderList.map((item, orderIdx) => {
                      const productsList = Array.isArray(item.products) ? item.products : [];

                      return (
                        <div
                          key={item.order_id || item.id || orderIdx}
                          style={{
                            background: 'var(--bg-primary)',
                            border: '1.5px solid var(--card-border)',
                            borderRadius: 'var(--radius-md)',
                            padding: '14px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                            boxShadow: '0 2px 8px rgba(15,23,42,0.03)'
                          }}
                        >
                          {/* Order Header */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(37,99,235,0.08)', paddingBottom: '8px' }}>
                            <span style={{
                              fontWeight: 700,
                              fontSize: '0.8rem',
                              color: 'var(--primary)',
                              background: 'rgba(37,99,235,0.1)',
                              padding: '2px 8px',
                              borderRadius: '4px'
                            }}>
                              Order #{item.order_id || item.id || orderIdx + 1}
                            </span>
                            <span className="badge badge-busy" style={{ fontSize: '0.65rem', padding: '2px 6px', textTransform: 'uppercase' }}>
                              {item.status || 'pending'}
                            </span>
                          </div>

                          {/* Info Rows */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.775rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Phone size={12} style={{ color: 'var(--primary)' }} /> Mobile
                              </span>
                              <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                                {item.customer_mobile || 'N/A'}
                              </span>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <DollarSign size={12} style={{ color: 'var(--success)' }} /> Total Amount
                              </span>
                              <span style={{ fontWeight: 700, color: 'var(--success)', fontVariantNumeric: 'tabular-nums' }}>
                                ₹{item.total_amount || '0.00'}
                              </span>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <ShieldCheck size={12} style={{ color: 'var(--primary)' }} /> Payment
                              </span>
                              <span className="badge badge-completed" style={{ fontSize: '0.65rem', padding: '1px 6px', textTransform: 'uppercase' }}>
                                {item.payment_status || 'paid'}
                              </span>
                            </div>
                          </div>

                          {/* Products Breakdown */}
                          <div style={{ borderTop: '1px dashed var(--card-border)', paddingTop: '8px' }}>
                            <span style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                              <Package size={13} style={{ color: 'var(--primary)' }} /> Products ({productsList.length})
                            </span>

                            {productsList.length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {productsList.map((prod, pIdx) => (
                                  <div
                                    key={prod.product_id || pIdx}
                                    style={{
                                      padding: '6px 8px',
                                      borderRadius: 'var(--radius-sm)',
                                      background: 'var(--bg-secondary)',
                                      border: '1px solid var(--card-border)',
                                      fontSize: '0.75rem'
                                    }}
                                  >
                                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'flex', justifyContent: 'space-between' }}>
                                      <span>{prod.product_name || 'Product'}</span>
                                      <span style={{ color: 'var(--primary)' }}>₹{prod.subtotal || prod.price || '0.00'}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.7rem', marginTop: '2px' }}>
                                      <span>Category: {prod.category || 'General'}</span>
                                      <span>Qty: {prod.quantity || 1}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div style={{ padding: '6px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.725rem' }}>
                                No product items.
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

    </section>
  );
}
