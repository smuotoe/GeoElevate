const fs = require('fs');
const path = './backend/src/routes/friends.js';
const content = fs.readFileSync(path, 'utf8');

const newEndpoint = `/**
 * Get pending friend requests received by the user.
 * GET /api/friends/requests
 */
router.get('/requests', authenticate, (req, res, next) => {
    try {
        const db = getDb();

        const requests = db.prepare(\`
            SELECT f.id, f.user_id, f.created_at,
                   u.username, u.avatar_url, u.overall_xp, u.overall_level
            FROM friendships f
            JOIN users u ON u.id = f.user_id
            WHERE f.friend_id = ? AND f.status = 'pending'
            ORDER BY f.created_at DESC
        \`).all(req.userId);

        res.json({ requests });
    } catch (err) {
        next(err);
    }
});

`;

const searchStr = `const router = Router();

/**
 * Get user's friends list.
 * GET /api/friends
 */`;

const replaceStr = `const router = Router();

` + newEndpoint + `/**
 * Get user's friends list.
 * GET /api/friends
 */`;

const updated = content.replace(searchStr, replaceStr);
fs.writeFileSync(path, updated);
console.log('File updated successfully');
