import initSqlJs from 'sql.js';
import fs from 'fs';

async function check() {
    const SQL = await initSqlJs();
    const dbPath = 'C:/Users/Somto/Documents/geo-elevate/backend/data/geoelevate.db';
    const fileBuffer = fs.readFileSync(dbPath);
    const db = new SQL.Database(fileBuffer);

    // Check completed sessions
    const sessions = db.exec('SELECT id, user_id, game_type, score, xp_earned, correct_count, total_questions, completed_at FROM game_sessions WHERE completed_at IS NOT NULL ORDER BY id DESC LIMIT 5');
    console.log('Completed game sessions:');
    if (sessions.length > 0) {
        console.log('Columns:', sessions[0].columns.join(', '));
        sessions[0].values.forEach(row => {
            console.log('Row:', row.join(', '));
        });
    } else {
        console.log('No completed sessions found');
    }

    // Check user stats
    const userStats = db.exec('SELECT * FROM user_category_stats WHERE user_id = 5');
    console.log('\nUser category stats for user 5:');
    if (userStats.length > 0) {
        console.log('Columns:', userStats[0].columns.join(', '));
        userStats[0].values.forEach(row => {
            console.log('Row:', row.join(', '));
        });
    }

    // Check user XP
    const user = db.exec('SELECT id, username, overall_xp, overall_level FROM users WHERE id = 5');
    console.log('\nUser 5 info:');
    if (user.length > 0) {
        console.log('Columns:', user[0].columns.join(', '));
        user[0].values.forEach(row => {
            console.log('Row:', row.join(', '));
        });
    }
}

check();
