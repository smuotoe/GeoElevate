import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../utils/api'

/**
 * Multiplayer page component.
 * Shows multiplayer lobby and friend challenges.
 *
 * @returns {React.ReactElement} Multiplayer page
 */
function Multiplayer() {
    const { matchId } = useParams()
    const navigate = useNavigate()
    const { user } = useAuth()
    const [invites, setInvites] = useState([])
    const [friends, setFriends] = useState([])
    const [match, setMatch] = useState(null)
    const [matchHistory, setMatchHistory] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [challengingFriendId, setChallengingFriendId] = useState(null)
    const [waitingTime, setWaitingTime] = useState(0)

    const fetchMatch = useCallback(async () => {
        if (!matchId) return null
        try {
            const response = await api.get(`/multiplayer/matches/${matchId}`)
            return response.match
        } catch (err) {
            setError(err.message)
            return null
        }
    }, [matchId])

    useEffect(() => {
        if (user) {
            loadData()
        }
    }, [user, matchId])

    useEffect(() => {
        if (!matchId || !match) return
        if (match.status !== 'pending') return

        const interval = setInterval(async () => {
            setWaitingTime(prev => prev + 1)
            const updatedMatch = await fetchMatch()
            if (updatedMatch && updatedMatch.status === 'active') {
                setMatch(updatedMatch)
            }
        }, 1000)

        return () => clearInterval(interval)
    }, [matchId, match, fetchMatch])

    /**
     * Load all multiplayer data.
     */
    async function loadData() {
        setLoading(true)
        try {
            const [invitesRes, friendsRes, historyRes] = await Promise.all([
                api.get('/multiplayer/invites'),
                api.get('/friends'),
                api.get('/multiplayer/history')
            ])
            setInvites(invitesRes.invites || [])
            setFriends(friendsRes.friends || [])
            setMatchHistory(historyRes.matches || [])

            if (matchId) {
                const matchData = await fetchMatch()
                setMatch(matchData)
            }
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    /**
     * Send a challenge to a friend.
     *
     * @param {number} friendId - Friend's user ID
     * @param {string} gameType - Type of game to play
     */
    async function handleChallenge(friendId, gameType = 'flags') {
        setChallengingFriendId(friendId)
        setError(null)
        try {
            const response = await api.post('/multiplayer/challenge', {
                opponentId: friendId,
                gameType
            })
            navigate(`/multiplayer/lobby/${response.matchId}`)
        } catch (err) {
            setError(err.message)
        } finally {
            setChallengingFriendId(null)
        }
    }

    /**
     * Handle accepting an invite.
     *
     * @param {number} inviteId - The invite ID
     */
    async function handleAccept(inviteId) {
        try {
            const response = await api.post(`/multiplayer/invites/${inviteId}/accept`)
            navigate(`/multiplayer/lobby/${response.matchId}`)
        } catch (err) {
            setError(err.message)
        }
    }

    /**
     * Handle declining an invite.
     *
     * @param {number} inviteId - The invite ID
     */
    async function handleDecline(inviteId) {
        try {
            await api.post(`/multiplayer/invites/${inviteId}/decline`)
            loadData()
        } catch (err) {
            setError(err.message)
        }
    }

    /**
     * Format waiting time as MM:SS.
     *
     * @param {number} seconds - Time in seconds
     * @returns {string} Formatted time string
     */
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    if (loading) {
        return (
            <div className="page">
                <div className="loading-screen">
                    <div className="loading-spinner" />
                    <p>Loading multiplayer...</p>
                </div>
            </div>
        )
    }

    if (matchId && match) {
        const isChallenger = match.challenger_id === user?.id
        const opponentName = isChallenger ? match.opponent_name : match.challenger_name

        return (
            <div className="page">
                <div className="page-header">
                    <button
                        className="btn btn-secondary"
                        onClick={() => navigate('/multiplayer')}
                    >
                        Back
                    </button>
                    <h1 className="page-title">Match Lobby</h1>
                    <div style={{ width: 60 }} />
                </div>

                <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
                    {match.status === 'pending' && (
                        <>
                            <div className="loading-spinner" style={{ margin: '0 auto 20px' }} />
                            <h2 style={{ marginBottom: '16px' }}>Waiting for opponent...</h2>
                            <p className="text-secondary" style={{ marginBottom: '24px' }}>
                                Waiting for <strong>{opponentName}</strong> to accept your challenge
                            </p>
                            <div style={{
                                fontSize: '2rem',
                                fontWeight: 'bold',
                                color: 'var(--primary)',
                                marginBottom: '16px'
                            }}>
                                {formatTime(waitingTime)}
                            </div>
                            <p className="text-secondary" style={{ fontSize: '0.875rem' }}>
                                Game type: <strong>{match.game_type}</strong>
                            </p>
                            <div style={{
                                marginTop: '24px',
                                padding: '16px',
                                background: 'var(--background)',
                                borderRadius: 'var(--radius-md)'
                            }}>
                                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                    Your opponent will receive a notification. The match will start automatically when they accept.
                                </p>
                            </div>
                        </>
                    )}

                    {match.status === 'active' && (
                        <>
                            <h2 style={{ marginBottom: '16px', color: 'var(--success)' }}>
                                Match Started!
                            </h2>
                            <p className="text-secondary" style={{ marginBottom: '24px' }}>
                                <strong>{opponentName}</strong> accepted your challenge!
                            </p>
                            <button
                                className="btn btn-primary"
                                onClick={() => navigate(`/play/${match.game_type}?match=${matchId}`)}
                            >
                                Start Playing
                            </button>
                        </>
                    )}

                    {match.status === 'cancelled' && (
                        <>
                            <h2 style={{ marginBottom: '16px', color: 'var(--error)' }}>
                                Match Cancelled
                            </h2>
                            <p className="text-secondary" style={{ marginBottom: '24px' }}>
                                The challenge was declined or cancelled.
                            </p>
                            <button
                                className="btn btn-primary"
                                onClick={() => navigate('/multiplayer')}
                            >
                                Back to Multiplayer
                            </button>
                        </>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">Multiplayer</h1>
            </div>

            {error && (
                <div className="error-message mb-md" role="alert" aria-live="polite">
                    {error}
                </div>
            )}

            <div className="multiplayer-content">
                <section className="mb-lg">
                    <h2 className="mb-md">Challenge a Friend</h2>
                    {friends.length === 0 ? (
                        <>
                            <p className="text-secondary mb-md">
                                Add friends to challenge them to multiplayer matches!
                            </p>
                            <a href="/friends" className="btn btn-primary">
                                Add Friends
                            </a>
                        </>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {friends.map(friend => (
                                <div
                                    key={friend.id}
                                    className="card"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '16px'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div
                                            style={{
                                                width: 40,
                                                height: 40,
                                                borderRadius: '50%',
                                                background: 'var(--primary)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: 'var(--background)',
                                                fontWeight: 600
                                            }}
                                        >
                                            {friend.username?.charAt(0).toUpperCase() || '?'}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 500 }}>{friend.username}</div>
                                            <div className="text-secondary" style={{ fontSize: '0.875rem' }}>
                                                Level {friend.overall_level || 1}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        className="btn btn-primary"
                                        style={{ padding: '8px 16px', minHeight: 'auto' }}
                                        onClick={() => handleChallenge(friend.id)}
                                        disabled={challengingFriendId === friend.id}
                                    >
                                        {challengingFriendId === friend.id ? 'Sending...' : 'Challenge'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <section className="mb-lg">
                    <h2 className="mb-md">Pending Invites</h2>
                    {invites.length === 0 ? (
                        <div className="empty-state">
                            <p className="text-secondary">No pending invites</p>
                        </div>
                    ) : (
                        <div className="invites-list">
                            {invites.map(invite => (
                                <div key={invite.id} className="card mb-sm" style={{ padding: '16px' }}>
                                    <div style={{ marginBottom: '12px' }}>
                                        <strong>{invite.challenger_name}</strong>
                                        <span className="text-secondary">
                                            {' '}wants to play {invite.game_type}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            className="btn btn-primary btn-sm"
                                            onClick={() => handleAccept(invite.id)}
                                        >
                                            Accept
                                        </button>
                                        <button
                                            className="btn btn-secondary btn-sm"
                                            onClick={() => handleDecline(invite.id)}
                                        >
                                            Decline
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <section className="mb-lg">
                    <h2 className="mb-md">Match History</h2>
                    {matchHistory.length === 0 ? (
                        <div className="empty-state">
                            <p className="text-secondary">No completed matches yet</p>
                        </div>
                    ) : (
                        <div className="match-history-list">
                            {matchHistory.map(m => {
                                const isChallenger = m.challenger_id === user?.id
                                const opponentName = isChallenger ? m.opponent_name : m.challenger_name
                                const userScore = isChallenger ? m.challenger_score : m.opponent_score
                                const opponentScore = isChallenger ? m.opponent_score : m.challenger_score
                                const isWinner = m.winner_id === user?.id
                                const isTie = m.winner_id === null

                                return (
                                    <div
                                        key={m.id}
                                        className="card mb-sm"
                                        style={{ padding: '16px' }}
                                        onClick={() => navigate(`/multiplayer/match/${m.id}`)}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                navigate(`/multiplayer/match/${m.id}`)
                                            }
                                        }}
                                    >
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            marginBottom: '8px'
                                        }}>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px'
                                            }}>
                                                <span style={{
                                                    fontSize: '0.75rem',
                                                    padding: '4px 8px',
                                                    borderRadius: '4px',
                                                    background: 'var(--surface-light)',
                                                    textTransform: 'capitalize'
                                                }}>
                                                    {m.game_type}
                                                </span>
                                                <span className="text-secondary" style={{ fontSize: '0.875rem' }}>
                                                    vs {opponentName}
                                                </span>
                                            </div>
                                            <span style={{
                                                fontSize: '0.75rem',
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                fontWeight: '600',
                                                background: isTie
                                                    ? 'var(--surface-light)'
                                                    : isWinner
                                                        ? 'var(--success)'
                                                        : 'var(--error)',
                                                color: isTie ? 'var(--text-secondary)' : 'white'
                                            }}>
                                                {isTie ? 'Tie' : isWinner ? 'Won' : 'Lost'}
                                            </span>
                                        </div>
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}>
                                            <div style={{ fontSize: '1.25rem', fontWeight: '600' }}>
                                                {userScore} - {opponentScore}
                                            </div>
                                            <span className="text-secondary" style={{ fontSize: '0.75rem' }}>
                                                {m.completed_at
                                                    ? new Date(m.completed_at).toLocaleDateString()
                                                    : 'Unknown date'}
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </section>
            </div>
        </div>
    )
}

export default Multiplayer
