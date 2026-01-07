import { Router } from 'express';
import { getDb } from '../models/database.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

/**
 * Get today's daily challenges.
 * GET /api/daily/challenges
 */
router.get('/challenges', authenticate, (req, res, next) => {
    try {
        const db = getDb();
        const today = new Date().toISOString().split('T')[0];

        // Get or create daily challenges
        let challenges = db.prepare(`
            SELECT * FROM daily_challenges
            WHERE user_id = ? AND date = ?
        `).all(req.userId, today);

        if (challenges.length === 0) {
            // Generate new daily challenges
            challenges = generateDailyChallenges(db, req.userId, today);
        }

        res.json({ challenges, date: today });
    } catch (err) {
        next(err);
    }
});

/**
 * Get user's streak info.
 * GET /api/daily/streak
 */
router.get('/streak', authenticate, (req, res, next) => {
    try {
        const db = getDb();

        const user = db.prepare(`
            SELECT current_streak, longest_streak, last_played_date
            FROM users WHERE id = ?
        `).get(req.userId);

        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        // Check if streak is still active
        const streakActive = user.last_played_date === today || user.last_played_date === yesterday;

        res.json({
            currentStreak: streakActive ? user.current_streak : 0,
            longestStreak: user.longest_streak,
            lastPlayedDate: user.last_played_date,
            streakActive
        });
    } catch (err) {
        next(err);
    }
});

/**
 * Update daily challenge progress.
 * POST /api/daily/challenges/:id/progress
 */
router.post('/challenges/:id/progress', authenticate, (req, res, next) => {
    try {
        const { id } = req.params;
        const { increment = 1 } = req.body;
        const db = getDb();

        const challenge = db.prepare(`
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

        db.prepare(`
            UPDATE daily_challenges
            SET current_value = ?, is_completed = ?
            WHERE id = ?
        `).run(newValue, isCompleted ? 1 : 0, id);

        // If completed, award XP
        if (isCompleted) {
            db.prepare(`
                UPDATE users
                SET overall_xp = overall_xp + ?
                WHERE id = ?
            `).run(challenge.xp_reward, req.userId);

            // Create notification
            db.prepare(`
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
 * @param {Database} db - Database instance
 * @param {number} userId - User ID
 * @param {string} date - Date string (YYYY-MM-DD)
 * @returns {Array} Array of generated challenges
 */
function generateDailyChallenges(db, userId, date) {
    // Get user's weak areas
    const stats = db.prepare(`
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

    const insertChallenge = db.prepare(`
        INSERT INTO daily_challenges (user_id, date, challenge_type, target_value, xp_reward)
        VALUES (?, ?, ?, ?, ?)
    `);

    const challenges = [];
    for (const challenge of challengeTypes.slice(0, 3)) {
        const result = insertChallenge.run(
            userId, date, challenge.type, challenge.targetValue, challenge.xpReward
        );
        challenges.push({
            id: result.lastInsertRowid,
            user_id: userId,
            date,
            challenge_type: challenge.type,
            target_value: challenge.targetValue,
            current_value: 0,
            is_completed: 0,
            xp_reward: challenge.xpReward
        });
    }

    return challenges;
}

export default router;
