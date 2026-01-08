import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import api from '../utils/api'

/**
 * ResetPassword page component.
 * Allows users to set a new password using a reset token.
 *
 * @returns {React.ReactElement} Reset password form
 */
function ResetPassword() {
    const [searchParams] = useSearchParams()
    const token = searchParams.get('token')
    const navigate = useNavigate()

    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const [loading, setLoading] = useState(false)
    const [validating, setValidating] = useState(true)
    const [tokenValid, setTokenValid] = useState(false)
    const [email, setEmail] = useState('')
    const isSubmittingRef = useRef(false)

    // Validate token on mount
    useEffect(() => {
        async function validateToken() {
            if (!token) {
                setValidating(false)
                return
            }

            try {
                const response = await api.get(`/auth/verify-reset-token?token=${token}`)
                if (response.valid) {
                    setTokenValid(true)
                    setEmail(response.email)
                }
            } catch (err) {
                setTokenValid(false)
            }
            setValidating(false)
        }

        validateToken()
    }, [token])

    /**
     * Handle form submission.
     *
     * @param {Event} e - Form event
     */
    async function handleSubmit(e) {
        e.preventDefault()
        setError('')

        // Validate password
        if (!password) {
            setError('Password is required')
            return
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters')
            return
        }

        if (!/[a-zA-Z]/.test(password)) {
            setError('Password must contain at least one letter')
            return
        }

        if (!/[0-9]/.test(password)) {
            setError('Password must contain at least one number')
            return
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match')
            return
        }

        // Prevent double submission
        if (isSubmittingRef.current) return
        isSubmittingRef.current = true

        setLoading(true)

        try {
            await api.post('/auth/reset-password', { token, newPassword: password })
            setSuccess(true)
        } catch (err) {
            setError(err.response?.data?.error?.message || 'Failed to reset password')
            isSubmittingRef.current = false
        }

        setLoading(false)
    }

    // Loading state while validating token
    if (validating) {
        return (
            <div className="auth-page">
                <div className="auth-form">
                    <h1 className="auth-logo">GeoElevate</h1>
                    <div className="loading-spinner" />
                    <p style={{ textAlign: 'center', marginTop: '1rem' }}>Validating reset link...</p>
                </div>
            </div>
        )
    }

    // No token or invalid token
    if (!token || !tokenValid) {
        return (
            <div className="auth-page">
                <div className="auth-form">
                    <h1 className="auth-logo">GeoElevate</h1>
                    <h2 className="mb-md">Invalid Reset Link</h2>

                    <div style={{
                        backgroundColor: 'var(--error)',
                        color: 'white',
                        padding: '1rem',
                        borderRadius: '8px',
                        marginBottom: '1.5rem',
                        textAlign: 'center'
                    }}>
                        <p>This password reset link is invalid or has expired.</p>
                    </div>

                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                        Password reset links expire after 1 hour for security. Please request a new one.
                    </p>

                    <div className="form-actions">
                        <Link to="/forgot-password" className="btn btn-primary" style={{ width: '100%', textAlign: 'center', display: 'block' }}>
                            Request New Reset Link
                        </Link>
                    </div>

                    <p className="form-footer">
                        <Link to="/login">Back to Login</Link>
                    </p>
                </div>
            </div>
        )
    }

    // Success state
    if (success) {
        return (
            <div className="auth-page">
                <div className="auth-form">
                    <h1 className="auth-logo">GeoElevate</h1>
                    <h2 className="mb-md">Password Reset!</h2>

                    <div style={{
                        backgroundColor: 'var(--success)',
                        color: 'white',
                        padding: '1rem',
                        borderRadius: '8px',
                        marginBottom: '1.5rem',
                        textAlign: 'center'
                    }}>
                        <p>Your password has been successfully reset.</p>
                    </div>

                    <div className="form-actions">
                        <button
                            onClick={() => navigate('/login')}
                            className="btn btn-primary"
                            style={{ width: '100%' }}
                        >
                            Log In with New Password
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // Reset form
    return (
        <div className="auth-page">
            <div className="auth-form">
                <h1 className="auth-logo">GeoElevate</h1>
                <h2 className="mb-md">Set New Password</h2>

                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                    Enter your new password for <strong>{email}</strong>
                </p>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="password">New Password</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => { setPassword(e.target.value); setError(''); }}
                            placeholder="Enter new password"
                            required
                            autoComplete="new-password"
                            autoFocus
                        />
                        <small style={{ color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem' }}>
                            At least 8 characters with one letter and one number
                        </small>
                    </div>

                    <div className="form-group">
                        <label htmlFor="confirmPassword">Confirm Password</label>
                        <input
                            type="password"
                            id="confirmPassword"
                            value={confirmPassword}
                            onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                            placeholder="Confirm new password"
                            required
                            autoComplete="new-password"
                        />
                    </div>

                    {error && <p className="form-error" role="alert" aria-live="assertive">{error}</p>}

                    <div className="form-actions">
                        <button
                            type="submit"
                            className="btn btn-primary"
                            style={{ width: '100%' }}
                            disabled={loading}
                        >
                            {loading ? 'Resetting...' : 'Reset Password'}
                        </button>
                    </div>
                </form>

                <p className="form-footer">
                    <Link to="/login">Back to Login</Link>
                </p>
            </div>
        </div>
    )
}

export default ResetPassword
