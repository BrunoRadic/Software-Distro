import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { isAuthenticated } from '../utils/auth';

function SoftwareDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [software, setSoftware] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get(`/software/${id}`)
      .then(response => {
        setSoftware(response.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching software:', err);
        setError(err.response?.data?.detail || 'Failed to load software');
        setLoading(false);
      });
  }, [id]);

  const handleDownload = async () => {
    if (!isAuthenticated()) {
      navigate('/login');
      return;
    }

    setDownloading(true);
    
    try {
      const response = await api.get(`/software/${id}/download`);
      const { download_url } = response.data;
      
      window.open(download_url, '_blank');
      
      setSoftware(prev => ({
        ...prev,
        download_count: prev.download_count + 1
      }));
      
      setDownloading(false);
    } catch (err) {
      console.error('Download error:', err);
      alert(err.response?.data?.detail || 'Download failed');
      setDownloading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getPriceDisplay = () => {
    if (!software) return '';
    if (software.price_type === 'free') return 'Free';
    if (software.price_type === 'paid' && software.price) {
      return `$${software.price.toFixed(2)}`;
    }
    return 'N/A';
  };

  // Loading state
  if (loading) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '60px 20px',
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        <p style={{ fontSize: '18px', color: '#999' }}>Loading software details...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={{ 
        maxWidth: '800px', 
        margin: '40px auto',
        padding: '20px'
      }}>
        <div style={{ 
          padding: '20px', 
          background: '#ffe0e0', 
          border: '1px solid #ff6b6b',
          borderRadius: '8px',
          color: '#d63031',
          marginBottom: '20px'
        }}>
          <p style={{ margin: 0 }}>{error}</p>
        </div>
        <button 
          onClick={() => navigate('/browse')}
          style={{
            padding: '10px 20px',
            background: '#4ecdc4',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          ← Back to Browse
        </button>
      </div>
    );
  }

  // Main content
  return (
    <div style={{ 
      maxWidth: '900px', 
      margin: '0 auto',
      padding: '30px 20px'
    }}>
      {/* Header with Back button and Download */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px'
      }}>
        <button 
          onClick={() => navigate('/browse')}
          style={{
            padding: '10px 20px',
            background: 'transparent',
            color: '#4ecdc4',
            border: '1px solid #4ecdc4',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: '500',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = '#4ecdc4';
            e.target.style.color = 'white';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'transparent';
            e.target.style.color = '#4ecdc4';
          }}
        >
          ← Back to Browse
        </button>

        {isAuthenticated() ? (
          <button 
            onClick={handleDownload}
            disabled={downloading || software?.status !== 'approved'}
            style={{
              padding: '12px 30px',
              background: downloading ? '#95e1d3' : '#4ecdc4',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: downloading || software?.status !== 'approved' ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              fontSize: '16px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (!downloading && software?.status === 'approved') {
                e.target.style.background = '#3bb3aa';
              }
            }}
            onMouseLeave={(e) => {
              if (!downloading) {
                e.target.style.background = '#4ecdc4';
              }
            }}
          >
            {downloading ? '⬇ Downloading...' : '⬇ Download'}
          </button>
        ) : (
          <button 
            onClick={() => navigate('/login')}
            style={{
              padding: '12px 30px',
              background: '#ff6b6b',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '16px'
            }}
          >
            Login to Download
          </button>
        )}
      </div>

      {/* Main Content Card */}
      <div style={{ 
        background: 'white',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: '40px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
      }}>
        {/* Title */}
        <h1 style={{ 
          margin: '0 0 20px 0',
          fontSize: '36px',
          color: '#2d3436'
        }}>
          {software?.title}
        </h1>

        {/* Meta badges */}
        <div style={{ 
          display: 'flex', 
          gap: '12px',
          marginBottom: '30px',
          flexWrap: 'wrap'
        }}>
          <span style={{ 
            padding: '6px 12px',
            background: '#f8f9fa',
            borderRadius: '4px',
            fontSize: '14px',
            color: '#636e72',
            fontWeight: '500'
          }}>
            Version {software?.version}
          </span>
          
          <span style={{ 
            padding: '6px 12px',
            background: '#f8f9fa',
            borderRadius: '4px',
            fontSize: '14px',
            color: '#636e72',
            fontWeight: '500'
          }}>
            {software?.os_compatibility || 'N/A'}
          </span>
          
          <span style={{ 
            padding: '6px 12px',
            background: '#f8f9fa',
            borderRadius: '4px',
            fontSize: '14px',
            color: '#636e72',
            fontWeight: '500'
          }}>
            {software?.license || 'N/A'}
          </span>
          
          <span style={{ 
            padding: '6px 12px',
            background: software?.price_type === 'free' ? '#d4edda' : '#fff3cd',
            borderRadius: '4px',
            fontSize: '14px',
            color: software?.price_type === 'free' ? '#155724' : '#856404',
            fontWeight: '600'
          }}>
            {getPriceDisplay()}
          </span>
        </div>

        {/* Description */}
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ 
            fontSize: '18px',
            color: '#2d3436',
            marginBottom: '12px'
          }}>
            Description
          </h3>
          <p style={{ 
            fontSize: '15px',
            lineHeight: '1.7',
            color: '#636e72',
            whiteSpace: 'pre-wrap'
          }}>
            {software?.description || 'No description available.'}
          </p>
        </div>

        {/* External Link */}
        {software?.external_link && (
          <div style={{ marginBottom: '30px' }}>
            <a 
              href={software.external_link}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: '#4ecdc4',
                textDecoration: 'none',
                fontSize: '15px',
                fontWeight: '500'
              }}
            >
              🔗 Visit Project Website →
            </a>
          </div>
        )}

        {/* Divider */}
        <hr style={{ 
          border: 'none',
          borderTop: '1px solid #e0e0e0',
          margin: '30px 0'
        }} />

        {/* Details Grid */}
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          marginBottom: '20px'
        }}>
          <div>
            <p style={{ 
              fontSize: '13px',
              color: '#999',
              margin: '0 0 5px 0',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              File Size
            </p>
            <p style={{ 
              fontSize: '16px',
              color: '#2d3436',
              margin: 0,
              fontWeight: '500'
            }}>
              {formatFileSize(software?.file_size)}
            </p>
          </div>

          <div>
            <p style={{ 
              fontSize: '13px',
              color: '#999',
              margin: '0 0 5px 0',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Downloads
            </p>
            <p style={{ 
              fontSize: '16px',
              color: '#2d3436',
              margin: 0,
              fontWeight: '500'
            }}>
              {software?.download_count || 0}
            </p>
          </div>

          <div>
            <p style={{ 
              fontSize: '13px',
              color: '#999',
              margin: '0 0 5px 0',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Uploaded
            </p>
            <p style={{ 
              fontSize: '16px',
              color: '#2d3436',
              margin: 0,
              fontWeight: '500'
            }}>
              {formatDate(software?.created_at)}
            </p>
          </div>

          <div>
            <p style={{ 
              fontSize: '13px',
              color: '#999',
              margin: '0 0 5px 0',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Developer
            </p>
            <p style={{ 
              fontSize: '16px',
              color: '#2d3436',
              margin: 0,
              fontWeight: '500'
            }}>
              {software?.developer?.username || 'Unknown'}
            </p>
          </div>

          <div>
            <p style={{ 
              fontSize: '13px',
              color: '#999',
              margin: '0 0 5px 0',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Category
            </p>
            <p style={{ 
              fontSize: '16px',
              color: '#2d3436',
              margin: 0,
              fontWeight: '500'
            }}>
              {software?.category?.name || 'N/A'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SoftwareDetails;