const Database = require('better-sqlite3');
const db = new Database('./backend/data/geoelevate.db');
const users = db.prepare('SELECT id, email, username FROM users LIMIT 10').all();
console.log(JSON.stringify(users, null, 2));
db.close();
