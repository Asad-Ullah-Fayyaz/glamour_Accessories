import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Star, Quote, ArrowRight, CheckCircle } from 'lucide-react';
import api from '../../services/api';

export default function HomeReviewsSection() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHomepageReviews = async () => {
      try {
        const res = await api.get('/reviews/homepage');
        if (res.success && res.reviews) {
          setReviews(res.reviews);
        }
      } catch (err) {
        // Silently handle
      } finally {
        setLoading(false);
      }
    };

    fetchHomepageReviews();
  }, []);

  if (loading) {
    return null;
  }

  // If database contains no reviews yet, render an elegant empty state banner
  if (reviews.length === 0) {
    return (
      <section
        className="home-reviews-section"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          padding: '5rem 0',
          borderTop: '1px solid var(--border-light)',
          borderBottom: '1px solid var(--border-light)'
        }}
      >
        <div className="container" style={{ textAlign: 'center', maxWidth: '680px' }}>
          <div className="home-eyebrow" style={{ color: 'var(--accent-gold)' }}>
            CLIENT TESTIMONIALS
          </div>
          <h2 className="home-heading" style={{ marginBottom: '1rem' }}>
            Collector Experiences
          </h2>
          <p
            style={{
              color: 'var(--text-secondary)',
              fontSize: '0.95rem',
              lineHeight: 1.7,
              marginBottom: '2rem'
            }}
          >
            We take immense pride in precision craftsmanship and nationwide luxury delivery across Pakistan.
            Be among our distinguished clients to leave a product review on your purchase.
          </p>
          <Link to="/products" className="btn btn-secondary btn-sm">
            Explore Collection <ArrowRight size={14} />
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section
      className="home-reviews-section"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        padding: '5.5rem 0',
        borderTop: '1px solid var(--border-light)',
        borderBottom: '1px solid var(--border-light)'
      }}
    >
      <div className="container">
        <div
          style={{
            display: 'flex',
            justify: 'space-between',
            alignItems: 'flex-end',
            marginBottom: '3rem',
            flexWrap: 'wrap',
            gap: '1rem'
          }}
        >
          <div>
            <div className="home-eyebrow" style={{ color: 'var(--accent-gold)' }}>
              VERIFIED CLIENT FEEDBACK
            </div>
            <h2 className="home-heading" style={{ marginBottom: 0 }}>
              Collector Experiences & Reviews
            </h2>
          </div>
          <Link to="/products" className="btn btn-secondary btn-sm">
            View All Products <ArrowRight size={14} />
          </Link>
        </div>

        {/* Grid of Genuine Customer Reviews */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))',
            gap: '2rem'
          }}
        >
          {reviews.map((rev) => (
            <div
              key={rev._id}
              style={{
                backgroundColor: '#FFFFFF',
                padding: '2rem',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-sm)',
                boxShadow: 'var(--shadow-subtle)',
                display: 'flex',
                flexDirection: 'column',
                justify: 'space-between'
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    justify: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1.25rem'
                  }}
                >
                  <div style={{ display: 'flex', gap: '3px' }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={15}
                        fill={star <= rev.rating ? 'var(--accent-gold)' : 'none'}
                        color={star <= rev.rating ? 'var(--accent-gold)' : '#ccc'}
                      />
                    ))}
                  </div>
                  <Quote size={20} style={{ color: 'var(--accent-gold)', opacity: 0.6 }} />
                </div>

                <p
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '1rem',
                    color: 'var(--text-primary)',
                    lineHeight: '1.6',
                    fontStyle: 'italic',
                    marginBottom: '1.5rem'
                  }}
                >
                  "{rev.comment}"
                </p>
              </div>

              <div
                style={{
                  borderTop: '1px solid var(--border-light)',
                  paddingTop: '1rem',
                  display: 'flex',
                  justify: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.5rem'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <strong style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                      {rev.name}
                    </strong>
                    <span
                      style={{
                        color: '#137333',
                        fontSize: '0.7rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '2px',
                        fontWeight: 600
                      }}
                    >
                      <CheckCircle size={11} /> Verified Buyer
                    </span>
                  </div>
                  {rev.product && (
                    <Link
                      to={`/products/${rev.product.slug}`}
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        textDecoration: 'underline'
                      }}
                    >
                      {rev.product.name}
                    </Link>
                  )}
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {new Date(rev.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
