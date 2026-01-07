import { useParams, useNavigate } from 'react-router-dom'

/**
 * Game play page component.
 *
 * @returns {React.ReactElement} Game play interface
 */
function GamePlay() {
    const { gameType } = useParams()
    const navigate = useNavigate()

    return (
        <div className="page">
            <div className="page-header">
                <button
                    className="btn btn-secondary"
                    onClick={() => navigate('/games')}
                >
                    Back
                </button>
                <h1 className="page-title" style={{ textTransform: 'capitalize' }}>
                    {gameType}
                </h1>
                <div style={{ width: 60 }} />
            </div>

            <div className="card">
                <p className="text-secondary">
                    Game interface for {gameType} will be implemented here.
                </p>
                <ul style={{ marginTop: '16px', paddingLeft: '20px', color: 'var(--text-secondary)' }}>
                    <li>Timer countdown</li>
                    <li>Question display</li>
                    <li>Answer options (multiple choice)</li>
                    <li>Score tracking</li>
                    <li>Streak indicator</li>
                </ul>
            </div>
        </div>
    )
}

export default GamePlay
