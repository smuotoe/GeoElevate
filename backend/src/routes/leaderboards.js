import { Router } from 'express';
import { getDb } from '../models/database.js';
import { authenticate, optionalAuthenticate } from '../middleware/auth.js';

const router = Router();
const VALID_GAME_TYPES = ['flags', 'capitals', 'maps', 'languages', 'trivia'];

/**
 * Get the date string for yesterday in YYYY-MM-DD format.
 *
 * @returns {string} Yesterday's date string
 */
function getYesterdayDate() {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return date.toISOString().split('T')[0];
}

/**
 * Get the date string for today in YYYY-MM-DD format.
 *
 * @returns {string} Today's date string
 */
function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

/**
 * Get previous rank for a user from snapshots.
 *
 * @param {object} db - Database instance
 * @param {number} userId - User ID
 * @param {string} leaderboardType - Type of leaderboard (global, weekly, game_type)
 * @returns {Promise<number|null>} Previous rank or null if not found
 */
async function getPreviousRank(db, userId, leaderboardType) {
    const yesterday = getYesterdayDate();
    const snapshot = await db.prepare(`
        SELECT rank FROM leaderboard_snapshots
        WHERE user_id = ? AND leaderboard_type = ? AND created_at::text LIKE ?
        ORDER BY created_at DESC
        LIMIT 1
    `).get(userId, leaderboardType, `${yesterday}%`);
    return snapshot?.rank || null;
}

/**
 * Save current rank snapshot for a user.
 *
 * @param {object} db - Database instance
 * @param {number} userId - User ID
 * @param {string} leaderboardType - Type of leaderboard
 * @param {number} rank - Current rank
 * @param {number} score - Current score
 */
async function saveRankSnapshot(db, userId, leaderboardType, rank, score) {
    const today = getTodayDate();
    const existing = await db.prepare(`
        SELECT id FROM leaderboard_snapshots
        WHERE user_id = ? AND leaderboard_type = ? AND created_at::text LIKE ?
    `).get(userId, leaderboardType, `${today}%`);

    if (!existing) {
        await db.prepare(`
            INSERT INTO leaderboard_snapshots (leaderboard_type, user_id, score, rank)
            VALUES (?, ?, ?, ?)
        `).run(leaderboardType, userId, score, rank);
    }
}

/**
 * Calculate rank change (positive = improved, negative = dropped).
 *
 * @param {number} currentRank - Current rank
 * @param {number|null} previousRank - Previous rank
 * @returns {number|null} Rank change or null if no previous data
 */
function calculateRankChange(currentRank, previousRank) {
    if (previousRank === null) return null;
    return previousRank - currentRank;
}

/**
 * Get global all-time leaderboard.
 * GET /api/leaderboards/global
 */
router.get('/global', optionalAuthenticate, async (req, res, next) => {
    try {
        const { limit = 50, offset = 0 } = req.query;
        const db = getDb();

        const leaderboard = await db.prepare(`
            SELECT id, username, avatar_url, overall_xp, overall_level, current_streak,
                   ROW_NUMBER() OVER (ORDER BY overall_xp DESC) as rank
            FROM users
            WHERE is_guest = false
            ORDER BY overall_xp DESC
            LIMIT ? OFFSET ?
        `).all(parseInt(limit), parseInt(offset));

        const leaderboardWithChanges = [];
        for (const entry of leaderboard) {
            const previousRank = await getPreviousRank(db, entry.id, 'global');
            const rankChange = calculateRankChange(entry.rank, previousRank);
            await saveRankSnapshot(db, entry.id, 'global', entry.rank, entry.overall_xp);
            leaderboardWithChanges.push({ ...entry, rankChange });
        }

        let userRank = null;
        let userRankChange = null;
        if (req.userId) {
            const userRankData = await db.prepare(`
                SELECT rank, overall_xp FROM (
                    SELECT id, overall_xp, ROW_NUMBER() OVER (ORDER BY overall_xp DESC) as rank
                    FROM users WHERE is_guest = false
                ) sub
                WHERE id = ?
            `).get(req.userId);
            userRank = userRankData?.rank;
            if (userRank) {
                const previousRank = await getPreviousRank(db, req.userId, 'global');
                userRankChange = calculateRankChange(userRank, previousRank);
                await saveRankSnapshot(db, req.userId, 'global', userRank, userRankData?.overall_xp || 0);
            }
        }

        res.json({ leaderboard: leaderboardWithChanges, userRank, userRankChange });
    } catch (err) {
        next(err);
    }
});

/**
 * Get per-game-type leaderboard.
 * GET /api/leaderboards/game/:gameType
 */
router.get('/game/:gameType', optionalAuthenticate, async (req, res, next) => {
    try {
        const { gameType } = req.params;
        const { limit = 50, offset = 0 } = req.query;

        if (!VALID_GAME_TYPES.includes(gameType)) {
            return res.status(400).json({
                error: { message: 'Invalid game type' }
            });
        }

        const db = getDb();

        const leaderboard = await db.prepare(`
            SELECT u.id, u.username, u.avatar_url, ucs.xp, ucs.level, ucs.high_score,
                   ROW_NUMBER() OVER (ORDER BY ucs.xp DESC) as rank
            FROM user_category_stats ucs
            JOIN users u ON u.id = ucs.user_id
            WHERE ucs.category = ? AND u.is_guest = false
            ORDER BY ucs.xp DESC
            LIMIT ? OFFSET ?
        `).all(gameType, parseInt(limit), parseInt(offset));

        let userRank = null;
        if (req.userId) {
            const result = await db.prepare(`
                SELECT rank FROM (
                    SELECT user_id, ROW_NUMBER() OVER (ORDER BY xp DESC) as rank
                    FROM user_category_stats
                    WHERE category = ?
                ) sub
                WHERE user_id = ?
            `).get(gameType, req.userId);
            userRank = result?.rank;
        }

        res.json({ leaderboard, userRank, gameType });
    } catch (err) {
        next(err);
    }
});

/**
 * Get weekly leaderboard with optional game type filter.
 * GET /api/leaderboards/weekly
 */
router.get('/weekly', optionalAuthenticate, async (req, res, next) => {
    try {
        const { limit = 50, offset = 0, gameType } = req.query;
        const db = getDb();
        const startOfWeek = getStartOfWeek();
        const hasGameTypeFilter = gameType && VALID_GAME_TYPES.includes(gameType);

        let leaderboard;
        let userRank = null;

        if (hasGameTypeFilter) {
            leaderboard = await db.prepare(`
                SELECT u.id, u.username, u.avatar_url,
                       COALESCE(SUM(gs.xp_earned), 0) as weekly_xp,
                       ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(gs.xp_earned), 0) DESC) as rank
                FROM users u
                LEFT JOIN game_sessions gs ON gs.user_id = u.id
                    AND gs.completed_at >= ?
                    AND gs.game_type = ?
                WHERE u.is_guest = false
                GROUP BY u.id, u.username, u.avatar_url
                ORDER BY weekly_xp DESC
                LIMIT ? OFFSET ?
            `).all(startOfWeek, gameType, parseInt(limit), parseInt(offset));

            if (req.userId) {
                const userStats = await db.prepare(`
                    SELECT COALESCE(SUM(xp_earned), 0) as weekly_xp
                    FROM game_sessions
                    WHERE user_id = ? AND completed_at >= ? AND game_type = ?
                `).get(req.userId, startOfWeek, gameType);

                const betterPlayers = await db.prepare(`
                    SELECT COUNT(*) as count
                    FROM (
                        SELECT u.id, COALESCE(SUM(gs.xp_earned), 0) as weekly_xp
                        FROM users u
                        LEFT JOIN game_sessions gs ON gs.user_id = u.id
                            AND gs.completed_at >= ?
                            AND gs.game_type = ?
                        WHERE u.is_guest = false
                        GROUP BY u.id
                    ) sub
                    WHERE weekly_xp > ?
                `).get(startOfWeek, gameType, userStats?.weekly_xp || 0);

                userRank = (betterPlayers?.count || 0) + 1;
            }
        } else {
            leaderboard = await db.prepare(`
                SELECT u.id, u.username, u.avatar_url,
                       COALESCE(SUM(gs.xp_earned), 0) as weekly_xp,
                       ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(gs.xp_earned), 0) DESC) as rank
                FROM users u
                LEFT JOIN game_sessions gs ON gs.user_id = u.id
                    AND gs.completed_at >= ?
                WHERE u.is_guest = false
                GROUP BY u.id, u.username, u.avatar_url
                ORDER BY weekly_xp DESC
                LIMIT ? OFFSET ?
            `).all(startOfWeek, parseInt(limit), parseInt(offset));

            if (req.userId) {
                const userStats = await db.prepare(`
                    SELECT COALESCE(SUM(xp_earned), 0) as weekly_xp
                    FROM game_sessions
                    WHERE user_id = ? AND completed_at >= ?
                `).get(req.userId, startOfWeek);

                const betterPlayers = await db.prepare(`
                    SELECT COUNT(*) as count
                    FROM (
                        SELECT u.id, COALESCE(SUM(gs.xp_earned), 0) as weekly_xp
                        FROM users u
                        LEFT JOIN game_sessions gs ON gs.user_id = u.id
                            AND gs.completed_at >= ?
                        WHERE u.is_guest = false
                        GROUP BY u.id
                    ) sub
                    WHERE weekly_xp > ?
                `).get(startOfWeek, userStats?.weekly_xp || 0);

                userRank = (betterPlayers?.count || 0) + 1;
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
router.get('/friends', authenticate, async (req, res, next) => {
    try {
        const { gameType } = req.query;
        const db = getDb();
        const hasGameTypeFilter = gameType && VALID_GAME_TYPES.includes(gameType);

        const friendRows = await db.prepare(`
            SELECT CASE
                WHEN user_id = ? THEN friend_id
                ELSE user_id
            END as friend_id
            FROM friendships
            WHERE (user_id = ? OR friend_id = ?) AND status = 'accepted'
        `).all(req.userId, req.userId, req.userId);

        const friendIds = friendRows.map(f => f.friend_id);
        const userIds = [req.userId, ...friendIds];

        if (hasGameTypeFilter) {
            const placeholders = userIds.map((_, i) => `$${i + 2}`).join(',');
            const leaderboard = await db.prepare(`
                SELECT u.id, u.username, u.avatar_url,
                       COALESCE(ucs.xp, 0) as xp,
                       COALESCE(ucs.level, 1) as level,
                       ROW_NUMBER() OVER (ORDER BY COALESCE(ucs.xp, 0) DESC) as rank
                FROM users u
                LEFT JOIN user_category_stats ucs ON ucs.user_id = u.id AND ucs.category = $1
                WHERE u.id IN (${placeholders})
                ORDER BY xp DESC
            `).all(gameType, ...userIds);

            const userRank = leaderboard.find(u => u.id === req.userId)?.rank;
            return res.json({ leaderboard, userRank, gameType });
        }

        if (userIds.length === 1) {
            const user = await db.prepare(`
                SELECT id, username, avatar_url, overall_xp, overall_level
                FROM users WHERE id = ?
            `).get(req.userId);

            return res.json({
                leaderboard: user ? [{ ...user, rank: 1 }] : [],
                userRank: user ? 1 : null
            });
        }

        const placeholders = userIds.map((_, i) => `$${i + 1}`).join(',');
        const leaderboard = await db.prepare(`
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
