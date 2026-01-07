import { Router } from 'express';
import { getDb } from '../models/database.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

/**
 * Get user by ID.
 * GET /api/users/:id
 */
router.get('/:id', authenticate, (req, res, next) => {
    try {
        const { id } = req.params;
        const db = getDb();

        const user = db.prepare(`
            SELECT id, username, avatar_url, overall_xp, overall_level,
                   current_streak, longest_streak, created_at
            FROM users WHERE id = ?
        `).get(id);

        if (!user) {
            return res.status(404).json({
                error: { message: 'User not found' }
            });
        }

        res.json({ user });
    } catch (err) {
        next(err);
    }
});

/**
 * Update user.
 * PATCH /api/users/:id
 */
router.patch('/:id', authenticate, (req, res, next) => {
    try {
        const { id } = req.params;

        // Can only update own profile
        if (parseInt(id) !== req.userId) {
            return res.status(403).json({
                error: { message: 'Cannot update another user\'s profile' }
            });
        }

        const { username, avatar_url } = req.body;
        const db = getDb();

        const updates = [];
        const values = [];

        if (username) {
            updates.push('username = ?');
            values.push(username);
        }
        if (avatar_url) {
            updates.push('avatar_url = ?');
            values.push(avatar_url);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                error: { message: 'No fields to update' }
            });
        }

        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);

        db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);

        const user = db.prepare(
            'SELECT id, username, avatar_url FROM users WHERE id = ?'
        ).get(id);

        res.json({ user });
    } catch (err) {
        next(err);
    }
});

/**
 * Delete user account.
 * DELETE /api/users/:id
 */
router.delete('/:id', authenticate, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { password } = req.body;

        // Can only delete own account
        if (parseInt(id) !== req.userId) {
            return res.status(403).json({
                error: { message: 'Cannot delete another user\'s account' }
            });
        }

        if (!password) {
            return res.status(400).json({
                error: { message: 'Password confirmation required' }
            });
        }

        const db = getDb();
        const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(id);

        if (!user) {
            return res.status(404).json({
                error: { message: 'User not found' }
            });
        }

        // Verify password
        const bcrypt = await import('bcryptjs');
        const isValid = await bcrypt.compare(password, user.password_hash);

        if (!isValid) {
            return res.status(401).json({
                error: { message: 'Invalid password' }
            });
        }

        // Delete user (cascades to related tables)
        db.prepare('DELETE FROM users WHERE id = ?').run(id);

        res.json({ message: 'Account deleted successfully' });
    } catch (err) {
        next(err);
    }
});

/**
 * Get user stats.
 * GET /api/users/:id/stats
 */
router.get('/:id/stats', authenticate, (req, res, next) => {
    try {
        const { id } = req.params;
        const db = getDb();

        const stats = db.prepare(`
            SELECT category, xp, level, games_played, total_correct, total_questions,
                   high_score, average_time_ms
            FROM user_category_stats WHERE user_id = ?
        `).all(id);

        const overall = db.prepare(`
            SELECT overall_xp, overall_level, current_streak, longest_streak
            FROM users WHERE id = ?
        `).get(id);

        res.json({ stats, overall });
    } catch (err) {
        next(err);
    }
});

/**
 * Get user achievements.
 * GET /api/users/:id/achievements
 */
router.get('/:id/achievements', authenticate, (req, res, next) => {
    try {
        const { id } = req.params;
        const db = getDb();

        const achievements = db.prepare(`
            SELECT a.*, ua.progress, ua.unlocked_at
            FROM achievements a
            LEFT JOIN user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = ?
        `).all(id);

        res.json({ achievements });
    } catch (err) {
        next(err);
    }
});

/**
 * Get user game history.
 * GET /api/users/:id/game-history
 */
router.get('/:id/game-history', authenticate, (req, res, next) => {
    try {
        const { id } = req.params;
        const { limit = 20, offset = 0 } = req.query;
        const db = getDb();

        const games = db.prepare(`
            SELECT id, game_type, game_mode, score, xp_earned, correct_count,
                   total_questions, average_time_ms, started_at, completed_at,
                   difficulty_level, region_filter
            FROM game_sessions
            WHERE user_id = ?
            ORDER BY started_at DESC
            LIMIT ? OFFSET ?
        `).all(id, parseInt(limit), parseInt(offset));

        const total = db.prepare(
            'SELECT COUNT(*) as count FROM game_sessions WHERE user_id = ?'
        ).get(id);

        res.json({ games, total: total.count });
    } catch (err) {
        next(err);
    }
});

export default router;
