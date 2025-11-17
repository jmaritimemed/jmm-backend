// list-users.js
const db = require('./db');

db.all('SELECT * FROM users', [], (err, rows) => {
  if (err) {
    console.error('Error reading users:', err);
  } else {
    console.log('Users in DB:');
    console.log(rows);
  }
  db.close();
});

