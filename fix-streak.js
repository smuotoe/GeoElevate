import initSqlJs from 'sql.js';
import fs from 'fs';

const dbPath = 'C:/Users/Somto/Documents/geo-elevate/backend/data/geoelevate.db';

async function fixStreak() {
    const SQL = await initSqlJs();
    const fileBuffer = fs.readFileSync(dbPath);
    const db = new SQL.Database(fileBuffer);

    // Check current state
    const result = db.exec('SELECT id, username, last_played_date, current_streak FROM users WHERE id = 1');
    console.log('Before fix:', result[0]?.values);

    // Fix the streak - if played today and streak is 0, set to 1
    db.run('UPDATE users SET current_streak = 1 WHERE id = 1 AND current_streak = 0');

    // Verify
    const after = db.exec('SELECT id, username, last_played_date, current_streak FROM users WHERE id = 1');
    console.log('After fix:', after[0]?.values);

    // Save
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
    console.log('Database saved');

    db.close();
}

fixStreak().catch(console.error);
