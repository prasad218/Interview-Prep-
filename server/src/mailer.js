// Sends the founder a notification email whenever a candidate redeems a
// payment code. Configured entirely through env vars so no secrets live in
// source. Two ways to configure it:
//
//   Easiest (Gmail with an App Password — not your normal Gmail password,
//   generate one at https://myaccount.google.com/apppasswords):
//     EMAIL_USER=you@gmail.com
//     EMAIL_PASS=your-16-char-app-password
//
//   Any other SMTP provider (Zoho, Brevo, SES, your host's mailbox, etc.):
//     SMTP_HOST=smtp.example.com
//     SMTP_PORT=587
//     SMTP_USER=you@example.com
//     SMTP_PASS=your-smtp-password
//     SMTP_SECURE=false        (optional, "true" if port 465)
//
//   Where the notification goes (defaults to the address below if unset):
//     FOUNDER_EMAIL=sureshksidkidu@gmail.com
//
// If nothing is configured, redemptions still work — they just log a
// warning instead of emailing you, so a missing env var never blocks a
// paying candidate from getting their credits.

import nodemailer from "nodemailer";

const FOUNDER_EMAIL = process.env.FOUNDER_EMAIL || "sureshksidkidu@gmail.com";

function buildTransport() {
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
  }
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return null;
}

let transporter = null;
let warned = false;

function getTransporter() {
  if (transporter) return transporter;
  transporter = buildTransport();
  if (!transporter && !warned) {
    warned = true;
    console.warn(
      "\n⚠️  No email sender configured — redemption notifications will only " +
        "be logged, not emailed. Set EMAIL_USER + EMAIL_PASS (Gmail app " +
        "password) or SMTP_HOST/SMTP_USER/SMTP_PASS in server/.env.\n"
    );
  }
  return transporter;
}

/**
 * Notifies the founder that a candidate redeemed a payment code.
 * Never throws — a failed email should never block credits being granted,
 * so callers can fire-and-forget (still await it to get the log line).
 */
export async function sendRedemptionNotification({
  name,
  code,
  loginCode,
  creditsGranted,
  totalCredits,
}) {
  const subject = `✅ Code redeemed: ${name} (${code})`;
  const text =
    `${name} just redeemed payment code ${code}.\n\n` +
    `Login code: ${loginCode}\n` +
    `Credits granted: ${creditsGranted}\n` +
    `Their new balance: ${totalCredits}\n` +
    `Time: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST\n`;

  const mailer = getTransporter();
  if (!mailer) {
    console.log(`[redemption] ${text}`);
    return { sent: false };
  }

  try {
    await mailer.sendMail({
      from: process.env.EMAIL_USER || process.env.SMTP_USER,
      to: FOUNDER_EMAIL,
      subject,
      text,
    });
    return { sent: true };
  } catch (err) {
    console.error("Failed to send redemption notification email:", err.message);
    return { sent: false, error: err.message };
  }
}
