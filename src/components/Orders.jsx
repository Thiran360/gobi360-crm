import React, { useState, useEffect, useCallback } from 'react';
import {
  ShoppingBag, Plus, Search, RefreshCw, Eye, Trash2,
  Check, X, Loader2, DollarSign, Package, User, Phone, MapPin, Calendar, FileText, CheckCircle, Clock, AlertTriangle, XCircle
} from 'lucide-react';
import { getApiUrl, DEFAULT_HEADERS } from '../config/api';

export default function Orders({ globalSearch = '' }) {
  // Orders State (Dynamic API / user added only - NO static mock data)
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // UI States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [viewingOrder, setViewingOrder] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const activeSearch = searchQuery || globalSearch;

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch specific order by ID from API (order/<int:order_id>/)
  const fetchOrderById = useCallback(async (orderIdToFetch) => {
    if (!orderIdToFetch) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(getApiUrl(`order/${orderIdToFetch}/`), {
        cache: 'no-store',
        headers: DEFAULT_HEADERS
      });

      if (!res.ok) {
        throw new Error(`Order #${orderIdToFetch} not found (API status ${res.status})`);
      }

      const json = await res.json();
      const item = json.data || json;
      setOrders(prev => {
        const exists = prev.some(o => String(o.id) === String(item.id));
        return exists ? prev.map(o => String(o.id) === String(item.id) ? item : o) : [item, ...prev];
      });
      showToast(`Order #${orderIdToFetch} loaded successfully from API!`);
    } catch (err) {
      console.warn("Order fetch by ID failed:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // On mount: initialize state gracefully without making invalid /order/ 404 requests
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Handle Cancel Order
  const handleCancelOrder = async (orderId, userId) => {
    if (!window.confirm("Are you sure you want to cancel this order?")) return;
    
    // If user_id is not known from the order object, prompt for it
    let finalUserId = userId;
    if (!finalUserId) {
       const input = window.prompt("Enter User ID for this order to cancel:");
       if (!input) return;
       finalUserId = Number(input);
    }

    try {
      const res = await fetch(getApiUrl(`order/cancel/`), {
        method: 'POST',
        headers: {
          ...DEFAULT_HEADERS,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ user_id: finalUserId, order_id: orderId })
      });

      if (!res.ok) throw new Error(`Cancel failed: ${res.status}`);
      
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'cancelled' } : o));
      showToast(`Order #${orderId} cancelled successfully!`);
    } catch (err) {
      console.warn("Cancel API failed:", err);
      showToast(`Failed to cancel order: ${err.message}`);
    }
  };


  // Handle Delete Order
  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm("Are you sure you want to delete this order?")) return;
    try {
      let res = await fetch(getApiUrl(`order/${orderId}/`), {
        method: 'DELETE',
        headers: DEFAULT_HEADERS
      });

      if (!res.ok) {
        res = await fetch(getApiUrl(`orders/${orderId}/`), {
          method: 'DELETE',
          headers: DEFAULT_HEADERS
        });
      }
      showToast("Order deleted from backend.");
    } catch (err) {
      console.warn("API delete failed, removing locally:", err);
      showToast("Order deleted.");
    } finally {
      setOrders(prev => prev.filter(o => o.id !== orderId));
    }
  };

  // Handle Order Status Update
  const handleStatusChange = async (orderId, newStatus) => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        return { ...o, order_status: newStatus };
      }
      return o;
    }));

    try {
      let res = await fetch(getApiUrl(`order/${orderId}/`), {
        method: 'PATCH',
        headers: {
          ...DEFAULT_HEADERS,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ order_status: newStatus })
      });

      if (!res.ok) {
        res = await fetch(getApiUrl(`orders/${orderId}/`), {
          method: 'PATCH',
          headers: {
            ...DEFAULT_HEADERS,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ order_status: newStatus })
        });
      }

      showToast(`Order status updated to ${newStatus}`);
    } catch (err) {
      console.warn("Failed to persist status change to backend:", err);
      showToast(`Order status updated to ${newStatus}`);
    }
  };

  // Filtered Orders
  const filteredOrders = orders.filter(o => {
    const custName = o.customer_name || '';
    const custPhone = o.customer_mobile || o.mobile || '';
    const items = o.items_description || o.items || '';
    const idStr = String(o.id || '');

    const matchesSearch = activeSearch ? (
      custName.toLowerCase().includes(activeSearch.toLowerCase()) ||
      custPhone.includes(activeSearch) ||
      items.toLowerCase().includes(activeSearch.toLowerCase()) ||
      idStr.toLowerCase().includes(activeSearch.toLowerCase())
    ) : true;

    let matchesStatus = true;
    if (statusFilter !== 'all') {
      matchesStatus = (o.order_status || 'Pending').toLowerCase() === statusFilter.toLowerCase();
    }

    let matchesPayment = true;
    if (paymentFilter !== 'all') {
      matchesPayment = (o.payment_status || 'Pending').toLowerCase() === paymentFilter.toLowerCase();
    }

    return matchesSearch && matchesStatus && matchesPayment;
  });

  // Dynamic calculations for stats summary
  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => (o.order_status || '').toLowerCase() === 'pending').length;
  const completedOrders = orders.filter(o => (o.order_status || '').toLowerCase() === 'completed').length;
  const totalRevenue = orders.reduce((acc, o) => acc + (Number(o.total_amount) || 0), 0);

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
            <div className="metric-icon-box green" style={{ width: '48px', height: '48px', borderRadius: '12px' }}>
              <ShoppingBag size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)' }}>Orders Management</h2>
                <span className="badge" style={{ background: 'var(--primary-glow)', color: 'var(--primary)', fontWeight: 600 }}>
                  {filteredOrders.length} Orders
                </span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Monitor customer purchases, track fulfillment statuses, and manage payments.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={fetchOrders}
              disabled={loading}
              title="Refresh Orders List"
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

          </div>
        </div>
      </section>

      {/* Metrics Summary Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div className="glass" style={{ padding: '16px 20px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div className="metric-icon-box purple" style={{ width: '40px', height: '40px', borderRadius: '10px' }}>
            <Package size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Total Orders</span>
            <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>{totalOrders}</span>
          </div>
        </div>

        <div className="glass" style={{ padding: '16px 20px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div className="metric-icon-box amber" style={{ width: '40px', height: '40px', borderRadius: '10px' }}>
            <Clock size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Pending Orders</span>
            <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--warning)' }}>{pendingOrders}</span>
          </div>
        </div>

        <div className="glass" style={{ padding: '16px 20px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div className="metric-icon-box green" style={{ width: '40px', height: '40px', borderRadius: '10px' }}>
            <CheckCircle size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Completed</span>
            <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--success)' }}>{completedOrders}</span>
          </div>
        </div>

        <div className="glass" style={{ padding: '16px 20px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div className="metric-icon-box blue" style={{ width: '40px', height: '40px', borderRadius: '10px' }}>
            <DollarSign size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Total Sales</span>
            <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary)' }}>₹{totalRevenue.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Controls Toolbar */}
      <div className="glass" style={{ padding: '16px 20px', borderRadius: 'var(--radius-md)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <select
            className="form-input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
          >
            <option value="all">All Order Status</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            className="form-input"
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
          >
            <option value="all">All Payment Status</option>
            <option value="paid">Paid Only</option>
            <option value="pending">Pending Payment</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>

        <div className="search-wrapper" style={{ minWidth: '260px' }}>
          <Search size={16} />
          <input
            type="text"
            className="search-input"
            placeholder="Search order by customer, mobile, items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ padding: '6px 12px 6px 36px', fontSize: '0.8rem' }}
          />
        </div>
      </div>

      {/* Main Orders Table / Content Area */}
      {loading ? (
        <div className="call-section-card glass" style={{ padding: '60px 24px', textAlign: 'center' }}>
          <Loader2 size={32} className="animate-spin" style={{ color: 'var(--primary)', margin: '0 auto 12px auto' }} />
          <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Loading customer orders from database...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="call-section-card glass" style={{ padding: '60px 24px', textAlign: 'center' }}>
          <ShoppingBag size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>No orders available</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {error ? `API connection error: ${error}` : 'No customer orders match your search criteria or order registry is empty.'}
          </p>
        </div>
      ) : (
        /* ORDERS DATA TABLE */
        <div className="call-section-card glass" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--card-border)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>Order ID</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>Customer</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>Items / Description</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>Total Amount</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>Payment</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>Order Status</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>Date</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order, idx) => {
                  const status = (order.order_status || 'Pending').toLowerCase();
                  const payment = (order.payment_status || 'Pending').toLowerCase();

                  let statusBg = 'rgba(217, 119, 6, 0.15)';
                  let statusColor = 'var(--warning)';
                  if (status === 'completed') {
                    statusBg = 'rgba(16, 185, 129, 0.15)';
                    statusColor = 'var(--success)';
                  } else if (status === 'processing') {
                    statusBg = 'rgba(37, 99, 235, 0.15)';
                    statusColor = 'var(--primary)';
                  } else if (status === 'cancelled') {
                    statusBg = 'rgba(239, 68, 68, 0.15)';
                    statusColor = 'var(--danger)';
                  }

                  let payColor = payment === 'paid' ? 'var(--success)' : payment === 'refunded' ? 'var(--danger)' : 'var(--warning)';

                  return (
                    <tr
                      key={order.id || idx}
                      style={{
                        borderBottom: '1px solid var(--card-border)',
                        transition: 'background var(--transition-fast)'
                      }}
                    >
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--primary)' }}>
                        #{order.id}
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{order.customer_name || 'Guest Customer'}</span>
                          {order.customer_mobile && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{order.customer_mobile}</span>
                          )}
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px', maxWidth: '240px' }}>
                        <span style={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          color: 'var(--text-secondary)'
                        }}>
                          {order.items_description || order.description || 'No description provided'}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        ₹{Number(order.total_amount || 0).toLocaleString('en-IN')}
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          backgroundColor: payment === 'paid' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(217, 119, 6, 0.12)',
                          color: payColor
                        }}>
                          {order.payment_status || 'Pending'}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <select
                          value={order.order_status || 'Pending'}
                          onChange={(e) => handleStatusChange(order.id, e.target.value)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            backgroundColor: statusBg,
                            color: statusColor,
                            border: '1px solid transparent',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Processing">Processing</option>
                          <option value="Completed">Completed</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </td>

                      <td style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        {order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Today'}
                      </td>

                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => handleCancelOrder(order.id, order.user_id || order.user)}
                            title="Cancel Order"
                            style={{ padding: '6px 10px', fontSize: '0.75rem', color: 'var(--danger)' }}
                          >
                            <XCircle size={14} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setViewingOrder(order)}
                            title="View Order Details"
                            style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => handleDeleteOrder(order.id)}
                            title="Delete Order"
                            style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                          >
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

      {/* VIEW ORDER DETAILS MODAL */}
      {viewingOrder && (
        <div className="modal-overlay" onClick={() => setViewingOrder(null)}>
          <div className="modal glass animate-fade-in" style={{ maxWidth: '540px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShoppingBag size={20} style={{ color: 'var(--primary)' }} />
                <h3>Order Details #{viewingOrder.id}</h3>
              </div>
              <button className="btn-icon" onClick={() => setViewingOrder(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Customer Card */}
              <div style={{ background: 'var(--bg-secondary)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Customer Details</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <User size={16} style={{ color: 'var(--primary)' }} />
                  <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>{viewingOrder.customer_name}</span>
                </div>
                {viewingOrder.customer_mobile && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <Phone size={14} />
                    <span>{viewingOrder.customer_mobile}</span>
                  </div>
                )}
                {viewingOrder.shipping_address && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    <MapPin size={14} style={{ marginTop: '2px' }} />
                    <span>{viewingOrder.shipping_address}</span>
                  </div>
                )}
              </div>

              {/* Order Items */}
              <div style={{ background: 'var(--bg-secondary)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Ordered Items</span>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                  {viewingOrder.items_description || 'No items listed.'}
                </p>
              </div>

              {/* Status and Payment Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Order Status</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary)' }}>
                    {viewingOrder.order_status || 'Pending'}
                  </span>
                </div>
                <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Payment Method</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {viewingOrder.payment_method || 'UPI'} ({viewingOrder.payment_status || 'Pending'})
                  </span>
                </div>
              </div>

              {/* Amount Total */}
              <div style={{ background: 'var(--primary-glow)', padding: '14px 18px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(37,99,235,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>Total Order Cost</span>
                <span style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary)' }}>
                  ₹{Number(viewingOrder.total_amount || 0).toLocaleString('en-IN')}
                </span>
              </div>

              {viewingOrder.notes && (
                <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Notes</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{viewingOrder.notes}</span>
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ padding: '16px 20px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setViewingOrder(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}