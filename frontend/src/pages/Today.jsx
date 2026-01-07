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
                <div className="streak-badge">
                    <span role="img" aria-label="streak">&#128293;</span>
                    {user?.current_streak || 0}
                </div>
            </div>

            <section className="card mb-md">
                <h2>Welcome, {user?.username}!</h2>
                <p className="text-secondary mt-sm">
                    Level {user?.overall_level || 1} | {user?.overall_xp || 0} XP
                </p>
            </section>

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
        </div>
    )
}

export default Today
