import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyUploads, deleteSoftware } from '../services/api';

const STATUS_STYLE = {
  pending:  { background: '#fff3cd', color: '#856404' },
  approved: { background: '#d4edda', color: '#155724' },
  rejected: { background: '#f8d7da', color: '#721c24' },
};

function DeveloperDashboard() {
  const navigate = useNavigate();
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const fetchUploads = () => {
    setLoading(true);
    getMyUploads()
      .then(r => { setUploads(r.data); setLoading(false); })
      .catch(err => {
        setError(err.response?.data?.detail || 'Failed to load uploads');
        setLoading(false);
      });
  };

  useEffect(() => { fetchUploads(); }, []);

  const handleDelete = async (sw) => {
    if (!window.confirm(`Delete "${sw.title}" (v${sw.version})? This cannot be undone.`)) return;
    setDeleting(sw.id);
    try {
      await deleteSoftware(sw.id);
      fetchUploads();
    } catch (err) {
      alert(err.response?.data?.detail || 'Delete failed');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '30px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e0e0e0', paddingBottom: '15px', marginBottom: '30px' }}>
        <h1 style={{ margin: 0, fontSize: '32px', color: '#2d3436' }}>My Uploads</h1>
        <button
          onClick={() => navigate('/upload')}
          style={{ padding: '10px 20px', background: '#4ecdc4', color: 'white', border: 'none', borderRadius: '6px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}
        >
          + Upload New
        </button>
      </div>

      {loading && (
        <p style={{ textAlign: 'center', color: '#999', fontSize: '18px', padding: '60px 0' }}>Loading...</p>
      )}

      {error && (
        <div style={{ padding: '16px', background: '#f8d7da', border: '1px solid #f5c6cb', borderRadius: '6px', color: '#721c24' }}>
          {error}
        </div>
      )}

      {!loading && !error && uploads.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 20px', background: '#f8f9fa', borderRadius: '8px' }}>
          <p style={{ fontSize: '18px', color: '#999', margin: 0 }}>No uploads yet.</p>
        </div>
      )}

      {!loading && uploads.length > 0 && (
        <div style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #e0e0e0' }}>
                {['Title', 'Status', 'Version', 'Downloads', 'Avg Rating', ''].map(h => (
                  <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#636e72', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {uploads.map((sw, i) => (
                <tr
                  key={sw.id}
                  style={{ borderBottom: i < uploads.length - 1 ? '1px solid #f0f0f0' : 'none' }}
                >
                  <td style={{ padding: '14px 16px' }}>
                    <span
                      onClick={() => navigate(`/software/${sw.id}`)}
                      style={{ fontWeight: '600', color: '#2d3436', cursor: 'pointer' }}
                      onMouseEnter={e => e.target.style.color = '#4ecdc4'}
                      onMouseLeave={e => e.target.style.color = '#2d3436'}
                    >
                      {sw.title}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '600',
                      textTransform: 'capitalize',
                      ...(STATUS_STYLE[sw.status] || { background: '#e0e0e0', color: '#333' })
                    }}>
                      {sw.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', color: '#636e72', fontSize: '14px' }}>
                    v{sw.version}
                  </td>
                  <td style={{ padding: '14px 16px', color: '#636e72', fontSize: '14px' }}>
                    {sw.download_count.toLocaleString()}
                  </td>
                  <td style={{ padding: '14px 16px', color: '#636e72', fontSize: '14px' }}>
                    {sw.average_rating !== null
                      ? `${sw.average_rating} / 5 (${sw.rating_count})`
                      : <span style={{ color: '#bbb' }}>—</span>}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <button
                      onClick={() => handleDelete(sw)}
                      disabled={deleting === sw.id}
                      style={{
                        padding: '6px 14px',
                        background: deleting === sw.id ? '#ccc' : '#ff6b6b',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: deleting === sw.id ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {deleting === sw.id ? 'Deleting…' : 'Delete'}
                    </button>
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

export default DeveloperDashboard;
