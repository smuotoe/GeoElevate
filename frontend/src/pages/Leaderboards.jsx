import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import styles from './Leaderboards.module.css'

const PAGE_SIZE = 10

/**
 * Leaderboards page component.
 *
 * @returns {React.ReactElement} Leaderboards page
 */
function Leaderboards() {
    const [activeTab, setActiveTab] = useState('global')
    const [leaderboard, setLeaderboard] = useState([])
    const [userRank, setUserRank] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [page, setPage] = useState(1)
    const [hasMore, setHasMore] = useState(false)
    const { user } = useAuth()

    const fetchLeaderboard = useCallback(async (tab, pageNum) => {
        setLoading(true)
        setError(null)
        try {
            const offset = (pageNum - 1) * PAGE_SIZE
            const endpoint = tab === 'friends'
                ? '/leaderboards/friends'
                : `/leaderboards/${tab}?limit=${PAGE_SIZE}&offset=${offset}`

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
        fetchLeaderboard(activeTab, 1)
    }, [activeTab, fetchLeaderboard])

    useEffect(() => {
        if (page > 1) {
            fetchLeaderboard(activeTab, page)
        }
    }, [page, activeTab, fetchLeaderboard])

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
        if (activeTab === 'weekly') return 'Weekly XP'
        return 'XP'
    }

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">Leaderboards</h1>
            </div>

            <div className="tabs mb-md" style={{ display: 'flex', gap: '8px' }}>
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
