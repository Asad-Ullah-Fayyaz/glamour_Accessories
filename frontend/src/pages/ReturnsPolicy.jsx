import React from 'react';
import PolicyLayout from '../components/common/PolicyLayout';

export default function ReturnsPolicy() {
  return (
    <PolicyLayout
      title="Returns & Replacement Policy"
      subtitle="Our commitment to your satisfaction — clear, fair, and simple."
      lastUpdated="January 2026"
    >
      <p>
        At <strong>AXI Collection</strong>, every product is inspected before it leaves our
        facility. If something isn't right with your order, we want to make it right. This
        policy explains exactly what we cover and how to request a replacement.
      </p>

      <h2>Our Replacement Guarantee</h2>
      <p>
        If your order arrives <strong>incorrect, damaged, or broken</strong>, we will arrange a
        replacement at no additional cost. This is our core commitment to you.
      </p>

      <h3>Eligibility Window</h3>
      <ul>
        <li>
          You must report the issue within <strong>48 hours</strong> of receiving your parcel.
        </li>
        <li>
          Issues must be reported with clear photos or a short video showing the problem.
        </li>
        <li>
          The product must be in its original packaging with all accessories and tags intact.
        </li>
      </ul>

      <h3>What We Replace</h3>
      <ul>
        <li>Wrong item delivered (different from what you ordered)</li>
        <li>Product damaged in transit</li>
        <li>Defective items that don't function as intended</li>
        <li>Missing components from a multi-item order</li>
      </ul>

      <h3>What We Do NOT Accept</h3>
      <ul>
        <li>Damage caused after delivery (drops, water, misuse)</li>
        <li>Change of mind or personal preference</li>
        <li>Products without original packaging</li>
        <li>Requests made after the 48-hour window</li>
      </ul>

      <h2>Cash Refunds</h2>
      <p>
        <strong>We do not offer cash refunds.</strong> This is a strict policy across all our
        product lines. Every eligible issue is resolved through a replacement of the same or
        equivalent item.
      </p>
      <p>
        This policy exists because our products are sold at fair pricing with Cash on Delivery,
        and offering cash refunds would open the door to abuse that ultimately harms honest
        customers through higher prices.
      </p>

      <h2>How to Request a Replacement</h2>
      <ol style={{ paddingLeft: '1.25rem', margin: '0.5rem 0 1.25rem 0' }}>
        <li style={{ marginBottom: '0.5rem' }}>
          Take photos or a short video of the issue.
        </li>
        <li style={{ marginBottom: '0.5rem' }}>
          Message us on WhatsApp with your <strong>Order ID</strong> and the media.
        </li>
        <li style={{ marginBottom: '0.5rem' }}>
          Our team will verify within 24 hours and confirm the replacement.
        </li>
        <li style={{ marginBottom: '0.5rem' }}>
          We dispatch the replacement — you only pay for the return shipment if applicable.
        </li>
      </ol>

      <h2>Inspect Before You Pay</h2>
      <p>
        We strongly encourage you to <strong>open and inspect your parcel in front of the
        courier agent</strong> before paying. If something is visibly wrong, you can refuse
        the delivery on the spot — no cost, no hassle, no follow-up needed.
      </p>

      <h2>Contact</h2>
      <p>
        For any return or replacement request, use the <strong>WhatsApp button</strong> on any
        page. Our support hours are Monday to Saturday, 9 AM to 8 PM.
      </p>
    </PolicyLayout>
  );
}