import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'

/**
 * Tutorial steps configuration.
 * Each step explains a key feature of the app.
 */
const TUTORIAL_STEPS = [
    {
        id: 'welcome',
        title: 'Welcome to GeoElevate!',
        description: 'Learn geography through fun, engaging quizzes. Let us show you around!',
        icon: '🌍',
        highlight: null
    },
    {
        id: 'games',
        title: 'Play Games',
        description: 'Test your knowledge with 5 game types: Flags, Capitals, Maps, Languages, and Trivia. Each game helps you learn different geography facts.',
        icon: '🎮',
        highlight: 'games'
    },
    {
        id: 'scoring',
        title: 'Score Points',
        description: 'Answer quickly for bonus points! Build streaks by answering correctly in a row to multiply your score.',
        icon: '⚡',
        highlight: 'scoring'
    },
    {
        id: 'progress',
        title: 'Track Progress',
        description: 'Your skills improve as you play. Watch your level grow in each category and unlock achievements along the way.',
        icon: '📈',
        highlight: 'progress'
    },
    {
        id: 'challenges',
        title: 'Daily Challenges',
        description: 'Complete daily challenges to earn bonus XP. Keep your streak alive by playing every day!',
        icon: '🔥',
        highlight: 'challenges'
    },
    {
        id: 'leaderboards',
        title: 'Climb the Leaderboards',
        description: 'Compete with players worldwide! See how you rank globally, weekly, or among your friends.',
        icon: '🏆',
        highlight: 'leaderboards'
    },
    {
        id: 'friends',
        title: 'Play with Friends',
        description: 'Add friends and challenge them to multiplayer matches. See who knows more geography!',
        icon: '👥',
        highlight: 'friends'
    },
    {
        id: 'ready',
        title: "You're Ready!",
        description: "That's all you need to know. Start playing and become a geography master!",
        icon: '🚀',
        highlight: null
    }
]

/**
 * Tutorial page component.
 * Guides new users through the app features.
 *
 * @returns {React.ReactElement} Tutorial walkthrough
 */
function Tutorial() {
    const { user, checkAuth } = useAuth()
    const navigate = useNavigate()

    const [currentStep, setCurrentStep] = useState(0)
    const [loading, setLoading] = useState(false)

    const step = TUTORIAL_STEPS[currentStep]
    const isLastStep = currentStep === TUTORIAL_STEPS.length - 1
    const isFirstStep = currentStep === 0

    /**
     * Go to the next tutorial step.
     */
    const nextStep = () => {
        if (isLastStep) {
            completeTutorial()
        } else {
            setCurrentStep(prev => prev + 1)
        }
    }

    /**
     * Go to the previous tutorial step.
     */
    const prevStep = () => {
        if (!isFirstStep) {
            setCurrentStep(prev => prev - 1)
        }
    }

    /**
     * Skip the tutorial and go to home.
     */
    const skipTutorial = async () => {
        try {
            await api.post('/tutorial/skip')
        } catch {
            // Ignore errors, just navigate
        }
        navigate('/', { replace: true })
    }

    /**
     * Complete the tutorial and go to home.
     */
    const completeTutorial = async () => {
        setLoading(true)
        try {
            await api.post('/tutorial/complete')
            await checkAuth()
        } catch {
            // Ignore errors, just navigate
        }
        navigate('/', { replace: true })
    }

    // Redirect if no user
    useEffect(() => {
        if (!user) {
            navigate('/login', { replace: true })
        }
    }, [user, navigate])

    if (!user) return null

    return (
        <div className="page" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 'calc(100vh - 80px)',
            padding: '20px',
            textAlign: 'center'
        }}>
            <div className="card" style={{
                maxWidth: '500px',
                width: '100%',
                padding: '32px'
            }}>
                {/* Progress indicator */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '8px',
                    marginBottom: '24px'
                }}>
                    {TUTORIAL_STEPS.map((_, index) => (
                        <div
                            key={index}
                            style={{
                                width: '10px',
                                height: '10px',
                                borderRadius: '50%',
                                background: index <= currentStep
                                    ? 'var(--primary)'
                                    : 'var(--bg-secondary)',
                                transition: 'background 0.3s ease'
                            }}
                        />
                    ))}
                </div>

                {/* Step content */}
                <div style={{ marginBottom: '32px' }}>
                    <div style={{
                        fontSize: '4rem',
                        marginBottom: '16px',
                        animation: 'bounce 0.5s ease'
                    }}>
                        {step.icon}
                    </div>
                    <h1 style={{
                        fontSize: '1.75rem',
                        marginBottom: '12px',
                        color: 'var(--text-primary)'
                    }}>
                        {step.title}
                    </h1>
                    <p style={{
                        color: 'var(--text-secondary)',
                        fontSize: '1rem',
                        lineHeight: '1.6'
                    }}>
                        {step.description}
                    </p>
                </div>

                {/* Step counter */}
                <p style={{
                    color: 'var(--text-secondary)',
                    fontSize: '0.85rem',
                    marginBottom: '20px'
                }}>
                    Step {currentStep + 1} of {TUTORIAL_STEPS.length}
                </p>

                {/* Navigation buttons */}
                <div style={{
                    display: 'flex',
                    gap: '12px',
                    justifyContent: 'center'
                }}>
                    {!isFirstStep && (
                        <button
                            className="btn btn-secondary"
                            onClick={prevStep}
                            style={{ minWidth: '100px' }}
                        >
                            Back
                        </button>
                    )}
                    <button
                        className="btn btn-primary"
                        onClick={nextStep}
                        disabled={loading}
                        style={{ minWidth: '140px' }}
                    >
                        {loading ? 'Loading...' : isLastStep ? "Let's Go!" : 'Next'}
                    </button>
                </div>

                {/* Skip button */}
                {!isLastStep && (
                    <button
                        className="btn"
                        onClick={skipTutorial}
                        style={{
                            marginTop: '16px',
                            color: 'var(--text-secondary)',
                            background: 'transparent',
                            border: 'none',
                            fontSize: '0.9rem'
                        }}
                    >
                        Skip Tutorial
                    </button>
                )}
            </div>

            <style>{`
                @keyframes bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
            `}</style>
        </div>
    )
}

export default Tutorial
