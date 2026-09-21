import React from 'react';
import PolicyLayout from '../components/common/PolicyLayout';

export default function ShippingPolicy() {
  return (
    <PolicyLayout
      title="Shipping & Delivery Policy"
      subtitle="How we deliver across Pakistan — timelines, charges, and coverage."
      lastUpdated="January 2026"
    >
      <p>
        AXI Collection ships nationwide across Pakistan through trusted courier partners. Every
        parcel is packed with care and dispatched within 24 hours of order confirmation.
      </p>

      <h2>Delivery Coverage</h2>
      <p>
        We deliver to <strong>all major cities and most rural areas</strong> across Pakistan —
        including Karachi, Lahore, Islamabad, Rawalpindi, Faisalabad, Multan, Peshawar,
        Quetta, and hundreds of smaller towns.
      </p>

      <h2>Delivery Timeline</h2>
      <ul>
        <li>
          <strong>Karachi, Lahore, Islamabad:</strong> 2–3 business days
        </li>
        <li>
          <strong>Other major cities:</strong> 3–4 business days
        </li>
        <li>
          <strong>Remote areas:</strong> 4–6 business days
        </li>
      </ul>
      <p>
        Business days exclude Sundays and public holidays. During sales or peak seasons,
        deliveries may take an additional 1–2 days.
      </p>

      <h2>Shipping Charges</h2>
      <p>
        We charge a flat shipping fee on orders below our free-shipping threshold. Orders above
        the threshold ship completely free.
      </p>
      <p>
        The exact fee and threshold are shown at checkout before you confirm your order, so
        there are never any surprises.
      </p>

      <h2>Cash on Delivery (COD)</h2>
      <p>
        Every order is currently shipped with <strong>Cash on Delivery</strong>. You pay the
        courier agent in cash when your parcel arrives. No advance payment, no card details,
        no online transfer required.
      </p>

      <h3>Inspect Before Payment</h3>
      <p>
        Please <strong>open and inspect your parcel in front of the courier agent</strong>{' '}
        before paying. If you find any issue, you can refuse the delivery on the spot.
      </p>

      <h2>Order Tracking</h2>
      <p>
        Once your order is dispatched, you will receive a courier tracking number. You can
        track your order anytime on our{' '}
        <a href="/track-order">Track Order</a> page using your Order ID and email/phone.
      </p>

      <h2>Failed Deliveries</h2>
      <p>
        If the courier is unable to reach you (wrong address, phone unreachable, refused
        without valid reason), the parcel will be returned to us. Repeated failed deliveries
        may result in the order being cancelled and future COD orders being restricted for
        that customer.
      </p>
      <p>
        If you need to update your delivery address after placing an order, contact us on
        WhatsApp <strong>before</strong> the parcel is dispatched.
      </p>

      <h2>International Shipping</h2>
      <p>
        We currently ship only within Pakistan. International shipping is not available at
        this time.
      </p>

      <h2>Contact</h2>
      <p>
        For any shipping-related questions, reach out via the WhatsApp button on any page.
        We respond within a few hours during business hours.
      </p>
    </PolicyLayout>
  );
}