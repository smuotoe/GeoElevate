const fs = require('fs');

let content = fs.readFileSync('C:/Users/Somto/Documents/geo-elevate/frontend/src/pages/Profile.jsx', 'utf8');

// Add Modal import
content = content.replace(
    "import { api } from '../utils/api'",
    "import { api } from '../utils/api'\nimport Modal from '../components/Modal'"
);

// Add selectedAchievement state
content = content.replace(
    "const [achievementsError, setAchievementsError] = useState(null)",
    "const [achievementsError, setAchievementsError] = useState(null)\n    const [selectedAchievement, setSelectedAchievement] = useState(null)"
);

// Update renderAchievementBadge to be clickable
content = content.replace(
    `        return (
            <div
                key={achievement.id}
                style={{
                    padding: '16px',
                    backgroundColor: 'var(--surface)',
                    borderRadius: '8px',
                    opacity: isUnlocked ? 1 : 0.6,
                    border: isUnlocked ? '2px solid var(--primary)' : '2px solid transparent'
                }}
            >`,
    `        return (
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
            >`
);

// Close the button tag instead of div
content = content.replace(
    `                        +{achievement.xp_reward} XP
                    </div>
                )}
            </div>
        )
    }

    /**
     * Render performance tab content.`,
    `                        +{achievement.xp_reward} XP
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
                                    width: \`\${progressPercent}%\`,
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
     * Render performance tab content.`
);

// Add modal render in the return statement before closing </div>
content = content.replace(
    `            <Link to="/friends" className="card mt-md" style={{ display: 'block', textDecoration: 'none' }}>
                <h3 style={{ color: 'var(--text-primary)' }}>Friends</h3>
                <p className="text-secondary">View and manage your friends</p>
            </Link>
        </div>
    )
}`,
    `            <Link to="/friends" className="card mt-md" style={{ display: 'block', textDecoration: 'none' }}>
                <h3 style={{ color: 'var(--text-primary)' }}>Friends</h3>
                <p className="text-secondary">View and manage your friends</p>
            </Link>

            {renderAchievementModal()}
        </div>
    )
}`
);

fs.writeFileSync('C:/Users/Somto/Documents/geo-elevate/frontend/src/pages/Profile.jsx', content);
console.log('Updated Profile.jsx with achievement modal');
