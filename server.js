// server.js
require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendTestMail, sendWelcomeMail, sendPasswordResetMail } = require('./mailer');
const { pool } = require('./pgdb');
const { requireAuth } = require('./middleware/auth');

// Ensure JWT_SECRET exists (safe default for local dev; on Render set a real secret)
if (!process.env.JWT_SECRET) {
  console.warn('JWT_SECRET is not set. Using an insecure default for local development.');
  process.env.JWT_SECRET = 'dev-secret-change-this';
}

const app = express();

// Parse JSON and URL-encoded form bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Helper: create a JWT for a user
function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      is_admin: user.is_admin,
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

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

/**
 * Registration: save to Postgres + (optionally) store password + send welcome email
 * Endpoint: POST /api/auth/register
 * Body: {
 *   first_name, last_name, email, country, role, organisation,
 *   password (optional for now)
 * }
 */
app.post('/api/auth/register', async (req, res) => {
  const {
    first_name,
    last_name,
    email,
    country,
    role,
    organisation,
    password,
  } = req.body;

  console.log('Received /api/auth/register payload:', req.body);

  if (!email || !first_name || !last_name) {
    return res
      .status(400)
      .json({ error: 'First name, last name, and email are required' });
  }

  try {
    // Check if email already exists
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    if (existing.rows.length > 0) {
      return res
        .status(400)
        .json({ error: 'An account with this email already exists' });
    }

    let passwordHash = null;
    if (password) {
      passwordHash = await bcrypt.hash(password, 10);
    }

    const insertSql = `
      INSERT INTO users (first_name, last_name, email, country, role, organisation, password_hash)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, first_name, last_name, email, is_admin
    `;

    const result = await pool.query(insertSql, [
      first_name,
      last_name,
      email.toLowerCase(),
      country || null,
      role || null,
      organisation || null,
      passwordHash,
    ]);

    const user = result.rows[0];
    console.log('User inserted into Postgres with id', user.id);

    // Send welcome mail (non-fatal if it fails)
    try {
      console.log('Sending welcome mail to', email);
      await sendWelcomeMail(email, first_name);
      console.log('Welcome mail call finished');
    } catch (mailErr) {
      console.error('Error sending welcome mail:', mailErr);
      // We still consider the registration successful
    }

    // Create a JWT token if password was provided
    let token = null;
    if (passwordHash) {
      token = createToken({
        id: user.id,
        email: user.email,
        is_admin: user.is_admin,
      });
    }

    return res.json({
      message: 'User registered',
      user,
      token,
    });
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

/**
 * Login: POST /api/auth/login
 * Body: { email, password }
 */
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ error: 'Email and password are required' });
  }

  try {
    const result = await pool.query(
      'SELECT id, first_name, last_name, email, password_hash, is_admin FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    if (!user.password_hash) {
      return res
        .status(400)
        .json({ error: 'This account does not yet have a password set' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = createToken({
      id: user.id,
      email: user.email,
      is_admin: user.is_admin,
    });

    return res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        is_admin: user.is_admin,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

/**
 * Submit article: POST /api/articles
 * Headers: Authorization: Bearer <token>
 * Body: { title, abstract, body, keywords }
 */
app.post('/api/articles', requireAuth, async (req, res) => {
  const { title, abstract, body, keywords } = req.body;

  if (!title || !body) {
    return res
      .status(400)
      .json({ error: 'Title and body are required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO articles (user_id, title, abstract, body, keywords, status)
       VALUES ($1, $2, $3, $4, $5, 'submitted')
       RETURNING id, user_id, title, abstract, body, keywords, status, zenodo_doi, zenodo_url, created_at, updated_at`,
      [req.user.id, title, abstract || null, body, keywords || null]
    );

    const article = result.rows[0];
    return res.json({
      message: 'Article submitted',
      article,
    });
  } catch (err) {
    console.error('Submit article error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

/**
 * Public list of published articles: GET /api/public/articles
 * Returns Zenodo fields for use on the /journal page.
 */
app.get('/api/public/articles', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         a.id,
         a.title,
         a.abstract,
         a.keywords,
         a.status,
         a.zenodo_doi,
         a.zenodo_url,
         a.created_at,
         a.updated_at,
         u.first_name,
         u.last_name
       FROM articles a
       LEFT JOIN users u ON a.user_id = u.id
       WHERE a.status = 'published'
       ORDER BY a.created_at DESC`
    );

    const articles = result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      abstract: row.abstract,
      keywords: row.keywords,
      status: row.status,
      zenodo_doi: row.zenodo_doi,
      zenodo_url: row.zenodo_url,
      created_at: row.created_at,
      updated_at: row.updated_at,
      author_name: row.first_name && row.last_name
        ? `${row.first_name} ${row.last_name}`
        : null,
    }));

    return res.json({ articles });
  } catch (err) {
    console.error('Public articles list error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

/**
 * Add comment to an article: POST /api/articles/:id/comments
 * Headers: Authorization: Bearer <token>
 * Body: { text }
 */
app.post('/api/articles/:id/comments', requireAuth, async (req, res) => {
  const articleId = parseInt(req.params.id, 10);
  const { text } = req.body;

  if (!articleId || Number.isNaN(articleId)) {
    return res.status(400).json({ error: 'Invalid article id' });
  }

  if (!text) {
    return res.status(400).json({ error: 'Comment text is required' });
  }

  try {
    // Optional: ensure article exists
    const art = await pool.query(
      'SELECT id FROM articles WHERE id = $1',
      [articleId]
    );
    if (art.rows.length === 0) {
      return res.status(404).json({ error: 'Article not found' });
    }

    const result = await pool.query(
      `INSERT INTO comments (article_id, user_id, text)
       VALUES ($1, $2, $3)
       RETURNING id, article_id, user_id, text, created_at`,
      [articleId, req.user.id, text]
    );

    const comment = result.rows[0];
    return res.json({
      message: 'Comment added',
      comment,
    });
  } catch (err) {
    console.error('Add comment error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

/**
 * List comments for an article: GET /api/articles/:id/comments
 * Public: no auth required for reading.
 */
app.get('/api/articles/:id/comments', async (req, res) => {
  const articleId = parseInt(req.params.id, 10);

  if (!articleId || Number.isNaN(articleId)) {
    return res.status(400).json({ error: 'Invalid article id' });
  }

  try {
    const result = await pool.query(
      `SELECT
         c.id,
         c.article_id,
         c.user_id,
         c.text,
         c.created_at,
         u.first_name,
         u.last_name
       FROM comments c
       LEFT JOIN users u ON c.user_id = u.id
       WHERE c.article_id = $1
       ORDER BY c.created_at ASC`,
      [articleId]
    );

    const comments = result.rows.map((row) => ({
      id: row.id,
      article_id: row.article_id,
      user_id: row.user_id,
      text: row.text,
      created_at: row.created_at,
      author_name: row.first_name && row.last_name
        ? `${row.first_name} ${row.last_name}`
        : null,
    }));

    return res.json({ comments });
  } catch (err) {
    console.error('List comments error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

/**
 * Forgot password: POST /api/auth/forgot-password
 * Body: { email }
 */
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const result = await pool.query(
      'SELECT id, email FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    // Always respond the same to avoid leaking which emails exist
    if (result.rows.length === 0) {
      return res.json({
        message: 'If that email exists, a password reset link has been sent.',
      });
    }

    const user = result.rows[0];
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, token, expiresAt]
    );

    await sendPasswordResetMail(user.email, token);

    return res.json({
      message: 'If that email exists, a password reset link has been sent.',
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

/**
 * Reset password: POST /api/auth/reset-password
 * Body: { token, newPassword }
 */
app.post('/api/auth/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token and newPassword are required' });
  }

  try {
    const result = await pool.query(
      `SELECT prt.id, prt.user_id, prt.expires_at, prt.used, u.email
       FROM password_reset_tokens prt
       JOIN users u ON prt.user_id = u.id
       WHERE prt.token = $1`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid token' });
    }

    const row = result.rows[0];

    if (row.used) {
      return res.status(400).json({ error: 'Token already used' });
    }

    if (new Date(row.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Token expired' });
    }

    const hash = await bcrypt.hash(newPassword, 10);

    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [hash, row.user_id]
    );

    await pool.query(
      'UPDATE password_reset_tokens SET used = TRUE WHERE id = $1',
      [row.id]
    );

    return res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

/**
 * Current user: GET /api/auth/me
 * Headers: Authorization: Bearer <token>
 */
app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, first_name, last_name, email, is_admin FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error('/api/auth/me error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`JMM backend running on port ${PORT}`);
});

