const fs = require('fs');
const path = './frontend/src/pages/Friends.jsx';

const newContent = `import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from '../components/Modal'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

/**
 * Friends page component with friend list, requests, and add friend functionality.
 *
 * @returns {React.ReactElement} Friends page
 */
function Friends() {
    const navigate = useNavigate()
    const [friends, setFriends] = useState([])
    const [requests, setRequests] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [showAddModal, setShowAddModal] = useState(false)
    const [username, setUsername] = useState('')
    const [addError, setAddError] = useState(null)
    const [addSuccess, setAddSuccess] = useState(null)
    const [submitting, setSubmitting] = useState(false)

    const fetchFriends = useCallback(async () => {
        try {
            const response = await fetch(\`\${API_URL}/api/friends\`, {
                credentials: 'include'
            })
            if (!response.ok) {
                throw new Error('Failed to fetch friends')
            }
            const data = await response.json()
            setFriends(data.friends || [])
        } catch (err) {
            setError(err.message)
        }
    }, [])

    const fetchRequests = useCallback(async () => {
        try {
            const response = await fetch(\`\${API_URL}/api/friends/requests\`, {
                credentials: 'include'
            })
            if (!response.ok) {
                throw new Error('Failed to fetch friend requests')
            }
            const data = await response.json()
            setRequests(data.requests || [])
        } catch (err) {
            setError(err.message)
        }
    }, [])

    useEffect(() => {
        const loadData = async () => {
            setLoading(true)
            await Promise.all([fetchFriends(), fetchRequests()])
            setLoading(false)
        }
        loadData()
    }, [fetchFriends, fetchRequests])

    const handleAddFriend = async (e) => {
        e.preventDefault()
        if (!username.trim()) {
            setAddError('Please enter a username')
            return
        }

        setSubmitting(true)
        setAddError(null)
        setAddSuccess(null)

        try {
            const response = await fetch(\`\${API_URL}/api/friends/request\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ username: username.trim() })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error?.message || 'Failed to send friend request')
            }

            setAddSuccess('Friend request sent!')
            setUsername('')
            setTimeout(() => {
                setShowAddModal(false)
                setAddSuccess(null)
            }, 1500)
        } catch (err) {
            setAddError(err.message)
        } finally {
            setSubmitting(false)
        }
    }

    const handleAcceptRequest = async (requestId) => {
        try {
            const response = await fetch(\`\${API_URL}/api/friends/request/\${requestId}/accept\`, {
                method: 'POST',
                credentials: 'include'
            })

            if (!response.ok) {
                throw new Error('Failed to accept request')
            }

            await Promise.all([fetchFriends(), fetchRequests()])
        } catch (err) {
            setError(err.message)
        }
    }

    const handleDeclineRequest = async (requestId) => {
        try {
            const response = await fetch(\`\${API_URL}/api/friends/request/\${requestId}/decline\`, {
                method: 'POST',
                credentials: 'include'
            })

            if (!response.ok) {
                throw new Error('Failed to decline request')
            }

            await fetchRequests()
        } catch (err) {
            setError(err.message)
        }
    }

    const handleRemoveFriend = async (friendId) => {
        if (!window.confirm('Are you sure you want to remove this friend?')) {
            return
        }

        try {
            const response = await fetch(\`\${API_URL}/api/friends/\${friendId}\`, {
                method: 'DELETE',
                credentials: 'include'
            })

            if (!response.ok) {
                throw new Error('Failed to remove friend')
            }

            await fetchFriends()
        } catch (err) {
            setError(err.message)
        }
    }

    const closeAddModal = () => {
        setShowAddModal(false)
        setUsername('')
        setAddError(null)
        setAddSuccess(null)
    }

    if (loading) {
        return (
            <div className="page">
                <div className="page-header">
                    <button className="btn btn-secondary" onClick={() => navigate(-1)}>
                        Back
                    </button>
                    <h1 className="page-title">Friends</h1>
                    <div style={{ width: 60 }} />
                </div>
                <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
                    <div className="loading-spinner" style={{ margin: '0 auto' }} />
                    <p className="text-secondary mt-md">Loading...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="page">
            <div className="page-header">
                <button className="btn btn-secondary" onClick={() => navigate(-1)}>
                    Back
                </button>
                <h1 className="page-title">Friends</h1>
                <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                    Add
                </button>
            </div>

            {error && (
                <div className="error-message mb-md">
                    {error}
                </div>
            )}

            {requests.length > 0 && (
                <div className="card mb-md">
                    <h3 className="section-title mb-md">Friend Requests ({requests.length})</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {requests.map((request) => (
                            <div
                                key={request.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '12px',
                                    background: 'var(--background)',
                                    borderRadius: 'var(--radius-md)'
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
                                        {request.username?.charAt(0).toUpperCase() || '?'}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 500 }}>{request.username}</div>
                                        <div className="text-secondary" style={{ fontSize: '0.875rem' }}>
                                            Level {request.overall_level || 1}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        className="btn btn-primary"
                                        style={{ padding: '8px 16px', minHeight: 'auto' }}
                                        onClick={() => handleAcceptRequest(request.id)}
                                    >
                                        Accept
                                    </button>
                                    <button
                                        className="btn btn-secondary"
                                        style={{ padding: '8px 16px', minHeight: 'auto' }}
                                        onClick={() => handleDeclineRequest(request.id)}
                                    >
                                        Decline
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="card">
                <h3 className="section-title mb-md">
                    My Friends {friends.length > 0 && \`(\${friends.length})\`}
                </h3>
                {friends.length === 0 ? (
                    <p className="text-secondary">
                        No friends yet. Add friends to challenge them to multiplayer matches!
                    </p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {friends.map((friend) => (
                            <div
                                key={friend.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '12px',
                                    background: 'var(--background)',
                                    borderRadius: 'var(--radius-md)'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div
                                        style={{
                                            width: 40,
                                            height: 40,
                                            borderRadius: '50%',
                                            background: 'var(--secondary)',
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
                                            Level {friend.overall_level || 1} | {friend.overall_xp || 0} XP
                                        </div>
                                    </div>
                                </div>
                                <button
                                    className="btn btn-secondary"
                                    style={{ padding: '8px 12px', minHeight: 'auto', fontSize: '0.875rem' }}
                                    onClick={() => handleRemoveFriend(friend.id)}
                                >
                                    Remove
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <Modal
                isOpen={showAddModal}
                onClose={closeAddModal}
                title="Add Friend"
            >
                <form onSubmit={handleAddFriend}>
                    <div className="form-group">
                        <label htmlFor="username">Username</label>
                        <input
                            type="text"
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter username"
                            autoFocus
                            disabled={submitting}
                        />
                    </div>

                    {addError && (
                        <div className="form-error mb-md">{addError}</div>
                    )}

                    {addSuccess && (
                        <div style={{ color: 'var(--success)', marginBottom: '16px' }}>
                            {addSuccess}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={closeAddModal}
                            style={{ flex: 1 }}
                            disabled={submitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            style={{ flex: 1 }}
                            disabled={submitting || !username.trim()}
                        >
                            {submitting ? 'Sending...' : 'Send Request'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    )
}

export default Friends
`;

fs.writeFileSync(path, newContent);
console.log('Friends.jsx updated successfully');
