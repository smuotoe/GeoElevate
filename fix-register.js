const fs = require('fs');

const content = `import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Registration page component.
 *
 * @returns {React.ReactElement} Registration form
 */
function Register() {
    const [email, setEmail] = useState('')
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const isSubmittingRef = useRef(false)

    const { register } = useAuth()
    const navigate = useNavigate()

    /**
     * Handle form submission.
     *
     * @param {Event} e - Form event
     */
    async function handleSubmit(e) {
        e.preventDefault()
        setError('')

        if (password !== confirmPassword) {
            setError('Passwords do not match')
            return
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters')
            return
        }

        if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
            setError('Password must contain at least one letter and one number')
            return
        }

        // Prevent double submission using ref for immediate check
        if (isSubmittingRef.current) return
        isSubmittingRef.current = true

        setLoading(true)

        const result = await register(email, username, password)

        if (result.success) {
            navigate('/', { replace: true })
        } else {
            setError(result.error || 'Registration failed')
            isSubmittingRef.current = false
        }

        setLoading(false)
    }

    return (
        <div className="auth-page">
            <div className="auth-form">
                <h1 className="auth-logo">GeoElevate</h1>
                <h2 className="mb-md">Create your account</h2>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter your email"
                            required
                            autoComplete="email"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="username">Username</label>
                        <input
                            type="text"
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Choose a username"
                            required
                            autoComplete="username"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Create a password"
                            required
                            autoComplete="new-password"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="confirmPassword">Confirm Password</label>
                        <input
                            type="password"
                            id="confirmPassword"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm your password"
                            required
                            autoComplete="new-password"
                        />
                    </div>

                    {error && <p className="form-error">{error}</p>}

                    <div className="form-actions">
                        <button
                            type="submit"
                            className="btn btn-primary"
                            style={{ width: '100%' }}
                            disabled={loading}
                        >
                            {loading ? 'Creating account...' : 'Sign Up'}
                        </button>
                    </div>
                </form>

                <p className="form-footer">
                    Already have an account? <Link to="/login">Log in</Link>
                </p>
            </div>
        </div>
    )
}

export default Register
`;

fs.writeFileSync('./frontend/src/pages/Register.jsx', content);
console.log('Register.jsx updated successfully');
