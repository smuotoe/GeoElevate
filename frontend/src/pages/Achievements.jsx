import { useNavigate } from 'react-router-dom'

/**
 * Achievements page component.
 *
 * @returns {React.ReactElement} Achievements page
 */
function Achievements() {
    const navigate = useNavigate()

    return (
        <div className="page">
            <div className="page-header">
                <button className="btn btn-secondary" onClick={() => navigate(-1)}>
                    Back
                </button>
                <h1 className="page-title">Achievements</h1>
                <div style={{ width: 60 }} />
            </div>

            <div className="card">
                <p className="text-secondary">
                    Your achievements will be displayed here. Unlock them by playing games
                    and completing challenges!
                </p>

                <ul style={{ marginTop: '16px', paddingLeft: '20px', color: 'var(--text-secondary)' }}>
                    <li>Flag Master - Identify 100 flags correctly</li>
                    <li>World Traveler - Play games from all continents</li>
                    <li>Speed Demon - Answer 10 questions in under 3 seconds each</li>
                    <li>Perfect Game - Score 100% on any game</li>
                    <li>Social Butterfly - Add 10 friends</li>
                    <li>Winning Streak - Win 5 multiplayer matches in a row</li>
                    <li>Dedicated Learner - Maintain a 30-day streak</li>
                </ul>
            </div>
        </div>
    )
}

export default Achievements
