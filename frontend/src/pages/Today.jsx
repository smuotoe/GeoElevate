import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Today/Home screen component.
 *
 * @returns {React.ReactElement} Today page
 */
function Today() {
    const { user } = useAuth()

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
                        <div className="card">
                            <p className="text-secondary">Your daily challenges will appear here.</p>
                        </div>
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
