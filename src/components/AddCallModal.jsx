import React, { useState } from 'react';
import { X } from 'lucide-react';

export default function AddCallModal({ onClose, onAdd }) {
  const [formData, setFormData] = useState({
    customer: 110,
    customer_name: '',
    customer_mobile: '',
    customer_email: '',
    expert: 65,
    expert_name: '',
    expert_user_id: 71,
    expert_user_name: '',
    expert_mobile: '',
    expert_email: '',
    service: '',
    status: 'answered',
    notes: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.customer_name || !formData.expert_name) {
      alert('Please fill out Customer Name and Expert Name.');
      return;
    }

    const timestamp = new Date();
    const isoString = timestamp.toISOString();

    onAdd({
      ...formData,
      customer: Number(formData.customer),
      expert: Number(formData.expert),
      expert_user_id: Number(formData.expert_user_id),
      service: formData.service !== '' ? Number(formData.service) : null,
      expert_email: formData.expert_email || null,
      created_at: isoString
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal glass" style={{ maxWidth: '650px' }} onClick={(e) => e.stopPropagation()}>
        
        {/* Modal Header */}
        <div className="modal-header">
          <h3>Log Backend Response Record</h3>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ maxHeight: '65vh' }}>
            
            {/* Customer Details section */}
            <div style={{ borderBottom: '1px solid var(--card-border)', paddingBottom: '10px', marginBottom: '16px' }}>
              <h4 style={{ fontSize: '0.85rem', color: 'var(--primary)', textTransform: 'uppercase' }}>Customer Credentials</h4>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Customer Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input
                  type="text"
                  name="customer_name"
                  className="form-input"
                  placeholder="e.g. Admin"
                  value={formData.customer_name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Customer ID</label>
                <input
                  type="number"
                  name="customer"
                  className="form-input"
                  value={formData.customer}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Customer Mobile</label>
                <input
                  type="text"
                  name="customer_mobile"
                  className="form-input"
                  placeholder="e.g. 7708805677"
                  value={formData.customer_mobile}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Customer Email</label>
                <input
                  type="email"
                  name="customer_email"
                  className="form-input"
                  placeholder="e.g. admin@gmail.com"
                  value={formData.customer_email}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Expert Details section */}
            <div style={{ borderBottom: '1px solid var(--card-border)', paddingBottom: '10px', marginBottom: '16px', marginTop: '16px' }}>
              <h4 style={{ fontSize: '0.85rem', color: 'var(--primary)', textTransform: 'uppercase' }}>Expert Coordinates</h4>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Expert Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input
                  type="text"
                  name="expert_name"
                  className="form-input"
                  placeholder="e.g. Premier Rolling Shutters"
                  value={formData.expert_name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Expert ID</label>
                <input
                  type="number"
                  name="expert"
                  className="form-input"
                  value={formData.expert}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Expert User Name</label>
                <input
                  type="text"
                  name="expert_user_name"
                  className="form-input"
                  placeholder="e.g. sathish kumar"
                  value={formData.expert_user_name}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Expert User ID</label>
                <input
                  type="number"
                  name="expert_user_id"
                  className="form-input"
                  value={formData.expert_user_id}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Expert Mobile</label>
                <input
                  type="text"
                  name="expert_mobile"
                  className="form-input"
                  placeholder="e.g. 9443020077"
                  value={formData.expert_mobile}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Expert Email</label>
                <input
                  type="email"
                  name="expert_email"
                  className="form-input"
                  placeholder="e.g. expert@gmail.com"
                  value={formData.expert_email}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Service & status section */}
            <div style={{ borderBottom: '1px solid var(--card-border)', paddingBottom: '10px', marginBottom: '16px', marginTop: '16px' }}>
              <h4 style={{ fontSize: '0.85rem', color: 'var(--primary)', textTransform: 'uppercase' }}>Service & Status</h4>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Service ID</label>
                <input
                  type="number"
                  name="service"
                  className="form-input"
                  placeholder="e.g. 12 (or leave empty)"
                  value={formData.service}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Call Status</label>
                <select
                  name="status"
                  className="form-input"
                  value={formData.status}
                  onChange={handleChange}
                  style={{ cursor: 'pointer' }}
                >
                  <option value="answered">Answered</option>
                  <option value="missed">Missed</option>
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '12px' }}>
              <label>Discussion Summary</label>
              <textarea
                name="notes"
                className="form-input"
                rows="3"
                placeholder="Log discuss summaries and actions..."
                value={formData.notes}
                onChange={handleChange}
                style={{ resize: 'vertical' }}
              />
            </div>

          </div>

          {/* Modal Footer */}
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Entry
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
