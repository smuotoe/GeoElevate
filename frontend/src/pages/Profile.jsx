import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../utils/api'
import Modal from '../components/Modal'

// Avatar upload configuration
const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

/**
 * Profile/Me page component.
 *
 * @returns {React.ReactElement} Profile page
 */
function Profile() {
    const { user, checkAuth } = useAuth()
    const [activeTab, setActiveTab] = useState('performance')
    const [stats, setStats] = useState(null)
    const [achievements, setAchievements] = useState(null)
    const [statsLoading, setStatsLoading] = useState(false)
    const [achievementsLoading, setAchievementsLoading] = useState(false)
    const [statsError, setStatsError] = useState(null)
    const [achievementsError, setAchievementsError] = useState(null)
    const [selectedAchievement, setSelectedAchievement] = useState(null)
    const [avatarUploading, setAvatarUploading] = useState(false)
    const [avatarError, setAvatarError] = useState(null)
    const fileInputRef = useRef(null)

    // Fetch stats on mount and when user changes
    useEffect(() => {
        if (user?.id) {
            fetchStats()
        }
    }, [user?.id])

    useEffect(() => {
        if (activeTab === 'achievements' && user?.id && !achievements && !achievementsLoading) {
            fetchAchievements()
        }
    }, [activeTab, user?.id, achievements, achievementsLoading])

    /**
     * Fetch user stats from API.
     */
    async function fetchStats() {
        setStatsLoading(true)
        setStatsError(null)
        try {
            const data = await api.get(`/users/${user.id}/stats`)
            setStats(data)
        } catch (err) {
            setStatsError(err.message || 'Failed to load stats')
        } finally {
            setStatsLoading(false)
        }
    }

    /**
     * Fetch user achievements from API.
     */
    async function fetchAchievements() {
        setAchievementsLoading(true)
        setAchievementsError(null)
        try {
            const data = await api.get(`/users/${user.id}/achievements`)
            setAchievements(data)
        } catch (err) {
            setAchievementsError(err.message || 'Failed to load achievements')
        } finally {
            setAchievementsLoading(false)
        }
    }

    /**
     * Handle avatar file selection and upload.
     *
     * @param {Event} e - File input change event
     */
    async function handleAvatarChange(e) {
        const file = e.target.files?.[0]
        if (!file) return

        setAvatarError(null)

        // Client-side validation for file size
        if (file.size > MAX_FILE_SIZE) {
            setAvatarError(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`)
            return
        }

        // Client-side validation for file type
        if (!ALLOWED_TYPES.includes(file.type)) {
            setAvatarError(`Invalid file type. Allowed types: ${ALLOWED_TYPES.map(t => t.split('/')[1]).join(', ')}`)
            return
        }

        setAvatarUploading(true)
        try {
            const formData = new FormData()
            formData.append('avatar', file)

            const token = localStorage.getItem('accessToken')
            const response = await fetch(`/api/users/${user.id}/avatar`, {
                method: 'POST',
                headers: {
                    ...(token && { Authorization: `Bearer ${token}` }),
                },
                body: formData,
                credentials: 'include',
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error?.message || 'Upload failed')
            }

            // Refresh user data to get new avatar
            await checkAuth()
        } catch (err) {
            setAvatarError(err.message || 'Failed to upload avatar')
        } finally {
            setAvatarUploading(false)
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = ''
            }
        }
    }

    /**
     * Calculate XP needed for next level.
     *
     * @param {number} level - Current level
     * @returns {number} XP needed for next level
     */
    function getXpForLevel(level) {
        return level * 100
    }

    /**
     * Get category display name.
     *
     * @param {string} category - Category key
     * @returns {string} Display name
     */
    function getCategoryName(category) {
        const names = {
            flags: 'Flags',
            capitals: 'Capitals',
            maps: 'Maps',
            languages: 'Languages',
            trivia: 'Trivia'
        }
        return names[category?.toLowerCase()] || category || 'Unknown'
    }

    /**
     * Render skill category progress bar.
     *
     * @param {object} stat - Category stat object
     * @returns {React.ReactElement} Progress bar element
     */
    function renderSkillBar(stat) {
        const xpForNextLevel = getXpForLevel(stat.level)
        const currentLevelXp = stat.xp % xpForNextLevel
        const progress = xpForNextLevel > 0 ? (currentLevelXp / xpForNextLevel) * 100 : 0

        return (
            <div key={stat.category} style={{ marginBottom: '16px' }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '4px'
                }}>
                    <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>
                        {getCategoryName(stat.category)}
                    </span>
                    <span style={{ color: 'var(--text-secondary)' }}>
                        Level {stat.level} - {currentLevelXp}/{xpForNextLevel} XP
                    </span>
                </div>
                <div style={{
                    height: '8px',
                    backgroundColor: 'var(--surface)',
                    borderRadius: '4px',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        height: '100%',
                        width: `${Math.min(progress, 100)}%`,
                        backgroundColor: 'var(--primary)',
                        borderRadius: '4px',
                        transition: 'width 0.3s ease'
                    }} />
                </div>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: '4px',
                    fontSize: '12px',
                    color: 'var(--text-secondary)'
                }}>
                    <span>{stat.games_played || 0} games</span>
                    <span>
                        {stat.high_score > 0 && (
                            <span style={{ color: 'var(--accent)', marginRight: '8px' }}>
                                High: {stat.high_score}
                            </span>
                        )}
                        {stat.total_correct || 0}/{stat.total_questions || 0} correct
                    </span>
                </div>
            </div>
        )
    }

    /**
     * Render achievement badge.
     *
     * @param {object} achievement - Achievement object
     * @returns {React.ReactElement} Badge element
     */
    function renderAchievementBadge(achievement) {
        const isUnlocked = achievement.unlocked_at !== null
        const progress = achievement.progress || 0
        const progressPercent = achievement.requirement_value > 0
            ? Math.min((progress / achievement.requirement_value) * 100, 100)
            : 0

        return (
            <button
                key={achievement.id}
                onClick={() => setSelectedAchievement(achievement)}
                style={{
                    padding: '16px',
                    backgroundColor: 'var(--surface)',
                    borderRadius: '8px',
                    opacity: isUnlocked ? 1 : 0.6,
                    border: isUnlocked ? '2px solid var(--primary)' : '2px solid transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%'
                }}
            >
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '8px'
                }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        backgroundColor: isUnlocked ? 'var(--primary)' : 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px',
                        filter: isUnlocked ? 'none' : 'grayscale(100%)'
                    }}>
                        {achievement.icon || '?'}
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{
                            color: 'var(--text-primary)',
                            fontWeight: '600'
                        }}>
                            {achievement.name}
                        </div>
                        <div style={{
                            color: 'var(--text-secondary)',
                            fontSize: '12px'
                        }}>
                            {achievement.description}
                        </div>
                    </div>
                </div>
                {!isUnlocked && (
                    <div>
                        <div style={{
                            height: '4px',
                            backgroundColor: 'var(--text-secondary)',
                            borderRadius: '2px',
                            overflow: 'hidden',
                            marginBottom: '4px'
                        }}>
                            <div style={{
                                height: '100%',
                                width: `${progressPercent}%`,
                                backgroundColor: 'var(--primary)',
                                borderRadius: '2px'
                            }} />
                        </div>
                        <div style={{
                            fontSize: '11px',
                            color: 'var(--text-secondary)',
                            textAlign: 'right'
                        }}>
                            {progress}/{achievement.requirement_value}
                        </div>
                    </div>
                )}
                {isUnlocked && (
                    <div style={{
                        fontSize: '11px',
                        color: 'var(--primary)',
                        textAlign: 'right'
                    }}>
                        +{achievement.xp_reward} XP
                    </div>
                )}
            </button>
        )
    }

    /**
     * Render achievement detail modal content.
     *
     * @returns {React.ReactElement|null} Modal content or null
     */
    function renderAchievementModal() {
        if (!selectedAchievement) return null

        const isUnlocked = selectedAchievement.unlocked_at !== null
        const progress = selectedAchievement.progress || 0
        const progressPercent = selectedAchievement.requirement_value > 0
            ? Math.min((progress / selectedAchievement.requirement_value) * 100, 100)
            : 0

        return (
            <Modal
                isOpen={!!selectedAchievement}
                onClose={() => setSelectedAchievement(null)}
                title={selectedAchievement.name}
            >
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        backgroundColor: isUnlocked ? 'var(--primary)' : 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '40px',
                        margin: '0 auto 16px',
                        filter: isUnlocked ? 'none' : 'grayscale(100%)'
                    }}>
                        {selectedAchievement.icon || '?'}
                    </div>

                    <p style={{
                        color: 'var(--text-secondary)',
                        marginBottom: '16px'
                    }}>
                        {selectedAchievement.description}
                    </p>

                    <div style={{
                        backgroundColor: 'var(--surface)',
                        padding: '16px',
                        borderRadius: '8px',
                        marginBottom: '16px'
                    }}>
                        <div style={{ marginBottom: '8px' }}>
                            <strong>Category:</strong> {selectedAchievement.category}
                        </div>
                        <div style={{ marginBottom: '8px' }}>
                            <strong>Reward:</strong> {selectedAchievement.xp_reward} XP
                        </div>
                        <div>
                            <strong>Status:</strong> {isUnlocked ? 'Unlocked!' : 'Locked'}
                        </div>
                    </div>

                    {!isUnlocked && (
                        <div>
                            <div style={{ marginBottom: '8px', fontWeight: '500' }}>
                                Progress: {progress}/{selectedAchievement.requirement_value}
                            </div>
                            <div style={{
                                height: '12px',
                                backgroundColor: 'var(--text-secondary)',
                                borderRadius: '6px',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    height: '100%',
                                    width: `${progressPercent}%`,
                                    backgroundColor: 'var(--primary)',
                                    borderRadius: '6px',
                                    transition: 'width 0.3s ease'
                                }} />
                            </div>
                        </div>
                    )}

                    {isUnlocked && selectedAchievement.unlocked_at && (
                        <div style={{ color: 'var(--primary)', marginTop: '8px' }}>
                            Unlocked on {new Date(selectedAchievement.unlocked_at).toLocaleDateString()}
                        </div>
                    )}
                </div>
            </Modal>
        )
    }

    /**
     * Render performance tab content.
     *
     * @returns {React.ReactElement} Performance content
     */
    function renderPerformanceTab() {
        if (statsLoading) {
            return (
                <div style={{ textAlign: 'center', padding: '24px' }}>
                    <p style={{ color: 'var(--text-secondary)' }}>Loading stats...</p>
                </div>
            )
        }

        if (statsError) {
            return (
                <div style={{ textAlign: 'center', padding: '24px' }}>
                    <p style={{ color: 'var(--text-secondary)' }}>{statsError}</p>
                    <button className="btn btn-secondary mt-md" onClick={fetchStats}>
                        Retry
                    </button>
                </div>
            )
        }

        const categoryStats = stats?.stats || []
        const defaultCategories = ['flags', 'capitals', 'maps', 'languages', 'trivia']

        if (categoryStats.length === 0) {
            const placeholderStats = defaultCategories.map(cat => ({
                category: cat,
                xp: 0,
                level: 1,
                games_played: 0,
                total_correct: 0,
                total_questions: 0
            }))
            return (
                <div>
                    <p style={{
                        color: 'var(--text-secondary)',
                        marginBottom: '16px'
                    }}>
                        Play games to start building your skills!
                    </p>
                    {placeholderStats.map(renderSkillBar)}
                </div>
            )
        }

        return <div>{categoryStats.map(renderSkillBar)}</div>
    }

    /**
     * Render achievements tab content.
     *
     * @returns {React.ReactElement} Achievements content
     */
    function renderAchievementsTab() {
        if (achievementsLoading) {
            return (
                <div style={{ textAlign: 'center', padding: '24px' }}>
                    <p style={{ color: 'var(--text-secondary)' }}>Loading achievements...</p>
                </div>
            )
        }

        if (achievementsError) {
            return (
                <div style={{ textAlign: 'center', padding: '24px' }}>
                    <p style={{ color: 'var(--text-secondary)' }}>{achievementsError}</p>
                    <button className="btn btn-secondary mt-md" onClick={fetchAchievements}>
                        Retry
                    </button>
                </div>
            )
        }

        const achievementList = achievements?.achievements || []

        if (achievementList.length === 0) {
            return (
                <div style={{ textAlign: 'center', padding: '24px' }}>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        No achievements available yet. Check back later!
                    </p>
                    <Link to="/achievements" className="btn btn-secondary mt-md">
                        View All Achievements
                    </Link>
                </div>
            )
        }

        const unlockedCount = achievementList.filter(a => a.unlocked_at !== null).length

        return (
            <div>
                <div style={{
                    marginBottom: '16px',
                    color: 'var(--text-secondary)'
                }}>
                    {unlockedCount}/{achievementList.length} unlocked
                </div>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: '12px'
                }}>
                    {achievementList.map(renderAchievementBadge)}
                </div>
                <Link to="/achievements" className="btn btn-secondary mt-md">
                    View All Achievements
                </Link>
            </div>
        )
    }

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">Profile</h1>
                <Link to="/settings" className="btn btn-secondary">
                    Settings
                </Link>
            </div>

            <div className="card mb-md" style={{ textAlign: 'center' }}>
                <div style={{ position: 'relative', display: 'inline-block', marginBottom: '12px' }}>
                    {user?.avatar_url && !user.avatar_url.includes('default') ? (
                        <img
                            src={user.avatar_url}
                            alt={user.username}
                            style={{
                                width: 80,
                                height: 80,
                                borderRadius: '50%',
                                objectFit: 'cover'
                            }}
                        />
                    ) : (
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
                                fontSize: '32px'
                            }}
                        >
                            {user?.username?.[0]?.toUpperCase() || '?'}
                        </div>
                    )}
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={avatarUploading}
                        style={{
                            position: 'absolute',
                            bottom: 0,
                            right: 0,
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            background: 'var(--bg-secondary)',
                            border: '2px solid var(--bg-primary)',
                            cursor: avatarUploading ? 'wait' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px'
                        }}
                        title="Change avatar"
                    >
                        {avatarUploading ? '...' : '📷'}
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        onChange={handleAvatarChange}
                        style={{ display: 'none' }}
                    />
                </div>
                {avatarError && (
                    <p style={{ color: 'var(--color-error)', fontSize: '14px', marginBottom: '8px' }}>
                        {avatarError}
                    </p>
                )}
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
                {activeTab === 'performance' ? renderPerformanceTab() : renderAchievementsTab()}
            </div>

            <Link to="/friends" className="card mt-md" style={{ display: 'block', textDecoration: 'none' }}>
                <h3 style={{ color: 'var(--text-primary)' }}>Friends</h3>
                <p className="text-secondary">View and manage your friends</p>
            </Link>

            {renderAchievementModal()}
        </div>
    )
}

export default Profile
