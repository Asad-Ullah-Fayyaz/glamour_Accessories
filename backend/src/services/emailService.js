const nodemailer = require('nodemailer');
const { config } = require('../config/env');
const logger = require('../utils/logger');

// Escape user-controlled content before inserting into HTML emails (prevents HTML injection)
const escapeHtml = (str) =>
  String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const createTransporter = async () => {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  // PRODUCTION with no SMTP config: email is unavailable — say so clearly.
  if (config.isProduction) {
    throw new Error('SMTP is not configured. Set SMTP_HOST, SMTP_USER and SMTP_PASS in production.');
  }

  // Development fallback: Ethereal test account with console preview URLs
  const testAccount = await nodemailer.createTestAccount();
  logger.warn('SMTP not configured — using Ethereal test account (dev only)');
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass
    }
  });
};

const sendMailSafe = async ({ to, subject, html, label, orderId }) => {
  try {
    const transporter = await createTransporter();
    const fromAddress = process.env.SMTP_FROM || 'AXI Collection <orders@axicollection.com>';

    const info = await transporter.sendMail({ from: fromAddress, to, subject, html });

    logger.info(`Email dispatched: ${label}`, { orderId, to });
    if (nodemailer.getTestMessageUrl(info)) {
      logger.dev(`Email preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }
    return info;
  } catch (err) {
    // Never silently swallow — callers also log, but record it here with context
    logger.error(`Email FAILED: ${label}`, { orderId, error: err.message });
    throw err;
  }
};

const sendOrderConfirmationEmail = async (order) => {
  const itemsHtml = order.items.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${escapeHtml(item.name)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">PKR ${item.price.toLocaleString()}</td>
      </tr>
    `).join('');

    const htmlContent = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #111;">
        <div style="background-color: #0d0d0d; padding: 25px; text-align: center; color: #fff;">
          <h1 style="margin: 0; font-size: 24px; letter-spacing: 3px;">AXI COLLECTION</h1>
          <p style="margin: 5px 0 0 0; font-size: 12px; letter-spacing: 1px; color: #888;">ORDER CONFIRMATION</p>
        </div>
        <div style="padding: 30px; background-color: #fafafa; border: 1px solid #eee;">
          <h2>Thank you for your order, ${escapeHtml(order.shippingAddress.fullName)}!</h2>
          <p>We have successfully received your Cash on Delivery order and our team is preparing it for fulfillment.</p>

          <div style="background-color: #fff; padding: 15px; border-left: 4px solid #111; margin: 20px 0;">
            <p style="margin: 0;"><strong>Order ID:</strong> ${order.orderId}</p>
            <p style="margin: 5px 0 0 0;"><strong>Payment Method:</strong> Cash on Delivery (COD)</p>
            <p style="margin: 5px 0 0 0;"><strong>Status:</strong> ${order.status}</p>
          </div>

          <h3>Order Items</h3>
          <table style="width: 100%; border-collapse: collapse; background-color: #fff;">
            <thead>
              <tr style="background-color: #f0f0f0;">
                <th style="padding: 10px; text-align: left;">Item</th>
                <th style="padding: 10px; text-align: center;">Qty</th>
                <th style="padding: 10px; text-align: right;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div style="text-align: right; margin-top: 20px;">
            <p style="margin: 0; font-size: 14px;">Subtotal: PKR ${order.subtotal.toLocaleString()}</p>
            <p style="margin: 5px 0; font-size: 14px;">Shipping: ${order.shippingCost === 0 ? 'FREE' : `PKR ${order.shippingCost}`}</p>
            <h3 style="margin: 10px 0 0 0; font-size: 18px;">Total: PKR ${order.totalAmount.toLocaleString()}</h3>
          </div>

          <h3 style="margin-top: 30px;">Shipping Destination</h3>
          <p style="margin: 0; line-height: 1.6;">
            ${escapeHtml(order.shippingAddress.fullName)}<br>
            ${escapeHtml(order.shippingAddress.street)}<br>
            ${escapeHtml(order.shippingAddress.city)}, ${escapeHtml(order.shippingAddress.postalCode)}<br>
            Phone: ${escapeHtml(order.shippingAddress.phone)}
          </p>
        </div>
        <div style="text-align: center; padding: 20px; font-size: 12px; color: #888;">
          © ${new Date().getFullYear()} AXI Collection. All rights reserved.
        </div>
      </div>
    `;

    await sendMailSafe({
      to: order.customerEmail,
      subject: `Order Confirmation — ${order.orderId} | AXI Collection`,
      html: htmlContent,
      label: 'Order Confirmation',
      orderId: order.orderId
    });
};

const sendTrackingEmail = async (order) => {
  const trackingId = escapeHtml(order.courierInfo.trackingId);
  const carrier = escapeHtml(order.courierInfo.carrier || 'Standard Courier Delivery');

    const htmlContent = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #111;">
        <div style="background-color: #0d0d0d; padding: 25px; text-align: center; color: #fff;">
          <h1 style="margin: 0; font-size: 24px; letter-spacing: 3px;">AXI COLLECTION</h1>
          <p style="margin: 5px 0 0 0; font-size: 12px; letter-spacing: 1px; color: #888;">SHIPMENT TRACKING UPDATE</p>
        </div>
        <div style="padding: 30px; background-color: #fafafa; border: 1px solid #eee;">
          <h2>Your Order Has Been Dispatched!</h2>
          <p>Dear ${escapeHtml(order.shippingAddress.fullName)}, your order <strong>${order.orderId}</strong> has been handed over to our courier partner and is en route to you.</p>

          <div style="background-color: #fff; padding: 20px; border-left: 4px solid #000; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
            <p style="margin: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #666;">Courier Service</p>
            <h3 style="margin: 5px 0 15px 0; font-size: 20px;">${carrier}</h3>
            <p style="margin: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #666;">Tracking Reference ID</p>
            <h2 style="margin: 5px 0 0 0; font-size: 24px; font-family: monospace; letter-spacing: 2px; color: #111;">${trackingId}</h2>
          </div>

          <p>Please keep cash ready for payment upon delivery (<strong>PKR ${order.totalAmount.toLocaleString()}</strong>).</p>

          <div style="text-align: center; margin-top: 30px;">
            <a href="${config.frontendUrl}/track-order?orderId=${encodeURIComponent(order.orderId)}"
               style="background-color: #0d0d0d; color: #fff; text-decoration: none; padding: 14px 28px; display: inline-block; font-size: 13px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase;">
              Track Shipment Online
            </a>
          </div>
        </div>
        <div style="text-align: center; padding: 20px; font-size: 12px; color: #888;">
          © ${new Date().getFullYear()} AXI Collection. All rights reserved.
        </div>
      </div>
    `;

    await sendMailSafe({
      to: order.customerEmail,
      subject: `Shipment Dispatch & Courier Tracking — ${order.orderId} | AXI Collection`,
      html: htmlContent,
      label: 'Shipment Tracking',
      orderId: order.orderId
    });
};

// @desc    Password reset email — contains a one-time expiring link
const sendPasswordResetEmail = async (user, rawToken) => {
  const resetUrl = `${config.frontendUrl}/reset-password?token=${rawToken}`;

  const htmlContent = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #111;">
        <div style="background-color: #0d0d0d; padding: 25px; text-align: center; color: #fff;">
          <h1 style="margin: 0; font-size: 24px; letter-spacing: 3px;">AXI COLLECTION</h1>
          <p style="margin: 5px 0 0 0; font-size: 12px; letter-spacing: 1px; color: #888;">PASSWORD RESET</p>
        </div>
        <div style="padding: 30px; background-color: #fafafa; border: 1px solid #eee;">
          <h2>Hello ${escapeHtml(user.name)},</h2>
          <p>We received a request to reset your AXI Collection account password.</p>
          <p>This link is valid for <strong>30 minutes</strong> and can only be used once.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}"
               style="background-color: #0d0d0d; color: #fff; text-decoration: none; padding: 14px 28px; display: inline-block; font-size: 13px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase;">
              Reset Your Password
            </a>
          </div>
          <p style="font-size: 12px; color: #888;">If you did not request this, you can safely ignore this email — your password will not change.</p>
        </div>
        <div style="text-align: center; padding: 20px; font-size: 12px; color: #888;">
          © ${new Date().getFullYear()} AXI Collection. All rights reserved.
        </div>
      </div>
    `;

  await sendMailSafe({
    to: user.email,
    subject: 'Password Reset Request | AXI Collection',
    html: htmlContent,
    label: 'Password Reset'
  });
};

module.exports = { sendOrderConfirmationEmail, sendTrackingEmail, sendPasswordResetEmail };
