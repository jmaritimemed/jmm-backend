// server.js
require('dotenv').config();
const express = require('express');
const { sendTestMail, sendWelcomeMail } = require('./mailer');
const { pool } = require('./pgdb'); // <-- Postgres

const app = express();

// Parse JSON and URL-encoded form bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Test mail route
app.get('/api/test-mail', async (req, res) => {
  try {
    await sendTestMail();
    res.json({ message: 'Test mail sent from backend' });
  } catch (err) {
    console.error('Error sending test mail from backend:', err);
    res.status(500).json({ error: 'Failed to send test mail' });
  }
});

// Registration: save to Postgres + send welcome email
app.post('/api/auth/register', async (req, res) => {
  const {
    first_name,
    last_name,
    email,
    country,
    role,
    organisation,
  } = req.body;

  console.log('Received /api/auth/register payload:', req.body);

  if (!email || !first_name || !last_name) {
    return res
      .status(400)
      .json({ error: 'First name, last name, and email are required' });
  }

  const insertSql = `
    INSERT INTO users (first_name, last_name, email, country, role, organisation)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id
  `;

  try {
    // Insert into Postgres
    const result = await pool.query(insertSql, [
      first_name,
      last_name,
      email,
      country || null,
      role || null,
      organisation || null,
    ]);

    const userId = result.rows[0].id;
    console.log('User inserted into Postgres with id', userId);

    // Send welcome mail
    try {
      console.log('Sending welcome mail to', email);
      await sendWelcomeMail(email, first_name);
      console.log('Welcome mail call finished');
      return res.json({
        message: 'User registered and welcome mail sent',
        userId,
      });
    } catch (mailErr) {
      console.error('Error sending welcome mail:', mailErr);
      return res.status(500).json({
        error: 'User created in Postgres, but failed to send welcome mail',
        userId,
      });
    }
  } catch (err) {
    console.error('Error inserting user into Postgres:', err);

    // 23505 = unique_violation in Postgres
    if (err.code === '23505') {
      return res
        .status(400)
        .json({ error: 'An account with this email already exists' });
    }

    return res.status(500).json({ error: 'Database error' });
  }
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`JMM backend running on port ${PORT}`);
});

