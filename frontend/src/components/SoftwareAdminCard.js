import React from 'react';

function SoftwareAdminCard({ software, onApprove, onReject, onDelete }) {
  
  const getStatusBadge = (status) => {
    const styles = {
      pending: { background: '#fff3cd', color: '#856404' },
      approved: { background: '#d4edda', color: '#155724' },
      rejected: { background: '#f8d7da', color: '#721c24' }
    };
    
    return (
      <span style={{
        padding: '4px 12px',
        borderRadius: '4px',
        fontSize: '13px',
        fontWeight: '600',
        textTransform: 'uppercase',
        ...styles[status]
      }}>
        {status}
      </span>
    );
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div style={{
      background: 'white',
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      padding: '20px',
      marginBottom: '15px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '15px'
      }}>
        <div>
          <h3 style={{ 
            margin: '0 0 8px 0',
            fontSize: '20px',
            color: '#2d3436'
          }}>
            {software.title}
          </h3>
          
          <div style={{ 
            display: 'flex', 
            gap: '15px',
            fontSize: '14px',
            color: '#636e72'
          }}>
            <span>v{software.version}</span>
            <span>{software.os_compatibility}</span>
            <span>{formatFileSize(software.file_size)}</span>
          </div>
        </div>
        
        {getStatusBadge(software.status)}
      </div>

      {/* Description */}
      <p style={{ 
        margin: '0 0 15px 0',
        color: '#636e72',
        fontSize: '14px',
        lineHeight: '1.5',
        maxHeight: '60px',
        overflow: 'hidden'
      }}>
        {software.description || 'No description'}
      </p>

      {/* Meta Info */}
      <div style={{ 
        display: 'flex',
        gap: '20px',
        marginBottom: '15px',
        paddingBottom: '15px',
        borderBottom: '1px solid #f0f0f0',
        fontSize: '13px',
        color: '#636e72'
      }}>
        <span>Developer: <strong>{software?.developer?.username || 'Unknown'}</strong></span>
        <span>Category: <strong>{software.category?.name || 'N/A'}</strong></span>
        <span>Downloads: <strong>{software.download_count}</strong></span>
        <span>License: <strong>{software.license || 'N/A'}</strong></span>
        <span>{software.price_type === 'free' ? 'Free' : `$${software.price || '?'}`}</span>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '10px' }}>
        {/* Approve - ako nije već approved */}
        {software.status !== 'approved' && (
          <button
            onClick={() => onApprove(software.id)}
            style={{
              padding: '8px 16px',
              background: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '14px'
            }}
          >
            Approve
          </button>
        )}

        {/* Reject - ako nije već rejected */}
        {software.status !== 'rejected' && software.status!== 'approved' && (
          <button
            onClick={() => onReject(software.id)}
            style={{
              padding: '8px 16px',
              background: '#ffc107',
              color: '#333',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '14px'
            }}
          >
            Reject
          </button>
        )}

        {/* Delete - uvijek dostupan */}
        <button
          onClick={() => onDelete(software.id)}
          style={{
            padding: '8px 16px',
            background: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: '500',
            fontSize: '14px',
            marginLeft: 'auto' // Push to right
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export default SoftwareAdminCard;