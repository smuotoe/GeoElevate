import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import styles from './Achievements.module.css'
import {
    Flag, Landmark, Globe, Languages, Earth, Star, Zap, Flame,
    Users, Trophy, Lock, ChevronLeft, Award, Target, Crown,
    Lightbulb, Medal, MapPin
} from 'lucide-react'

const CATEGORY_ICONS = {
    flags: Flag,
    capitals: Landmark,
    maps: Globe,
    languages: Languages,
    general: Earth,
    accuracy: Target,
    speed: Zap,
    streak: Flame,
    social: Users,
    multiplayer: Trophy,
    trivia: Lightbulb
}

const CATEGORY_NAMES = {
    flags: 'Flags',
    capitals: 'Capitals',
    maps: 'Maps',
    languages: 'Languages',
    general: 'General',
    accuracy: 'Accuracy',
    speed: 'Speed',
    streak: 'Streak',
    social: 'Social',
    multiplayer: 'Multiplayer'
}

/**
 * Achievements page component.
 *
 * @returns {React.ReactElement} Achievements page
 */
function Achievements() {
    const navigate = useNavigate()
    const { user } = useAuth()
    const [achievements, setAchievements] = useState([])
    const [summary, setSummary] = useState({ unlocked: 0, total: 0, percentage: 0 })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [selectedCategory, setSelectedCategory] = useState('all')

    const fetchAchievements = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            if (user?.id) {
                const data = await api.get(`/achievements/user/${user.id}`)
                setAchievements(data.achievements || [])
                setSummary(data.summary || { unlocked: 0, total: 0, percentage: 0 })
            } else {
                const data = await api.get('/achievements')
                setAchievements(data.achievements || [])
                setSummary({ unlocked: 0, total: data.achievements?.length || 0, percentage: 0 })
            }
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [user?.id])

    useEffect(() => {
        fetchAchievements()
    }, [fetchAchievements])

    const categories = [...new Set(achievements.map(a => a.category))].sort()

    const filteredAchievements = selectedCategory === 'all'
        ? achievements
        : achievements.filter(a => a.category === selectedCategory)

    const groupedAchievements = filteredAchievements.reduce((acc, achievement) => {
        const cat = achievement.category
        if (!acc[cat]) acc[cat] = []
        acc[cat].push(achievement)
        return acc
    }, {})

    const getProgressPercent = (achievement) => {
        if (!achievement.requirement_value) return 0
        const progress = achievement.progress || 0
        return Math.min((progress / achievement.requirement_value) * 100, 100)
    }

    const isUnlocked = (achievement) => !!achievement.unlocked_at

    return (
        <div className="page">
            <div className="page-header">
                <button className="btn btn-secondary" onClick={() => navigate(-1)}>
                    <ChevronLeft size={20} />
                </button>
                <h1 className="page-title">Achievements</h1>
                <div style={{ width: 60 }} />
            </div>

            {/* Summary Card */}
            <div className={styles.summaryCard}>
                <div className={styles.summaryIcon}><Trophy size={32} /></div>
                <div className={styles.summaryText}>
                    <span className={styles.summaryCount}>
                        {summary.unlocked} / {summary.total}
                    </span>
                    <span className={styles.summaryLabel}>Achievements Unlocked</span>
                </div>
                <div className={styles.summaryProgress}>
                    <div
                        className={styles.summaryProgressFill}
                        style={{ width: `${summary.percentage}%` }}
                    />
                </div>
            </div>

            {/* Category Filter */}
            <div className={styles.categoryFilter}>
                <button
                    className={`${styles.categoryBtn} ${selectedCategory === 'all' ? styles.active : ''}`}
                    onClick={() => setSelectedCategory('all')}
                >
                    All
                </button>
                {categories.map(cat => {
                    const IconComponent = CATEGORY_ICONS[cat] || MapPin
                    return (
                        <button
                            key={cat}
                            className={`${styles.categoryBtn} ${selectedCategory === cat ? styles.active : ''}`}
                            onClick={() => setSelectedCategory(cat)}
                        >
                            <IconComponent size={16} /> {CATEGORY_NAMES[cat] || cat}
                        </button>
                    )
                })}
            </div>

            {loading ? (
                <div className="card">
                    <p className="text-secondary">Loading achievements...</p>
                </div>
            ) : error ? (
                <div className="card">
                    <p className="text-error">{error}</p>
                    <button className="btn btn-primary mt-sm" onClick={fetchAchievements}>
                        Retry
                    </button>
                </div>
            ) : achievements.length === 0 ? (
                <div className="card">
                    <p className="text-secondary">No achievements found.</p>
                </div>
            ) : (
                <div className={styles.achievementsList}>
                    {Object.entries(groupedAchievements).map(([category, catAchievements]) => {
                        const CategoryIcon = CATEGORY_ICONS[category] || MapPin
                        return (
                        <div key={category} className={styles.categorySection}>
                            <h2 className={styles.categoryTitle}>
                                <CategoryIcon size={24} /> {CATEGORY_NAMES[category] || category}
                            </h2>
                            <div className={styles.achievementsGrid}>
                                {catAchievements.map(achievement => {
                                    const AchievementIcon = CATEGORY_ICONS[achievement.category] || Trophy
                                    return (
                                    <div
                                        key={achievement.id}
                                        className={`${styles.achievementCard} ${isUnlocked(achievement) ? styles.unlocked : styles.locked}`}
                                    >
                                        <div className={styles.achievementIcon}>
                                            {achievement.image_url ? (
                                                <img
                                                    src={achievement.image_url}
                                                    alt={achievement.name}
                                                    className={`${styles.badgeImage} ${!isUnlocked(achievement) ? styles.lockedImage : ''}`}
                                                />
                                            ) : isUnlocked(achievement) ? (
                                                <span className={styles.unlockedIcon}>
                                                    <AchievementIcon size={28} />
                                                </span>
                                            ) : (
                                                <span className={styles.lockedIcon}><Lock size={28} /></span>
                                            )}
                                            {!isUnlocked(achievement) && achievement.image_url && (
                                                <span className={styles.lockOverlay}><Lock size={20} /></span>
                                            )}
                                        </div>
                                        <div className={styles.achievementInfo}>
                                            <h3 className={styles.achievementName}>
                                                {achievement.name}
                                            </h3>
                                            <p className={styles.achievementDesc}>
                                                {achievement.description}
                                            </p>
                                            {!isUnlocked(achievement) && achievement.requirement_value > 1 && (
                                                <div className={styles.progressSection}>
                                                    <div className={styles.progressBar}>
                                                        <div
                                                            className={styles.progressFill}
                                                            style={{ width: `${getProgressPercent(achievement)}%` }}
                                                        />
                                                    </div>
                                                    <span className={styles.progressText}>
                                                        {achievement.progress || 0} / {achievement.requirement_value}
                                                    </span>
                                                </div>
                                            )}
                                            <div className={styles.rewardBadge}>
                                                +{achievement.xp_reward} XP
                                            </div>
                                        </div>
                                        {isUnlocked(achievement) && (
                                            <div className={styles.unlockedBadge}>
                                                Unlocked
                                            </div>
                                        )}
                                    </div>
                                    )
                                })}
                            </div>
                        </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

export default Achievements
