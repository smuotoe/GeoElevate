import { useParams } from 'react-router-dom'
import Breadcrumb from '../components/Breadcrumb'

/**
 * Format game type string with capitalized first letter.
 *
 * @param {string} gameType - The game type to format
 * @returns {string} Formatted game type
 */
function formatGameType(gameType) {
    return gameType.charAt(0).toUpperCase() + gameType.slice(1)
}

/**
 * Game play page component.
 *
 * @returns {React.ReactElement} Game play interface
 */
function GamePlay() {
    const { gameType } = useParams()
    const formattedGameType = formatGameType(gameType)

    const breadcrumbItems = [
        { label: 'Games', path: '/games' },
        { label: formattedGameType, path: `/games/${gameType}` },
        { label: 'Play', path: null }
    ]

    return (
        <div className="page">
            <div className="page-header">
                <Breadcrumb items={breadcrumbItems} />
                <h1 className="page-title">
                    {formattedGameType}
                </h1>
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
