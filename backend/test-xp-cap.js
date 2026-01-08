import Database from 'better-sqlite3';

const db = new Database('./data/geoelevate.db');
const userId = 30; // srtest
const gameType = 'flags';
const today = new Date().toISOString().split('T')[0];

// Check daily XP earned for flags
const result = db.prepare(`
    SELECT COALESCE(SUM(xp_earned), 0) as earned_today
    FROM game_sessions
    WHERE user_id = ? AND game_type = ? AND DATE(completed_at) = ?
`).get(userId, gameType, today);

console.log('User ID:', userId);
console.log('Game Type:', gameType);
console.log('Today:', today);
console.log('XP earned today for', gameType + ':', result?.earned_today || 0);
console.log('Remaining before cap (500):', Math.max(0, 500 - (result?.earned_today || 0)));

// List all today's game sessions
const sessions = db.prepare(`
    SELECT id, game_type, xp_earned, completed_at
    FROM game_sessions
    WHERE user_id = ? AND DATE(completed_at) = ?
    ORDER BY completed_at DESC
`).all(userId, today);

console.log('\nToday\'s sessions:');
sessions.forEach(s => {
    console.log(`  Session ${s.id}: ${s.game_type} - ${s.xp_earned} XP at ${s.completed_at}`);
});

db.close();
