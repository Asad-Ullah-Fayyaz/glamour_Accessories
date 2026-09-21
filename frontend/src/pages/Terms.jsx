import React from 'react';
import PolicyLayout from '../components/common/PolicyLayout';

export default function Terms() {
  return (
    <PolicyLayout
      title="Terms & Conditions"
      subtitle="The rules that govern your use of AXI Collection."
      lastUpdated="January 2026"
    >
      <p>
        By accessing or purchasing from AXI Collection, you agree to these terms. Please read
        them carefully.
      </p>

      <h2>1. Use of the Website</h2>
      <p>
        You agree to use this website only for lawful purposes. You must not:
      </p>
      <ul>
        <li>Attempt to gain unauthorized access to any part of the site</li>
        <li>Use automated systems to scrape, copy, or overload our services</li>
        <li>Place fraudulent, fake, or malicious orders</li>
        <li>Impersonate another person or entity</li>
      </ul>

      <h2>2. Account Responsibility</h2>
      <p>
        If you create an account, you are responsible for maintaining the confidentiality of
        your login credentials and for all activity under your account. Notify us immediately
        if you suspect unauthorized access.
      </p>

      <h2>3. Product Information</h2>
      <p>
        We make every effort to display accurate product descriptions, images, and prices.
        However:
      </p>
      <ul>
        <li>Colors may vary slightly due to screen settings</li>
        <li>Product specifications may be updated without notice</li>
        <li>We reserve the right to correct pricing errors before dispatch</li>
      </ul>

      <h2>4. Pricing & Payment</h2>
      <p>
        All prices are listed in <strong>Pakistani Rupees (PKR)</strong> and are subject to
        change without notice. Payment is currently accepted via <strong>Cash on
        Delivery</strong> only.
      </p>
      <p>
        We reserve the right to refuse or cancel any order, particularly in cases of pricing
        errors, suspected fraud, or unusual order patterns.
      </p>

      <h2>5. Orders & Acceptance</h2>
      <p>
        Placing an order is an offer to purchase. Your order is confirmed only when we
        dispatch it and send you a tracking number. We may cancel orders due to stock
        unavailability, pricing issues, or delivery restrictions.
      </p>

      <h2>6. Shipping & Delivery</h2>
      <p>
        Delivery timelines are estimates and not guarantees. Delays caused by weather,
        strikes, or courier issues are outside our control. See our{' '}
        <a href="/shipping-policy">Shipping Policy</a> for details.
      </p>

      <h2>7. Returns & Replacements</h2>
      <p>
        Our <a href="/returns-policy">Returns & Replacement Policy</a> describes what we
        cover. In short: <strong>we replace, we do not refund</strong>. Report any issue
        within 48 hours of delivery.
      </p>

      <h2>8. Intellectual Property</h2>
      <p>
        All content on this site — logos, images, text, designs — is owned by AXI Collection
        and protected by copyright. You may not copy, reproduce, or use our content without
        written permission.
      </p>

      <h2>9. Limitation of Liability</h2>
      <p>
        To the maximum extent permitted by law, AXI Collection is not liable for:
      </p>
      <ul>
        <li>Indirect, incidental, or consequential damages</li>
        <li>Losses caused by courier delays or errors</li>
        <li>Product misuse after delivery</li>
        <li>Data loss from technical failures beyond our control</li>
      </ul>

      <h2>10. Order Refusal Rights</h2>
      <p>
        We reserve the right to refuse or cancel any order at any time, especially in cases
        of:
      </p>
      <ul>
        <li>Repeated failed deliveries or refused parcels</li>
        <li>Suspected fraudulent activity</li>
        <li>Abusive behavior toward our staff or couriers</li>
      </ul>

      <h2>11. Changes to Terms</h2>
      <p>
        We may update these terms from time to time. Continued use of our site after changes
        means you accept the updated terms.
      </p>

      <h2>12. Governing Law</h2>
      <p>
        These terms are governed by the laws of the Islamic Republic of Pakistan. Any disputes
        are subject to the jurisdiction of courts in Pakistan.
      </p>

      <h2>13. Contact</h2>
      <p>
        For questions about these terms, contact us via the WhatsApp button on any page.
      </p>
    </PolicyLayout>
  );
}