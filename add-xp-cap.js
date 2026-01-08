// Script to add XP cap functionality to games.js
import fs from 'fs';

const filePath = './backend/src/routes/games.js';
let content = fs.readFileSync(filePath, 'utf8');

// Check if already implemented
if (content.includes('DAILY_XP_CAP')) {
    console.log('XP cap already implemented');
    process.exit(0);
}

// Add constant and helper function after router declaration
const insertAfter = "const router = Router();";
const xpCapCode = `

// Daily XP cap per game type (encourages variety)
const DAILY_XP_CAP = 500;

/**
 * Get remaining XP that can be earned today for a game type.
 *
 * @param {Database} db - Database instance
 * @param {number} userId - User ID
 * @param {string} gameType - Type of game
 * @returns {{ earnedToday: number, remaining: number, capped: boolean }}
 */
function getDailyXpStatus(db, userId, gameType) {
    const today = new Date().toISOString().split('T')[0];

    const result = db.prepare(\`
        SELECT COALESCE(SUM(xp_earned), 0) as earned_today
        FROM game_sessions
        WHERE user_id = ? AND game_type = ? AND DATE(completed_at) = ?
    \`).get(userId, gameType, today);

    const earnedToday = result?.earned_today || 0;
    const remaining = Math.max(0, DAILY_XP_CAP - earnedToday);

    return {
        earnedToday,
        remaining,
        capped: remaining === 0
    };
}`;

content = content.replace(insertAfter, insertAfter + xpCapCode);

// Modify the PATCH endpoint to apply XP cap
// Find the line where xpEarned is used and add cap logic
const oldPatchCode = `const { answers, score, xpEarned, correctCount: rawCorrectCount, averageTimeMs } = req.body;`;
const newPatchCode = `const { answers, score, xpEarned: requestedXp, correctCount: rawCorrectCount, averageTimeMs } = req.body;

        // Apply daily XP cap for this game type
        const session = db.prepare(
            'SELECT game_type FROM game_sessions WHERE id = ?'
        ).get(id);

        let xpEarned = requestedXp;
        let xpCapInfo = null;

        if (session && req.userId) {
            const xpStatus = getDailyXpStatus(db, req.userId, session.game_type);
            if (xpStatus.remaining < requestedXp) {
                xpEarned = xpStatus.remaining;
                xpCapInfo = {
                    capped: true,
                    earnedToday: xpStatus.earnedToday,
                    maxDaily: DAILY_XP_CAP,
                    reducedFrom: requestedXp,
                    reducedTo: xpEarned,
                    message: xpEarned === 0
                        ? \`You've reached your daily XP cap for \${session.game_type}! Try a different game type.\`
                        : \`XP reduced due to daily cap. Only \${xpEarned} XP awarded.\`
                };
            }
        }`;

content = content.replace(oldPatchCode, newPatchCode);

// Also need to remove the duplicate session query and fix the response
const oldSessionCheck = `// Verify session belongs to user (before transaction)
        const session = db.prepare(
            'SELECT * FROM game_sessions WHERE id = ? AND user_id = ?'
        ).get(id, req.userId);

        if (!session) {
            return res.status(404).json({
                error: { message: 'Game session not found' }
            });
        }`;

const newSessionCheck = `// Verify session belongs to user (before transaction)
        const sessionFull = db.prepare(
            'SELECT * FROM game_sessions WHERE id = ? AND user_id = ?'
        ).get(id, req.userId);

        if (!sessionFull) {
            return res.status(404).json({
                error: { message: 'Game session not found' }
            });
        }`;

content = content.replace(oldSessionCheck, newSessionCheck);

// Update references to session to sessionFull
content = content.replace(/session\.game_type/g, 'sessionFull.game_type');

// Update the response to include cap info
const oldResponse = `res.json({ message: 'Game session completed', sessionId: id });`;
const newResponse = `res.json({
                message: 'Game session completed',
                sessionId: id,
                xpEarned,
                xpCapInfo
            });`;

content = content.replace(oldResponse, newResponse);

fs.writeFileSync(filePath, content);
console.log('XP cap functionality added successfully');
