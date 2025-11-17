// add-sample-user.js
const db = require('./db');

const user = {
  first_name: 'Mahmood',
  last_name: 'Ahmad',
  email: 'mahmood.sample@example.com',
  country: 'Chile',
  role: 'doctor',
  organisation: 'Roald Amundsen'
};

const sql = `
  INSERT INTO users (first_name, last_name, email, country, role, organisation)
  VALUES (?, ?, ?, ?, ?, ?)
`;

db.run(
  sql,
  [
    user.first_name,
    user.last_name,
    user.email,
    user.country,
    user.role,
    user.organisation
  ],
  function (err) {
    if (err) {
      console.error('Error inserting sample user:', err);
    } else {
      console.log('Sample user inserted with id', this.lastID);
    }

    db.close();
  }
);

