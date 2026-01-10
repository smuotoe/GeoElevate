import { Router } from 'express';
import { getDb } from '../models/database.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

/**
 * Calculate "today" date string based on client timezone.
 *
 * @param {string} timezone - IANA timezone string (e.g., 'America/New_York')
 * @returns {string} Date string in YYYY-MM-DD format for client's local date
 */
function getTodayForTimezone(timezone) {
    try {
        const now = new Date();
        // Use Intl.DateTimeFormat to get the date in the client's timezone
        const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        // en-CA format gives us YYYY-MM-DD
        return formatter.format(now);
    } catch {
        // Fallback to UTC if timezone is invalid
        return new Date().toISOString().split('T')[0];
    }
}

/**
 * Get today's daily challenges.
 * GET /api/daily/challenges
 * Query params:
 *   - timezone: IANA timezone string (optional, defaults to UTC)
 */
router.get('/challenges', authenticate, async (req, res, next) => {
    try {
        const db = getDb();
        const timezone = req.query.timezone || 'UTC';
        const today = getTodayForTimezone(timezone);

        // Get or create daily challenges
        let challenges = await db.prepare(`
            SELECT * FROM daily_challenges
            WHERE user_id = ? AND date = ?
        `).all(req.userId, today);

        if (challenges.length === 0) {
            // Generate new daily challenges
            challenges = await generateDailyChallenges(db, req.userId, today);
        }

        res.json({ challenges, date: today, timezone });
    } catch (err) {
        next(err);
    }
});

/**
 * Calculate "yesterday" date string based on client timezone.
 *
 * @param {string} timezone - IANA timezone string (e.g., 'America/New_York')
 * @returns {string} Date string in YYYY-MM-DD format for yesterday in client's timezone
 */
function getYesterdayForTimezone(timezone) {
    try {
        const yesterday = new Date(Date.now() - 86400000);
        const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        return formatter.format(yesterday);
    } catch {
        return new Date(Date.now() - 86400000).toISOString().split('T')[0];
    }
}

/**
 * Get user's streak info.
 * GET /api/daily/streak
 * Query params:
 *   - timezone: IANA timezone string (optional, defaults to UTC)
 */
router.get('/streak', authenticate, async (req, res, next) => {
    try {
        const db = getDb();
        const timezone = req.query.timezone || 'UTC';

        const user = await db.prepare(`
            SELECT current_streak, longest_streak, last_played_date
            FROM users WHERE id = ?
        `).get(req.userId);

        const today = getTodayForTimezone(timezone);
        const yesterday = getYesterdayForTimezone(timezone);

        // Check if streak is still active
        const streakActive = user.last_played_date === today || user.last_played_date === yesterday;

        res.json({
            currentStreak: streakActive ? user.current_streak : 0,
            longestStreak: user.longest_streak,
            lastPlayedDate: user.last_played_date,
            streakActive,
            today,
            timezone
        });
    } catch (err) {
        next(err);
    }
});

/**
 * Update daily challenge progress.
 * POST /api/daily/challenges/:id/progress
 */
router.post('/challenges/:id/progress', authenticate, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { increment = 1 } = req.body;
        const db = getDb();

        const challenge = await db.prepare(`
            SELECT * FROM daily_challenges WHERE id = ? AND user_id = ?
        `).get(id, req.userId);

        if (!challenge) {
            return res.status(404).json({
                error: { message: 'Challenge not found' }
            });
        }

        if (challenge.is_completed) {
            return res.json({
                message: 'Challenge already completed',
                challenge
            });
        }

        const newValue = Math.min(challenge.current_value + increment, challenge.target_value);
        const isCompleted = newValue >= challenge.target_value;

        await db.prepare(`
            UPDATE daily_challenges
            SET current_value = ?, is_completed = ?
            WHERE id = ?
        `).run(newValue, isCompleted, id);

        // If completed, award XP
        if (isCompleted) {
            await db.prepare(`
                UPDATE users
                SET overall_xp = overall_xp + ?
                WHERE id = ?
            `).run(challenge.xp_reward, req.userId);

            // Create notification
            await db.prepare(`
                INSERT INTO notifications (user_id, type, title, body)
                VALUES (?, 'challenge_complete', 'Challenge Complete!', ?)
            `).run(req.userId, `You earned ${challenge.xp_reward} XP!`);
        }

        res.json({
            message: isCompleted ? 'Challenge completed!' : 'Progress updated',
            challenge: { ...challenge, current_value: newValue, is_completed: isCompleted },
            xpAwarded: isCompleted ? challenge.xp_reward : 0
        });
    } catch (err) {
        next(err);
    }
});

/**
 * Generate daily challenges for a user.
 *
 * @param {object} db - Database instance
 * @param {number} userId - User ID
 * @param {string} date - Date string (YYYY-MM-DD)
 * @returns {Promise<Array>} Array of generated challenges
 */
async function generateDailyChallenges(db, userId, date) {
    // Get user's weak areas
    const stats = await db.prepare(`
        SELECT category,
               CASE WHEN total_questions > 0
                   THEN CAST(total_correct AS FLOAT) / total_questions
                   ELSE 0
               END as accuracy
        FROM user_category_stats
        WHERE user_id = ?
        ORDER BY accuracy ASC
    `).all(userId);

    const challengeTypes = [
        { type: 'play_games', targetValue: 3, xpReward: 50 },
        { type: 'correct_answers', targetValue: 20, xpReward: 75 },
        { type: 'perfect_game', targetValue: 1, xpReward: 100 }
    ];

    // Add category-specific challenge based on weakest area
    if (stats.length > 0 && stats[0].accuracy < 0.8) {
        challengeTypes.push({
            type: `${stats[0].category}_practice`,
            targetValue: 2,
            xpReward: 60
        });
    }

    const challenges = [];
    for (const challenge of challengeTypes.slice(0, 3)) {
        const result = await db.prepare(`
            INSERT INTO daily_challenges (user_id, date, challenge_type, target_value, xp_reward)
            VALUES (?, ?, ?, ?, ?)
        `).run(userId, date, challenge.type, challenge.targetValue, challenge.xpReward);

        challenges.push({
            id: result.lastInsertRowid,
            user_id: userId,
            date,
            challenge_type: challenge.type,
            target_value: challenge.targetValue,
            current_value: 0,
            is_completed: false,
            xp_reward: challenge.xpReward
        });
    }

    return challenges;
}

export default router;
