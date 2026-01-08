import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'

/**
 * Available notification types for filtering.
 */
const NOTIFICATION_TYPES = [
    { value: 'all', label: 'All Types' },
    { value: 'challenge_complete', label: 'Challenges' },
    { value: 'friend_accepted', label: 'Friend Accepted' },
    { value: 'friend_request', label: 'Friend Requests' },
    { value: 'match_invite', label: 'Match Invites' },
    { value: 'achievement', label: 'Achievements' },
    { value: 'streak_reminder', label: 'Streak Reminders' },
    { value: 'friend_activity', label: 'Friend Activity' }
]

/**
 * Format a date for display.
 *
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date string
 */
function formatDate(dateString) {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
}

/**
 * Get icon for notification type.
 *
 * @param {string} type - Notification type
 * @returns {string} Emoji icon
 */
function getNotificationIcon(type) {
    const icons = {
        challenge_complete: '&#127942;',
        friend_request: '&#128101;',
        match_invite: '&#9876;',
        achievement: '&#127941;',
        streak_reminder: '&#128293;',
        friend_activity: '&#128172;'
    }
    return icons[type] || '&#128276;'
}

/**
 * Notifications page component.
 * Displays user notifications with date sorting.
 *
 * @returns {React.ReactElement} Notifications page
 */
function Notifications() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [notifications, setNotifications] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [sortOrder, setSortOrder] = useState('desc')
    const [unreadCount, setUnreadCount] = useState(0)
    const [typeFilter, setTypeFilter] = useState('all')
    const [exporting, setExporting] = useState(false)

    useEffect(() => {
        let ignore = false

        async function fetchNotifications() {
            if (!user) return
            setLoading(true)
            setError(null)
            try {
                const params = new URLSearchParams({
                    sortOrder,
                    ...(typeFilter !== 'all' && { type: typeFilter })
                })
                const data = await api.get(`/notifications?${params}`)
                if (!ignore) {
                    setNotifications(data.notifications || [])
                    setUnreadCount(data.unreadCount || 0)
                }
            } catch (err) {
                if (!ignore) {
                    setError(err.message)
                    setNotifications([])
                }
            } finally {
                if (!ignore) {
                    setLoading(false)
                }
            }
        }

        fetchNotifications()

        return () => {
            ignore = true
        }
    }, [user, sortOrder, typeFilter])

    /**
     * Toggle sort order between ascending and descending.
     */
    const toggleSortOrder = () => {
        setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')
    }

    /**
     * Get navigation target based on notification type and data.
     *
     * @param {object} notification - Notification object
     * @returns {string|null} Navigation path or null if no navigation
     */
    const getNavigationTarget = (notification) => {
        switch (notification.type) {
            case 'friend_request':
                return '/friends'
            case 'friend_accepted':
                return '/friends'
            case 'match_invite':
                return '/multiplayer'
            case 'challenge_complete':
                return '/multiplayer'
            case 'achievement':
                return '/achievements'
            default:
                return null
        }
    }

    /**
     * Handle notification click - mark as read and navigate if applicable.
     *
     * @param {object} notification - Notification object
     */
    const handleNotificationClick = async (notification) => {
        // Mark as read first
        if (!notification.is_read) {
            await markAsRead(notification.id)
        }

        // Navigate to relevant screen
        const target = getNavigationTarget(notification)
        if (target) {
            navigate(target)
        }
    }

    /**
     * Mark a notification as read.
     * Handles case where notification was deleted by another session.
     *
     * @param {number} id - Notification ID
     */
    const markAsRead = async (id) => {
        try {
            await api.patch(`/notifications/${id}/read`)
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, is_read: 1 } : n)
            )
            setUnreadCount(prev => Math.max(0, prev - 1))
        } catch (err) {
            // Handle deleted record gracefully
            if (err.message.includes('not found') || err.message.includes('Not found')) {
                // Remove the stale notification from the list
                setNotifications(prev => prev.filter(n => n.id !== id))
                setError('This notification no longer exists. It may have been deleted.')
                // Clear the error after 3 seconds
                setTimeout(() => setError(null), 3000)
            } else {
                console.error('Failed to mark notification as read:', err)
                setError(err.message)
                setTimeout(() => setError(null), 3000)
            }
        }
    }

    /**
     * Mark all notifications as read.
     */
    const markAllAsRead = async () => {
        try {
            await api.patch('/notifications/read-all')
            setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })))
            setUnreadCount(0)
        } catch (err) {
            console.error('Failed to mark all as read:', err)
            setError(err.message)
            setTimeout(() => setError(null), 3000)
        }
    }

    /**
     * Export filtered notifications as JSON file.
     */
    const handleExportFiltered = async () => {
        setExporting(true)
        setError(null)
        try {
            const params = new URLSearchParams({
                sortOrder,
                ...(typeFilter !== 'all' && { type: typeFilter })
            })
            const token = localStorage.getItem('accessToken')
            const response = await fetch(`/api/notifications/export?${params}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error?.message || 'Export failed')
            }

            const data = await response.json()
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `notifications-export-${typeFilter}-${Date.now()}.json`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
        } catch (err) {
            setError(err.message)
            setTimeout(() => setError(null), 3000)
        } finally {
            setExporting(false)
        }
    }

    if (!user) {
        return (
            <div className="page">
                <div className="page-header">
                    <h1 className="page-title">Notifications</h1>
                </div>
                <div className="card">
                    <p className="text-secondary">
                        Please log in to view your notifications.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">Notifications</h1>
                {unreadCount > 0 && (
                    <span style={{
                        background: 'var(--error)',
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '0.875rem',
                        marginLeft: '8px'
                    }}>
                        {unreadCount}
                    </span>
                )}
            </div>

            <div className="card mb-md" style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                padding: '12px 16px'
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '8px'
                }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="btn btn-secondary"
                            aria-label="Filter by type"
                            style={{ minWidth: '140px' }}
                        >
                            {NOTIFICATION_TYPES.map(type => (
                                <option key={type.value} value={type.value}>
                                    {type.label}
                                </option>
                            ))}
                        </select>
                        <button
                            className="btn btn-secondary"
                            onClick={toggleSortOrder}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            {sortOrder === 'desc' ? 'Newest' : 'Oldest'}
                            <span style={{ fontSize: '1.2rem' }}>
                                {sortOrder === 'desc' ? '\u2193' : '\u2191'}
                            </span>
                        </button>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {unreadCount > 0 && (
                            <button
                                className="btn btn-primary"
                                onClick={markAllAsRead}
                            >
                                Mark All Read
                            </button>
                        )}
                        <button
                            className="btn btn-secondary"
                            onClick={handleExportFiltered}
                            disabled={exporting || notifications.length === 0}
                            title="Export filtered notifications as JSON"
                        >
                            {exporting ? 'Exporting...' : 'Export'}
                        </button>
                    </div>
                </div>
                {typeFilter !== 'all' && (
                    <div style={{
                        fontSize: '0.875rem',
                        color: 'var(--text-secondary)'
                    }}>
                        Showing {notifications.length} {NOTIFICATION_TYPES.find(t => t.value === typeFilter)?.label || typeFilter} notification{notifications.length !== 1 ? 's' : ''}
                    </div>
                )}
            </div>

            {error && !loading && notifications.length > 0 && (
                <div className="card mb-md" style={{
                    padding: '12px 16px',
                    background: 'var(--error-bg, rgba(239, 68, 68, 0.1))',
                    borderLeft: '3px solid var(--error)'
                }}>
                    <p style={{ color: 'var(--error)', margin: 0 }}>{error}</p>
                </div>
            )}

            {loading ? (
                <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
                    <div className="loading-spinner" style={{ margin: '0 auto' }} />
                    <p className="text-secondary mt-md">Loading notifications...</p>
                </div>
            ) : error && notifications.length === 0 ? (
                <div className="card">
                    <p style={{ color: 'var(--error)' }}>{error}</p>
                    <button className="btn btn-primary mt-md" onClick={fetchNotifications}>
                        Retry
                    </button>
                </div>
            ) : notifications.length === 0 ? (
                <div className="card">
                    <p className="text-secondary">
                        No notifications yet. Your friend requests, match invites, and
                        achievement unlocks will appear here.
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {notifications.map((notification) => (
                        <div
                            key={notification.id}
                            className="card"
                            style={{
                                padding: '16px',
                                opacity: notification.is_read ? 0.7 : 1,
                                borderLeft: notification.is_read ? 'none' : '3px solid var(--primary)',
                                cursor: getNavigationTarget(notification) ? 'pointer' : 'default'
                            }}
                            onClick={() => handleNotificationClick(notification)}
                        >
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start'
                            }}>
                                <div style={{ display: 'flex', gap: '12px', flex: 1 }}>
                                    <span
                                        style={{ fontSize: '1.5rem' }}
                                        dangerouslySetInnerHTML={{ __html: getNotificationIcon(notification.type) }}
                                    />
                                    <div style={{ flex: 1 }}>
                                        <div style={{
                                            fontWeight: notification.is_read ? 400 : 600,
                                            marginBottom: '4px'
                                        }}>
                                            {notification.title}
                                        </div>
                                        <p className="text-secondary" style={{
                                            margin: 0,
                                            fontSize: '0.9rem'
                                        }}>
                                            {notification.body}
                                        </p>
                                    </div>
                                </div>
                                <div style={{
                                    fontSize: '0.8rem',
                                    color: 'var(--text-secondary)',
                                    whiteSpace: 'nowrap',
                                    marginLeft: '12px'
                                }}>
                                    {formatDate(notification.created_at)}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default Notifications
