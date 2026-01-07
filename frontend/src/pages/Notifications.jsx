import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'

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
    const [notifications, setNotifications] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [sortOrder, setSortOrder] = useState('desc')
    const [unreadCount, setUnreadCount] = useState(0)

    const fetchNotifications = useCallback(async () => {
        if (!user) return
        setLoading(true)
        setError(null)
        try {
            const data = await api.get(`/notifications?sortOrder=${sortOrder}`)
            setNotifications(data.notifications || [])
            setUnreadCount(data.unreadCount || 0)
        } catch (err) {
            setError(err.message)
            setNotifications([])
        } finally {
            setLoading(false)
        }
    }, [user, sortOrder])

    useEffect(() => {
        fetchNotifications()
    }, [fetchNotifications])

    /**
     * Toggle sort order between ascending and descending.
     */
    const toggleSortOrder = () => {
        setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')
    }

    /**
     * Mark a notification as read.
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
            console.error('Failed to mark notification as read:', err)
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
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px'
            }}>
                <button
                    className="btn btn-secondary"
                    onClick={toggleSortOrder}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    Sort by Date: {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
                    <span style={{ fontSize: '1.2rem' }}>
                        {sortOrder === 'desc' ? '\u2193' : '\u2191'}
                    </span>
                </button>
                {unreadCount > 0 && (
                    <button
                        className="btn btn-primary"
                        onClick={markAllAsRead}
                    >
                        Mark All Read
                    </button>
                )}
            </div>

            {loading ? (
                <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
                    <div className="loading-spinner" style={{ margin: '0 auto' }} />
                    <p className="text-secondary mt-md">Loading notifications...</p>
                </div>
            ) : error ? (
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
                                cursor: notification.is_read ? 'default' : 'pointer'
                            }}
                            onClick={() => !notification.is_read && markAsRead(notification.id)}
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
