// init-articles.js
const { pool } = require('./pgdb');

async function initArticles() {
  try {
    console.log('Creating articles and comments tables if not exist...');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS articles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        title TEXT NOT NULL,
        abstract TEXT,
        body TEXT,
        keywords TEXT,
        status VARCHAR(50) DEFAULT 'submitted',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        text TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    console.log('articles and comments tables are ready.');
  } catch (err) {
    console.error('Error creating articles/comments tables:', err);
  } finally {
    await pool.end();
    console.log('Postgres connection closed.');
  }
}

initArticles();

