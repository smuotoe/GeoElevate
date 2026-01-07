import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../utils/api'

/**
 * Multiplayer page component.
 * Shows multiplayer lobby and friend challenges.
 *
 * @returns {React.ReactElement} Multiplayer page
 */
function Multiplayer() {
    const { user } = useAuth()
    const [invites, setInvites] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        if (user) {
            fetchInvites()
        }
    }, [user])

    /**
     * Fetch pending multiplayer invites.
     */
    async function fetchInvites() {
        try {
            setLoading(true)
            const response = await api.get('/multiplayer/invites')
            setInvites(response.invites || [])
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
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

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">Multiplayer</h1>
            </div>

            {error && (
                <div className="error-message mb-md">
                    {error}
                </div>
            )}

            <div className="multiplayer-content">
                <section className="mb-lg">
                    <h2 className="mb-md">Challenge a Friend</h2>
                    <p className="text-secondary mb-md">
                        Challenge your friends to a geography quiz battle!
                    </p>
                    <a href="/friends" className="btn btn-primary">
                        View Friends
                    </a>
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
                                <div key={invite.id} className="card mb-sm">
                                    <div className="invite-info">
                                        <strong>{invite.challenger_name}</strong>
                                        <span className="text-secondary">
                                            {' '}wants to play {invite.game_type}
                                        </span>
                                    </div>
                                    <div className="invite-actions">
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
            </div>
        </div>
    )

    /**
     * Handle accepting an invite.
     *
     * @param {number} inviteId - The invite ID
     */
    async function handleAccept(inviteId) {
        try {
            await api.post(`/multiplayer/invites/${inviteId}/accept`)
            fetchInvites()
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
            fetchInvites()
        } catch (err) {
            setError(err.message)
        }
    }
}

export default Multiplayer
