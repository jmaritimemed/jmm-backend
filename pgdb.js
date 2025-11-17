// pgdb.js
require('dotenv').config();
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set in .env');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // needed for many hosted Postgres providers
  },
});

pool.on('connect', () => {
  console.log('Connected to Postgres via pgdb.js');
});

pool.on('error', (err) => {
  console.error('Unexpected Postgres client error:', err);
  process.exit(-1);
});

module.exports = { pool };

