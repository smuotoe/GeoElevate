const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

initSqlJs().then(SQL => {
    const dbPath = path.join(__dirname, 'backend/data/geoelevate.db');
    const buffer = fs.readFileSync(dbPath);
    const db = new SQL.Database(buffer);

    const result = db.exec('SELECT prt.token, prt.expires_at, prt.used, u.email FROM password_reset_tokens prt JOIN users u ON u.id = prt.user_id WHERE prt.used = 0 ORDER BY prt.created_at DESC LIMIT 1');
    if (result.length > 0 && result[0].values.length > 0) {
        console.log('Token:', result[0].values[0][0]);
        console.log('Expires:', result[0].values[0][1]);
        console.log('Email:', result[0].values[0][3]);
        console.log('Reset URL: http://localhost:5174/reset-password?token=' + result[0].values[0][0]);
    } else {
        console.log('No active reset tokens found');
    }
});
