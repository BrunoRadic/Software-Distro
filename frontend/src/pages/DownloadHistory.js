import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

function DownloadHistory() {
  const navigate = useNavigate();
  const [downloads, setDownloads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/auth/me/downloads')
      .then(r => {
        setDownloads(r.data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.response?.data?.detail || 'Failed to load download history');
        setLoading(false);
      });
  }, []);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '30px 20px' }}>
      <h1 style={{ margin: '0 0 30px 0', fontSize: '32px', color: '#2d3436', borderBottom: '2px solid #e0e0e0', paddingBottom: '15px' }}>
        Download History
      </h1>

      {loading && (
        <p style={{ textAlign: 'center', color: '#999', fontSize: '18px', padding: '60px 0' }}>
          Loading...
        </p>
      )}

      {error && (
        <div style={{ padding: '16px', background: '#f8d7da', border: '1px solid #f5c6cb', borderRadius: '6px', color: '#721c24' }}>
          {error}
        </div>
      )}

      {!loading && !error && downloads.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 20px', background: '#f8f9fa', borderRadius: '8px' }}>
          <p style={{ fontSize: '18px', color: '#999', margin: 0 }}>No downloads yet.</p>
        </div>
      )}

      {!loading && downloads.length > 0 && (
        <div style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #e0e0e0' }}>
                {['Software', 'Version', 'Category', 'Platforms', 'Downloaded'].map(h => (
                  <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#636e72', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {downloads.map((d, i) => (
                <tr
                  key={d.id}
                  onClick={() => navigate(`/software/${d.software.id}`)}
                  style={{
                    borderBottom: i < downloads.length - 1 ? '1px solid #f0f0f0' : 'none',
                    cursor: 'pointer',
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8f9fa'}
                  onMouseLeave={e => e.currentTarget.style.background = 'white'}
                >
                  <td style={{ padding: '14px 16px', fontWeight: '600', color: '#2d3436' }}>
                    {d.software.title}
                  </td>
                  <td style={{ padding: '14px 16px', color: '#636e72', fontSize: '14px' }}>
                    v{d.software.version}
                  </td>
                  <td style={{ padding: '14px 16px', color: '#636e72', fontSize: '14px' }}>
                    {d.software.category || '—'}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    {d.platform ? (
                      <span style={{
                        padding: '3px 8px', background: '#e8f8f7', color: '#0a7c74',
                        borderRadius: '4px', fontSize: '12px', fontWeight: '600'
                      }}>
                        {d.platform}
                      </span>
                    ) : (
                      <span style={{ color: '#bbb', fontSize: '14px' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px', color: '#636e72', fontSize: '14px', whiteSpace: 'nowrap' }}>
                    {formatDate(d.downloaded_at)}
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

export default DownloadHistory;
