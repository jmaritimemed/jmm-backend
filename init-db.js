// init-db.js
const db = require('./db');

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name  TEXT NOT NULL,
      email      TEXT NOT NULL UNIQUE,
      country    TEXT,
      role       TEXT,
      organisation TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating users table:', err);
    } else {
      console.log('Users table is ready.');
    }
  });
});

// Close the DB after creating the table
db.close((err) => {
  if (err) {
    console.error('Error closing DB:', err);
  } else {
    console.log('Database connection closed.');
  }
});

