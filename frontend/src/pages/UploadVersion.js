import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

function UploadVersion() {
  const { id } = useParams();  // software_id iz URL-a
  const navigate = useNavigate();
  
  const [software, setSoftware] = useState(null);
  const [formData, setFormData] = useState({
    version: '',
    description: '',
    file: null
  });
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch original software details
    api.get(`/software/${id}`)
      .then(response => {
        setSoftware(response.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching software:', err);
        alert('Software not found');
        navigate('/browse');
      });
  }, [id, navigate]);

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

    if (!formData.version.trim()) {
      alert('Version number is required');
      return;
    }

    if (!formData.file) {
      alert('Please select a file');
      return;
    }

    const data = new FormData();
    data.append('version', formData.version);
    data.append('description', formData.description);
    data.append('file', formData.file);

    setUploading(true);

    try {
      await api.post(`/software/${id}/upload-version`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      alert('New version uploaded! Waiting for admin approval.');
      navigate(`/software/${id}`);
    } catch (err) {
      console.error('Upload error:', err);
      alert('Upload failed: ' + (err.response?.data?.detail || 'Unknown error'));
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: '#999' }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '40px 20px'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '30px' }}>
        <button 
          onClick={() => navigate(`/software/${id}`)}
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
          Back to {software?.title}
        </button>
        
        <h1 style={{ 
          margin: '0 0 10px 0',
          fontSize: '32px',
          color: '#2d3436'
        }}>
          Upload New Version
        </h1>
        <p style={{ 
          margin: 0,
          color: '#636e72',
          fontSize: '15px'
        }}>
          Uploading a new version of: <strong>{software?.title}</strong>
        </p>
      </div>

      {/* Info Box */}
      <div style={{
        padding: '15px',
        background: '#e8f8f7',
        border: '1px solid #4ecdc4',
        borderRadius: '4px',
        marginBottom: '30px',
        fontSize: '14px',
        color: '#2d3436'
      }}>
        <strong>Note:</strong> Title, category, and developer cannot be changed. 
        Only provide the new version number, changelog, and updated file.
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} style={{
        background: 'white',
        padding: '30px',
        borderRadius: '8px',
        border: '1px solid #e0e0e0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
      }}>
        {/* Previous Version Info */}
        <div style={{
          padding: '15px',
          background: '#f8f9fa',
          borderRadius: '4px',
          marginBottom: '25px'
        }}>
          <p style={{ 
            margin: '0 0 8px 0',
            color: '#636e72',
            fontSize: '13px',
            fontWeight: '600'
          }}>
            CURRENT VERSION
          </p>
          <p style={{ 
            margin: 0,
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#2d3436'
          }}>
            v{software?.version}
          </p>
        </div>

        {/* New Version */}
        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>
            New Version Number <span style={{ color: '#ff6b6b' }}>*</span>
          </label>
          <input
            type="text"
            name="version"
            value={formData.version}
            onChange={handleChange}
            required
            placeholder="e.g., 2.0.0, 1.1.5"
            style={inputStyle}
          />
          <small style={{ 
            display: 'block',
            marginTop: '6px',
            color: '#999',
            fontSize: '12px'
          }}>
            Follow semantic versioning: MAJOR.MINOR.PATCH
          </small>
        </div>

        {/* Changelog / Description */}
        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>
            Changelog / What's New <span style={{ color: '#ff6b6b' }}>*</span>
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
            rows="6"
            placeholder="Describe what changed in this version..."
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        {/* File Upload */}
        <div style={{ marginBottom: '30px' }}>
          <label style={labelStyle}>
            Updated Software File <span style={{ color: '#ff6b6b' }}>*</span>
          </label>
          
          <input
            type="file"
            id="file-upload"
            onChange={handleFileChange}
            accept=".exe,.zip,.dmg,.AppImage,.deb,.rpm,.tar.gz, .tar"
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
              fontWeight: '500'
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
              Selected: <strong>{formData.file.name}</strong> 
              ({(formData.file.size / (1024 * 1024)).toFixed(2)} MB)
            </div>
          )}
        </div>

        {/* Submit */}
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
            cursor: uploading ? 'not-allowed' : 'pointer'
          }}
        >
          {uploading ? 'Uploading...' : 'Upload New Version'}
        </button>
      </form>
    </div>
  );
}

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
  fontFamily: 'inherit'
};

export default UploadVersion;