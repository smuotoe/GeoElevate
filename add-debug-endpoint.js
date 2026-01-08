const fs = require('fs');
const path = 'C:/Users/Somto/Documents/geo-elevate/backend/src/routes/games.js';
let content = fs.readFileSync(path, 'utf8');

const debugEndpoint = `
/**
 * Debug endpoint to check user streak data.
 * GET /api/games/debug-user/:id
 */
router.get('/debug-user/:id', (req, res) => {
    const db = getDb();
    const user = db.prepare(
        'SELECT id, username, last_played_date, current_streak, longest_streak, overall_xp FROM users WHERE id = ?'
    ).get(req.params.id);

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    res.json({
        user,
        today,
        yesterday,
        comparison: {
            lastPlayedEqualsYesterday: user?.last_played_date === yesterday,
            lastPlayedEqualsToday: user?.last_played_date === today,
            lastPlayedNotToday: user?.last_played_date !== today
        }
    });
});

`;

// Check if debug endpoint already exists
if (!content.includes('debug-user')) {
    // Insert after the /types endpoint
    content = content.replace(
        "res.json({ gameTypes });\n});",
        "res.json({ gameTypes });\n});" + debugEndpoint
    );
    fs.writeFileSync(path, content);
    console.log('Debug endpoint added successfully');
} else {
    console.log('Debug endpoint already exists');
}
