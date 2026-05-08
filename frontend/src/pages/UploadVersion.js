import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

const OS_ACCEPT = {
  Windows: '.exe,.zip',
  Mac: '.dmg,.zip',
  Linux: '.AppImage,.deb,.rpm,.tar.gz,.tar,.zip',
};

function UploadVersion() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [software, setSoftware] = useState(null);
  const [platforms, setPlatforms] = useState([]);  // OSes inherited from original
  const [formData, setFormData] = useState({ version: '', description: '' });
  const [osFiles, setOsFiles] = useState({ Windows: null, Mac: null, Linux: null });
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    api.get(`/software/${id}`)
      .then(response => {
        const sw = response.data;
        setSoftware(sw);
        // Parse OS compatibility string into array
        const osList = (sw.os_compatibility || '').split(',').map(s => s.trim()).filter(Boolean);
        setPlatforms(osList);
        setLoading(false);
      })
      .catch(() => {
        navigate('/browse');
      });
  }, [id, navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (os, e) => {
    setOsFiles({ ...osFiles, [os]: e.target.files[0] || null });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.version.trim()) { setFormError('Version number is required'); return; }

    const uploadedPlatforms = platforms.filter(os => osFiles[os]);
    if (uploadedPlatforms.length === 0) {
      setFormError('Please provide at least one platform file');
      return;
    }

    const data = new FormData();
    data.append('version', formData.version);
    data.append('description', formData.description);
    if (osFiles.Windows) data.append('file_windows', osFiles.Windows);
    if (osFiles.Mac) data.append('file_mac', osFiles.Mac);
    if (osFiles.Linux) data.append('file_linux', osFiles.Linux);

    setUploading(true);
    try {
      await api.post(`/software/${id}/upload-version`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      navigate(`/software/${id}`);
    } catch (err) {
      console.error('Upload error:', err);
      setFormError('Upload failed: ' + (err.response?.data?.detail || 'Unknown error'));
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px', color: '#999' }}>Loading...</div>;
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
      <div style={{ marginBottom: '30px' }}>
        <button onClick={() => navigate(`/software/${id}`)} style={{
          padding: '8px 16px', background: 'transparent', color: '#4ecdc4',
          border: '1px solid #4ecdc4', borderRadius: '4px', cursor: 'pointer', marginBottom: '20px'
        }}>
          Back to {software?.title}
        </button>

        <h1 style={{ margin: '0 0 10px 0', fontSize: '32px', color: '#2d3436' }}>
          Upload New Version
        </h1>
        <p style={{ margin: 0, color: '#636e72', fontSize: '15px' }}>
          Uploading a new version of: <strong>{software?.title}</strong>
        </p>
      </div>

      <div style={{
        padding: '15px', background: '#e8f8f7', border: '1px solid #4ecdc4',
        borderRadius: '4px', marginBottom: '30px', fontSize: '14px', color: '#2d3436'
      }}>
        <strong>Note:</strong> Title, category, and developer cannot be changed.
        Upload updated files for each platform you want to include in this release.
      </div>

      <form onSubmit={handleSubmit} style={{
        background: 'white', padding: '30px', borderRadius: '8px',
        border: '1px solid #e0e0e0', boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
      }}>
        {/* Current version info */}
        <div style={{
          padding: '15px', background: '#f8f9fa', borderRadius: '4px', marginBottom: '25px'
        }}>
          <p style={{ margin: '0 0 8px 0', color: '#636e72', fontSize: '13px', fontWeight: '600' }}>
            CURRENT VERSION
          </p>
          <p style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#2d3436' }}>
            v{software?.version}
          </p>
        </div>

        {/* New version number */}
        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>
            New Version Number <span style={{ color: '#ff6b6b' }}>*</span>
          </label>
          <input type="text" name="version" value={formData.version} onChange={handleChange}
            required placeholder="e.g., 2.0.0, 1.1.5" style={inputStyle} />
          <small style={{ display: 'block', marginTop: '6px', color: '#999', fontSize: '12px' }}>
            Follow semantic versioning: MAJOR.MINOR.PATCH
          </small>
        </div>

        {/* Changelog */}
        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>
            Changelog / What's New <span style={{ color: '#ff6b6b' }}>*</span>
          </label>
          <textarea name="description" value={formData.description} onChange={handleChange}
            required rows="6" placeholder="Describe what changed in this version..."
            style={{ ...inputStyle, resize: 'vertical' }} />
        </div>

        {/* Per-platform file inputs */}
        <div style={{ marginBottom: '30px' }}>
          <label style={labelStyle}>
            Updated Files <span style={{ color: '#ff6b6b' }}>*</span>
          </label>
          <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#636e72' }}>
            Upload the new binary for each platform. You can skip platforms that haven't changed.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {platforms.length === 0 ? (
              <p style={{ color: '#999', fontSize: '14px' }}>No platform info available for this software.</p>
            ) : (
              platforms.map(os => (
                <div key={os} style={{
                  border: `1px solid ${osFiles[os] ? '#4ecdc4' : '#dee2e6'}`,
                  borderRadius: '6px', overflow: 'hidden', transition: 'border-color 0.2s'
                }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '12px 16px', background: osFiles[os] ? '#f0fcfb' : '#f8f9fa'
                  }}>
                    <span style={{ fontSize: '15px', fontWeight: '600', color: '#2d3436' }}>
                      {os}
                    </span>

                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input type="file" id={`file-${os}`} accept={OS_ACCEPT[os]}
                        onChange={e => handleFileChange(os, e)} style={{ display: 'none' }} />
                      <label htmlFor={`file-${os}`} style={{
                        padding: '6px 14px', background: 'white', border: '1px solid #dee2e6',
                        borderRadius: '4px', cursor: 'pointer', fontSize: '13px',
                        color: '#636e72', fontWeight: '500', transition: 'all 0.2s'
                      }}>
                        {osFiles[os] ? 'Change file' : 'Choose file'}
                      </label>

                      {osFiles[os] && (
                        <span style={{ fontSize: '13px', color: '#155724', fontWeight: '500' }}>
                          {osFiles[os].name} ({(osFiles[os].size / (1024 * 1024)).toFixed(2)} MB)
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ padding: '6px 16px', background: 'white', borderTop: '1px solid #f0f0f0' }}>
                    <small style={{ fontSize: '12px', color: '#999' }}>
                      Accepted: {OS_ACCEPT[os]}
                    </small>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Error */}
        {formError && (
          <div style={{
            marginBottom: '16px', padding: '12px 16px',
            background: '#f8d7da', border: '1px solid #f5c6cb',
            borderRadius: '4px', color: '#721c24', fontSize: '14px'
          }}>
            {formError}
          </div>
        )}

        {/* Submit */}
        <button type="submit" disabled={uploading} style={{
          width: '100%', padding: '14px',
          background: uploading ? '#95e1d3' : '#4ecdc4',
          color: 'white', border: 'none', borderRadius: '4px',
          fontSize: '16px', fontWeight: '600',
          cursor: uploading ? 'not-allowed' : 'pointer'
        }}>
          {uploading ? 'Uploading...' : 'Upload New Version'}
        </button>
      </form>
    </div>
  );
}

const labelStyle = {
  display: 'block', marginBottom: '6px',
  fontSize: '14px', fontWeight: '600', color: '#2d3436'
};

const inputStyle = {
  width: '100%', padding: '10px 12px', fontSize: '15px',
  border: '1px solid #dee2e6', borderRadius: '4px',
  boxSizing: 'border-box', fontFamily: 'inherit'
};

export default UploadVersion;
