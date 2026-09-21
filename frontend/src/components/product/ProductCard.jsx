import React from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { ShoppingBag } from 'lucide-react';
import { addToCart } from '../../store/slices/cartSlice';
import { useAuth } from '../../context/AuthContext';

export default function ProductCard({ product }) {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'superadmin';

  const primaryImage =
    product.images?.[0] ||
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1000&auto=format&fit=crop';
  const secondaryImage = product.images?.[1] || primaryImage;

  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= 5;
  const onSale = product.isOnSale === true;

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isOutOfStock) dispatch(addToCart({ product, quantity: 1 }));
  };

  return (
    <div className="product-card">
      <Link to={`/products/${product.slug}`} style={{ display: 'block' }}>
        <div className="product-image-container">
          <img
            src={primaryImage}
            alt={product.name}
            className="product-image-primary"
            loading="lazy"
          />
          <img
            src={secondaryImage}
            alt={`${product.name} alternate view`}
            className="product-image-secondary"
            loading="lazy"
          />

          {/* Badges Overlay */}
          <div
            style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              alignItems: 'flex-start',
              zIndex: 2
            }}
          >
            {product.isFeatured && <span className="badge badge-gold">Featured</span>}
            {product.isNew === true && <span className="badge badge-new">New</span>}
            {onSale && <span className="badge badge-dark">Sale</span>}
            {isOutOfStock && (
              <span
                className="badge"
                style={{ backgroundColor: 'var(--bg-card)', color: 'var(--bg-dark)' }}
              >
                Sold out
              </span>
            )}
            {isLowStock && (
              <span className="badge badge-warning">Low Stock ({product.stock})</span>
            )}
          </div>
        </div>
      </Link>

      <div style={{ padding: '1rem 1rem 1.25rem' }}>
        {/* Category tag */}
        <p
          style={{
            fontSize: '0.7rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            marginBottom: '0.35rem'
          }}
        >
          {product.category?.name || 'Accessories'}
        </p>

        {/* Product Title */}
        <Link to={`/products/${product.slug}`}>
          <h3
            style={{
              fontSize: '0.925rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              lineHeight: '1.4',
              marginBottom: '0.6rem',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              minHeight: '2.6em'
            }}
          >
            {product.name}
          </h3>
        </Link>

        {/* Price & Add to Cart */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: '0.5rem',
            marginTop: '0.5rem',
            flexWrap: 'wrap'
          }}
        >
          <span
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '0.15rem',
              minWidth: 0,
              flex: '1 1 auto',
              overflow: 'hidden'
            }}
          >
            {onSale && (
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  color: 'var(--text-muted)',
                  textDecoration: 'line-through',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100%'
                }}
              >
                PKR {product.price?.toLocaleString() ?? '0'}
              </span>
            )}
            <span
              style={{
                fontSize: '0.95rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '100%'
              }}
            >
              {onSale
                ? `PKR ${product.salePrice?.toLocaleString() ?? '0'}`
                : `PKR ${product.price?.toLocaleString() ?? '0'}`}
            </span>
          </span>

          {isSuperAdmin ? (
            <span
              style={{
                fontSize: '0.7rem',
                color: 'var(--text-muted)',
                fontStyle: 'italic',
                whiteSpace: 'nowrap'
              }}
            >
              Admin view
            </span>
          ) : (
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              className="btn btn-secondary btn-sm"
              style={{
                padding: '0.45rem 0.85rem',
                cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                opacity: isOutOfStock ? 0.5 : 1,
                flexShrink: 0
              }}
              aria-label={`Add ${product.name} to shopping bag`}
              title={isOutOfStock ? 'Sold out' : 'Add to Shopping Bag'}
            >
              <ShoppingBag size={14} /> Add
            </button>
          )}
        </div>
      </div>
    </div>
  );
}