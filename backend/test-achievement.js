/**
 * Test script to manually trigger achievement progress update.
 * Run with: node test-achievement.js
 */
import { initDatabase, getDb } from './src/models/database.js';

async function testAchievementProgress() {
    await initDatabase();
    const db = getDb();

    const userId = 1;
    const gameType = 'flags';
    const correctCount = 5;
    const totalQuestions = 10;
    const score = 500;

    console.log('Testing achievement progress update...');
    console.log('User:', userId, 'Game:', gameType, 'Correct:', correctCount);

    // Get all achievements
    const achievements = db.prepare('SELECT * FROM achievements').all();
    console.log('Found', achievements.length, 'achievements');

    for (const achievement of achievements) {
        let progressIncrement = 0;

        switch (achievement.requirement_type) {
            case 'correct_count':
                if (achievement.category === 'flags' && gameType === 'flags') {
                    progressIncrement = correctCount;
                    console.log('  Flag Master: increment by', correctCount);
                }
                break;
            case 'games_played':
                if (achievement.category === 'general') {
                    progressIncrement = 1;
                    console.log('  First Steps: increment by 1');
                }
                break;
        }

        if (progressIncrement > 0) {
            console.log('  Processing achievement:', achievement.name, 'increment:', progressIncrement);

            const existing = db.prepare(
                'SELECT * FROM user_achievements WHERE user_id = ? AND achievement_id = ?'
            ).get(userId, achievement.id);

            console.log('  Existing record:', existing);

            if (existing) {
                const newProgress = Math.min(
                    existing.progress + progressIncrement,
                    achievement.requirement_value
                );
                console.log('  Updating progress from', existing.progress, 'to', newProgress);

                db.prepare(`
                    UPDATE user_achievements
                    SET progress = ?
                    WHERE user_id = ? AND achievement_id = ?
                `).run(newProgress, userId, achievement.id);
            } else {
                const progress = Math.min(progressIncrement, achievement.requirement_value);
                console.log('  Creating new record with progress:', progress);

                db.prepare(`
                    INSERT INTO user_achievements (user_id, achievement_id, progress, unlocked_at)
                    VALUES (?, ?, ?, ?)
                `).run(userId, achievement.id, progress, null);
            }
        }
    }

    // Verify results
    console.log('\nVerifying results...');
    const userAchievements = db.prepare(
        'SELECT ua.*, a.name FROM user_achievements ua JOIN achievements a ON a.id = ua.achievement_id WHERE ua.user_id = ?'
    ).all(userId);
    console.log('User achievements:', userAchievements);
}

testAchievementProgress().catch(console.error);
