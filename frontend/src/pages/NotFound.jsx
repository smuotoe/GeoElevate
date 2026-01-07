import { Link } from 'react-router-dom'

/**
 * 404 Not Found page component.
 *
 * @returns {React.ReactElement} Not found page
 */
function NotFound() {
    return (
        <div className="auth-page">
            <div style={{ textAlign: 'center' }}>
                <h1 style={{ fontSize: '4rem', color: 'var(--primary)' }}>404</h1>
                <h2 className="mb-md">Page Not Found</h2>
                <p className="text-secondary mb-lg">
                    The page you're looking for doesn't exist or has been moved.
                </p>
                <Link to="/" className="btn btn-primary">
                    Go Home
                </Link>
            </div>
        </div>
    )
}

export default NotFound
