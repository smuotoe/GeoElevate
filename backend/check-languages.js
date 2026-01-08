const db = require('better-sqlite3')('./data/geoelevate.db');

try {
    console.log('Languages table:', db.prepare('SELECT COUNT(*) as count FROM languages').get());
    console.log('Country_languages table:', db.prepare('SELECT COUNT(*) as count FROM country_languages').get());
    console.log('Sample languages:', db.prepare('SELECT * FROM languages LIMIT 5').all());
    console.log('Sample country_languages:', db.prepare('SELECT cl.*, c.name as country_name, l.name as language_name FROM country_languages cl JOIN countries c ON cl.country_id = c.id JOIN languages l ON cl.language_id = l.id LIMIT 10').all());
} catch (err) {
    console.error('Error:', err.message);
}
