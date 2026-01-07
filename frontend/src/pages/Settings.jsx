import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

/**
 * Settings page component.
 *
 * @returns {React.ReactElement} Settings page
 */
function Settings() {
    const navigate = useNavigate()
    const { logout } = useAuth()
    const { theme, toggleTheme } = useTheme()

    /**
     * Handle logout.
     */
    async function handleLogout() {
        await logout()
        navigate('/login')
    }

    return (
        <div className="page">
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
                <p className="text-secondary">Manage your email, password, and account settings.</p>
            </section>

            <section className="card mb-md">
                <h3 className="mb-md">Privacy & Data</h3>
                <p className="text-secondary">Export your data or delete your account.</p>
            </section>

            <section className="card mb-md">
                <h3 className="mb-md">Help & Support</h3>
                <p className="text-secondary">FAQ, contact support, and more.</p>
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
