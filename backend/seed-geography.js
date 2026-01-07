import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function seedGeography() {
    const dbPath = path.join(__dirname, 'data/geoelevate.db');

    if (!fs.existsSync(dbPath)) {
        console.error('Database not found at:', dbPath);
        process.exit(1);
    }

    const SQL = await initSqlJs();
    const fileBuffer = fs.readFileSync(dbPath);
    const db = new SQL.Database(fileBuffer);

    const countries = [
        { name: 'United States', code: 'US', continent: 'North America', capital: 'Washington, D.C.' },
        { name: 'Canada', code: 'CA', continent: 'North America', capital: 'Ottawa' },
        { name: 'Mexico', code: 'MX', continent: 'North America', capital: 'Mexico City' },
        { name: 'Brazil', code: 'BR', continent: 'South America', capital: 'Brasilia' },
        { name: 'Argentina', code: 'AR', continent: 'South America', capital: 'Buenos Aires' },
        { name: 'United Kingdom', code: 'GB', continent: 'Europe', capital: 'London' },
        { name: 'France', code: 'FR', continent: 'Europe', capital: 'Paris' },
        { name: 'Germany', code: 'DE', continent: 'Europe', capital: 'Berlin' },
        { name: 'Italy', code: 'IT', continent: 'Europe', capital: 'Rome' },
        { name: 'Spain', code: 'ES', continent: 'Europe', capital: 'Madrid' },
        { name: 'Portugal', code: 'PT', continent: 'Europe', capital: 'Lisbon' },
        { name: 'Netherlands', code: 'NL', continent: 'Europe', capital: 'Amsterdam' },
        { name: 'Belgium', code: 'BE', continent: 'Europe', capital: 'Brussels' },
        { name: 'Switzerland', code: 'CH', continent: 'Europe', capital: 'Bern' },
        { name: 'Austria', code: 'AT', continent: 'Europe', capital: 'Vienna' },
        { name: 'Poland', code: 'PL', continent: 'Europe', capital: 'Warsaw' },
        { name: 'Sweden', code: 'SE', continent: 'Europe', capital: 'Stockholm' },
        { name: 'Norway', code: 'NO', continent: 'Europe', capital: 'Oslo' },
        { name: 'Denmark', code: 'DK', continent: 'Europe', capital: 'Copenhagen' },
        { name: 'Finland', code: 'FI', continent: 'Europe', capital: 'Helsinki' },
        { name: 'Russia', code: 'RU', continent: 'Europe', capital: 'Moscow' },
        { name: 'China', code: 'CN', continent: 'Asia', capital: 'Beijing' },
        { name: 'Japan', code: 'JP', continent: 'Asia', capital: 'Tokyo' },
        { name: 'South Korea', code: 'KR', continent: 'Asia', capital: 'Seoul' },
        { name: 'India', code: 'IN', continent: 'Asia', capital: 'New Delhi' },
        { name: 'Thailand', code: 'TH', continent: 'Asia', capital: 'Bangkok' },
        { name: 'Vietnam', code: 'VN', continent: 'Asia', capital: 'Hanoi' },
        { name: 'Indonesia', code: 'ID', continent: 'Asia', capital: 'Jakarta' },
        { name: 'Australia', code: 'AU', continent: 'Oceania', capital: 'Canberra' },
        { name: 'New Zealand', code: 'NZ', continent: 'Oceania', capital: 'Wellington' },
        { name: 'Egypt', code: 'EG', continent: 'Africa', capital: 'Cairo' },
        { name: 'South Africa', code: 'ZA', continent: 'Africa', capital: 'Pretoria' },
        { name: 'Nigeria', code: 'NG', continent: 'Africa', capital: 'Abuja' },
        { name: 'Kenya', code: 'KE', continent: 'Africa', capital: 'Nairobi' },
        { name: 'Morocco', code: 'MA', continent: 'Africa', capital: 'Rabat' }
    ];

    // Clear existing data
    db.run('DELETE FROM flags');
    db.run('DELETE FROM capitals');
    db.run('DELETE FROM countries');

    // Insert countries
    const insertCountry = db.prepare('INSERT INTO countries (name, code, continent) VALUES (?, ?, ?)');
    const insertCapital = db.prepare('INSERT INTO capitals (name, country_id) VALUES (?, ?)');
    const insertFlag = db.prepare('INSERT INTO flags (country_id, image_url) VALUES (?, ?)');

    for (const country of countries) {
        insertCountry.run([country.name, country.code, country.continent]);

        // Get the country ID
        const result = db.exec(`SELECT last_insert_rowid() as id`);
        const countryId = result[0].values[0][0];

        // Insert capital
        insertCapital.run([country.capital, countryId]);

        // Insert flag (using country code for flag URL)
        const flagUrl = `https://flagcdn.com/w320/${country.code.toLowerCase()}.png`;
        insertFlag.run([countryId, flagUrl]);
    }

    insertCountry.free();
    insertCapital.free();
    insertFlag.free();

    // Save database
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);

    console.log(`Seeded ${countries.length} countries with capitals and flags!`);
    db.close();
}

seedGeography().catch(console.error);
