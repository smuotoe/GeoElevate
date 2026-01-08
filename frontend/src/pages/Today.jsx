import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'

/**
 * Today/Home screen component.
 *
 * @returns {React.ReactElement} Today page
 */
function Today() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [challenges, setChallenges] = useState([])
    const [loadingChallenges, setLoadingChallenges] = useState(false)
    const [recentGames, setRecentGames] = useState([])
    const [loadingGames, setLoadingGames] = useState(false)
    const [recommendations, setRecommendations] = useState([])
    const [loadingRecommendations, setLoadingRecommendations] = useState(false)
    const [invites, setInvites] = useState([])

    useEffect(() => {
        let ignore = false

        async function fetchChallenges() {
            setLoadingChallenges(true)
            try {
                const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
                const data = await api.get(`/daily/challenges?timezone=${encodeURIComponent(timezone)}`)
                if (!ignore) {
                    setChallenges(data.challenges || [])
                }
            } catch (err) {
                if (!ignore) {
                    console.error('Failed to fetch challenges:', err)
                    setChallenges([])
                }
            } finally {
                if (!ignore) {
                    setLoadingChallenges(false)
                }
            }
        }

        if (user) {
            fetchChallenges()
        }

        return () => {
            ignore = true
        }
    }, [user])

    useEffect(() => {
        let ignore = false

        async function fetchRecentGames() {
            setLoadingGames(true)
            try {
                const data = await api.get('/games/sessions?limit=5')
                if (!ignore) {
                    setRecentGames(data.sessions || [])
                }
            } catch (err) {
                if (!ignore) {
                    console.error('Failed to fetch recent games:', err)
                    setRecentGames([])
                }
            } finally {
                if (!ignore) {
                    setLoadingGames(false)
                }
            }
        }

        if (user) {
            fetchRecentGames()
        }

        return () => {
            ignore = true
        }
    }, [user])

    useEffect(() => {
        let ignore = false

        async function fetchRecommendations() {
            setLoadingRecommendations(true)
            try {
                const data = await api.get('/games/recommendations')
                if (!ignore) {
                    setRecommendations(data.recommendations || [])
                }
            } catch (err) {
                if (!ignore) {
                    console.error('Failed to fetch recommendations:', err)
                    setRecommendations([])
                }
            } finally {
                if (!ignore) {
                    setLoadingRecommendations(false)
                }
            }
        }

        if (user) {
            fetchRecommendations()
        }

        return () => {
            ignore = true
        }
    }, [user])

    useEffect(() => {
        let ignore = false

        async function fetchInvites() {
            try {
                const data = await api.get('/multiplayer/invites')
                if (!ignore) {
                    setInvites(data.invites || [])
                }
            } catch (err) {
                if (!ignore) {
                    console.error('Failed to fetch invites:', err)
                    setInvites([])
                }
            }
        }

        if (user) {
            fetchInvites()
        }

        return () => {
            ignore = true
        }
    }, [user])

    /**
     * Handle accepting a multiplayer invite.
     *
     * @param {number} inviteId - Invite ID
     * @param {number} matchId - Match ID to navigate to
     */
    async function handleAccept(inviteId, matchId) {
        try {
            await api.post(`/multiplayer/invites/${inviteId}/accept`)
            navigate(`/multiplayer/lobby/${matchId}`)
        } catch (err) {
            console.error('Failed to accept invite:', err)
        }
    }

    /**
     * Handle declining a multiplayer invite.
     *
     * @param {number} inviteId - Invite ID
     */
    async function handleDecline(inviteId) {
        try {
            await api.post(`/multiplayer/invites/${inviteId}/decline`)
            const data = await api.get('/multiplayer/invites')
            setInvites(data.invites || [])
        } catch (err) {
            console.error('Failed to decline invite:', err)
        }
    }

    /**
     * Get icon for game type.
     *
     * @param {string} gameType - Game type
     * @returns {string} Icon emoji
     */
    function getGameIcon(gameType) {
        const icons = {
            flags: '\uD83C\uDFF4',
            capitals: '\uD83C\uDFDB',
            maps: '\uD83C\uDF0E',
            languages: '\uD83D\uDCAC',
            trivia: '\uD83D\uDCA1'
        }
        return icons[gameType] || '\uD83C\uDFAE'
    }

    /**
     * Get display name for challenge type.
     *
     * @param {string} type - Challenge type
     * @returns {string} Display name
     */
    function getChallengeDisplayName(type) {
        const names = {
            play_games: 'Play Games',
            correct_answers: 'Get Correct Answers',
            perfect_game: 'Perfect Game',
            flags_practice: 'Practice Flags',
            capitals_practice: 'Practice Capitals',
            maps_practice: 'Practice Maps',
            languages_practice: 'Practice Languages',
            trivia_practice: 'Practice Trivia'
        }
        return names[type] || type.replace(/_/g, ' ')
    }

    /**
     * Get description for challenge type.
     *
     * @param {string} type - Challenge type
     * @param {number} target - Target value
     * @returns {string} Description
     */
    function getChallengeDescription(type, target) {
        const descriptions = {
            play_games: `Complete ${target} games today`,
            correct_answers: `Answer ${target} questions correctly`,
            perfect_game: `Score 100% on ${target} game`,
            flags_practice: `Play ${target} flags games`,
            capitals_practice: `Play ${target} capitals games`,
            maps_practice: `Play ${target} maps games`,
            languages_practice: `Play ${target} language games`,
            trivia_practice: `Play ${target} trivia games`
        }
        return descriptions[type] || `Complete ${target} ${type.replace(/_/g, ' ')}`
    }

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">Today</h1>
                {user && (
                    <div className="streak-badge">
                        <span role="img" aria-label="streak">&#128293;</span>
                        {user.current_streak || 0}
                    </div>
                )}
            </div>

            {user ? (
                <section className="card mb-md">
                    <h2>Welcome, {user.username}!</h2>
                    <p className="text-secondary mt-sm">
                        Level {user.overall_level || 1} | {user.overall_xp || 0} XP
                    </p>
                </section>
            ) : (
                <section className="card mb-md guest-banner">
                    <h2>Welcome to GeoElevate!</h2>
                    <p className="text-secondary mt-sm">
                        Test your geography knowledge with fun quizzes.
                    </p>
                    <div className="mt-md" style={{ display: 'flex', gap: '8px' }}>
                        <Link to="/login" className="btn btn-primary">Log In</Link>
                        <Link to="/register" className="btn btn-secondary">Sign Up</Link>
                    </div>
                </section>
            )}

            <section className="mb-md">
                <h3 className="mb-sm">Quick Start</h3>
                <div className="quick-start-grid">
                    <Link to="/play/flags" className="card quick-start-card">
                        <span style={{ fontSize: '24px' }}>&#127988;</span>
                        <span>Flags</span>
                    </Link>
                    <Link to="/play/capitals" className="card quick-start-card">
                        <span style={{ fontSize: '24px' }}>&#127963;</span>
                        <span>Capitals</span>
                    </Link>
                    <Link to="/play/maps" className="card quick-start-card">
                        <span style={{ fontSize: '24px' }}>&#127758;</span>
                        <span>Maps</span>
                    </Link>
                    <Link to="/play/trivia" className="card quick-start-card">
                        <span style={{ fontSize: '24px' }}>&#128161;</span>
                        <span>Trivia</span>
                    </Link>
                </div>
            </section>

            {user && (
                <>
                    <section className="mb-md">
                        <h3 className="mb-sm">Daily Challenges</h3>
                        {loadingChallenges ? (
                            <div className="card">
                                <p className="text-secondary">Loading challenges...</p>
                            </div>
                        ) : challenges.length > 0 ? (
                            <div className="challenges-list">
                                {challenges.map(challenge => (
                                    <div
                                        key={challenge.id}
                                        className={`card challenge-card ${challenge.is_completed ? 'challenge-completed' : ''}`}
                                        style={{ marginBottom: '8px' }}
                                    >
                                        <div className="challenge-header">
                                            <span className="challenge-name">
                                                {getChallengeDisplayName(challenge.challenge_type)}
                                            </span>
                                            <span className="challenge-reward">
                                                +{challenge.xp_reward} XP
                                            </span>
                                        </div>
                                        <p className="challenge-description text-secondary" style={{ fontSize: '0.85rem', margin: '4px 0' }}>
                                            {getChallengeDescription(challenge.challenge_type, challenge.target_value)}
                                        </p>
                                        <div className="challenge-progress-container" style={{ marginTop: '8px' }}>
                                            <div className="progress-bar" style={{
                                                backgroundColor: 'var(--surface-light)',
                                                borderRadius: '4px',
                                                height: '8px',
                                                overflow: 'hidden'
                                            }}>
                                                <div
                                                    className="progress-fill"
                                                    style={{
                                                        width: `${Math.min(100, (challenge.current_value / challenge.target_value) * 100)}%`,
                                                        backgroundColor: challenge.is_completed ? 'var(--success)' : 'var(--primary)',
                                                        height: '100%',
                                                        transition: 'width 0.3s ease'
                                                    }}
                                                />
                                            </div>
                                            <span className="challenge-progress-text" style={{
                                                fontSize: '0.8rem',
                                                color: challenge.is_completed ? 'var(--success)' : 'var(--text-secondary)',
                                                marginTop: '4px',
                                                display: 'block'
                                            }}>
                                                {challenge.is_completed ? 'Completed!' : `${challenge.current_value}/${challenge.target_value}`}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="card">
                                <p className="text-secondary">No challenges available today.</p>
                            </div>
                        )}
                    </section>

                    {invites.length > 0 && (
                        <section className="mb-md">
                            <h3 className="mb-sm">Multiplayer Invites</h3>
                            <div className="invites-list">
                                {invites.map(invite => (
                                    <div
                                        key={invite.id}
                                        className="card"
                                        style={{ marginBottom: '8px', padding: '12px 16px' }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <span style={{ fontWeight: 600 }}>
                                                    {invite.challenger_name}
                                                </span>
                                                <span className="text-secondary" style={{ marginLeft: '8px', fontSize: '0.85rem', textTransform: 'capitalize' }}>
                                                    {invite.game_type}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button
                                                    className="btn btn-primary"
                                                    style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                                                    onClick={() => handleAccept(invite.id, invite.match_id)}
                                                >
                                                    Accept
                                                </button>
                                                <button
                                                    className="btn btn-secondary"
                                                    style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                                                    onClick={() => handleDecline(invite.id)}
                                                >
                                                    Decline
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    <section className="mb-md">
                        <h3 className="mb-sm">Recommended for You</h3>
                        {loadingRecommendations ? (
                            <div className="card">
                                <p className="text-secondary">Loading recommendations...</p>
                            </div>
                        ) : recommendations.length > 0 ? (
                            <div className="recommendations-list">
                                {recommendations.map((rec, index) => (
                                    <Link
                                        key={`${rec.gameType}-${index}`}
                                        to={`/play/${rec.gameType}`}
                                        className="card recommendation-card"
                                        style={{
                                            marginBottom: '8px',
                                            padding: '12px 16px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            textDecoration: 'none',
                                            color: 'inherit'
                                        }}
                                    >
                                        <span style={{ fontSize: '24px' }}>{getGameIcon(rec.gameType)}</span>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600 }}>{rec.name}</div>
                                            <div className="text-secondary" style={{ fontSize: '0.85rem' }}>
                                                {rec.reason}
                                            </div>
                                        </div>
                                        <span style={{ color: 'var(--primary)', fontSize: '1.2rem' }}>&#8250;</span>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="card">
                                <p className="text-secondary">Play some games to get personalized recommendations!</p>
                            </div>
                        )}
                    </section>

                    <section className="mb-md">
                        <h3 className="mb-sm">Recent Games</h3>
                        {loadingGames ? (
                            <div className="card">
                                <p className="text-secondary">Loading recent games...</p>
                            </div>
                        ) : recentGames.length > 0 ? (
                            <div className="recent-games-list">
                                {recentGames.map(game => (
                                    <div key={game.id} className="card" style={{ marginBottom: '8px', padding: '12px 16px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>
                                                    {game.game_type}
                                                </span>
                                                <span className="text-secondary" style={{ marginLeft: '8px', fontSize: '0.85rem' }}>
                                                    {game.correct_count}/{game.total_questions} correct ({game.accuracy}%)
                                                </span>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontWeight: 600, color: 'var(--primary)' }}>
                                                    {game.score} pts
                                                </div>
                                                <div className="text-secondary" style={{ fontSize: '0.75rem' }}>
                                                    {new Date(game.completed_at).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="card">
                                <p className="text-secondary">Your recent games will appear here.</p>
                            </div>
                        )}
                    </section>
                </>
            )}

            {!user && (
                <section className="mb-md">
                    <div className="card">
                        <h3 className="mb-sm">Why Sign Up?</h3>
                        <ul className="feature-list">
                            <li>Save your progress</li>
                            <li>Challenge friends in multiplayer</li>
                            <li>Earn achievements</li>
                            <li>Compete on leaderboards</li>
                            <li>Track your learning stats</li>
                        </ul>
                    </div>
                </section>
            )}
        </div>
    )
}

export default Today
