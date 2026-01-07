import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'

/**
 * Today/Home screen component.
 *
 * @returns {React.ReactElement} Today page
 */
function Today() {
    const { user } = useAuth()
    const [challenges, setChallenges] = useState([])
    const [loadingChallenges, setLoadingChallenges] = useState(false)

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

                    <section className="mb-md">
                        <h3 className="mb-sm">Recommended for You</h3>
                        <div className="card">
                            <p className="text-secondary">Game recommendations based on your progress.</p>
                        </div>
                    </section>

                    <section className="mb-md">
                        <h3 className="mb-sm">Recent Games</h3>
                        <div className="card">
                            <p className="text-secondary">Your recent games will appear here.</p>
                        </div>
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
