import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser, logout } from '../utils/auth';

function Navbar() {
  const navigate = useNavigate();
  const user = getUser();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null; 

  return (
    <nav style={{
      background: 'white',
      borderBottom: '2px solid #e0e0e0',
      padding: '15px 30px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px'
    }}>
      {/* Logo / Title */}
      <h2 
        onClick={() => navigate('/browse')}
        style={{ 
          margin: 0, 
          cursor: 'pointer',
          color: '#2d3436',
          fontSize: '24px'
        }}
      >
        Software Hub
      </h2>

      {/* Links */}
      <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
        <button
          onClick={() => navigate('/browse')}
          style={linkButtonStyle}
        >
          Browse
        </button>

        <button
          onClick={() => navigate('/favorites')}
          style={linkButtonStyle}
        >
          Favorites
        </button>

        {/* Upload - samo za developer/admin */}
        {(user.role === 'developer' || user.role === 'admin') && (
          <button 
            onClick={() => navigate('/upload')}
            style={linkButtonStyle}
          >
            Upload
          </button>
        )}

        {/* Admin Panel - samo za admin */}
        {user.role === 'admin' && (
          <button 
            onClick={() => navigate('/admin')}
            style={linkButtonStyle}
          >
            Admin Panel
          </button>
        )}

        {/* User Info */}
        <span style={{ color: '#636e72', fontSize: '14px' }}>
          {user.username} ({user.role})
        </span>

        {/* Logout */}
        <button 
          onClick={handleLogout}
          style={{
            padding: '8px 16px',
            background: '#ff6b6b',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          Logout
        </button>
      </div>
    </nav>
  );
}

const linkButtonStyle = {
  background: 'transparent',
  border: 'none',
  color: '#4ecdc4',
  fontSize: '16px',
  fontWeight: '500',
  cursor: 'pointer',
  padding: '8px 12px'
};

export default Navbar;