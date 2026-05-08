import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

function Register() {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'user'
  });
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/register', {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        role: formData.role
      });

      navigate('/login');
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      maxWidth: '450px', 
      margin: '80px auto', 
      padding: '20px' 
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1 style={{ 
          margin: '0 0 10px 0',
          fontSize: '32px',
          color: '#2d3436'
        }}>
          Create Account
        </h1>
        <p style={{ 
          margin: 0,
          color: '#636e72',
          fontSize: '15px'
        }}>
          Join the software distribution platform
        </p>
      </div>

      {/* Form */}
      <form 
        onSubmit={handleSubmit}
        style={{
          background: 'white',
          padding: '30px',
          borderRadius: '8px',
          border: '1px solid #e0e0e0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
        }}
      >
        {/* Error Message */}
        {error && (
          <div style={{ 
            padding: '12px',
            marginBottom: '20px',
            background: '#ffe0e0', 
            border: '1px solid #ff6b6b',
            borderRadius: '4px',
            color: '#d63031'
          }}>
            {error}
          </div>
        )}

        {/* Username */}
        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>
            Username <span style={{ color: '#ff6b6b' }}>*</span>
          </label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            required
            minLength="3"
            placeholder="Choose a username"
            style={inputStyle}
          />
        </div>

        {/* Email */}
        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>
            Email <span style={{ color: '#ff6b6b' }}>*</span>
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            placeholder="your@email.com"
            style={inputStyle}
          />
        </div>

        {/* Password */}
        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>
            Password <span style={{ color: '#ff6b6b' }}>*</span>
          </label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            minLength="6"
            placeholder="At least 6 characters"
            style={inputStyle}
          />
        </div>

        {/* Confirm Password */}
        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>
            Confirm Password <span style={{ color: '#ff6b6b' }}>*</span>
          </label>
          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            minLength="6"
            placeholder="Re-enter your password"
            style={inputStyle}
          />
        </div>

        {/* Role Selection */}
        <div style={{ marginBottom: '25px' }}>
          <label style={labelStyle}>
            I want to register as:
          </label>
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            style={inputStyle}
          >
            <option value="user">User (Download software)</option>
            <option value="developer">Developer (Upload & download software)</option>
          </select>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px',
            background: loading ? '#95e1d3' : '#4ecdc4',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s',
            marginBottom: '15px'
          }}
        >
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>

        {/* Login Link */}
        <p style={{ 
          textAlign: 'center',
          margin: 0,
          color: '#636e72',
          fontSize: '14px'
        }}>
          Already have an account?{' '}
          <span
            onClick={() => navigate('/login')}
            style={{
              color: '#4ecdc4',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            Login here
          </span>
        </p>
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
  padding: '12px',
  fontSize: '15px',
  border: '1px solid #dee2e6',
  borderRadius: '4px',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s',
  fontFamily: 'inherit'
};

export default Register;