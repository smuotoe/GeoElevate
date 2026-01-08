// Script to fix XP cap code order issue
import fs from 'fs';

const filePath = './backend/src/routes/games.js';
let content = fs.readFileSync(filePath, 'utf8');

// Fix the order - move XP cap check after sessionFull is defined
const oldCode = `    try {
        const { id } = req.params;
        const { answers, score, xpEarned: requestedXp, correctCount: rawCorrectCount, averageTimeMs } = req.body;

        // Apply daily XP cap for this game type
        const session = db.prepare(
            'SELECT game_type FROM game_sessions WHERE id = ?'
        ).get(id);

        let xpEarned = requestedXp;
        let xpCapInfo = null;

        if (session && req.userId) {
            const xpStatus = getDailyXpStatus(db, req.userId, sessionFull.game_type);
            if (xpStatus.remaining < requestedXp) {
                xpEarned = xpStatus.remaining;
                xpCapInfo = {
                    capped: true,
                    earnedToday: xpStatus.earnedToday,
                    maxDaily: DAILY_XP_CAP,
                    reducedFrom: requestedXp,
                    reducedTo: xpEarned,
                    message: xpEarned === 0
                        ? \`You've reached your daily XP cap for \${sessionFull.game_type}! Try a different game type.\`
                        : \`XP reduced due to daily cap. Only \${xpEarned} XP awarded.\`
                };
            }
        }

        // Calculate correctCount from answers if not provided
        const correctCount = rawCorrectCount ?? (answers ? answers.filter(a => a.isCorrect).length : 0);
        console.log('PATCH session - rawCorrectCount:', rawCorrectCount, 'calculatedCorrectCount:', correctCount);

        // Verify session belongs to user (before transaction)
        const sessionFull = db.prepare(
            'SELECT * FROM game_sessions WHERE id = ? AND user_id = ?'
        ).get(id, req.userId);

        if (!sessionFull) {
            return res.status(404).json({
                error: { message: 'Game session not found' }
            });
        }`;

const newCode = `    try {
        const { id } = req.params;
        const { answers, score, xpEarned: requestedXp, correctCount: rawCorrectCount, averageTimeMs } = req.body;

        // Calculate correctCount from answers if not provided
        const correctCount = rawCorrectCount ?? (answers ? answers.filter(a => a.isCorrect).length : 0);
        console.log('PATCH session - rawCorrectCount:', rawCorrectCount, 'calculatedCorrectCount:', correctCount);

        // Verify session belongs to user (before transaction)
        const sessionFull = db.prepare(
            'SELECT * FROM game_sessions WHERE id = ? AND user_id = ?'
        ).get(id, req.userId);

        if (!sessionFull) {
            return res.status(404).json({
                error: { message: 'Game session not found' }
            });
        }

        // Apply daily XP cap for this game type
        let xpEarned = requestedXp;
        let xpCapInfo = null;

        if (req.userId) {
            const xpStatus = getDailyXpStatus(db, req.userId, sessionFull.game_type);
            if (xpStatus.remaining < requestedXp) {
                xpEarned = xpStatus.remaining;
                xpCapInfo = {
                    capped: true,
                    earnedToday: xpStatus.earnedToday,
                    maxDaily: DAILY_XP_CAP,
                    reducedFrom: requestedXp,
                    reducedTo: xpEarned,
                    message: xpEarned === 0
                        ? \`You've reached your daily XP cap for \${sessionFull.game_type}! Try a different game type.\`
                        : \`XP reduced due to daily cap. Only \${xpEarned} XP awarded.\`
                };
            }
        }`;

if (content.includes(oldCode)) {
    content = content.replace(oldCode, newCode);
    fs.writeFileSync(filePath, content);
    console.log('XP cap code order fixed successfully');
} else {
    console.log('Code pattern not found - may already be fixed');
}
