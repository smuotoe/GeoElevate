import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../utils/api'

/**
 * Match details page showing completed match results with rematch option.
 *
 * @returns {React.ReactElement} Match details page
 */
function MatchDetails() {
    const { matchId } = useParams()
    const navigate = useNavigate()
    const { user } = useAuth()
    const [match, setMatch] = useState(null)
    const [answers, setAnswers] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [isRequestingRematch, setIsRequestingRematch] = useState(false)

    useEffect(() => {
        loadMatchDetails()
    }, [matchId])

    /**
     * Load match details from API.
     */
    async function loadMatchDetails() {
        setLoading(true)
        try {
            const response = await api.get(`/multiplayer/matches/${matchId}`)
            setMatch(response.match)
            setAnswers(response.answers || [])
        } catch (err) {
            setError(err.message || 'Failed to load match details')
        } finally {
            setLoading(false)
        }
    }

    /**
     * Get opponent information from match data.
     *
     * @returns {object} Opponent data with id, name, avatar
     */
    function getOpponentInfo() {
        if (!match || !user) return { id: null, name: 'Opponent', avatar: null }
        const isChallenger = match.challenger_id === user.id
        return {
            id: isChallenger ? match.opponent_id : match.challenger_id,
            name: isChallenger ? match.opponent_name : match.challenger_name,
            avatar: isChallenger ? match.opponent_avatar : match.challenger_avatar
        }
    }

    /**
     * Get user's score from match data.
     *
     * @returns {number} User's score
     */
    function getUserScore() {
        if (!match || !user) return 0
        return match.challenger_id === user.id
            ? match.challenger_score
            : match.opponent_score
    }

    /**
     * Get opponent's score from match data.
     *
     * @returns {number} Opponent's score
     */
    function getOpponentScore() {
        if (!match || !user) return 0
        return match.challenger_id === user.id
            ? match.opponent_score
            : match.challenger_score
    }

    /**
     * Handle rematch request.
     * Sends a new challenge to the same opponent with the same game type.
     */
    async function handleRematch() {
        const opponent = getOpponentInfo()
        if (!opponent.id || !match) return

        setIsRequestingRematch(true)
        try {
            const response = await api.post('/multiplayer/challenge', {
                opponentId: opponent.id,
                gameType: match.game_type
            })
            navigate(`/multiplayer/lobby/${response.matchId}`)
        } catch (err) {
            setError(err.message || 'Failed to send rematch request')
            setIsRequestingRematch(false)
        }
    }

    if (loading) {
        return (
            <div className="page">
                <div className="loading-screen">
                    <div className="loading-spinner" />
                    <p>Loading match details...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="page">
                <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
                    <h2 style={{ color: 'var(--error)', marginBottom: '16px' }}>Error</h2>
                    <p className="text-secondary" style={{ marginBottom: '24px' }}>{error}</p>
                    <button
                        className="btn btn-primary"
                        onClick={() => navigate('/multiplayer')}
                    >
                        Back to Multiplayer
                    </button>
                </div>
            </div>
        )
    }

    if (!match) {
        return (
            <div className="page">
                <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
                    <h2 style={{ marginBottom: '16px' }}>Match Not Found</h2>
                    <p className="text-secondary" style={{ marginBottom: '24px' }}>
                        This match could not be found.
                    </p>
                    <button
                        className="btn btn-primary"
                        onClick={() => navigate('/multiplayer')}
                    >
                        Back to Multiplayer
                    </button>
                </div>
            </div>
        )
    }

    const isWinner = match.winner_id === user?.id
    const isTie = match.winner_id === null
    const resultText = isTie ? "It's a tie!" : (isWinner ? 'You Won!' : 'You Lost')
    const resultColor = isTie ? 'var(--text-primary)' : (isWinner ? 'var(--success)' : 'var(--error)')
    const opponent = getOpponentInfo()
    const userScore = getUserScore()
    const opponentScore = getOpponentScore()

    // Group answers by question index
    const questionGroups = answers.reduce((acc, answer) => {
        if (!acc[answer.question_index]) {
            acc[answer.question_index] = {
                question: answer.question,
                userAnswer: null,
                opponentAnswer: null
            }
        }
        if (answer.user_id === user?.id) {
            acc[answer.question_index].userAnswer = answer
        } else {
            acc[answer.question_index].opponentAnswer = answer
        }
        return acc
    }, {})

    return (
        <div className="page">
            <div className="page-header">
                <button
                    className="btn btn-secondary"
                    onClick={() => navigate('/multiplayer')}
                >
                    Back
                </button>
                <h1 className="page-title">Match Results</h1>
                <div style={{ width: 60 }} />
            </div>

            {/* Result card */}
            <div className="card" style={{ textAlign: 'center', padding: '40px', marginBottom: '24px' }}>
                <h1 style={{ color: resultColor, marginBottom: '24px', fontSize: '2.5rem' }}>
                    {resultText}
                </h1>

                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '48px',
                    marginBottom: '24px'
                }}>
                    <div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                            You
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
                            {userScore}
                        </div>
                    </div>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: '1.5rem',
                        color: 'var(--text-secondary)'
                    }}>
                        vs
                    </div>
                    <div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                            {opponent.name}
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
                            {opponentScore}
                        </div>
                    </div>
                </div>

                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
                    <span style={{
                        padding: '4px 8px',
                        background: 'var(--surface-light)',
                        borderRadius: '4px',
                        textTransform: 'capitalize'
                    }}>
                        {match.game_type}
                    </span>
                    <span style={{ marginLeft: '12px' }}>
                        {match.completed_at
                            ? new Date(match.completed_at).toLocaleDateString()
                            : ''}
                    </span>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button
                        className="btn btn-secondary"
                        onClick={() => navigate('/multiplayer')}
                    >
                        Back to Lobby
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleRematch}
                        disabled={isRequestingRematch}
                    >
                        {isRequestingRematch ? 'Sending...' : 'Rematch'}
                    </button>
                </div>
            </div>

            {/* Question replay section */}
            {Object.keys(questionGroups).length > 0 && (
                <div className="card" style={{ padding: '20px' }}>
                    <h2 style={{ marginBottom: '16px' }}>Question Review</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {Object.entries(questionGroups).map(([idx, data]) => (
                            <div
                                key={idx}
                                style={{
                                    padding: '16px',
                                    background: 'var(--surface)',
                                    borderRadius: 'var(--radius-md)'
                                }}
                            >
                                <div style={{
                                    fontSize: '0.75rem',
                                    color: 'var(--text-secondary)',
                                    marginBottom: '8px'
                                }}>
                                    Question {parseInt(idx, 10) + 1}
                                </div>
                                <div style={{ marginBottom: '12px', fontWeight: '500' }}>
                                    {data.question?.prompt || 'Unknown question'}
                                </div>
                                <div style={{
                                    display: 'flex',
                                    gap: '12px',
                                    fontSize: '0.875rem'
                                }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                            You
                                        </div>
                                        <div style={{
                                            color: data.userAnswer?.is_correct
                                                ? 'var(--success)'
                                                : 'var(--error)'
                                        }}>
                                            {data.userAnswer?.user_answer || 'No answer'}
                                            {data.userAnswer?.is_correct ? ' (correct)' : ' (wrong)'}
                                        </div>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                            {opponent.name}
                                        </div>
                                        <div style={{
                                            color: data.opponentAnswer?.is_correct
                                                ? 'var(--success)'
                                                : 'var(--error)'
                                        }}>
                                            {data.opponentAnswer?.user_answer || 'No answer'}
                                            {data.opponentAnswer?.is_correct ? ' (correct)' : ' (wrong)'}
                                        </div>
                                    </div>
                                </div>
                                <div style={{
                                    marginTop: '8px',
                                    fontSize: '0.75rem',
                                    color: 'var(--primary)'
                                }}>
                                    Correct: {data.question?.correctAnswer || data.userAnswer?.correct_answer || 'Unknown'}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

export default MatchDetails
