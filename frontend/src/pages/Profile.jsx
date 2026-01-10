import { useState, useEffect, useRef } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../utils/api'
import Modal from '../components/Modal'
import AvatarSelector from '../components/AvatarSelector'
import { Flag, Landmark, Globe, Languages, Lightbulb, Trophy, Lock, Pencil, Camera } from 'lucide-react'

const CATEGORY_ICONS = {
    flags: Flag,
    capitals: Landmark,
    maps: Globe,
    languages: Languages,
    trivia: Lightbulb,
    general: Trophy
}

// Avatar upload configuration
const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

/**
 * Parse avatar data from avatar_url field.
 * Returns parsed JSON object if avatar_url contains JSON data, otherwise null.
 *
 * @param {string|null} avatarUrl - The avatar URL or JSON string
 * @returns {object|null} Parsed avatar data or null
 */
function parseAvatarData(avatarUrl) {
    if (!avatarUrl) return null
    try {
        if (avatarUrl.startsWith('{')) {
            return JSON.parse(avatarUrl)
        }
    } catch {
        return null
    }
    return null
}

/**
 * Profile/Me page component.
 *
 * @returns {React.ReactElement} Profile page
 */
function Profile() {
    const { user, checkAuth } = useAuth()
    const { userId: paramUserId } = useParams()
    const navigate = useNavigate()

    // Determine if viewing own profile or another user's profile
    const isOwnProfile = !paramUserId || (user && paramUserId === String(user.id))
    const viewingUserId = paramUserId ? parseInt(paramUserId, 10) : user?.id

    const [profileUser, setProfileUser] = useState(null)
    const [profileLoading, setProfileLoading] = useState(false)
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
    const [showAvatarSelector, setShowAvatarSelector] = useState(false)
    const [showEditProfile, setShowEditProfile] = useState(false)
    const [editUsername, setEditUsername] = useState('')
    const [usernameError, setUsernameError] = useState(null)
    const [usernameSaving, setUsernameSaving] = useState(false)
    const fileInputRef = useRef(null)

    // Fetch other user's profile if viewing someone else
    useEffect(() => {
        async function fetchOtherUserProfile() {
            if (!paramUserId || isOwnProfile) {
                setProfileUser(null)
                return
            }

            setProfileLoading(true)
            try {
                const data = await api.get(`/users/${paramUserId}`)
                setProfileUser(data.user || data)
            } catch (err) {
                console.error('Failed to fetch user profile:', err)
                setProfileUser(null)
            } finally {
                setProfileLoading(false)
            }
        }
        fetchOtherUserProfile()
    }, [paramUserId, isOwnProfile])

    // Fetch stats on mount and when user/viewingUserId changes
    useEffect(() => {
        if (viewingUserId) {
            fetchStats()
        }
    }, [viewingUserId])

    useEffect(() => {
        if (activeTab === 'achievements' && viewingUserId && !achievements && !achievementsLoading) {
            fetchAchievements()
        }
    }, [activeTab, viewingUserId, achievements, achievementsLoading])

    /**
     * Fetch user stats from API.
     */
    async function fetchStats() {
        if (!viewingUserId) return
        setStatsLoading(true)
        setStatsError(null)
        try {
            const data = await api.get(`/users/${viewingUserId}/stats`)
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
        if (!viewingUserId) return
        setAchievementsLoading(true)
        setAchievementsError(null)
        try {
            const data = await api.get(`/users/${viewingUserId}/achievements`)
            setAchievements(data)
        } catch (err) {
            setAchievementsError(err.message || 'Failed to load achievements')
        } finally {
            setAchievementsLoading(false)
        }
    }

    /**
     * Handle avatar selection from avatar selector modal.
     *
     * @param {object} avatar - Selected avatar object with id, emoji, and color
     */
    async function handleAvatarSelect(avatar) {
        setAvatarError(null)
        setAvatarUploading(true)
        try {
            const avatarData = JSON.stringify(avatar)
            await api.patch(`/users/${user.id}`, { avatar_url: avatarData })
            await checkAuth()
        } catch (err) {
            setAvatarError(err.message || 'Failed to save avatar')
        } finally {
            setAvatarUploading(false)
        }
    }

    /**
     * Open edit profile modal.
     */
    function openEditProfile() {
        setEditUsername(user?.username || '')
        setUsernameError(null)
        setShowEditProfile(true)
    }

    /**
     * Close edit profile modal.
     */
    function closeEditProfile() {
        setShowEditProfile(false)
        setEditUsername('')
        setUsernameError(null)
    }

    /**
     * Handle username save.
     */
    async function handleUsernameSave() {
        const trimmedUsername = editUsername.trim()

        // Validate username
        if (!trimmedUsername) {
            setUsernameError('Username is required')
            return
        }

        if (trimmedUsername.length < 3) {
            setUsernameError('Username must be at least 3 characters')
            return
        }

        if (trimmedUsername.length > 20) {
            setUsernameError('Username must be 20 characters or less')
            return
        }

        if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
            setUsernameError('Username can only contain letters, numbers, and underscores')
            return
        }

        // Skip if username hasn't changed
        if (trimmedUsername === user?.username) {
            closeEditProfile()
            return
        }

        setUsernameSaving(true)
        setUsernameError(null)

        try {
            await api.patch(`/users/${user.id}`, { username: trimmedUsername })
            await checkAuth()
            closeEditProfile()
        } catch (err) {
            setUsernameError(err.message || 'Failed to update username')
        } finally {
            setUsernameSaving(false)
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
     * Render the user's avatar based on avatar_url content.
     * Handles JSON emoji avatars, URL-based images, and default letter avatars.
     *
     * @returns {React.ReactElement} Avatar element
     */
    function renderAvatar() {
        const avatarUser = isOwnProfile ? user : profileUser
        const avatarData = parseAvatarData(avatarUser?.avatar_url)

        // JSON emoji avatar
        if (avatarData && avatarData.emoji && avatarData.color) {
            return (
                <div
                    className="avatar"
                    style={{
                        width: 80,
                        height: 80,
                        borderRadius: '50%',
                        background: avatarData.color,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '40px'
                    }}
                >
                    {avatarData.emoji}
                </div>
            )
        }

        // URL-based image avatar
        if (avatarUser?.avatar_url && !avatarUser.avatar_url.includes('default') && !avatarUser.avatar_url.startsWith('{')) {
            return (
                <img
                    src={avatarUser.avatar_url}
                    alt={avatarUser.username}
                    style={{
                        width: 80,
                        height: 80,
                        borderRadius: '50%',
                        objectFit: 'cover'
                    }}
                />
            )
        }

        // Default letter avatar
        return (
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
                {avatarUser?.username?.[0]?.toUpperCase() || '?'}
            </div>
        )
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
        const accuracy = stat.total_questions > 0
            ? Math.round((stat.total_correct / stat.total_questions) * 100)
            : 0
        const IconComponent = CATEGORY_ICONS[stat.category] || Trophy

        return (
            <div key={stat.category} style={{
                marginBottom: '16px',
                padding: '16px',
                backgroundColor: 'rgba(255,255,255,0.03)',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.08)'
            }}>
                {/* Header: Icon, Name, Level Badge */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '12px'
                }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        backgroundColor: 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <IconComponent size={22} color="white" />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{
                            color: 'var(--text-primary)',
                            fontWeight: '600',
                            fontSize: '16px'
                        }}>
                            {getCategoryName(stat.category)}
                        </div>
                        <div style={{
                            color: 'var(--text-secondary)',
                            fontSize: '12px'
                        }}>
                            {stat.games_played || 0} games played
                        </div>
                    </div>
                    <div style={{
                        backgroundColor: 'var(--primary)',
                        color: 'white',
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontWeight: '700',
                        fontSize: '14px'
                    }}>
                        LVL {stat.level}
                    </div>
                </div>

                {/* XP Progress */}
                <div style={{ marginBottom: '12px' }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '6px'
                    }}>
                        <span style={{
                            fontSize: '12px',
                            color: 'var(--text-secondary)',
                            fontWeight: '500'
                        }}>
                            XP to Level {stat.level + 1}
                        </span>
                        <span style={{
                            fontSize: '13px',
                            color: 'var(--primary)',
                            fontWeight: '600'
                        }}>
                            {currentLevelXp} / {xpForNextLevel}
                        </span>
                    </div>
                    <div style={{
                        height: '10px',
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        borderRadius: '5px',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            height: '100%',
                            width: `${Math.min(progress, 100)}%`,
                            backgroundColor: 'var(--primary)',
                            borderRadius: '5px',
                            transition: 'width 0.3s ease'
                        }} />
                    </div>
                    <div style={{
                        fontSize: '11px',
                        color: 'var(--text-secondary)',
                        marginTop: '4px'
                    }}>
                        Total XP: {stat.xp || 0}
                    </div>
                </div>

                {/* Stats Row */}
                <div style={{
                    display: 'flex',
                    gap: '12px',
                    paddingTop: '12px',
                    borderTop: '1px solid rgba(255,255,255,0.08)'
                }}>
                    {/* Accuracy */}
                    <div style={{
                        flex: 1,
                        textAlign: 'center',
                        padding: '8px',
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        borderRadius: '8px'
                    }}>
                        <div style={{
                            fontSize: '18px',
                            fontWeight: '700',
                            color: accuracy >= 70 ? 'var(--success, #22c55e)' : accuracy >= 50 ? 'var(--warning, #eab308)' : 'var(--text-primary)'
                        }}>
                            {accuracy}%
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            Accuracy
                        </div>
                    </div>

                    {/* Correct Answers */}
                    <div style={{
                        flex: 1,
                        textAlign: 'center',
                        padding: '8px',
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        borderRadius: '8px'
                    }}>
                        <div style={{
                            fontSize: '18px',
                            fontWeight: '700',
                            color: 'var(--text-primary)'
                        }}>
                            {stat.total_correct || 0}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            Correct
                        </div>
                    </div>

                    {/* Best Score */}
                    {stat.high_score > 0 && (
                        <div style={{
                            flex: 1,
                            textAlign: 'center',
                            padding: '8px',
                            backgroundColor: 'rgba(255,255,255,0.03)',
                            borderRadius: '8px'
                        }}>
                            <div style={{
                                fontSize: '18px',
                                fontWeight: '700',
                                color: 'var(--accent, #f59e0b)'
                            }}>
                                {stat.high_score.toLocaleString()}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                Best Score
                            </div>
                        </div>
                    )}
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
        const IconComponent = CATEGORY_ICONS[achievement.category] || Trophy

        return (
            <button
                key={achievement.id}
                onClick={() => setSelectedAchievement(achievement)}
                style={{
                    padding: '14px',
                    backgroundColor: 'var(--surface)',
                    borderRadius: '12px',
                    border: isUnlocked ? '2px solid var(--primary)' : '1px solid var(--border, rgba(255,255,255,0.1))',
                    cursor: 'pointer',
                    width: '100%',
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'block',
                    textAlign: 'left'
                }}
            >
                {/* Unlocked badge */}
                {isUnlocked && (
                    <div style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        backgroundColor: 'var(--primary)',
                        color: 'white',
                        fontSize: '10px',
                        fontWeight: '600',
                        padding: '3px 10px',
                        borderRadius: '10px',
                        zIndex: 1
                    }}>
                        UNLOCKED
                    </div>
                )}

                {/* Main content row: Icon + Text */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: !isUnlocked ? '12px' : '8px'
                }}>
                    {/* Icon - fixed size */}
                    <div style={{
                        width: '48px',
                        height: '48px',
                        minWidth: '48px',
                        borderRadius: '50%',
                        backgroundColor: isUnlocked ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        position: 'relative',
                        border: isUnlocked ? '2px solid var(--primary)' : '2px solid rgba(255,255,255,0.2)'
                    }}>
                        {achievement.image_url ? (
                            <img
                                src={achievement.image_url}
                                alt={achievement.name}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    filter: isUnlocked ? 'none' : 'grayscale(100%) brightness(0.5)'
                                }}
                            />
                        ) : (
                            <IconComponent
                                size={24}
                                color={isUnlocked ? 'white' : 'rgba(255,255,255,0.5)'}
                            />
                        )}
                        {!isUnlocked && (
                            <div style={{
                                position: 'absolute',
                                inset: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: 'rgba(0,0,0,0.5)'
                            }}>
                                <Lock size={18} color="rgba(255,255,255,0.7)" />
                            </div>
                        )}
                    </div>

                    {/* Text - takes remaining space */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                            color: isUnlocked ? 'var(--text-primary)' : 'var(--text-secondary)',
                            fontWeight: '600',
                            fontSize: '14px',
                            marginBottom: '2px',
                            paddingRight: isUnlocked ? '70px' : 0
                        }}>
                            {achievement.name}
                        </div>
                        <div style={{
                            color: 'var(--text-secondary)',
                            fontSize: '12px',
                            lineHeight: '1.3',
                            opacity: 0.9
                        }}>
                            {achievement.description}
                        </div>
                    </div>
                </div>

                {/* Progress bar - full width, only for locked */}
                {!isUnlocked && (
                    <div style={{ marginBottom: '10px' }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '4px'
                        }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                Progress
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: '600' }}>
                                {progress} / {achievement.requirement_value}
                            </span>
                        </div>
                        <div style={{
                            height: '6px',
                            backgroundColor: 'rgba(255,255,255,0.1)',
                            borderRadius: '3px',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                height: '100%',
                                width: `${progressPercent}%`,
                                backgroundColor: 'var(--primary)',
                                borderRadius: '3px'
                            }} />
                        </div>
                    </div>
                )}

                {/* Footer: Category + XP */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <span style={{
                        fontSize: '10px',
                        color: 'var(--text-secondary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                    }}>
                        {achievement.category}
                    </span>
                    <span style={{
                        fontSize: '11px',
                        color: isUnlocked ? 'var(--primary)' : 'var(--text-secondary)',
                        fontWeight: '600',
                        backgroundColor: isUnlocked ? 'rgba(var(--primary-rgb, 59, 130, 246), 0.15)' : 'rgba(255,255,255,0.05)',
                        padding: '2px 8px',
                        borderRadius: '8px'
                    }}>
                        +{achievement.xp_reward} XP
                    </span>
                </div>
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
        const ModalIconComponent = CATEGORY_ICONS[selectedAchievement.category] || Trophy

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
                        filter: isUnlocked ? 'none' : 'grayscale(100%)',
                        overflow: 'hidden',
                        position: 'relative'
                    }}>
                        {selectedAchievement.image_url ? (
                            <img
                                src={selectedAchievement.image_url}
                                alt={selectedAchievement.name}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    filter: isUnlocked ? 'none' : 'grayscale(100%) brightness(0.7)'
                                }}
                            />
                        ) : (
                            <ModalIconComponent size={40} color="white" />
                        )}
                        {!isUnlocked && selectedAchievement.image_url && (
                            <div style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: 'rgba(0,0,0,0.4)'
                            }}>
                                <Lock size={24} color="white" />
                            </div>
                        )}
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
        const overallPercent = achievementList.length > 0
            ? Math.round((unlockedCount / achievementList.length) * 100)
            : 0

        return (
            <div>
                {/* Summary header */}
                <div style={{
                    marginBottom: '20px',
                    padding: '16px',
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.08)'
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '10px'
                    }}>
                        <span style={{
                            color: 'var(--text-primary)',
                            fontWeight: '600',
                            fontSize: '16px'
                        }}>
                            {unlockedCount} / {achievementList.length} Unlocked
                        </span>
                        <span style={{
                            color: 'var(--primary)',
                            fontWeight: '600',
                            fontSize: '14px'
                        }}>
                            {overallPercent}%
                        </span>
                    </div>
                    <div style={{
                        height: '10px',
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        borderRadius: '5px',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            height: '100%',
                            width: `${overallPercent}%`,
                            backgroundColor: 'var(--primary)',
                            borderRadius: '5px',
                            transition: 'width 0.3s ease'
                        }} />
                    </div>
                </div>

                {/* Achievements list */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                }}>
                    {achievementList.map(renderAchievementBadge)}
                </div>

                <Link
                    to="/achievements"
                    className="btn btn-secondary"
                    style={{
                        marginTop: '20px',
                        display: 'inline-block',
                        textDecoration: 'none'
                    }}
                >
                    View All Achievements
                </Link>
            </div>
        )
    }

    // Determine which user data to display
    const displayUser = isOwnProfile ? user : profileUser

    // Show loading state when fetching other user's profile
    if (profileLoading) {
        return (
            <div className="page">
                <div className="page-header">
                    <button className="btn btn-secondary" onClick={() => navigate(-1)}>
                        Back
                    </button>
                    <h1 className="page-title">Profile</h1>
                    <div style={{ width: 70 }} />
                </div>
                <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
                    <div className="loading-spinner" style={{ margin: '0 auto' }} />
                    <p className="text-secondary mt-md">Loading profile...</p>
                </div>
            </div>
        )
    }

    // Show not found state if viewing another user who doesn't exist
    if (!isOwnProfile && !profileUser) {
        return (
            <div className="page">
                <div className="page-header">
                    <button className="btn btn-secondary" onClick={() => navigate(-1)}>
                        Back
                    </button>
                    <h1 className="page-title">Profile</h1>
                    <div style={{ width: 70 }} />
                </div>
                <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
                    <p className="text-secondary">User not found</p>
                    <button className="btn btn-primary mt-md" onClick={() => navigate('/friends')}>
                        Back to Friends
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="page">
            <div className="page-header">
                {!isOwnProfile && (
                    <button className="btn btn-secondary" onClick={() => navigate(-1)}>
                        Back
                    </button>
                )}
                <h1 className="page-title">{isOwnProfile ? 'Profile' : `${displayUser?.username}'s Profile`}</h1>
                {isOwnProfile ? (
                    <Link to="/settings" className="btn btn-secondary">
                        Settings
                    </Link>
                ) : (
                    <Link to="/multiplayer" className="btn btn-primary">
                        Challenge
                    </Link>
                )}
            </div>

            <div className="card mb-md" style={{ textAlign: 'center' }}>
                <div style={{ position: 'relative', display: 'inline-block', marginBottom: '12px' }}>
                    {renderAvatar()}
                    {isOwnProfile && (
                        <button
                            onClick={() => setShowAvatarSelector(true)}
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
                            {avatarUploading ? '...' : <Camera size={14} />}
                        </button>
                    )}
                    {isOwnProfile && (
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            onChange={handleAvatarChange}
                            style={{ display: 'none' }}
                        />
                    )}
                </div>
                {avatarError && isOwnProfile && (
                    <p style={{ color: 'var(--color-error)', fontSize: '14px', marginBottom: '8px' }}>
                        {avatarError}
                    </p>
                )}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <h2>{displayUser?.username}</h2>
                    {isOwnProfile && (
                        <button
                            onClick={openEditProfile}
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '16px',
                                padding: '4px',
                                color: 'var(--primary)'
                            }}
                            title="Edit profile"
                            aria-label="Edit profile"
                        >
                            <Pencil size={16} />
                        </button>
                    )}
                </div>
                <p className="text-secondary">Level {displayUser?.overall_level || 1}</p>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '32px', marginTop: '16px' }}>
                    <div>
                        <div style={{ fontSize: '24px', fontWeight: '600' }}>{displayUser?.overall_xp || 0}</div>
                        <div className="text-secondary">XP</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '24px', fontWeight: '600' }}>{displayUser?.current_streak || 0}</div>
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

            {isOwnProfile && (
                <Link to="/friends" className="card mt-md" style={{ display: 'block', textDecoration: 'none' }}>
                    <h3 style={{ color: 'var(--text-primary)' }}>Friends</h3>
                    <p className="text-secondary">View and manage your friends</p>
                </Link>
            )}

            {isOwnProfile && renderAchievementModal()}

            {isOwnProfile && (
                <AvatarSelector
                    isOpen={showAvatarSelector}
                    onClose={() => setShowAvatarSelector(false)}
                    onSelect={handleAvatarSelect}
                    currentAvatar={parseAvatarData(user?.avatar_url)?.id}
                />
            )}

            {isOwnProfile && (
                <Modal
                    isOpen={showEditProfile}
                    onClose={closeEditProfile}
                    title="Edit Profile"
                >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label
                            htmlFor="edit-username"
                            style={{
                                display: 'block',
                                marginBottom: '8px',
                                fontWeight: '500',
                                color: 'var(--text-primary)'
                            }}
                        >
                            Username
                        </label>
                        <input
                            id="edit-username"
                            type="text"
                            value={editUsername}
                            onChange={(e) => setEditUsername(e.target.value)}
                            placeholder="Enter username"
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '8px',
                                border: usernameError ? '1px solid var(--error)' : '1px solid var(--border)',
                                backgroundColor: 'var(--surface)',
                                color: 'var(--text-primary)',
                                fontSize: '16px'
                            }}
                            disabled={usernameSaving}
                            maxLength={20}
                        />
                        {usernameError && (
                            <p style={{ color: 'var(--error)', fontSize: '14px', marginTop: '4px' }}>
                                {usernameError}
                            </p>
                        )}
                        <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '4px' }}>
                            3-20 characters. Letters, numbers, and underscores only.
                        </p>
                    </div>

                    <div style={{ marginTop: '8px' }}>
                        <label
                            style={{
                                display: 'block',
                                marginBottom: '8px',
                                fontWeight: '500',
                                color: 'var(--text-primary)'
                            }}
                        >
                            Avatar
                        </label>
                        <button
                            type="button"
                            onClick={() => {
                                closeEditProfile()
                                setShowAvatarSelector(true)
                            }}
                            className="btn btn-secondary"
                            style={{ width: '100%' }}
                        >
                            Change Avatar
                        </button>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                        <button
                            type="button"
                            onClick={closeEditProfile}
                            className="btn btn-secondary"
                            style={{ flex: 1 }}
                            disabled={usernameSaving}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleUsernameSave}
                            className="btn btn-primary"
                            style={{ flex: 1 }}
                            disabled={usernameSaving}
                        >
                            {usernameSaving ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </div>
                </Modal>
            )}
        </div>
    )
}

export default Profile
