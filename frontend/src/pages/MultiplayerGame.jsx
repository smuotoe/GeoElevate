import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useAudio } from '../context/AudioContext'
import { api } from '../utils/api'
import styles from './GamePlay.module.css'

const QUESTION_TIME = 15 // seconds per question in multiplayer

/**
 * Multiplayer game component with real-time WebSocket synchronization.
 *
 * @returns {React.ReactElement} Multiplayer game interface
 */
function MultiplayerGame() {
    const { gameType } = useParams()
    const [searchParams] = useSearchParams()
    const matchId = searchParams.get('match')
    const navigate = useNavigate()
    const { user } = useAuth()
    const token = localStorage.getItem('accessToken')
    const { playSound } = useAudio()

    const [gameState, setGameState] = useState('connecting') // connecting, waiting, playing, results, finished
    const [currentQuestion, setCurrentQuestion] = useState(null)
    const [questionIndex, setQuestionIndex] = useState(0)
    const [totalQuestions, setTotalQuestions] = useState(10)
    const [timeLeft, setTimeLeft] = useState(QUESTION_TIME)
    const [score, setScore] = useState(0)
    const [opponentScore, setOpponentScore] = useState(0)
    const [opponentAnswered, setOpponentAnswered] = useState(false)
    const [selectedAnswer, setSelectedAnswer] = useState(null)
    const [showResult, setShowResult] = useState(false)
    const [lastQuestionResult, setLastQuestionResult] = useState(null)
    const [match, setMatch] = useState(null)
    const [error, setError] = useState(null)
    const [winnerId, setWinnerId] = useState(null)
    const [isTie, setIsTie] = useState(false)
    const [isRequestingRematch, setIsRequestingRematch] = useState(false)

    const wsRef = useRef(null)
    const timerRef = useRef(null)
    const questionStartTimeRef = useRef(null)
    const mountedRef = useRef(true)
    const connectionEstablishedRef = useRef(false)

    /**
     * Get WebSocket URL based on environment.
     *
     * @returns {string} WebSocket URL
     */
    const getWsUrl = useCallback(() => {
        const wsPort = 3007 // WebSocket server port (matches backend WS_PORT)
        const wsHost = window.location.hostname
        return `ws://${wsHost}:${wsPort}?token=${token}`
    }, [token])

    // Fetch match details
    useEffect(() => {
        async function fetchMatch() {
            if (!matchId) return
            try {
                const response = await api.get(`/multiplayer/matches/${matchId}`)
                setMatch(response.match)
            } catch (err) {
                setError(err.message)
            }
        }
        fetchMatch()
    }, [matchId])

    // Initialize WebSocket connection
    useEffect(() => {
        if (!matchId || !token) return

        mountedRef.current = true
        connectionEstablishedRef.current = false

        const ws = new WebSocket(getWsUrl())
        wsRef.current = ws

        ws.onopen = () => {
            if (!mountedRef.current) return
            console.log('WebSocket connected')
            connectionEstablishedRef.current = true
            // Join the match
            ws.send(JSON.stringify({
                type: 'join_match',
                matchId: parseInt(matchId, 10)
            }))
        }

        ws.onmessage = (event) => {
            if (!mountedRef.current) return
            const message = JSON.parse(event.data)
            handleWebSocketMessage(message)
        }

        ws.onerror = (err) => {
            // Only show error if we're mounted and had a real connection
            // StrictMode cleanup causes aborted connections that trigger onerror
            if (!mountedRef.current) return
            console.error('WebSocket error:', err)
            if (connectionEstablishedRef.current) {
                setError('Connection error. Please try again.')
            }
        }

        ws.onclose = (event) => {
            if (!mountedRef.current) return
            console.log('WebSocket closed', event.code, event.reason)
            // Only show error if we had a connection and it wasn't a clean close
            if (connectionEstablishedRef.current && event.code !== 1000 && event.code !== 1001) {
                setError('Connection lost. Please refresh the page.')
            }
        }

        return () => {
            mountedRef.current = false
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: 'leave_match',
                    matchId: parseInt(matchId, 10)
                }))
            }
            ws.close()
            if (timerRef.current) {
                clearInterval(timerRef.current)
            }
        }
    }, [matchId, token, getWsUrl])

    /**
     * Handle incoming WebSocket messages.
     *
     * @param {object} message - Parsed WebSocket message
     */
    const handleWebSocketMessage = useCallback((message) => {
        switch (message.type) {
            case 'match_joined':
                setTotalQuestions(message.totalQuestions)
                setGameState('waiting')
                break

            case 'waiting_for_opponent':
                setGameState('waiting')
                break

            case 'match_start':
                setCurrentQuestion(message.question)
                setQuestionIndex(message.questionIndex)
                setTotalQuestions(message.totalQuestions)
                setGameState('playing')
                setTimeLeft(QUESTION_TIME)
                questionStartTimeRef.current = Date.now()
                startTimer()
                break

            case 'opponent_answered':
                setOpponentAnswered(true)
                break

            case 'question_results':
                handleQuestionResults(message)
                break

            case 'next_question':
                setCurrentQuestion(message.question)
                setQuestionIndex(message.questionIndex)
                setSelectedAnswer(null)
                setShowResult(false)
                setOpponentAnswered(false)
                setTimeLeft(QUESTION_TIME)
                questionStartTimeRef.current = Date.now()
                startTimer()
                break

            case 'match_end':
                handleMatchEnd(message)
                break

            case 'opponent_left':
                setError('Your opponent left the match.')
                setGameState('finished')
                break

            case 'error':
                setError(message.message)
                break

            default:
                console.log('Unknown message type:', message.type)
        }
    }, [])

    /**
     * Start the question timer.
     */
    const startTimer = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current)
        }

        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    // Auto-submit when time runs out
                    handleTimeout()
                    return 0
                }
                return prev - 1
            })
        }, 1000)
    }, [])

    /**
     * Handle question timeout.
     */
    const handleTimeout = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current)
        }

        if (!selectedAnswer && wsRef.current?.readyState === WebSocket.OPEN) {
            const timeMs = Date.now() - questionStartTimeRef.current
            wsRef.current.send(JSON.stringify({
                type: 'submit_answer',
                matchId: parseInt(matchId, 10),
                questionIndex,
                answer: null,
                timeMs
            }))
            setSelectedAnswer('timeout')
        }
    }, [matchId, questionIndex, selectedAnswer])

    /**
     * Handle question results from server.
     *
     * @param {object} message - Results message
     */
    const handleQuestionResults = useCallback((message) => {
        if (timerRef.current) {
            clearInterval(timerRef.current)
        }

        setLastQuestionResult({
            correctAnswer: message.correctAnswer,
            results: message.results
        })
        setShowResult(true)

        // Update scores
        const myResult = message.results[user?.id]
        const opponentId = Object.keys(message.results).find(id => parseInt(id, 10) !== user?.id)
        const opponentResult = message.results[opponentId]

        if (myResult) {
            setScore(message.scores[user?.id] || 0)
            if (myResult.isCorrect) {
                playSound('correct')
            } else {
                playSound('incorrect')
            }
        }
        if (opponentResult) {
            setOpponentScore(message.scores[opponentId] || 0)
        }
    }, [user?.id, playSound])

    /**
     * Handle match end.
     *
     * @param {object} message - Match end message
     */
    const handleMatchEnd = useCallback((message) => {
        if (timerRef.current) {
            clearInterval(timerRef.current)
        }

        setWinnerId(message.winnerId)
        setIsTie(message.isTie)
        setScore(message.scores[user?.id] || 0)

        const opponentId = Object.keys(message.scores).find(id => parseInt(id, 10) !== user?.id)
        setOpponentScore(message.scores[opponentId] || 0)

        setGameState('finished')
    }, [user?.id])

    /**
     * Handle answer selection.
     *
     * @param {string} answer - Selected answer
     */
    const handleAnswer = (answer) => {
        if (selectedAnswer !== null || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            return
        }

        if (timerRef.current) {
            clearInterval(timerRef.current)
        }

        const timeMs = Date.now() - questionStartTimeRef.current
        setSelectedAnswer(answer)

        wsRef.current.send(JSON.stringify({
            type: 'submit_answer',
            matchId: parseInt(matchId, 10),
            questionIndex,
            answer,
            timeMs
        }))
    }

    /**
     * Get CSS class for option button.
     *
     * @param {string} option - Option value
     * @returns {string} CSS class
     */
    const getOptionClass = (option) => {
        if (!showResult) {
            return selectedAnswer === option ? styles.selected : ''
        }

        if (option === lastQuestionResult?.correctAnswer) {
            return styles.correct
        }

        if (option === selectedAnswer && option !== lastQuestionResult?.correctAnswer) {
            return styles.incorrect
        }

        return styles.disabled
    }

    /**
     * Get opponent name from match data.
     *
     * @returns {string} Opponent name
     */
    const getOpponentName = () => {
        if (!match || !user) return 'Opponent'
        return match.challenger_id === user.id
            ? match.opponent_name
            : match.challenger_name
    }

    /**
     * Get opponent ID from match data.
     *
     * @returns {number|null} Opponent user ID
     */
    const getOpponentId = () => {
        if (!match || !user) return null
        return match.challenger_id === user.id
            ? match.opponent_id
            : match.challenger_id
    }

    /**
     * Handle rematch request.
     * Sends a new challenge to the same opponent with the same game type.
     */
    const handleRematch = async () => {
        const opponentId = getOpponentId()
        if (!opponentId) return

        setIsRequestingRematch(true)
        try {
            const response = await api.post('/multiplayer/challenge', {
                opponentId,
                gameType
            })
            navigate(`/multiplayer/lobby/${response.matchId}`)
        } catch (err) {
            setError(err.message || 'Failed to send rematch request')
            setIsRequestingRematch(false)
        }
    }

    if (error) {
        return (
            <div className="page">
                <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
                    <h2 style={{ color: 'var(--error)', marginBottom: '16px' }}>Error</h2>
                    <p className="text-secondary" style={{ marginBottom: '24px' }}>{error}</p>
                    <button
                        className="btn btn-primary"
                        onClick={() => navigate('/multiplayer')}
                    >
                        Back to Multiplayer
                    </button>
                </div>
            </div>
        )
    }

    if (gameState === 'connecting' || gameState === 'waiting') {
        return (
            <div className="page">
                <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
                    <div className="loading-spinner" style={{ margin: '0 auto 20px' }} />
                    <h2 style={{ marginBottom: '16px' }}>
                        {gameState === 'connecting' ? 'Connecting...' : 'Waiting for opponent...'}
                    </h2>
                    <p className="text-secondary">
                        The game will start when both players are ready.
                    </p>
                </div>
            </div>
        )
    }

    if (gameState === 'finished') {
        const isWinner = winnerId === user?.id
        const resultText = isTie ? "It's a tie!" : (isWinner ? 'You Won!' : 'You Lost')
        const resultColor = isTie ? 'var(--text-primary)' : (isWinner ? 'var(--success)' : 'var(--error)')

        return (
            <div className="page">
                <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
                    <h1 style={{ color: resultColor, marginBottom: '24px', fontSize: '2.5rem' }}>
                        {resultText}
                    </h1>

                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '48px',
                        marginBottom: '32px'
                    }}>
                        <div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                You
                            </div>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
                                {score}
                            </div>
                        </div>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            fontSize: '1.5rem',
                            color: 'var(--text-secondary)'
                        }}>
                            vs
                        </div>
                        <div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                {getOpponentName()}
                            </div>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
                                {opponentScore}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button
                            className="btn btn-secondary"
                            onClick={() => navigate('/multiplayer')}
                        >
                            Back to Lobby
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={handleRematch}
                            disabled={isRequestingRematch}
                        >
                            {isRequestingRematch ? 'Sending...' : 'Rematch'}
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="page">
            {/* Score header showing both players */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px',
                background: 'var(--surface)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '16px'
            }}>
                <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>You</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                        {score}
                    </div>
                </div>
                <div style={{
                    textAlign: 'center',
                    padding: '8px 16px',
                    background: 'var(--background)',
                    borderRadius: 'var(--radius-sm)'
                }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Q {questionIndex + 1}/{totalQuestions}
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
                        {timeLeft}s
                    </div>
                </div>
                <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {getOpponentName()}
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--secondary)' }}>
                        {opponentScore}
                    </div>
                </div>
            </div>

            {/* Opponent answered indicator */}
            {opponentAnswered && !showResult && (
                <div style={{
                    textAlign: 'center',
                    padding: '8px',
                    background: 'var(--surface)',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '16px',
                    color: 'var(--text-secondary)'
                }}>
                    {getOpponentName()} has answered!
                </div>
            )}

            {/* Timer bar */}
            <div className={styles.timerBar}>
                <div
                    className={styles.timerFill}
                    style={{ width: `${(timeLeft / QUESTION_TIME) * 100}%` }}
                />
            </div>

            {/* Question */}
            <div className={styles.questionCard}>
                {currentQuestion?.prompt?.startsWith('http') ? (
                    <img
                        src={currentQuestion.prompt}
                        alt="Question"
                        className={styles.questionImage}
                    />
                ) : (
                    <h2 className={styles.questionText}>
                        {currentQuestion?.prompt}
                    </h2>
                )}
            </div>

            {/* Answer options */}
            <div className={styles.optionsGrid}>
                {currentQuestion?.options?.map((option, idx) => (
                    <button
                        key={idx}
                        className={`${styles.optionButton} ${getOptionClass(option)}`}
                        onClick={() => handleAnswer(option)}
                        disabled={selectedAnswer !== null}
                    >
                        {option?.startsWith('http') ? (
                            <img src={option} alt={`Option ${idx + 1}`} className={styles.optionImage} />
                        ) : (
                            option
                        )}
                    </button>
                ))}
            </div>

            {/* Results overlay */}
            {showResult && lastQuestionResult && (
                <div style={{
                    position: 'fixed',
                    bottom: '100px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'var(--surface)',
                    padding: '16px 24px',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                    textAlign: 'center',
                    zIndex: 100
                }}>
                    <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>
                        Correct: {lastQuestionResult.correctAnswer}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        Next question in a moment...
                    </div>
                </div>
            )}
        </div>
    )
}

export default MultiplayerGame
