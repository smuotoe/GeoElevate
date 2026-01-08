import { initDatabase, getDb, saveDatabase } from './backend/src/models/database.js';

async function fixRussia() {
    await initDatabase();
    const db = getDb();

    db.prepare('UPDATE countries SET population = ? WHERE name = ?')
        .run(144000000, 'Russia');

    saveDatabase();
    console.log('Updated Russia population to 144,000,000');

    // Verify
    const russia = db.prepare('SELECT name, population FROM countries WHERE name = ?')
        .get('Russia');
    console.log('Verified:', russia);
}

fixRussia().catch(console.error);
