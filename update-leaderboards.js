const fs = require('fs');

// Update frontend Leaderboards.jsx
const frontendContent = `import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import styles from './Leaderboards.module.css'

const PAGE_SIZE = 10
const GAME_TYPES = [
    { id: '', name: 'All Games' },
    { id: 'flags', name: 'Flags' },
    { id: 'capitals', name: 'Capitals' },
    { id: 'maps', name: 'Maps' },
    { id: 'languages', name: 'Languages' },
    { id: 'trivia', name: 'Trivia' }
]

/**
 * Leaderboards page component.
 *
 * @returns {React.ReactElement} Leaderboards page
 */
function Leaderboards() {
    const [activeTab, setActiveTab] = useState('global')
    const [gameType, setGameType] = useState('')
    const [leaderboard, setLeaderboard] = useState([])
    const [userRank, setUserRank] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [page, setPage] = useState(1)
    const [hasMore, setHasMore] = useState(false)
    const { user } = useAuth()

    const fetchLeaderboard = useCallback(async (tab, pageNum, gameTypeFilter) => {
        setLoading(true)
        setError(null)
        try {
            const offset = (pageNum - 1) * PAGE_SIZE
            let endpoint

            if (tab === 'friends') {
                // Friends leaderboard with optional game type filter
                endpoint = gameTypeFilter
                    ? \`/leaderboards/friends?gameType=\${gameTypeFilter}\`
                    : '/leaderboards/friends'
            } else if (tab === 'weekly') {
                // Weekly leaderboard with optional game type filter
                endpoint = gameTypeFilter
                    ? \`/leaderboards/weekly?gameType=\${gameTypeFilter}&limit=\${PAGE_SIZE}&offset=\${offset}\`
                    : \`/leaderboards/weekly?limit=\${PAGE_SIZE}&offset=\${offset}\`
            } else if (gameTypeFilter) {
                // Game type specific leaderboard
                endpoint = \`/leaderboards/game/\${gameTypeFilter}?limit=\${PAGE_SIZE}&offset=\${offset}\`
            } else {
                endpoint = \`/leaderboards/\${tab}?limit=\${PAGE_SIZE}&offset=\${offset}\`
            }

            const data = await api.get(endpoint)
            setLeaderboard(data.leaderboard || [])
            setUserRank(data.userRank)
            setHasMore(data.leaderboard?.length === PAGE_SIZE)
        } catch (err) {
            setError(err.message)
            setLeaderboard([])
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        setPage(1)
        fetchLeaderboard(activeTab, 1, gameType)
    }, [activeTab, gameType, fetchLeaderboard])

    useEffect(() => {
        if (page > 1) {
            fetchLeaderboard(activeTab, page, gameType)
        }
    }, [page, activeTab, gameType, fetchLeaderboard])

    const handleTabChange = (tab) => {
        setActiveTab(tab)
        setPage(1)
    }

    const handlePrevPage = () => {
        if (page > 1) {
            setPage(page - 1)
        }
    }

    const handleNextPage = () => {
        if (hasMore) {
            setPage(page + 1)
        }
    }

    const getXpLabel = () => {
        if (gameType) return 'XP'
        if (activeTab === 'weekly') return 'Weekly XP'
        return 'XP'
    }

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">Leaderboards</h1>
            </div>

            <div className="tabs mb-md" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['global', 'weekly', 'friends'].map(tab => (
                    <button
                        key={tab}
                        className={\`btn \${activeTab === tab ? 'btn-primary' : 'btn-secondary'}\`}
                        onClick={() => handleTabChange(tab)}
                        style={{ textTransform: 'capitalize' }}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <div className="mb-md" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <label htmlFor="gameTypeFilter" style={{ color: 'var(--text-secondary)' }}>
                    Game Type:
                </label>
                <select
                    id="gameTypeFilter"
                    value={gameType}
                    onChange={(e) => setGameType(e.target.value)}
                    style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        backgroundColor: 'var(--surface)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border)',
                        fontSize: '14px',
                        minWidth: '150px'
                    }}
                >
                    {GAME_TYPES.map(type => (
                        <option key={type.id} value={type.id}>
                            {type.name}
                        </option>
                    ))}
                </select>
            </div>

            {loading ? (
                <div className="card">
                    <p className="text-secondary">Loading leaderboard...</p>
                </div>
            ) : error ? (
                <div className="card">
                    <p className="text-error">{error}</p>
                    <button
                        className="btn btn-primary mt-sm"
                        onClick={() => fetchLeaderboard(activeTab, page)}
                    >
                        Retry
                    </button>
                </div>
            ) : leaderboard.length === 0 ? (
                <div className="card">
                    <p className="text-secondary">
                        {activeTab === 'friends'
                            ? 'Add friends to see them on the leaderboard!'
                            : 'No players on the leaderboard yet.'}
                    </p>
                </div>
            ) : (
                <>
                    {userRank && (
                        <div className={styles.userRankBanner}>
                            Your Rank: <strong>#{userRank}</strong>
                        </div>
                    )}

                    <div className={styles.leaderboardList}>
                        {leaderboard.map((entry) => (
                            <div
                                key={entry.id}
                                className={\`\${styles.leaderboardEntry} \${
                                    user?.id === entry.id ? styles.currentUser : ''
                                }\`}
                            >
                                <div className={styles.rank}>
                                    {entry.rank <= 3 ? (
                                        <span className={styles[\`rank\${entry.rank}\`]}>
                                            {entry.rank === 1 ? '1st' : entry.rank === 2 ? '2nd' : '3rd'}
                                        </span>
                                    ) : (
                                        <span>#{entry.rank}</span>
                                    )}
                                </div>
                                <div className={styles.avatar}>
                                    {entry.avatar_url ? (
                                        <img src={entry.avatar_url} alt={entry.username} />
                                    ) : (
                                        <div className={styles.avatarPlaceholder}>
                                            {entry.username?.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <div className={styles.userInfo}>
                                    <span className={styles.username}>{entry.username}</span>
                                    <span className={styles.level}>
                                        Level {entry.overall_level || entry.level || 1}
                                    </span>
                                </div>
                                <div className={styles.xp}>
                                    <span className={styles.xpValue}>
                                        {entry.overall_xp ?? entry.weekly_xp ?? entry.xp ?? 0}
                                    </span>
                                    <span className={styles.xpLabel}>{getXpLabel()}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {(page > 1 || hasMore) && activeTab !== 'friends' && (
                        <div className={styles.pagination}>
                            <button
                                className="btn btn-secondary"
                                onClick={handlePrevPage}
                                disabled={page === 1}
                            >
                                Previous
                            </button>
                            <span className={styles.pageInfo}>Page {page}</span>
                            <button
                                className="btn btn-secondary"
                                onClick={handleNextPage}
                                disabled={!hasMore}
                            >
                                Next
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

export default Leaderboards
`;

fs.writeFileSync('C:/Users/Somto/Documents/geo-elevate/frontend/src/pages/Leaderboards.jsx', frontendContent);
console.log('Updated frontend Leaderboards.jsx');

// Update backend leaderboards.js
const backendContent = `import { Router } from 'express';
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

        const leaderboard = db.prepare(\`
            SELECT id, username, avatar_url, overall_xp, overall_level, current_streak,
                   ROW_NUMBER() OVER (ORDER BY overall_xp DESC) as rank
            FROM users
            WHERE is_guest = 0
            ORDER BY overall_xp DESC
            LIMIT ? OFFSET ?
        \`).all(parseInt(limit), parseInt(offset));

        let userRank = null;
        if (req.userId) {
            userRank = db.prepare(\`
                SELECT rank FROM (
                    SELECT id, ROW_NUMBER() OVER (ORDER BY overall_xp DESC) as rank
                    FROM users WHERE is_guest = 0
                )
                WHERE id = ?
            \`).get(req.userId);
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

        const leaderboard = db.prepare(\`
            SELECT u.id, u.username, u.avatar_url, ucs.xp, ucs.level, ucs.high_score,
                   ROW_NUMBER() OVER (ORDER BY ucs.xp DESC) as rank
            FROM user_category_stats ucs
            JOIN users u ON u.id = ucs.user_id
            WHERE ucs.category = ? AND u.is_guest = 0
            ORDER BY ucs.xp DESC
            LIMIT ? OFFSET ?
        \`).all(gameType, parseInt(limit), parseInt(offset));

        let userRank = null;
        if (req.userId) {
            userRank = db.prepare(\`
                SELECT rank FROM (
                    SELECT user_id, ROW_NUMBER() OVER (ORDER BY xp DESC) as rank
                    FROM user_category_stats
                    WHERE category = ?
                )
                WHERE user_id = ?
            \`).get(gameType, req.userId);
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
            leaderboard = db.prepare(\`
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
            \`).all(startOfWeek, gameType, parseInt(limit), parseInt(offset));

            if (req.userId) {
                const userStats = db.prepare(\`
                    SELECT COALESCE(SUM(xp_earned), 0) as weekly_xp
                    FROM game_sessions
                    WHERE user_id = ? AND completed_at >= ? AND game_type = ?
                \`).get(req.userId, startOfWeek, gameType);

                const betterPlayers = db.prepare(\`
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
                \`).get(startOfWeek, gameType, userStats?.weekly_xp || 0);

                userRank = betterPlayers.count + 1;
            }
        } else {
            leaderboard = db.prepare(\`
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
            \`).all(startOfWeek, parseInt(limit), parseInt(offset));

            if (req.userId) {
                const userStats = db.prepare(\`
                    SELECT COALESCE(SUM(xp_earned), 0) as weekly_xp
                    FROM game_sessions
                    WHERE user_id = ? AND completed_at >= ?
                \`).get(req.userId, startOfWeek);

                const betterPlayers = db.prepare(\`
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
                \`).get(startOfWeek, userStats?.weekly_xp || 0);

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

        const friendIds = db.prepare(\`
            SELECT CASE
                WHEN user_id = ? THEN friend_id
                ELSE user_id
            END as friend_id
            FROM friendships
            WHERE (user_id = ? OR friend_id = ?) AND status = 'accepted'
        \`).all(req.userId, req.userId, req.userId).map(f => f.friend_id);

        const userIds = [req.userId, ...friendIds];

        if (hasGameTypeFilter) {
            const placeholders = userIds.map(() => '?').join(',');
            const leaderboard = db.prepare(\`
                SELECT u.id, u.username, u.avatar_url,
                       COALESCE(ucs.xp, 0) as xp,
                       COALESCE(ucs.level, 1) as level,
                       ROW_NUMBER() OVER (ORDER BY COALESCE(ucs.xp, 0) DESC) as rank
                FROM users u
                LEFT JOIN user_category_stats ucs ON ucs.user_id = u.id AND ucs.category = ?
                WHERE u.id IN (\${placeholders})
                ORDER BY xp DESC
            \`).all(gameType, ...userIds);

            const userRank = leaderboard.find(u => u.id === req.userId)?.rank;
            return res.json({ leaderboard, userRank, gameType });
        }

        if (userIds.length === 1) {
            const user = db.prepare(\`
                SELECT id, username, avatar_url, overall_xp, overall_level
                FROM users WHERE id = ?
            \`).get(req.userId);

            return res.json({
                leaderboard: [{ ...user, rank: 1 }],
                userRank: 1
            });
        }

        const placeholders = userIds.map(() => '?').join(',');
        const leaderboard = db.prepare(\`
            SELECT id, username, avatar_url, overall_xp, overall_level,
                   ROW_NUMBER() OVER (ORDER BY overall_xp DESC) as rank
            FROM users
            WHERE id IN (\${placeholders})
            ORDER BY overall_xp DESC
        \`).all(...userIds);

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
`;

fs.writeFileSync('C:/Users/Somto/Documents/geo-elevate/backend/src/routes/leaderboards.js', backendContent);
console.log('Updated backend leaderboards.js');

console.log('All leaderboard files updated successfully!');
