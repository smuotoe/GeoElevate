import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import api from '../utils/api'

/**
 * ForgotPassword page component.
 * Allows users to request a password reset email.
 *
 * @returns {React.ReactElement} Forgot password form
 */
function ForgotPassword() {
    const [email, setEmail] = useState('')
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const [loading, setLoading] = useState(false)
    const isSubmittingRef = useRef(false)

    /**
     * Handle form submission.
     *
     * @param {Event} e - Form event
     */
    async function handleSubmit(e) {
        e.preventDefault()
        setError('')

        // Trim whitespace from email
        const trimmedEmail = email.trim()

        // Validate email
        if (!trimmedEmail) {
            setError('Email is required')
            return
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(trimmedEmail)) {
            setError('Please enter a valid email address')
            return
        }

        // Prevent double submission
        if (isSubmittingRef.current) return
        isSubmittingRef.current = true

        setLoading(true)

        try {
            await api.post('/auth/forgot-password', { email: trimmedEmail })
            setSuccess(true)
        } catch (err) {
            setError(err.response?.data?.error?.message || 'Failed to send reset email')
            isSubmittingRef.current = false
        }

        setLoading(false)
    }

    if (success) {
        return (
            <div className="auth-page">
                <div className="auth-form">
                    <h1 className="auth-logo">GeoElevate</h1>
                    <h2 className="mb-md">Check Your Email</h2>

                    <div className="success-message" style={{
                        backgroundColor: 'var(--success)',
                        color: 'white',
                        padding: '1rem',
                        borderRadius: '8px',
                        marginBottom: '1.5rem',
                        textAlign: 'center'
                    }}>
                        <p>If an account exists with that email, a password reset link has been sent.</p>
                        <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', opacity: 0.9 }}>
                            Check your email and follow the link to reset your password.
                        </p>
                    </div>

                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                        The link will expire in 1 hour for security.
                    </p>

                    <p className="form-footer">
                        <Link to="/login">Back to Login</Link>
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="auth-page">
            <div className="auth-form">
                <h1 className="auth-logo">GeoElevate</h1>
                <h2 className="mb-md">Reset Your Password</h2>

                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                    Enter your email address and we'll send you a link to reset your password.
                </p>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => { setEmail(e.target.value); setError(''); }}
                            placeholder="Enter your email"
                            required
                            autoComplete="email"
                            autoFocus
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
                            {loading ? 'Sending...' : 'Send Reset Link'}
                        </button>
                    </div>
                </form>

                <p className="form-footer">
                    Remember your password? <Link to="/login">Log in</Link>
                </p>
            </div>
        </div>
    )
}

export default ForgotPassword
