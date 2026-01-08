const Database = require('better-sqlite3');
const db = new Database('./backend/data/geoelevate.db');

const user = db.prepare('SELECT id FROM users WHERE username = ?').get('srtest');
if (user) {
    const progress = db.prepare('SELECT * FROM user_fact_progress WHERE user_id = ? LIMIT 10').all(user.id);
    console.log('User ID:', user.id);
    console.log('Fact progress records:', progress.length);
    if (progress.length > 0) {
        console.log(JSON.stringify(progress.slice(0, 5), null, 2));
    }
} else {
    console.log('User not found');
}
db.close();
