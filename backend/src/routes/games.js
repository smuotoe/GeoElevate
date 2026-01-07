import { Router } from 'express';
import { getDb } from '../models/database.js';
import { authenticate, optionalAuthenticate } from '../middleware/auth.js';

const router = Router();

/**
 * Get available game types.
 * GET /api/games/types
 */
router.get('/types', (req, res) => {
    const gameTypes = [
        {
            id: 'flags',
            name: 'Flags',
            description: 'Identify countries by their flags',
            modes: ['flag-to-country', 'country-to-flag'],
            icon: 'flag'
        },
        {
            id: 'capitals',
            name: 'Capitals',
            description: 'Match countries with their capital cities',
            modes: ['country-to-capital', 'capital-to-country'],
            icon: 'building'
        },
        {
            id: 'maps',
            name: 'Maps',
            description: 'Identify countries on the map',
            modes: ['click-on-country', 'identify-highlighted'],
            icon: 'map'
        },
        {
            id: 'languages',
            name: 'Languages',
            description: 'Learn which languages are spoken where',
            modes: ['country-to-languages', 'language-to-countries'],
            icon: 'languages'
        },
        {
            id: 'trivia',
            name: 'Trivia',
            description: 'General geography facts and knowledge',
            modes: ['multiple-choice', 'typing'],
            icon: 'lightbulb'
        }
    ];

    res.json({ gameTypes });
});

/**
 * Get questions for a game.
 * GET /api/games/questions
 */
router.get('/questions', optionalAuthenticate, (req, res, next) => {
    try {
        const { type, mode, region, count = 10, difficulty = 'medium' } = req.query;

        if (!type) {
            return res.status(400).json({
                error: { message: 'Game type is required' }
            });
        }

        const db = getDb();
        const questionCount = Math.min(parseInt(count), 20);

        let questions = [];

        switch (type) {
            case 'flags':
                questions = generateFlagQuestions(db, mode, region, questionCount, difficulty);
                break;
            case 'capitals':
                questions = generateCapitalQuestions(db, mode, region, questionCount, difficulty);
                break;
            case 'maps':
                questions = generateMapQuestions(db, mode, region, questionCount, difficulty);
                break;
            case 'languages':
                questions = generateLanguageQuestions(db, mode, region, questionCount, difficulty);
                break;
            case 'trivia':
                questions = generateTriviaQuestions(db, region, questionCount, difficulty);
                break;
            default:
                return res.status(400).json({
                    error: { message: 'Invalid game type' }
                });
        }

        res.json({ questions });
    } catch (err) {
        next(err);
    }
});

/**
 * Start a game session.
 * POST /api/games/sessions
 */
router.post('/sessions', authenticate, (req, res, next) => {
    try {
        const { gameType, gameMode = 'solo', difficulty = 'medium', regionFilter } = req.body;

        if (!gameType) {
            return res.status(400).json({
                error: { message: 'Game type is required' }
            });
        }

        const db = getDb();

        const result = db.prepare(`
            INSERT INTO game_sessions (user_id, game_type, game_mode, difficulty_level, region_filter)
            VALUES (?, ?, ?, ?, ?)
        `).run(req.userId, gameType, gameMode, difficulty, regionFilter);

        res.status(201).json({
            sessionId: result.lastInsertRowid,
            message: 'Game session started'
        });
    } catch (err) {
        next(err);
    }
});

/**
 * Update/complete a game session.
 * PATCH /api/games/sessions/:id
 */
router.patch('/sessions/:id', authenticate, (req, res, next) => {
    try {
        const { id } = req.params;
        const { answers, score, xpEarned, correctCount, averageTimeMs } = req.body;

        const db = getDb();

        // Verify session belongs to user
        const session = db.prepare(
            'SELECT * FROM game_sessions WHERE id = ? AND user_id = ?'
        ).get(id, req.userId);

        if (!session) {
            return res.status(404).json({
                error: { message: 'Game session not found' }
            });
        }

        // Update session
        db.prepare(`
            UPDATE game_sessions
            SET score = ?, xp_earned = ?, correct_count = ?, average_time_ms = ?,
                completed_at = CURRENT_TIMESTAMP, total_questions = ?
            WHERE id = ?
        `).run(score, xpEarned, correctCount, averageTimeMs, answers?.length || 10, id);

        // Save answers
        if (answers && Array.isArray(answers)) {
            const insertAnswer = db.prepare(`
                INSERT INTO game_answers (session_id, question_index, question_data_json,
                    user_answer, correct_answer, is_correct, time_ms)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);

            for (let i = 0; i < answers.length; i++) {
                const answer = answers[i];
                insertAnswer.run(
                    id, i,
                    JSON.stringify(answer.question),
                    answer.userAnswer,
                    answer.correctAnswer,
                    answer.isCorrect ? 1 : 0,
                    answer.timeMs
                );
            }
        }

        // Update user stats
        updateUserStats(db, req.userId, session.game_type, score, xpEarned, correctCount, answers?.length || 10);

        res.json({ message: 'Game session completed', sessionId: id });
    } catch (err) {
        next(err);
    }
});

/**
 * Get game session details.
 * GET /api/games/sessions/:id
 */
router.get('/sessions/:id', authenticate, (req, res, next) => {
    try {
        const { id } = req.params;
        const db = getDb();

        const session = db.prepare(`
            SELECT * FROM game_sessions WHERE id = ? AND user_id = ?
        `).get(id, req.userId);

        if (!session) {
            return res.status(404).json({
                error: { message: 'Game session not found' }
            });
        }

        const answers = db.prepare(`
            SELECT * FROM game_answers WHERE session_id = ? ORDER BY question_index
        `).all(id);

        res.json({
            session,
            answers: answers.map(a => ({
                ...a,
                question: JSON.parse(a.question_data_json)
            }))
        });
    } catch (err) {
        next(err);
    }
});

/**
 * Generate flag questions.
 *
 * @param {Database} db - Database instance
 * @param {string} mode - Question mode
 * @param {string} region - Region filter
 * @param {number} count - Number of questions
 * @param {string} difficulty - Difficulty level
 * @returns {Array} Array of questions
 */
function generateFlagQuestions(db, mode, region, count, difficulty) {
    let query = `
        SELECT c.id, c.name, c.code, f.image_url
        FROM countries c
        JOIN flags f ON f.country_id = c.id
    `;

    const params = [];
    if (region) {
        query += ' WHERE c.continent = ?';
        params.push(region);
    }

    query += ' ORDER BY RANDOM() LIMIT ?';
    params.push(count);

    const countries = db.prepare(query).all(...params);

    // Get all countries for wrong answers
    const allCountries = db.prepare(`
        SELECT c.id, c.name, c.code, f.image_url
        FROM countries c
        JOIN flags f ON f.country_id = c.id
    `).all();

    return countries.map(country => {
        const wrongAnswers = allCountries
            .filter(c => c.id !== country.id)
            .sort(() => Math.random() - 0.5)
            .slice(0, 3);

        const options = [...wrongAnswers, country]
            .sort(() => Math.random() - 0.5)
            .map(c => mode === 'flag-to-country' ? c.name : c.image_url);

        return {
            type: 'flags',
            mode,
            prompt: mode === 'flag-to-country' ? country.image_url : country.name,
            correctAnswer: mode === 'flag-to-country' ? country.name : country.image_url,
            options,
            countryId: country.id
        };
    });
}

/**
 * Generate capital questions.
 *
 * @param {Database} db - Database instance
 * @param {string} mode - Question mode
 * @param {string} region - Region filter
 * @param {number} count - Number of questions
 * @param {string} difficulty - Difficulty level
 * @returns {Array} Array of questions
 */
function generateCapitalQuestions(db, mode, region, count, difficulty) {
    let query = `
        SELECT c.id, c.name as country, cap.name as capital
        FROM countries c
        JOIN capitals cap ON cap.country_id = c.id
    `;

    const params = [];
    if (region) {
        query += ' WHERE c.continent = ?';
        params.push(region);
    }

    query += ' ORDER BY RANDOM() LIMIT ?';
    params.push(count);

    const data = db.prepare(query).all(...params);

    // Get all for wrong answers
    const allData = db.prepare(`
        SELECT c.id, c.name as country, cap.name as capital
        FROM countries c
        JOIN capitals cap ON cap.country_id = c.id
    `).all();

    return data.map(item => {
        const wrongAnswers = allData
            .filter(d => d.id !== item.id)
            .sort(() => Math.random() - 0.5)
            .slice(0, 3);

        const options = [...wrongAnswers, item]
            .sort(() => Math.random() - 0.5)
            .map(d => mode === 'country-to-capital' ? d.capital : d.country);

        return {
            type: 'capitals',
            mode,
            prompt: mode === 'country-to-capital' ? item.country : item.capital,
            correctAnswer: mode === 'country-to-capital' ? item.capital : item.country,
            options,
            countryId: item.id
        };
    });
}

/**
 * Generate map questions.
 *
 * @param {Database} db - Database instance
 * @param {string} mode - Question mode
 * @param {string} region - Region filter
 * @param {number} count - Number of questions
 * @param {string} difficulty - Difficulty level
 * @returns {Array} Array of questions
 */
function generateMapQuestions(db, mode, region, count, difficulty) {
    let query = 'SELECT id, name, code, continent FROM countries';
    const params = [];

    if (region) {
        query += ' WHERE continent = ?';
        params.push(region);
    }

    query += ' ORDER BY RANDOM() LIMIT ?';
    params.push(count);

    const countries = db.prepare(query).all(...params);

    return countries.map(country => ({
        type: 'maps',
        mode,
        prompt: mode === 'click-on-country' ? country.name : country.code,
        correctAnswer: country.code,
        countryId: country.id,
        countryName: country.name
    }));
}

/**
 * Generate language questions.
 *
 * @param {Database} db - Database instance
 * @param {string} mode - Question mode
 * @param {string} region - Region filter
 * @param {number} count - Number of questions
 * @param {string} difficulty - Difficulty level
 * @returns {Array} Array of questions
 */
function generateLanguageQuestions(db, mode, region, count, difficulty) {
    // Simplified implementation - to be expanded
    return [];
}

/**
 * Generate trivia questions.
 *
 * @param {Database} db - Database instance
 * @param {string} region - Region filter
 * @param {number} count - Number of questions
 * @param {string} difficulty - Difficulty level
 * @returns {Array} Array of questions
 */
function generateTriviaQuestions(db, region, count, difficulty) {
    let query = 'SELECT * FROM trivia_facts';
    const params = [];

    if (region) {
        query += ' WHERE region = ?';
        params.push(region);
    }

    if (difficulty) {
        query += region ? ' AND' : ' WHERE';
        query += ' difficulty = ?';
        params.push(difficulty);
    }

    query += ' ORDER BY RANDOM() LIMIT ?';
    params.push(count);

    const facts = db.prepare(query).all(...params);

    return facts.map(fact => ({
        type: 'trivia',
        prompt: fact.question,
        correctAnswer: fact.answer,
        category: fact.category
    }));
}

/**
 * Update user statistics after game completion.
 *
 * @param {Database} db - Database instance
 * @param {number} userId - User ID
 * @param {string} gameType - Type of game played
 * @param {number} score - Score achieved
 * @param {number} xpEarned - XP earned
 * @param {number} correctCount - Number of correct answers
 * @param {number} totalQuestions - Total questions
 */
function updateUserStats(db, userId, gameType, score, xpEarned, correctCount, totalQuestions) {
    // Update category stats
    db.prepare(`
        UPDATE user_category_stats
        SET xp = xp + ?,
            games_played = games_played + 1,
            total_correct = total_correct + ?,
            total_questions = total_questions + ?,
            high_score = CASE WHEN ? > high_score THEN ? ELSE high_score END,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ? AND category = ?
    `).run(xpEarned, correctCount, totalQuestions, score, score, userId, gameType);

    // Update overall user stats
    db.prepare(`
        UPDATE users
        SET overall_xp = overall_xp + ?,
            overall_level = (overall_xp + ?) / 1000 + 1,
            last_played_date = DATE('now'),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `).run(xpEarned, xpEarned, userId);

    // Update streak
    const user = db.prepare(
        'SELECT last_played_date, current_streak FROM users WHERE id = ?'
    ).get(userId);

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    if (user.last_played_date === yesterday) {
        db.prepare(`
            UPDATE users
            SET current_streak = current_streak + 1,
                longest_streak = CASE
                    WHEN current_streak + 1 > longest_streak
                    THEN current_streak + 1
                    ELSE longest_streak
                END
            WHERE id = ?
        `).run(userId);
    } else if (user.last_played_date !== today) {
        db.prepare('UPDATE users SET current_streak = 1 WHERE id = ?').run(userId);
    }
}

export default router;
