import { Router } from 'express';
import { getDb } from '../models/database.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

const QUESTIONS_PER_CATEGORY = 3;

/**
 * Sample assessment questions for each category.
 * In production, these would come from a database.
 */
const ASSESSMENT_QUESTIONS = {
    flags: [
        {
            id: 'flags_1',
            question: 'Which country has a flag with a red circle on a white background?',
            options: ['Japan', 'South Korea', 'China', 'Vietnam'],
            correct_answer: 'Japan'
        },
        {
            id: 'flags_2',
            question: 'The flag of which country features a maple leaf?',
            options: ['United States', 'Canada', 'Australia', 'New Zealand'],
            correct_answer: 'Canada'
        },
        {
            id: 'flags_3',
            question: 'Which country\'s flag has horizontal stripes of black, red, and gold?',
            options: ['Belgium', 'Germany', 'Austria', 'Netherlands'],
            correct_answer: 'Germany'
        }
    ],
    capitals: [
        {
            id: 'capitals_1',
            question: 'What is the capital of Australia?',
            options: ['Sydney', 'Melbourne', 'Canberra', 'Brisbane'],
            correct_answer: 'Canberra'
        },
        {
            id: 'capitals_2',
            question: 'What is the capital of Brazil?',
            options: ['Rio de Janeiro', 'Sao Paulo', 'Brasilia', 'Salvador'],
            correct_answer: 'Brasilia'
        },
        {
            id: 'capitals_3',
            question: 'What is the capital of South Africa?',
            options: ['Cape Town', 'Johannesburg', 'Pretoria', 'Durban'],
            correct_answer: 'Pretoria'
        }
    ],
    maps: [
        {
            id: 'maps_1',
            question: 'Which continent is the largest by land area?',
            options: ['Africa', 'North America', 'Asia', 'Europe'],
            correct_answer: 'Asia'
        },
        {
            id: 'maps_2',
            question: 'Which ocean lies between Africa and Australia?',
            options: ['Atlantic Ocean', 'Pacific Ocean', 'Indian Ocean', 'Arctic Ocean'],
            correct_answer: 'Indian Ocean'
        },
        {
            id: 'maps_3',
            question: 'Which country shares the longest border with the United States?',
            options: ['Mexico', 'Canada', 'Russia', 'Cuba'],
            correct_answer: 'Canada'
        }
    ],
    languages: [
        {
            id: 'languages_1',
            question: 'What is the most spoken native language in the world?',
            options: ['English', 'Spanish', 'Mandarin Chinese', 'Hindi'],
            correct_answer: 'Mandarin Chinese'
        },
        {
            id: 'languages_2',
            question: 'Which language is NOT an official language of Switzerland?',
            options: ['German', 'French', 'Dutch', 'Italian'],
            correct_answer: 'Dutch'
        },
        {
            id: 'languages_3',
            question: 'In which country is Swahili an official language?',
            options: ['Nigeria', 'Kenya', 'South Africa', 'Egypt'],
            correct_answer: 'Kenya'
        }
    ],
    trivia: [
        {
            id: 'trivia_1',
            question: 'Which is the smallest country in the world by area?',
            options: ['Monaco', 'Vatican City', 'San Marino', 'Liechtenstein'],
            correct_answer: 'Vatican City'
        },
        {
            id: 'trivia_2',
            question: 'Which river is the longest in the world?',
            options: ['Amazon', 'Nile', 'Yangtze', 'Mississippi'],
            correct_answer: 'Nile'
        },
        {
            id: 'trivia_3',
            question: 'Mount Everest is located on the border of which two countries?',
            options: ['India and China', 'Nepal and Tibet/China', 'Pakistan and India', 'Bhutan and Nepal'],
            correct_answer: 'Nepal and Tibet/China'
        }
    ]
};

/**
 * Get assessment questions.
 * GET /api/assessment/questions
 */
router.get('/questions', authenticate, async (req, res, next) => {
    try {
        // Combine questions from all categories
        const questions = [];
        const categories = Object.keys(ASSESSMENT_QUESTIONS);

        for (const category of categories) {
            const categoryQuestions = ASSESSMENT_QUESTIONS[category]
                .slice(0, QUESTIONS_PER_CATEGORY)
                .map(q => ({ ...q, category }));
            questions.push(...categoryQuestions);
        }

        // Shuffle questions for variety
        const shuffled = questions.sort(() => Math.random() - 0.5);

        res.json({ questions: shuffled });
    } catch (err) {
        next(err);
    }
});

/**
 * Submit assessment answers and calculate initial skill levels.
 * POST /api/assessment/submit
 */
router.post('/submit', authenticate, async (req, res, next) => {
    try {
        const { answers } = req.body;
        const db = getDb();

        if (!answers || !Array.isArray(answers)) {
            return res.status(400).json({
                error: { message: 'Answers array is required' }
            });
        }

        // Calculate scores per category
        const categoryScores = {};
        const categories = ['flags', 'capitals', 'maps', 'languages', 'trivia'];

        for (const category of categories) {
            categoryScores[category] = { correct: 0, total: 0 };
        }

        let totalCorrect = 0;
        for (const answer of answers) {
            const category = answer.category;
            if (categoryScores[category]) {
                categoryScores[category].total++;
                if (answer.isCorrect) {
                    categoryScores[category].correct++;
                    totalCorrect++;
                }
            }
        }

        // Calculate initial levels based on performance
        // 0 correct = level 1, 1 correct = level 1, 2 correct = level 2, 3 correct = level 3
        for (const category of categories) {
            const score = categoryScores[category];
            let initialLevel = 1;
            let initialXp = 0;

            if (score.total > 0) {
                const percentage = score.correct / score.total;
                if (percentage >= 0.9) {
                    initialLevel = 3;
                    initialXp = 50;
                } else if (percentage >= 0.66) {
                    initialLevel = 2;
                    initialXp = 25;
                } else if (percentage >= 0.33) {
                    initialLevel = 1;
                    initialXp = 10;
                }
            }

            categoryScores[category].initialLevel = initialLevel;

            // Update user's category stats
            await db.prepare(`
                UPDATE user_category_stats
                SET level = ?, xp = ?
                WHERE user_id = ? AND category = ?
            `).run(initialLevel, initialXp, req.userId, category);
        }

        // Mark assessment as completed
        await db.prepare(`
            UPDATE users
            SET settings_json = json_set(COALESCE(settings_json, '{}'), '$.assessmentCompleted', true),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(req.userId);

        res.json({
            message: 'Assessment completed',
            results: {
                categoryScores,
                totalCorrect,
                totalQuestions: answers.length
            }
        });
    } catch (err) {
        next(err);
    }
});

/**
 * Skip assessment.
 * POST /api/assessment/skip
 */
router.post('/skip', authenticate, async (req, res, next) => {
    try {
        const db = getDb();

        // Mark assessment as skipped
        await db.prepare(`
            UPDATE users
            SET settings_json = json_set(COALESCE(settings_json, '{}'), '$.assessmentSkipped', true),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(req.userId);

        res.json({ message: 'Assessment skipped' });
    } catch (err) {
        next(err);
    }
});

/**
 * Check assessment status.
 * GET /api/assessment/status
 */
router.get('/status', authenticate, async (req, res, next) => {
    try {
        const db = getDb();

        const user = await db.prepare(`
            SELECT settings_json FROM users WHERE id = ?
        `).get(req.userId);

        const settings = JSON.parse(user?.settings_json || '{}');

        res.json({
            completed: settings.assessmentCompleted || false,
            skipped: settings.assessmentSkipped || false,
            needsAssessment: !settings.assessmentCompleted && !settings.assessmentSkipped
        });
    } catch (err) {
        next(err);
    }
});

export default router;
