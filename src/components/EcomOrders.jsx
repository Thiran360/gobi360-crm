import React from 'react';
import { ShoppingCart } from 'lucide-react';

export default function EcomOrders() {
  return (
    <section className="call-section-card glass" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ borderBottom: '1px solid var(--card-border)', paddingBottom: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div className="metric-icon-box green">
          <ShoppingCart size={24} />
        </div>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Ecom Orders</h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Manage all ecom-friendly product orders and tracking.</span>
        </div>
      </div>
      
      <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
        <p>No ecom orders found. New orders will appear here.</p>
      </div>
    </section>
  );
}
