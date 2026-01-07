import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db = null;

/**
 * Initialize the SQLite database and create all required tables.
 *
 * @returns {Database} The initialized database instance
 */
export function initDatabase() {
    const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../data/geoelevate.db');
    db = new Database(dbPath);

    // Enable foreign keys
    db.pragma('foreign_keys = ON');

    // Create tables
    createTables();

    console.log('Database initialized successfully');
    return db;
}

/**
 * Get the database instance.
 *
 * @returns {Database} The database instance
 * @throws {Error} If database is not initialized
 */
export function getDb() {
    if (!db) {
        throw new Error('Database not initialized. Call initDatabase() first.');
    }
    return db;
}

/**
 * Create all database tables.
 */
function createTables() {
    // Users table
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT,
            avatar_url TEXT DEFAULT '/avatars/default.png',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_login_at DATETIME,
            is_guest INTEGER DEFAULT 0,
            email_verified INTEGER DEFAULT 0,
            overall_xp INTEGER DEFAULT 0,
            overall_level INTEGER DEFAULT 1,
            current_streak INTEGER DEFAULT 0,
            longest_streak INTEGER DEFAULT 0,
            last_played_date DATE,
            settings_json TEXT DEFAULT '{}'
        )
    `);

    // User category stats table
    db.exec(`
        CREATE TABLE IF NOT EXISTS user_category_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            category TEXT NOT NULL CHECK(category IN ('flags', 'capitals', 'maps', 'languages', 'trivia')),
            xp INTEGER DEFAULT 0,
            level INTEGER DEFAULT 1,
            games_played INTEGER DEFAULT 0,
            total_correct INTEGER DEFAULT 0,
            total_questions INTEGER DEFAULT 0,
            high_score INTEGER DEFAULT 0,
            average_time_ms INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(user_id, category)
        )
    `);

    // User fact progress (for spaced repetition)
    db.exec(`
        CREATE TABLE IF NOT EXISTS user_fact_progress (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            fact_type TEXT NOT NULL,
            fact_id INTEGER NOT NULL,
            times_seen INTEGER DEFAULT 0,
            times_correct INTEGER DEFAULT 0,
            times_wrong INTEGER DEFAULT 0,
            last_seen_at DATETIME,
            next_review_at DATETIME,
            ease_factor REAL DEFAULT 2.5,
            interval_days INTEGER DEFAULT 1,
            mastery_level INTEGER DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(user_id, fact_type, fact_id)
        )
    `);

    // Game sessions table
    db.exec(`
        CREATE TABLE IF NOT EXISTS game_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            game_type TEXT NOT NULL,
            game_mode TEXT DEFAULT 'solo',
            score INTEGER DEFAULT 0,
            xp_earned INTEGER DEFAULT 0,
            correct_count INTEGER DEFAULT 0,
            total_questions INTEGER DEFAULT 10,
            average_time_ms INTEGER DEFAULT 0,
            started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            completed_at DATETIME,
            difficulty_level TEXT DEFAULT 'medium',
            region_filter TEXT,
            is_offline_sync INTEGER DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // Game answers table
    db.exec(`
        CREATE TABLE IF NOT EXISTS game_answers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER NOT NULL,
            question_index INTEGER NOT NULL,
            question_data_json TEXT NOT NULL,
            user_answer TEXT,
            correct_answer TEXT NOT NULL,
            is_correct INTEGER DEFAULT 0,
            time_ms INTEGER DEFAULT 0,
            FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE
        )
    `);

    // Multiplayer matches table
    db.exec(`
        CREATE TABLE IF NOT EXISTS multiplayer_matches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            challenger_id INTEGER NOT NULL,
            opponent_id INTEGER NOT NULL,
            game_type TEXT NOT NULL,
            status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'active', 'completed', 'cancelled')),
            challenger_score INTEGER DEFAULT 0,
            opponent_score INTEGER DEFAULT 0,
            winner_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            started_at DATETIME,
            completed_at DATETIME,
            FOREIGN KEY (challenger_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (opponent_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (winner_id) REFERENCES users(id) ON DELETE SET NULL
        )
    `);

    // Multiplayer answers table
    db.exec(`
        CREATE TABLE IF NOT EXISTS multiplayer_answers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            match_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            question_index INTEGER NOT NULL,
            question_data_json TEXT NOT NULL,
            user_answer TEXT,
            correct_answer TEXT NOT NULL,
            is_correct INTEGER DEFAULT 0,
            time_ms INTEGER DEFAULT 0,
            answered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (match_id) REFERENCES multiplayer_matches(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // Friendships table
    db.exec(`
        CREATE TABLE IF NOT EXISTS friendships (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            friend_id INTEGER NOT NULL,
            status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'blocked')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            accepted_at DATETIME,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(user_id, friend_id)
        )
    `);

    // Activity feed table
    db.exec(`
        CREATE TABLE IF NOT EXISTS activity_feed (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            activity_type TEXT NOT NULL,
            target_user_id INTEGER,
            data_json TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE SET NULL
        )
    `);

    // Achievements table
    db.exec(`
        CREATE TABLE IF NOT EXISTS achievements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            description TEXT NOT NULL,
            icon TEXT DEFAULT 'trophy',
            category TEXT NOT NULL,
            requirement_type TEXT NOT NULL,
            requirement_value INTEGER NOT NULL,
            xp_reward INTEGER DEFAULT 100
        )
    `);

    // User achievements table
    db.exec(`
        CREATE TABLE IF NOT EXISTS user_achievements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            achievement_id INTEGER NOT NULL,
            progress INTEGER DEFAULT 0,
            unlocked_at DATETIME,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE,
            UNIQUE(user_id, achievement_id)
        )
    `);

    // Daily challenges table
    db.exec(`
        CREATE TABLE IF NOT EXISTS daily_challenges (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            date DATE NOT NULL,
            challenge_type TEXT NOT NULL,
            target_value INTEGER NOT NULL,
            current_value INTEGER DEFAULT 0,
            is_completed INTEGER DEFAULT 0,
            xp_reward INTEGER DEFAULT 50,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(user_id, date, challenge_type)
        )
    `);

    // Notifications table
    db.exec(`
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            type TEXT NOT NULL,
            title TEXT NOT NULL,
            body TEXT,
            data_json TEXT,
            is_read INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // Leaderboard snapshots table
    db.exec(`
        CREATE TABLE IF NOT EXISTS leaderboard_snapshots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            leaderboard_type TEXT NOT NULL,
            user_id INTEGER NOT NULL,
            score INTEGER NOT NULL,
            rank INTEGER NOT NULL,
            period_start DATE,
            period_end DATE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // Geography data tables
    // Countries table
    db.exec(`
        CREATE TABLE IF NOT EXISTS countries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            code TEXT NOT NULL UNIQUE,
            continent TEXT NOT NULL,
            region TEXT,
            population INTEGER,
            capital_id INTEGER
        )
    `);

    // Capitals table
    db.exec(`
        CREATE TABLE IF NOT EXISTS capitals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            country_id INTEGER NOT NULL,
            FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE CASCADE
        )
    `);

    // Flags table
    db.exec(`
        CREATE TABLE IF NOT EXISTS flags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            country_id INTEGER NOT NULL UNIQUE,
            image_url TEXT NOT NULL,
            FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE CASCADE
        )
    `);

    // Languages table
    db.exec(`
        CREATE TABLE IF NOT EXISTS languages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE
        )
    `);

    // Country-Languages junction table
    db.exec(`
        CREATE TABLE IF NOT EXISTS country_languages (
            country_id INTEGER NOT NULL,
            language_id INTEGER NOT NULL,
            is_official INTEGER DEFAULT 1,
            PRIMARY KEY (country_id, language_id),
            FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE CASCADE,
            FOREIGN KEY (language_id) REFERENCES languages(id) ON DELETE CASCADE
        )
    `);

    // Trivia facts table
    db.exec(`
        CREATE TABLE IF NOT EXISTS trivia_facts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category TEXT NOT NULL,
            question TEXT NOT NULL,
            answer TEXT NOT NULL,
            difficulty TEXT DEFAULT 'medium' CHECK(difficulty IN ('easy', 'medium', 'hard')),
            region TEXT
        )
    `);

    // Refresh tokens table (for JWT refresh token management)
    db.exec(`
        CREATE TABLE IF NOT EXISTS refresh_tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            token TEXT NOT NULL UNIQUE,
            expires_at DATETIME NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // Create indexes for performance
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
        CREATE INDEX IF NOT EXISTS idx_game_sessions_user ON game_sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_game_sessions_type ON game_sessions(game_type);
        CREATE INDEX IF NOT EXISTS idx_friendships_user ON friendships(user_id);
        CREATE INDEX IF NOT EXISTS idx_friendships_friend ON friendships(friend_id);
        CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
        CREATE INDEX IF NOT EXISTS idx_activity_feed_user ON activity_feed(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_fact_progress_user ON user_fact_progress(user_id);
        CREATE INDEX IF NOT EXISTS idx_multiplayer_challenger ON multiplayer_matches(challenger_id);
        CREATE INDEX IF NOT EXISTS idx_multiplayer_opponent ON multiplayer_matches(opponent_id);
    `);
}

export default { initDatabase, getDb };
