import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const OS_LIST = ['Windows', 'Mac', 'Linux'];

const OS_ACCEPT = {
  Windows: '.exe,.zip',
  Mac: '.dmg,.zip',
  Linux: '.AppImage,.deb,.rpm,.tar.gz,.tar,.zip',
};

function UploadSoftware() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    version: '',
    category_id: '',
    license: '',
    price_type: 'free',
    price: '',
    external_link: '',
  });

  const [categories, setCategories] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [osSupport, setOsSupport] = useState({ Windows: false, Mac: false, Linux: false });
  const [osFiles, setOsFiles] = useState({ Windows: null, Mac: null, Linux: null });
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    api.get('/categories')
      .then(r => setCategories(r.data))
      .catch(err => console.error('Failed to fetch categories:', err));
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleOsChange = (os) => {
    const next = { ...osSupport, [os]: !osSupport[os] };
    setOsSupport(next);
    if (!next[os]) {
      setOsFiles(prev => ({ ...prev, [os]: null }));
    }
  };

  const handleFileChange = (os, e) => {
    setOsFiles({ ...osFiles, [os]: e.target.files[0] || null });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.title.trim()) { setFormError('Title is required'); return; }
    if (!formData.category_id) { setFormError('Please select a category'); return; }
    if (formData.price_type === 'paid' && (!formData.price || formData.price <= 0)) {
      setFormError('Price must be greater than 0 for paid software');
      return;
    }

    const selectedOS = OS_LIST.filter(os => osSupport[os]);
    if (selectedOS.length === 0) { setFormError('Please select at least one OS'); return; }

    const missingFiles = selectedOS.filter(os => !osFiles[os]);
    if (missingFiles.length > 0) {
      setFormError(`Please provide a file for: ${missingFiles.join(', ')}`);
      return;
    }

    const data = new FormData();
    data.append('title', formData.title);
    data.append('description', formData.description);
    data.append('version', formData.version);
    data.append('category_id', formData.category_id);
    data.append('os_compatibility', selectedOS.join(','));
    data.append('license', formData.license);
    data.append('price_type', formData.price_type);
    if (formData.price_type === 'paid') data.append('price', formData.price);
    if (formData.external_link) data.append('external_link', formData.external_link);

    if (osFiles.Windows) data.append('file_windows', osFiles.Windows);
    if (osFiles.Mac) data.append('file_mac', osFiles.Mac);
    if (osFiles.Linux) data.append('file_linux', osFiles.Linux);

    setUploading(true);
    try {
      await api.post('/software/upload', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      navigate('/browse');
    } catch (err) {
      console.error('Upload error:', err);
      setFormError('Upload failed: ' + (err.response?.data?.detail || 'Unknown error'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ margin: '0 0 10px 0', fontSize: '32px', color: '#2d3436' }}>
          Upload New Software
        </h1>
        <p style={{ margin: 0, color: '#636e72', fontSize: '15px' }}>
          Fill in the details below. Your upload will be reviewed by an admin before going live.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{
        background: 'white', padding: '30px', borderRadius: '8px',
        border: '1px solid #e0e0e0', boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
      }}>
        {/* Title */}
        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>Title <span style={{ color: '#ff6b6b' }}>*</span></label>
          <input type="text" name="title" value={formData.title} onChange={handleChange}
            required placeholder="e.g., My Awesome App" style={inputStyle} />
        </div>

        {/* Description */}
        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>Description <span style={{ color: '#ff6b6b' }}>*</span></label>
          <textarea name="description" value={formData.description} onChange={handleChange}
            required rows="5" placeholder="Describe what your software does..."
            style={{ ...inputStyle, resize: 'vertical' }} />
        </div>

        {/* Version & Category */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <div>
            <label style={labelStyle}>Version <span style={{ color: '#ff6b6b' }}>*</span></label>
            <input type="text" name="version" value={formData.version} onChange={handleChange}
              required placeholder="e.g., 1.0.0" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Category <span style={{ color: '#ff6b6b' }}>*</span></label>
            <select name="category_id" value={formData.category_id} onChange={handleChange}
              required style={inputStyle}>
              <option value="">Select category...</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* OS Compatibility + per-OS file inputs */}
        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>
            Platform Files <span style={{ color: '#ff6b6b' }}>*</span>
          </label>
          <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#636e72' }}>
            Select platforms and upload the corresponding installer/binary for each.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {OS_LIST.map(os => (
              <div key={os} style={{
                border: `1px solid ${osSupport[os] ? '#4ecdc4' : '#dee2e6'}`,
                borderRadius: '6px',
                overflow: 'hidden',
                transition: 'border-color 0.2s'
              }}>
                {/* OS toggle header */}
                <label style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '12px 16px', cursor: 'pointer',
                  background: osSupport[os] ? '#f0fcfb' : '#f8f9fa',
                  userSelect: 'none'
                }}>
                  <input type="checkbox" checked={osSupport[os]}
                    onChange={() => handleOsChange(os)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                  <span style={{ fontSize: '15px', fontWeight: '600', color: '#2d3436' }}>
                    {os}
                  </span>
                </label>

                {/* File input — shows only when OS is checked */}
                {osSupport[os] && (
                  <div style={{ padding: '12px 16px', borderTop: '1px solid #e0e0e0', background: 'white' }}>
                    <input
                      type="file"
                      id={`file-${os}`}
                      accept={OS_ACCEPT[os]}
                      onChange={e => handleFileChange(os, e)}
                      style={{ display: 'none' }}
                    />
                    <label htmlFor={`file-${os}`} style={{
                      display: 'inline-block', padding: '8px 16px',
                      background: '#f8f9fa', border: '2px dashed #dee2e6',
                      borderRadius: '4px', cursor: 'pointer', color: '#636e72',
                      fontWeight: '500', fontSize: '14px', transition: 'all 0.2s'
                    }}
                      onMouseEnter={e => { e.target.style.borderColor = '#4ecdc4'; e.target.style.background = '#e8f8f7'; }}
                      onMouseLeave={e => { e.target.style.borderColor = '#dee2e6'; e.target.style.background = '#f8f9fa'; }}
                    >
                      Choose {os} file
                    </label>

                    {osFiles[os] ? (
                      <span style={{
                        marginLeft: '12px', fontSize: '14px',
                        color: '#155724', fontWeight: '500'
                      }}>
                        {osFiles[os].name} ({(osFiles[os].size / (1024 * 1024)).toFixed(2)} MB)
                      </span>
                    ) : (
                      <span style={{ marginLeft: '12px', fontSize: '13px', color: '#ff6b6b' }}>
                        File required
                      </span>
                    )}

                    <div style={{ marginTop: '6px', fontSize: '12px', color: '#999' }}>
                      Accepted: {OS_ACCEPT[os]}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* License */}
        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>License <span style={{ color: '#ff6b6b' }}>*</span></label>
          <input type="text" name="license" value={formData.license} onChange={handleChange}
            required placeholder="e.g., MIT, GPL, Proprietary" style={inputStyle} />
        </div>

        {/* Price Type & Price */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: formData.price_type === 'paid' ? '1fr 1fr' : '1fr',
          gap: '20px', marginBottom: '20px'
        }}>
          <div>
            <label style={labelStyle}>Price Type <span style={{ color: '#ff6b6b' }}>*</span></label>
            <select name="price_type" value={formData.price_type} onChange={handleChange}
              required style={inputStyle}>
              <option value="free">Free</option>
              <option value="paid">Paid</option>
            </select>
          </div>
          {formData.price_type === 'paid' && (
            <div>
              <label style={labelStyle}>Price ($) <span style={{ color: '#ff6b6b' }}>*</span></label>
              <input type="number" name="price" value={formData.price} onChange={handleChange}
                required min="0.01" step="0.01" placeholder="e.g., 9.99" style={inputStyle} />
            </div>
          )}
        </div>

        {/* External Link */}
        <div style={{ marginBottom: '30px' }}>
          <label style={labelStyle}>External Link (optional)</label>
          <input type="url" name="external_link" value={formData.external_link}
            onChange={handleChange} placeholder="e.g., https://github.com/yourproject"
            style={inputStyle} />
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
          cursor: uploading ? 'not-allowed' : 'pointer', transition: 'all 0.2s'
        }}
          onMouseEnter={e => { if (!uploading) e.target.style.background = '#3bb3aa'; }}
          onMouseLeave={e => { if (!uploading) e.target.style.background = '#4ecdc4'; }}
        >
          {uploading ? 'Uploading...' : 'Upload Software'}
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
  boxSizing: 'border-box', transition: 'border-color 0.2s', fontFamily: 'inherit'
};

export default UploadSoftware;
