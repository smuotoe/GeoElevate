import { Router } from 'express';
import { getDb } from '../models/database.js';
import { authenticate, optionalAuthenticate } from '../middleware/auth.js';

const router = Router();
const VALID_GAME_TYPES = ['flags', 'capitals', 'maps', 'languages', 'trivia'];

/**
 * Get global all-time leaderboard.
 * GET /api/leaderboards/global
 */
router.get('/global', optionalAuthenticate, (req, res, next) => {
    try {
        const { limit = 50, offset = 0 } = req.query;
        const db = getDb();

        const leaderboard = db.prepare(`
            SELECT id, username, avatar_url, overall_xp, overall_level, current_streak,
                   ROW_NUMBER() OVER (ORDER BY overall_xp DESC) as rank
            FROM users
            WHERE is_guest = 0
            ORDER BY overall_xp DESC
            LIMIT ? OFFSET ?
        `).all(parseInt(limit), parseInt(offset));

        let userRank = null;
        if (req.userId) {
            userRank = db.prepare(`
                SELECT rank FROM (
                    SELECT id, ROW_NUMBER() OVER (ORDER BY overall_xp DESC) as rank
                    FROM users WHERE is_guest = 0
                )
                WHERE id = ?
            `).get(req.userId);
        }

        res.json({ leaderboard, userRank: userRank?.rank });
    } catch (err) {
        next(err);
    }
});

/**
 * Get per-game-type leaderboard.
 * GET /api/leaderboards/game/:gameType
 */
router.get('/game/:gameType', optionalAuthenticate, (req, res, next) => {
    try {
        const { gameType } = req.params;
        const { limit = 50, offset = 0 } = req.query;

        if (!VALID_GAME_TYPES.includes(gameType)) {
            return res.status(400).json({
                error: { message: 'Invalid game type' }
            });
        }

        const db = getDb();

        const leaderboard = db.prepare(`
            SELECT u.id, u.username, u.avatar_url, ucs.xp, ucs.level, ucs.high_score,
                   ROW_NUMBER() OVER (ORDER BY ucs.xp DESC) as rank
            FROM user_category_stats ucs
            JOIN users u ON u.id = ucs.user_id
            WHERE ucs.category = ? AND u.is_guest = 0
            ORDER BY ucs.xp DESC
            LIMIT ? OFFSET ?
        `).all(gameType, parseInt(limit), parseInt(offset));

        let userRank = null;
        if (req.userId) {
            userRank = db.prepare(`
                SELECT rank FROM (
                    SELECT user_id, ROW_NUMBER() OVER (ORDER BY xp DESC) as rank
                    FROM user_category_stats
                    WHERE category = ?
                )
                WHERE user_id = ?
            `).get(gameType, req.userId);
        }

        res.json({ leaderboard, userRank: userRank?.rank, gameType });
    } catch (err) {
        next(err);
    }
});

/**
 * Get weekly leaderboard with optional game type filter.
 * GET /api/leaderboards/weekly
 */
router.get('/weekly', optionalAuthenticate, (req, res, next) => {
    try {
        const { limit = 50, offset = 0, gameType } = req.query;
        const db = getDb();
        const startOfWeek = getStartOfWeek();
        const hasGameTypeFilter = gameType && VALID_GAME_TYPES.includes(gameType);

        let leaderboard;
        let userRank = null;

        if (hasGameTypeFilter) {
            leaderboard = db.prepare(`
                SELECT u.id, u.username, u.avatar_url,
                       COALESCE(SUM(gs.xp_earned), 0) as weekly_xp,
                       ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(gs.xp_earned), 0) DESC) as rank
                FROM users u
                LEFT JOIN game_sessions gs ON gs.user_id = u.id
                    AND gs.completed_at >= ?
                    AND gs.game_type = ?
                WHERE u.is_guest = 0
                GROUP BY u.id
                ORDER BY weekly_xp DESC
                LIMIT ? OFFSET ?
            `).all(startOfWeek, gameType, parseInt(limit), parseInt(offset));

            if (req.userId) {
                const userStats = db.prepare(`
                    SELECT COALESCE(SUM(xp_earned), 0) as weekly_xp
                    FROM game_sessions
                    WHERE user_id = ? AND completed_at >= ? AND game_type = ?
                `).get(req.userId, startOfWeek, gameType);

                const betterPlayers = db.prepare(`
                    SELECT COUNT(*) as count
                    FROM (
                        SELECT u.id, COALESCE(SUM(gs.xp_earned), 0) as weekly_xp
                        FROM users u
                        LEFT JOIN game_sessions gs ON gs.user_id = u.id
                            AND gs.completed_at >= ?
                            AND gs.game_type = ?
                        WHERE u.is_guest = 0
                        GROUP BY u.id
                    )
                    WHERE weekly_xp > ?
                `).get(startOfWeek, gameType, userStats?.weekly_xp || 0);

                userRank = betterPlayers.count + 1;
            }
        } else {
            leaderboard = db.prepare(`
                SELECT u.id, u.username, u.avatar_url,
                       COALESCE(SUM(gs.xp_earned), 0) as weekly_xp,
                       ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(gs.xp_earned), 0) DESC) as rank
                FROM users u
                LEFT JOIN game_sessions gs ON gs.user_id = u.id
                    AND gs.completed_at >= ?
                WHERE u.is_guest = 0
                GROUP BY u.id
                ORDER BY weekly_xp DESC
                LIMIT ? OFFSET ?
            `).all(startOfWeek, parseInt(limit), parseInt(offset));

            if (req.userId) {
                const userStats = db.prepare(`
                    SELECT COALESCE(SUM(xp_earned), 0) as weekly_xp
                    FROM game_sessions
                    WHERE user_id = ? AND completed_at >= ?
                `).get(req.userId, startOfWeek);

                const betterPlayers = db.prepare(`
                    SELECT COUNT(*) as count
                    FROM (
                        SELECT u.id, COALESCE(SUM(gs.xp_earned), 0) as weekly_xp
                        FROM users u
                        LEFT JOIN game_sessions gs ON gs.user_id = u.id
                            AND gs.completed_at >= ?
                        WHERE u.is_guest = 0
                        GROUP BY u.id
                    )
                    WHERE weekly_xp > ?
                `).get(startOfWeek, userStats?.weekly_xp || 0);

                userRank = betterPlayers.count + 1;
            }
        }

        res.json({ leaderboard, userRank, period: 'weekly', gameType: gameType || null });
    } catch (err) {
        next(err);
    }
});

/**
 * Get friends-only leaderboard with optional game type filter.
 * GET /api/leaderboards/friends
 */
router.get('/friends', authenticate, (req, res, next) => {
    try {
        const { gameType } = req.query;
        const db = getDb();
        const hasGameTypeFilter = gameType && VALID_GAME_TYPES.includes(gameType);

        const friendIds = db.prepare(`
            SELECT CASE
                WHEN user_id = ? THEN friend_id
                ELSE user_id
            END as friend_id
            FROM friendships
            WHERE (user_id = ? OR friend_id = ?) AND status = 'accepted'
        `).all(req.userId, req.userId, req.userId).map(f => f.friend_id);

        const userIds = [req.userId, ...friendIds];

        if (hasGameTypeFilter) {
            const placeholders = userIds.map(() => '?').join(',');
            const leaderboard = db.prepare(`
                SELECT u.id, u.username, u.avatar_url,
                       COALESCE(ucs.xp, 0) as xp,
                       COALESCE(ucs.level, 1) as level,
                       ROW_NUMBER() OVER (ORDER BY COALESCE(ucs.xp, 0) DESC) as rank
                FROM users u
                LEFT JOIN user_category_stats ucs ON ucs.user_id = u.id AND ucs.category = ?
                WHERE u.id IN (${placeholders})
                ORDER BY xp DESC
            `).all(gameType, ...userIds);

            const userRank = leaderboard.find(u => u.id === req.userId)?.rank;
            return res.json({ leaderboard, userRank, gameType });
        }

        if (userIds.length === 1) {
            const user = db.prepare(`
                SELECT id, username, avatar_url, overall_xp, overall_level
                FROM users WHERE id = ?
            `).get(req.userId);

            return res.json({
                leaderboard: [{ ...user, rank: 1 }],
                userRank: 1
            });
        }

        const placeholders = userIds.map(() => '?').join(',');
        const leaderboard = db.prepare(`
            SELECT id, username, avatar_url, overall_xp, overall_level,
                   ROW_NUMBER() OVER (ORDER BY overall_xp DESC) as rank
            FROM users
            WHERE id IN (${placeholders})
            ORDER BY overall_xp DESC
        `).all(...userIds);

        const userRank = leaderboard.find(u => u.id === req.userId)?.rank;
        res.json({ leaderboard, userRank });
    } catch (err) {
        next(err);
    }
});

/**
 * Get the start of the current week (Monday).
 *
 * @returns {string} ISO date string for start of week
 */
function getStartOfWeek() {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString();
}

export default router;
