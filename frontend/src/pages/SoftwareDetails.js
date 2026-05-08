import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { isAuthenticated, getUser } from '../utils/auth';

function SoftwareDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [software, setSoftware] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [versions, setVersions] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [versionData, setVersionData] = useState({
    version: '', file_size: 0, created_at: '', download_count: 0, description: '', platforms: []
  });
  const [softwareFiles, setSoftwareFiles] = useState([]);
  const [downloading, setDownloading] = useState(null);  // platform string or 'legacy'
  const [downloadError, setDownloadError] = useState(null);

  useEffect(() => {
    api.get(`/software/${id}`)
      .then(response => {
        setSoftware(response.data);
        setVersionData({
          version: response.data.version,
          file_size: response.data.file_size,
          created_at: response.data.created_at,
          download_count: response.data.download_count,
          description: response.data.description,
          platforms: []
        });
        setSelectedVersion(response.data.id);
        setLoading(false);
      })
      .catch(err => {
        setError(err.response?.data?.detail || 'Failed to load software');
        setLoading(false);
      });

    api.get(`/software/${id}/versions`)
      .then(r => setVersions(r.data))
      .catch(err => console.error('Error fetching versions:', err));
  }, [id]);

  // When selected version changes, update versionData and load its files
  useEffect(() => {
    if (!selectedVersion) return;

    api.get(`/software/${selectedVersion}/files`)
      .then(r => setSoftwareFiles(r.data))
      .catch(() => setSoftwareFiles([]));

    if (versions.length > 0) {
      const v = versions.find(v => v.id === selectedVersion);
      if (v) {
        setVersionData({
          version: v.version,
          file_size: v.file_size,
          created_at: v.created_at,
          download_count: v.download_count,
          description: v.description,
          platforms: v.platforms || []
        });
      }
    }
  }, [selectedVersion, versions]);

  const handleDownload = async (platform) => {
    if (!isAuthenticated()) { navigate('/login'); return; }

    const key = platform || 'legacy';
    setDownloading(key);
    setDownloadError(null);

    try {
      const params = new URLSearchParams({ version_id: selectedVersion });
      if (platform) params.append('platform', platform);

      const response = await api.get(`/software/${id}/download?${params}`);
      window.open(response.data.download_url, '_blank');

      setSoftware(prev => ({ ...prev, download_count: prev.download_count + 1 }));
    } catch (err) {
      setDownloadError(err.response?.data?.detail || 'Download failed');
    } finally {
      setDownloading(null);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  const getPriceDisplay = () => {
    if (!software) return '';
    if (software.price_type === 'free') return 'Free';
    if (software.price_type === 'paid' && software.price) return `$${software.price.toFixed(2)}`;
    return 'N/A';
  };


  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', maxWidth: '800px', margin: '0 auto' }}>
        <p style={{ fontSize: '18px', color: '#999' }}>Loading software details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: '800px', margin: '40px auto', padding: '20px' }}>
        <div style={{
          padding: '20px', background: '#ffe0e0', border: '1px solid #ff6b6b',
          borderRadius: '8px', color: '#d63031', marginBottom: '20px'
        }}>
          <p style={{ margin: 0 }}>{error}</p>
        </div>
        <button onClick={() => navigate('/browse')} style={{
          padding: '10px 20px', background: '#4ecdc4', color: 'white',
          border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '500'
        }}>
          ← Back to Browse
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '30px 20px' }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px'
      }}>
        <button onClick={() => navigate('/browse')} style={{
          padding: '10px 20px', background: 'transparent', color: '#4ecdc4',
          border: '1px solid #4ecdc4', borderRadius: '4px', cursor: 'pointer',
          fontWeight: '500', transition: 'all 0.2s'
        }}
          onMouseEnter={e => { e.target.style.background = '#4ecdc4'; e.target.style.color = 'white'; }}
          onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.color = '#4ecdc4'; }}
        >
          ← Back to Browse
        </button>

        {/* Download buttons */}
        {isAuthenticated() ? (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {softwareFiles.length > 0 ? (
              softwareFiles.map(f => {
                const isDown = downloading === f.platform;
                const isApproved = software?.status === 'approved';
                return (
                  <button
                    key={f.platform}
                    onClick={() => handleDownload(f.platform)}
                    disabled={isDown || !isApproved}
                    style={{
                      padding: '10px 20px',
                      background: isDown ? '#95e1d3' : '#4ecdc4',
                      color: 'white', border: 'none', borderRadius: '4px',
                      cursor: (isDown || !isApproved) ? 'not-allowed' : 'pointer',
                      fontWeight: '600', fontSize: '14px', transition: 'all 0.2s',
                      display: 'flex', alignItems: 'center', gap: '6px'
                    }}
                    onMouseEnter={e => { if (!isDown && isApproved) e.currentTarget.style.background = '#3bb3aa'; }}
                    onMouseLeave={e => { if (!isDown) e.currentTarget.style.background = '#4ecdc4'; }}
                  >
                    {isDown ? 'Downloading...' : (
                      <>
                        {f.platform}
                        <span style={{ fontSize: '12px', opacity: 0.85 }}>
                          ({formatFileSize(f.file_size)})
                        </span>
                      </>
                    )}
                  </button>
                );
              })
            ) : (
              // Legacy single-file fallback
              <button
                onClick={() => handleDownload(null)}
                disabled={downloading === 'legacy' || software?.status !== 'approved'}
                style={{
                  padding: '12px 30px',
                  background: downloading === 'legacy' ? '#95e1d3' : '#4ecdc4',
                  color: 'white', border: 'none', borderRadius: '4px',
                  cursor: (downloading === 'legacy' || software?.status !== 'approved') ? 'not-allowed' : 'pointer',
                  fontWeight: '600', fontSize: '16px', transition: 'all 0.2s'
                }}
              >
                {downloading === 'legacy' ? 'Downloading...' : 'Download'}
              </button>
            )}
          </div>
        ) : (
          <button onClick={() => navigate('/login')} style={{
            padding: '12px 30px', background: '#ff6b6b', color: 'white',
            border: 'none', borderRadius: '4px', cursor: 'pointer',
            fontWeight: '600', fontSize: '16px'
          }}>
            Login to Download
          </button>
        )}
      </div>

      {/* Download error */}
      {downloadError && (
        <div style={{
          marginBottom: '16px', padding: '12px 16px',
          background: '#f8d7da', border: '1px solid #f5c6cb',
          borderRadius: '4px', color: '#721c24', fontSize: '14px'
        }}>
          {downloadError}
        </div>
      )}

      {/* Version selector */}
      {versions.length > 1 && (
        <div style={{
          marginBottom: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '4px'
        }}>
          <label style={{
            display: 'block', marginBottom: '8px', fontSize: '14px',
            fontWeight: '600', color: '#2d3436'
          }}>
            Select Version to Download:
          </label>
          <select value={selectedVersion} onChange={e => setSelectedVersion(parseInt(e.target.value))}
            style={{
              width: '100%', padding: '10px', fontSize: '15px',
              border: '1px solid #dee2e6', borderRadius: '4px', cursor: 'pointer'
            }}>
            {versions.map(v => (
              <option key={v.id} value={v.id}>
                v{v.version}
                {v.is_latest && ' (Latest)'}
                {v.platforms && v.platforms.length > 0 && ` — ${v.platforms.join(', ')}`}
                {' — '}{new Date(v.created_at).toLocaleDateString()}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Upload new version button */}
      {(getUser()?.role === 'admin' || software?.developer?.id === getUser()?.id) && (
        <button onClick={() => navigate(`/upload-version/${id}`)} style={{
          padding: '10px 20px', background: '#ffc107', color: '#333',
          border: 'none', borderRadius: '4px', cursor: 'pointer',
          fontWeight: '600', marginBottom: '20px'
        }}>
          Upload New Version
        </button>
      )}

      {/* Main content card */}
      <div style={{
        background: 'white', border: '1px solid #e0e0e0',
        borderRadius: '8px', padding: '40px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
      }}>
        <h1 style={{ margin: '0 0 20px 0', fontSize: '36px', color: '#2d3436' }}>
          {software?.title}
        </h1>

        {/* Meta badges */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '30px', flexWrap: 'wrap' }}>
          <span style={badgeStyle}>Version {versionData.version}</span>
          <span style={badgeStyle}>{software?.os_compatibility || 'N/A'}</span>
          <span style={badgeStyle}>{software?.license || 'N/A'}</span>
          <span style={{
            ...badgeStyle,
            background: software?.price_type === 'free' ? '#d4edda' : '#fff3cd',
            color: software?.price_type === 'free' ? '#155724' : '#856404',
            fontWeight: '600'
          }}>
            {getPriceDisplay()}
          </span>

          {/* Platform availability badges */}
          {softwareFiles.map(f => (
            <span key={f.platform} style={{
              ...badgeStyle,
              background: '#e8f8f7', color: '#0a7c74', fontWeight: '600'
            }}>
              {f.platform}
            </span>
          ))}
        </div>

        {/* Description */}
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ fontSize: '18px', color: '#2d3436', marginBottom: '12px' }}>Description</h3>
          <p style={{
            fontSize: '15px', lineHeight: '1.7', color: '#636e72', whiteSpace: 'pre-wrap'
          }}>
            {versionData.description || 'No description available.'}
          </p>
        </div>

        {/* External link */}
        {software?.external_link && (
          <div style={{ marginBottom: '30px' }}>
            <a href={software.external_link} target="_blank" rel="noopener noreferrer" style={{
              color: '#4ecdc4', textDecoration: 'none', fontSize: '15px', fontWeight: '500'
            }}>
              Visit Project Website →
            </a>
          </div>
        )}

        <hr style={{ border: 'none', borderTop: '1px solid #e0e0e0', margin: '30px 0' }} />

        {/* Details grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '20px', marginBottom: '20px'
        }}>
          {[
            { label: 'File Size', value: formatFileSize(versionData.file_size) },
            { label: 'Downloads', value: versionData.download_count || 0 },
            { label: 'Uploaded', value: formatDate(versionData.created_at) },
            { label: 'Developer', value: software?.developer?.username || 'Unknown' },
            { label: 'Category', value: software?.category?.name || 'N/A' },
          ].map(({ label, value }) => (
            <div key={label}>
              <p style={{
                fontSize: '13px', color: '#999', margin: '0 0 5px 0',
                textTransform: 'uppercase', letterSpacing: '0.5px'
              }}>{label}</p>
              <p style={{ fontSize: '16px', color: '#2d3436', margin: 0, fontWeight: '500' }}>
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const badgeStyle = {
  padding: '6px 12px', background: '#f8f9fa', borderRadius: '4px',
  fontSize: '14px', color: '#636e72', fontWeight: '500'
};

export default SoftwareDetails;
