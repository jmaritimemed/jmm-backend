// alter-articles.js
const { pool } = require('./pgdb');

async function alterArticlesTable() {
  try {
    console.log('Altering articles table to add Zenodo fields...');

    await pool.query(`
      ALTER TABLE articles
      ADD COLUMN IF NOT EXISTS zenodo_doi TEXT;
    `);

    await pool.query(`
      ALTER TABLE articles
      ADD COLUMN IF NOT EXISTS zenodo_url TEXT;
    `);

    console.log('articles table altered successfully.');
  } catch (err) {
    console.error('Error altering articles table:', err);
  } finally {
    await pool.end();
    console.log('Postgres connection closed.');
  }
}

alterArticlesTable();

