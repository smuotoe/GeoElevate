import { useState, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Login page component.
 *
 * @returns {React.ReactElement} Login form
 */
function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const isSubmittingRef = useRef(false)

    const { login } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()

    const from = location.state?.from?.pathname || '/'

    /**
     * Handle form submission.
     *
     * @param {Event} e - Form event
     */
    async function handleSubmit(e) {
        e.preventDefault()
        setError('')

        // Trim whitespace from inputs
        const trimmedEmail = email.trim()
        const trimmedPassword = password.trim()

        // Validate whitespace-only inputs
        if (!trimmedEmail) {
            setError('Email is required')
            return
        }

        if (!trimmedPassword) {
            setError('Password is required')
            return
        }

        // Prevent double submission using ref for immediate check
        if (isSubmittingRef.current) return
        isSubmittingRef.current = true

        setLoading(true)

        const result = await login(trimmedEmail, password)

        if (result.success) {
            navigate(from, { replace: true })
        } else {
            setError(result.error || 'Login failed')
            isSubmittingRef.current = false
        }

        setLoading(false)
    }

    return (
        <div className="auth-page">
            <div className="auth-form">
                <h1 className="auth-logo">GeoElevate</h1>
                <h2 className="mb-md">Welcome back!</h2>

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
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => { setPassword(e.target.value); setError(''); }}
                            placeholder="Enter your password"
                            required
                            autoComplete="current-password"
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
                            {loading ? 'Logging in...' : 'Log In'}
                        </button>
                    </div>
                </form>

                <p className="form-footer" style={{ marginBottom: '0.5rem' }}>
                    <Link to="/forgot-password">Forgot your password?</Link>
                </p>
                <p className="form-footer">
                    Don't have an account? <Link to="/register">Sign up</Link>
                </p>
            </div>
        </div>
    )
}

export default Login
