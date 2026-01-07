import { Router } from 'express';
import { getDb } from '../models/database.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

/**
 * Get user's notifications.
 * GET /api/notifications
 * Query params:
 *   - limit: max results (default 50)
 *   - offset: pagination offset (default 0)
 *   - unreadOnly: filter unread only (default false)
 *   - sortOrder: 'asc' or 'desc' (default 'desc' - newest first)
 *   - type: filter by notification type (optional)
 */
router.get('/', authenticate, (req, res, next) => {
    try {
        const { limit = 50, offset = 0, unreadOnly = false, sortOrder = 'desc', type } = req.query;
        const db = getDb();

        let query = `
            SELECT * FROM notifications
            WHERE user_id = ?
        `;
        const params = [req.userId];

        if (unreadOnly === 'true') {
            query += ' AND is_read = 0';
        }

        // Filter by type if provided
        if (type && type !== 'all') {
            query += ' AND type = ?';
            params.push(type);
        }

        // Validate sortOrder to prevent SQL injection
        const order = sortOrder === 'asc' ? 'ASC' : 'DESC';
        query += ` ORDER BY created_at ${order} LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));

        const notifications = db.prepare(query).all(...params);

        const unreadCount = db.prepare(
            'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0'
        ).get(req.userId);

        const total = db.prepare(
            'SELECT COUNT(*) as count FROM notifications WHERE user_id = ?'
        ).get(req.userId);

        res.json({
            notifications: notifications.map(n => ({
                ...n,
                data: JSON.parse(n.data_json || '{}')
            })),
            unreadCount: unreadCount.count,
            total: total.count,
            sortOrder: order.toLowerCase()
        });
    } catch (err) {
        next(err);
    }
});

/**
 * Export filtered notifications.
 * GET /api/notifications/export
 * Query params:
 *   - type: filter by notification type (optional)
 *   - unreadOnly: filter unread only (default false)
 *   - sortOrder: 'asc' or 'desc' (default 'desc' - newest first)
 * Returns JSON file with filtered notifications.
 */
router.get('/export', authenticate, (req, res, next) => {
    try {
        const { unreadOnly = false, sortOrder = 'desc', type } = req.query;
        const db = getDb();

        let query = `
            SELECT id, type, title, body, is_read, created_at FROM notifications
            WHERE user_id = ?
        `;
        const params = [req.userId];

        if (unreadOnly === 'true') {
            query += ' AND is_read = 0';
        }

        // Filter by type if provided
        if (type && type !== 'all') {
            query += ' AND type = ?';
            params.push(type);
        }

        // Validate sortOrder to prevent SQL injection
        const order = sortOrder === 'asc' ? 'ASC' : 'DESC';
        query += ` ORDER BY created_at ${order}`;

        const notifications = db.prepare(query).all(...params);

        const exportData = {
            exportedAt: new Date().toISOString(),
            filters: {
                type: type || 'all',
                unreadOnly: unreadOnly === 'true',
                sortOrder: order.toLowerCase()
            },
            totalCount: notifications.length,
            notifications: notifications.map(n => ({
                id: n.id,
                type: n.type,
                title: n.title,
                body: n.body,
                isRead: n.is_read === 1,
                createdAt: n.created_at
            }))
        };

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="notifications-export-${Date.now()}.json"`);
        res.json(exportData);
    } catch (err) {
        next(err);
    }
});

/**
 * Mark notification as read.
 * PATCH /api/notifications/:id/read
 */
router.patch('/:id/read', authenticate, (req, res, next) => {
    try {
        const { id } = req.params;
        const db = getDb();

        const result = db.prepare(`
            UPDATE notifications
            SET is_read = 1
            WHERE id = ? AND user_id = ?
        `).run(id, req.userId);

        if (result.changes === 0) {
            return res.status(404).json({
                error: { message: 'Notification not found' }
            });
        }

        res.json({ message: 'Notification marked as read' });
    } catch (err) {
        next(err);
    }
});

/**
 * Mark all notifications as read.
 * PATCH /api/notifications/read-all
 */
router.patch('/read-all', authenticate, (req, res, next) => {
    try {
        const db = getDb();

        db.prepare(`
            UPDATE notifications
            SET is_read = 1
            WHERE user_id = ? AND is_read = 0
        `).run(req.userId);

        res.json({ message: 'All notifications marked as read' });
    } catch (err) {
        next(err);
    }
});

/**
 * Get notification settings.
 * GET /api/notifications/settings
 */
router.get('/settings', authenticate, (req, res, next) => {
    try {
        const db = getDb();

        const user = db.prepare(
            'SELECT settings_json FROM users WHERE id = ?'
        ).get(req.userId);

        const settings = JSON.parse(user.settings_json || '{}');
        const notificationSettings = settings.notifications || {
            challenges: true,
            friendRequests: true,
            matchInvites: true,
            achievements: true,
            streakReminders: true,
            friendActivity: true
        };

        res.json({ settings: notificationSettings });
    } catch (err) {
        next(err);
    }
});

/**
 * Update notification settings.
 * PATCH /api/notifications/settings
 */
router.patch('/settings', authenticate, (req, res, next) => {
    try {
        const db = getDb();

        const user = db.prepare(
            'SELECT settings_json FROM users WHERE id = ?'
        ).get(req.userId);

        const settings = JSON.parse(user.settings_json || '{}');
        settings.notifications = { ...settings.notifications, ...req.body };

        db.prepare(`
            UPDATE users
            SET settings_json = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(JSON.stringify(settings), req.userId);

        res.json({ message: 'Notification settings updated', settings: settings.notifications });
    } catch (err) {
        next(err);
    }
});

export default router;
