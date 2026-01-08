import initSqlJs from 'sql.js';
import fs from 'fs';

const SQL = await initSqlJs();
const dbPath = './data/geoelevate.db';

console.log(`Reading ${dbPath}...`);
const db = new SQL.Database(fs.readFileSync(dbPath));

// Check tables
const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
console.log('Tables:', tables[0]?.values.map(v => v[0]).join(', ') || 'none');

// Check users
const users = db.exec('SELECT id, username, overall_xp FROM users LIMIT 5');
console.log('Users:', users.length > 0 ? users[0].values : 'none');

// Check achievements
const achievements = db.exec('SELECT id, name FROM achievements LIMIT 5');
console.log('Achievements (first 5):', achievements.length > 0 ? achievements[0].values : 'none');

// Check user_achievements
const userAch = db.exec('SELECT * FROM user_achievements LIMIT 10');
console.log('User achievements:', userAch.length > 0 ? userAch[0].values : 'none');

// Check game_sessions
const sessions = db.exec('SELECT id, user_id, game_type, score, correct_count FROM game_sessions LIMIT 5');
console.log('Game sessions (first 5):', sessions.length > 0 ? sessions[0].values : 'none');
