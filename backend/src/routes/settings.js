import { Router } from 'express';
import { getDb } from '../models/database.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

/**
 * Get user settings.
 * GET /api/settings
 */
router.get('/', authenticate, (req, res, next) => {
    try {
        const db = getDb();

        const user = db.prepare(
            'SELECT settings_json FROM users WHERE id = ?'
        ).get(req.userId);

        const settings = JSON.parse(user.settings_json || '{}');

        // Provide defaults
        const defaultSettings = {
            sound: true,
            music: true,
            theme: 'dark',
            language: 'en',
            notifications: {
                challenges: true,
                friendRequests: true,
                matchInvites: true,
                achievements: true,
                streakReminders: true,
                friendActivity: true
            },
            privacy: {
                profileVisible: true,
                showOnLeaderboards: true
            }
        };

        res.json({ settings: { ...defaultSettings, ...settings } });
    } catch (err) {
        next(err);
    }
});

/**
 * Update user settings.
 * PATCH /api/settings
 */
router.patch('/', authenticate, (req, res, next) => {
    try {
        const db = getDb();

        const user = db.prepare(
            'SELECT settings_json FROM users WHERE id = ?'
        ).get(req.userId);

        const currentSettings = JSON.parse(user.settings_json || '{}');
        const newSettings = { ...currentSettings, ...req.body };

        db.prepare(`
            UPDATE users
            SET settings_json = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(JSON.stringify(newSettings), req.userId);

        res.json({ message: 'Settings updated', settings: newSettings });
    } catch (err) {
        next(err);
    }
});

export default router;
