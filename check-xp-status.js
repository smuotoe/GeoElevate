const db = require('better-sqlite3')('./backend/geo-elevate.db');
const userId = 30; // srtest user
const today = new Date().toISOString().split('T')[0];

const gameTypes = ['flags', 'capitals', 'maps', 'languages', 'trivia'];

console.log('Daily XP Status for user srtest (ID: 30)');
console.log('Date:', today);
console.log('XP Cap per game type:', 500);
console.log('---');

for (const gameType of gameTypes) {
    const result = db.prepare(
        'SELECT SUM(xp_earned) as earned FROM game_sessions WHERE user_id = ? AND game_type = ? AND DATE(completed_at) = ?'
    ).get(userId, gameType, today);
    const earned = result?.earned || 0;
    const remaining = Math.max(0, 500 - earned);
    console.log(`${gameType}: ${earned}/500 XP earned, ${remaining} remaining`);
}

db.close();
