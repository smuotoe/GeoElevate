const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'geoelevate.db');
const db = new Database(dbPath);

const userId = 30; // srtest user
const today = new Date().toISOString().split('T')[0];

console.log('=== XP Status for user srtest (ID:', userId, ') ===');
console.log('Date:', today);
console.log('');

const gameTypes = ['flags', 'capitals', 'maps', 'languages', 'trivia'];

for (const gameType of gameTypes) {
    const result = db.prepare(
        'SELECT SUM(xp_earned) as earned, COUNT(*) as games FROM game_sessions WHERE user_id = ? AND game_type = ? AND DATE(completed_at) = ?'
    ).get(userId, gameType, today);
    const earned = result?.earned || 0;
    const games = result?.games || 0;
    const remaining = Math.max(0, 500 - earned);
    console.log(`${gameType}: ${earned}/500 XP (${games} games), ${remaining} remaining`);
}

console.log('');
console.log('=== Recent Sessions ===');
const sessions = db.prepare(
    'SELECT id, game_type, xp_earned, score, completed_at FROM game_sessions WHERE user_id = ? ORDER BY completed_at DESC LIMIT 10'
).all(userId);

for (const s of sessions) {
    console.log(`ID ${s.id}: ${s.game_type} - Score: ${s.score}, XP: ${s.xp_earned}, Completed: ${s.completed_at}`);
}

db.close();
