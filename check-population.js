import { initDatabase, getDb } from './backend/src/models/database.js';

async function checkPopulation() {
    await initDatabase();
    const db = getDb();

    // Check if population data exists
    const countries = db.prepare(`
        SELECT name, population, continent
        FROM countries
        ORDER BY population DESC
        LIMIT 20
    `).all();

    console.log('Top 20 countries by population:');
    countries.forEach((c, i) => {
        console.log(`${i + 1}. ${c.name}: ${c.population || 'NULL'} (${c.continent})`);
    });

    // Check countries with null population
    const nullCount = db.prepare(
        'SELECT COUNT(*) as count FROM countries WHERE population IS NULL'
    ).get();

    console.log(`\nCountries with NULL population: ${nullCount.count}`);

    // Check total countries
    const total = db.prepare('SELECT COUNT(*) as count FROM countries').get();
    console.log(`Total countries: ${total.count}`);
}

checkPopulation().catch(console.error);
