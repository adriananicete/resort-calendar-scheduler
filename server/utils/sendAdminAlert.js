import nodemailer from 'nodemailer';

// Gmail SMTP transporter — lazily initialized on first alert so the server
// can boot even if alert credentials aren't configured (dev environments).
let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const user = process.env.ALERT_EMAIL_USER;
  const pass = process.env.ALERT_EMAIL_PASSWORD;
  if (!user || !pass) return null;

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
  return transporter;
}

function parseRecipients(raw) {
  return (raw || '')
    .split(',')
    .map((addr) => addr.trim())
    .filter(Boolean);
}

// Fire-and-forget: never throws into the caller. Webhook must still return 200
// to GHL even if the alert email fails — we log the failure and move on.
export async function sendUnmatchedPaymentAlert({ payload }) {
  const to = parseRecipients(process.env.ALERT_EMAIL_TO);
  const t = getTransporter();

  if (!t || to.length === 0) {
    console.warn(
      'Admin alert skipped: ALERT_EMAIL_USER / ALERT_EMAIL_PASSWORD / ALERT_EMAIL_TO not fully configured'
    );
    return;
  }

  // Redact the shared secret before logging or emailing (H4 safety).
  const { secret: _secret, ...safePayload } = payload || {};

  const safeLines = [
    `email: ${safePayload.email || '(missing)'}`,
    `bookingId: ${safePayload.bookingId || '(missing)'}`,
    `payment_status: ${safePayload.payment_status || '(missing)'}`,
    `amount: ${safePayload.amount ?? '(missing)'}`,
  ].join('\n');

  const body = [
    'A GoHighLevel webhook arrived with payment_status="paid" but no matching pending booking was found in the database.',
    '',
    'Payload received:',
    safeLines,
    '',
    `Received at: ${new Date().toISOString()}`,
    '',
    'Possible causes:',
    '  - Ghost payment: customer paid after the 60-min pending window expired',
    '  - Email typo on the GHL form (if webhook has no bookingId)',
    '  - GHL misconfiguration (wrong field keys)',
    '  - Unauthorized request with a leaked webhook secret',
    '',
    'Action required:',
    '  1. Verify the payment in the GHL dashboard.',
    '  2. If legitimate: create the booking manually and notify the customer.',
    '  3. If suspicious: refund via GHL and consider rotating GHL_WEBHOOK_SECRET.',
  ].join('\n');

  try {
    await t.sendMail({
      from: process.env.ALERT_EMAIL_USER,
      to,
      subject: '[ALERT] Resort Scheduler — GHL payment with no matching booking',
      text: body,
    });
    console.log(`Admin alert sent to ${to.join(', ')}`);
  } catch (err) {
    console.error('Admin alert failed to send:', err.message);
  }
}
