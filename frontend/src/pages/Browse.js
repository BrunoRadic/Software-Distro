import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser, logout } from '../utils/auth';

function Browse() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = getUser();
    if (!userData) {
      navigate('/login');
    } else {
      setUser(userData);
    }
  }, [navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h2>Browse Software</h2>
        <div>
          <span style={{ marginRight: '15px' }}>
            Welcome, {user.username} ({user.role})
          </span>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </div>

      <p>Software lista će biti ovdje...</p>
    </div>
  );
}

export default Browse;