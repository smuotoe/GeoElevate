import { Router } from 'express';
import { getDb } from '../models/database.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

/**
 * Get tutorial status.
 * GET /api/tutorial/status
 */
router.get('/status', authenticate, (req, res, next) => {
    try {
        const db = getDb();

        const user = db.prepare(`
            SELECT settings_json FROM users WHERE id = ?
        `).get(req.userId);

        const settings = JSON.parse(user?.settings_json || '{}');

        res.json({
            completed: settings.tutorialCompleted || false,
            skipped: settings.tutorialSkipped || false,
            needsTutorial: !settings.tutorialCompleted && !settings.tutorialSkipped
        });
    } catch (err) {
        next(err);
    }
});

/**
 * Mark tutorial as completed.
 * POST /api/tutorial/complete
 */
router.post('/complete', authenticate, (req, res, next) => {
    try {
        const db = getDb();

        db.prepare(`
            UPDATE users
            SET settings_json = json_set(COALESCE(settings_json, '{}'), '$.tutorialCompleted', true),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(req.userId);

        res.json({ message: 'Tutorial completed' });
    } catch (err) {
        next(err);
    }
});

/**
 * Mark tutorial as skipped.
 * POST /api/tutorial/skip
 */
router.post('/skip', authenticate, (req, res, next) => {
    try {
        const db = getDb();

        db.prepare(`
            UPDATE users
            SET settings_json = json_set(COALESCE(settings_json, '{}'), '$.tutorialSkipped', true),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(req.userId);

        res.json({ message: 'Tutorial skipped' });
    } catch (err) {
        next(err);
    }
});

export default router;
