import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Profile/Me page component.
 *
 * @returns {React.ReactElement} Profile page
 */
function Profile() {
    const { user } = useAuth()
    const [activeTab, setActiveTab] = useState('performance')

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">Profile</h1>
                <Link to="/settings" className="btn btn-secondary">
                    Settings
                </Link>
            </div>

            <div className="card mb-md" style={{ textAlign: 'center' }}>
                <div
                    className="avatar"
                    style={{
                        width: 80,
                        height: 80,
                        borderRadius: '50%',
                        background: 'var(--primary)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '32px',
                        marginBottom: '12px'
                    }}
                >
                    {user?.username?.[0]?.toUpperCase() || '?'}
                </div>
                <h2>{user?.username}</h2>
                <p className="text-secondary">Level {user?.overall_level || 1}</p>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '32px', marginTop: '16px' }}>
                    <div>
                        <div style={{ fontSize: '24px', fontWeight: '600' }}>{user?.overall_xp || 0}</div>
                        <div className="text-secondary">XP</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '24px', fontWeight: '600' }}>{user?.current_streak || 0}</div>
                        <div className="text-secondary">Streak</div>
                    </div>
                </div>
            </div>

            <div className="tabs mb-md" style={{ display: 'flex', gap: '8px' }}>
                <button
                    className={`btn ${activeTab === 'performance' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setActiveTab('performance')}
                >
                    Performance
                </button>
                <button
                    className={`btn ${activeTab === 'achievements' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setActiveTab('achievements')}
                >
                    Achievements
                </button>
            </div>

            <div className="card">
                {activeTab === 'performance' ? (
                    <div>
                        <p className="text-secondary">
                            Your skill levels across all categories will be displayed here.
                        </p>
                    </div>
                ) : (
                    <div>
                        <p className="text-secondary">
                            Your achievements and badges will be displayed here.
                        </p>
                        <Link to="/achievements" className="btn btn-secondary mt-md">
                            View All Achievements
                        </Link>
                    </div>
                )}
            </div>

            <Link to="/friends" className="card mt-md" style={{ display: 'block', textDecoration: 'none' }}>
                <h3 style={{ color: 'var(--text-primary)' }}>Friends</h3>
                <p className="text-secondary">View and manage your friends</p>
            </Link>
        </div>
    )
}

export default Profile
