import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

function Favorites() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/favorites')
      .then(response => {
        const seen = new Set();
        const unique = response.data.filter(app => {
          if (seen.has(app.id)) return false;
          seen.add(app.id);
          return true;
        });
        setFavorites(unique);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching favorites:', err);
        setError('Failed to load favorites');
        setLoading(false);
      });
  }, []);

  const handleRemove = async (softwareId, e) => {
    e.stopPropagation();
    try {
      await api.delete(`/favorites/${softwareId}`);
      setFavorites(prev => prev.filter(app => app.id !== softwareId));
    } catch (err) {
      console.error('Failed to remove favorite:', err);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px',
        paddingBottom: '15px',
        borderBottom: '2px solid #e0e0e0'
      }}>
        <h1 style={{ margin: 0, fontSize: '28px' }}>My Favorites</h1>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
          <p style={{ fontSize: '18px' }}>Loading favorites...</p>
        </div>
      )}

      {error && (
        <div style={{
          padding: '20px', background: '#ffe0e0', border: '1px solid #ff6b6b',
          borderRadius: '8px', color: '#d63031'
        }}>
          <p style={{ margin: 0 }}>{error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          {favorites.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '60px 20px',
              background: '#f8f9fa', borderRadius: '8px'
            }}>
              <p style={{ fontSize: '18px', color: '#999', margin: '0 0 16px 0' }}>
                No favorites yet.
              </p>
              <button
                onClick={() => navigate('/browse')}
                style={{
                  padding: '10px 24px', background: '#4ecdc4', color: 'white',
                  border: 'none', borderRadius: '4px', cursor: 'pointer',
                  fontWeight: '600', fontSize: '15px'
                }}
              >
                Browse Software
              </button>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '20px'
            }}>
              {favorites.map((app) => (
                <div
                  key={app.id}
                  onClick={() => navigate(`/software/${app.id}`)}
                  style={{
                    padding: '20px', border: '1px solid #e0e0e0', borderRadius: '8px',
                    cursor: 'pointer', transition: 'all 0.2s ease',
                    background: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <h3 style={{ margin: 0, fontSize: '20px', color: '#2d3436' }}>
                      {app.title}
                    </h3>
                    <button
                      onClick={(e) => handleRemove(app.id, e)}
                      title="Remove from favorites"
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: '18px', color: '#e67e22', padding: '2px 4px',
                        lineHeight: 1, flexShrink: 0
                      }}
                    >
                      ★
                    </button>
                  </div>

                  <p style={{
                    margin: '0 0 15px 0', color: '#636e72', fontSize: '14px',
                    lineHeight: '1.5', display: '-webkit-box',
                    WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    overflow: 'hidden', minHeight: '42px'
                  }}>
                    {app.description || 'No description available'}
                  </p>

                  <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: '13px', color: '#636e72', background: '#f8f9fa',
                      padding: '4px 8px', borderRadius: '4px'
                    }}>
                      {app.os_compatibility || 'N/A'}
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

export default Favorites;
