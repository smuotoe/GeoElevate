import initSqlJs from 'sql.js';
import fs from 'fs';

const SQL = await initSqlJs();
const db = new SQL.Database(fs.readFileSync('./data/geoelevate.db'));

console.log('=== user_achievements table ===');
const userAch = db.exec('SELECT * FROM user_achievements');
console.log('Result:', JSON.stringify(userAch));

console.log('\n=== achievements table count ===');
const achCount = db.exec('SELECT COUNT(*) as count FROM achievements');
console.log('Result:', JSON.stringify(achCount));

console.log('\n=== achievements table (all) ===');
const ach = db.exec('SELECT * FROM achievements');
console.log('Result:', JSON.stringify(ach));

console.log('\n=== game_sessions for user 1 ===');
const sessions = db.exec('SELECT * FROM game_sessions WHERE user_id = 1');
console.log('Result:', JSON.stringify(sessions));
