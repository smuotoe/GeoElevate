import { Router } from 'express';
import { getDb } from '../models/database.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

/**
 * Send challenge to a friend.
 * POST /api/multiplayer/challenge
 */
router.post('/challenge', authenticate, (req, res, next) => {
    try {
        const { opponentId, gameType } = req.body;

        if (!opponentId || !gameType) {
            return res.status(400).json({
                error: { message: 'Opponent ID and game type are required' }
            });
        }

        const db = getDb();

        // Verify opponent is a friend
        const friendship = db.prepare(`
            SELECT * FROM friendships
            WHERE ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?))
            AND status = 'accepted'
        `).get(req.userId, opponentId, opponentId, req.userId);

        if (!friendship) {
            return res.status(403).json({
                error: { message: 'Can only challenge friends to matches' }
            });
        }

        // Create match
        const result = db.prepare(`
            INSERT INTO multiplayer_matches (challenger_id, opponent_id, game_type)
            VALUES (?, ?, ?)
        `).run(req.userId, opponentId, gameType);

        // Create notification for opponent
        const challenger = db.prepare(
            'SELECT username FROM users WHERE id = ?'
        ).get(req.userId);

        db.prepare(`
            INSERT INTO notifications (user_id, type, title, body, data_json)
            VALUES (?, 'match_invite', 'Match Invite', ?, ?)
        `).run(
            opponentId,
            `${challenger.username} challenged you to a ${gameType} match!`,
            JSON.stringify({ matchId: result.lastInsertRowid, gameType })
        );

        res.status(201).json({
            matchId: result.lastInsertRowid,
            message: 'Challenge sent'
        });
    } catch (err) {
        next(err);
    }
});

/**
 * Get pending invites.
 * GET /api/multiplayer/invites
 */
router.get('/invites', authenticate, (req, res, next) => {
    try {
        const db = getDb();

        const invites = db.prepare(`
            SELECT m.*, u.username as challenger_name, u.avatar_url as challenger_avatar
            FROM multiplayer_matches m
            JOIN users u ON u.id = m.challenger_id
            WHERE m.opponent_id = ? AND m.status = 'pending'
            ORDER BY m.created_at DESC
        `).all(req.userId);

        res.json({ invites });
    } catch (err) {
        next(err);
    }
});

/**
 * Accept match invite.
 * POST /api/multiplayer/invites/:id/accept
 */
router.post('/invites/:id/accept', authenticate, (req, res, next) => {
    try {
        const { id } = req.params;
        const db = getDb();

        const match = db.prepare(`
            SELECT * FROM multiplayer_matches
            WHERE id = ? AND opponent_id = ? AND status = 'pending'
        `).get(id, req.userId);

        if (!match) {
            return res.status(404).json({
                error: { message: 'Invite not found' }
            });
        }

        db.prepare(`
            UPDATE multiplayer_matches
            SET status = 'active', started_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(id);

        // Notify challenger
        db.prepare(`
            INSERT INTO notifications (user_id, type, title, body, data_json)
            VALUES (?, 'match_accepted', 'Match Accepted', ?, ?)
        `).run(
            match.challenger_id,
            'Your challenge was accepted! Join the match now.',
            JSON.stringify({ matchId: id })
        );

        res.json({ matchId: id, message: 'Match started' });
    } catch (err) {
        next(err);
    }
});

/**
 * Decline match invite.
 * POST /api/multiplayer/invites/:id/decline
 */
router.post('/invites/:id/decline', authenticate, (req, res, next) => {
    try {
        const { id } = req.params;
        const db = getDb();

        const result = db.prepare(`
            UPDATE multiplayer_matches
            SET status = 'cancelled'
            WHERE id = ? AND opponent_id = ? AND status = 'pending'
        `).run(id, req.userId);

        if (result.changes === 0) {
            return res.status(404).json({
                error: { message: 'Invite not found' }
            });
        }

        res.json({ message: 'Invite declined' });
    } catch (err) {
        next(err);
    }
});

/**
 * Get match details.
 * GET /api/multiplayer/matches/:id
 */
router.get('/matches/:id', authenticate, (req, res, next) => {
    try {
        const { id } = req.params;
        const db = getDb();

        const match = db.prepare(`
            SELECT m.*,
                   c.username as challenger_name, c.avatar_url as challenger_avatar,
                   o.username as opponent_name, o.avatar_url as opponent_avatar
            FROM multiplayer_matches m
            JOIN users c ON c.id = m.challenger_id
            JOIN users o ON o.id = m.opponent_id
            WHERE m.id = ? AND (m.challenger_id = ? OR m.opponent_id = ?)
        `).get(id, req.userId, req.userId);

        if (!match) {
            return res.status(404).json({
                error: { message: 'Match not found' }
            });
        }

        // Get answers if match is completed
        let answers = [];
        if (match.status === 'completed') {
            answers = db.prepare(`
                SELECT * FROM multiplayer_answers
                WHERE match_id = ?
                ORDER BY question_index, user_id
            `).all(id);
        }

        res.json({
            match,
            answers: answers.map(a => ({
                ...a,
                question: JSON.parse(a.question_data_json)
            }))
        });
    } catch (err) {
        next(err);
    }
});

export default router;
