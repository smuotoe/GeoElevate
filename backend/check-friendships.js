import initSqlJs from 'sql.js';
import fs from 'fs';

const SQL = await initSqlJs();
const db = new SQL.Database(fs.readFileSync('./data/geoelevate.db'));

console.log('=== friendships ===');
const res = db.exec('SELECT * FROM friendships');
console.log(JSON.stringify(res, null, 2));

console.log('\n=== users ===');
const users = db.exec('SELECT id, username FROM users');
console.log(JSON.stringify(users, null, 2));
