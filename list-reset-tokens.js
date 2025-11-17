// list-reset-tokens.js
const { pool } = require('./pgdb');

async function showTokens() {
  try {
    console.log('Recent password reset tokens:');
    const result = await pool.query(`
      SELECT id, user_id, token, expires_at, used, created_at
      FROM password_reset_tokens
      ORDER BY created_at DESC
      LIMIT 5;
    `);
    console.log(result.rows);
  } catch (err) {
    console.error('Error listing tokens:', err);
  } finally {
    await pool.end();
    console.log('Postgres connection closed.');
  }
}

showTokens();

