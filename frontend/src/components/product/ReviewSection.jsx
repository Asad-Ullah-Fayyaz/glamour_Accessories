import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Star, CheckCircle, Trash2, Edit2, AlertCircle, MessageSquare } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function ReviewSection({ productId, productName }) {
  const { user, isAuthenticated } = useAuth();

  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [numReviews, setNumReviews] = useState(0);
  const [loading, setLoading] = useState(true);
  const [myReview, setMyReview] = useState(null);

  // Form State
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const fetchReviews = async () => {
    try {
      const res = await api.get(`/reviews/products/${productId}`);
      if (res.success) {
        setReviews(res.reviews || []);
        setAverageRating(res.averageRating || 0);
        setNumReviews(res.numReviews || 0);
      }
    } catch (err) {
      // Silently handle error
    } finally {
      setLoading(false);
    }
  };

  const fetchMyReview = async () => {
    if (!isAuthenticated) {
      setMyReview(null);
      return;
    }
    try {
      const res = await api.get(`/reviews/products/${productId}/me`);
      if (res.success && res.review) {
        setMyReview(res.review);
      } else {
        setMyReview(null);
      }
    } catch (err) {
      setMyReview(null);
    }
  };

  useEffect(() => {
    if (productId) {
      fetchReviews();
      fetchMyReview();
    }
  }, [productId, isAuthenticated]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!rating || rating < 1 || rating > 5) {
      setFormError('Please select a rating between 1 and 5 stars');
      return;
    }

    if (!comment.trim() || comment.trim().length < 3) {
      setFormError('Please write a review comment (minimum 3 characters)');
      return;
    }

    setSubmitting(true);
    try {
      if (isEditing && editId) {
        const res = await api.put(`/reviews/${editId}`, { rating, comment });
        if (res.success) {
          setFormSuccess('Your review has been updated!');
          setIsEditing(false);
          setEditId(null);
          await fetchReviews();
          await fetchMyReview();
        }
      } else {
        const res = await api.post(`/reviews/products/${productId}`, { rating, comment });
        if (res.success) {
          setFormSuccess('Thank you! Your review has been submitted.');
          setComment('');
          setRating(5);
          await fetchReviews();
          await fetchMyReview();
        }
      }
    } catch (err) {
      setFormError(err.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (rev) => {
    setIsEditing(true);
    setEditId(rev._id);
    setRating(rev.rating);
    setComment(rev.comment);
    setFormError('');
    setFormSuccess('');
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditId(null);
    setRating(5);
    setComment('');
    setFormError('');
  };

  const handleDelete = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete your review?')) return;
    try {
      const res = await api.delete(`/reviews/${reviewId}`);
      if (res.success) {
        setMyReview(null);
        setIsEditing(false);
        setEditId(null);
        setComment('');
        await fetchReviews();
      }
    } catch (err) {
      alert(err.message || 'Failed to delete review');
    }
  };

  // Compute breakdown percentages
  const ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach((r) => {
    if (ratingCounts[r.rating] !== undefined) {
      ratingCounts[r.rating]++;
    }
  });

  return (
    <div
      className="pdp-reviews-section"
      style={{
        marginTop: '5rem',
        borderTop: '1px solid var(--border-light)',
        paddingTop: '4rem'
      }}
    >
      <div style={{ marginBottom: '2.5rem' }}>
        <span
          style={{
            fontSize: '0.75rem',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            fontWeight: 600
          }}
        >
          CLIENT FEEDBACK & TESTIMONIALS
        </span>
        <h2
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '2rem',
            fontWeight: 400,
            marginTop: '0.25rem'
          }}
        >
          Customer Reviews
        </h2>
      </div>

      {/* Ratings Overview Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '2.5rem',
          backgroundColor: 'var(--bg-secondary)',
          padding: '2rem',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '3rem'
        }}
      >
        {/* Left Stats Box */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
            <span
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '3.5rem',
                fontWeight: 700,
                lineHeight: 1,
                color: 'var(--text-primary)'
              }}
            >
              {averageRating > 0 ? averageRating.toFixed(1) : '0.0'}
            </span>
            <span style={{ fontSize: '1.25rem', color: 'var(--text-muted)' }}>/ 5.0</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', margin: '0.75rem 0' }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={20}
                fill={star <= Math.round(averageRating) ? 'var(--accent-gold)' : 'none'}
                color={star <= Math.round(averageRating) ? 'var(--accent-gold)' : '#ccc'}
              />
            ))}
          </div>

          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Based on {numReviews} {numReviews === 1 ? 'verified review' : 'verified reviews'}
          </span>
        </div>

        {/* Right Star Progress Bars */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '0.5rem' }}>
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = ratingCounts[stars] || 0;
            const percentage = numReviews > 0 ? (count / numReviews) * 100 : 0;
            return (
              <div key={stars} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem' }}>
                <span style={{ width: '45px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  {stars} Star
                </span>
                <div
                  style={{
                    flex: 1,
                    height: '8px',
                    backgroundColor: '#ddd',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}
                >
                  <div
                    style={{
                      width: `${percentage}%`,
                      height: '100%',
                      backgroundColor: 'var(--accent-gold)',
                      transition: 'width 0.4s ease'
                    }}
                  />
                </div>
                <span style={{ width: '35px', textAlign: 'right', color: 'var(--text-muted)' }}>
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Review Submission Form / Status Box */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid var(--border-light)',
          padding: '2rem',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '3rem'
        }}
      >
        {!isAuthenticated ? (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <MessageSquare size={36} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', marginBottom: '0.5rem' }}>
              Have you experienced this piece?
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Please log in to your AXI Collection account to write a review.
            </p>
            <Link to="/login" className="btn btn-primary btn-sm">
              Sign In to Submit Review
            </Link>
          </div>
        ) : myReview && !isEditing ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle size={12} /> Your Review Published
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', margin: '0.5rem 0' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={16}
                    fill={star <= myReview.rating ? 'var(--accent-gold)' : 'none'}
                    color={star <= myReview.rating ? 'var(--accent-gold)' : '#ccc'}
                  />
                ))}
              </div>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', marginTop: '0.5rem' }}>
                "{myReview.comment}"
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => startEdit(myReview)}
                className="btn btn-secondary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                <Edit2 size={14} /> Edit Review
              </button>
              <button
                onClick={() => handleDelete(myReview._id)}
                className="btn btn-secondary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#c53030', borderColor: '#c53030' }}
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem' }}>
                {isEditing ? 'Edit Your Review' : 'Write a Product Review'}
              </h3>
              {isEditing && (
                <button type="button" onClick={cancelEdit} className="btn btn-secondary btn-sm">
                  Cancel Edit
                </button>
              )}
            </div>

            {formError && (
              <div
                style={{
                  backgroundColor: '#fde8e8',
                  color: '#9b1c1c',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <AlertCircle size={16} /> {formError}
              </div>
            )}

            {formSuccess && (
              <div
                style={{
                  backgroundColor: '#def7ec',
                  color: '#03543f',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <CheckCircle size={16} /> {formSuccess}
              </div>
            )}

            <div style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" style={{ marginBottom: '0.5rem' }}>
                Select Rating
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    <Star
                      size={24}
                      fill={star <= (hoverRating || rating) ? 'var(--accent-gold)' : 'none'}
                      color={star <= (hoverRating || rating) ? 'var(--accent-gold)' : '#ccc'}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="review-comment" className="form-label">
                Your Review
              </label>
              <textarea
                id="review-comment"
                rows={4}
                className="form-textarea"
                placeholder="Share your detailed thoughts on quality, packaging, material, and fit..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={1000}
                required
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', textAlign: 'right', marginTop: '4px' }}>
                {comment.length} / 1000 characters
              </span>
            </div>

            <button type="submit" disabled={submitting} className="btn btn-primary btn-sm" style={{ marginTop: '0.5rem' }}>
              {submitting ? 'Submitting...' : isEditing ? 'Update Review' : 'Submit Review'}
            </button>
          </form>
        )}
      </div>

      {/* Customer Reviews List */}
      <div>
        <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', marginBottom: '1.5rem' }}>
          Customer Stories ({reviews.length})
        </h3>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div className="spinner"></div>
          </div>
        ) : reviews.length === 0 ? (
          <div
            style={{
              backgroundColor: 'var(--bg-secondary)',
              padding: '3rem 2rem',
              textAlign: 'center',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-sm)'
            }}
          >
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              No Customer Reviews Yet
            </p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto' }}>
              Be the first to share your experience with {productName || 'this piece'}. Your feedback helps our artisans and fellow collectors.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {reviews.map((rev) => (
              <div
                key={rev._id}
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid var(--border-light)',
                  padding: '1.5rem',
                  borderRadius: 'var(--radius-sm)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                        {rev.name}
                      </strong>
                      <span className="badge badge-success" style={{ fontSize: '0.65rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <CheckCircle size={10} /> Verified Purchase
                      </span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(rev.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={14}
                        fill={star <= rev.rating ? 'var(--accent-gold)' : 'none'}
                        color={star <= rev.rating ? 'var(--accent-gold)' : '#ccc'}
                      />
                    ))}
                  </div>
                </div>

                <p style={{ fontSize: '0.925rem', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>
                  {rev.comment}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
