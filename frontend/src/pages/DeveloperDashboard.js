import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { getMyUploads, deleteSoftware, getSoftwareStats } from '../services/api';

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

  const [selectedSw, setSelectedSw] = useState(null);
  const [stats, setStats] = useState([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState(null);

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

  const handleRowClick = (sw) => {
    if (selectedSw?.id === sw.id) {
      setSelectedSw(null);
      setStats([]);
      return;
    }
    setSelectedSw(sw);
    setStats([]);
    setStatsError(null);
    setStatsLoading(true);
    getSoftwareStats(sw.id)
      .then(r => { setStats(r.data); setStatsLoading(false); })
      .catch(err => {
        setStatsError(err.response?.data?.detail || 'Failed to load stats');
        setStatsLoading(false);
      });
  };

  const handleDelete = async (e, sw) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${sw.title}" (v${sw.version})? This cannot be undone.`)) return;
    setDeleting(sw.id);
    try {
      await deleteSoftware(sw.id);
      if (selectedSw?.id === sw.id) { setSelectedSw(null); setStats([]); }
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
              {uploads.map((sw, i) => {
                const isSelected = selectedSw?.id === sw.id;
                return (
                  <tr
                    key={sw.id}
                    onClick={() => handleRowClick(sw)}
                    style={{
                      borderBottom: i < uploads.length - 1 ? '1px solid #f0f0f0' : 'none',
                      cursor: 'pointer',
                      background: isSelected ? '#f0fffe' : 'white',
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f8f9fa'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = isSelected ? '#f0fffe' : 'white'; }}
                  >
                    <td style={{ padding: '14px 16px', fontWeight: '600', color: '#2d3436' }}>
                      {sw.title}
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
                        onClick={(e) => handleDelete(e, sw)}
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
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Stats panel - shown when a row is selected */}
      {selectedSw && (
        <div style={{ marginTop: '30px', background: 'white', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, fontSize: '18px', color: '#2d3436' }}>
              Downloads over time - <span style={{ color: '#4ecdc4' }}>{selectedSw.title}</span>
            </h2>
            <button
              onClick={() => { setSelectedSw(null); setStats([]); }}
              style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#999', lineHeight: 1 }}
            >
              ×
            </button>
          </div>

          {statsLoading && (
            <p style={{ textAlign: 'center', color: '#999', padding: '40px 0' }}>Loading stats...</p>
          )}

          {statsError && (
            <div style={{ padding: '12px', background: '#f8d7da', border: '1px solid #f5c6cb', borderRadius: '6px', color: '#721c24' }}>
              {statsError}
            </div>
          )}

          {!statsLoading && !statsError && stats.length === 0 && (
            <p style={{ textAlign: 'center', color: '#999', padding: '40px 0' }}>No downloads recorded yet.</p>
          )}

          {!statsLoading && !statsError && stats.length === 1 && (
            <p style={{ textAlign: 'center', color: '#999', padding: '40px 0' }}>
              Only 1 download on {stats[0].date} - not enough data to plot a trend.
            </p>
          )}

          {!statsLoading && !statsError && stats.length >= 2 && (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={stats} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: '#636e72' }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 12, fill: '#636e72' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '6px', border: '1px solid #e0e0e0', fontSize: '13px' }}
                  formatter={(value) => [value, 'Downloads']}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#4ecdc4"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#4ecdc4' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
    </div>
  );
}

export default DeveloperDashboard;
