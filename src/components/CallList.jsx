import React from 'react';
import { Eye, Trash2, CheckCircle2, ShieldAlert } from 'lucide-react';

export default function CallList({ calls, onSelect, onDelete, onApprove }) {
  
  const getStatusBadge = (status) => {
    switch (status.toLowerCase()) {
      case 'answered':
        return (
          <span className="badge badge-completed" style={{ textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.7rem', padding: '3px 8px' }}>
            <CheckCircle2 size={10} style={{ marginRight: '4px' }} />
            <span>answered</span>
          </span>
        );
      case 'missed':
      default:
        return (
          <span className="badge badge-busy" style={{ textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.7rem', padding: '3px 8px' }}>
            <ShieldAlert size={10} style={{ marginRight: '4px' }} />
            <span>missed</span>
          </span>
        );
    }
  };

  const formatDateTime = (isoString) => {
    try {
      const date = new Date(isoString);
      const dateStr = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric'
      });
      const timeStr = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
      return { dateStr, timeStr };
    } catch (e) {
      return { dateStr: isoString, timeStr: '' };
    }
  };

  if (calls.length === 0) {
    return (
      <div style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <p style={{ fontSize: '1rem', fontWeight: 500 }}>No call logs match your query.</p>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '6px' }}>Try adjusting your filters or search query.</p>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="call-table">
        <thead>
          <tr>
            <th style={{ width: '120px' }}>Service ID</th>
            <th>Customer</th>
            <th>Expert</th>
            <th>Mobile Number</th>
            <th>Created At</th>
            <th style={{ width: '130px' }}>Status</th>
            <th style={{ width: '120px' }}>Approval</th>
            <th style={{ textAlign: 'right', width: '100px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {calls.map((call) => {
            const { dateStr, timeStr } = formatDateTime(call.created_at);
            return (
              <tr key={call.id}>
                <td>
                  <span style={{ fontWeight: 600, color: call.service ? 'var(--text-primary)' : 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                    {call.service !== null && call.service !== undefined ? `#${call.service}` : 'N/A'}
                  </span>
                </td>
                <td>
                  <div className="contact-cell">
                    <div className="contact-avatar">
                      {call.customer_name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="contact-details">
                      <span className="contact-name">{call.customer_name}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <span style={{ fontWeight: 600 }}>{call.expert_name}</span>
                </td>
                <td>
                  <span style={{ fontSize: '0.85rem', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                    {call.customer_mobile || 'N/A'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{dateStr}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{timeStr}</span>
                  </div>
                </td>
                <td>
                  {getStatusBadge(call.status)}
                </td>
                <td>
                  {/* Custom Toggle Switch */}
                  <div style={{ display: 'flex', alignItems: 'center', height: '24px' }}>
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        onApprove(call.id);
                      }}
                      style={{
                        width: '42px',
                        height: '22px',
                        backgroundColor: call.approved ? '#10b981' : '#cbd5e1',
                        borderRadius: '11px',
                        padding: '2px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        transition: 'all 0.3s ease',
                        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)'
                      }}
                    >
                      <div 
                        style={{
                          width: '18px',
                          height: '18px',
                          backgroundColor: '#ffffff',
                          borderRadius: '50%',
                          transform: call.approved ? 'translateX(20px)' : 'translateX(0)',
                          transition: 'all 0.3s cubic-bezier(0.2, 0.85, 0.32, 1.2)',
                          boxShadow: '0 1px 3px rgba(15,23,42,0.15)'
                        }}
                      />
                    </div>
                  </div>
                </td>
                <td>
                  <div className="actions-cell" style={{ justifyContent: 'flex-end' }}>
                    <button 
                      className="btn-icon" 
                      onClick={() => onSelect(call)}
                      title="View Full Details"
                    >
                      <Eye size={16} />
                    </button>
                    <button 
                      className="btn-icon" 
                      onClick={() => onDelete(call.id)}
                      title="Delete Record"
                      style={{ color: 'var(--danger)' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
