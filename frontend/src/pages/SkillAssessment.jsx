import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'

/**
 * Assessment categories with their questions.
 */
const ASSESSMENT_CATEGORIES = [
    { id: 'flags', name: 'Flags', icon: '🏴' },
    { id: 'capitals', name: 'Capitals', icon: '🏛' },
    { id: 'maps', name: 'Maps', icon: '🌎' },
    { id: 'languages', name: 'Languages', icon: '💬' },
    { id: 'trivia', name: 'Trivia', icon: '💡' }
]

const QUESTIONS_PER_CATEGORY = 3

/**
 * Skill Assessment page component.
 * Shown to new users after registration to gauge initial skill levels.
 *
 * @returns {React.ReactElement} Skill assessment page
 */
function SkillAssessment() {
    const { user, checkAuth } = useAuth()
    const navigate = useNavigate()

    const [phase, setPhase] = useState('intro') // 'intro', 'assessment', 'results'
    const [questions, setQuestions] = useState([])
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
    const [answers, setAnswers] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [results, setResults] = useState(null)

    /**
     * Fetch assessment questions from the API.
     */
    const fetchQuestions = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const data = await api.get('/assessment/questions')
            setQuestions(data.questions || [])
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [])

    /**
     * Start the assessment.
     */
    const startAssessment = async () => {
        await fetchQuestions()
        setPhase('assessment')
    }

    /**
     * Skip the assessment and go to home.
     */
    const skipAssessment = async () => {
        try {
            await api.post('/assessment/skip')
        } catch {
            // Ignore errors, just navigate
        }
        navigate('/', { replace: true })
    }

    /**
     * Handle answer selection.
     *
     * @param {string} answer - The selected answer
     */
    const handleAnswer = (answer) => {
        const currentQuestion = questions[currentQuestionIndex]
        const isCorrect = answer === currentQuestion.correct_answer

        setAnswers(prev => [...prev, {
            questionId: currentQuestion.id,
            category: currentQuestion.category,
            answer,
            isCorrect
        }])

        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1)
        } else {
            submitAssessment([...answers, {
                questionId: currentQuestion.id,
                category: currentQuestion.category,
                answer,
                isCorrect
            }])
        }
    }

    /**
     * Submit assessment results to the server.
     *
     * @param {Array} allAnswers - All answers
     */
    const submitAssessment = async (allAnswers) => {
        setLoading(true)
        try {
            const data = await api.post('/assessment/submit', { answers: allAnswers })
            setResults(data.results)
            setPhase('results')
            // Refresh user data to get updated skill levels
            await checkAuth()
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    /**
     * Finish assessment and go to home.
     */
    const finishAssessment = () => {
        navigate('/', { replace: true })
    }

    // Redirect if no user
    useEffect(() => {
        if (!user) {
            navigate('/login', { replace: true })
        }
    }, [user, navigate])

    if (!user) return null

    // Intro phase - show welcome and options
    if (phase === 'intro') {
        return (
            <div className="page" style={{ textAlign: 'center', padding: '20px' }}>
                <div className="card" style={{ maxWidth: '500px', margin: '0 auto', padding: '32px' }}>
                    <h1 style={{ fontSize: '2rem', marginBottom: '16px' }}>Welcome to GeoElevate!</h1>
                    <p className="text-secondary" style={{ marginBottom: '24px' }}>
                        Take a quick skill assessment to personalize your learning experience.
                        We'll ask you {ASSESSMENT_CATEGORIES.length * QUESTIONS_PER_CATEGORY} questions
                        across different geography topics.
                    </p>

                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px', marginBottom: '24px' }}>
                        {ASSESSMENT_CATEGORIES.map(cat => (
                            <span key={cat.id} style={{
                                padding: '8px 16px',
                                background: 'var(--bg-secondary)',
                                borderRadius: '20px',
                                fontSize: '0.9rem'
                            }}>
                                {cat.icon} {cat.name}
                            </span>
                        ))}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <button
                            className="btn btn-primary"
                            onClick={startAssessment}
                            style={{ width: '100%', padding: '14px' }}
                        >
                            Start Assessment
                        </button>
                        <button
                            className="btn btn-secondary"
                            onClick={skipAssessment}
                            style={{ width: '100%' }}
                        >
                            Skip for Now
                        </button>
                    </div>

                    <p className="text-secondary" style={{ fontSize: '0.85rem', marginTop: '16px' }}>
                        You can always take the assessment later from your profile.
                    </p>
                </div>
            </div>
        )
    }

    // Assessment phase - show questions
    if (phase === 'assessment') {
        if (loading && questions.length === 0) {
            return (
                <div className="page" style={{ textAlign: 'center', padding: '40px' }}>
                    <div className="loading-spinner" style={{ margin: '0 auto' }} />
                    <p className="text-secondary mt-md">Loading assessment questions...</p>
                </div>
            )
        }

        if (error) {
            return (
                <div className="page" style={{ textAlign: 'center', padding: '20px' }}>
                    <div className="card" style={{ maxWidth: '500px', margin: '0 auto' }}>
                        <p style={{ color: 'var(--error)' }}>{error}</p>
                        <button className="btn btn-primary mt-md" onClick={startAssessment}>
                            Retry
                        </button>
                        <button className="btn btn-secondary mt-sm" onClick={skipAssessment}>
                            Skip Assessment
                        </button>
                    </div>
                </div>
            )
        }

        const currentQuestion = questions[currentQuestionIndex]
        if (!currentQuestion) {
            return (
                <div className="page" style={{ textAlign: 'center', padding: '40px' }}>
                    <div className="loading-spinner" style={{ margin: '0 auto' }} />
                </div>
            )
        }

        const progress = ((currentQuestionIndex + 1) / questions.length) * 100
        const categoryInfo = ASSESSMENT_CATEGORIES.find(c => c.id === currentQuestion.category)

        return (
            <div className="page" style={{ padding: '20px' }}>
                <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
                    {/* Progress bar */}
                    <div style={{ marginBottom: '20px' }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: '8px',
                            fontSize: '0.9rem'
                        }}>
                            <span>{categoryInfo?.icon} {categoryInfo?.name}</span>
                            <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
                        </div>
                        <div style={{
                            height: '8px',
                            background: 'var(--bg-secondary)',
                            borderRadius: '4px',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                width: `${progress}%`,
                                height: '100%',
                                background: 'var(--primary)',
                                transition: 'width 0.3s ease'
                            }} />
                        </div>
                    </div>

                    {/* Question */}
                    <h2 style={{ marginBottom: '24px', fontSize: '1.25rem' }}>
                        {currentQuestion.question}
                    </h2>

                    {/* Options */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {currentQuestion.options.map((option, index) => (
                            <button
                                key={index}
                                className="btn btn-secondary"
                                onClick={() => handleAnswer(option)}
                                style={{
                                    width: '100%',
                                    textAlign: 'left',
                                    padding: '14px 16px'
                                }}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    // Results phase - show assessment results
    if (phase === 'results') {
        return (
            <div className="page" style={{ padding: '20px' }}>
                <div className="card" style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
                    <h1 style={{ marginBottom: '8px' }}>Assessment Complete!</h1>
                    <p className="text-secondary" style={{ marginBottom: '24px' }}>
                        Here's how you did across different categories:
                    </p>

                    {results && (
                        <div style={{ marginBottom: '24px' }}>
                            {Object.entries(results.categoryScores || {}).map(([category, score]) => {
                                const categoryInfo = ASSESSMENT_CATEGORIES.find(c => c.id === category)
                                const percentage = Math.round((score.correct / score.total) * 100)
                                const level = score.initialLevel || 1

                                return (
                                    <div key={category} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '12px',
                                        background: 'var(--bg-secondary)',
                                        borderRadius: '8px',
                                        marginBottom: '8px'
                                    }}>
                                        <span style={{ fontSize: '1.5rem', marginRight: '12px' }}>
                                            {categoryInfo?.icon}
                                        </span>
                                        <div style={{ flex: 1, textAlign: 'left' }}>
                                            <div style={{ fontWeight: 500 }}>{categoryInfo?.name}</div>
                                            <div className="text-secondary" style={{ fontSize: '0.85rem' }}>
                                                {score.correct}/{score.total} correct - Starting Level {level}
                                            </div>
                                        </div>
                                        <div style={{
                                            width: '50px',
                                            height: '50px',
                                            borderRadius: '50%',
                                            background: percentage >= 66 ? 'var(--success)' :
                                                       percentage >= 33 ? 'var(--warning)' : 'var(--error)',
                                            color: 'white',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontWeight: 600
                                        }}>
                                            {percentage}%
                                        </div>
                                    </div>
                                )
                            })}

                            <div style={{
                                marginTop: '16px',
                                padding: '16px',
                                background: 'var(--primary-bg)',
                                borderRadius: '8px'
                            }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--primary)' }}>
                                    {results.totalCorrect}/{results.totalQuestions}
                                </div>
                                <div className="text-secondary">Overall Score</div>
                            </div>
                        </div>
                    )}

                    <button
                        className="btn btn-primary"
                        onClick={finishAssessment}
                        style={{ width: '100%', padding: '14px' }}
                    >
                        Start Learning!
                    </button>
                </div>
            </div>
        )
    }

    return null
}

export default SkillAssessment
