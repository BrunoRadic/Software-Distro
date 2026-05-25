import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getUser, logout } from '../utils/auth';

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser();
  const onAuthPage = location.pathname === '/login' || location.pathname === '/register';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

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

        {user ? (
          <>
            <button
              onClick={() => navigate('/favorites')}
              style={linkButtonStyle}
            >
              Favorites
            </button>

            <button
              onClick={() => navigate('/downloads')}
              style={linkButtonStyle}
            >
              Downloads
            </button>

            {user.role === 'developer' && (
              <button
                onClick={() => navigate('/developer-dashboard')}
                style={linkButtonStyle}
              >
                My Uploads
              </button>
            )}

            {(user.role === 'developer' || user.role === 'admin') && (
              <button
                onClick={() => navigate('/upload')}
                style={linkButtonStyle}
              >
                Upload
              </button>
            )}

            {user.role === 'admin' && (
              <button
                onClick={() => navigate('/admin')}
                style={linkButtonStyle}
              >
                Admin Panel
              </button>
            )}

            <span style={{ color: '#636e72', fontSize: '14px' }}>
              {user.username} ({user.role})
            </span>

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
          </>
        ) : !onAuthPage && (
          <>
            <button
              onClick={() => navigate('/login')}
              style={linkButtonStyle}
            >
              Login
            </button>
            <button
              onClick={() => navigate('/register')}
              style={{
                padding: '8px 16px',
                background: '#4ecdc4',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '15px'
              }}
            >
              Register
            </button>
          </>
        )}
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