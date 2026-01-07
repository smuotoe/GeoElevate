import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import Breadcrumb from '../components/Breadcrumb'
import Modal from '../components/Modal'
import styles from './GamePlay.module.css'

const QUESTION_TIME = 15
const TOTAL_QUESTIONS = 10

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
 * Game play page component with timer and pause functionality.
 *
 * @returns {React.ReactElement} Game play interface
 */
function GamePlay() {
    const { gameType } = useParams()
    const navigate = useNavigate()
    const { user } = useAuth()
    const formattedGameType = formatGameType(gameType)

    const [gameState, setGameState] = useState('loading')
    const [questions, setQuestions] = useState([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [timeLeft, setTimeLeft] = useState(QUESTION_TIME)
    const [score, setScore] = useState(0)
    const [streak, setStreak] = useState(0)
    const [answers, setAnswers] = useState([])
    const [isPaused, setIsPaused] = useState(false)
    const [selectedAnswer, setSelectedAnswer] = useState(null)
    const [showResult, setShowResult] = useState(false)
    const [error, setError] = useState(null)

    const timerRef = useRef(null)
    const pausedTimeRef = useRef(null)

    const currentQuestion = questions[currentIndex]

    const breadcrumbItems = [
        { label: 'Games', path: '/games' },
        { label: formattedGameType, path: `/games/\${gameType}` },
        { label: 'Play', path: null }
    ]

    const loadQuestions = useCallback(async () => {
        try {
            setGameState('loading')
            setError(null)
            const data = await api.get(`/games/questions?type=\${gameType}&count=\${TOTAL_QUESTIONS}`)

            if (!data.questions || data.questions.length === 0) {
                setError('No questions available for this game type. Please try another game.')
                setGameState('error')
                return
            }

            setQuestions(data.questions)
            setGameState('playing')
            setTimeLeft(QUESTION_TIME)
        } catch (err) {
            setError(err.message)
            setGameState('error')
        }
    }, [gameType])

    useEffect(() => {
        loadQuestions()
    }, [loadQuestions])

    useEffect(() => {
        if (gameState !== 'playing' || isPaused || showResult) {
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
    }, [gameState, isPaused, showResult, currentIndex])

    const handleTimeout = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current)
        }

        setStreak(0)
        setAnswers(prev => [...prev, {
            question: currentQuestion,
            userAnswer: null,
            correctAnswer: currentQuestion.correctAnswer,
            isCorrect: false,
            timeMs: QUESTION_TIME * 1000
        }])

        setShowResult(true)
        setTimeout(moveToNext, 1500)
    }

    const handleAnswer = (answer) => {
        if (showResult || selectedAnswer !== null) return

        if (timerRef.current) {
            clearInterval(timerRef.current)
        }

        const isCorrect = answer === currentQuestion.correctAnswer
        const timeMs = (QUESTION_TIME - timeLeft) * 1000

        setSelectedAnswer(answer)
        setShowResult(true)

        if (isCorrect) {
            const basePoints = 100
            const timeBonus = Math.floor(timeLeft * 10)
            const streakBonus = streak * 20
            setScore(prev => prev + basePoints + timeBonus + streakBonus)
            setStreak(prev => prev + 1)
        } else {
            setStreak(0)
        }

        setAnswers(prev => [...prev, {
            question: currentQuestion,
            userAnswer: answer,
            correctAnswer: currentQuestion.correctAnswer,
            isCorrect,
            timeMs
        }])

        setTimeout(moveToNext, 1500)
    }

    const moveToNext = () => {
        if (currentIndex >= questions.length - 1) {
            setGameState('finished')
            return
        }

        setCurrentIndex(prev => prev + 1)
        setSelectedAnswer(null)
        setShowResult(false)
        setTimeLeft(QUESTION_TIME)
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
    }

    const handleQuit = () => {
        navigate('/games')
    }

    const handleRestart = () => {
        setCurrentIndex(0)
        setScore(0)
        setStreak(0)
        setAnswers([])
        setSelectedAnswer(null)
        setShowResult(false)
        setIsPaused(false)
        loadQuestions()
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
                            <span className={styles.statValue}>{correctCount}/{answers.length}</span>
                            <span className={styles.statLabel}>Correct</span>
                        </div>
                        <div className={styles.stat}>
                            <span className={styles.statValue}>{accuracy}%</span>
                            <span className={styles.statLabel}>Accuracy</span>
                        </div>
                    </div>
                    <div className={styles.buttonGroup}>
                        <button className="btn btn-secondary" onClick={() => navigate('/games')}>
                            Back to Games
                        </button>
                        <button className="btn btn-primary" onClick={handleRestart}>
                            Play Again
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="page">
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
                    style={{ width: `\${(timeLeft / QUESTION_TIME) * 100}%` }}
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

            <div className={styles.optionsGrid}>
                {currentQuestion.options?.map((option, idx) => (
                    <button
                        key={idx}
                        className={`\${styles.optionButton} \${getOptionClass(option)}`}
                        onClick={() => handleAnswer(option)}
                        disabled={showResult}
                    >
                        {option?.startsWith('http') ? (
                            <img src={option} alt={`Option \${idx + 1}`} className={styles.optionImage} />
                        ) : (
                            option
                        )}
                    </button>
                ))}
            </div>

            <Modal
                isOpen={isPaused}
                onClose={handleResume}
                title="Game Paused"
            >
                <div className={styles.pauseContent}>
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
                            onClick={handleQuit}
                        >
                            Quit Game
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={handleResume}
                        >
                            Resume
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}

export default GamePlay
