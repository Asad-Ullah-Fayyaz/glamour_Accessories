import React from 'react';
import PolicyLayout from '../components/common/PolicyLayout';

export default function PrivacyPolicy() {
  return (
    <PolicyLayout
      title="Privacy Policy"
      subtitle="How we collect, use, and protect your personal information."
      lastUpdated="January 2026"
    >
      <p>
        At AXI Collection, your privacy matters. This policy explains what information we
        collect, why we collect it, and how we protect it.
      </p>

      <h2>Information We Collect</h2>
      <h3>When you place an order</h3>
      <ul>
        <li>Full name</li>
        <li>Phone number</li>
        <li>Email address</li>
        <li>Delivery address (street, city, province, postal code)</li>
        <li>Order details and preferences</li>
      </ul>

      <h3>When you browse the site</h3>
      <ul>
        <li>Device type and browser information</li>
        <li>Pages you view and time spent</li>
        <li>Anonymized analytics data</li>
      </ul>

      <h3>When you create an account</h3>
      <ul>
        <li>Login credentials (password is hashed — we never see it)</li>
        <li>Saved addresses and order history</li>
      </ul>

      <h2>How We Use Your Information</h2>
      <ul>
        <li>To process and fulfill your order</li>
        <li>To send order confirmations and delivery updates</li>
        <li>To provide customer support and handle replacements</li>
        <li>To improve our products and website experience</li>
        <li>To prevent fraudulent or abusive orders</li>
      </ul>

      <h2>Information Sharing</h2>
      <p>
        We do <strong>not</strong> sell, rent, or trade your personal information. We share
        data only with:
      </p>
      <ul>
        <li>
          <strong>Courier partners</strong> — to deliver your parcel
        </li>
        <li>
          <strong>Payment/COD processing</strong> — if applicable
        </li>
        <li>
          <strong>Legal authorities</strong> — only if required by law
        </li>
      </ul>

      <h2>Data Security</h2>
      <p>
        We use industry-standard measures to protect your data:
      </p>
      <ul>
        <li>Passwords are hashed with bcrypt — never stored in plain text</li>
        <li>Secure HTTPS encryption for all data in transit</li>
        <li>Access to customer data is limited to necessary staff</li>
        <li>Regular backups and monitoring</li>
      </ul>

      <h2>Cookies</h2>
      <p>
        We use essential cookies to keep your cart, session, and login working. We do not use
        third-party tracking cookies for advertising.
      </p>

      <h2>Your Rights</h2>
      <p>You have the right to:</p>
      <ul>
        <li>Access the personal data we hold about you</li>
        <li>Request corrections to inaccurate information</li>
        <li>Request deletion of your account and data</li>
        <li>Opt out of non-essential communications</li>
      </ul>
      <p>
        To exercise any of these rights, contact us via the WhatsApp button on any page.
      </p>

      <h2>Data Retention</h2>
      <p>
        We keep your order history for accounting and support purposes. Account data is kept
        while your account is active. If you delete your account, we remove personal
        information, though order records may be retained as required by law.
      </p>

      <h2>Children's Privacy</h2>
      <p>
        Our services are not intended for users under 18. We do not knowingly collect data
        from minors.
      </p>

      <h2>Changes to This Policy</h2>
      <p>
        We may update this policy occasionally. The "Last updated" date at the top reflects
        the latest revision. Continued use of our site means you accept the updated policy.
      </p>

      <h2>Contact</h2>
      <p>
        For any privacy-related questions, reach us via the WhatsApp button on any page.
      </p>
    </PolicyLayout>
  );
}