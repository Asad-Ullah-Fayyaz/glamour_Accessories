import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Trash2, ArrowRight, ShoppingBag } from "lucide-react";
import {
  selectCart,
  updateQuantity,
  removeFromCart,
  clearCart
} from "../store/slices/cartSlice";
import api from "../services/api";

export default function CartPage() {
  const dispatch = useDispatch();
  const cart = useSelector(selectCart);
  const navigate = useNavigate();

  const [freeShippingThreshold, setFreeShippingThreshold] = useState(5000);
  const [codFee, setCodFee] = useState(300);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await api.get('/site-content/homepage');
        if (res.success && res.content?.store) {
          const store = res.content.store;
          if (typeof store.freeShippingThreshold === 'number') {
            setFreeShippingThreshold(store.freeShippingThreshold);
          }
          if (typeof store.codFee === 'number') setCodFee(store.codFee);
        }
      } catch {
        // Keep the backend-aligned fallbacks.
      }
    };
    loadSettings();
  }, []);

  const amountNeededForFreeShipping = Math.max(
    0,
    freeShippingThreshold - cart.subtotal,
  );

  return (
    <div className="container cart-page">
      <h1 className="cart-title">Your Shopping Bag</h1>
      <p className="cart-subtitle">
        Review your luxury accessories before proceeding to Cash on Delivery
        checkout
      </p>

      {cart.items.length === 0 ? (
        <div className="cart-empty">
          <ShoppingBag
            size={56}
            style={{ opacity: 0.2, marginBottom: "1rem" }}
          />
          <h3 className="cart-empty-title">Your shopping bag is empty</h3>
          <p className="cart-empty-text">
            Discover our latest timepieces and sunglasses collections.
          </p>
          <Link to="/products" className="btn btn-primary">
            Explore Catalog
          </Link>
        </div>
      ) : (
        <div className="cart-layout">
          {/* Main Cart Items */}
          <div className="cart-main">
            {/* Free Shipping Progress Indicator */}
            <div className="cart-shipping-note">
              {amountNeededForFreeShipping > 0 ? (
                <p>
                  Add{" "}
                  <strong>
                    PKR {amountNeededForFreeShipping.toLocaleString()}
                  </strong>{" "}
                  more to unlock <strong>Free Shipping</strong>.
                </p>
              ) : (
                <p className="cart-shipping-success">
                  &check; You qualify for Complimentary Express Nationwide
                  Shipping!
                </p>
              )}
            </div>

            <div className="table-responsive">
              <table className="custom-table cart-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Price</th>
                    <th>Quantity</th>
                    <th style={{ textAlign: "right" }}>Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.items.map((item, idx) => (
                    <tr key={item.lineId || `${item.product._id}-${idx}`}>
                      <td>
                        <div className="cart-item-product">
                          <img
                            src={
                              item.product.images?.[0] ||
                              "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1000&auto=format&fit=crop"
                            }
                            alt={item.product.name}
                            className="cart-item-image"
                          />
                          <div className="cart-item-info">
                            <Link
                              to={`/products/${item.product.slug}`}
                              className="cart-item-name"
                            >
                              {item.product.name}
                            </Link>
                            <p className="cart-item-category">
                              {item.product.category?.name}
                            </p>

                                                      {/* Customization — only shown when present */}
                            {item.customization &&
                              (item.customization.description ||
                                item.customization.prescriptionImage ||
                                item.customization.lensOption) && (
                                <div className="cart-item-customization">
                                  {item.customization.lensOption && (
                                    <p className="cart-item-customization-text">
                                      <strong>Lens:</strong>{" "}
                                      {item.customization.lensOption.name}
                                      {item.customization.lensOption.price > 0 && (
                                        <>
                                          {" "}
                                          <span style={{ color: 'var(--text-muted)' }}>
                                            (+PKR{' '}
                                            {Number(
                                              item.customization.lensOption.price
                                            ).toLocaleString()}
                                            )
                                          </span>
                                        </>
                                      )}
                                    </p>
                                  )}
                                  {item.customization.description && (
                                    <p className="cart-item-customization-text">
                                      <strong>Rx:</strong>{" "}
                                      {item.customization.description}
                                    </p>
                                  )}
                                  {item.customization.prescriptionImage && (
                                    <a
                                      href={
                                        item.customization.prescriptionImage
                                      }
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="cart-item-customization-link"
                                    >
                                      📎 View prescription image
                                    </a>
                                  )}
                                </div>
                              )}
                          </div>
                        </div>
                      </td>
                      <td className="cart-item-price">
                        PKR {(item.product.isOnSale === true
                          ? item.product.salePrice
                          : item.product.price
                        ).toLocaleString()}
                      </td>
                      <td>
                        <div className="cart-qty">
                          <button
                            onClick={() =>
                              dispatch(updateQuantity({ lineId: item.lineId, quantity: item.quantity - 1 }))
                            }
                            aria-label="Decrease quantity"
                          >
                            -
                          </button>
                          <span>{item.quantity}</span>
                          <button
                            onClick={() =>
                              dispatch(updateQuantity({ lineId: item.lineId, quantity: item.quantity + 1 }))
                            }
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="cart-item-total">
                        PKR{" "}
                        {item.itemTotal.toLocaleString()}
                      </td>
                      <td className="cart-item-remove">
                        <button
                          onClick={() =>
                            dispatch(
                              removeFromCart({
                                lineId: item.lineId,
                                legacyProductId: item.lineId ? null : item.product._id
                              })
                            )
                          }
                          aria-label="Remove item"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="cart-actions">
              <button
                onClick={() => dispatch(clearCart())}
                className="btn btn-secondary btn-sm cart-clear-btn"
              >
                Clear Shopping Bag
              </button>
              <Link to="/products" className="btn btn-secondary btn-sm">
                Continue Shopping
              </Link>
            </div>
          </div>

          {/* Summary Sidebar */}
          <aside className="cart-summary">
            <h3 className="cart-summary-title">Order Summary</h3>

            <div className="cart-summary-row">
              <span className="cart-summary-label">Bag Subtotal</span>
              <span>PKR {cart.subtotal.toLocaleString()}</span>
            </div>

            <div className="cart-summary-row">
              <span className="cart-summary-label">Estimated Shipping</span>
              <span>
                {cart.subtotal >= freeShippingThreshold ? "FREE" : `PKR ${codFee.toLocaleString()}`}
              </span>
            </div>

            <div className="cart-summary-row cart-summary-row--last">
              <span className="cart-summary-label">Payment Method</span>
              <strong style={{ fontSize: "0.8rem" }}>Cash on Delivery</strong>
            </div>

            <div className="cart-summary-total">
              <span>Total Amount</span>
              <span>
                PKR{" "}
                {(
                  cart.subtotal +
                  (cart.subtotal >= freeShippingThreshold ? 0 : codFee)
                ).toLocaleString()}
              </span>
            </div>

            <button
              onClick={() => navigate("/checkout")}
              className="btn btn-primary btn-full"
            >
              Proceed to Checkout <ArrowRight size={16} />
            </button>
          </aside>
        </div>
      )}

      <style>{`
        .cart-page {
          padding: 3rem 1.5rem;
        }

        .cart-title {
          font-family: var(--font-serif);
          font-size: 2.5rem;
          margin-bottom: 0.5rem;
        }

        .cart-subtitle {
          font-size: 0.9rem;
          color: var(--text-secondary);
          margin-bottom: 2.5rem;
        }

        /* Empty state */
        .cart-empty {
          text-align: center;
          padding: 5rem 1rem;
          background-color: var(--bg-secondary);
          border-radius: var(--radius-sm);
        }
        .cart-empty-title {
          font-family: var(--font-serif);
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
        }
        .cart-empty-text {
          color: var(--text-muted);
          margin-bottom: 1.5rem;
        }

        /* Layout */
        .cart-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 340px;
          gap: 3rem;
          align-items: start;
        }
        .cart-main {
          min-width: 0;
        }

        /* Shipping note */
        .cart-shipping-note {
          background-color: var(--bg-secondary);
          padding: 1rem 1.25rem;
          border: 1px solid var(--border-light);
          margin-bottom: 1.5rem;
          font-size: 0.85rem;
          color: var(--text-secondary);
        }
        .cart-shipping-success {
          color: #137333;
          font-weight: 600;
        }

        /* Product cell */
        .cart-item-product {
          display: flex;
          align-items: center;
          gap: 1rem;
          min-width: 0;
        }
        .cart-item-image {
          width: 64px;
          height: 80px;
          object-fit: cover;
          background-color: var(--bg-tertiary);
          flex-shrink: 0;
        }
        .cart-item-info {
          min-width: 0;
        }
        .cart-item-name {
          font-weight: 600;
          font-size: 0.9rem;
          color: var(--text-primary);
          display: block;
          overflow-wrap: anywhere;
        }
        .cart-item-category {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .cart-item-price,
        .cart-item-total {
          font-size: 0.9rem;
          white-space: nowrap;
        }
        .cart-item-total {
          text-align: right;
          font-weight: 700;
        }
        .cart-item-remove {
          text-align: center;
        }
        .cart-item-remove button {
          color: var(--text-muted);
          padding: 0.4rem;
        }

                .cart-item-customization {
          margin-top: 0.4rem;
          padding: 0.4rem 0.6rem;
          background-color: var(--bg-primary);
          border-left: 2px solid var(--accent-gold);
          border-radius: var(--radius-sm);
          font-size: 0.72rem;
          line-height: 1.4;
          max-width: 320px;
        }

        .cart-item-customization-text {
          color: var(--text-secondary);
          margin-bottom: 0.25rem;
          overflow-wrap: anywhere;
        }

        .cart-item-customization-text strong {
          color: var(--text-primary);
          font-weight: 700;
        }

        .cart-item-customization-link {
          color: var(--accent-gold);
          text-decoration: underline;
          font-size: 0.72rem;
          display: inline-block;
        }

        /* Quantity control */
        .cart-qty {
          display: inline-flex;
          border: 1px solid var(--border-light);
          align-items: center;
        }
        .cart-qty button {
          padding: 0.3rem 0.6rem;
          min-width: 32px;
          min-height: 32px;
        }
        .cart-qty span {
          padding: 0.3rem 0.6rem;
          font-weight: 600;
          font-size: 0.85rem;
          min-width: 28px;
          text-align: center;
        }

        /* Actions */
        .cart-actions {
          display: flex;
          justify-content: space-between;
          gap: 0.75rem;
          flex-wrap: wrap;
          margin-top: 1.5rem;
        }
        .cart-clear-btn {
          color: red;
          border-color: #ffcccc;
        }

        /* Summary */
        .cart-summary {
          background-color: var(--bg-secondary);
          padding: 1.75rem;
          border: 1px solid var(--border-light);
        }
        .cart-summary-title {
          font-family: var(--font-serif);
          font-size: 1.25rem;
          margin-bottom: 1.25rem;
          border-bottom: 1px solid var(--border-light);
          padding-bottom: 0.75rem;
        }
        .cart-summary-row {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          font-size: 0.9rem;
          margin-bottom: 0.75rem;
        }
        .cart-summary-row--last {
          margin-bottom: 1.5rem;
        }
        .cart-summary-label {
          color: var(--text-secondary);
        }
        .cart-summary-total {
          border-top: 1px solid var(--border-light);
          padding-top: 1rem;
          margin-bottom: 1.5rem;
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          font-size: 1.1rem;
          font-weight: 700;
        }

        /* === Responsive Breakpoints === */
        @media (max-width: 900px) {
          .cart-layout {
            grid-template-columns: 1fr;
            gap: 2rem;
          }
          .cart-summary {
            position: static;
          }
        }

        @media (max-width: 640px) {
          .cart-page {
            padding: 2rem 1rem;
          }
          .cart-title {
            font-size: 1.75rem;
          }
          .cart-subtitle {
            font-size: 0.85rem;
            margin-bottom: 1.75rem;
          }
          .cart-empty {
            padding: 3rem 1rem;
          }
          .cart-empty-title {
            font-size: 1.25rem;
          }
          .cart-summary {
            padding: 1.25rem;
          }
          .cart-summary-total {
            font-size: 1rem;
          }
          .cart-actions {
            flex-direction: column;
          }
          .cart-actions .btn {
            width: 100%;
            text-align: center;
            justify-content: center;
          }

          /* Convert table into stacked cards on small screens */
          .cart-table thead {
            display: none;
          }
          .cart-table,
          .cart-table tbody,
          .cart-table tr,
          .cart-table td {
            display: block;
            width: 100%;
          }
          .cart-table tr {
            border: 1px solid var(--border-light);
            margin-bottom: 1rem;
            padding: 1rem;
            background-color: var(--bg-secondary);
          }
          .cart-table td {
            border: none;
            padding: 0.35rem 0;
            text-align: left !important;
          }
          .cart-table td::before {
            content: attr(data-label);
            display: inline-block;
            font-size: 0.7rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--text-muted);
            margin-right: 0.5rem;
          }
          .cart-item-price::before { content: 'Price: '; }
          .cart-item-total::before { content: 'Total: '; }
          .cart-item-total {
            font-size: 1rem;
          }
          .cart-item-remove {
            text-align: right;
          }
          .cart-qty button {
            min-width: 36px;
            min-height: 36px;
          }
        }

        @media (max-width: 400px) {
          .cart-item-image {
            width: 54px;
            height: 68px;
          }
          .cart-item-name {
            font-size: 0.85rem;
          }
        }
      `}</style>
    </div>
  );
}