import Database from 'better-sqlite3';
const db = new Database('C:/Users/Somto/Documents/geo-elevate/backend/geoelevate.db');
const user = db.prepare('SELECT id, username, last_played_date, current_streak, overall_xp FROM users WHERE username = ?').get('testuser');
console.log('User data:', JSON.stringify(user, null, 2));
const today = new Date().toISOString().split('T')[0];
const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
console.log('Today:', today);
console.log('Yesterday:', yesterday);
db.close();
