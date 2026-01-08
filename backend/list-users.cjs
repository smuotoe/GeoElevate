const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'geoelevate.db');
const db = new Database(dbPath);

console.log('=== Users ===');
const users = db.prepare('SELECT id, username, email FROM users LIMIT 10').all();
users.forEach(u => console.log(`ID ${u.id}: ${u.username} (${u.email})`));

db.close();
