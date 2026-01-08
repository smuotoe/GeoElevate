import initSqlJs from 'sql.js';
import fs from 'fs';

const SQL = await initSqlJs();
// Check both databases
const paths = [
    './data/geoelevate.db',
    '../data/geoelevate.db'
];

for (const dbPath of paths) {
    console.log(`\n========== ${dbPath} ==========`);
    try {
        const db = new SQL.Database(fs.readFileSync(dbPath));

        const achCount = db.exec('SELECT COUNT(*) as count FROM achievements');
        console.log('Achievements count:', achCount[0]?.values[0][0] || 0);

        const userAchCount = db.exec('SELECT COUNT(*) as count FROM user_achievements');
        console.log('User achievements count:', userAchCount[0]?.values[0][0] || 0);

        const sessionsCount = db.exec('SELECT COUNT(*) as count FROM game_sessions WHERE user_id = 1');
        console.log('Game sessions for user 1:', sessionsCount[0]?.values[0][0] || 0);

        const userStats = db.exec('SELECT category, total_correct FROM user_category_stats WHERE user_id = 1');
        if (userStats.length > 0 && userStats[0].values.length > 0) {
            console.log('User stats:', userStats[0].values);
        }

        // Check user_achievements records
        const userAchRecords = db.exec('SELECT * FROM user_achievements WHERE user_id = 1');
        console.log('User achievement records:', userAchRecords.length > 0 ? userAchRecords[0].values : 'none');
    } catch (e) {
        console.log('Error reading:', e.message);
    }
}
