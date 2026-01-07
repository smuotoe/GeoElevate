import { Router } from 'express';
import { getDb } from '../models/database.js';
import { authenticate, optionalAuthenticate } from '../middleware/auth.js';

const router = Router();

/**
 * Get all achievements.
 * GET /api/achievements
 */
router.get('/', optionalAuthenticate, (req, res, next) => {
    try {
        const db = getDb();

        const achievements = db.prepare(`
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
router.get('/user/:userId', authenticate, (req, res, next) => {
    try {
        const { userId } = req.params;
        const db = getDb();

        const achievements = db.prepare(`
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

export default router;
