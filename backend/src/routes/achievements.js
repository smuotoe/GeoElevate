import { Router } from 'express';
import { getDb } from '../models/database.js';
import { authenticate, optionalAuthenticate } from '../middleware/auth.js';

const router = Router();

/**
 * Get all achievements.
 * GET /api/achievements
 */
router.get('/', optionalAuthenticate, async (req, res, next) => {
    try {
        const db = getDb();

        const achievements = await db.prepare(`
            SELECT * FROM achievements ORDER BY category, requirement_value
        `).all();

        res.json({ achievements });
    } catch (err) {
        next(err);
    }
});

/**
 * Get user's achievements with progress.
 * GET /api/achievements/user/:userId
 */
router.get('/user/:userId', authenticate, async (req, res, next) => {
    try {
        const { userId } = req.params;
        const db = getDb();

        const achievements = await db.prepare(`
            SELECT a.*, ua.progress, ua.unlocked_at
            FROM achievements a
            LEFT JOIN user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = ?
            ORDER BY a.category, a.requirement_value
        `).all(userId);

        const unlocked = achievements.filter(a => a.unlocked_at).length;
        const total = achievements.length;

        res.json({
            achievements,
            summary: { unlocked, total, percentage: total > 0 ? (unlocked / total * 100).toFixed(1) : 0 }
        });
    } catch (err) {
        next(err);
    }
});

/**
 * Sync achievement progress with actual stats.
 * POST /api/achievements/sync
 * This fixes any desync between achievement progress and actual user stats.
 */
router.post('/sync', authenticate, async (req, res, next) => {
    try {
        const db = getDb();
        const userId = req.userId;

        // Get user's category stats
        const stats = await db.prepare(
            'SELECT category, total_correct, games_played FROM user_category_stats WHERE user_id = ?'
        ).all(userId);

        const statsMap = {};
        for (const stat of stats) {
            statsMap[stat.category] = stat;
        }

        // Get all achievements
        const achievements = await db.prepare('SELECT * FROM achievements').all();

        let synced = 0;
        for (const achievement of achievements) {
            let correctProgress = null;

            // Calculate correct progress based on achievement type
            if (achievement.requirement_type === 'correct_count') {
                if (achievement.category === 'flags' && statsMap.flags) {
                    correctProgress = Math.min(statsMap.flags.total_correct, achievement.requirement_value);
                } else if (achievement.category === 'capitals' && statsMap.capitals) {
                    correctProgress = Math.min(statsMap.capitals.total_correct, achievement.requirement_value);
                } else if (achievement.category === 'languages' && statsMap.languages) {
                    correctProgress = Math.min(statsMap.languages.total_correct, achievement.requirement_value);
                }
            } else if (achievement.requirement_type === 'games_played') {
                if (achievement.category === 'maps' && statsMap.maps) {
                    correctProgress = Math.min(statsMap.maps.games_played, achievement.requirement_value);
                }
            }

            if (correctProgress !== null) {
                const existing = await db.prepare(
                    'SELECT * FROM user_achievements WHERE user_id = ? AND achievement_id = ?'
                ).get(userId, achievement.id);

                const unlocked = correctProgress >= achievement.requirement_value;

                if (existing) {
                    if (existing.progress !== correctProgress) {
                        await db.prepare(`
                            UPDATE user_achievements
                            SET progress = ?,
                                unlocked_at = CASE
                                    WHEN ? AND unlocked_at IS NULL THEN CURRENT_TIMESTAMP
                                    ELSE unlocked_at
                                END
                            WHERE user_id = ? AND achievement_id = ?
                        `).run(correctProgress, unlocked ? 1 : 0, userId, achievement.id);
                        synced++;
                    }
                } else if (correctProgress > 0) {
                    await db.prepare(`
                        INSERT INTO user_achievements (user_id, achievement_id, progress, unlocked_at)
                        VALUES (?, ?, ?, ?)
                    `).run(userId, achievement.id, correctProgress, unlocked ? new Date().toISOString() : null);
                    synced++;
                }
            }
        }

        res.json({ message: 'Achievements synced', synced });
    } catch (err) {
        next(err);
    }
});

export default router;
