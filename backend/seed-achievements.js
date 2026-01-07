import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function seedAchievements() {
    const dbPath = path.join(__dirname, 'data/geoelevate.db');

    if (!fs.existsSync(dbPath)) {
        console.error('Database not found at:', dbPath);
        process.exit(1);
    }

    const SQL = await initSqlJs();
    const fileBuffer = fs.readFileSync(dbPath);
    const db = new SQL.Database(fileBuffer);

    const achievements = [
        { name: 'Flag Master', description: 'Identify 100 flags correctly', icon: 'flag', category: 'flags', requirement_type: 'correct_count', requirement_value: 100, xp_reward: 500 },
        { name: 'World Traveler', description: 'Play games from all continents', icon: 'globe', category: 'general', requirement_type: 'continents_played', requirement_value: 7, xp_reward: 300 },
        { name: 'Speed Demon', description: 'Answer 10 questions in under 3 seconds each', icon: 'bolt', category: 'speed', requirement_type: 'fast_answers', requirement_value: 10, xp_reward: 250 },
        { name: 'Perfect Game', description: 'Score 100% on any game', icon: 'star', category: 'accuracy', requirement_type: 'perfect_game', requirement_value: 1, xp_reward: 200 },
        { name: 'Social Butterfly', description: 'Add 10 friends', icon: 'users', category: 'social', requirement_type: 'friends_count', requirement_value: 10, xp_reward: 150 },
        { name: 'Winning Streak', description: 'Win 5 multiplayer matches in a row', icon: 'trophy', category: 'multiplayer', requirement_type: 'win_streak', requirement_value: 5, xp_reward: 400 },
        { name: 'Dedicated Learner', description: 'Maintain a 30-day streak', icon: 'fire', category: 'streak', requirement_type: 'streak_days', requirement_value: 30, xp_reward: 1000 },
        { name: 'Capital Expert', description: 'Identify 50 capitals correctly', icon: 'building', category: 'capitals', requirement_type: 'correct_count', requirement_value: 50, xp_reward: 300 },
        { name: 'Map Navigator', description: 'Complete 20 map games', icon: 'map', category: 'maps', requirement_type: 'games_played', requirement_value: 20, xp_reward: 250 },
        { name: 'Linguist', description: 'Answer 30 language questions correctly', icon: 'language', category: 'languages', requirement_type: 'correct_count', requirement_value: 30, xp_reward: 300 },
        { name: 'Trivia Champion', description: 'Score over 90% in 10 trivia games', icon: 'brain', category: 'trivia', requirement_type: 'high_score_games', requirement_value: 10, xp_reward: 350 },
        { name: 'First Steps', description: 'Complete your first game', icon: 'check', category: 'general', requirement_type: 'games_played', requirement_value: 1, xp_reward: 50 }
    ];

    // Clear existing achievements
    db.run('DELETE FROM user_achievements');
    db.run('DELETE FROM achievements');

    // Insert new achievements
    const stmt = db.prepare('INSERT INTO achievements (name, description, icon, category, requirement_type, requirement_value, xp_reward) VALUES (?, ?, ?, ?, ?, ?, ?)');

    for (const ach of achievements) {
        stmt.run([ach.name, ach.description, ach.icon, ach.category, ach.requirement_type, ach.requirement_value, ach.xp_reward]);
    }
    stmt.free();

    // Save database
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);

    console.log(`Seeded ${achievements.length} achievements successfully!`);
    db.close();
}

seedAchievements().catch(console.error);
