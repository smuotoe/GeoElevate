import { Router } from 'express';
import { getDb } from '../models/database.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

/**
 * Sync offline data.
 * POST /api/sync/offline-data
 */
router.post('/offline-data', authenticate, (req, res, next) => {
    try {
        const { gameSessions = [] } = req.body;
        const db = getDb();

        const synced = [];
        const errors = [];

        for (const session of gameSessions) {
            try {
                // Insert game session
                const result = db.prepare(`
                    INSERT INTO game_sessions (
                        user_id, game_type, game_mode, score, xp_earned,
                        correct_count, total_questions, average_time_ms,
                        started_at, completed_at, difficulty_level, region_filter,
                        is_offline_sync
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
                `).run(
                    req.userId,
                    session.gameType,
                    session.gameMode || 'solo',
                    session.score,
                    session.xpEarned,
                    session.correctCount,
                    session.totalQuestions,
                    session.averageTimeMs,
                    session.startedAt,
                    session.completedAt,
                    session.difficultyLevel,
                    session.regionFilter
                );

                const sessionId = result.lastInsertRowid;

                // Insert answers
                if (session.answers && Array.isArray(session.answers)) {
                    const insertAnswer = db.prepare(`
                        INSERT INTO game_answers (
                            session_id, question_index, question_data_json,
                            user_answer, correct_answer, is_correct, time_ms
                        )
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    `);

                    for (let i = 0; i < session.answers.length; i++) {
                        const answer = session.answers[i];
                        insertAnswer.run(
                            sessionId, i,
                            JSON.stringify(answer.question),
                            answer.userAnswer,
                            answer.correctAnswer,
                            answer.isCorrect ? 1 : 0,
                            answer.timeMs
                        );
                    }
                }

                // Update user stats
                updateUserStatsFromSync(db, req.userId, session);

                synced.push({
                    localId: session.localId,
                    serverId: sessionId
                });
            } catch (err) {
                errors.push({
                    localId: session.localId,
                    error: err.message
                });
            }
        }

        res.json({
            message: 'Sync completed',
            synced,
            errors
        });
    } catch (err) {
        next(err);
    }
});

/**
 * Update user statistics from synced session.
 *
 * @param {Database} db - Database instance
 * @param {number} userId - User ID
 * @param {object} session - Game session data
 */
function updateUserStatsFromSync(db, userId, session) {
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
    `).run(
        session.xpEarned,
        session.correctCount,
        session.totalQuestions,
        session.score,
        session.score,
        userId,
        session.gameType
    );

    // Update overall user stats
    db.prepare(`
        UPDATE users
        SET overall_xp = overall_xp + ?,
            overall_level = (overall_xp + ?) / 1000 + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `).run(session.xpEarned, session.xpEarned, userId);
}

export default router;
