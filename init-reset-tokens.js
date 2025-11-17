// init-reset-tokens.js
const { pool } = require('./pgdb');

async function initResetTokens() {
  try {
    console.log('Creating password_reset_tokens table if not exists...');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        token TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    console.log('password_reset_tokens table is ready.');
  } catch (err) {
    console.error('Error creating password_reset_tokens table:', err);
  } finally {
    await pool.end();
    console.log('Postgres connection closed.');
  }
}

initResetTokens();

