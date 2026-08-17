import React, { useState } from 'react';
import { Shield, Phone, Lock, AlertCircle } from 'lucide-react';

export default function Login({ onLogin }) {
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!mobile || !password) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);

    // Simulate network delay
    setTimeout(() => {
      // Mock validation
      if (mobile === '7708805630' && password === '7708805630') {
        onLogin({
          name: 'Admin',
          email: 'admin@crm.com',
          role: 'Administrator'
        });
      } else {
        setError('Invalid credentials. Use Mobile: 7708805630 & Password: 7708805630');
        setIsLoading(false);
      }
    }, 1200);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-logo" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
          <img src="/logo.png" alt="gobi360 Logo" style={{ maxWidth: '220px', height: 'auto', display: 'block', margin: '0 auto' }} />
        </div>

        {error && (
          <div className="login-error">
            <AlertCircle size={16} style={{ marginRight: '8px', verticalAlign: 'middle', display: 'inline' }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="mobile">Mobile Number</label>
            <div style={{ position: 'relative' }}>
              <Phone size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                id="mobile"
                type="tel"
                className="form-input"
                placeholder="Enter Mobile Number"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                style={{ paddingLeft: '42px' }}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                id="password"
                type="password"
                className="form-input"
                placeholder="Enter Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '42px' }}
                disabled={isLoading}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ marginTop: '12px', width: '100%', height: '48px', justifyContent: 'center', gap: '8px' }}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="btn-loader">Connecting...</span>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
