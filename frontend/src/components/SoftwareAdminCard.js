import React, { useState } from 'react';
import api from '../services/api';

const LICENSE_OPTIONS = [
  'MIT', 'Apache 2.0', 'GPL v3', 'BSD 2-Clause', 'Proprietary / Commercial', 'Freeware'
];

function SoftwareAdminCard({ software, onApprove, onReject, onDelete }) {
  const [pendingAction, setPendingAction] = useState(null);
  const [error, setError] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: software.title || '',
    description: software.description || '',
    price: software.price != null ? String(software.price) : '',
    category_id: software.category_id ? String(software.category_id) : '',
    license: software.license || '',
  });
  const [categories, setCategories] = useState([]);
  const [logoFile, setLogoFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState(null);
  const [localData, setLocalData] = useState(software);

  const confirmLabels = {
    approve: 'Approve this software?',
    reject: 'Reject this software?',
    delete: 'Permanently delete this software?',
  };

  const handleConfirm = async () => {
    setError(null);
    try {
      if (pendingAction === 'approve') await onApprove(software.id);
      else if (pendingAction === 'reject') await onReject(software.id);
      else if (pendingAction === 'delete') await onDelete(software.id);
    } catch (err) {
      setError(err.message || 'Action failed');
    }
    setPendingAction(null);
  };

  const openEdit = async () => {
    if (!editOpen) {
      try {
        const res = await api.get('/categories');
        setCategories(res.data);
      } catch (e) {}
      setPendingAction(null);
      setEditError(null);
      setLogoFile(null);
    }
    setEditOpen(v => !v);
  };

  const handleRemoveLogo = async () => {
    try {
      await api.delete(`/software/${software.id}/logo`);
      setLocalData(prev => ({ ...prev, logo_url: null }));
    } catch (e) {
      setEditError(e.response?.data?.detail || e.message || 'Remove logo failed');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setEditError(null);
    try {
      const payload = {};
      if (formData.title) payload.title = formData.title;
      if (formData.description) payload.description = formData.description;
      if (formData.license) payload.license = formData.license;
      if (formData.category_id) payload.category_id = parseInt(formData.category_id);
      if (formData.price !== '') payload.price = parseFloat(formData.price);

      const res = await api.patch(`/software/${software.id}`, payload);
      const updatedCat = categories.find(c => c.id === res.data.category_id);
      let newLogoUrl = localData.logo_url;
      if (logoFile) {
        const logoForm = new FormData();
        logoForm.append('file', logoFile);
        const logoRes = await api.post(`/software/${software.id}/logo`, logoForm, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        newLogoUrl = logoRes.data.logo_url;
      }
      setLocalData(prev => ({
        ...prev,
        title: res.data.title,
        description: res.data.description,
        price: res.data.price,
        category_id: res.data.category_id,
        license: res.data.license,
        logo_url: newLogoUrl,
        category: updatedCat
          ? { id: updatedCat.id, name: updatedCat.name }
          : prev.category,
      }));
      setLogoFile(null);
      setEditOpen(false);
    } catch (e) {
      setEditError(e.response?.data?.detail || e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: { background: '#fff3cd', color: '#856404' },
      approved: { background: '#d4edda', color: '#155724' },
      rejected: { background: '#f8d7da', color: '#721c24' }
    };
    return (
      <span style={{
        padding: '4px 12px', borderRadius: '4px', fontSize: '13px',
        fontWeight: '600', textTransform: 'uppercase', ...styles[status]
      }}>
        {status}
      </span>
    );
  };

  return (
    <div style={{
      background: 'white', border: '1px solid #e0e0e0', borderRadius: '8px',
      padding: '20px', marginBottom: '15px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', marginBottom: '15px'
      }}>
        <div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', color: '#2d3436' }}>
            {localData.title}
          </h3>
          <div style={{ display: 'flex', gap: '15px', fontSize: '14px', color: '#636e72' }}>
            <span>v{localData.version}</span>
            <span>{localData.os_compatibility}</span>
          </div>
        </div>
        {getStatusBadge(localData.status)}
      </div>

      {/* Description */}
      <p style={{
        margin: '0 0 15px 0', color: '#636e72', fontSize: '14px',
        lineHeight: '1.5', maxHeight: '60px', overflow: 'hidden'
      }}>
        {localData.description || 'No description'}
      </p>

      {/* Meta Info */}
      <div style={{
        display: 'flex', gap: '20px', marginBottom: '15px', paddingBottom: '15px',
        borderBottom: '1px solid #f0f0f0', fontSize: '13px', color: '#636e72'
      }}>
        <span>Developer: <strong>{localData?.developer?.username || 'Unknown'}</strong></span>
        <span>Category: <strong>{localData.category?.name || 'N/A'}</strong></span>
        <span>Downloads: <strong>{localData.download_count}</strong></span>
        <span>License: <strong>{localData.license || 'N/A'}</strong></span>
        <span>{localData.price_type === 'free' ? 'Free' : `$${localData.price || '?'}`}</span>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          marginBottom: '10px', padding: '8px 12px', background: '#f8d7da',
          border: '1px solid #f5c6cb', borderRadius: '4px', color: '#721c24', fontSize: '13px'
        }}>
          {error}
        </div>
      )}

      {/* Inline confirmation */}
      {pendingAction ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '10px 14px', background: '#f8f9fa',
          borderRadius: '4px', border: '1px solid #dee2e6'
        }}>
          <span style={{ fontSize: '14px', color: '#2d3436', fontWeight: '500' }}>
            {confirmLabels[pendingAction]}
          </span>
          <button
            onClick={handleConfirm}
            style={{
              padding: '6px 16px', background: pendingAction === 'delete' ? '#dc3545' : '#28a745',
              color: 'white', border: 'none', borderRadius: '4px',
              cursor: 'pointer', fontWeight: '600', fontSize: '13px'
            }}
          >
            Confirm
          </button>
          <button
            onClick={() => setPendingAction(null)}
            style={{
              padding: '6px 16px', background: 'white', color: '#636e72',
              border: '1px solid #dee2e6', borderRadius: '4px',
              cursor: 'pointer', fontSize: '13px'
            }}
          >
            Cancel
          </button>
        </div>
      ) : (
        /* Action Buttons */
        <div style={{ display: 'flex', gap: '10px' }}>
          {localData.status !== 'approved' && (
            <button
              onClick={() => setPendingAction('approve')}
              style={{
                padding: '8px 16px', background: '#28a745', color: 'white',
                border: 'none', borderRadius: '4px', cursor: 'pointer',
                fontWeight: '500', fontSize: '14px'
              }}
            >
              Approve
            </button>
          )}
          {localData.status !== 'rejected' && localData.status !== 'approved' && (
            <button
              onClick={() => setPendingAction('reject')}
              style={{
                padding: '8px 16px', background: '#ffc107', color: '#333',
                border: 'none', borderRadius: '4px', cursor: 'pointer',
                fontWeight: '500', fontSize: '14px'
              }}
            >
              Reject
            </button>
          )}
          <button
            onClick={openEdit}
            style={{
              padding: '8px 16px', background: '#6c757d', color: 'white',
              border: 'none', borderRadius: '4px', cursor: 'pointer',
              fontWeight: '500', fontSize: '14px', marginLeft: 'auto'
            }}
          >
            {editOpen ? 'Cancel Edit' : 'Edit'}
          </button>
          <button
            onClick={() => { setEditOpen(false); setPendingAction('delete'); }}
            style={{
              padding: '8px 16px', background: '#dc3545', color: 'white',
              border: 'none', borderRadius: '4px', cursor: 'pointer',
              fontWeight: '500', fontSize: '14px'
            }}
          >
            Delete
          </button>
        </div>
      )}

      {/* Inline Edit Form */}
      {editOpen && !pendingAction && (
        <div style={{
          marginTop: '15px', padding: '15px', background: '#f8f9fa',
          borderRadius: '4px', border: '1px solid #dee2e6'
        }}>
          {editError && (
            <div style={{
              marginBottom: '10px', padding: '8px 12px', background: '#f8d7da',
              border: '1px solid #f5c6cb', borderRadius: '4px', color: '#721c24', fontSize: '13px'
            }}>
              {editError}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px', color: '#2d3436' }}>
                Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={e => setFormData(f => ({ ...f, title: e.target.value }))}
                style={{
                  width: '100%', padding: '8px 10px', border: '1px solid #dee2e6',
                  borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px', color: '#2d3436' }}>
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                rows={3}
                style={{
                  width: '100%', padding: '8px 10px', border: '1px solid #dee2e6',
                  borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box', resize: 'vertical'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px', color: '#2d3436' }}>
                  Category
                </label>
                <select
                  value={formData.category_id}
                  onChange={e => setFormData(f => ({ ...f, category_id: e.target.value }))}
                  style={{
                    width: '100%', padding: '8px 10px', border: '1px solid #dee2e6',
                    borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box'
                  }}
                >
                  <option value="">Select category</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px', color: '#2d3436' }}>
                  License
                </label>
                <select
                  value={formData.license}
                  onChange={e => setFormData(f => ({ ...f, license: e.target.value }))}
                  style={{
                    width: '100%', padding: '8px 10px', border: '1px solid #dee2e6',
                    borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box'
                  }}
                >
                  <option value="">Select license</option>
                  {LICENSE_OPTIONS.map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px', color: '#2d3436' }}>
                  Price
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={e => setFormData(f => ({ ...f, price: e.target.value }))}
                  placeholder="0.00"
                  style={{
                    width: '100%', padding: '8px 10px', border: '1px solid #dee2e6',
                    borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px', color: '#2d3436' }}>
                Logo
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                {localData.logo_url && !logoFile && (
                  <>
                    <img src={localData.logo_url} alt="current logo"
                      style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 4, border: '1px solid #e0e0e0' }} />
                    <button onClick={e => { e.stopPropagation(); handleRemoveLogo(); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', fontSize: '18px', lineHeight: 1 }}>
                      ×
                    </button>
                  </>
                )}
                <label
                  onClick={e => e.stopPropagation()}
                  style={{
                    display: 'inline-block', padding: '6px 12px',
                    background: '#f8f9fa', border: '1px dashed #dee2e6',
                    borderRadius: '4px', cursor: 'pointer', color: '#636e72',
                    fontSize: '13px', fontWeight: '500'
                  }}>
                  {logoFile ? logoFile.name : (localData.logo_url ? 'Replace logo…' : 'Add logo…')}
                  <input type="file" accept="image/jpeg,image/png" style={{ display: 'none' }}
                    onChange={e => { e.stopPropagation(); setLogoFile(e.target.files[0] || null); }} />
                </label>
                {logoFile && (
                  <button onClick={e => { e.stopPropagation(); setLogoFile(null); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', fontSize: '18px', lineHeight: 1 }}>
                    ×
                  </button>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setEditOpen(false); setEditError(null); setLogoFile(null); }}
                style={{
                  padding: '8px 16px', background: 'white', color: '#636e72',
                  border: '1px solid #dee2e6', borderRadius: '4px',
                  cursor: 'pointer', fontSize: '14px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: '8px 16px', background: '#007bff', color: 'white',
                  border: 'none', borderRadius: '4px', cursor: saving ? 'not-allowed' : 'pointer',
                  fontWeight: '500', fontSize: '14px', opacity: saving ? 0.7 : 1
                }}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SoftwareAdminCard;
