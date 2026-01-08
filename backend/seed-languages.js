import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function seedLanguages() {
    const dbPath = path.join(__dirname, 'data/geoelevate.db');

    if (!fs.existsSync(dbPath)) {
        console.error('Database not found at:', dbPath);
        process.exit(1);
    }

    const SQL = await initSqlJs();
    const fileBuffer = fs.readFileSync(dbPath);
    const db = new SQL.Database(fileBuffer);

    // Languages spoken around the world
    const languages = [
        'English',
        'Spanish',
        'French',
        'German',
        'Italian',
        'Portuguese',
        'Dutch',
        'Russian',
        'Chinese',
        'Japanese',
        'Korean',
        'Arabic',
        'Hindi',
        'Thai',
        'Vietnamese',
        'Indonesian',
        'Swedish',
        'Norwegian',
        'Danish',
        'Finnish',
        'Polish',
        'Swahili',
        'Afrikaans',
        'Maori'
    ];

    // Country to languages mapping (using country names from seed-geography.js)
    const countryLanguages = {
        'United States': ['English'],
        'Canada': ['English', 'French'],
        'Mexico': ['Spanish'],
        'Brazil': ['Portuguese'],
        'Argentina': ['Spanish'],
        'United Kingdom': ['English'],
        'France': ['French'],
        'Germany': ['German'],
        'Italy': ['Italian'],
        'Spain': ['Spanish'],
        'Portugal': ['Portuguese'],
        'Netherlands': ['Dutch'],
        'Belgium': ['Dutch', 'French', 'German'],
        'Switzerland': ['German', 'French', 'Italian'],
        'Austria': ['German'],
        'Poland': ['Polish'],
        'Sweden': ['Swedish'],
        'Norway': ['Norwegian'],
        'Denmark': ['Danish'],
        'Finland': ['Finnish', 'Swedish'],
        'Russia': ['Russian'],
        'China': ['Chinese'],
        'Japan': ['Japanese'],
        'South Korea': ['Korean'],
        'India': ['Hindi', 'English'],
        'Thailand': ['Thai'],
        'Vietnam': ['Vietnamese'],
        'Indonesia': ['Indonesian'],
        'Australia': ['English'],
        'New Zealand': ['English', 'Maori'],
        'Egypt': ['Arabic'],
        'South Africa': ['English', 'Afrikaans'],
        'Nigeria': ['English'],
        'Kenya': ['English', 'Swahili'],
        'Morocco': ['Arabic', 'French']
    };

    // Clear existing language data
    db.run('DELETE FROM country_languages');
    db.run('DELETE FROM languages');

    // Insert languages
    const insertLang = db.prepare('INSERT INTO languages (name) VALUES (?)');
    for (const lang of languages) {
        insertLang.run([lang]);
    }
    insertLang.free();

    console.log(`Inserted ${languages.length} languages`);

    // Get language IDs
    const langResults = db.exec('SELECT id, name FROM languages');
    const langMap = {};
    if (langResults.length > 0) {
        for (const row of langResults[0].values) {
            langMap[row[1]] = row[0]; // name -> id
        }
    }

    // Get country IDs
    const countryResults = db.exec('SELECT id, name FROM countries');
    const countryMap = {};
    if (countryResults.length > 0) {
        for (const row of countryResults[0].values) {
            countryMap[row[1]] = row[0]; // name -> id
        }
    }

    // Insert country-language mappings
    const insertMapping = db.prepare(
        'INSERT INTO country_languages (country_id, language_id, is_official) VALUES (?, ?, 1)'
    );

    let mappingCount = 0;
    for (const [countryName, langs] of Object.entries(countryLanguages)) {
        const countryId = countryMap[countryName];
        if (!countryId) {
            console.warn(`Country not found: ${countryName}`);
            continue;
        }
        for (const langName of langs) {
            const langId = langMap[langName];
            if (!langId) {
                console.warn(`Language not found: ${langName}`);
                continue;
            }
            insertMapping.run([countryId, langId]);
            mappingCount++;
        }
    }
    insertMapping.free();

    console.log(`Inserted ${mappingCount} country-language mappings`);

    // Save database
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);

    console.log('Languages seeded successfully!');
    db.close();
}

seedLanguages().catch(console.error);
