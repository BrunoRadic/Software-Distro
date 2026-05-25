import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

function Browse() {
  const [software, setSoftware] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/categories')
      .then(response => setCategories(response.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (search) params.search = search;
    if (categoryId) params.category_id = categoryId;
    api.get('/software/public', { params })
      .then(response => {
        setSoftware(response.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching software:', err);
        setError('Failed to load software');
        setLoading(false);
      });
  }, [search, categoryId]);

  const handleSoftwareClick = (id) => {
    navigate(`/software/${id}`);
  };

  return (
    <div style={{ 
      padding: '20px', 
      maxWidth: '1200px', 
      margin: '0 auto' 
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '30px',
        paddingBottom: '15px',
        borderBottom: '2px solid #e0e0e0'
      }}>
        <h1 style={{ margin: 0, fontSize: '28px' }}>Browse Software</h1>
      </div>

      {/* Search and Filter */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search software..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: '1',
            minWidth: '200px',
            padding: '10px 14px',
            fontSize: '15px',
            border: '1px solid #e0e0e0',
            borderRadius: '6px',
            outline: 'none'
          }}
        />
        <select
          value={categoryId}
          onChange={e => setCategoryId(e.target.value)}
          style={{
            padding: '10px 14px',
            fontSize: '15px',
            border: '1px solid #e0e0e0',
            borderRadius: '6px',
            background: 'white',
            cursor: 'pointer',
            minWidth: '160px'
          }}
        >
          <option value="">All Categories</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      {/* Loading State */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
          <p style={{ fontSize: '18px' }}>Loading software...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div style={{ 
          padding: '20px', 
          background: '#ffe0e0', 
          border: '1px solid #ff6b6b',
          borderRadius: '8px',
          color: '#d63031'
        }}>
          <p style={{ margin: 0 }}>{error}</p>
        </div>
      )}

      {/* Software Grid */}
      {!loading && !error && (
        <>
          {software.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '60px 20px',
              background: '#f8f9fa',
              borderRadius: '8px'
            }}>
              <p style={{ fontSize: '18px', color: '#999', margin: 0 }}>
                No software available yet. Check back later!
              </p>
            </div>
          ) : (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '20px'
            }}>
              {software.map((app) => (
                <div 
                  key={app.id}
                  onClick={() => handleSoftwareClick(app.id)}
                  style={{ 
                    padding: '20px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    background: 'white',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
                    e.currentTarget.style.borderColor = '#4ecdc4';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
                    e.currentTarget.style.borderColor = '#e0e0e0';
                  }}
                >
                  {/* Title */}
                  <h3 style={{ 
                    margin: '0 0 10px 0',
                    fontSize: '20px',
                    color: '#2d3436'
                  }}>
                    {app.title}
                  </h3>

                  {/* Description */}
                  <p style={{ 
                    margin: '0 0 15px 0',
                    color: '#636e72',
                    fontSize: '14px',
                    lineHeight: '1.5',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    minHeight: '42px'
                  }}>
                    {app.description || 'No description available'}
                  </p>

                  {/* Meta Info */}
                  <div style={{ 
                    display: 'flex', 
                    gap: '15px',
                    marginBottom: '12px',
                    flexWrap: 'wrap'
                  }}>
                    <span style={{ 
                      fontSize: '13px',
                      color: '#636e72',
                      background: '#f8f9fa',
                      padding: '4px 8px',
                      borderRadius: '4px'
                    }}>
                      v{app.version}
                    </span>
                    <span style={{ 
                      fontSize: '13px',
                      color: '#636e72',
                      background: '#f8f9fa',
                      padding: '4px 8px',
                      borderRadius: '4px'
                    }}>
                      {app.os_compatibility || 'N/A'}
                    </span>
                  </div>

                  {/* Stats */}
                  <div style={{ 
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: '12px',
                    borderTop: '1px solid #f0f0f0'
                  }}>
                    <span style={{ fontSize: '13px', color: '#636e72' }}>
                      {app.download_count} downloads
                    </span>
                    <span style={{ 
                      fontSize: '12px',
                      color: '#4ecdc4',
                      fontWeight: '600'
                    }}>
                      View Details →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Browse;