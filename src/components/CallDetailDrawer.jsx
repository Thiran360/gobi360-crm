import React from 'react';
import { X, User, Phone, Briefcase, Calendar, CheckCircle2, ShieldAlert } from 'lucide-react';

export default function CallDetailDrawer({ call, onClose }) {
  const handleDrawerClick = (e) => {
    e.stopPropagation();
  };

  const getStatusBadge = (status) => {
    switch (status.toLowerCase()) {
      case 'answered':
        return (
          <span className="badge badge-completed" style={{ textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.7rem', padding: '4px 10px' }}>
            <CheckCircle2 size={10} style={{ marginRight: '4px' }} />
            <span>answered</span>
          </span>
        );
      case 'missed':
      case 'not_answered':
      default:
        return (
          <span className="badge badge-busy" style={{ textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.7rem', padding: '4px 10px' }}>
            <ShieldAlert size={10} style={{ marginRight: '4px' }} />
            <span>not answered</span>
          </span>
        );
    }
  };

  const formatDateTime = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString('en-US');
    } catch (e) {
      return isoString;
    }
  };

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer" onClick={handleDrawerClick} style={{ maxWidth: '420px' }}>
        
        {/* Drawer Header */}
        <div className="drawer-header" style={{ padding: '24px 30px', borderBottom: '1.5px solid var(--card-border)' }}>
          <div className="drawer-title-area">
            <span style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Registry Details
            </span>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '2px' }}>Call Record Details</h2>
          </div>
          <button className="btn-icon" onClick={onClose} title="Close Panel" style={{ padding: '4px' }}>
            <X size={18} />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="drawer-body" style={{ padding: '24px 30px', gap: '20px' }}>
          
          {/* Key Details Card */}
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1.5px solid var(--card-border)',
            borderRadius: 'var(--radius-md)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            boxShadow: '0 4px 12px rgba(15,23,42,0.01)'
          }}>
            {/* Service ID */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(37,99,235,0.06)', paddingBottom: '10px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <Briefcase size={14} style={{ color: 'var(--primary)' }} />
                <span>Service ID</span>
              </span>
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                {call.service !== null && call.service !== undefined ? `#${call.service}` : 'N/A'}
              </span>
            </div>

            {/* Customer Name */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(37,99,235,0.06)', paddingBottom: '10px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <User size={14} style={{ color: 'var(--primary)' }} />
                <span>Customer</span>
              </span>
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{call.customer_name}</span>
            </div>

            {/* Mobile Number */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(37,99,235,0.06)', paddingBottom: '10px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <Phone size={14} style={{ color: 'var(--primary)' }} />
                <span>Mobile Number</span>
              </span>
              <span style={{ fontWeight: 600, fontSize: '0.9rem', fontVariantNumeric: 'tabular-nums' }}>
                {call.customer_mobile || 'N/A'}
              </span>
            </div>

            {/* Expert Name */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(37,99,235,0.06)', paddingBottom: '10px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <User size={14} style={{ color: 'var(--primary)' }} />
                <span>Expert</span>
              </span>
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{call.expert_name}</span>
            </div>

            {/* Created At */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(37,99,235,0.06)', paddingBottom: '10px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <Calendar size={14} style={{ color: 'var(--primary)' }} />
                <span>Created At</span>
              </span>
              <span style={{ fontWeight: 500, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                {formatDateTime(call.created_at)}
              </span>
            </div>

            {/* Status */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(37,99,235,0.06)', paddingBottom: '10px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Status</span>
              <span>{getStatusBadge(call.status)}</span>
            </div>

            {/* Approval State */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Approval State</span>
              {call.approved ? (
                <span style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  fontSize: '0.65rem', 
                  color: '#047857', 
                  fontWeight: 700,
                  background: 'rgba(16, 185, 129, 0.08)',
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  ✓ Approved
                </span>
              ) : (
                <span style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  fontSize: '0.65rem', 
                  color: 'var(--text-secondary)', 
                  fontWeight: 700,
                  background: 'var(--bg-tertiary)',
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--card-border)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Pending
                </span>
              )}
            </div>
          </div>

          {/* Notes Card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Discussion Notes
            </span>
            <div style={{ 
              background: 'var(--bg-tertiary)', 
              padding: '16px', 
              borderRadius: 'var(--radius-md)', 
              border: '1.5px solid var(--card-border)',
              fontSize: '0.85rem',
              lineHeight: '1.6',
              color: 'var(--text-primary)'
            }}>
              {call.notes || 'No description notes logged for this entry.'}
            </div>
          </div>

        </div>

        {/* Drawer Footer */}
        <div className="drawer-footer" style={{ padding: '20px 30px', borderTop: '1.5px solid var(--card-border)', background: 'var(--bg-secondary)' }}>
          <button 
            className="btn btn-secondary" 
            style={{ width: '100%', padding: '10px', fontSize: '0.85rem', fontWeight: 600 }} 
            onClick={onClose}
          >
            Close Details
          </button>
        </div>

      </div>
    </div>
  );
}
