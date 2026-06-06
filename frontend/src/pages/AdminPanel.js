import React, { useState, useEffect } from 'react';
import api from '../services/api';
import SoftwareAdminCard from '../components/SoftwareAdminCard';
import { getUser } from '../utils/auth';

const TAB_STYLE = (active) => ({
  padding: '10px 24px',
  fontSize: '15px',
  fontWeight: active ? '600' : '400',
  color: active ? '#6c5ce7' : '#636e72',
  background: 'none',
  border: 'none',
  borderBottom: active ? '2px solid #6c5ce7' : '2px solid transparent',
  cursor: 'pointer',
  marginBottom: '-1px',
});

function SoftwareTab() {
  const [software, setSoftware] = useState([]);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = statusFilter ? `?status_filter=${statusFilter}` : '';
    api.get(`/software${params}`)
      .then(response => {
        setSoftware(response.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [statusFilter]);

  const handleApprove = async (id) => {
    await api.patch(`/admin/software/${id}/approve`);
    setSoftware(prev => prev.filter(s => s.id !== id));
  };

  const handleReject = async (id) => {
    await api.patch(`/admin/software/${id}/reject`);
    setSoftware(prev => prev.filter(s => s.id !== id));
  };

  const handleDelete = async (id) => {
    await api.delete(`/software/${id}`);
    setSoftware(prev => prev.filter(s => s.id !== id));
  };

  return (
    <>
      <div style={{ marginBottom: '25px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#2d3436' }}>
          Filter by Status:
        </label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: '10px 15px',
            fontSize: '15px',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            background: 'white',
            cursor: 'pointer',
            minWidth: '200px'
          }}
        >
          <option value="">All Software</option>
          <option value="pending">Pending Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        {statusFilter && (
          <span style={{ marginLeft: '15px', color: '#636e72', fontSize: '14px' }}>
            Showing: <strong>{statusFilter}</strong> ({software.length} items)
          </span>
        )}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#999' }}>
          <p style={{ fontSize: '18px' }}>Loading software...</p>
        </div>
      )}

      {!loading && (
        <>
          {software.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 20px', background: '#f8f9fa', borderRadius: '8px' }}>
              <p style={{ fontSize: '18px', color: '#999', margin: 0 }}>
                No {statusFilter || 'software'} found.
              </p>
            </div>
          ) : (
            <div>
              {software.map(sw => (
                <SoftwareAdminCard
                  key={sw.id}
                  software={sw}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}

function CategoriesTab() {
  const [categories, setCategories] = useState([]);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/categories').then(r => setCategories(r.data)).catch(console.error);
  }, []);

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      const r = await api.post('/admin/categories', { name });
      setCategories(prev => [...prev, r.data]);
      setNewName('');
      setError('');
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to add category');
    }
  };

  const startEdit = (cat) => {
    setEditingId(cat.id);
    setEditingName(cat.name);
    setError('');
  };

  const handleSave = async (id) => {
    const name = editingName.trim();
    if (!name) return;
    try {
      const r = await api.patch(`/admin/categories/${id}`, { name });
      setCategories(prev => prev.map(c => c.id === id ? r.data : c));
      setEditingId(null);
      setError('');
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to update category');
    }
  };

  const handleDelete = async (id) => {
    await api.delete(`/admin/categories/${id}`);
    setCategories(prev => prev.filter(c => c.id !== id));
  };

  const inputStyle = {
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #dee2e6',
    borderRadius: '4px',
    outline: 'none',
  };

  const btnStyle = (color) => ({
    padding: '8px 16px',
    fontSize: '14px',
    background: color,
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: '500',
  });

  return (
    <div style={{ maxWidth: '600px' }}>
      <h2 style={{ fontSize: '20px', color: '#2d3436', marginBottom: '20px' }}>Categories</h2>

      {error && (
        <div style={{ marginBottom: '16px', padding: '10px 14px', background: '#fff0f0', border: '1px solid #ffb3b3', borderRadius: '4px', color: '#c0392b', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {/* Add row */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
        <input
          style={{ ...inputStyle, flex: 1 }}
          placeholder="New category name"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <button style={btnStyle('#6c5ce7')} onClick={handleAdd}>Add</button>
      </div>

      {/* Category list */}
      {categories.length === 0 ? (
        <p style={{ color: '#999', fontSize: '14px' }}>No categories yet.</p>
      ) : (
        <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', overflow: 'hidden' }}>
          {categories.map((cat, idx) => (
            <div
              key={cat.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 16px',
                background: idx % 2 === 0 ? '#fff' : '#f8f9fa',
                borderBottom: idx < categories.length - 1 ? '1px solid #e0e0e0' : 'none',
              }}
            >
              {editingId === cat.id ? (
                <>
                  <input
                    style={{ ...inputStyle, flex: 1 }}
                    value={editingName}
                    onChange={e => setEditingName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSave(cat.id); if (e.key === 'Escape') setEditingId(null); }}
                    autoFocus
                  />
                  <button style={btnStyle('#00b894')} onClick={() => handleSave(cat.id)}>Save</button>
                  <button style={{ ...btnStyle('#b2bec3'), background: '#b2bec3' }} onClick={() => setEditingId(null)}>Cancel</button>
                </>
              ) : (
                <>
                  <span style={{ flex: 1, fontSize: '15px', color: '#2d3436' }}>{cat.name}</span>
                  <button style={btnStyle('#0984e3')} onClick={() => startEdit(cat)}>Edit</button>
                  <button style={btnStyle('#d63031')} onClick={() => handleDelete(cat.id)}>Delete</button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const ROLE_BADGE = {
  admin:     { background: '#6c5ce7', color: 'white' },
  developer: { background: '#0984e3', color: 'white' },
  user:      { background: '#b2bec3', color: '#2d3436' },
};

function UsersTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentUser = getUser();

  useEffect(() => {
    api.get('/admin/users')
      .then(r => { setUsers(r.data); setLoading(false); })
      .catch(err => { console.error(err); setLoading(false); });
  }, []);

  const handleDelete = async (user) => {
    if (!window.confirm(`Delete user "${user.username}"? This cannot be undone.`)) return;
    await api.delete(`/admin/users/${user.id}`);
    setUsers(prev => prev.filter(u => u.id !== user.id));
  };

  if (loading) return <div style={{ padding: '40px 0', color: '#999' }}>Loading users...</div>;

  const thStyle = {
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: '13px',
    fontWeight: '600',
    color: '#636e72',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '2px solid #e0e0e0',
    background: '#f8f9fa',
  };

  const tdStyle = {
    padding: '12px 16px',
    fontSize: '14px',
    color: '#2d3436',
    borderBottom: '1px solid #e0e0e0',
  };

  return (
    <div>
      <h2 style={{ fontSize: '20px', color: '#2d3436', marginBottom: '20px' }}>
        Users <span style={{ fontSize: '14px', fontWeight: '400', color: '#636e72' }}></span>
      </h2>
      {users.length === 0 ? (
        <p style={{ color: '#999', fontSize: '14px' }}>No users found.</p>
      ) : (
        <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Username</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Role</th>
                <th style={thStyle}>Joined</th>
                <th style={{ ...thStyle, width: '80px' }}></th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td style={tdStyle}><strong>{u.username}</strong></td>
                  <td style={tdStyle}>{u.email}</td>
                  <td style={tdStyle}>
                    <span style={{
                      ...ROLE_BADGE[u.role] || ROLE_BADGE.user,
                      padding: '3px 10px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '600',
                    }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, color: '#636e72' }}>
                    {new Date(u.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td style={tdStyle}>
                    {u.id !== currentUser?.id && (
                      <button
                        onClick={() => handleDelete(u)}
                        style={{
                          padding: '5px 12px',
                          fontSize: '13px',
                          background: '#d63031',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: '500',
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatisticsTab() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/stats')
      .then(r => { setStats(r.data); setLoading(false); })
      .catch(err => { console.error(err); setLoading(false); });
  }, []);

  if (loading) return <div style={{ padding: '40px 0', color: '#999' }}>Loading statistics...</div>;
  if (!stats) return <div style={{ padding: '40px 0', color: '#999' }}>Failed to load statistics.</div>;

  const cards = [
    { label: 'Total Users',     value: stats.total_users,     color: '#6c5ce7' },
    { label: 'Total Software',  value: stats.total_software,  color: '#0984e3' },
    { label: 'Total Downloads', value: stats.total_downloads, color: '#00b894' },
  ];

  return (
    <div>
      <h2 style={{ fontSize: '20px', color: '#2d3436', marginBottom: '24px' }}>Statistics</h2>

      {/* Summary cards */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '36px', flexWrap: 'wrap' }}>
        {cards.map(card => (
          <div key={card.label} style={{
            flex: '1 1 160px',
            background: card.color,
            borderRadius: '10px',
            padding: '24px 28px',
            color: 'white',
          }}>
            <div style={{ fontSize: '36px', fontWeight: '700', lineHeight: 1 }}>{card.value.toLocaleString()}</div>
            <div style={{ fontSize: '14px', marginTop: '8px', opacity: 0.85 }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Top 10 */}
      <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#2d3436', marginBottom: '16px' }}>
        Top 10 Most Downloaded
      </h3>
      {stats.top_software.length === 0 ? (
        <p style={{ color: '#999', fontSize: '14px' }}>No downloads yet.</p>
      ) : (
        <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', overflow: 'hidden' }}>
          {stats.top_software.map((sw, idx) => (
            <div key={idx} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '12px 16px',
              background: idx % 2 === 0 ? '#fff' : '#f8f9fa',
              borderBottom: idx < stats.top_software.length - 1 ? '1px solid #e0e0e0' : 'none',
            }}>
              <span style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: idx === 0 ? '#f9ca24' : idx === 1 ? '#b2bec3' : idx === 2 ? '#e17055' : '#dfe6e9',
                color: idx < 3 ? 'white' : '#636e72',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '13px',
                fontWeight: '700',
                flexShrink: 0,
              }}>
                {idx + 1}
              </span>
              <span style={{ flex: 1, fontSize: '15px', color: '#2d3436' }}>{sw.title}</span>
              <span style={{ fontSize: '14px', color: '#636e72', fontWeight: '600' }}>
                {sw.download_count.toLocaleString()} {sw.download_count === 1 ? 'download' : 'downloads'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const TABS = ['Software', 'Categories', 'Users', 'Statistics'];

function AdminPanel() {
  const [activeTab, setActiveTab] = useState('Software');

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '30px 20px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        paddingBottom: '15px',
        borderBottom: '2px solid #e0e0e0'
      }}>
        <h1 style={{ margin: 0, fontSize: '32px', color: '#2d3436' }}>Admin Panel</h1>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e0e0e0', marginBottom: '28px' }}>
        {TABS.map(tab => (
          <button key={tab} style={TAB_STYLE(activeTab === tab)} onClick={() => setActiveTab(tab)}>
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'Software' && <SoftwareTab />}
      {activeTab === 'Categories' && <CategoriesTab />}
      {activeTab === 'Users' && <UsersTab />}
      {activeTab === 'Statistics' && <StatisticsTab />}
    </div>
  );
}

export default AdminPanel;
