import { Link } from 'react-router-dom'

const GAME_TYPES = [
    { id: 'flags', name: 'Flags', icon: '&#127988;', description: 'Identify countries by their flags' },
    { id: 'capitals', name: 'Capitals', icon: '&#127963;', description: 'Match countries with capitals' },
    { id: 'maps', name: 'Maps', icon: '&#127758;', description: 'Find countries on the map' },
    { id: 'languages', name: 'Languages', icon: '&#128172;', description: 'Learn which languages are spoken where' },
    { id: 'trivia', name: 'Trivia', icon: '&#128161;', description: 'Geography facts and knowledge' },
]

/**
 * Games list page component.
 *
 * @returns {React.ReactElement} Games page
 */
function Games() {
    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">Games</h1>
            </div>

            <div className="game-categories">
                {GAME_TYPES.map(game => (
                    <Link
                        key={game.id}
                        to={`/play/${game.id}`}
                        className="card game-card mb-md"
                        style={{ display: 'block', textDecoration: 'none' }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <span
                                className="game-icon"
                                style={{ fontSize: '32px' }}
                                dangerouslySetInnerHTML={{ __html: game.icon }}
                            />
                            <div>
                                <h3 style={{ color: 'var(--text-primary)' }}>{game.name}</h3>
                                <p className="text-secondary">{game.description}</p>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    )
}

export default Games
