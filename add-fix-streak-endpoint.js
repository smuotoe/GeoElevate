const fs = require('fs');
const path = 'C:/Users/Somto/Documents/geo-elevate/backend/src/routes/games.js';
let content = fs.readFileSync(path, 'utf8');

const fixEndpoint = `
/**
 * Fix user streak if played today but streak is 0.
 * POST /api/games/fix-streak/:id
 */
router.post('/fix-streak/:id', (req, res) => {
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];

    // Get user before fix
    const before = db.prepare(
        'SELECT id, username, last_played_date, current_streak FROM users WHERE id = ?'
    ).get(req.params.id);

    // If played today and streak is 0, set to 1
    if (before && before.last_played_date === today && before.current_streak === 0) {
        db.prepare('UPDATE users SET current_streak = 1 WHERE id = ?').run(req.params.id);
    }

    // Get user after fix
    const after = db.prepare(
        'SELECT id, username, last_played_date, current_streak FROM users WHERE id = ?'
    ).get(req.params.id);

    res.json({ before, after, today });
});

`;

// Check if fix endpoint already exists
if (!content.includes('fix-streak')) {
    // Insert after the debug endpoint
    content = content.replace(
        /router\.get\('\/debug-user\/:id'[\s\S]*?\}\);/,
        match => match + fixEndpoint
    );
    fs.writeFileSync(path, content);
    console.log('Fix streak endpoint added successfully');
} else {
    console.log('Fix streak endpoint already exists');
}
