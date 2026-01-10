import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useAudio } from '../context/AudioContext'
import { api } from '../utils/api'
import { useUnsavedChanges } from '../hooks/useUnsavedChanges'
import UnsavedChangesDialog from '../components/UnsavedChangesDialog'
import { X } from 'lucide-react'

/**
 * Settings page component.
 *
 * @returns {React.ReactElement} Settings page
 */
function Settings() {
    const navigate = useNavigate()
    const { logout, user, updateUser } = useAuth()
    const { theme, toggleTheme } = useTheme()
    const { soundEnabled, musicEnabled, musicPlaying, toggleSound, toggleMusic, playSound, startMusic, stopMusic } = useAudio()
    const [showPasswordForm, setShowPasswordForm] = useState(false)
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [passwordError, setPasswordError] = useState('')
    const [passwordSuccess, setPasswordSuccess] = useState('')
    const [loading, setLoading] = useState(false)
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)
    const [deletePassword, setDeletePassword] = useState('')
    const [deleteError, setDeleteError] = useState('')
    const [deleteLoading, setDeleteLoading] = useState(false)
    const [exportLoading, setExportLoading] = useState(false)
    const [exportError, setExportError] = useState('')

    // Notification preferences
    const [notificationPrefs, setNotificationPrefs] = useState({
        streakReminders: true,
        challengeInvites: true,
        friendRequests: true,
        achievements: true,
        dailyChallenges: true
    })
    const [notificationSaving, setNotificationSaving] = useState(false)

    // Privacy settings
    const [privacySettings, setPrivacySettings] = useState({
        profileVisible: true,
        showOnLeaderboards: true,
        allowFriendRequests: true
    })
    const [privacySaving, setPrivacySaving] = useState(false)

    // Email change state
    const [showEmailForm, setShowEmailForm] = useState(false)
    const [newEmail, setNewEmail] = useState('')
    const [emailPassword, setEmailPassword] = useState('')
    const [emailError, setEmailError] = useState('')
    const [emailSuccess, setEmailSuccess] = useState('')
    const [emailLoading, setEmailLoading] = useState(false)

    // Track unsaved changes in the password form
    const hasUnsavedChanges = showPasswordForm && (currentPassword || newPassword || confirmPassword)
    const { showDialog, confirmNavigation, cancelNavigation, message } = useUnsavedChanges(
        hasUnsavedChanges,
        'You have unsaved changes in the password form. Are you sure you want to leave?'
    )

    // Auto-dismiss success toast after 3 seconds
    useEffect(() => {
        if (passwordSuccess) {
            const timer = setTimeout(() => {
                setPasswordSuccess('')
            }, 3000)
            return () => clearTimeout(timer)
        }
    }, [passwordSuccess])

    // Load notification preferences from user settings
    useEffect(() => {
        if (user?.settings?.notifications) {
            setNotificationPrefs(prev => ({
                ...prev,
                ...user.settings.notifications
            }))
        }
    }, [user])

    // Load privacy settings from user settings
    useEffect(() => {
        if (user?.settings?.privacy) {
            setPrivacySettings(prev => ({
                ...prev,
                ...user.settings.privacy
            }))
        }
    }, [user])

    /**
     * Toggle a notification preference.
     *
     * @param {string} key - The preference key to toggle
     */
    async function toggleNotificationPref(key) {
        const newValue = !notificationPrefs[key]
        const newPrefs = { ...notificationPrefs, [key]: newValue }
        setNotificationPrefs(newPrefs)
        setNotificationSaving(true)

        try {
            await api.patch('/settings', { notifications: newPrefs })
            if (updateUser && user) {
                updateUser({
                    ...user,
                    settings: {
                        ...user.settings,
                        notifications: newPrefs
                    }
                })
            }
        } catch (err) {
            // Revert on error
            setNotificationPrefs(prev => ({ ...prev, [key]: !newValue }))
            console.error('Failed to save notification preference:', err)
        } finally {
            setNotificationSaving(false)
        }
    }

    /**
     * Toggle a privacy setting.
     *
     * @param {string} key - The setting key to toggle
     */
    async function togglePrivacySetting(key) {
        const newValue = !privacySettings[key]
        const newSettings = { ...privacySettings, [key]: newValue }
        setPrivacySettings(newSettings)
        setPrivacySaving(true)

        try {
            await api.patch('/settings', { privacy: newSettings })
            if (updateUser && user) {
                updateUser({
                    ...user,
                    settings: {
                        ...user.settings,
                        privacy: newSettings
                    }
                })
            }
        } catch (err) {
            // Revert on error
            setPrivacySettings(prev => ({ ...prev, [key]: !newValue }))
            console.error('Failed to save privacy setting:', err)
        } finally {
            setPrivacySaving(false)
        }
    }

    /**
     * Handle email change request.
     *
     * @param {Event} e - Form submit event
     */
    async function handleEmailChange(e) {
        e.preventDefault()
        setEmailError('')
        setEmailSuccess('')
        setEmailLoading(true)

        try {
            const response = await api.post('/auth/change-email', {
                newEmail,
                password: emailPassword
            })

            setEmailSuccess(response.message || 'Verification email sent to your new address.')
            setShowEmailForm(false)
            setNewEmail('')
            setEmailPassword('')
        } catch (err) {
            setEmailError(err.message || 'Failed to change email')
        } finally {
            setEmailLoading(false)
        }
    }

    /**
     * Handle logout.
     */
    async function handleLogout() {
        await logout()
        navigate('/login')
    }

    /**
     * Handle password change form submission.
     *
     * @param {Event} e - Form submit event
     */
    async function handlePasswordChange(e) {
        e.preventDefault()
        setPasswordError('')
        setPasswordSuccess('')

        // Client-side validation - trim whitespace
        const trimmedCurrentPassword = currentPassword.trim()
        const trimmedNewPassword = newPassword.trim()

        if (!trimmedCurrentPassword) {
            setPasswordError('Current password is required')
            return
        }

        if (!trimmedNewPassword) {
            setPasswordError('New password is required')
            return
        }

        if (newPassword.length < 8) {
            setPasswordError('New password must be at least 8 characters')
            return
        }

        if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
            setPasswordError('New password must contain at least one letter and one number')
            return
        }

        if (newPassword !== confirmPassword) {
            setPasswordError('New passwords do not match')
            return
        }

        setLoading(true)

        try {
            await api.post('/settings/change-password', {
                currentPassword,
                newPassword
            })
            setPasswordSuccess('Password changed successfully')
            setCurrentPassword('')
            setNewPassword('')
            setConfirmPassword('')
            setShowPasswordForm(false)
        } catch (error) {
            setPasswordError(error.message)
        } finally {
            setLoading(false)
        }
    }

    /**
     * Handle data export.
     * Downloads a JSON file with all user data.
     */
    const handleExportData = useCallback(async () => {
        setExportError('')
        setExportLoading(true)

        try {
            const { user } = await api.get('/auth/me')
            const token = localStorage.getItem('accessToken')
            const response = await fetch(`/api/users/${user.id}/export`, {
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
            a.download = `geoelevate-export-${user.username}-${Date.now()}.json`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
        } catch (error) {
            setExportError(error.message)
        } finally {
            setExportLoading(false)
        }
    }, [])

    /**
     * Handle account deletion.
     *
     * @param {Event} e - Form submit event
     */
    async function handleDeleteAccount(e) {
        e.preventDefault()
        setDeleteError('')

        const trimmedDeletePassword = deletePassword.trim()
        if (!trimmedDeletePassword) {
            setDeleteError('Password is required to confirm deletion')
            return
        }

        setDeleteLoading(true)

        try {
            const { user } = await api.get('/auth/me')
            await api.delete(`/users/${user.id}`, { password: deletePassword })
            localStorage.removeItem('accessToken')
            navigate('/login')
        } catch (error) {
            setDeleteError(error.message)
        } finally {
            setDeleteLoading(false)
        }
    }

    return (
        <div className="page">
            {/* Unsaved Changes Dialog */}
            <UnsavedChangesDialog
                isOpen={showDialog}
                onConfirm={confirmNavigation}
                onCancel={cancelNavigation}
                message={message}
            />

            <div className="page-header">
                <button className="btn btn-secondary" onClick={() => navigate(-1)}>
                    Back
                </button>
                <h1 className="page-title">Settings</h1>
                <div style={{ width: 60 }} />
            </div>

            <section className="card mb-md">
                <h3 className="mb-md">Preferences</h3>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <span>Sound Effects</span>
                    <button
                        className={`btn ${soundEnabled ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => {
                            toggleSound()
                            // Play a test sound when enabling
                            if (!soundEnabled) {
                                setTimeout(() => playSound('click'), 50)
                            }
                        }}
                        style={{ minWidth: '60px' }}
                    >
                        {soundEnabled ? 'On' : 'Off'}
                    </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <span>Music</span>
                    <button
                        className={`btn ${musicEnabled ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => {
                            toggleMusic()
                            // Start or stop music based on new state
                            if (!musicEnabled) {
                                // Will be enabled - start music
                                setTimeout(() => startMusic(), 50)
                            } else {
                                // Will be disabled - stop music
                                stopMusic()
                            }
                        }}
                        style={{ minWidth: '60px' }}
                    >
                        {musicEnabled ? 'On' : 'Off'}
                    </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Theme</span>
                    <button className="btn btn-secondary" onClick={toggleTheme}>
                        {theme === 'dark' ? 'Dark' : 'Light'}
                    </button>
                </div>
            </section>

            <section className="card mb-md">
                <h3 className="mb-md">Notifications</h3>
                <p className="text-secondary mb-md">Configure which notifications you receive.</p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                        <span>Streak Reminders</span>
                        <p className="text-secondary" style={{ fontSize: '0.8rem', margin: 0 }}>Daily reminders to maintain your streak</p>
                    </div>
                    <button
                        className={`btn ${notificationPrefs.streakReminders ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => toggleNotificationPref('streakReminders')}
                        disabled={notificationSaving}
                        style={{ minWidth: '60px' }}
                    >
                        {notificationPrefs.streakReminders ? 'On' : 'Off'}
                    </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                        <span>Challenge Invites</span>
                        <p className="text-secondary" style={{ fontSize: '0.8rem', margin: 0 }}>When someone challenges you to a game</p>
                    </div>
                    <button
                        className={`btn ${notificationPrefs.challengeInvites ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => toggleNotificationPref('challengeInvites')}
                        disabled={notificationSaving}
                        style={{ minWidth: '60px' }}
                    >
                        {notificationPrefs.challengeInvites ? 'On' : 'Off'}
                    </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                        <span>Friend Requests</span>
                        <p className="text-secondary" style={{ fontSize: '0.8rem', margin: 0 }}>When someone sends you a friend request</p>
                    </div>
                    <button
                        className={`btn ${notificationPrefs.friendRequests ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => toggleNotificationPref('friendRequests')}
                        disabled={notificationSaving}
                        style={{ minWidth: '60px' }}
                    >
                        {notificationPrefs.friendRequests ? 'On' : 'Off'}
                    </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                        <span>Achievements</span>
                        <p className="text-secondary" style={{ fontSize: '0.8rem', margin: 0 }}>When you unlock an achievement</p>
                    </div>
                    <button
                        className={`btn ${notificationPrefs.achievements ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => toggleNotificationPref('achievements')}
                        disabled={notificationSaving}
                        style={{ minWidth: '60px' }}
                    >
                        {notificationPrefs.achievements ? 'On' : 'Off'}
                    </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <span>Daily Challenges</span>
                        <p className="text-secondary" style={{ fontSize: '0.8rem', margin: 0 }}>Reminders about daily challenges</p>
                    </div>
                    <button
                        className={`btn ${notificationPrefs.dailyChallenges ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => toggleNotificationPref('dailyChallenges')}
                        disabled={notificationSaving}
                        style={{ minWidth: '60px' }}
                    >
                        {notificationPrefs.dailyChallenges ? 'On' : 'Off'}
                    </button>
                </div>
            </section>

            <section className="card mb-md">
                <h3 className="mb-md">Account</h3>

                {passwordSuccess && (
                    <div className="toast success" style={{ position: 'relative', bottom: 'auto', left: 'auto', transform: 'none', marginBottom: '16px' }}>
                        {passwordSuccess}
                    </div>
                )}

                {emailSuccess && (
                    <div className="toast success" style={{ position: 'relative', bottom: 'auto', left: 'auto', transform: 'none', marginBottom: '16px' }}>
                        {emailSuccess}
                    </div>
                )}

                <div style={{ marginBottom: '16px' }}>
                    <p className="text-secondary" style={{ fontSize: '0.9rem', marginBottom: '8px' }}>
                        Current email: <strong>{user?.email}</strong>
                    </p>
                </div>

                {!showEmailForm && !showPasswordForm ? (
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <button
                            className="btn btn-secondary"
                            onClick={() => setShowEmailForm(true)}
                        >
                            Change Email
                        </button>
                        <button
                            className="btn btn-secondary"
                            onClick={() => setShowPasswordForm(true)}
                        >
                            Change Password
                        </button>
                    </div>
                ) : showEmailForm ? (
                    <form onSubmit={handleEmailChange}>
                        <h4 style={{ marginBottom: '16px' }}>Change Email</h4>

                        <div className="form-group">
                            <label htmlFor="newEmail">New Email Address</label>
                            <input
                                type="email"
                                id="newEmail"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                placeholder="Enter new email address"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="emailPassword">Current Password</label>
                            <input
                                type="password"
                                id="emailPassword"
                                value={emailPassword}
                                onChange={(e) => setEmailPassword(e.target.value)}
                                placeholder="Enter your password to confirm"
                                required
                            />
                        </div>

                        {emailError && (
                            <div className="form-error" role="alert" aria-live="assertive">{emailError}</div>
                        )}

                        <p className="text-secondary" style={{ fontSize: '0.85rem', marginTop: '8px', marginBottom: '16px' }}>
                            A verification link will be sent to your new email address. Your email will not change until you click the link.
                        </p>

                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={emailLoading}
                            >
                                {emailLoading ? 'Sending...' : 'Send Verification'}
                            </button>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => {
                                    setShowEmailForm(false)
                                    setEmailError('')
                                    setNewEmail('')
                                    setEmailPassword('')
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                ) : (
                    <form onSubmit={handlePasswordChange}>
                        <div className="form-group">
                            <label htmlFor="currentPassword">Current Password</label>
                            <input
                                type="password"
                                id="currentPassword"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="Enter current password"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="newPassword">New Password</label>
                            <input
                                type="password"
                                id="newPassword"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Enter new password"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="confirmPassword">Confirm New Password</label>
                            <input
                                type="password"
                                id="confirmPassword"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm new password"
                                required
                            />
                        </div>

                        {passwordError && (
                            <div className="form-error" role="alert" aria-live="assertive">{passwordError}</div>
                        )}

                        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={loading}
                            >
                                {loading ? 'Changing...' : 'Change Password'}
                            </button>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => {
                                    setShowPasswordForm(false)
                                    setPasswordError('')
                                    setCurrentPassword('')
                                    setNewPassword('')
                                    setConfirmPassword('')
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                )}
            </section>

            <section className="card mb-md">
                <h3 className="mb-md">Privacy & Data</h3>
                <p className="text-secondary mb-md">Control your profile visibility and data.</p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                        <span>Public Profile</span>
                        <p className="text-secondary" style={{ fontSize: '0.8rem', margin: 0 }}>Allow others to view your profile</p>
                    </div>
                    <button
                        className={`btn ${privacySettings.profileVisible ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => togglePrivacySetting('profileVisible')}
                        disabled={privacySaving}
                        style={{ minWidth: '60px' }}
                    >
                        {privacySettings.profileVisible ? 'On' : 'Off'}
                    </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                        <span>Show on Leaderboards</span>
                        <p className="text-secondary" style={{ fontSize: '0.8rem', margin: 0 }}>Appear on public leaderboards</p>
                    </div>
                    <button
                        className={`btn ${privacySettings.showOnLeaderboards ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => togglePrivacySetting('showOnLeaderboards')}
                        disabled={privacySaving}
                        style={{ minWidth: '60px' }}
                    >
                        {privacySettings.showOnLeaderboards ? 'On' : 'Off'}
                    </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div>
                        <span>Allow Friend Requests</span>
                        <p className="text-secondary" style={{ fontSize: '0.8rem', margin: 0 }}>Let others send you friend requests</p>
                    </div>
                    <button
                        className={`btn ${privacySettings.allowFriendRequests ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => togglePrivacySetting('allowFriendRequests')}
                        disabled={privacySaving}
                        style={{ minWidth: '60px' }}
                    >
                        {privacySettings.allowFriendRequests ? 'On' : 'Off'}
                    </button>
                </div>

                <h4 style={{ marginBottom: '12px', color: 'var(--text-primary)' }}>Data Management</h4>

                {exportError && (
                    <div className="form-error mb-md" role="alert" aria-live="assertive">{exportError}</div>
                )}

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <button
                        className="btn btn-secondary"
                        onClick={handleExportData}
                        disabled={exportLoading}
                    >
                        {exportLoading ? 'Exporting...' : 'Export Data'}
                    </button>
                    <button
                        className="btn"
                        onClick={() => setShowDeleteDialog(true)}
                        style={{ background: 'var(--error)', color: 'white' }}
                    >
                        Delete Account
                    </button>
                </div>
            </section>

            {/* Delete Account Dialog */}
            {showDeleteDialog && (
                <div className="modal-overlay" onClick={() => {
                    setShowDeleteDialog(false)
                    setDeletePassword('')
                    setDeleteError('')
                }}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Delete Account</h2>
                            <button
                                className="modal-close"
                                onClick={() => {
                                    setShowDeleteDialog(false)
                                    setDeletePassword('')
                                    setDeleteError('')
                                }}
                                aria-label="Close"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleDeleteAccount}>
                            <div className="modal-body">
                                <p style={{ marginBottom: '16px' }}>
                                    <strong>Warning:</strong> This action cannot be undone. All your data,
                                    progress, and achievements will be permanently deleted.
                                </p>
                                <div className="form-group">
                                    <label htmlFor="deletePassword">Enter your password to confirm</label>
                                    <input
                                        type="password"
                                        id="deletePassword"
                                        value={deletePassword}
                                        onChange={(e) => setDeletePassword(e.target.value)}
                                        placeholder="Enter your password"
                                        required
                                    />
                                </div>
                                {deleteError && (
                                    <div className="form-error" role="alert" aria-live="assertive">{deleteError}</div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => {
                                        setShowDeleteDialog(false)
                                        setDeletePassword('')
                                        setDeleteError('')
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn"
                                    disabled={deleteLoading}
                                    style={{ background: 'var(--error)', color: 'white' }}
                                >
                                    {deleteLoading ? 'Deleting...' : 'Delete Account'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <section className="card mb-md">
                <h3 className="mb-md">Help & Support</h3>
                <p className="text-secondary mb-md">FAQ, contact support, and more.</p>
                <Link to="/help" className="btn btn-secondary">
                    View Help & FAQ
                </Link>
            </section>

            <button
                className="btn"
                onClick={handleLogout}
                style={{
                    width: '100%',
                    background: 'var(--error)',
                    color: 'white'
                }}
            >
                Log Out
            </button>
        </div>
    )
}

export default Settings
