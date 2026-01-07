import { Router } from 'express';
import { getDb } from '../models/database.js';
import { authenticate } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';

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
 *
 * Supports optimistic concurrency control via `expected_updated_at` field.
 * If provided, the update will only succeed if the record hasn't been
 * modified since that timestamp.
 */
router.patch('/', authenticate, (req, res, next) => {
    try {
        const db = getDb();
        const { expected_updated_at, ...settingsUpdate } = req.body;

        // Check for concurrent modification if expected_updated_at is provided
        if (expected_updated_at) {
            const current = db.prepare(
                'SELECT updated_at FROM users WHERE id = ?'
            ).get(req.userId);

            if (current && current.updated_at !== expected_updated_at) {
                return res.status(409).json({
                    error: {
                        message: 'Settings have been modified by another session. Please refresh and try again.',
                        code: 'CONCURRENT_MODIFICATION',
                        current_updated_at: current.updated_at
                    }
                });
            }
        }

        const user = db.prepare(
            'SELECT settings_json, updated_at FROM users WHERE id = ?'
        ).get(req.userId);

        const currentSettings = JSON.parse(user.settings_json || '{}');
        const newSettings = { ...currentSettings, ...settingsUpdate };

        db.prepare(`
            UPDATE users
            SET settings_json = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(JSON.stringify(newSettings), req.userId);

        const updatedUser = db.prepare(
            'SELECT updated_at FROM users WHERE id = ?'
        ).get(req.userId);

        res.json({
            message: 'Settings updated',
            settings: newSettings,
            updated_at: updatedUser.updated_at
        });
    } catch (err) {
        next(err);
    }
});

/**
 * Change user password.
 * POST /api/settings/change-password
 */
router.post('/change-password', authenticate, async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;

        // Validate required fields
        if (!currentPassword) {
            return res.status(400).json({
                error: { message: 'Current password is required' }
            });
        }

        if (!newPassword) {
            return res.status(400).json({
                error: { message: 'New password is required' }
            });
        }

        // Validate new password (min 8 chars, at least 1 letter and 1 number)
        if (newPassword.length < 8 || !/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
            return res.status(400).json({
                error: { message: 'New password must be at least 8 characters with at least one letter and one number' }
            });
        }

        const db = getDb();

        // Get user's current password hash
        const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.userId);

        if (!user) {
            return res.status(404).json({
                error: { message: 'User not found' }
            });
        }

        // Verify current password
        const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({
                error: { message: 'Current password is incorrect' }
            });
        }

        // Hash new password and update
        const newPasswordHash = await bcrypt.hash(newPassword, 10);

        db.prepare(`
            UPDATE users
            SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(newPasswordHash, req.userId);

        res.json({ message: 'Password changed successfully' });
    } catch (err) {
        next(err);
    }
});

export default router;
