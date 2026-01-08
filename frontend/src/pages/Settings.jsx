import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { api } from '../utils/api'
import { useUnsavedChanges } from '../hooks/useUnsavedChanges'
import UnsavedChangesDialog from '../components/UnsavedChangesDialog'

/**
 * Settings page component.
 *
 * @returns {React.ReactElement} Settings page
 */
function Settings() {
    const navigate = useNavigate()
    const { logout } = useAuth()
    const { theme, toggleTheme } = useTheme()
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
                    <button className="btn btn-secondary">On</button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <span>Music</span>
                    <button className="btn btn-secondary">On</button>
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
                <p className="text-secondary">Configure which notifications you receive.</p>
            </section>

            <section className="card mb-md">
                <h3 className="mb-md">Account</h3>

                {passwordSuccess && (
                    <div className="toast success" style={{ position: 'relative', bottom: 'auto', left: 'auto', transform: 'none', marginBottom: '16px' }}>
                        {passwordSuccess}
                    </div>
                )}

                {!showPasswordForm ? (
                    <button
                        className="btn btn-secondary"
                        onClick={() => setShowPasswordForm(true)}
                    >
                        Change Password
                    </button>
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
                <p className="text-secondary mb-md">Export your data or delete your account.</p>

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
                                &#10005;
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
