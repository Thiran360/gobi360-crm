import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

export default function App() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Check if session is persisted in localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem('aura_crm_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('aura_crm_user');
      }
    }
    setCheckingAuth(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('aura_crm_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('aura_crm_user');
  };

  if (checkingAuth) {
    return (
      <div style={{
        display: 'flex',
        minHeight: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)',
        color: 'var(--text-secondary)',
        fontFamily: 'sans-serif'
      }}>
        <div>Loading gobi360...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          user ? <Navigate to="/dashboard" replace /> : <Login onLogin={handleLogin} />
        }
      />
      <Route
        path="/dashboard"
        element={
          user ? <Dashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />
        }
      />
      <Route
        path="/calls"
        element={
          user ? <Dashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />
        }
      />
      <Route
        path="/members"
        element={
          user ? <Dashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />
        }
      />
      <Route
        path="/contacts"
        element={
          user ? <Dashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />
        }
      />
      <Route
        path="/user-contacts"
        element={
          user ? <Dashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />
        }
      />
      <Route
        path="/ecom-orders"
        element={
          user ? <Dashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />
        }
      />
      <Route
        path="/eco-orders"
        element={
          user ? <Dashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />
        }
      />
      <Route
        path="*"
        element={
          user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
        }
      />
    </Routes>
  );
}

