import React, { useState, useEffect } from 'react';
import {
  Shield,
  LayoutDashboard,
  Phone,
  LogOut,
  Search,
  PlusCircle,
  TrendingUp,
  Clock,
  CheckCircle,
  PhoneOff,
  UserCheck,
  Calendar,
  ChevronRight,
  RefreshCw,
  X,
  Users,
  BookUser,
  ShoppingCart
} from 'lucide-react';
import Members from './Members';
import UserContacts from './UserContacts';
import CallList from './CallList';
import CallDetailDrawer from './CallDetailDrawer';
import AddCallModal from './AddCallModal';
import EcomOrders from './EcomOrders';
import { fetchCallRequests, updateCallRequest } from '../services/api';

const INITIAL_CALLS = [
  {
    id: 20,
    customer: 110,
    customer_name: "Admin",
    customer_mobile: "7708805677",
    customer_email: "admin@gmail.con",
    expert: 65,
    expert_name: "Premier Rolling Shutters",
    expert_user_id: 71,
    expert_user_name: "sathish kumar",
    expert_mobile: "9443020077",
    expert_email: null,
    service: null,
    status: "answered",
    created_at: "2026-08-05T13:37:14.458007+05:30",
    notes: "Site installation checked. Sathish kumar coordinated the gate fitting parameters. Staging complete."
  },
  {
    id: 19,
    customer: 108,
    customer_name: "Gokul",
    customer_mobile: "9876543210",
    customer_email: "gokul@yakshasystems.com",
    expert: 62,
    expert_name: "Yaksha Systems",
    expert_user_id: 74,
    expert_user_name: "aravind raj",
    expert_mobile: "9123456789",
    expert_email: "aravind@yakshasystems.com",
    service: 12,
    status: "answered",
    created_at: "2026-08-05T12:55:46.124005+05:30",
    notes: "Follow-up regarding staging credentials. Developer access verified."
  },
  {
    id: 18,
    customer: 108,
    customer_name: "Gokul",
    customer_mobile: "9876543210",
    customer_email: "gokul@woodzonetiles.com",
    expert: 68,
    expert_name: "Wood Zone Tiles",
    expert_user_id: 70,
    expert_user_name: "senthil kumaran",
    expert_mobile: "9043212345",
    expert_email: null,
    service: null,
    status: "missed",
    created_at: "2026-08-05T12:10:47.854002+05:30",
    notes: "Outgoing callback about marble sizing. Gokul did not answer."
  }
];

export default function Dashboard({ user, onLogout }) {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // all, answered, missed
  const [selectedCall, setSelectedCall] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState(() => localStorage.getItem('gobi360_active_menu') || 'dashboard');
  const [approvingCallId, setApprovingCallId] = useState(null);

  useEffect(() => {
    localStorage.setItem('gobi360_active_menu', activeMenu);
  }, [activeMenu]);

  const fetchCalls = async () => {
    try {
      setLoading(true);
      setError(null);
      const callList = await fetchCallRequests();

      const formatted = callList.map(c => ({
        ...c,
        approved: c.approved !== undefined ? c.approved : false,
        notes: c.notes || 'No description notes logged for this entry.'
      }));

      // Sort by ID descending (newest first)
      formatted.sort((a, b) => b.id - a.id);
      setCalls(formatted);
    } catch (err) {
      console.error("Fetch call logs failed:", err);
      setError(err.message);
      // Fallback to initial mock data if there are no existing calls
      if (calls.length === 0) {
        setCalls(INITIAL_CALLS);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalls();
  }, []);

  // Simulated live call state
  const [liveCall, setLiveCall] = useState(null); // null or { id, customer_name, customer_mobile, etc. }

  // Timer effect for connected live call
  useEffect(() => {
    let interval = null;
    if (liveCall && liveCall.status === 'connected') {
      interval = setInterval(() => {
        setLiveCall(prev => ({
          ...prev,
          seconds: prev.seconds + 1
        }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [liveCall]);

  // Compute metrics dynamically
  const totalCalls = calls.length;
  const answeredCalls = calls.filter(c => c.status === 'answered').length;
  const missedCalls = calls.filter(c => c.status === 'missed' || c.status === 'not_answered').length;
  const answerRate = totalCalls > 0 ? Math.round((answeredCalls / totalCalls) * 100) : 0;

  // Filtered list
  const filteredCalls = calls.filter(call => {
    const matchesSearch =
      call.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      call.customer_mobile.includes(searchQuery) ||
      (call.customer_email && call.customer_email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      call.expert_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      call.expert_user_name.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeFilter === 'all') return true;
    if (activeFilter === 'answered') return call.status === 'answered';
    if (activeFilter === 'missed') return call.status === 'missed' || call.status === 'not_answered';
    return true;
  });

  // Action: Add new call
  const handleAddCall = (newCallData) => {
    const newCall = {
      id: Date.now(),
      ...newCallData
    };
    setCalls([newCall, ...calls]);
  };

  // Action: Delete call
  const handleDeleteCall = (id) => {
    setCalls(calls.filter(c => c.id !== id));
    if (selectedCall && selectedCall.id === id) {
      setSelectedCall(null);
    }
  };

  // Action: Approve call (Toggle switch toggle)
  const handleApproveCall = async (id) => {
    const call = calls.find(c => c.id === id);
    if (!call) return;

    if (call.approved) {
      // Disapprove immediately locally
      setCalls(prevCalls => prevCalls.map(c => {
        if (c.id === id) {
          return { ...c, approved: false };
        }
        return c;
      }));

      // Call API to set approved false
      try {
        const payload = {
          customer: call.customer,
          expert: call.expert,
          service: call.service,
          status: call.status,
          notes: call.notes || "",
          approved: false
        };
        console.log(`Sending disapproval PUT payload for Call #${id}:`, payload);
        await updateCallRequest(id, payload);
        console.log(`Disapproval payload successfully persisted for Call #${id}`);
      } catch (err) {
        console.error(`Failed to persist disapproval payload for Call #${id}:`, err);
      }
    } else {
      // Approve requires notes: open modal!
      setApprovingCallId(id);
    }
  };

  const handleSaveApprovalNotes = async (notesText) => {
    const id = approvingCallId;
    if (!id) return;

    // Approve locally first
    setCalls(prevCalls => prevCalls.map(c => {
      if (c.id === id) {
        return {
          ...c,
          approved: true,
          notes: notesText || c.notes
        };
      }
      return c;
    }));
    setApprovingCallId(null);

    // Call API to set approved true and save comments
    try {
      const call = calls.find(c => c.id === id);
      const payload = {
        customer: call ? call.customer : null,
        expert: call ? call.expert : null,
        service: call ? call.service : null,
        status: call ? call.status : "answered",
        notes: notesText || (call ? call.notes : ""),
        approved: true
      };
      console.log(`Sending approval PUT payload for Call #${id}:`, payload);
      await updateCallRequest(id, payload);
      console.log(`Approval payload successfully persisted for Call #${id}`);
    } catch (err) {
      console.error(`Failed to persist approval payload for Call #${id}:`, err);
    }
  };

  // Action: Initiate Simulated Call
  const handleInitiateCall = (call) => {
    setLiveCall({
      id: call.id,
      customer_name: call.customer_name,
      customer_mobile: call.customer_mobile,
      expert_name: call.expert_name,
      status: 'ringing',
      seconds: 0
    });
  };

  // Action: Accept Live Call
  const handleAcceptCall = () => {
    setLiveCall(prev => ({ ...prev, status: 'connected' }));
  };

  // Action: Hang Up / Complete Live Call
  const handleHangUp = () => {
    if (!liveCall) return;

    const formattedDuration = liveCall.status === 'connected'
      ? `${Math.floor(liveCall.seconds / 60)}m ${String(liveCall.seconds % 60).padStart(2, '0')}s`
      : '--';

    const finalStatus = liveCall.status === 'connected' ? 'answered' : 'missed';

    // Update call record status in list
    setCalls(prevCalls => prevCalls.map(c => {
      if (c.id === liveCall.id) {
        const timestamp = new Date();
        const isoString = timestamp.toISOString();

        return {
          ...c,
          status: finalStatus,
          created_at: isoString,
          notes: finalStatus === 'answered'
            ? `Successfully connected live call. Talk time: ${formattedDuration}.`
            : 'Live call was missed/unanswered.'
        };
      }
      return c;
    }));

    setLiveCall(null);
  };

  // SVG circular progress computations
  const radius = 22;
  const strokeWidth = 3.5;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * answerRate) / 100;

  return (
    <div className="dashboard-layout">
      {/* Sidebar Navigation */}
      <aside className="sidebar glass">
        <div className="sidebar-logo">
          <img src="/logo.png" alt="gobi360 Logo" className="sidebar-logo-full" style={{ maxHeight: '48px', width: 'auto' }} />
          <Shield size={24} className="sidebar-logo-collapsed" style={{ color: 'var(--primary)' }} />
        </div>

        <nav className="sidebar-menu">
          <div
            className={`menu-item ${activeMenu === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveMenu('dashboard')}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </div>

          <div
            className={`menu-item ${activeMenu === 'calls' ? 'active' : ''}`}
            onClick={() => setActiveMenu('calls')}
          >
            <Phone size={18} />
            <span>Call Management</span>
          </div>

          <div
            className={`menu-item ${activeMenu === 'members' ? 'active' : ''}`}
            onClick={() => setActiveMenu('members')}
          >
            <Users size={18} />
            <span>Members</span>
          </div>

          <div
            className={`menu-item ${activeMenu === 'user-contacts' ? 'active' : ''}`}
            onClick={() => setActiveMenu('user-contacts')}
          >
            <BookUser size={18} />
            <span>User Contact</span>
          </div>

          <div
            className={`menu-item ${activeMenu === 'eco-orders' ? 'active' : ''}`}
            onClick={() => setActiveMenu('eco-orders')}
          >
            <ShoppingCart size={18} />
            <span>Ecom Orders</span>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="avatar">
              AD
            </div>
            <div className="user-info">
              <span className="user-name">Admin</span>
              <span className="user-role">Administrator</span>
            </div>
          </div>
          <button className="btn-icon" onClick={onLogout} title="Sign Out">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="main-content">
        {/* Header */}
        <header className="dashboard-header animate-fade-in">
          <div className="header-title">
            <h1>
              {activeMenu === 'calls' ? 'Call Registry'
                : activeMenu === 'members' ? 'Members'
                  : activeMenu === 'user-contacts' ? 'User Contact'
                    : activeMenu === 'eco-orders' ? 'Ecom Orders'
                      : 'Dashboard'}
            </h1>
          </div>

          <div className="header-actions">
            <div className="search-wrapper">
              <Search size={18} />
              <input
                type="text"
                className="search-input"
                placeholder={
                  activeMenu === 'user-contacts' ? 'Search users by name or mobile...'
                    : activeMenu === 'members' ? 'Search members...'
                      : activeMenu === 'eco-orders' ? 'Search ecom orders...'
                        : 'Search customer, expert...'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={fetchCalls}
              disabled={loading}
              title="Refresh Data"
              style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </header>



        {/* Members Page */}
        {activeMenu === 'members' ? (
          <Members />
        ) : activeMenu === 'user-contacts' ? (
          <UserContacts globalSearch={searchQuery} />
        ) : activeMenu === 'eco-orders' ? (
          <EcomOrders />
        ) : activeMenu === 'calls' ? (
          <section className="call-section-card glass">
            <div className="call-section-header">
              <div className="section-header-top">
                <h2>Call Logs ({filteredCalls.length})</h2>

                <div className="filters-wrapper">
                  <button
                    className={`filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setActiveFilter('all')}
                  >
                    All
                  </button>
                  <button
                    className={`filter-btn ${activeFilter === 'answered' ? 'active' : ''}`}
                    onClick={() => setActiveFilter('answered')}
                  >
                    Answered
                  </button>
                  <button
                    className={`filter-btn ${activeFilter === 'missed' ? 'active' : ''}`}
                    onClick={() => setActiveFilter('missed')}
                  >
                    Missed
                  </button>
                </div>
              </div>
            </div>

            {loading && calls.length === 0 ? (
              <div style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <div className="animate-spin" style={{ display: 'inline-block', width: '24px', height: '24px', border: '3px solid rgba(37,99,235,0.2)', borderTopColor: 'var(--primary)', borderRadius: '50%', marginBottom: '12px' }}></div>
                <p style={{ fontSize: '0.9rem', fontWeight: 500 }}>Connecting to telemetry services...</p>
              </div>
            ) : error && calls.length === 0 ? (
              <div style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <p style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--danger)' }}>Failed to load call logs</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>{error}</p>
                <button className="btn btn-primary" onClick={fetchCalls} style={{ marginTop: '16px', padding: '6px 16px', fontSize: '0.8rem' }}>
                  Retry Connection
                </button>
              </div>
            ) : (
              <CallList
                calls={filteredCalls}
                onSelect={setSelectedCall}
                onDelete={handleDeleteCall}
                onApprove={handleApproveCall}
              />
            )}
          </section>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Metrics Grid */}
            <section className="metrics-grid">
              <div className="metric-card glass">
                <div className="metric-header">
                  <span>Total Logged Calls</span>
                  <div className="metric-icon-box purple">
                    <Phone size={18} />
                  </div>
                </div>
                <div className="metric-body">
                  <h3>{totalCalls}</h3>
                  <span className="metric-change positive">
                    <TrendingUp size={12} />
                    <span>+12.5% this week</span>
                  </span>
                </div>
              </div>

              <div className="metric-card glass">
                <div className="metric-header">
                  <span>Answered Conversations</span>
                  <div className="metric-icon-box green">
                    <CheckCircle size={18} />
                  </div>
                </div>
                <div className="metric-body">
                  <h3>{answeredCalls}</h3>
                  <span className="metric-change positive">
                    <UserCheck size={12} />
                    <span>Active engagement</span>
                  </span>
                </div>
              </div>

              <div className="metric-card glass">
                <div className="metric-header">
                  <span>Missed Calls</span>
                  <div className="metric-icon-box amber">
                    <PhoneOff size={18} />
                  </div>
                </div>
                <div className="metric-body">
                  <h3>{missedCalls}</h3>
                  <span className="metric-change negative">
                    <PhoneOff size={12} />
                    <span>Action pending</span>
                  </span>
                </div>
              </div>

              <div className="metric-card glass" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="metric-header" style={{ marginBottom: 0 }}>
                    <span>Call Answer Rate</span>
                  </div>
                  <div className="metric-body">
                    <h3>{answerRate}%</h3>
                    <span className="metric-change positive">
                      <span>Optimized flow</span>
                    </span>
                  </div>
                </div>

                {/* Circular Progress Gauge */}
                <div style={{ position: 'relative', width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="56" height="56" viewBox="0 0 56 56" style={{ transform: 'rotate(-90deg)' }}>
                    <circle
                      cx="28"
                      cy="28"
                      r={radius}
                      fill="none"
                      stroke="rgba(37, 99, 235, 0.05)"
                      strokeWidth={strokeWidth}
                    />
                    <circle
                      cx="28"
                      cy="28"
                      r={radius}
                      fill="none"
                      stroke="var(--primary)"
                      strokeWidth={strokeWidth}
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                    />
                  </svg>
                  <div style={{ position: 'absolute', fontSize: '0.7rem', fontWeight: 700, color: 'var(--primary)' }}>
                    {answerRate}%
                  </div>
                </div>
              </div>
            </section>

            {/* Call Traffic Area Trend Chart */}
            <div className="call-section-card glass animate-fade-in" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--card-border)', paddingBottom: '14px' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Client Communication Flow</h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Daily logged call frequencies & answered connections</span>
                </div>
                <div className="badge badge-completed" style={{ fontSize: '0.75rem' }}>
                  <TrendingUp size={12} />
                  <span>Interactive Telephony Live</span>
                </div>
              </div>

              {/* SVG Area Chart */}
              <div style={{ width: '100%', height: '180px', position: 'relative', marginTop: '10px' }}>
                <svg viewBox="0 0 800 180" width="100%" height="100%" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="chart-glow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Gridlines */}
                  <line x1="0" y1="20" x2="800" y2="20" stroke="rgba(15, 23, 42, 0.03)" strokeWidth="1" />
                  <line x1="0" y1="65" x2="800" y2="65" stroke="rgba(15, 23, 42, 0.03)" strokeWidth="1" />
                  <line x1="0" y1="110" x2="800" y2="110" stroke="rgba(15, 23, 42, 0.03)" strokeWidth="1" />
                  <line x1="0" y1="150" x2="800" y2="150" stroke="rgba(15, 23, 42, 0.03)" strokeWidth="1" />

                  {/* Trend Area */}
                  <path d="M 50 150 L 50 120 Q 150 90 250 130 T 450 60 T 650 100 T 750 40 L 750 150 Z" fill="url(#chart-glow)" />
                  {/* Trend Line */}
                  <path d="M 50 120 Q 150 90 250 130 T 450 60 T 650 100 T 750 40" fill="none" stroke="var(--primary)" strokeWidth="3.5" strokeLinecap="round" />

                  {/* Interaction nodes */}
                  <circle cx="50" cy="120" r="5" fill="var(--bg-secondary)" stroke="var(--primary)" strokeWidth="3" />
                  <circle cx="250" cy="130" r="5" fill="var(--bg-secondary)" stroke="var(--primary)" strokeWidth="3" />
                  <circle cx="450" cy="60" r="5" fill="var(--bg-secondary)" stroke="var(--primary)" strokeWidth="3" />
                  <circle cx="650" cy="100" r="5" fill="var(--bg-secondary)" stroke="var(--primary)" strokeWidth="3" />
                  <circle cx="750" cy="40" r="5" fill="var(--bg-secondary)" stroke="var(--primary)" strokeWidth="3" />
                </svg>
                {/* Day Labels */}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 40px', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                  <span>Monday</span>
                  <span>Tuesday</span>
                  <span>Wednesday</span>
                  <span>Thursday</span>
                  <span>Friday</span>
                  <span>Saturday</span>
                  <span>Sunday</span>
                </div>
              </div>
            </div>

            {/* Split Grid for Lists */}
            <div className="overview-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>

              {/* Recent Activity Card */}
              <div className="call-section-card glass" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ borderBottom: '1px solid var(--card-border)', paddingBottom: '14px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Recent Activities</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', maxHeight: '350px' }}>
                  {calls.map(call => (
                    <div
                      key={call.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'var(--bg-secondary)',
                        padding: '12px 16px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--card-border)',
                        transition: 'all var(--transition-fast)'
                      }}
                    >
                      <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                        {/* Glowing Indicator Dot */}
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: call.status === 'answered' ? 'var(--success)' : 'var(--danger)',
                            display: 'block'
                          }}></span>
                          <span style={{
                            position: 'absolute',
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            border: `2px solid ${call.status === 'answered' ? 'var(--success)' : 'var(--danger)'}`,
                            opacity: 0.15,
                            display: 'block'
                          }}></span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{call.customer_name}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{call.expert_name}</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          color: call.status === 'answered' ? 'var(--success)' : 'var(--danger)',
                          textTransform: 'uppercase'
                        }}>
                          {call.status}
                        </span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                          {new Date(call.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pending Missed Calls Checklist */}
              <div className="call-section-card glass" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ borderBottom: '1px solid var(--card-border)', paddingBottom: '14px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Pending Action Items</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', maxHeight: '350px' }}>
                  {calls.filter(c => c.status === 'missed' || c.status === 'not_answered').length > 0 ? (
                    calls.filter(c => c.status === 'missed' || c.status === 'not_answered').map(call => (
                      <div
                        key={call.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: 'var(--bg-secondary)',
                          padding: '12px 16px',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--card-border)'
                        }}
                      >
                        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                          <div className="contact-avatar" style={{ width: '32px', height: '32px', fontSize: '0.75rem' }}>
                            {call.customer_name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{call.customer_name}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{call.customer_mobile}</span>
                          </div>
                        </div>
                        <button
                          className="btn btn-primary"
                          style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: 'var(--radius-sm)' }}
                          onClick={() => handleInitiateCall(call)}
                        >
                          <Phone size={12} />
                          <span>Call Back</span>
                        </button>
                      </div>
                    ))
                  ) : (
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center', padding: '40px 0' }}>
                      All clear! No pending missed calls.
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}
      </main>

      {/* Sliding Call Details Drawer */}
      {selectedCall && (
        <CallDetailDrawer
          call={selectedCall}
          onClose={() => setSelectedCall(null)}
          onInitiateCall={handleInitiateCall}
        />
      )}

      {/* Add Call Overlay Modal */}
      {isAddModalOpen && (
        <AddCallModal
          onClose={() => setIsAddModalOpen(false)}
          onAdd={handleAddCall}
        />
      )}

      {/* Simulated Live Call Banner */}
      {liveCall && (
        <div className="calling-banner glass" style={{
          backgroundColor: liveCall.status === 'connected' ? 'rgba(5, 150, 105, 0.15)' : 'rgba(217, 119, 6, 0.15)'
        }}>
          <div className="calling-avatar-box">
            <div className="calling-avatar">
              {liveCall.customer_name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="calling-pulse"></div>
            {liveCall.status === 'ringing' && <div className="calling-pulse-2"></div>}
          </div>

          <div className="calling-details">
            <div className="calling-status" style={{ color: liveCall.status === 'connected' ? 'var(--success)' : 'var(--warning)' }}>
              {liveCall.status === 'ringing' ? 'Ringing...' : 'Connected'}
            </div>
            <div className="calling-name">{liveCall.customer_name}</div>
            <div className="calling-phone">
              {liveCall.status === 'ringing' ? liveCall.customer_mobile : `Talk: ${Math.floor(liveCall.seconds / 60)}m ${String(liveCall.seconds % 60).padStart(2, '0')}s`}
            </div>
          </div>

          <div className="calling-actions">
            <button
              className="btn-call-action btn-decline"
              onClick={handleHangUp}
              title="Decline/End Call"
            >
              <PhoneOff size={18} />
            </button>

            {liveCall.status === 'ringing' && (
              <button
                className="btn-call-action btn-accept"
                onClick={handleAcceptCall}
                title="Answer Call"
              >
                <Phone size={18} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Approval Notes Modal */}
      {approvingCallId !== null && (
        <div className="modal-overlay" onClick={() => setApprovingCallId(null)}>
          <div className="modal glass" style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Approve Call Entry</h3>
              <button className="btn-icon" onClick={() => setApprovingCallId(null)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const notesText = e.target.elements.approvalNotes.value;
              handleSaveApprovalNotes(notesText);
            }}>
              <div className="modal-body" style={{ padding: '24px 20px' }}>
                <div className="form-group">
                  <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                    Add Approval Notes / Comments
                  </label>
                  <textarea
                    name="approvalNotes"
                    className="form-input"
                    rows="4"
                    placeholder="Provide details about the resolution or call notes..."
                    style={{ resize: 'vertical', minHeight: '100px' }}
                    autoFocus
                  />
                </div>
              </div>
              <div className="modal-footer" style={{ padding: '16px 20px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setApprovingCallId(null)}
                  style={{ padding: '8px 16px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: '8px 16px', background: '#10b981', borderColor: '#10b981', boxShadow: 'none' }}
                >
                  Approve Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
