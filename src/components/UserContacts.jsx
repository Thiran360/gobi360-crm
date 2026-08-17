import React, { useState, useEffect, useCallback } from 'react';
import {
  BookUser, Search, Phone, PhoneCall, X,
  AlertCircle, User, RefreshCw, Users,
  Store, Wrench, Truck, ChevronRight, Loader2, Mail
} from 'lucide-react';

/* ─── Role Config ─── */
const ROLES = [
  { value: 'customer', label: 'Customer', icon: User, color: '#2563eb', gradient: 'linear-gradient(135deg,#2563eb,#1d4ed8)', bg: 'rgba(37,99,235,0.10)' },
  { value: 'expert', label: 'Expert', icon: Wrench, color: '#059669', gradient: 'linear-gradient(135deg,#059669,#047857)', bg: 'rgba(5,150,105,0.10)' },
  { value: 'shopkeeper', label: 'Shopkeeper', icon: Store, color: '#d97706', gradient: 'linear-gradient(135deg,#d97706,#b45309)', bg: 'rgba(217,119,6,0.10)' },
  { value: 'deliveryman', label: 'Delivery Man', icon: Truck, color: '#7c3aed', gradient: 'linear-gradient(135deg,#7c3aed,#6d28d9)', bg: 'rgba(124,58,237,0.10)' },
];

/* ─── API Helpers ─── */
async function loadUsers(role) {
  const res = await fetch(`/api/gobi360/users/role/${role}/`, { cache: 'no-store' });
  if (res.status === 400 || res.status === 404) return [];
  if (!res.ok) throw new Error(`Server error ${res.status}`);
  const json = await res.json();
  return Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
}

async function loadContacts(mobile) {
  const res = await fetch(`/api/gobi360/contacts/${mobile}/`, { cache: 'no-store' });
  if (res.status === 400 || res.status === 404) return [];
  if (!res.ok) throw new Error(`Server error ${res.status}`);
  const json = await res.json();
  if (json.data && Array.isArray(json.data.contacts)) {
    return json.data.contacts;
  }
  return Array.isArray(json.contacts) ? json.contacts
    : Array.isArray(json.data) ? json.data
      : Array.isArray(json) ? json : [];
}

const getInitials = (name) =>
  (name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

/* ─── Main Component ─── */
/* ─── Highlight matching text ─── */
function Highlight({ text, query }) {
  if (!query || !text) return <span>{text}</span>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <span>{text}</span>;
  return (
    <span>
      {text.slice(0, idx)}
      <mark style={{ background: 'rgba(37,99,235,0.18)', color: 'var(--primary)', borderRadius: 3, padding: '0 2px' }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </span>
  );
}

export default function UserContacts({ globalSearch = '' }) {
  const [activeRole, setActiveRole] = useState('customer');
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState(null);
  const [userSearch, setUserSearch] = useState('');

  const [selectedUser, setSelectedUser] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactsError, setContactsError] = useState(null);
  const [contactSearch, setContactSearch] = useState('');

  const role = ROLES.find(r => r.value === activeRole);

  /* Fetch Users when role changes */
  const fetchUsers = useCallback(async (r) => {
    setUsersLoading(true);
    setUsersError(null);
    setUsers([]);
    setSelectedUser(null);
    setContacts([]);
    setUserSearch('');
    try {
      const list = await loadUsers(r);
      setUsers(list);
    } catch (e) {
      setUsersError(e.message);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(activeRole); }, [activeRole, fetchUsers]);

  /* Fetch Contacts when user selected */
  const handleSelectUser = useCallback(async (user) => {
    setSelectedUser(user);
    setContacts([]);
    setContactsError(null);
    setContactSearch('');
    if (!user?.mobile) return;
    setContactsLoading(true);
    try {
      const list = await loadContacts(user.mobile);
      setContacts(list);
    } catch (e) {
      setContactsError(e.message);
    } finally {
      setContactsLoading(false);
    }
  }, []);

  /* Auto-refresh (poll) contacts every 5 seconds */
  useEffect(() => {
    if (!selectedUser?.mobile) return;
    const interval = setInterval(async () => {
      try {
        const list = await loadContacts(selectedUser.mobile);
        // Only update state if data changed to avoid re-renders (basic check)
        setContacts(prev => {
          if (prev.length === list.length) return prev; // Optional: could deep compare, but length is a good start
          return list;
        });
      } catch (e) {
        console.error("Auto-refresh failed:", e);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedUser]);

  // Merge global header search + local panel search
  const effectiveSearch = globalSearch.trim() || userSearch;

  const filteredUsers = users.filter(u => {
    const q = effectiveSearch.toLowerCase();
    if (!q) return true;
    return (
      (u.full_name || '').toLowerCase().includes(q) ||
      (u.mobile || '').includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    );
  });

  const filteredContacts = contacts.filter(c => {
    const q = contactSearch.toLowerCase();
    const name = (c.name || c.contact_name || '').toLowerCase();
    const phone = (c.mobile || c.contact_mobile || c.phone || '');
    return name.includes(q) || phone.includes(q);
  });

  const getName = (c) => c.name || c.contact_name || 'Unknown';
  const getMobile = (c) => c.mobile || c.contact_mobile || c.phone || '—';

  return (
    <section className="uc2-page">

      {/* ── Role Tabs ── */}
      <div className="uc2-role-tabs">
        {ROLES.map(r => (
          <button
            key={r.value}
            className={`uc2-role-tab ${activeRole === r.value ? 'uc2-role-tab-active' : ''}`}
            style={activeRole === r.value
              ? { background: r.bg, borderColor: r.color, color: r.color }
              : {}}
            onClick={() => setActiveRole(r.value)}
          >
            <span
              className="uc2-role-tab-dot"
              style={{ background: activeRole === r.value ? r.gradient : 'var(--bg-tertiary)' }}
            >
              <r.icon size={14} color={activeRole === r.value ? '#fff' : 'var(--text-muted)'} />
            </span>
            <span>{r.label}</span>
            {activeRole === r.value && !usersLoading && (
              <span className="uc2-role-count" style={{ background: r.color }}>
                {filteredUsers.length}{effectiveSearch ? ` / ${users.length}` : ''}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Split Panel ── */}
      <div className="uc2-split">

        {/* LEFT: User List */}
        <div className="uc2-left glass">
          <div className="uc2-left-header">
            <div className="uc2-left-title">
              <role.icon size={16} style={{ color: role.color }} />
              <span>{role.label}s</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {effectiveSearch && (
                <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 600, background: 'rgba(37,99,235,0.1)', padding: '2px 8px', borderRadius: 50 }}>
                  {filteredUsers.length} match{filteredUsers.length !== 1 ? 'es' : ''}
                </span>
              )}
              <button
                className="uc2-refresh"
                onClick={() => fetchUsers(activeRole)}
                disabled={usersLoading}
                title="Refresh"
              >
                <RefreshCw size={14} style={{ animation: usersLoading ? 'mp-spin 0.8s linear infinite' : 'none' }} />
              </button>
            </div>
          </div>

          {/* Local User Search — only show if no global search active */}
          {!globalSearch && (
            <div className="uc2-usearch-wrap">
              <Search size={14} className="uc2-usearch-icon" />
              <input
                className="uc2-usearch"
                type="text"
                placeholder={`Search ${role.label.toLowerCase()}s…`}
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
              />
              {userSearch && (
                <button className="uc2-search-clear" onClick={() => setUserSearch('')}>
                  <X size={12} />
                </button>
              )}
            </div>
          )}

          {/* User List Body */}
          <div className="uc2-user-list">
            {usersLoading ? (
              <div className="uc2-state-sm">
                <div className="uc2-spinner" style={{ borderTopColor: role.color }} />
                <p>Loading {role.label}s…</p>
              </div>
            ) : usersError ? (
              <div className="uc2-state-sm">
                <AlertCircle size={22} color="#dc2626" />
                <p style={{ color: '#dc2626', fontSize: '0.82rem' }}>Failed to load</p>
                <button className="uc2-retry-sm" onClick={() => fetchUsers(activeRole)}>Retry</button>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="uc2-state-sm">
                <Users size={28} style={{ color: 'var(--text-muted)' }} />
                <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {effectiveSearch ? `No match for "${effectiveSearch}"` : `No ${role.label}s found`}
                </p>
                {effectiveSearch && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Try a different name or mobile number
                  </p>
                )}
              </div>
            ) : (
              filteredUsers.map((u, idx) => {
                const isActive = selectedUser?.id === u.id;
                return (
                  <button
                    key={u.id ?? idx}
                    className={`uc2-user-item ${isActive ? 'uc2-user-item-active' : ''}`}
                    style={isActive ? { borderColor: role.color, background: role.bg } : {}}
                    onClick={() => handleSelectUser(u)}
                  >
                    <div
                      className="uc2-user-avatar"
                      style={{ background: isActive ? role.gradient : 'var(--bg-tertiary)', color: isActive ? '#fff' : 'var(--text-secondary)' }}
                    >
                      {getInitials(u.full_name)}
                    </div>
                    <div className="uc2-user-info">
                      <span className="uc2-user-name">
                        <Highlight text={u.full_name || '—'} query={effectiveSearch} />
                      </span>
                      <span className="uc2-user-mobile">
                        <Phone size={11} />
                        <Highlight text={u.mobile || '—'} query={effectiveSearch} />
                      </span>
                    </div>
                    <ChevronRight
                      size={15}
                      style={{ color: isActive ? role.color : 'var(--text-muted)', flexShrink: 0 }}
                    />
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT: Contacts Panel */}
        <div className="uc2-right glass">
          {!selectedUser ? (
            /* Idle - no user selected */
            <div className="uc2-idle-state">
              <div className="uc2-idle-icon">
                <BookUser size={36} style={{ color: role.color }} />
              </div>
              <p className="uc2-idle-title">Select a {role.label}</p>
              <p className="uc2-idle-sub">
                Choose a {role.label.toLowerCase()} from the left panel to view their saved contacts.
              </p>
            </div>
          ) : (
            <>
              {/* Selected user info header */}
              <div className="uc2-right-header">
                <div className="uc2-selected-user">
                  <div className="uc2-selected-avatar" style={{ background: role.gradient }}>
                    {getInitials(selectedUser.full_name)}
                  </div>
                  <div className="uc2-selected-info">
                    <span className="uc2-selected-name">{selectedUser.full_name}</span>
                    <span className="uc2-selected-meta">
                      <Phone size={12} />{selectedUser.mobile}
                      {selectedUser.email && <><Mail size={12} style={{ marginLeft: 8 }} />{selectedUser.email}</>}
                    </span>
                  </div>
                </div>
                <div className="uc2-right-actions">
                  <span className="uc2-contacts-count" style={{ background: role.bg, color: role.color }}>
                    <BookUser size={13} />
                    {contactsLoading ? '…' : `${contacts.length} Contacts`}
                  </span>
                  <button
                    className="uc2-refresh"
                    onClick={() => handleSelectUser(selectedUser)}
                    disabled={contactsLoading}
                    title="Refresh contacts"
                  >
                    <RefreshCw size={14} style={{ animation: contactsLoading ? 'mp-spin 0.8s linear infinite' : 'none' }} />
                  </button>
                </div>
              </div>

              {/* Contact Search */}
              {contacts.length > 0 && (
                <div className="uc2-csearch-wrap">
                  <Search size={14} className="uc2-usearch-icon" />
                  <input
                    className="uc2-usearch"
                    type="text"
                    placeholder="Search contacts by name or phone…"
                    value={contactSearch}
                    onChange={e => setContactSearch(e.target.value)}
                  />
                  {contactSearch && (
                    <button className="uc2-search-clear" onClick={() => setContactSearch('')}>
                      <X size={12} />
                    </button>
                  )}
                </div>
              )}

              {/* Contacts Body */}
              <div className="uc2-contacts-body">
                {contactsLoading ? (
                  <div className="uc2-state-sm">
                    <div className="uc2-spinner" style={{ borderTopColor: role.color }} />
                    <p>Fetching contacts…</p>
                  </div>
                ) : contactsError ? (
                  <div className="uc2-state-sm">
                    <AlertCircle size={24} color="#dc2626" />
                    <p style={{ color: '#dc2626', fontSize: '0.83rem' }}>Failed to load contacts</p>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{contactsError}</p>
                    <button className="uc2-retry-sm" onClick={() => handleSelectUser(selectedUser)}>Retry</button>
                  </div>
                ) : filteredContacts.length === 0 ? (
                  <div className="uc2-state-sm">
                    <div className="uc2-empty-icon">
                      <BookUser size={26} />
                    </div>
                    <p style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                      {contactSearch ? 'No matches' : 'No Contacts'}
                    </p>
                    <p style={{ fontSize: '0.79rem', color: 'var(--text-muted)', maxWidth: 260 }}>
                      {contactSearch
                        ? `No contact matches "${contactSearch}"`
                        : `${selectedUser.full_name?.split(' ')[0] || 'This user'} has no saved contacts yet.`}
                    </p>
                  </div>
                ) : (
                  <div className="uc2-contact-grid">
                    {filteredContacts.map((c, idx) => (
                      <div key={c.id ?? idx} className="uc2-contact-card">
                        <div className="uc2-contact-avatar">
                          {getInitials(getName(c))}
                        </div>
                        <div className="uc2-contact-info">
                          <span className="uc2-contact-name">{getName(c)}</span>
                          <a href={`tel:${getMobile(c)}`} className="uc2-contact-phone">
                            <Phone size={11} />{getMobile(c)}
                          </a>
                        </div>
                        <a href={`tel:${getMobile(c)}`} className="uc2-call-btn" title={`Call ${getName(c)}`}>
                          <PhoneCall size={15} />
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

      </div>
    </section>
  );
}
