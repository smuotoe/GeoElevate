import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import { getDb } from '../models/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-geo-elevate-2024';

const matches = new Map();
const userConnections = new Map();

const answerRateLimits = new Map();
const RATE_LIMIT_WINDOW_MS = 1000;
const MAX_ANSWERS_PER_WINDOW = 3;

/**
 * Check if user is rate limited for answer submissions.
 *
 * @param {number} userId - User ID
 * @param {number} matchId - Match ID
 * @returns {{ limited: boolean, message?: string }}
 */
function checkAnswerRateLimit(userId, matchId) {
    const key = `${userId}-${matchId}`;
    const now = Date.now();
    const limit = answerRateLimits.get(key);

    if (!limit || now > limit.resetTime) {
        answerRateLimits.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
        return { limited: false };
    }

    if (limit.count >= MAX_ANSWERS_PER_WINDOW) {
        return {
            limited: true,
            message: 'Rate limit exceeded. Please slow down.'
        };
    }

    limit.count++;
    return { limited: false };
}

/**
 * Clean up expired rate limit entries periodically.
 */
function cleanupRateLimits() {
    const now = Date.now();
    for (const [key, limit] of answerRateLimits) {
        if (now > limit.resetTime + 60000) {
            answerRateLimits.delete(key);
        }
    }
}

setInterval(cleanupRateLimits, 60000);

/**
 * Initialize WebSocket server attached to an existing HTTP server.
 * This allows WebSocket to run on the same port as HTTP (required for Railway).
 *
 * @param {http.Server} server - HTTP server to attach WebSocket to
 */
export function initWebSocket(server) {
    const wss = new WebSocketServer({ server, path: '/ws' });

    wss.on('error', (err) => {
        console.error('WebSocket server error:', err);
    });

    setupWebSocketHandlers(wss);

    console.log('WebSocket server initialized on /ws path');
}

/**
 * Setup WebSocket event handlers.
 *
 * @param {WebSocketServer} wss - WebSocket server instance
 */
function setupWebSocketHandlers(wss) {
    wss.on('connection', async (ws, req) => {
        const url = new URL(req.url, `ws://${req.headers.host}`);
        const token = url.searchParams.get('token');

        if (!token) {
            ws.close(4001, 'Authentication required');
            return;
        }

        let userId;
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            userId = decoded.userId;
        } catch {
            ws.close(4002, 'Invalid token');
            return;
        }

        userConnections.set(userId, ws);
        ws.userId = userId;

        try {
            const db = getDb();
            await db.prepare('UPDATE users SET last_active_at = CURRENT_TIMESTAMP WHERE id = ?').run(userId);
        } catch (err) {
            console.error('Failed to update last_active_at:', err);
        }

        console.log(`WebSocket: User ${userId} connected`);

        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                handleMessage(ws, userId, message);
            } catch (err) {
                console.error('WebSocket message error:', err);
                ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
            }
        });

        ws.on('close', () => {
            userConnections.delete(userId);
            console.log(`WebSocket: User ${userId} disconnected`);
            handlePlayerDisconnect(userId);
        });

        ws.on('error', (err) => {
            console.error(`WebSocket error for user ${userId}:`, err);
        });
    });
}

/**
 * Handle incoming WebSocket messages.
 *
 * @param {WebSocket} ws - WebSocket connection
 * @param {number} userId - User ID
 * @param {object} message - Parsed message object
 */
function handleMessage(ws, userId, message) {
    switch (message.type) {
        case 'join_match':
            handleJoinMatch(ws, userId, message.matchId);
            break;
        case 'submit_answer':
            handleSubmitAnswer(ws, userId, message.matchId, message.questionIndex, message.answer, message.timeMs);
            break;
        case 'leave_match':
            handleLeaveMatch(ws, userId, message.matchId);
            break;
        case 'ping':
            ws.send(JSON.stringify({ type: 'pong' }));
            break;
        default:
            ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
    }
}

/**
 * Handle player joining a match.
 *
 * @param {WebSocket} ws - WebSocket connection
 * @param {number} userId - User ID
 * @param {number} matchId - Match ID
 */
async function handleJoinMatch(ws, userId, matchId) {
    const db = getDb();

    const match = await db.prepare(`
        SELECT * FROM multiplayer_matches
        WHERE id = ? AND (challenger_id = ? OR opponent_id = ?) AND status = 'active'
    `).get(matchId, userId, userId);

    if (!match) {
        ws.send(JSON.stringify({
            type: 'error',
            message: 'Match not found or not active'
        }));
        return;
    }

    if (!matches.has(matchId)) {
        const questions = await generateMatchQuestions(db, match.game_type);
        matches.set(matchId, {
            players: new Map(),
            questions,
            currentQuestion: 0,
            answers: new Map()
        });
    }

    const matchState = matches.get(matchId);
    matchState.players.set(userId, { ws, score: 0, answered: false });

    ws.send(JSON.stringify({
        type: 'match_joined',
        matchId,
        totalQuestions: matchState.questions.length
    }));

    if (matchState.players.size === 2) {
        broadcastToMatch(matchId, {
            type: 'match_start',
            question: sanitizeQuestion(matchState.questions[0]),
            questionIndex: 0,
            totalQuestions: matchState.questions.length
        });
    } else {
        ws.send(JSON.stringify({
            type: 'waiting_for_opponent'
        }));
    }
}

/**
 * Handle answer submission.
 *
 * @param {WebSocket} ws - WebSocket connection
 * @param {number} userId - User ID
 * @param {number} matchId - Match ID
 * @param {number} questionIndex - Question index
 * @param {string} answer - User's answer
 * @param {number} timeMs - Time taken in milliseconds
 */
async function handleSubmitAnswer(ws, userId, matchId, questionIndex, answer, timeMs) {
    const rateLimit = checkAnswerRateLimit(userId, matchId);
    if (rateLimit.limited) {
        ws.send(JSON.stringify({
            type: 'error',
            message: rateLimit.message
        }));
        return;
    }

    const matchState = matches.get(matchId);
    if (!matchState) {
        ws.send(JSON.stringify({ type: 'error', message: 'Match not found' }));
        return;
    }

    const player = matchState.players.get(userId);
    if (!player) {
        ws.send(JSON.stringify({ type: 'error', message: 'Not in match' }));
        return;
    }

    if (timeMs < 100) {
        ws.send(JSON.stringify({
            type: 'error',
            message: 'Invalid answer timing'
        }));
        return;
    }

    if (!matchState.answers.has(questionIndex)) {
        matchState.answers.set(questionIndex, new Map());
    }

    const questionAnswers = matchState.answers.get(questionIndex);

    if (questionAnswers.has(userId)) {
        return;
    }

    const question = matchState.questions[questionIndex];
    const isCorrect = answer === question.correctAnswer;
    const baseScore = 100;
    const timeBonus = Math.max(0, Math.floor((15000 - timeMs) / 100));
    const score = isCorrect ? baseScore + timeBonus : 0;

    questionAnswers.set(userId, { answer, isCorrect, timeMs, score });
    player.score += score;
    player.answered = true;

    const db = getDb();
    await db.prepare(`
        INSERT INTO multiplayer_answers (match_id, user_id, question_index, question_data_json, user_answer, correct_answer, is_correct, time_ms)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(matchId, userId, questionIndex, JSON.stringify(question), answer, question.correctAnswer, isCorrect, timeMs);

    broadcastToMatchExcept(matchId, userId, {
        type: 'opponent_answered',
        questionIndex
    });

    if (questionAnswers.size === 2) {
        const results = {};
        for (const [uid, ans] of questionAnswers) {
            results[uid] = {
                answer: ans.answer,
                isCorrect: ans.isCorrect,
                score: ans.score,
                timeMs: ans.timeMs
            };
        }

        broadcastToMatch(matchId, {
            type: 'question_results',
            questionIndex,
            correctAnswer: question.correctAnswer,
            results,
            scores: getMatchScores(matchState)
        });

        for (const p of matchState.players.values()) {
            p.answered = false;
        }

        setTimeout(() => {
            matchState.currentQuestion++;

            if (matchState.currentQuestion < matchState.questions.length) {
                broadcastToMatch(matchId, {
                    type: 'next_question',
                    question: sanitizeQuestion(matchState.questions[matchState.currentQuestion]),
                    questionIndex: matchState.currentQuestion
                });
            } else {
                endMatch(matchId);
            }
        }, 3000);
    }
}

/**
 * Handle player leaving a match.
 *
 * @param {WebSocket} ws - WebSocket connection
 * @param {number} userId - User ID
 * @param {number} matchId - Match ID
 */
async function handleLeaveMatch(ws, userId, matchId) {
    const matchState = matches.get(matchId);
    if (!matchState) return;

    matchState.players.delete(userId);

    broadcastToMatch(matchId, {
        type: 'opponent_left'
    });

    const db = getDb();
    const match = await db.prepare('SELECT * FROM multiplayer_matches WHERE id = ?').get(matchId);

    if (match && match.status === 'active') {
        const winnerId = match.challenger_id === userId ? match.opponent_id : match.challenger_id;

        await db.prepare(`
            UPDATE multiplayer_matches
            SET status = 'completed', winner_id = ?, completed_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(winnerId, matchId);
    }

    matches.delete(matchId);
}

/**
 * Handle player disconnection.
 *
 * @param {number} userId - User ID
 */
function handlePlayerDisconnect(userId) {
    for (const [matchId, matchState] of matches) {
        if (matchState.players.has(userId)) {
            handleLeaveMatch(null, userId, matchId);
        }
    }
}

/**
 * End a match and determine winner.
 *
 * @param {number} matchId - Match ID
 */
async function endMatch(matchId) {
    const matchState = matches.get(matchId);
    if (!matchState) return;

    const scores = getMatchScores(matchState);
    const playerIds = Array.from(matchState.players.keys());

    let winnerId = null;
    if (scores[playerIds[0]] > scores[playerIds[1]]) {
        winnerId = playerIds[0];
    } else if (scores[playerIds[1]] > scores[playerIds[0]]) {
        winnerId = playerIds[1];
    }

    const db = getDb();
    await db.prepare(`
        UPDATE multiplayer_matches
        SET status = 'completed', winner_id = ?,
            challenger_score = ?, opponent_score = ?,
            completed_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `).run(winnerId, scores[playerIds[0]], scores[playerIds[1]], matchId);

    broadcastToMatch(matchId, {
        type: 'match_end',
        winnerId,
        scores,
        isTie: winnerId === null
    });

    matches.delete(matchId);
}

/**
 * Generate questions for a match.
 *
 * @param {object} db - Database instance
 * @param {string} gameType - Type of game
 * @returns {Promise<Array>} Array of questions
 */
async function generateMatchQuestions(db, gameType) {
    const countries = await db.prepare(`
        SELECT c.id, c.name, f.image_url
        FROM countries c
        JOIN flags f ON f.country_id = c.id
        ORDER BY RANDOM()
        LIMIT 10
    `).all();

    const allCountries = await db.prepare(`
        SELECT c.id, c.name, f.image_url
        FROM countries c
        JOIN flags f ON f.country_id = c.id
    `).all();

    return countries.map(country => {
        const wrongAnswers = allCountries
            .filter(c => c.id !== country.id)
            .sort(() => Math.random() - 0.5)
            .slice(0, 3);

        const options = [...wrongAnswers.map(c => c.name), country.name]
            .sort(() => Math.random() - 0.5);

        return {
            prompt: country.image_url,
            correctAnswer: country.name,
            options
        };
    });
}

/**
 * Sanitize question for client (remove correct answer from visible data).
 *
 * @param {object} question - Question object
 * @returns {object} Sanitized question
 */
function sanitizeQuestion(question) {
    return {
        prompt: question.prompt,
        options: question.options
    };
}

/**
 * Get current scores for a match.
 *
 * @param {object} matchState - Match state object
 * @returns {object} Scores by user ID
 */
function getMatchScores(matchState) {
    const scores = {};
    for (const [odtUserId, player] of matchState.players) {
        scores[odtUserId] = player.score;
    }
    return scores;
}

/**
 * Broadcast message to all players in a match.
 *
 * @param {number} matchId - Match ID
 * @param {object} message - Message to send
 */
function broadcastToMatch(matchId, message) {
    const matchState = matches.get(matchId);
    if (!matchState) return;

    const data = JSON.stringify(message);
    for (const player of matchState.players.values()) {
        if (player.ws && player.ws.readyState === 1) {
            player.ws.send(data);
        }
    }
}

/**
 * Broadcast message to all players except one.
 *
 * @param {number} matchId - Match ID
 * @param {number} excludeUserId - User ID to exclude
 * @param {object} message - Message to send
 */
function broadcastToMatchExcept(matchId, excludeUserId, message) {
    const matchState = matches.get(matchId);
    if (!matchState) return;

    const data = JSON.stringify(message);
    for (const [odtUserId, player] of matchState.players) {
        if (odtUserId !== excludeUserId && player.ws && player.ws.readyState === 1) {
            player.ws.send(data);
        }
    }
}

/**
 * Check if a user is currently online (has active WebSocket connection).
 *
 * @param {number} userId - User ID to check
 * @returns {boolean} True if user has active WebSocket connection
 */
export function isUserOnline(userId) {
    const ws = userConnections.get(userId);
    return ws && ws.readyState === 1;
}

/**
 * Get online status for multiple users.
 *
 * @param {Array<number>} userIds - Array of user IDs to check
 * @returns {Object} Map of userId -> boolean online status
 */
export function getOnlineStatus(userIds) {
    const status = {};
    for (const odtUserId of userIds) {
        status[odtUserId] = isUserOnline(odtUserId);
    }
    return status;
}

export default { initWebSocket, isUserOnline, getOnlineStatus };
