const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

initSqlJs().then(SQL => {
    const dbPath = path.join(__dirname, 'data/geoelevate.db');
    const buffer = fs.readFileSync(dbPath);
    const db = new SQL.Database(buffer);

    // Check if password_reset_tokens table exists
    const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='password_reset_tokens'");
    if (tables.length > 0 && tables[0].values.length > 0) {
        console.log('Table password_reset_tokens EXISTS');

        // Show all tokens
        const tokens = db.exec('SELECT * FROM password_reset_tokens');
        console.log('Tokens:', JSON.stringify(tokens, null, 2));
    } else {
        console.log('Table password_reset_tokens does NOT exist');
    }

    // Check users with srtest
    const users = db.exec("SELECT id, email FROM users WHERE email = 'srtest@example.com'");
    console.log('User srtest:', JSON.stringify(users, null, 2));
});
