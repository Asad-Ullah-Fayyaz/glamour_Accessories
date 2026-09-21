import React, { useState, useEffect } from 'react';
import AdminSidebar from '../components/admin/AdminSidebar';
import { Plus, Edit, Trash2, X, Shield, User as UserIcon } from 'lucide-react';
import api from '../services/api';

export default function AdminManageAdmins() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [notification, setNotification] = useState('');
  const [busyId, setBusyId] = useState(null);

  // Create form
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [creating, setCreating] = useState(false);

  // Edit modal
  const [editingAdmin, setEditingAdmin] = useState(null); // null = closed
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [saving, setSaving] = useState(false);

  // ---- Fetch admins ----
  const fetchAdmins = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.get('/admin/admins');
      if (res.success) setAdmins(res.admins);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load admins');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  // ---- Create admin ----
  const handleCreate = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setNotification('');

    if (!newName.trim() || !newEmail.trim() || !newPassword) {
      setErrorMsg('All fields are required');
      return;
    }
    if (newPassword.length < 8) {
      setErrorMsg('Password must be at least 8 characters');
      return;
    }

    setCreating(true);
    try {
      const res = await api.post('/admin/admins', {
        name: newName.trim(),
        email: newEmail.trim().toLowerCase(),
        password: newPassword
      });
      if (res.success) {
        setNotification(res.message || 'Admin created');
        setTimeout(() => setNotification(''), 3000);
        setNewName('');
        setNewEmail('');
        setNewPassword('');
        await fetchAdmins();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create admin');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setCreating(false);
    }
  };

  // ---- Open edit modal ----
  const openEdit = (admin) => {
    setEditingAdmin(admin);
    setEditName(admin.name || '');
    setEditEmail(admin.email || '');
    setEditPassword('');
  };

  const closeEdit = () => {
    setEditingAdmin(null);
    setEditName('');
    setEditEmail('');
    setEditPassword('');
  };

  // ---- Save edit ----
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingAdmin) return;
    setErrorMsg('');
    setNotification('');

    const payload = {};
    if (editName.trim() && editName.trim() !== editingAdmin.name) {
      payload.name = editName.trim();
    }
    if (editEmail.trim() && editEmail.trim().toLowerCase() !== editingAdmin.email) {
      payload.email = editEmail.trim().toLowerCase();
    }
    if (editPassword) {
      if (editPassword.length < 8) {
        setErrorMsg('New password must be at least 8 characters');
        return;
      }
      payload.password = editPassword;
    }

    if (Object.keys(payload).length === 0) {
      setErrorMsg('No changes to save');
      return;
    }

    setSaving(true);
    try {
      const res = await api.put(`/admin/admins/${editingAdmin._id}`, payload);
      if (res.success) {
        setNotification(res.message || 'Admin updated');
        setTimeout(() => setNotification(''), 3000);
        closeEdit();
        await fetchAdmins();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update admin');
    } finally {
      setSaving(false);
    }
  };

  // ---- Delete admin ----
  const handleDelete = async (admin) => {
    if (
      !window.confirm(
        `Delete admin "${admin.name}" (${admin.email})?\n\nThey will lose access to the admin panel immediately. This cannot be undone.`
      )
    ) {
      return;
    }

    setErrorMsg('');
    setNotification('');
    setBusyId(admin._id);
    try {
      const res = await api.delete(`/admin/admins/${admin._id}`);
      if (res.success) {
        setNotification(res.message || 'Admin deleted');
        setTimeout(() => setNotification(''), 3000);
        await fetchAdmins();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to delete admin');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-secondary)' }}>
      <AdminSidebar />

      <main style={{ flex: 1, padding: '2.5rem' }}>
        {/* Header */}
        <div
          style={{
            borderBottom: '1px solid var(--border-light)',
            paddingBottom: '1.5rem',
            marginBottom: '2.5rem'
          }}
        >
          <span
            style={{
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              color: 'var(--text-muted)'
            }}
          >
            SUPER ADMIN ONLY
          </span>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.2rem', marginTop: '2px' }}>
            Manage Administrators
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
            Create, edit, and remove admin accounts. Only the Super Admin can access this page.
          </p>
        </div>

        {/* Banners */}
        {notification && (
          <div
            style={{
              backgroundColor: '#e6f4ea',
              border: '1px solid #b7e4c7',
              color: '#137333',
              padding: '0.85rem 1.25rem',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '1.5rem',
              fontWeight: 600,
              fontSize: '0.85rem'
            }}
          >
            {notification}
          </div>
        )}

        {errorMsg && (
          <div
            style={{
              backgroundColor: '#fff5f5',
              border: '1px solid #feb2b2',
              color: '#c53030',
              padding: '0.85rem 1.25rem',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '1.5rem',
              fontSize: '0.85rem'
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* Create Admin Form */}
        <div
          style={{
            backgroundColor: '#fff',
            padding: '1.75rem',
            border: '1px solid var(--border-light)',
            boxShadow: 'var(--shadow-subtle)',
            marginBottom: '2rem'
          }}
        >
          <h3
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.25rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Plus size={18} /> Create New Admin
          </h3>

          <form
            onSubmit={handleCreate}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr auto',
              gap: '1rem',
              alignItems: 'end'
            }}
          >
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Full Name *</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="form-input"
                placeholder="e.g. Ahmed Khan"
                required
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Email *</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="form-input"
                placeholder="admin@example.com"
                required
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Password * (min 8 chars)</label>
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="form-input"
                placeholder="Strong password"
                required
              />
            </div>
            <button
              type="submit"
              disabled={creating}
              className="btn btn-primary"
              style={{
                padding: '0.75rem 1.25rem',
                whiteSpace: 'nowrap',
                opacity: creating ? 0.6 : 1
              }}
            >
              {creating ? 'Creating...' : 'Create Admin'}
            </button>
          </form>

          <p
            style={{
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
              marginTop: '0.75rem',
              lineHeight: '1.5'
            }}
          >
            Note: The password field is displayed in plain text so you can share it with the new
            admin. After creation, they can change it themselves via the login flow.
          </p>
        </div>

        {/* Admins Table */}
        <div
          style={{
            backgroundColor: '#fff',
            padding: '1.75rem',
            border: '1px solid var(--border-light)',
            boxShadow: 'var(--shadow-subtle)'
          }}
        >
          <h3
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.3rem',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Shield size={18} /> Current Administrators ({admins.length})
          </h3>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
              <div className="spinner"></div>
            </div>
          ) : admins.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No regular admins yet. Create one above.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Created</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map((admin) => {
                    const isBusy = busyId === admin._id;
                    const createdDate = admin.createdAt
                      ? new Date(admin.createdAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })
                      : '—';

                    return (
                      <tr key={admin._id} style={{ opacity: isBusy ? 0.5 : 1 }}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <div
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                backgroundColor: 'var(--bg-tertiary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--text-primary)'
                              }}
                            >
                              <UserIcon size={16} />
                            </div>
                            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                              {admin.name}
                            </span>
                          </div>
                        </td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {admin.email}
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {createdDate}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => openEdit(admin)}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '0.3rem 0.5rem' }}
                              title="Edit admin"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleDelete(admin)}
                              className="btn btn-secondary btn-sm"
                              style={{
                                padding: '0.3rem 0.5rem',
                                color: 'red',
                                borderColor: '#ffcccc',
                                cursor: isBusy ? 'wait' : 'pointer'
                              }}
                              title="Delete admin"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Edit Modal */}
      {editingAdmin && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) closeEdit();
          }}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            zIndex: 3000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              padding: '2rem',
              maxWidth: '520px',
              width: '100%',
              borderRadius: 'var(--radius-sm)',
              boxShadow: 'var(--shadow-dropdown)'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem',
                paddingBottom: '1rem',
                borderBottom: '1px solid var(--border-light)'
              }}
            >
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem' }}>
                Edit Admin
              </h3>
              <button
                onClick={closeEdit}
                style={{ color: 'var(--text-muted)', cursor: 'pointer' }}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">New Password (leave blank to keep current)</label>
                <input
                  type="text"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="form-input"
                  placeholder="Optional — min 8 characters"
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  justifyContent: 'flex-end',
                  marginTop: '1.5rem',
                  paddingTop: '1.5rem',
                  borderTop: '1px solid var(--border-light)'
                }}
              >
                <button
                  type="button"
                  onClick={closeEdit}
                  className="btn btn-secondary"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                  style={{ opacity: saving ? 0.6 : 1 }}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}