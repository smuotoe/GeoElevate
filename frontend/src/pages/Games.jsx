import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

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
    const { user } = useAuth()
    const navigate = useNavigate()
    const [showLoginPrompt, setShowLoginPrompt] = useState(false)

    /**
     * Handle multiplayer button click.
     * Shows login prompt for guests.
     */
    function handleMultiplayerClick() {
        if (user) {
            navigate('/multiplayer')
        } else {
            setShowLoginPrompt(true)
        }
    }

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">Games</h1>
            </div>

            {/* Login Prompt Modal for Guests */}
            {showLoginPrompt && (
                <div className="modal-overlay" onClick={() => setShowLoginPrompt(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Login Required</h2>
                            <button
                                className="modal-close"
                                onClick={() => setShowLoginPrompt(false)}
                                aria-label="Close"
                            >
                                &#10005;
                            </button>
                        </div>
                        <div className="modal-body">
                            <p>
                                Multiplayer features require an account. Sign up or log in to
                                challenge your friends!
                            </p>
                        </div>
                        <div className="modal-footer">
                            <Link to="/login" className="btn btn-primary">
                                Log In
                            </Link>
                            <Link to="/register" className="btn btn-secondary">
                                Sign Up
                            </Link>
                        </div>
                    </div>
                </div>
            )}

            {/* Solo Games Section */}
            <section className="mb-lg">
                <h2 className="section-title mb-md">Solo Games</h2>
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
            </section>

            {/* Multiplayer Section */}
            <section className="mb-lg">
                <h2 className="section-title mb-md">Multiplayer</h2>
                <button
                    onClick={handleMultiplayerClick}
                    className="card game-card multiplayer-card"
                    style={{ display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer' }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <span className="game-icon" style={{ fontSize: '32px' }}>
                            &#9876;
                        </span>
                        <div>
                            <h3 style={{ color: 'var(--text-primary)' }}>Challenge Friends</h3>
                            <p className="text-secondary">
                                {user
                                    ? 'Compete against your friends in real-time!'
                                    : 'Login to challenge your friends'}
                            </p>
                        </div>
                        {!user && (
                            <span className="badge badge-warning" style={{ marginLeft: 'auto' }}>
                                Login Required
                            </span>
                        )}
                    </div>
                </button>
            </section>
        </div>
    )
}

export default Games
