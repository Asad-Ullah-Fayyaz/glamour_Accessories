import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AdminSidebar from '../components/admin/AdminSidebar';
import { Star, CheckCircle, XCircle, Trash2, Filter, MessageSquare, ExternalLink } from 'lucide-react';
import api from '../services/api';

export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({ total: 0, approved: 0, pending: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState(null);

  const fetchAdminReviews = async () => {
    setLoading(true);
    try {
      const url = statusFilter !== 'all' ? `/admin/reviews?status=${statusFilter}` : '/admin/reviews';
      const res = await api.get(url);
      if (res.success) {
        setReviews(res.reviews || []);
        if (res.stats) setStats(res.stats);
      }
    } catch (err) {
      // Silently handle error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminReviews();
  }, [statusFilter]);

  const handleStatusChange = async (reviewId, newStatus) => {
    setActionLoading(reviewId);
    try {
      const res = await api.put(`/admin/reviews/${reviewId}/status`, { status: newStatus });
      if (res.success) {
        await fetchAdminReviews();
      }
    } catch (err) {
      alert(err.message || 'Failed to update review status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (reviewId) => {
    if (!window.confirm('Are you sure you want to permanently delete this review?')) return;
    setActionLoading(reviewId);
    try {
      const res = await api.delete(`/admin/reviews/${reviewId}`);
      if (res.success) {
        await fetchAdminReviews();
      }
    } catch (err) {
      alert(err.message || 'Failed to delete review');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-secondary)' }}>
      <AdminSidebar />

      <main style={{ flex: 1, padding: '2.5rem' }}>
        <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '1.5rem', marginBottom: '2.5rem' }}>
          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-muted)' }}>
            MODERATION CONSOLE
          </span>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.2rem', marginTop: '2px' }}>
            Customer Review Management
          </h1>
        </div>

        {/* Stats Metrics Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
          <div style={{ backgroundColor: '#fff', padding: '1.5rem', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total Reviews</span>
              <MessageSquare size={20} />
            </div>
            <h3 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {stats.total}
            </h3>
          </div>

          <div style={{ backgroundColor: '#fff', padding: '1.5rem', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Approved</span>
              <CheckCircle size={20} style={{ color: '#137333' }} />
            </div>
            <h3 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#137333' }}>
              {stats.approved}
            </h3>
          </div>

          <div style={{ backgroundColor: '#fff', padding: '1.5rem', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Pending</span>
              <Filter size={20} style={{ color: '#b06000' }} />
            </div>
            <h3 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#b06000' }}>
              {stats.pending}
            </h3>
          </div>

          <div style={{ backgroundColor: '#fff', padding: '1.5rem', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Rejected</span>
              <XCircle size={20} style={{ color: '#c5221f' }} />
            </div>
            <h3 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#c5221f' }}>
              {stats.rejected}
            </h3>
          </div>
        </div>

        {/* Filters and Controls */}
        <div style={{ backgroundColor: '#fff', padding: '1.5rem', border: '1px solid var(--border-light)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={16} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Status Filter:</span>
            {['all', 'approved', 'pending', 'rejected'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                style={{
                  padding: '0.4rem 0.85rem',
                  fontSize: '0.75rem',
                  textTransform: 'capitalize',
                  borderRadius: 'var(--radius-sm)',
                  border: statusFilter === st ? '1px solid var(--text-primary)' : '1px solid var(--border-light)',
                  backgroundColor: statusFilter === st ? 'var(--bg-dark)' : 'transparent',
                  color: statusFilter === st ? '#fff' : 'var(--text-primary)',
                  fontWeight: statusFilter === st ? 600 : 400
                }}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Reviews Table */}
        <div style={{ backgroundColor: '#fff', padding: '1.75rem', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-subtle)' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
              <div className="spinner"></div>
            </div>
          ) : reviews.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <MessageSquare size={32} style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }} />
              <p style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>No reviews found for filter "{statusFilter}".</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Customer</th>
                    <th>Rating</th>
                    <th>Comment</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reviews.map((rev) => (
                    <tr key={rev._id}>
                      <td style={{ maxWidth: '180px' }}>
                        {rev.product ? (
                          <Link
                            to={`/products/${rev.product.slug}`}
                            target="_blank"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--text-primary)', fontWeight: 600 }}
                          >
                            {rev.product.name} <ExternalLink size={12} />
                          </Link>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>Deleted Product</span>
                        )}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{rev.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {rev.user?.email || 'N/A'}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              size={12}
                              fill={star <= rev.rating ? 'var(--accent-gold)' : 'none'}
                              color={star <= rev.rating ? 'var(--accent-gold)' : '#ccc'}
                            />
                          ))}
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, marginLeft: '4px' }}>
                            {rev.rating}
                          </span>
                        </div>
                      </td>
                      <td style={{ maxWidth: '280px', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        "{rev.comment}"
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            rev.status === 'approved'
                              ? 'badge-success'
                              : rev.status === 'rejected'
                              ? 'badge-danger'
                              : 'badge-warning'
                          }`}
                        >
                          {rev.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {new Date(rev.createdAt).toLocaleDateString()}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          {rev.status !== 'approved' && (
                            <button
                              onClick={() => handleStatusChange(rev._id, 'approved')}
                              disabled={actionLoading === rev._id}
                              className="btn btn-sm"
                              style={{ backgroundColor: '#137333', color: '#fff', padding: '0.3rem 0.6rem', fontSize: '0.7rem' }}
                              title="Approve Review"
                            >
                              Approve
                            </button>
                          )}
                          {rev.status !== 'rejected' && (
                            <button
                              onClick={() => handleStatusChange(rev._id, 'rejected')}
                              disabled={actionLoading === rev._id}
                              className="btn btn-sm"
                              style={{ backgroundColor: '#b06000', color: '#fff', padding: '0.3rem 0.6rem', fontSize: '0.7rem' }}
                              title="Reject Review"
                            >
                              Reject
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(rev._id)}
                            disabled={actionLoading === rev._id}
                            className="btn btn-sm"
                            style={{ backgroundColor: '#c5221f', color: '#fff', padding: '0.3rem 0.6rem', fontSize: '0.7rem' }}
                            title="Delete Review"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
