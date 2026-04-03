import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

function UploadSoftware() {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    version: '',
    category_id: '',
    os_compatibility: '',
    license: '',
    price_type: 'free',
    price: '',
    external_link: '',
    file: null
  });
  
  const [categories, setCategories] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    // Fetch categories
    api.get('/categories')
      .then(response => setCategories(response.data))
      .catch(err => console.error('Failed to fetch categories:', err));
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleFileChange = (e) => {
    setFormData({
      ...formData,
      file: e.target.files[0]
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.title.trim()) {
      alert('Title is required');
      return;
    }
    
    if (!formData.file) {
      alert('Please select a file to upload');
      return;
    }

    if (!formData.category_id) {
      alert('Please select a category');
      return;
    }

    if (formData.price_type === 'paid' && (!formData.price || formData.price <= 0)) {
      alert('Price must be greater than 0 for paid software');
      return;
    }

    const data = new FormData();
    data.append('title', formData.title);
    data.append('description', formData.description);
    data.append('version', formData.version);
    data.append('category_id', formData.category_id);
    data.append('os_compatibility', formData.os_compatibility);
    data.append('license', formData.license);
    data.append('price_type', formData.price_type);
    
    if (formData.price_type === 'paid') {
      data.append('price', formData.price);
    }
    
    if (formData.external_link) {
      data.append('external_link', formData.external_link);
    }
    
    data.append('file', formData.file);

    setUploading(true);

    try {
      const response = await api.post('/software/upload', data, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      alert('Software uploaded successfully! Awaiting admin approval.');
      navigate('/browse');
    } catch (err) {
      console.error('Upload error:', err);
      alert('Upload failed: ' + (err.response?.data?.detail || 'Unknown error'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '40px 20px'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '30px' }}>
        {/* <button 
          onClick={() => navigate('/browse')}
          style={{
            padding: '8px 16px',
            background: 'transparent',
            color: '#4ecdc4',
            border: '1px solid #4ecdc4',
            borderRadius: '4px',
            cursor: 'pointer',
            marginBottom: '20px'
          }}
        >
          ← Back to Browse
        </button> */}
        
        <h1 style={{ 
          margin: '0 0 10px 0',
          fontSize: '32px',
          color: '#2d3436'
        }}>
          Upload New Software
        </h1>
        <p style={{ 
          margin: 0,
          color: '#636e72',
          fontSize: '15px'
        }}>
          Fill in the details below. Your upload will be reviewed by an admin before going live.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} style={{
        background: 'white',
        padding: '30px',
        borderRadius: '8px',
        border: '1px solid #e0e0e0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
      }}>
        {/* Title */}
        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>
            Title <span style={{ color: '#ff6b6b' }}>*</span>
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            placeholder="e.g., My Awesome App"
            style={inputStyle}
          />
        </div>

        {/* Description */}
        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>
            Description <span style={{ color: '#ff6b6b' }}>*</span>
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
            rows="5"
            placeholder="Describe what your software does..."
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        {/* Version & Category - Grid */}
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '20px',
          marginBottom: '20px'
        }}>
          {/* Version */}
          <div>
            <label style={labelStyle}>
              Version <span style={{ color: '#ff6b6b' }}>*</span>
            </label>
            <input
              type="text"
              name="version"
              value={formData.version}
              onChange={handleChange}
              required
              placeholder="e.g., 1.0.0"
              style={inputStyle}
            />
          </div>

          {/* Category */}
          <div>
            <label style={labelStyle}>
              Category <span style={{ color: '#ff6b6b' }}>*</span>
            </label>
            <select
              name="category_id"
              value={formData.category_id}
              onChange={handleChange}
              required
              style={inputStyle}
            >
              <option value="">Select category...</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* OS & License - Grid */}
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '20px',
          marginBottom: '20px'
        }}>
          {/* OS Compatibility */}
          <div>
            <label style={labelStyle}>
              OS Compatibility <span style={{ color: '#ff6b6b' }}>*</span>
            </label>
            <input
              type="text"
              name="os_compatibility"
              value={formData.os_compatibility}
              onChange={handleChange}
              required
              placeholder="e.g., Windows,Mac,Linux"
              style={inputStyle}
            />
            <small style={{ color: '#999', fontSize: '12px' }}>
              Comma-separated (e.g., Windows,Mac,Linux)
            </small>
          </div>

          {/* License */}
          <div>
            <label style={labelStyle}>
              License <span style={{ color: '#ff6b6b' }}>*</span>
            </label>
            <input
              type="text"
              name="license"
              value={formData.license}
              onChange={handleChange}
              required
              placeholder="e.g., MIT, GPL, Proprietary"
              style={inputStyle}
            />
          </div>
        </div>

        {/* Price Type & Price - Grid */}
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: formData.price_type === 'paid' ? '1fr 1fr' : '1fr',
          gap: '20px',
          marginBottom: '20px'
        }}>
          {/* Price Type */}
          <div>
            <label style={labelStyle}>
              Price Type <span style={{ color: '#ff6b6b' }}>*</span>
            </label>
            <select
              name="price_type"
              value={formData.price_type}
              onChange={handleChange}
              required
              style={inputStyle}
            >
              <option value="free">Free</option>
              <option value="paid">Paid</option>
            </select>
          </div>

          {/* Price (conditional) */}
          {formData.price_type === 'paid' && (
            <div>
              <label style={labelStyle}>
                Price ($) <span style={{ color: '#ff6b6b' }}>*</span>
              </label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                required
                min="0.01"
                step="0.01"
                placeholder="e.g., 9.99"
                style={inputStyle}
              />
            </div>
          )}
        </div>

        {/* External Link */}
        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>
            External Link (optional)
          </label>
          <input
            type="url"
            name="external_link"
            value={formData.external_link}
            onChange={handleChange}
            placeholder="e.g., https://github.com/yourproject"
            style={inputStyle}
          />
        </div>

        {/* File Upload */}
        <div style={{ marginBottom: '30px' }}>
          <label style={labelStyle}>
            Software File <span style={{ color: '#ff6b6b' }}>*</span>
          </label>
          
          <input
            type="file"
            id="file-upload"
            onChange={handleFileChange}
            accept=".exe,.zip,.dmg,.AppImage,.deb,.rpm,.tar.gz"
            required
            style={{ display: 'none' }}
          />
          
          <label
            htmlFor="file-upload"
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              background: '#f8f9fa',
              border: '2px dashed #dee2e6',
              borderRadius: '4px',
              cursor: 'pointer',
              color: '#636e72',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.target.style.borderColor = '#4ecdc4';
              e.target.style.background = '#e8f8f7';
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = '#dee2e6';
              e.target.style.background = '#f8f9fa';
            }}
          >
            Choose File
          </label>

          {formData.file && (
            <div style={{
              marginTop: '10px',
              padding: '10px',
              background: '#d4edda',
              borderRadius: '4px',
              color: '#155724'
            }}>
              ✓ Selected: <strong>{formData.file.name}</strong> ({(formData.file.size / (1024 * 1024)).toFixed(2)} MB)
            </div>
          )}

          <small style={{ 
            display: 'block',
            marginTop: '8px',
            color: '#999',
            fontSize: '12px'
          }}>
            Accepted formats: .exe, .zip, .dmg, .AppImage, .deb, .rpm, .tar.gz, .tar (Max 500MB)
          </small>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={uploading}
          style={{
            width: '100%',
            padding: '14px',
            background: uploading ? '#95e1d3' : '#4ecdc4',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: uploading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            if (!uploading) e.target.style.background = '#3bb3aa';
          }}
          onMouseLeave={(e) => {
            if (!uploading) e.target.style.background = '#4ecdc4';
          }}
        >
          {uploading ? 'Uploading...' : 'Upload Software'}
        </button>
      </form>
    </div>
  );
}

// Reusable styles
const labelStyle = {
  display: 'block',
  marginBottom: '6px',
  fontSize: '14px',
  fontWeight: '600',
  color: '#2d3436'
};

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  fontSize: '15px',
  border: '1px solid #dee2e6',
  borderRadius: '4px',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s',
  fontFamily: 'inherit'
};

export default UploadSoftware;