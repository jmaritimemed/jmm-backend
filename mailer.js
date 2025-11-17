// mailer.js
require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true', // true for 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// optional: verify at startup
transporter.verify().then(() => {
  console.log('SMTP connection OK (mailer.js).');
}).catch(err => {
  console.error('SMTP verification failed:', err);
});

async function sendTestMail() {
  const info = await transporter.sendMail({
    from: `"Journal of Maritime Medicine" <${process.env.SMTP_USER}>`,
    to: process.env.SMTP_USER,
    subject: 'JMM backend /api/test-mail',
    text: 'If you see this, the Express backend can send email via cPanel SMTP.',
    html: '<p>If you see this, the Express backend can send email via cPanel SMTP.</p>',
  });
  console.log('Test mail from /api/test-mail sent:', info.messageId);
}

// NEW: welcome email to a subscriber/user
async function sendWelcomeMail(toEmail, firstName) {
  const info = await transporter.sendMail({
    from: `"Journal of Maritime Medicine" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: 'Welcome to the Journal of Maritime Medicine',
    text: `Dear ${firstName || 'colleague'},\n\nThank you for creating an account with the Journal of Maritime Medicine.\n\nYou will receive updates according to your email preferences.\n\nBest wishes,\nJournal of Maritime Medicine`,
    html: `
      <p>Dear ${firstName || 'colleague'},</p>
      <p>Thank you for creating an account with the <strong>Journal of Maritime Medicine</strong>.</p>
      <p>You will receive updates according to your email preferences.</p>
      <p>Best wishes,<br>Journal of Maritime Medicine</p>
    `,
  });
  console.log('Welcome mail sent to', toEmail, 'id:', info.messageId);
}

module.exports = { transporter, sendTestMail, sendWelcomeMail };

async function sendPasswordResetMail(toEmail, token) {
  const resetUrl = `${process.env.APP_BASE_URL || ''}/reset-password?token=${token}`;

  const info = await transporter.sendMail({
    from: `"Journal of Maritime Medicine" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: 'Reset your password – Journal of Maritime Medicine',
    text: `Dear colleague,

We received a request to reset your password for the Journal of Maritime Medicine account.

Please click the link below (or copy and paste it into your browser) to set a new password:

${resetUrl}

If you did not request this, you can safely ignore this email.

Best regards,
Journal of Maritime Medicine`,
    html: `
      <p>Dear colleague,</p>
      <p>We received a request to reset your password for the <strong>Journal of Maritime Medicine</strong> account.</p>
      <p>Please click the link below (or copy and paste it into your browser) to set a new password:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>If you did not request this, you can safely ignore this email.</p>
      <p>Best regards,<br>Journal of Maritime Medicine</p>
    `,
  });

  console.log('Password reset mail sent to', toEmail, 'id:', info.messageId);
}

module.exports = { transporter, sendTestMail, sendWelcomeMail, sendPasswordResetMail };

