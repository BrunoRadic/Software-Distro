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

  const [ratings, setRatings] = useState([]);
  const [avgScore, setAvgScore] = useState(null);
  const [userRating, setUserRating] = useState(null);
  const [ratingForm, setRatingForm] = useState({ score: 5, comment: '' });
  const [editMode, setEditMode] = useState(false);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [ratingError, setRatingError] = useState(null);

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

    api.get(`/ratings/${id}`)
      .then(r => {
        setRatings(r.data.ratings);
        setAvgScore(r.data.average_score);
        const currentUser = getUser();
        if (currentUser) {
          const own = r.data.ratings.find(rt => rt.user.id === currentUser.id) || null;
          setUserRating(own);
          if (own) setRatingForm({ score: own.score, comment: own.comment || '' });
        }
      })
      .catch(() => {});
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

  const handleSubmitRating = () => {
    setRatingLoading(true);
    setRatingError(null);
    api.post(`/ratings/${id}`, { score: ratingForm.score, comment: ratingForm.comment || null })
      .then(r => {
        const newRating = { ...r.data, user: { id: getUser().id, username: getUser().username } };
        setUserRating(newRating);
        setRatings(prev => [newRating, ...prev]);
        setAvgScore(prev => {
          const total = ratings.length + 1;
          return Math.round(((prev || 0) * ratings.length + ratingForm.score) / total * 10) / 10;
        });
      })
      .catch(err => setRatingError(err.response?.data?.detail || 'Failed to submit rating'))
      .finally(() => setRatingLoading(false));
  };

  const handleUpdateRating = () => {
    setRatingLoading(true);
    setRatingError(null);
    api.patch(`/ratings/${id}`, { score: ratingForm.score, comment: ratingForm.comment || null })
      .then(r => {
        const updated = { ...r.data, user: { id: getUser().id, username: getUser().username } };
        setUserRating(updated);
        setRatings(prev => prev.map(rt => rt.id === updated.id ? updated : rt));
        setAvgScore(prev => {
          const others = ratings.filter(rt => rt.id !== updated.id);
          const total = others.length + 1;
          return Math.round((others.reduce((s, rt) => s + rt.score, 0) + ratingForm.score) / total * 10) / 10;
        });
        setEditMode(false);
      })
      .catch(err => setRatingError(err.response?.data?.detail || 'Failed to update rating'))
      .finally(() => setRatingLoading(false));
  };

  const handleDeleteRating = () => {
    setRatingLoading(true);
    setRatingError(null);
    api.delete(`/ratings/${id}`)
      .then(() => {
        setRatings(prev => {
          const remaining = prev.filter(rt => rt.id !== userRating.id);
          setAvgScore(remaining.length > 0
            ? Math.round(remaining.reduce((s, rt) => s + rt.score, 0) / remaining.length * 10) / 10
            : null
          );
          return remaining;
        });
        setUserRating(null);
        setRatingForm({ score: 5, comment: '' });
        setEditMode(false);
      })
      .catch(err => setRatingError(err.response?.data?.detail || 'Failed to delete rating'))
      .finally(() => setRatingLoading(false));
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
          <h1 style={{ margin: 0, fontSize: '36px', color: '#2d3436' }}>
            {software?.title}
          </h1>
          {avgScore !== null && (
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '28px', color: '#f39c12', fontWeight: '700' }}>★ {avgScore}</span>
              <span style={{ fontSize: '14px', color: '#999', marginLeft: '6px' }}>/ 5 ({ratings.length} {ratings.length === 1 ? 'rating' : 'ratings'})</span>
            </div>
          )}
          {avgScore === null && (
            <span style={{ fontSize: '14px', color: '#bbb' }}>No ratings yet</span>
          )}
        </div>

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

      {/* Ratings & Reviews */}
      <div style={{
        marginTop: '24px', background: 'white', border: '1px solid #e0e0e0',
        borderRadius: '8px', padding: '30px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
      }}>
        <h2 style={{ margin: '0 0 20px 0', fontSize: '22px', color: '#2d3436' }}>Ratings & Reviews</h2>

        {ratingError && (
          <div style={{
            marginBottom: '16px', padding: '12px 16px', background: '#f8d7da',
            border: '1px solid #f5c6cb', borderRadius: '4px', color: '#721c24', fontSize: '14px'
          }}>
            {ratingError}
          </div>
        )}

        {/* Submit / edit form */}
        {isAuthenticated() && !userRating && (
          <div style={{
            marginBottom: '24px', padding: '20px', background: '#f8f9fa',
            borderRadius: '6px', border: '1px solid #dee2e6'
          }}>
            <p style={{ margin: '0 0 12px 0', fontWeight: '600', color: '#2d3436' }}>Leave a Rating</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <label style={{ fontSize: '14px', color: '#636e72' }}>Score:</label>
              <select
                value={ratingForm.score}
                onChange={e => setRatingForm(prev => ({ ...prev, score: parseInt(e.target.value) }))}
                style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #dee2e6', fontSize: '14px' }}
              >
                {[1, 2, 3, 4, 5].map(n => (
                  <option key={n} value={n}>{'★'.repeat(n)} {n}</option>
                ))}
              </select>
            </div>
            <textarea
              placeholder="Comment (optional)"
              value={ratingForm.comment}
              onChange={e => setRatingForm(prev => ({ ...prev, comment: e.target.value }))}
              rows={3}
              style={{
                width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #dee2e6',
                fontSize: '14px', resize: 'vertical', boxSizing: 'border-box', marginBottom: '12px'
              }}
            />
            <button
              onClick={handleSubmitRating}
              disabled={ratingLoading}
              style={{
                padding: '10px 24px', background: '#4ecdc4', color: 'white', border: 'none',
                borderRadius: '4px', cursor: ratingLoading ? 'not-allowed' : 'pointer',
                fontWeight: '600', fontSize: '14px'
              }}
            >
              {ratingLoading ? 'Submitting...' : 'Submit Rating'}
            </button>
          </div>
        )}

        {/* Own rating display */}
        {isAuthenticated() && userRating && !editMode && (
          <div style={{
            marginBottom: '24px', padding: '16px 20px', background: '#e8f8f7',
            borderRadius: '6px', border: '1px solid #b2dfdb'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <span style={{ fontWeight: '600', color: '#2d3436', marginRight: '10px' }}>Your Rating:</span>
                <span style={{ color: '#f39c12', fontWeight: '700', fontSize: '18px' }}>{'★'.repeat(userRating.score)}</span>
                <span style={{ color: '#ccc', fontWeight: '700', fontSize: '18px' }}>{'★'.repeat(5 - userRating.score)}</span>
                {userRating.comment && (
                  <p style={{ margin: '6px 0 0 0', fontSize: '14px', color: '#636e72' }}>{userRating.comment}</p>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => { setRatingForm({ score: userRating.score, comment: userRating.comment || '' }); setEditMode(true); }}
                  style={{
                    padding: '6px 14px', background: '#ffc107', color: '#333', border: 'none',
                    borderRadius: '4px', cursor: 'pointer', fontWeight: '600', fontSize: '13px'
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={handleDeleteRating}
                  disabled={ratingLoading}
                  style={{
                    padding: '6px 14px', background: '#ff6b6b', color: 'white', border: 'none',
                    borderRadius: '4px', cursor: ratingLoading ? 'not-allowed' : 'pointer',
                    fontWeight: '600', fontSize: '13px'
                  }}
                >
                  {ratingLoading ? '...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit form */}
        {isAuthenticated() && userRating && editMode && (
          <div style={{
            marginBottom: '24px', padding: '20px', background: '#f8f9fa',
            borderRadius: '6px', border: '1px solid #dee2e6'
          }}>
            <p style={{ margin: '0 0 12px 0', fontWeight: '600', color: '#2d3436' }}>Edit Your Rating</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <label style={{ fontSize: '14px', color: '#636e72' }}>Score:</label>
              <select
                value={ratingForm.score}
                onChange={e => setRatingForm(prev => ({ ...prev, score: parseInt(e.target.value) }))}
                style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #dee2e6', fontSize: '14px' }}
              >
                {[1, 2, 3, 4, 5].map(n => (
                  <option key={n} value={n}>{'★'.repeat(n)} {n}</option>
                ))}
              </select>
            </div>
            <textarea
              placeholder="Comment (optional)"
              value={ratingForm.comment}
              onChange={e => setRatingForm(prev => ({ ...prev, comment: e.target.value }))}
              rows={3}
              style={{
                width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #dee2e6',
                fontSize: '14px', resize: 'vertical', boxSizing: 'border-box', marginBottom: '12px'
              }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleUpdateRating}
                disabled={ratingLoading}
                style={{
                  padding: '10px 24px', background: '#4ecdc4', color: 'white', border: 'none',
                  borderRadius: '4px', cursor: ratingLoading ? 'not-allowed' : 'pointer',
                  fontWeight: '600', fontSize: '14px'
                }}
              >
                {ratingLoading ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={() => { setEditMode(false); setRatingError(null); }}
                style={{
                  padding: '10px 24px', background: 'transparent', color: '#636e72',
                  border: '1px solid #dee2e6', borderRadius: '4px', cursor: 'pointer', fontSize: '14px'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {!isAuthenticated() && (
          <p style={{ fontSize: '14px', color: '#999', marginBottom: '20px' }}>
            <span
              onClick={() => navigate('/login')}
              style={{ color: '#4ecdc4', cursor: 'pointer', fontWeight: '600' }}
            >
              Log in
            </span>{' '}to leave a rating.
          </p>
        )}

        {/* All reviews list */}
        {ratings.length === 0 ? (
          <p style={{ color: '#bbb', fontSize: '15px' }}>No reviews yet. Be the first!</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {ratings.map(r => (
              <div key={r.id} style={{
                padding: '16px 20px', border: '1px solid #e0e0e0',
                borderRadius: '6px', background: '#fafafa'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: r.comment ? '8px' : 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontWeight: '600', color: '#2d3436', fontSize: '14px' }}>{r.user.username}</span>
                    <span style={{ color: '#f39c12', fontWeight: '700' }}>{'★'.repeat(r.score)}<span style={{ color: '#e0e0e0' }}>{'★'.repeat(5 - r.score)}</span></span>
                  </div>
                  <span style={{ fontSize: '12px', color: '#bbb' }}>
                    {new Date(r.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                </div>
                {r.comment && (
                  <p style={{ margin: 0, fontSize: '14px', color: '#636e72', lineHeight: '1.5' }}>{r.comment}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const badgeStyle = {
  padding: '6px 12px', background: '#f8f9fa', borderRadius: '4px',
  fontSize: '14px', color: '#636e72', fontWeight: '500'
};

export default SoftwareDetails;
