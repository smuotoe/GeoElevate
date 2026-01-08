import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Modal from '../components/Modal'
import { api } from '../utils/api'

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
    const [removingFriendId, setRemovingFriendId] = useState(null)
    const [processingRequestId, setProcessingRequestId] = useState(null)
    const isRemovingRef = useRef(false)

    const fetchFriends = useCallback(async () => {
        try {
            const data = await api.get('/friends')
            setFriends(data.friends || [])
        } catch (err) {
            setError(err.message)
        }
    }, [])

    const fetchRequests = useCallback(async () => {
        try {
            const data = await api.get('/friends/requests')
            setRequests(data.requests || [])
        } catch (err) {
            setError(err.message)
        }
    }, [])

    useEffect(() => {
        let ignore = false

        const loadData = async () => {
            setLoading(true)
            await Promise.all([fetchFriends(), fetchRequests()])
            if (!ignore) {
                setLoading(false)
            }
        }
        loadData()

        return () => {
            ignore = true
        }
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
            await api.post('/friends/request', { username: username.trim() })
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
        if (processingRequestId) return
        setProcessingRequestId(requestId)
        try {
            await api.post(`/friends/request/${requestId}/accept`)
            await Promise.all([fetchFriends(), fetchRequests()])
        } catch (err) {
            setError(err.message)
            // Refresh list to remove stale data when record was deleted by another user
            await fetchRequests()
        } finally {
            setProcessingRequestId(null)
        }
    }

    const handleDeclineRequest = async (requestId) => {
        if (processingRequestId) return
        setProcessingRequestId(requestId)
        try {
            await api.post(`/friends/request/${requestId}/decline`)
            await fetchRequests()
        } catch (err) {
            setError(err.message)
            // Refresh list to remove stale data when record was deleted by another user
            await fetchRequests()
        } finally {
            setProcessingRequestId(null)
        }
    }

    const handleRemoveFriend = async (friendId) => {
        // Prevent rapid double-clicks using ref for immediate check
        if (isRemovingRef.current || removingFriendId) return

        if (!window.confirm('Are you sure you want to remove this friend?')) {
            return
        }

        isRemovingRef.current = true
        setRemovingFriendId(friendId)

        try {
            await api.delete(`/friends/${friendId}`)
            await fetchFriends()
        } catch (err) {
            setError(err.message)
            // Refresh list to remove stale data when record was deleted by another user
            await fetchFriends()
        } finally {
            setRemovingFriendId(null)
            isRemovingRef.current = false
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
                <div className="error-message mb-md" role="alert" aria-live="polite">
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
                                        disabled={processingRequestId === request.id}
                                    >
                                        {processingRequestId === request.id ? '...' : 'Accept'}
                                    </button>
                                    <button
                                        className="btn btn-secondary"
                                        style={{ padding: '8px 16px', minHeight: 'auto' }}
                                        onClick={() => handleDeclineRequest(request.id)}
                                        disabled={processingRequestId === request.id}
                                    >
                                        {processingRequestId === request.id ? '...' : 'Decline'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="card">
                <h3 className="section-title mb-md">
                    My Friends {friends.length > 0 && `(${friends.length})`}
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
                                <Link
                                    to={`/profile/${friend.id}`}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        textDecoration: 'none',
                                        color: 'inherit',
                                        flex: 1
                                    }}
                                >
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
                                </Link>
                                <button
                                    className="btn btn-secondary"
                                    style={{ padding: '8px 12px', minHeight: 'auto', fontSize: '0.875rem' }}
                                    onClick={() => handleRemoveFriend(friend.id)}
                                    disabled={removingFriendId === friend.id}
                                >
                                    {removingFriendId === friend.id ? 'Removing...' : 'Remove'}
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
                        <div className="form-error mb-md" role="alert" aria-live="assertive">{addError}</div>
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
