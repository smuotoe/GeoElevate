import { initDatabase, getDb } from './backend/src/models/database.js';

async function checkNullPop() {
    await initDatabase();
    const db = getDb();

    const nullPop = db.prepare(
        'SELECT name, continent FROM countries WHERE population IS NULL'
    ).all();

    console.log('Countries with NULL population:');
    nullPop.forEach(c => console.log(`- ${c.name} (${c.continent})`));
}

checkNullPop().catch(console.error);
