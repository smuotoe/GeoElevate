import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import { getDb } from '../models/database.js';

const matches = new Map(); // matchId -> { players: Map, questions: [], currentQuestion: number }
const userConnections = new Map(); // userId -> WebSocket

/**
 * Initialize WebSocket server for multiplayer functionality.
 *
 * @param {number} port - Port to listen on
 */
export function initWebSocket(port) {
    const wss = new WebSocketServer({ port });

    wss.on('connection', (ws, req) => {
        // Authenticate connection
        const url = new URL(req.url, `ws://localhost:${port}`);
        const token = url.searchParams.get('token');

        if (!token) {
            ws.close(4001, 'Authentication required');
            return;
        }

        let userId;
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            userId = decoded.userId;
        } catch {
            ws.close(4002, 'Invalid token');
            return;
        }

        // Store connection
        userConnections.set(userId, ws);
        ws.userId = userId;

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

            // Handle player disconnection from active matches
            handlePlayerDisconnect(userId);
        });

        ws.on('error', (err) => {
            console.error(`WebSocket error for user ${userId}:`, err);
        });
    });

    console.log(`WebSocket server running on port ${port}`);
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
function handleJoinMatch(ws, userId, matchId) {
    const db = getDb();

    // Verify match exists and user is a participant
    const match = db.prepare(`
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

    // Initialize match state if not exists
    if (!matches.has(matchId)) {
        const questions = generateMatchQuestions(db, match.game_type);
        matches.set(matchId, {
            players: new Map(),
            questions,
            currentQuestion: 0,
            answers: new Map() // questionIndex -> Map(userId -> answer)
        });
    }

    const matchState = matches.get(matchId);
    matchState.players.set(userId, { ws, score: 0, answered: false });

    // Notify player they joined
    ws.send(JSON.stringify({
        type: 'match_joined',
        matchId,
        totalQuestions: matchState.questions.length
    }));

    // Check if both players have joined
    if (matchState.players.size === 2) {
        // Start the match
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
function handleSubmitAnswer(ws, userId, matchId, questionIndex, answer, timeMs) {
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

    // Validate timing (anti-cheat: reject impossibly fast answers)
    if (timeMs < 100) {
        ws.send(JSON.stringify({
            type: 'error',
            message: 'Invalid answer timing'
        }));
        return;
    }

    // Initialize answers map for this question if needed
    if (!matchState.answers.has(questionIndex)) {
        matchState.answers.set(questionIndex, new Map());
    }

    const questionAnswers = matchState.answers.get(questionIndex);

    // Prevent duplicate answers
    if (questionAnswers.has(userId)) {
        return;
    }

    // Validate answer and calculate score
    const question = matchState.questions[questionIndex];
    const isCorrect = answer === question.correctAnswer;
    const baseScore = 100;
    const timeBonus = Math.max(0, Math.floor((15000 - timeMs) / 100)); // Bonus for speed
    const score = isCorrect ? baseScore + timeBonus : 0;

    questionAnswers.set(userId, { answer, isCorrect, timeMs, score });
    player.score += score;
    player.answered = true;

    // Store answer in database
    const db = getDb();
    db.prepare(`
        INSERT INTO multiplayer_answers (match_id, user_id, question_index, question_data_json, user_answer, correct_answer, is_correct, time_ms)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(matchId, userId, questionIndex, JSON.stringify(question), answer, question.correctAnswer, isCorrect ? 1 : 0, timeMs);

    // Notify opponent that this player has answered
    broadcastToMatchExcept(matchId, userId, {
        type: 'opponent_answered',
        questionIndex
    });

    // Check if both players have answered
    if (questionAnswers.size === 2) {
        // Send results to both players
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

        // Reset answered flags
        for (const p of matchState.players.values()) {
            p.answered = false;
        }

        // Move to next question or end match
        setTimeout(() => {
            matchState.currentQuestion++;

            if (matchState.currentQuestion < matchState.questions.length) {
                broadcastToMatch(matchId, {
                    type: 'next_question',
                    question: sanitizeQuestion(matchState.questions[matchState.currentQuestion]),
                    questionIndex: matchState.currentQuestion
                });
            } else {
                // End match
                endMatch(matchId);
            }
        }, 3000); // 3 second delay between questions
    }
}

/**
 * Handle player leaving a match.
 *
 * @param {WebSocket} ws - WebSocket connection
 * @param {number} userId - User ID
 * @param {number} matchId - Match ID
 */
function handleLeaveMatch(ws, userId, matchId) {
    const matchState = matches.get(matchId);
    if (!matchState) return;

    matchState.players.delete(userId);

    // Notify other player
    broadcastToMatch(matchId, {
        type: 'opponent_left'
    });

    // End match if it was active
    const db = getDb();
    const match = db.prepare('SELECT * FROM multiplayer_matches WHERE id = ?').get(matchId);

    if (match && match.status === 'active') {
        // Other player wins by forfeit
        const winnerId = match.challenger_id === userId ? match.opponent_id : match.challenger_id;

        db.prepare(`
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
function endMatch(matchId) {
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
    // If tied, winnerId stays null

    // Update database
    const db = getDb();
    db.prepare(`
        UPDATE multiplayer_matches
        SET status = 'completed', winner_id = ?,
            challenger_score = ?, opponent_score = ?,
            completed_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `).run(winnerId, scores[playerIds[0]], scores[playerIds[1]], matchId);

    // Broadcast final results
    broadcastToMatch(matchId, {
        type: 'match_end',
        winnerId,
        scores,
        isTie: winnerId === null
    });

    // Clean up
    matches.delete(matchId);
}

/**
 * Generate questions for a match.
 *
 * @param {Database} db - Database instance
 * @param {string} gameType - Type of game
 * @returns {Array} Array of questions
 */
function generateMatchQuestions(db, gameType) {
    // Simplified - reuse from games routes in production
    const countries = db.prepare(`
        SELECT c.id, c.name, f.image_url
        FROM countries c
        JOIN flags f ON f.country_id = c.id
        ORDER BY RANDOM()
        LIMIT 10
    `).all();

    const allCountries = db.prepare(`
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
    for (const [userId, player] of matchState.players) {
        scores[userId] = player.score;
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
    for (const [userId, player] of matchState.players) {
        if (userId !== excludeUserId && player.ws && player.ws.readyState === 1) {
            player.ws.send(data);
        }
    }
}

export default { initWebSocket };
