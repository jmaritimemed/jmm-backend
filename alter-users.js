// alter-users.js
const { pool } = require('./pgdb');

async function alterUsersTable() {
  try {
    console.log('Altering users table...');

    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS password_hash TEXT;
    `);

    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
    `);

    console.log('Users table altered successfully.');
  } catch (err) {
    console.error('Error altering users table:', err);
  } finally {
    await pool.end();
    console.log('Postgres connection closed.');
  }
}

alterUsersTable();

