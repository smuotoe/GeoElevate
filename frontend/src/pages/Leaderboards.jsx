import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
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

const VALID_TABS = ['global', 'weekly', 'friends']
const VALID_GAME_TYPES = GAME_TYPES.map(t => t.id)

/**
 * Leaderboards page component.
 *
 * @returns {React.ReactElement} Leaderboards page
 */
function Leaderboards() {
    const [searchParams, setSearchParams] = useSearchParams()

    // Initialize state from URL params with validation
    const tabParam = searchParams.get('tab')
    const gameParam = searchParams.get('game')
    const pageParam = searchParams.get('page')

    const initialTab = VALID_TABS.includes(tabParam) ? tabParam : 'global'
    const initialGame = VALID_GAME_TYPES.includes(gameParam) ? gameParam : ''
    const initialPage = parseInt(pageParam) > 0 ? parseInt(pageParam) : 1

    const [activeTab, setActiveTab] = useState(initialTab)
    const [gameType, setGameType] = useState(initialGame)
    const [leaderboard, setLeaderboard] = useState([])
    const [userRank, setUserRank] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [page, setPage] = useState(initialPage)
    const [hasMore, setHasMore] = useState(false)
    const { user } = useAuth()

    // Sync state changes to URL
    useEffect(() => {
        const params = new URLSearchParams()
        if (activeTab !== 'global') params.set('tab', activeTab)
        if (gameType) params.set('game', gameType)
        if (page > 1) params.set('page', page.toString())
        setSearchParams(params, { replace: true })
    }, [activeTab, gameType, page, setSearchParams])

    const fetchLeaderboard = useCallback(async (tab, pageNum, gameTypeFilter) => {
        setLoading(true)
        setError(null)
        try {
            const offset = (pageNum - 1) * PAGE_SIZE
            let endpoint

            if (tab === 'friends') {
                // Friends leaderboard with optional game type filter
                endpoint = gameTypeFilter
                    ? `/leaderboards/friends?gameType=${gameTypeFilter}`
                    : '/leaderboards/friends'
            } else if (tab === 'weekly') {
                // Weekly leaderboard with optional game type filter
                endpoint = gameTypeFilter
                    ? `/leaderboards/weekly?gameType=${gameTypeFilter}&limit=${PAGE_SIZE}&offset=${offset}`
                    : `/leaderboards/weekly?limit=${PAGE_SIZE}&offset=${offset}`
            } else if (gameTypeFilter) {
                // Game type specific leaderboard
                endpoint = `/leaderboards/game/${gameTypeFilter}?limit=${PAGE_SIZE}&offset=${offset}`
            } else {
                endpoint = `/leaderboards/${tab}?limit=${PAGE_SIZE}&offset=${offset}`
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
        fetchLeaderboard(activeTab, page, gameType)
    }, [activeTab, gameType, page, fetchLeaderboard])

    const handleTabChange = (tab) => {
        setActiveTab(tab)
        setPage(1)
    }

    const handleGameTypeChange = (newGameType) => {
        setGameType(newGameType)
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
                        className={`btn ${activeTab === tab ? 'btn-primary' : 'btn-secondary'}`}
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
                    onChange={(e) => handleGameTypeChange(e.target.value)}
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
                                className={`${styles.leaderboardEntry} ${
                                    user?.id === entry.id ? styles.currentUser : ''
                                }`}
                            >
                                <div className={styles.rank}>
                                    {entry.rank <= 3 ? (
                                        <span className={styles[`rank${entry.rank}`]}>
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
