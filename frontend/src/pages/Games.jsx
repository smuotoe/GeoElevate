import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Flag, Landmark, Globe, Languages, Lightbulb, Swords, X } from 'lucide-react'

const GAME_ICONS = {
    flags: Flag,
    capitals: Landmark,
    maps: Globe,
    languages: Languages,
    trivia: Lightbulb
}

const GAME_TYPES = [
    { id: 'flags', name: 'Flags', description: 'Identify countries by their flags' },
    { id: 'capitals', name: 'Capitals', description: 'Match countries with capitals' },
    { id: 'maps', name: 'Maps', description: 'Find countries on the map' },
    { id: 'languages', name: 'Languages', description: 'Learn which languages are spoken where' },
    { id: 'trivia', name: 'Trivia', description: 'Geography facts and knowledge' },
]

const FILTER_TABS = ['all', 'flags', 'capitals', 'maps', 'languages', 'trivia']

/**
 * Games list page component.
 * Supports deep linking via /games/:gameType route parameter.
 *
 * @returns {React.ReactElement} Games page
 */
function Games() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const { gameType } = useParams()
    const [showLoginPrompt, setShowLoginPrompt] = useState(false)
    const [activeFilter, setActiveFilter] = useState('all')
    const cardRef = useRef(null)

    // Find the selected game if gameType is provided
    const selectedGame = gameType
        ? GAME_TYPES.find(game => game.id === gameType)
        : null

    // Filter games based on active filter tab or URL param
    const getFilteredGames = () => {
        if (selectedGame) return [selectedGame]
        if (activeFilter === 'all') return GAME_TYPES
        return GAME_TYPES.filter(game => game.id === activeFilter)
    }

    const gamesToShow = getFilteredGames()

    // Determine page title
    const pageTitle = selectedGame ? `${selectedGame.name} Game` : 'Games'

    // Scroll to and highlight the card when a specific game type is selected
    useEffect(() => {
        if (selectedGame && cardRef.current) {
            cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
    }, [selectedGame])

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
                <h1 className="page-title">{pageTitle}</h1>
                {selectedGame && (
                    <Link to="/games" className="btn btn-secondary" style={{ marginLeft: 'auto' }}>
                        View All Games
                    </Link>
                )}
            </div>

            {/* Category Filter Tabs - only show when not viewing specific game */}
            {!selectedGame && (
                <div className="tabs mb-md" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {FILTER_TABS.map(tab => (
                        <button
                            key={tab}
                            className={`btn ${activeFilter === tab ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setActiveFilter(tab)}
                            style={{ textTransform: 'capitalize' }}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            )}

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
                                <X size={20} />
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
                    {gamesToShow.map(game => (
                        <Link
                            key={game.id}
                            ref={selectedGame && game.id === selectedGame.id ? cardRef : null}
                            to={`/play/${game.id}`}
                            className={`card game-card mb-md${selectedGame ? ' highlighted' : ''}`}
                            style={{
                                display: 'block',
                                textDecoration: 'none',
                                ...(selectedGame && {
                                    border: '2px solid var(--primary)',
                                    boxShadow: '0 0 12px var(--primary-light, rgba(99, 102, 241, 0.3))'
                                })
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                {(() => {
                                    const IconComponent = GAME_ICONS[game.id]
                                    return <IconComponent size={32} className="game-icon" />
                                })()}
                                <div>
                                    <h3 style={{ color: 'var(--text-primary)' }}>{game.name}</h3>
                                    <p className="text-secondary">{game.description}</p>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </section>

            {/* Multiplayer Section - hidden when viewing specific game type or filtered */}
            {!selectedGame && activeFilter === 'all' && (
                <section className="mb-lg">
                    <h2 className="section-title mb-md">Multiplayer</h2>
                    <button
                        onClick={handleMultiplayerClick}
                        className="card game-card multiplayer-card"
                        style={{ display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer' }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <Swords size={32} className="game-icon" />
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
            )}
        </div>
    )
}

export default Games
