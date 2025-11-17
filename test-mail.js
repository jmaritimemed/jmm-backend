// test-mail.js
require('dotenv').config();
const nodemailer = require('nodemailer');

async function main() {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true', // true for 465
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  console.log('Verifying SMTP connection...');
  await transporter.verify();
  console.log('SMTP connection OK.');

  const info = await transporter.sendMail({
    from: `"Journal of Maritime Medicine" <${process.env.SMTP_USER}>`,
    to: process.env.SMTP_USER, // send to yourself
    subject: 'JMM backend SMTP test',
    text: 'If you see this, the Node backend can send email via cPanel SMTP.',
    html: '<p>If you see this, the Node backend can send email via cPanel SMTP.</p>',
  });

  console.log('Message sent:', info.messageId);
}

main().catch(err => {
  console.error('Error sending test email:', err);
  process.exit(1);
});

