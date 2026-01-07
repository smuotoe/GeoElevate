import { Router } from 'express';
import { getDb } from '../models/database.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

/**
 * Get user's friends list.
 * GET /api/friends
 */
router.get('/', authenticate, (req, res, next) => {
    try {
        const db = getDb();

        const friends = db.prepare(`
            SELECT u.id, u.username, u.avatar_url, u.overall_xp, u.overall_level,
                   u.current_streak, u.last_login_at, f.accepted_at
            FROM friendships f
            JOIN users u ON (
                CASE
                    WHEN f.user_id = ? THEN f.friend_id
                    ELSE f.user_id
                END = u.id
            )
            WHERE (f.user_id = ? OR f.friend_id = ?)
            AND f.status = 'accepted'
        `).all(req.userId, req.userId, req.userId);

        res.json({ friends });
    } catch (err) {
        next(err);
    }
});

/**
 * Send friend request.
 * POST /api/friends/request
 */
router.post('/request', authenticate, (req, res, next) => {
    try {
        const { username } = req.body;

        if (!username) {
            return res.status(400).json({
                error: { message: 'Username is required' }
            });
        }

        const db = getDb();

        // Find user by username
        const friendUser = db.prepare(
            'SELECT id FROM users WHERE username = ?'
        ).get(username);

        if (!friendUser) {
            return res.status(404).json({
                error: { message: 'User not found' }
            });
        }

        if (friendUser.id === req.userId) {
            return res.status(400).json({
                error: { message: 'Cannot add yourself as a friend' }
            });
        }

        // Check if friendship already exists
        const existing = db.prepare(`
            SELECT * FROM friendships
            WHERE (user_id = ? AND friend_id = ?)
            OR (user_id = ? AND friend_id = ?)
        `).get(req.userId, friendUser.id, friendUser.id, req.userId);

        if (existing) {
            return res.status(409).json({
                error: { message: 'Friend request already exists or you are already friends' }
            });
        }

        // Create friend request
        db.prepare(`
            INSERT INTO friendships (user_id, friend_id, status)
            VALUES (?, ?, 'pending')
        `).run(req.userId, friendUser.id);

        // Create notification for the friend
        db.prepare(`
            INSERT INTO notifications (user_id, type, title, body, data_json)
            VALUES (?, 'friend_request', 'New Friend Request', ?, ?)
        `).run(
            friendUser.id,
            `${req.userId} wants to be your friend`,
            JSON.stringify({ fromUserId: req.userId })
        );

        res.status(201).json({ message: 'Friend request sent' });
    } catch (err) {
        next(err);
    }
});

/**
 * Accept friend request.
 * POST /api/friends/request/:id/accept
 */
router.post('/request/:id/accept', authenticate, (req, res, next) => {
    try {
        const { id } = req.params;
        const db = getDb();

        // Find pending request where current user is the friend_id
        const request = db.prepare(`
            SELECT * FROM friendships
            WHERE id = ? AND friend_id = ? AND status = 'pending'
        `).get(id, req.userId);

        if (!request) {
            return res.status(404).json({
                error: { message: 'Friend request not found' }
            });
        }

        // Accept the request
        db.prepare(`
            UPDATE friendships
            SET status = 'accepted', accepted_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(id);

        // Notify the requester
        db.prepare(`
            INSERT INTO notifications (user_id, type, title, body, data_json)
            VALUES (?, 'friend_accepted', 'Friend Request Accepted', ?, ?)
        `).run(
            request.user_id,
            'Your friend request was accepted',
            JSON.stringify({ friendId: req.userId })
        );

        res.json({ message: 'Friend request accepted' });
    } catch (err) {
        next(err);
    }
});

/**
 * Decline friend request.
 * POST /api/friends/request/:id/decline
 */
router.post('/request/:id/decline', authenticate, (req, res, next) => {
    try {
        const { id } = req.params;
        const db = getDb();

        const result = db.prepare(`
            DELETE FROM friendships
            WHERE id = ? AND friend_id = ? AND status = 'pending'
        `).run(id, req.userId);

        if (result.changes === 0) {
            return res.status(404).json({
                error: { message: 'Friend request not found' }
            });
        }

        res.json({ message: 'Friend request declined' });
    } catch (err) {
        next(err);
    }
});

/**
 * Remove friend.
 * DELETE /api/friends/:id
 */
router.delete('/:id', authenticate, (req, res, next) => {
    try {
        const { id } = req.params;
        const db = getDb();

        const result = db.prepare(`
            DELETE FROM friendships
            WHERE ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?))
            AND status = 'accepted'
        `).run(req.userId, id, id, req.userId);

        if (result.changes === 0) {
            return res.status(404).json({
                error: { message: 'Friendship not found' }
            });
        }

        res.json({ message: 'Friend removed' });
    } catch (err) {
        next(err);
    }
});

/**
 * Get activity feed.
 * GET /api/friends/activity-feed
 */
router.get('/activity-feed', authenticate, (req, res, next) => {
    try {
        const { limit = 20, offset = 0 } = req.query;
        const db = getDb();

        // Get friend IDs
        const friendIds = db.prepare(`
            SELECT CASE
                WHEN user_id = ? THEN friend_id
                ELSE user_id
            END as friend_id
            FROM friendships
            WHERE (user_id = ? OR friend_id = ?) AND status = 'accepted'
        `).all(req.userId, req.userId, req.userId).map(f => f.friend_id);

        if (friendIds.length === 0) {
            return res.json({ activities: [] });
        }

        const placeholders = friendIds.map(() => '?').join(',');
        const activities = db.prepare(`
            SELECT af.*, u.username, u.avatar_url
            FROM activity_feed af
            JOIN users u ON u.id = af.user_id
            WHERE af.user_id IN (${placeholders})
            ORDER BY af.created_at DESC
            LIMIT ? OFFSET ?
        `).all(...friendIds, parseInt(limit), parseInt(offset));

        res.json({
            activities: activities.map(a => ({
                ...a,
                data: JSON.parse(a.data_json || '{}')
            }))
        });
    } catch (err) {
        next(err);
    }
});

export default router;
