// init-pg.js
const { pool } = require('./pgdb');

async function init() {
  try {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        first_name TEXT NOT NULL,
        last_name  TEXT NOT NULL,
        email      TEXT NOT NULL UNIQUE,
        country    TEXT,
        role       TEXT,
        organisation TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await pool.query(createTableSQL);
    console.log('Postgres users table is ready.');
  } catch (err) {
    console.error('Error initializing Postgres:', err);
  } finally {
    await pool.end();
    console.log('Postgres connection closed.');
  }
}

init();

