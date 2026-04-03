import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import SoftwareAdminCard from '../components/SoftwareAdminCard';

function AdminPanel() {
    const navigate = useNavigate();
    
    const [software, setSoftware] = useState([]);
    const [statusFilter, setStatusFilter] = useState('pending');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
    fetchSoftware();
  }, [statusFilter]);

    const fetchSoftware = () => {
        setLoading(true);
        
        const params = statusFilter ? `?status_filter=${statusFilter}` : '';

        api.get(`/software${params}`)
        .then(response => {
            setSoftware(response.data);
            setLoading(false);
        })
        .catch(err => {
            console.error(err);
            setLoading(false);
        });
    };

    const handleApprove = async (id) => {
    if (!window.confirm('Approve this software?')) return;
    
    try {
      await api.patch(`/admin/software/${id}/approve`);
      alert('Software approved!');
      
      setSoftware(software.filter(s => s.id !== id));
    } catch (err) {
      console.error('Approve error:', err);
      alert('Error: ' + (err.response?.data?.detail || 'Failed to approve'));
    }
  };

   const handleReject = async (id) => {
    if (!window.confirm('Reject this software?')) return;
    
    try {
      await api.patch(`/admin/software/${id}/reject`);
      alert('Software rejected');
      
      setSoftware(software.filter(s => s.id !== id));
    } catch (err) {
      console.error('Reject error:', err);
      alert('Error: ' + (err.response?.data?.detail || 'Failed to reject'));
    }
  };

     const handleDelete = async (id) => {
    if (!window.confirm('Permanently delete this software?\n\nThis action cannot be undone.')) return;
    
    try {
      await api.delete(`/admin/software/${id}`);
      alert('Software deleted permanently');
      
      setSoftware(software.filter(s => s.id !== id));
    } catch (err) {
      console.error('Delete error:', err);
      alert('Error: ' + (err.response?.data?.detail || 'Failed to delete'));
    }
  };

    return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '30px 20px'
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
        <h1 style={{ margin: 0, fontSize: '32px', color: '#2d3436' }}>
          Admin Panel
        </h1>
        
        {/* <button 
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
        </button> */}
      </div>

      {/* Filter */}
      <div style={{ marginBottom: '25px' }}>
        <label style={{ 
          display: 'block',
          marginBottom: '8px',
          fontSize: '14px',
          fontWeight: '600',
          color: '#2d3436'
        }}>
          Filter by Status:
        </label>
        
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: '10px 15px',
            fontSize: '15px',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            background: 'white',
            cursor: 'pointer',
            minWidth: '200px'
          }}
        >
          <option value="">All Software</option>
          <option value="pending">Pending Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>

        {statusFilter && (
          <span style={{ 
            marginLeft: '15px',
            color: '#636e72',
            fontSize: '14px'
          }}>
            Showing: <strong>{statusFilter}</strong> ({software.length} items)
          </span>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ 
          textAlign: 'center', 
          padding: '60px 20px',
          color: '#999'
        }}>
          <p style={{ fontSize: '18px' }}>Loading software...</p>
        </div>
      )}

      {/* Software List */}
      {!loading && (
        <>
          {software.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '80px 20px',
              background: '#f8f9fa',
              borderRadius: '8px'
            }}>
              <p style={{ 
                fontSize: '18px',
                color: '#999',
                margin: 0
              }}>
                No {statusFilter || 'software'} found.
              </p>
            </div>
          ) : (
            <div>
              {software.map(sw => (
                <SoftwareAdminCard
                  key={sw.id}
                  software={sw}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default AdminPanel;

