import initSqlJs from 'sql.js';
import fs from 'fs';

async function test() {
    const SQL = await initSqlJs();
    const dbPath = 'C:/Users/Somto/Documents/geo-elevate/backend/data/geoelevate.db';
    const fileBuffer = fs.readFileSync(dbPath);
    const db = new SQL.Database(fileBuffer);

    // Test insert
    try {
        db.run('INSERT INTO game_sessions (user_id, game_type, game_mode, difficulty_level, region_filter) VALUES (?, ?, ?, ?, ?)', [5, 'flags', 'solo', 'medium', null]);
        console.log('Insert successful');

        // Get last id
        const result = db.exec('SELECT last_insert_rowid() as id');
        console.log('Last insert id:', result[0].values[0][0]);

        // Check sessions
        const sessions = db.exec('SELECT * FROM game_sessions ORDER BY id DESC LIMIT 3');
        console.log('Recent sessions:', JSON.stringify(sessions, null, 2));

        // Save
        const data = db.export();
        fs.writeFileSync(dbPath, Buffer.from(data));
        console.log('Saved to disk');
    } catch (err) {
        console.error('Error:', err.message);
        console.error('Stack:', err.stack);
    }
}

test();
