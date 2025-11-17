// db.js
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Database file jmm.db in the project folder
const dbPath = path.join(__dirname, 'jmm.db');

// Open connection (file is created if it doesn't exist)
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening SQLite database:', err);
  } else {
    console.log('Connected to SQLite database at', dbPath);
  }
});

module.exports = db;

