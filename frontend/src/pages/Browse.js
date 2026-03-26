import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser, logout } from '../utils/auth';

function Browse() {
  const [user, setUser] = useState(null);
  const [software, setSoftware] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = getUser();
    if (!userData) {
      navigate('/login');
    } else {
      setUser(userData);
    }

    fetch('http://localhost:8000/software/public')
      .then(response => response.json())
      .then(data => setSoftware(data))
      .catch(err => console.error(err));
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

{software.length > 0 ? (
  software.map((app) => (
    <div key={app.id} style={{ marginBottom: '10px' }}>
      <h3>{app.title}</h3>
      <p>{app.description}</p>
      <p>Version: {app.version}</p>
      <p>OS: {app.os_compatibility}</p>
      <p>Downloads: {app.download_count}</p>
    </div>
  ))
) : (
  <p>Loading...</p>
)}
    </div>
  );
}

export default Browse;