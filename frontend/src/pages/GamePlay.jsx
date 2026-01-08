import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import Breadcrumb from '../components/Breadcrumb'
import Modal from '../components/Modal'
import styles from './GamePlay.module.css'

const TOTAL_QUESTIONS = 10
const FUZZY_THRESHOLD = 0.75 // 75% similarity required for fuzzy match

// Time limits per difficulty level (in seconds)
const DIFFICULTY_TIME = {
    easy: 20,
    medium: 15,
    hard: 10
}

/**
 * Custom hook to track network connection status.
 *
 * @returns {boolean} True if online, false if offline
 */
function useOnlineStatus() {
    const [isOnline, setIsOnline] = useState(navigator.onLine)

    useEffect(() => {
        const handleOnline = () => setIsOnline(true)
        const handleOffline = () => setIsOnline(false)

        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)

        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [])

    return isOnline
}

/**
 * Format game type string with capitalized first letter.
 *
 * @param {string} gameType - The game type to format
 * @returns {string} Formatted game type
 */
function formatGameType(gameType) {
    return gameType.charAt(0).toUpperCase() + gameType.slice(1)
}

/**
 * Calculate Levenshtein distance between two strings.
 *
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Edit distance between strings
 */
function levenshteinDistance(str1, str2) {
    const m = str1.length
    const n = str2.length
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0))

    for (let i = 0; i <= m; i++) dp[i][0] = i
    for (let j = 0; j <= n; j++) dp[0][j] = j

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (str1[i - 1] === str2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1]
            } else {
                dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
            }
        }
    }
    return dp[m][n]
}

/**
 * Check if typed answer matches correct answer using fuzzy matching.
 *
 * @param {string} typed - User's typed answer
 * @param {string} correct - Correct answer
 * @returns {boolean} True if answer is close enough
 */
function isFuzzyMatch(typed, correct) {
    const typedLower = typed.toLowerCase().trim()
    const correctLower = correct.toLowerCase().trim()

    // Exact match
    if (typedLower === correctLower) return true

    // Calculate similarity ratio
    const distance = levenshteinDistance(typedLower, correctLower)
    const maxLen = Math.max(typedLower.length, correctLower.length)
    const similarity = 1 - (distance / maxLen)

    return similarity >= FUZZY_THRESHOLD
}

/**
 * Game play page component with timer and pause functionality.
 *
 * @returns {React.ReactElement} Game play interface
 */
function GamePlay() {
    const { gameType } = useParams()
    const navigate = useNavigate()
    const { user, checkAuth } = useAuth()
    const formattedGameType = formatGameType(gameType)
    const isOnline = useOnlineStatus()

    const [gameState, setGameState] = useState('mode-select')
    const [inputMode, setInputMode] = useState('choice') // 'choice' or 'typing'
    const [questionMode, setQuestionMode] = useState('') // game-specific direction mode
    const [questions, setQuestions] = useState([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [timeLeft, setTimeLeft] = useState(15) // Default, updated on game start
    const [score, setScore] = useState(0)
    const [streak, setStreak] = useState(0)
    const [answers, setAnswers] = useState([])
    const [isPaused, setIsPaused] = useState(false)
    const [showQuitConfirm, setShowQuitConfirm] = useState(false)
    const [selectedAnswer, setSelectedAnswer] = useState(null)
    const [typedAnswer, setTypedAnswer] = useState('')
    const [showResult, setShowResult] = useState(false)
    const [error, setError] = useState(null)
    const [sessionId, setSessionId] = useState(null)
    const [wasOffline, setWasOffline] = useState(false)
    const [regions, setRegions] = useState([])
    const [selectedRegion, setSelectedRegion] = useState('')
    const [difficulty, setDifficulty] = useState('medium')
    const questionTime = DIFFICULTY_TIME[difficulty] || 15
    const [gameStats, setGameStats] = useState({ xpEarned: 0, avgTimeMs: 0 })
    const [showReview, setShowReview] = useState(false)
    const [showShareDialog, setShowShareDialog] = useState(false)
    const [shareMessage, setShareMessage] = useState('')

    const timerRef = useRef(null)
    const pausedTimeRef = useRef(null)
    const processingRef = useRef(false)
    const inputRef = useRef(null)
    const offlinePausedRef = useRef(false)

    const currentQuestion = questions[currentIndex]

    const breadcrumbItems = [
        { label: 'Games', path: '/games' },
        { label: formattedGameType, path: `/games/${gameType}` },
        { label: 'Play', path: null }
    ]

    // Fetch available regions on mount
    useEffect(() => {
        async function fetchRegions() {
            try {
                const data = await api.get('/games/regions')
                setRegions(data.regions || [])
            } catch (err) {
                console.error('Failed to load regions:', err)
            }
        }
        fetchRegions()
    }, [])

    // Set default question mode based on game type
    useEffect(() => {
        if (gameType === 'flags' && !questionMode) {
            setQuestionMode('flag-to-country')
        } else if (gameType === 'capitals' && !questionMode) {
            setQuestionMode('country-to-capital')
        } else if (gameType === 'maps' && !questionMode) {
            setQuestionMode('identify-highlighted')
        } else if (gameType === 'languages' && !questionMode) {
            setQuestionMode('country-to-languages')
        }
    }, [gameType, questionMode])

    const loadQuestions = useCallback(async () => {
        try {
            setGameState('loading')
            setError(null)
            const regionParam = selectedRegion ? `&region=${selectedRegion}` : ''
            const modeParam = questionMode ? `&mode=${questionMode}` : ''
            const difficultyParam = `&difficulty=${difficulty}`
            const data = await api.get(`/games/questions?type=${gameType}&count=${TOTAL_QUESTIONS}${regionParam}${modeParam}${difficultyParam}`)

            if (!data.questions || data.questions.length === 0) {
                setError('No questions available for this game type. Please try another game.')
                setGameState('error')
                return
            }

            // Create a game session
            if (user) {
                try {
                    const sessionData = await api.post('/games/sessions', {
                        gameType,
                        gameMode: 'solo',
                        difficulty: 'medium'
                    })
                    setSessionId(sessionData.sessionId)
                } catch (sessionErr) {
                    console.error('Failed to create session:', sessionErr)
                }
            }

            setQuestions(data.questions)
            setGameState('playing')
            setTimeLeft(questionTime)
        } catch (err) {
            setError(err.message)
            setGameState('error')
        }
    }, [gameType, user, selectedRegion, questionMode, difficulty, questionTime])

    // Start game with selected mode
    const startGame = (mode) => {
        setInputMode(mode)
        loadQuestions()
    }

    // Focus input when in typing mode and question changes
    useEffect(() => {
        if (inputMode === 'typing' && gameState === 'playing' && inputRef.current) {
            inputRef.current.focus()
        }
    }, [currentIndex, gameState, inputMode])

    // Handle offline/online transitions during game
    useEffect(() => {
        if (gameState !== 'playing') return

        if (!isOnline && !offlinePausedRef.current) {
            // Went offline - pause the game
            offlinePausedRef.current = true
            if (timerRef.current) {
                clearInterval(timerRef.current)
            }
            pausedTimeRef.current = timeLeft
            setIsPaused(true)
            setWasOffline(true)
        } else if (isOnline && offlinePausedRef.current) {
            // Came back online - can resume
            offlinePausedRef.current = false
        }
    }, [isOnline, gameState, timeLeft])

    useEffect(() => {
        if (gameState !== 'playing' || isPaused || showResult || showQuitConfirm) {
            return
        }

        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    handleTimeout()
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current)
            }
        }
    }, [gameState, isPaused, showResult, showQuitConfirm, currentIndex])

    const handleTimeout = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current)
        }

        if (!currentQuestion) {
            setGameState('finished')
            return
        }

        setStreak(0)
        const newAnswer = {
            question: currentQuestion,
            userAnswer: null,
            correctAnswer: currentQuestion.correctAnswer,
            isCorrect: false,
            timeMs: questionTime * 1000
        }
        const newAnswers = [...answers, newAnswer]
        setAnswers(newAnswers)

        setShowResult(true)
        setTimeout(() => moveToNext(newAnswers, score), 1500)
    }

    const handleAnswer = (answer) => {
        if (showResult || selectedAnswer !== null || !currentQuestion) return

        if (timerRef.current) {
            clearInterval(timerRef.current)
        }

        const isCorrect = answer === currentQuestion.correctAnswer
        const timeMs = (questionTime - timeLeft) * 1000

        setSelectedAnswer(answer)
        setShowResult(true)

        let newScore = score
        if (isCorrect) {
            const basePoints = 100
            const timeBonus = Math.floor(timeLeft * 10)
            const streakBonus = streak * 20
            newScore = score + basePoints + timeBonus + streakBonus
            setScore(newScore)
            setStreak(prev => prev + 1)
        } else {
            setStreak(0)
        }

        const newAnswer = {
            question: currentQuestion,
            userAnswer: answer,
            correctAnswer: currentQuestion.correctAnswer,
            isCorrect,
            timeMs
        }

        const newAnswers = [...answers, newAnswer]
        setAnswers(newAnswers)

        // Pass the updated data directly to avoid stale closure issues
        setTimeout(() => moveToNext(newAnswers, newScore), 1500)
    }

    const handleTypingSubmit = (e) => {
        e.preventDefault()
        if (showResult || !currentQuestion || !typedAnswer.trim()) return

        if (timerRef.current) {
            clearInterval(timerRef.current)
        }

        const isCorrect = isFuzzyMatch(typedAnswer, currentQuestion.correctAnswer)
        const timeMs = (questionTime - timeLeft) * 1000

        setSelectedAnswer(typedAnswer)
        setShowResult(true)

        let newScore = score
        if (isCorrect) {
            const basePoints = 100
            const timeBonus = Math.floor(timeLeft * 10)
            const streakBonus = streak * 20
            newScore = score + basePoints + timeBonus + streakBonus
            setScore(newScore)
            setStreak(prev => prev + 1)
        } else {
            setStreak(0)
        }

        const newAnswer = {
            question: currentQuestion,
            userAnswer: typedAnswer,
            correctAnswer: currentQuestion.correctAnswer,
            isCorrect,
            timeMs
        }

        const newAnswers = [...answers, newAnswer]
        setAnswers(newAnswers)
        setTypedAnswer('')

        setTimeout(() => moveToNext(newAnswers, newScore), 1500)
    }

    const moveToNext = async (currentAnswers, currentScore) => {
        // Prevent duplicate processing (React StrictMode double-render issue)
        if (processingRef.current) {
            return
        }

        // Use passed answers array to check if game is complete
        const answersToUse = currentAnswers || answers
        const scoreToUse = currentScore !== undefined ? currentScore : score
        const isLastQuestion = answersToUse.length >= questions.length

        if (isLastQuestion) {
            processingRef.current = true
            // Game finished - save the session
            if (sessionId && user) {
                const correctCount = answersToUse.filter(a => a.isCorrect).length
                const totalAnswers = answersToUse.length
                const avgTimeMs = Math.round(
                    answersToUse.reduce((sum, a) => sum + a.timeMs, 0) / totalAnswers
                )
                const xpEarned = Math.round(scoreToUse * 0.1)

                setGameStats({ xpEarned, avgTimeMs })

                try {
                    await api.patch(`/games/sessions/${sessionId}`, {
                        score: scoreToUse,
                        xpEarned,
                        correctCount,
                        averageTimeMs: avgTimeMs,
                        answers: answersToUse
                    })
                    // Refresh user data to update streak and XP in context
                    await checkAuth()
                } catch (saveErr) {
                    console.error('Failed to save session:', saveErr)
                }
            }
            setGameState('finished')
            processingRef.current = false
            return
        }

        setCurrentIndex(prev => prev + 1)
        setSelectedAnswer(null)
        setShowResult(false)
        setTimeLeft(questionTime)
    }

    const handlePause = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current)
        }
        pausedTimeRef.current = timeLeft
        setIsPaused(true)
    }

    const handleResume = () => {
        setIsPaused(false)
        setShowQuitConfirm(false)
    }

    const handleQuitClick = () => {
        setShowQuitConfirm(true)
    }

    const handleQuitCancel = () => {
        setShowQuitConfirm(false)
    }

    const handleQuitConfirm = () => {
        navigate('/games')
    }

    const handleRestart = () => {
        processingRef.current = false
        setCurrentIndex(0)
        setScore(0)
        setStreak(0)
        setAnswers([])
        setSelectedAnswer(null)
        setTypedAnswer('')
        setShowResult(false)
        setIsPaused(false)
        setShowQuitConfirm(false)
        setSessionId(null)
        setShowShareDialog(false)
        setShareMessage('')
        loadQuestions()
    }

    /**
     * Handle share button click - generates shareable content.
     */
    const handleShare = () => {
        const correctCount = answers.filter(a => a.isCorrect).length
        const accuracy = Math.round((correctCount / answers.length) * 100)
        const message = `I just scored ${score} points in ${formattedGameType} on GeoElevate! ${correctCount}/${answers.length} correct (${accuracy}% accuracy). Can you beat my score?`
        setShareMessage(message)
        setShowShareDialog(true)
    }

    /**
     * Copy share message to clipboard.
     */
    const handleCopyShare = async () => {
        try {
            await navigator.clipboard.writeText(shareMessage)
            alert('Copied to clipboard!')
        } catch (err) {
            console.error('Failed to copy:', err)
        }
    }

    /**
     * Share via native share API if available.
     */
    const handleNativeShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'GeoElevate Results',
                    text: shareMessage,
                    url: window.location.origin
                })
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error('Failed to share:', err)
                }
            }
        }
    }

    const getOptionClass = (option) => {
        if (!showResult) {
            return selectedAnswer === option ? styles.selected : ''
        }

        if (option === currentQuestion.correctAnswer) {
            return styles.correct
        }

        if (option === selectedAnswer && option !== currentQuestion.correctAnswer) {
            return styles.incorrect
        }

        return styles.disabled
    }

    if (gameState === 'mode-select') {
        return (
            <div className="page">
                <div className="page-header">
                    <Breadcrumb items={breadcrumbItems} />
                    <h1 className="page-title">{formattedGameType}</h1>
                </div>
                <div className="card">
                    <h2 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>
                        Select Game Mode
                    </h2>
                    <p className="text-secondary" style={{ marginBottom: '24px' }}>
                        Choose how you want to answer questions:
                    </p>
                    <div className={styles.modeButtons}>
                        <button
                            className="btn btn-primary"
                            onClick={() => startGame('choice')}
                            style={{ flex: 1, padding: '16px' }}
                        >
                            <span style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }}>
                                A B C D
                            </span>
                            Multiple Choice
                        </button>
                        <button
                            className="btn btn-secondary"
                            onClick={() => startGame('typing')}
                            style={{ flex: 1, padding: '16px' }}
                        >
                            <span style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }}>
                                ...
                            </span>
                            Type Answer
                        </button>
                    </div>
                </div>
                {(gameType === 'flags' || gameType === 'capitals' || gameType === 'maps' || gameType === 'languages') && (
                    <div className="card" style={{ marginTop: '16px' }}>
                        <h3 style={{ marginBottom: '12px', color: 'var(--text-primary)' }}>
                            Question Direction
                        </h3>
                        <p className="text-secondary" style={{ marginBottom: '16px' }}>
                            Choose what you want to identify:
                        </p>
                        <div className={styles.modeButtons}>
                            {gameType === 'flags' && (
                                <>
                                    <button
                                        className={`btn ${questionMode === 'flag-to-country' ? 'btn-primary' : 'btn-secondary'}`}
                                        onClick={() => setQuestionMode('flag-to-country')}
                                        style={{ flex: 1, padding: '12px' }}
                                    >
                                        Flag to Country
                                        <span style={{ display: 'block', fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>
                                            See flag, name country
                                        </span>
                                    </button>
                                    <button
                                        className={`btn ${questionMode === 'country-to-flag' ? 'btn-primary' : 'btn-secondary'}`}
                                        onClick={() => setQuestionMode('country-to-flag')}
                                        style={{ flex: 1, padding: '12px' }}
                                    >
                                        Country to Flag
                                        <span style={{ display: 'block', fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>
                                            See country, pick flag
                                        </span>
                                    </button>
                                </>
                            )}
                            {gameType === 'capitals' && (
                                <>
                                    <button
                                        className={`btn ${questionMode === 'country-to-capital' ? 'btn-primary' : 'btn-secondary'}`}
                                        onClick={() => setQuestionMode('country-to-capital')}
                                        style={{ flex: 1, padding: '12px' }}
                                    >
                                        Country to Capital
                                        <span style={{ display: 'block', fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>
                                            See country, name capital
                                        </span>
                                    </button>
                                    <button
                                        className={`btn ${questionMode === 'capital-to-country' ? 'btn-primary' : 'btn-secondary'}`}
                                        onClick={() => setQuestionMode('capital-to-country')}
                                        style={{ flex: 1, padding: '12px' }}
                                    >
                                        Capital to Country
                                        <span style={{ display: 'block', fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>
                                            See capital, name country
                                        </span>
                                    </button>
                                </>
                            )}
                            {gameType === 'maps' && (
                                <>
                                    <button
                                        className={`btn ${questionMode === 'identify-highlighted' ? 'btn-primary' : 'btn-secondary'}`}
                                        onClick={() => setQuestionMode('identify-highlighted')}
                                        style={{ flex: 1, padding: '12px' }}
                                    >
                                        Identify Country
                                        <span style={{ display: 'block', fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>
                                            See code, name country
                                        </span>
                                    </button>
                                    <button
                                        className={`btn ${questionMode === 'click-on-country' ? 'btn-primary' : 'btn-secondary'}`}
                                        onClick={() => setQuestionMode('click-on-country')}
                                        style={{ flex: 1, padding: '12px' }}
                                    >
                                        Find Country
                                        <span style={{ display: 'block', fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>
                                            See name, pick code
                                        </span>
                                    </button>
                                </>
                            )}
                            {gameType === 'languages' && (
                                <>
                                    <button
                                        className={`btn ${questionMode === 'country-to-languages' ? 'btn-primary' : 'btn-secondary'}`}
                                        onClick={() => setQuestionMode('country-to-languages')}
                                        style={{ flex: 1, padding: '12px' }}
                                    >
                                        Country to Language
                                        <span style={{ display: 'block', fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>
                                            See country, pick language
                                        </span>
                                    </button>
                                    <button
                                        className={`btn ${questionMode === 'language-to-countries' ? 'btn-primary' : 'btn-secondary'}`}
                                        onClick={() => setQuestionMode('language-to-countries')}
                                        style={{ flex: 1, padding: '12px' }}
                                    >
                                        Language to Country
                                        <span style={{ display: 'block', fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>
                                            See language, pick country
                                        </span>
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                )}
                <div className="card" style={{ marginTop: '16px' }}>
                    <h3 style={{ marginBottom: '12px', color: 'var(--text-primary)' }}>
                        Difficulty Level
                    </h3>
                    <p className="text-secondary" style={{ marginBottom: '16px' }}>
                        Choose how challenging you want the game to be
                    </p>
                    <div className={styles.modeButtons}>
                        <button
                            className={`btn ${difficulty === 'easy' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setDifficulty('easy')}
                            style={{ flex: 1, padding: '12px' }}
                        >
                            Easy
                            <span style={{ display: 'block', fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>
                                Well-known countries
                            </span>
                        </button>
                        <button
                            className={`btn ${difficulty === 'medium' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setDifficulty('medium')}
                            style={{ flex: 1, padding: '12px' }}
                        >
                            Medium
                            <span style={{ display: 'block', fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>
                                Mixed difficulty
                            </span>
                        </button>
                        <button
                            className={`btn ${difficulty === 'hard' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setDifficulty('hard')}
                            style={{ flex: 1, padding: '12px' }}
                        >
                            Hard
                            <span style={{ display: 'block', fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>
                                Less familiar countries
                            </span>
                        </button>
                    </div>
                </div>
                <div className="card" style={{ marginTop: '16px' }}>
                    <h3 style={{ marginBottom: '12px', color: 'var(--text-primary)' }}>
                        Filter by Region
                    </h3>
                    <p className="text-secondary" style={{ marginBottom: '16px' }}>
                        Optional: Focus on a specific continent
                    </p>
                    <select
                        id="regionFilter"
                        aria-label="Filter by Region"
                        value={selectedRegion}
                        onChange={(e) => setSelectedRegion(e.target.value)}
                        className="input"
                        style={{
                            width: '100%',
                            padding: '12px',
                            borderRadius: '8px',
                            backgroundColor: 'var(--surface)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border)',
                            fontSize: '16px'
                        }}
                    >
                        <option value="">All Regions</option>
                        {regions.map(region => (
                            <option key={region.id} value={region.name}>
                                {region.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
        )
    }

    if (gameState === 'loading') {
        return (
            <div className="page">
                <div className="page-header">
                    <Breadcrumb items={breadcrumbItems} />
                    <h1 className="page-title">{formattedGameType}</h1>
                </div>
                <div className="card">
                    <p className="text-secondary">Loading questions...</p>
                </div>
            </div>
        )
    }

    if (gameState === 'error') {
        return (
            <div className="page">
                <div className="page-header">
                    <Breadcrumb items={breadcrumbItems} />
                    <h1 className="page-title">{formattedGameType}</h1>
                </div>
                <div className="card">
                    <p className="text-error">{error}</p>
                    <div className={styles.buttonGroup}>
                        <button className="btn btn-secondary" onClick={() => navigate('/games')}>
                            Back to Games
                        </button>
                        <button className="btn btn-primary" onClick={loadQuestions}>
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    if (gameState === 'finished') {
        const correctCount = answers.filter(a => a.isCorrect).length
        const accuracy = Math.round((correctCount / answers.length) * 100)
        const avgTimeSec = (gameStats.avgTimeMs / 1000).toFixed(1)
        const wrongAnswers = answers.filter(a => !a.isCorrect)

        return (
            <div className="page">
                <div className="page-header">
                    <Breadcrumb items={breadcrumbItems} />
                    <h1 className="page-title">Game Complete!</h1>
                </div>
                <div className={styles.resultsCard}>
                    <div className={styles.scoreDisplay}>
                        <span className={styles.scoreValue}>{score}</span>
                        <span className={styles.scoreLabel}>Points</span>
                    </div>
                    <div className={styles.statsGrid}>
                        <div className={styles.stat}>
                            <span className={styles.statValue}>+{gameStats.xpEarned}</span>
                            <span className={styles.statLabel}>XP Earned</span>
                        </div>
                        <div className={styles.stat}>
                            <span className={styles.statValue}>{correctCount}/{answers.length}</span>
                            <span className={styles.statLabel}>Correct</span>
                        </div>
                        <div className={styles.stat}>
                            <span className={styles.statValue}>{accuracy}%</span>
                            <span className={styles.statLabel}>Accuracy</span>
                        </div>
                        <div className={styles.stat}>
                            <span className={styles.statValue}>{avgTimeSec}s</span>
                            <span className={styles.statLabel}>Avg Time</span>
                        </div>
                    </div>
                    <div className={styles.buttonGroup}>
                        <button className="btn btn-secondary" onClick={() => navigate('/games')}>
                            Back to Games
                        </button>
                        {wrongAnswers.length > 0 && (
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowReview(!showReview)}
                            >
                                {showReview ? 'Hide Review' : 'Review Mistakes'}
                            </button>
                        )}
                        <button className="btn btn-secondary" onClick={handleShare}>
                            Share
                        </button>
                        <button className="btn btn-primary" onClick={handleRestart}>
                            Play Again
                        </button>
                    </div>
                </div>

                <Modal
                    isOpen={showShareDialog}
                    onClose={() => setShowShareDialog(false)}
                    title="Share Your Results"
                >
                    <div className={styles.shareContent}>
                        <p className={styles.shareMessage}>{shareMessage}</p>
                        <div className={styles.shareButtons}>
                            <button className="btn btn-secondary" onClick={handleCopyShare}>
                                Copy to Clipboard
                            </button>
                            {navigator.share && (
                                <button className="btn btn-primary" onClick={handleNativeShare}>
                                    Share
                                </button>
                            )}
                        </div>
                    </div>
                </Modal>

                {showReview && wrongAnswers.length > 0 && (
                    <div className={styles.reviewSection}>
                        <h3 className={styles.reviewTitle}>Questions You Missed</h3>
                        <div className={styles.reviewList}>
                            {wrongAnswers.map((answer, idx) => {
                                const questionText = answer.question.prompt || answer.question.question || answer.question.correctAnswer
                                const isQuestionImage = questionText?.startsWith('http')
                                const isUserAnswerImage = answer.userAnswer?.startsWith('http')
                                const isCorrectAnswerImage = answer.correctAnswer?.startsWith('http')

                                return (
                                    <div key={idx} className={styles.reviewItem}>
                                        <div className={styles.reviewQuestion}>
                                            <span className={styles.reviewNumber}>Q{answers.indexOf(answer) + 1}.</span>
                                            {isQuestionImage ? (
                                                <img src={questionText} alt="Question" className={styles.reviewImage} />
                                            ) : (
                                                <span>{questionText}</span>
                                            )}
                                        </div>
                                        <div className={styles.reviewAnswers}>
                                            <div className={styles.yourAnswer}>
                                                <span className={styles.answerLabel}>Your answer:</span>
                                                {answer.userAnswer ? (
                                                    isUserAnswerImage ? (
                                                        <img src={answer.userAnswer} alt="Your answer" className={styles.reviewAnswerImage} />
                                                    ) : (
                                                        <span className={styles.wrongAnswer}>{answer.userAnswer}</span>
                                                    )
                                                ) : (
                                                    <span className={styles.wrongAnswer}>(No answer)</span>
                                                )}
                                            </div>
                                            <div className={styles.correctAnswerRow}>
                                                <span className={styles.answerLabel}>Correct answer:</span>
                                                {isCorrectAnswerImage ? (
                                                    <img src={answer.correctAnswer} alt="Correct answer" className={styles.reviewAnswerImage} />
                                                ) : (
                                                    <span className={styles.correctAnswer}>{answer.correctAnswer}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>
        )
    }

    // Guard against undefined currentQuestion during state transitions
    if (!currentQuestion) {
        return (
            <div className="page">
                <div className="card">
                    <p className="text-secondary">Loading next question...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="page">
            {!isOnline && (
                <div className={styles.offlineIndicator}>
                    <span>!</span> No Connection
                </div>
            )}
            <div className={styles.gameHeader}>
                <div className={styles.progress}>
                    <span>Question {currentIndex + 1}/{questions.length}</span>
                </div>
                <button
                    className={styles.pauseButton}
                    onClick={handlePause}
                    aria-label="Pause game"
                >
                    ||
                </button>
            </div>

            <div className={styles.timerBar}>
                <div
                    className={styles.timerFill}
                    style={{ width: `${(timeLeft / questionTime) * 100}%` }}
                />
            </div>

            <div className={styles.scoreBar}>
                <div className={styles.scoreInfo}>
                    <span>Score: {score}</span>
                </div>
                {streak > 1 && (
                    <div className={styles.streakBadge}>
                        {streak}x Streak!
                    </div>
                )}
                <div className={styles.timer}>
                    {timeLeft}s
                </div>
            </div>

            <div className={styles.questionCard}>
                {currentQuestion.prompt?.startsWith('http') ? (
                    <img
                        src={currentQuestion.prompt}
                        alt="Question"
                        className={styles.questionImage}
                    />
                ) : (
                    <h2 className={styles.questionText}>
                        {currentQuestion.prompt}
                    </h2>
                )}
            </div>

            {inputMode === 'choice' ? (
                <div className={styles.optionsGrid}>
                    {currentQuestion.options?.map((option, idx) => (
                        <button
                            key={idx}
                            className={`${styles.optionButton} ${getOptionClass(option)}`}
                            onClick={() => handleAnswer(option)}
                            disabled={showResult}
                        >
                            {option?.startsWith('http') ? (
                                <img src={option} alt={`Option ${idx + 1}`} className={styles.optionImage} />
                            ) : (
                                option
                            )}
                        </button>
                    ))}
                </div>
            ) : (
                <div className={styles.typingContainer}>
                    <form onSubmit={handleTypingSubmit}>
                        <input
                            ref={inputRef}
                            type="text"
                            className={`${styles.typingInput} ${showResult ? (isFuzzyMatch(selectedAnswer || '', currentQuestion.correctAnswer) ? styles.correct : styles.incorrect) : ''}`}
                            value={typedAnswer}
                            onChange={(e) => setTypedAnswer(e.target.value)}
                            placeholder="Type your answer..."
                            disabled={showResult}
                            autoComplete="off"
                            autoFocus
                        />
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={showResult || !typedAnswer.trim()}
                            style={{ marginTop: '12px', width: '100%' }}
                        >
                            Submit Answer
                        </button>
                    </form>
                    {showResult && (
                        <div className={styles.typingResult}>
                            <p className={isFuzzyMatch(selectedAnswer || '', currentQuestion.correctAnswer) ? styles.correctText : styles.incorrectText}>
                                {isFuzzyMatch(selectedAnswer || '', currentQuestion.correctAnswer)
                                    ? 'Correct!'
                                    : `Wrong! The answer was: ${currentQuestion.correctAnswer}`}
                            </p>
                        </div>
                    )}
                </div>
            )}

            <Modal
                isOpen={isPaused && !showQuitConfirm}
                onClose={isOnline ? handleResume : undefined}
                title={!isOnline ? "Connection Lost" : "Game Paused"}
            >
                <div className={styles.pauseContent}>
                    {!isOnline && (
                        <div className={styles.offlineWarning}>
                            <span className={styles.offlineIcon}>!</span>
                            <p>You are currently offline. The game will resume when your connection is restored.</p>
                        </div>
                    )}
                    <p className={styles.pauseInfo}>
                        Question {currentIndex + 1} of {questions.length}
                    </p>
                    <p className={styles.pauseInfo}>
                        Current Score: {score}
                    </p>
                    <p className={styles.pauseInfo}>
                        Time Remaining: {timeLeft}s
                    </p>
                    <div className={styles.pauseButtons}>
                        <button
                            className="btn btn-secondary"
                            onClick={handleQuitClick}
                        >
                            Quit Game
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={handleResume}
                            disabled={!isOnline}
                        >
                            {isOnline ? 'Resume' : 'Waiting...'}
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={showQuitConfirm}
                onClose={handleQuitCancel}
                title="Quit Game?"
            >
                <div className={styles.pauseContent}>
                    <p className={styles.pauseInfo}>
                        Are you sure you want to quit?
                    </p>
                    <p className={styles.pauseInfo}>
                        Your progress will not be saved.
                    </p>
                    <div className={styles.pauseButtons}>
                        <button
                            className="btn btn-secondary"
                            onClick={handleQuitCancel}
                        >
                            Cancel
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={handleQuitConfirm}
                        >
                            Quit
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}

export default GamePlay
