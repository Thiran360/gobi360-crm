import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, ChevronDown, Search, RefreshCw,
  Phone, Mail, Calendar, Store, Wrench, Truck, User, Hash,
  AlertCircle, BookUser, X, PhoneCall, ChevronRight, Loader2
} from 'lucide-react';

/* ─── Role Config ─── */
const ROLE_OPTIONS = [
  { value: 'customer', label: 'Customer', icon: User, color: '#2563eb', bg: 'rgba(37,99,235,0.10)', gradient: 'linear-gradient(135deg,#2563eb,#1d4ed8)' },
  { value: 'expert', label: 'Expert', icon: Wrench, color: '#059669', bg: 'rgba(5,150,105,0.10)', gradient: 'linear-gradient(135deg,#059669,#047857)' },
  { value: 'shopkeeper', label: 'Shopkeeper', icon: Store, color: '#d97706', bg: 'rgba(217,119,6,0.10)', gradient: 'linear-gradient(135deg,#d97706,#b45309)' },
  { value: 'deliveryman', label: 'Delivery Man', icon: Truck, color: '#7c3aed', bg: 'rgba(124,58,237,0.10)', gradient: 'linear-gradient(135deg,#7c3aed,#6d28d9)' },
];

/* ─── API Helpers ─── */
async function fetchRoleMembers(role) {
  const res = await fetch(`/api/gobi360/users/role/${role}/`, { cache: 'no-store' });
  if (res.status === 400 || res.status === 404) return { success: true, count: 0, data: [] };
  if (!res.ok) throw new Error(`Server error: ${res.status}`);
  return res.json();
}

async function fetchUserContacts(mobile) {
  const res = await fetch(`/api/gobi360/contacts/${mobile}/`, { cache: 'no-store' });
  if (res.status === 400 || res.status === 404) return { success: true, count: 0, contacts: [] };
  if (!res.ok) throw new Error(`Server error: ${res.status}`);
  return res.json();
}

/* ─── Contacts Drawer ─── */
function ContactsDrawer({ member, onClose }) {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!member?.mobile) return;
    setLoading(true);
    setError(null);
    fetchUserContacts(member.mobile)
      .then(json => {
        let list = [];
        if (json.data && Array.isArray(json.data.contacts)) list = json.data.contacts;
        else if (Array.isArray(json.contacts)) list = json.contacts;
        else if (Array.isArray(json.data)) list = json.data;
        else if (Array.isArray(json)) list = json;
        setContacts(list);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [member]);

  /* Auto-refresh (poll) contacts every 5 seconds */
  useEffect(() => {
    if (!member?.mobile) return;
    const interval = setInterval(() => {
      fetchUserContacts(member.mobile)
        .then(json => {
          let list = [];
          if (json.data && Array.isArray(json.data.contacts)) list = json.data.contacts;
          else if (Array.isArray(json.contacts)) list = json.contacts;
          else if (Array.isArray(json.data)) list = json.data;
          else if (Array.isArray(json)) list = json;

          setContacts(prev => {
            if (prev.length === list.length) return prev;
            return list;
          });
        })
        .catch(err => console.error("Auto-refresh failed:", err));
    }, 5000);
    return () => clearInterval(interval);
  }, [member]);

  // close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const filtered = contacts.filter(c => {
    const q = search.toLowerCase();
    return (
      (c.name || c.contact_name || '').toLowerCase().includes(q) ||
      (c.mobile || c.phone || c.contact_mobile || '').includes(q)
    );
  });

  const getInitials = (name) =>
    (name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const getName = (c) => c.name || c.contact_name || '—';
  const getMobile = (c) => c.mobile || c.contact_mobile || c.phone || '—';

  return (
    <>
      {/* Backdrop */}
      <div className="cd-backdrop" onClick={onClose} />

      {/* Drawer */}
      <aside className="cd-drawer glass">
        {/* Header */}
        <div className="cd-header">
          <div className="cd-header-user">
            <div className="cd-avatar">
              {(member.full_name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="cd-header-name">{member.full_name || '—'}</div>
              <div className="cd-header-meta">
                <Phone size={12} />
                {member.mobile}
              </div>
            </div>
          </div>
          <button className="cd-close-btn" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        {/* Contacts count strip */}
        <div className="cd-strip">
          <BookUser size={15} />
          <span>
            {loading ? 'Loading contacts…' :
              error ? 'Could not load contacts' :
                `${filtered.length} of ${contacts.length} Contact${contacts.length !== 1 ? 's' : ''}`}
          </span>
        </div>

        {/* Search */}
        <div className="cd-search-wrap">
          <Search size={14} className="cd-search-icon" />
          <input
            className="cd-search"
            type="text"
            placeholder="Search contacts…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="cd-search-clear" onClick={() => setSearch('')}>
              <X size={13} />
            </button>
          )}
        </div>

        {/* Contact List */}
        <div className="cd-list-wrap">
          {loading ? (
            <div className="cd-state">
              <div className="cd-spinner" />
              <p>Fetching contacts…</p>
            </div>
          ) : error ? (
            <div className="cd-state">
              <AlertCircle size={30} color="#dc2626" />
              <p className="cd-state-err">Failed to load contacts</p>
              <p className="cd-state-sub">{error}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="cd-state">
              <div className="cd-empty-icon">
                <BookUser size={28} />
              </div>
              <p className="cd-state-title">
                {search ? 'No matches found' : 'No Contacts'}
              </p>
              <p className="cd-state-sub">
                {search
                  ? `No contact matches "${search}"`
                  : `${member.full_name?.split(' ')[0] || 'This user'} has no saved contacts yet.`}
              </p>
            </div>
          ) : (
            <ul className="cd-list">
              {filtered.map((c, idx) => (
                <li key={c.id ?? idx} className="cd-item">
                  <div className="cd-item-avatar">
                    {getInitials(getName(c))}
                  </div>
                  <div className="cd-item-info">
                    <span className="cd-item-name">{getName(c)}</span>
                    <a href={`tel:${getMobile(c)}`} className="cd-item-phone">
                      <PhoneCall size={11} />
                      {getMobile(c)}
                    </a>
                  </div>
                  <a href={`tel:${getMobile(c)}`} className="cd-call-btn" title={`Call ${getName(c)}`}>
                    <PhoneCall size={14} />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </>
  );
}

/* ─── Main Members Component ─── */
export default function Members() {
  const [selectedRole, setSelectedRole] = useState('customer');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [roleCounts, setRoleCounts] = useState({});
  const [contactsMember, setContactsMember] = useState(null); // user whose drawer is open

  const activeRole = ROLE_OPTIONS.find(r => r.value === selectedRole);

  const loadMembers = useCallback(async (role) => {
    setLoading(true);
    setError(null);
    setMembers([]);
    setTotalCount(0);
    try {
      const json = await fetchRoleMembers(role);
      const list = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
      const count = json.count ?? list.length;
      setMembers(list);
      setTotalCount(count);
      setRoleCounts(prev => ({ ...prev, [role]: count }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Pre-load counts for all stat cards
  useEffect(() => {
    ROLE_OPTIONS.forEach(r => {
      fetchRoleMembers(r.value)
        .then(json => {
          const list = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
          setRoleCounts(prev => ({ ...prev, [r.value]: json.count ?? list.length }));
        })
        .catch(() => { });
    });
  }, []);

  useEffect(() => {
    loadMembers(selectedRole);
    setSearchQuery('');
    setContactsMember(null);
  }, [selectedRole, loadMembers]);

  const filteredMembers = members.filter(m => {
    const q = searchQuery.toLowerCase();
    return (
      (m.full_name || '').toLowerCase().includes(q) ||
      (m.mobile || '').includes(q) ||
      (m.email || '').toLowerCase().includes(q)
    );
  });

  const handleRoleSelect = (val) => { setSelectedRole(val); setDropdownOpen(false); };
  const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };
  const getInitials = (name) =>
    (name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <section className="mp-page">

      {/* ── Stat Cards ── */}
      <div className="mp-stat-row">
        {ROLE_OPTIONS.map(role => (
          <button
            key={role.value}
            className={`mp-stat-card ${selectedRole === role.value ? 'mp-stat-active' : ''}`}
            style={selectedRole === role.value ? { borderColor: role.color, boxShadow: `0 0 0 3px ${role.color}18` } : {}}
            onClick={() => handleRoleSelect(role.value)}
          >
            <div className="mp-stat-icon" style={{ background: role.gradient }}>
              <role.icon size={18} color="#fff" />
            </div>
            <div className="mp-stat-info">
              <span className="mp-stat-label">{role.label}s</span>
              <span className="mp-stat-count" style={{ color: selectedRole === role.value ? role.color : 'var(--text-primary)' }}>
                {roleCounts[role.value] !== undefined ? roleCounts[role.value] : '…'}
              </span>
            </div>
            {selectedRole === role.value && (
              <span className="mp-stat-active-bar" style={{ background: role.color }} />
            )}
          </button>
        ))}
      </div>

      {/* ── Main Table Card ── */}
      <div className="mp-card glass">
        {/* Card Header */}
        <div className="mp-card-header">
          <div className="mp-card-title">
            <div className="mp-card-icon" style={{ background: activeRole.bg, color: activeRole.color }}>
              <activeRole.icon size={20} />
            </div>
            <div>
              <h3 className="mp-card-heading">{activeRole.label} List</h3>
              <p className="mp-card-sub">
                {loading ? 'Loading…' : `${filteredMembers.length} of ${totalCount} ${activeRole.label}${totalCount !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>

          <div className="mp-card-actions">
            {/* Search */}
            <div className="mp-search-box">
              <Search size={15} className="mp-search-icon" />
              <input
                className="mp-search-input"
                type="text"
                placeholder="Search name, phone, email..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Role Dropdown */}
            <div className="mp-role-wrap">
              <button
                className="mp-role-btn"
                style={{ color: activeRole.color, borderColor: `${activeRole.color}60` }}
                onClick={() => setDropdownOpen(o => !o)}
              >
                <activeRole.icon size={15} />
                <span>Select Role</span>
                <strong style={{ marginLeft: 4 }}>{activeRole.label}</strong>
                <ChevronDown size={15} style={{ marginLeft: 4, transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0)', transition: '0.2s ease' }} />
              </button>

              {dropdownOpen && (
                <>
                  <div className="mp-backdrop" onClick={() => setDropdownOpen(false)} />
                  <div className="mp-dropdown glass">
                    <div className="mp-dropdown-label">Select Member Role</div>
                    {ROLE_OPTIONS.map(role => (
                      <button
                        key={role.value}
                        className={`mp-dropdown-item ${selectedRole === role.value ? 'mp-dropdown-active' : ''}`}
                        onClick={() => handleRoleSelect(role.value)}
                      >
                        <span className="mp-dropdown-dot" style={{ background: role.gradient }}>
                          <role.icon size={13} color="#fff" />
                        </span>
                        <span className="mp-dropdown-text">{role.label}</span>
                        {selectedRole === role.value && (
                          <span className="mp-dropdown-check" style={{ color: role.color }}>✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Refresh */}
            <button className="mp-refresh-btn" onClick={() => loadMembers(selectedRole)} disabled={loading} title="Refresh">
              <RefreshCw size={16} style={{ animation: loading ? 'mp-spin 0.8s linear infinite' : 'none' }} />
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="mp-state">
            <div className="mp-spinner" style={{ borderTopColor: activeRole.color }} />
            <p className="mp-state-title" style={{ marginTop: 16 }}>Fetching {activeRole.label}s</p>
            <p className="mp-state-sub">Please wait while we load the data...</p>
          </div>
        ) : error ? (
          <div className="mp-state">
            <div className="mp-error-circle"><AlertCircle size={28} color="#dc2626" /></div>
            <p className="mp-state-title" style={{ color: '#dc2626' }}>Connection Error</p>
            <p className="mp-state-sub">{error}</p>
            <button className="mp-retry-btn" onClick={() => loadMembers(selectedRole)}>Try Again</button>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="mp-state">
            <div className="mp-empty-wrap">
              <div className="mp-empty-bg" style={{ background: activeRole.bg }} />
              <div className="mp-empty-icon" style={{ background: activeRole.gradient }}>
                <activeRole.icon size={34} color="#fff" />
              </div>
            </div>
            <p className="mp-state-title" style={{ marginTop: 20 }}>No {activeRole.label}s Found</p>
            <p className="mp-state-sub">
              {searchQuery
                ? `No ${activeRole.label.toLowerCase()}s match "${searchQuery}".`
                : `There are currently no ${activeRole.label.toLowerCase()}s registered in the system.`}
            </p>
            {searchQuery && (
              <button className="mp-retry-btn" style={{ marginTop: 14, background: activeRole.gradient }} onClick={() => setSearchQuery('')}>
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <div className="mp-table-wrap">
            <table className="mp-table">
              <thead>
                <tr>
                  <th><span className="mp-th"><Hash size={12} />ID</span></th>
                  <th><span className="mp-th"><User size={12} />Full Name</span></th>
                  <th><span className="mp-th"><Phone size={12} />Mobile</span></th>
                  <th><span className="mp-th"><Mail size={12} />Email</span></th>
                  <th><span className="mp-th"><Users size={12} />Role</span></th>
                  <th><span className="mp-th"><Calendar size={12} />Joined</span></th>
                  <th><span className="mp-th"><BookUser size={12} />Contacts</span></th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((m, idx) => (
                  <tr key={m.id ?? idx} className="mp-row">
                    <td className="mp-td-id">#{m.id}</td>
                    <td>
                      <div className="mp-name-cell">
                        <div className="mp-avatar" style={{ background: activeRole.gradient }}>
                          {getInitials(m.full_name)}
                        </div>
                        <div>
                          <div className="mp-full-name">{m.full_name || '—'}</div>
                          <div className="mp-name-sub">{m.role_name || activeRole.label}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <a href={`tel:${m.mobile}`} className="mp-phone">
                        <Phone size={13} />{m.mobile || '—'}
                      </a>
                    </td>
                    <td><span className="mp-email">{m.email || '—'}</span></td>
                    <td>
                      <span className="mp-badge" style={{ background: activeRole.bg, color: activeRole.color, border: `1px solid ${activeRole.color}25` }}>
                        <activeRole.icon size={11} />{m.role_name || activeRole.label}
                      </span>
                    </td>
                    <td><span className="mp-date">{formatDate(m.created_at)}</span></td>
                    <td>
                      <button
                        className="mp-contacts-btn"
                        style={{ color: activeRole.color, borderColor: `${activeRole.color}40`, background: activeRole.bg }}
                        onClick={() => setContactsMember(m)}
                        title={`View contacts of ${m.full_name}`}
                      >
                        <BookUser size={14} />
                        <span>View</span>
                        <ChevronRight size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Contacts Drawer ── */}
      {contactsMember && (
        <ContactsDrawer
          member={contactsMember}
          onClose={() => setContactsMember(null)}
        />
      )}
    </section>
  );
}
