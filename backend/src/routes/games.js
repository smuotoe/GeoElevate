import { Router } from 'express';
import { getDb } from '../models/database.js';
import { authenticate, optionalAuthenticate } from '../middleware/auth.js';
import { gameAnswerRateLimit } from '../middleware/rateLimit.js';

const router = Router();

// Daily XP cap per game type (encourages variety)
const DAILY_XP_CAP = 500;

/**
 * Get remaining XP that can be earned today for a game type.
 *
 * @param {Database} db - Database instance
 * @param {number} userId - User ID
 * @param {string} gameType - Type of game
 * @returns {{ earnedToday: number, remaining: number, capped: boolean }}
 */
function getDailyXpStatus(db, userId, gameType) {
    const today = new Date().toISOString().split('T')[0];

    const result = db.prepare(`
        SELECT COALESCE(SUM(xp_earned), 0) as earned_today
        FROM game_sessions
        WHERE user_id = ? AND game_type = ? AND DATE(completed_at) = ?
    `).get(userId, gameType, today);

    const earnedToday = result?.earned_today || 0;
    const remaining = Math.max(0, DAILY_XP_CAP - earnedToday);

    return {
        earnedToday,
        remaining,
        capped: remaining === 0
    };
}

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
 * Debug endpoint to check user streak data.
 * GET /api/games/debug-user/:id
 */
router.get('/debug-user/:id', (req, res) => {
    const db = getDb();
    const user = db.prepare(
        'SELECT id, username, last_played_date, current_streak, longest_streak, overall_xp FROM users WHERE id = ?'
    ).get(req.params.id);

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    res.json({
        user,
        today,
        yesterday,
        comparison: {
            lastPlayedEqualsYesterday: user?.last_played_date === yesterday,
            lastPlayedEqualsToday: user?.last_played_date === today,
            lastPlayedNotToday: user?.last_played_date !== today
        }
    });
});

/**
 * Fix user streak if played today but streak is 0.
 * POST /api/games/fix-streak/:id
 */
router.post('/fix-streak/:id', (req, res) => {
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];

    // Get user before fix
    const before = db.prepare(
        'SELECT id, username, last_played_date, current_streak FROM users WHERE id = ?'
    ).get(req.params.id);

    // If played today and streak is 0, set to 1
    if (before && before.last_played_date === today && before.current_streak === 0) {
        db.prepare('UPDATE users SET current_streak = 1 WHERE id = ?').run(req.params.id);
    }

    // Get user after fix
    const after = db.prepare(
        'SELECT id, username, last_played_date, current_streak FROM users WHERE id = ?'
    ).get(req.params.id);

    res.json({ before, after, today });
});

/**
 * Get available regions/continents for filtering.
 * GET /api/games/regions
 */
router.get('/regions', (req, res) => {
    try {
        const db = getDb();
        const regions = db.prepare(
            'SELECT DISTINCT continent FROM countries WHERE continent IS NOT NULL ORDER BY continent'
        ).all();

        res.json({
            regions: regions.map(r => ({
                id: r.continent.toLowerCase().replace(/\s+/g, '-'),
                name: r.continent
            }))
        });
    } catch (err) {
        console.error('Error fetching regions:', err);
        res.status(500).json({ error: { message: 'Failed to fetch regions' } });
    }
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
        const userId = req.userId || null; // From optionalAuthenticate

        let questions = [];

        switch (type) {
            case 'flags':
                questions = generateFlagQuestions(db, mode, region, questionCount, difficulty, userId);
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
router.post('/sessions', authenticate, (req, res) => {
    const { gameType, gameMode = 'solo', difficulty = 'medium', regionFilter } = req.body;

    if (!gameType) {
        return res.status(400).json({
            error: { message: 'Game type is required' }
        });
    }

    try {
        const db = getDb();
        const result = db.prepare(`
            INSERT INTO game_sessions (user_id, game_type, game_mode, difficulty_level, region_filter)
            VALUES (?, ?, ?, ?, ?)
        `).run(req.userId, gameType, gameMode, difficulty, regionFilter || null);

        return res.status(201).json({
            sessionId: result.lastInsertRowid,
            message: 'Game session started'
        });
    } catch (err) {
        console.error('Session creation error:', err);
        return res.status(500).json({
            error: { message: String(err.message || err) || 'Failed to create session' }
        });
    }
});

/**
 * Update/complete a game session.
 * PATCH /api/games/sessions/:id
 *
 * Uses a database transaction to ensure all-or-nothing data integrity.
 * If the user refreshes during save, either all data is saved or none.
 */
router.patch('/sessions/:id', authenticate, gameAnswerRateLimit, (req, res, next) => {
    const db = getDb();

    try {
        const { id } = req.params;
        const { answers, score, xpEarned: requestedXp, correctCount: rawCorrectCount, averageTimeMs } = req.body;

        // Calculate correctCount from answers if not provided
        const correctCount = rawCorrectCount ?? (answers ? answers.filter(a => a.isCorrect).length : 0);
        console.log('PATCH session - rawCorrectCount:', rawCorrectCount, 'calculatedCorrectCount:', correctCount);

        // Verify session belongs to user (before transaction)
        const sessionFull = db.prepare(
            'SELECT * FROM game_sessions WHERE id = ? AND user_id = ?'
        ).get(id, req.userId);

        if (!sessionFull) {
            return res.status(404).json({
                error: { message: 'Game session not found' }
            });
        }

        // Apply daily XP cap for this game type
        let xpEarned = requestedXp;
        let xpCapInfo = null;

        if (req.userId) {
            const xpStatus = getDailyXpStatus(db, req.userId, sessionFull.game_type);
            if (xpStatus.remaining < requestedXp) {
                xpEarned = xpStatus.remaining;
                xpCapInfo = {
                    capped: true,
                    earnedToday: xpStatus.earnedToday,
                    maxDaily: DAILY_XP_CAP,
                    reducedFrom: requestedXp,
                    reducedTo: xpEarned,
                    message: xpEarned === 0
                        ? `You've reached your daily XP cap for ${sessionFull.game_type}! Try a different game type.`
                        : `XP reduced due to daily cap. Only ${xpEarned} XP awarded.`
                };
            }
        }

        // Begin transaction for atomic game completion
        // All changes will be committed together or rolled back on error
        db.beginTransaction();

        try {
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
            console.log('Updating stats - gameType:', sessionFull.game_type, 'correctCount:', correctCount, 'totalQuestions:', answers?.length || 10);
            updateUserStats(db, req.userId, sessionFull.game_type, score, xpEarned, correctCount, answers?.length || 10);

            // Update spaced repetition data for each answered question
            if (answers && Array.isArray(answers)) {
                updateSpacedRepetition(db, req.userId, sessionFull.game_type, answers);
            }

            // Commit transaction - all changes saved atomically
            db.commit();

            res.json({
                message: 'Game session completed',
                sessionId: id,
                xpEarned,
                xpCapInfo
            });
        } catch (txErr) {
            // Rollback on any error - no partial data saved
            db.rollback();
            throw txErr;
        }
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
 * Get population threshold for difficulty filtering.
 * Easy = well-known countries (high population)
 * Medium = mix of countries
 * Hard = obscure countries (low population)
 *
 * @param {Database} db - Database instance
 * @param {string} difficulty - Difficulty level (easy, medium, hard)
 * @returns {object} Population filter criteria { minPop, maxPop, orderBy }
 */
function getDifficultyFilter(db, difficulty) {
    // Get population statistics for thresholds
    const stats = db.prepare(`
        SELECT
            MAX(population) as maxPop,
            MIN(population) as minPop,
            AVG(population) as avgPop
        FROM countries WHERE population IS NOT NULL
    `).get();

    // Calculate thresholds based on average population
    // Easy: countries with population above average (well-known)
    // Hard: countries with population below average (less well-known)
    // Medium: all countries mixed
    const avgPop = stats.avgPop || 100000000;

    switch (difficulty) {
        case 'easy':
            // Well-known countries - high population
            return { minPop: avgPop, maxPop: null, orderBy: 'c.population DESC' };
        case 'hard':
            // Less well-known countries - lower population
            return { minPop: null, maxPop: avgPop, orderBy: 'c.population ASC' };
        case 'medium':
        default:
            // Mix - all countries, random order
            return { minPop: null, maxPop: null, orderBy: 'RANDOM()' };
    }
}

/**
 * Generate flag questions with spaced repetition prioritization.
 *
 * @param {Database} db - Database instance
 * @param {string} mode - Question mode
 * @param {string} region - Region filter
 * @param {number} count - Number of questions
 * @param {string} difficulty - Difficulty level
 * @param {number|null} userId - User ID for spaced repetition (null if not logged in)
 * @returns {Array} Array of questions
 */
function generateFlagQuestions(db, mode, region, count, difficulty, userId = null) {
    const diffFilter = getDifficultyFilter(db, difficulty);
    let countries = [];

    // If user is logged in, prioritize due review items
    if (userId) {
        const now = new Date().toISOString();
        // Get countries that need review (next_review_at is in the past or have been answered wrong)
        let dueQuery = `
            SELECT c.id, c.name, c.code, c.population, f.image_url,
                   ufp.times_wrong, ufp.next_review_at, ufp.ease_factor
            FROM countries c
            JOIN flags f ON f.country_id = c.id
            JOIN user_fact_progress ufp ON ufp.fact_id = c.id
                AND ufp.user_id = ? AND ufp.fact_type = 'flags'
            WHERE c.population IS NOT NULL
                AND (ufp.next_review_at <= ? OR ufp.times_wrong > ufp.times_correct)
        `;
        const dueParams = [userId, now];

        if (region) {
            dueQuery += ' AND c.continent = ?';
            dueParams.push(region);
        }

        // Priority: items with more wrong answers first, then by next_review_at
        dueQuery += ' ORDER BY ufp.times_wrong DESC, ufp.next_review_at ASC LIMIT ?';
        dueParams.push(Math.ceil(count / 2)); // Get up to half from due items

        const dueCountries = db.prepare(dueQuery).all(...dueParams);
        countries = [...dueCountries];
    }

    // Fill remaining slots with regular questions
    const remaining = count - countries.length;
    if (remaining > 0) {
        const usedIds = countries.map(c => c.id);
        let query = `
            SELECT c.id, c.name, c.code, c.population, f.image_url
            FROM countries c
            JOIN flags f ON f.country_id = c.id
            WHERE c.population IS NOT NULL
        `;

        const params = [];
        if (usedIds.length > 0) {
            query += ` AND c.id NOT IN (${usedIds.map(() => '?').join(',')})`;
            params.push(...usedIds);
        }
        if (region) {
            query += ' AND c.continent = ?';
            params.push(region);
        }

        // Apply difficulty-based population filter
        if (diffFilter.minPop !== null) {
            query += ' AND c.population >= ?';
            params.push(diffFilter.minPop);
        }
        if (diffFilter.maxPop !== null) {
            query += ' AND c.population <= ?';
            params.push(diffFilter.maxPop);
        }

        query += ` ORDER BY ${diffFilter.orderBy} LIMIT ?`;
        params.push(remaining);

        const additionalCountries = db.prepare(query).all(...params);
        countries = [...countries, ...additionalCountries];
    }

    // Shuffle the combined list to avoid predictable order
    countries = countries.sort(() => Math.random() - 0.5);

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
    const diffFilter = getDifficultyFilter(db, difficulty);

    let query = `
        SELECT c.id, c.name as country, c.population, cap.name as capital
        FROM countries c
        JOIN capitals cap ON cap.country_id = c.id
        WHERE c.population IS NOT NULL
    `;

    const params = [];
    if (region) {
        query += ' AND c.continent = ?';
        params.push(region);
    }

    // Apply difficulty-based population filter
    if (diffFilter.minPop !== null) {
        query += ' AND c.population >= ?';
        params.push(diffFilter.minPop);
    }
    if (diffFilter.maxPop !== null) {
        query += ' AND c.population <= ?';
        params.push(diffFilter.maxPop);
    }

    query += ` ORDER BY ${diffFilter.orderBy} LIMIT ?`;
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
    const diffFilter = getDifficultyFilter(db, difficulty);

    let query = 'SELECT id, name, code, continent, population FROM countries WHERE population IS NOT NULL';
    const params = [];

    if (region) {
        query += ' AND continent = ?';
        params.push(region);
    }

    // Apply difficulty-based population filter
    if (diffFilter.minPop !== null) {
        query += ' AND population >= ?';
        params.push(diffFilter.minPop);
    }
    if (diffFilter.maxPop !== null) {
        query += ' AND population <= ?';
        params.push(diffFilter.maxPop);
    }

    query += ` ORDER BY ${diffFilter.orderBy.replace('c.', '')} LIMIT ?`;
    params.push(count);

    const countries = db.prepare(query).all(...params);

    // Get all countries for wrong answers
    const allCountries = db.prepare('SELECT id, name, code FROM countries').all();

    return countries.map(country => {
        // Generate wrong answers from other countries
        const wrongAnswers = allCountries
            .filter(c => c.id !== country.id)
            .sort(() => Math.random() - 0.5)
            .slice(0, 3);

        // For identify-highlighted mode: show code, user picks country name
        // For click-on-country mode: show country name, user clicks on map (no options needed)
        const options = [...wrongAnswers, country]
            .sort(() => Math.random() - 0.5)
            .map(c => c.name);

        return {
            type: 'maps',
            mode,
            prompt: mode === 'click-on-country' ? country.name : country.code,
            correctAnswer: mode === 'click-on-country' ? country.code : country.name,
            options,
            countryId: country.id,
            countryName: country.name
        };
    });
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
    const diffFilter = getDifficultyFilter(db, difficulty);
    // Get all languages for generating wrong answers
    const allLanguages = db.prepare('SELECT id, name FROM languages').all();

    if (mode === 'language-to-countries') {
        // Show a language, user picks which country speaks it
        let query = `
            SELECT DISTINCT l.id as lang_id, l.name as language,
                   c.id as country_id, c.name as country, c.continent, c.population
            FROM languages l
            JOIN country_languages cl ON l.id = cl.language_id
            JOIN countries c ON cl.country_id = c.id
            WHERE c.population IS NOT NULL
        `;
        const params = [];

        if (region) {
            query += ' AND c.continent = ?';
            params.push(region);
        }

        // Apply difficulty-based population filter
        if (diffFilter.minPop !== null) {
            query += ' AND c.population >= ?';
            params.push(diffFilter.minPop);
        }
        if (diffFilter.maxPop !== null) {
            query += ' AND c.population <= ?';
            params.push(diffFilter.maxPop);
        }

        query += ` ORDER BY ${diffFilter.orderBy} LIMIT ?`;
        params.push(count);

        const data = db.prepare(query).all(...params);

        // Get all countries for wrong answers
        const allCountries = db.prepare('SELECT id, name FROM countries').all();

        return data.map(item => {
            const wrongAnswers = allCountries
                .filter(c => c.id !== item.country_id)
                .sort(() => Math.random() - 0.5)
                .slice(0, 3)
                .map(c => c.name);

            const options = [...wrongAnswers, item.country]
                .sort(() => Math.random() - 0.5);

            return {
                type: 'languages',
                mode,
                prompt: `Which country speaks ${item.language}?`,
                correctAnswer: item.country,
                options,
                languageId: item.lang_id,
                countryId: item.country_id
            };
        });
    } else {
        // Default: country-to-languages - Show country, user picks the language
        let query = `
            SELECT c.id as country_id, c.name as country, c.continent, c.population,
                   GROUP_CONCAT(l.name) as languages,
                   (SELECT l2.name FROM languages l2
                    JOIN country_languages cl2 ON l2.id = cl2.language_id
                    WHERE cl2.country_id = c.id
                    ORDER BY RANDOM() LIMIT 1) as primary_language
            FROM countries c
            JOIN country_languages cl ON c.id = cl.country_id
            JOIN languages l ON cl.language_id = l.id
            WHERE c.population IS NOT NULL
        `;
        const params = [];

        if (region) {
            query += ' AND c.continent = ?';
            params.push(region);
        }

        // Apply difficulty-based population filter
        if (diffFilter.minPop !== null) {
            query += ' AND c.population >= ?';
            params.push(diffFilter.minPop);
        }
        if (diffFilter.maxPop !== null) {
            query += ' AND c.population <= ?';
            params.push(diffFilter.maxPop);
        }

        query += ` GROUP BY c.id ORDER BY ${diffFilter.orderBy} LIMIT ?`;
        params.push(count);

        const data = db.prepare(query).all(...params);

        return data.map(item => {
            // Get wrong language answers
            const countryLangs = item.languages.split(',');
            const wrongAnswers = allLanguages
                .filter(l => !countryLangs.includes(l.name))
                .sort(() => Math.random() - 0.5)
                .slice(0, 3)
                .map(l => l.name);

            const options = [...wrongAnswers, item.primary_language]
                .sort(() => Math.random() - 0.5);

            return {
                type: 'languages',
                mode,
                prompt: `What language is spoken in ${item.country}?`,
                correctAnswer: item.primary_language,
                options,
                countryId: item.country_id,
                allLanguages: countryLangs
            };
        });
    }
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

    // Get all trivia facts for generating wrong answers
    const allFacts = db.prepare('SELECT DISTINCT answer FROM trivia_facts').all();

    return facts.map(fact => {
        // Generate wrong answers from other trivia answers
        const wrongAnswers = allFacts
            .filter(f => f.answer !== fact.answer)
            .sort(() => Math.random() - 0.5)
            .slice(0, 3)
            .map(f => f.answer);

        const options = [...wrongAnswers, fact.answer]
            .sort(() => Math.random() - 0.5);

        return {
            type: 'trivia',
            prompt: fact.question,
            correctAnswer: fact.answer,
            options,
            category: fact.category
        };
    });
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

    // Get user's last played date BEFORE updating (for streak calculation)
    const user = db.prepare(
        'SELECT last_played_date, current_streak FROM users WHERE id = ?'
    ).get(userId);

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // Update overall user stats
    db.prepare(`
        UPDATE users
        SET overall_xp = overall_xp + ?,
            overall_level = (overall_xp + ?) / 1000 + 1,
            last_played_date = DATE('now'),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `).run(xpEarned, xpEarned, userId);

    // Update streak based on the PREVIOUS last_played_date
    if (user.last_played_date === yesterday) {
        // Played yesterday, increment streak
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
        // Didn't play yesterday or today, start new streak
        db.prepare('UPDATE users SET current_streak = 1 WHERE id = ?').run(userId);
    } else if (user.last_played_date === today && user.current_streak === 0) {
        // Fix for users who played today but have streak = 0 (legacy bug)
        db.prepare('UPDATE users SET current_streak = 1 WHERE id = ?').run(userId);
    }
    // If already played today with streak > 0, don't change streak

    // Update achievement progress
    try {
        updateAchievementProgress(db, userId, gameType, correctCount, totalQuestions, score);
    } catch (achErr) {
        console.error('ERROR in updateAchievementProgress:', achErr);
    }

    // Update daily challenge progress
    try {
        updateDailyChallengeProgress(db, userId, gameType, correctCount, totalQuestions);
    } catch (challengeErr) {
        console.error('ERROR in updateDailyChallengeProgress:', challengeErr);
    }
}

/**
 * Update achievement progress after game completion.
 *
 * @param {object} db - Database instance
 * @param {number} userId - User ID
 * @param {string} gameType - Type of game played
 * @param {number} correctCount - Number of correct answers
 * @param {number} totalQuestions - Total questions
 * @param {number} score - Score achieved
 */
function updateAchievementProgress(db, userId, gameType, correctCount, totalQuestions, score) {
    console.log('updateAchievementProgress called - gameType:', gameType, 'correctCount:', correctCount);
    // Get all achievements
    const achievements = db.prepare('SELECT * FROM achievements').all();
    console.log('Found achievements:', achievements.length);

    // For correct_count achievements, sync with actual total_correct from stats
    // This ensures progress is always accurate
    const userStats = db.prepare(
        'SELECT category, total_correct, games_played FROM user_category_stats WHERE user_id = ?'
    ).all(userId);
    const statsMap = {};
    for (const stat of userStats) {
        statsMap[stat.category] = stat;
    }

    for (const achievement of achievements) {
        let progressIncrement = 0;
        let absoluteProgress = null; // For syncing with actual stats

        switch (achievement.requirement_type) {
            case 'correct_count':
                // Category-specific correct answer tracking
                // Use absolute progress from stats to stay in sync
                if (achievement.category === 'flags' && statsMap.flags) {
                    absoluteProgress = statsMap.flags.total_correct;
                } else if (achievement.category === 'capitals' && statsMap.capitals) {
                    absoluteProgress = statsMap.capitals.total_correct;
                } else if (achievement.category === 'languages' && statsMap.languages) {
                    absoluteProgress = statsMap.languages.total_correct;
                }
                break;
            case 'games_played':
                // Category-specific or general game completion
                if (achievement.category === 'maps' && gameType === 'maps') {
                    progressIncrement = 1;
                } else if (achievement.category === 'general') {
                    // First Steps - any game counts
                    progressIncrement = 1;
                }
                break;
            case 'high_score_games':
                // Trivia Champion - 90% or higher in trivia games
                if (gameType === 'trivia' && totalQuestions > 0) {
                    const accuracy = correctCount / totalQuestions;
                    if (accuracy >= 0.9) {
                        progressIncrement = 1;
                    }
                }
                break;
            case 'perfect_game':
                // Perfect Game - 100% accuracy
                if (correctCount === totalQuestions && totalQuestions > 0) {
                    progressIncrement = 1;
                }
                break;
            case 'fast_answers':
                // Speed Demon - handled separately with timing data
                break;
            case 'continents_played':
                // World Traveler - needs region tracking
                break;
            case 'streak_days':
                // Dedicated Learner - handled by streak update
                break;
            case 'win_streak':
                // Winning Streak - handled by multiplayer
                break;
            case 'friends_count':
                // Social Butterfly - handled by friends route
                break;
        }

        // Handle absolute progress (sync with stats) or incremental progress
        if (absoluteProgress !== null || progressIncrement > 0) {
            const existing = db.prepare(
                'SELECT * FROM user_achievements WHERE user_id = ? AND achievement_id = ?'
            ).get(userId, achievement.id);

            let newProgress;
            if (absoluteProgress !== null) {
                // Use absolute progress from stats (more accurate)
                newProgress = Math.min(absoluteProgress, achievement.requirement_value);
                console.log('Achievement', achievement.name, 'setting absolute progress to', newProgress);
            } else {
                // Use incremental progress
                newProgress = Math.min(
                    (existing?.progress || 0) + progressIncrement,
                    achievement.requirement_value
                );
                console.log('Achievement', achievement.name, 'incrementing by', progressIncrement, 'to', newProgress);
            }

            const unlocked = newProgress >= achievement.requirement_value;
            const wasAlreadyUnlocked = existing && existing.unlocked_at !== null;
            const justUnlocked = unlocked && !wasAlreadyUnlocked;

            if (existing) {
                db.prepare(`
                    UPDATE user_achievements
                    SET progress = ?,
                        unlocked_at = CASE
                            WHEN ? AND unlocked_at IS NULL THEN CURRENT_TIMESTAMP
                            ELSE unlocked_at
                        END
                    WHERE user_id = ? AND achievement_id = ?
                `).run(newProgress, unlocked ? 1 : 0, userId, achievement.id);
            } else {
                db.prepare(`
                    INSERT INTO user_achievements (user_id, achievement_id, progress, unlocked_at)
                    VALUES (?, ?, ?, ?)
                `).run(
                    userId,
                    achievement.id,
                    newProgress,
                    unlocked ? new Date().toISOString() : null
                );
            }

            // Create notification for newly unlocked achievement
            if (justUnlocked) {
                db.prepare(`
                    INSERT INTO notifications (user_id, type, title, body, data_json)
                    VALUES (?, 'achievement_unlock', ?, ?, ?)
                `).run(
                    userId,
                    'Achievement Unlocked!',
                    `You earned "${achievement.name}" - ${achievement.description}`,
                    JSON.stringify({ achievementId: achievement.id, xpReward: achievement.xp_reward })
                );
                console.log('Achievement unlocked notification created:', achievement.name);
            }
        }
    }
}

/**
 * Update daily challenge progress after game completion.
 *
 * @param {object} db - Database instance
 * @param {number} userId - User ID
 * @param {string} gameType - Type of game played
 * @param {number} correctCount - Number of correct answers
 * @param {number} totalQuestions - Total questions
 */
function updateDailyChallengeProgress(db, userId, gameType, correctCount, totalQuestions) {
    const today = new Date().toISOString().split('T')[0];

    // Get today's challenges for this user
    const challenges = db.prepare(`
        SELECT * FROM daily_challenges
        WHERE user_id = ? AND date = ? AND is_completed = 0
    `).all(userId, today);

    console.log('Found', challenges.length, 'incomplete challenges for user', userId);

    for (const challenge of challenges) {
        let increment = 0;

        switch (challenge.challenge_type) {
            case 'play_games':
                // Completing any game counts
                increment = 1;
                break;
            case 'correct_answers':
                // Add correct answers from this game
                increment = correctCount;
                break;
            case 'perfect_game':
                // Check if this was a perfect game
                if (correctCount === totalQuestions && totalQuestions > 0) {
                    increment = 1;
                }
                break;
            case 'flags_practice':
                if (gameType === 'flags') increment = 1;
                break;
            case 'capitals_practice':
                if (gameType === 'capitals') increment = 1;
                break;
            case 'maps_practice':
                if (gameType === 'maps') increment = 1;
                break;
            case 'languages_practice':
                if (gameType === 'languages') increment = 1;
                break;
            case 'trivia_practice':
                if (gameType === 'trivia') increment = 1;
                break;
        }

        if (increment > 0) {
            const newValue = Math.min(
                challenge.current_value + increment,
                challenge.target_value
            );
            const isCompleted = newValue >= challenge.target_value;

            console.log(`Challenge ${challenge.challenge_type}: ${challenge.current_value} + ${increment} = ${newValue} (completed: ${isCompleted})`);

            db.prepare(`
                UPDATE daily_challenges
                SET current_value = ?, is_completed = ?
                WHERE id = ?
            `).run(newValue, isCompleted ? 1 : 0, challenge.id);

            // Award XP if completed
            if (isCompleted) {
                db.prepare(`
                    UPDATE users
                    SET overall_xp = overall_xp + ?
                    WHERE id = ?
                `).run(challenge.xp_reward, userId);

                console.log(`Awarded ${challenge.xp_reward} XP for completing challenge`);

                // Create notification
                db.prepare(`
                    INSERT INTO notifications (user_id, type, title, body)
                    VALUES (?, 'challenge_complete', 'Challenge Complete!', ?)
                `).run(userId, `You earned ${challenge.xp_reward} XP for completing "${challenge.challenge_type}"!`);
            }
        }
    }
}

/**
 * Update spaced repetition data for answered questions using SM-2 algorithm.
 * This tracks which facts the user knows well vs needs more practice on.
 *
 * @param {object} db - Database instance
 * @param {number} userId - User ID
 * @param {string} gameType - Type of game (flags, capitals, etc.)
 * @param {Array} answers - Array of answer objects with question data and correctness
 */
function updateSpacedRepetition(db, userId, gameType, answers) {
    const now = new Date().toISOString();

    for (const answer of answers) {
        // Get the fact ID from the question (countryId for most game types)
        const factId = answer.question?.countryId ||
                       answer.question?.languageId ||
                       answer.question?.triviaId;

        if (!factId) continue;

        const factType = gameType; // flags, capitals, maps, languages, trivia

        // Check if progress exists for this fact
        const existing = db.prepare(`
            SELECT * FROM user_fact_progress
            WHERE user_id = ? AND fact_type = ? AND fact_id = ?
        `).get(userId, factType, factId);

        if (existing) {
            // Update existing progress using SM-2 algorithm
            const isCorrect = answer.isCorrect;
            let { ease_factor, interval_days, times_seen, times_correct, times_wrong } = existing;

            times_seen += 1;
            if (isCorrect) {
                times_correct += 1;
                // SM-2: Increase interval for correct answers
                // New interval = old interval * ease factor
                interval_days = Math.min(Math.round(interval_days * ease_factor), 365);
                // Slightly increase ease factor (max 2.5)
                ease_factor = Math.min(ease_factor + 0.1, 2.5);
            } else {
                times_wrong += 1;
                // SM-2: Reset interval to 1 day for wrong answers
                interval_days = 1;
                // Decrease ease factor (min 1.3)
                ease_factor = Math.max(ease_factor - 0.2, 1.3);
            }

            // Calculate next review date
            const nextReview = new Date();
            nextReview.setDate(nextReview.getDate() + interval_days);

            // Calculate mastery level (0-5 based on success rate)
            const successRate = times_correct / times_seen;
            const masteryLevel = Math.min(Math.floor(successRate * 6), 5);

            db.prepare(`
                UPDATE user_fact_progress
                SET times_seen = ?, times_correct = ?, times_wrong = ?,
                    last_seen_at = ?, next_review_at = ?,
                    ease_factor = ?, interval_days = ?, mastery_level = ?
                WHERE id = ?
            `).run(
                times_seen, times_correct, times_wrong,
                now, nextReview.toISOString(),
                ease_factor, interval_days, masteryLevel,
                existing.id
            );
        } else {
            // Create new progress record
            const isCorrect = answer.isCorrect;
            const initialEase = 2.5;
            const initialInterval = isCorrect ? 1 : 1; // Start at 1 day regardless
            const nextReview = new Date();
            nextReview.setDate(nextReview.getDate() + initialInterval);

            db.prepare(`
                INSERT INTO user_fact_progress
                (user_id, fact_type, fact_id, times_seen, times_correct, times_wrong,
                 last_seen_at, next_review_at, ease_factor, interval_days, mastery_level)
                VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?, 0)
            `).run(
                userId, factType, factId,
                isCorrect ? 1 : 0,
                isCorrect ? 0 : 1,
                now, nextReview.toISOString(),
                initialEase, initialInterval
            );
        }
    }
}

export default router;
