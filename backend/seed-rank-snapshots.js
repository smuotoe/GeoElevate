/**
 * Script to seed yesterday's leaderboard snapshots for testing rank change feature.
 * Run with: node seed-rank-snapshots.js
 */
import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function seedRankSnapshots() {
    const dbPath = path.join(__dirname, 'data/geoelevate.db');

    if (!fs.existsSync(dbPath)) {
        console.error('Database not found at:', dbPath);
        process.exit(1);
    }

    const SQL = await initSqlJs();
    const fileBuffer = fs.readFileSync(dbPath);
    const db = new SQL.Database(fileBuffer);

    // Get yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0] + 'T12:00:00.000Z';

    // Get all users with XP
    const users = db.exec(`
        SELECT id, username, overall_xp
        FROM users
        WHERE is_guest = 0
        ORDER BY overall_xp DESC
    `);

    if (!users.length || !users[0].values.length) {
        console.log('No users found');
        db.close();
        process.exit(0);
    }

    console.log('Inserting yesterday snapshots for testing rank changes...');

    // Insert snapshots with slightly different ranks to simulate movement
    users[0].values.forEach((row, index) => {
        const [userId, username, xp] = row;
        const currentRank = index + 1;

        // Simulate different ranks for some users (moved up/down)
        let yesterdayRank = currentRank;
        if (currentRank <= 5) {
            // Top 5 users: simulate they were 1-2 ranks lower yesterday
            yesterdayRank = currentRank + (currentRank % 2 === 0 ? 1 : -1);
            if (yesterdayRank < 1) yesterdayRank = 2;
        } else if (currentRank > 5 && currentRank <= 10) {
            // Ranks 6-10: simulate they moved up
            yesterdayRank = currentRank + 2;
        }

        // Check if snapshot already exists for yesterday
        const existing = db.exec(`
            SELECT id FROM leaderboard_snapshots
            WHERE user_id = ${userId}
            AND leaderboard_type = 'global'
            AND DATE(created_at) = '${yesterday.toISOString().split('T')[0]}'
        `);

        if (!existing.length || !existing[0].values.length) {
            db.run(`
                INSERT INTO leaderboard_snapshots (leaderboard_type, user_id, score, rank, created_at)
                VALUES ('global', ${userId}, ${xp}, ${yesterdayRank}, '${yesterdayStr}')
            `);
            console.log(`  ${username}: Yesterday rank ${yesterdayRank} -> Today rank ${currentRank} (change: ${yesterdayRank - currentRank > 0 ? '+' : ''}${yesterdayRank - currentRank})`);
        } else {
            console.log(`  ${username}: Already has yesterday snapshot`);
        }
    });

    // Save the database
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);

    console.log('\nSnapshots seeded successfully!');
    db.close();
}

seedRankSnapshots().catch(console.error);
