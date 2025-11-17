// publish-article.js
require('dotenv').config();
const { pool } = require('./pgdb');

async function publishArticle() {
  // Change this ID and the Zenodo fields as needed
  const articleId = 2; // <-- ID of the article to publish
  const zenodoDoi = '10.5281/zenodo.placeholder'; // replace with real DOI later
  const zenodoUrl = 'https://zenodo.org/record/placeholder'; // replace with real URL later

  try {
    console.log('Publishing article with id =', articleId);

    const result = await pool.query(
      `UPDATE articles
       SET status = 'published',
           zenodo_doi = $2,
           zenodo_url = $3,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, title, status, zenodo_doi, zenodo_url`,
      [articleId, zenodoDoi, zenodoUrl]
    );

    if (result.rows.length === 0) {
      console.log('No article found with that id.');
    } else {
      console.log('Article published:', result.rows[0]);
    }
  } catch (err) {
    console.error('Error publishing article:', err);
  } finally {
    await pool.end();
    console.log('Postgres connection closed.');
  }
}

publishArticle();

