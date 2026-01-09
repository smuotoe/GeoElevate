import pg from 'pg';

const { Pool } = pg;

let pool = null;

/**
 * Initialize the PostgreSQL database connection and create all required tables.
 *
 * @returns {Promise<void>}
 */
export async function initDatabase() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        throw new Error('DATABASE_URL environment variable is required');
    }

    pool = new Pool({
        connectionString,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    // Test connection
    const client = await pool.connect();
    try {
        await client.query('SELECT NOW()');
        console.log('Database connected successfully');

        // Create tables
        await createTables(client);
        console.log('Database initialized successfully');
    } finally {
        client.release();
    }

    return pool;
}

/**
 * Get the database pool instance.
 *
 * @returns {object} Database wrapper with prepare method for compatibility
 * @throws {Error} If database is not initialized
 */
export function getDb() {
    if (!pool) {
        throw new Error('Database not initialized. Call initDatabase() first.');
    }
    return createDbWrapper(pool);
}

/**
 * Create a wrapper around pg pool to provide better-sqlite3 compatible API.
 *
 * @param {Pool} database - The pg Pool instance
 * @returns {object} Wrapped database with prepare method
 */
function createDbWrapper(database) {
    return {
        /**
         * Begin a database transaction.
         *
         * @returns {Promise<pg.PoolClient>} Client with active transaction
         */
        async beginTransaction() {
            const client = await database.connect();
            await client.query('BEGIN');
            return client;
        },

        /**
         * Commit a transaction.
         *
         * @param {pg.PoolClient} client - Client with active transaction
         */
        async commit(client) {
            await client.query('COMMIT');
            client.release();
        },

        /**
         * Rollback a transaction.
         *
         * @param {pg.PoolClient} client - Client with active transaction
         */
        async rollback(client) {
            await client.query('ROLLBACK');
            client.release();
        },

        /**
         * Execute a function within a transaction.
         *
         * @param {Function} fn - Async function to execute within transaction
         * @returns {Promise<*>} Result of the function
         */
        async transaction(fn) {
            const client = await database.connect();
            try {
                await client.query('BEGIN');
                const result = await fn(createClientWrapper(client));
                await client.query('COMMIT');
                return result;
            } catch (err) {
                await client.query('ROLLBACK');
                throw err;
            } finally {
                client.release();
            }
        },

        /**
         * Prepare a SQL statement (compatibility layer).
         * Converts ? placeholders to $1, $2, etc.
         *
         * @param {string} sql - SQL query string with ? placeholders
         * @returns {object} Statement object with get, all, run methods
         */
        prepare(sql) {
            const pgSql = convertPlaceholders(sql);

            return {
                /**
                 * Execute query and return first row.
                 *
                 * @param {...*} params - Query parameters
                 * @returns {Promise<object|undefined>} First result row or undefined
                 */
                async get(...params) {
                    try {
                        const result = await database.query(pgSql, params);
                        return result.rows[0];
                    } catch (err) {
                        console.error('Database error in get:', err.message, 'SQL:', pgSql);
                        throw err;
                    }
                },

                /**
                 * Execute query and return all rows.
                 *
                 * @param {...*} params - Query parameters
                 * @returns {Promise<Array<object>>} All result rows
                 */
                async all(...params) {
                    try {
                        const result = await database.query(pgSql, params);
                        return result.rows;
                    } catch (err) {
                        console.error('Database error in all:', err.message, 'SQL:', pgSql);
                        throw err;
                    }
                },

                /**
                 * Execute query (INSERT, UPDATE, DELETE).
                 *
                 * @param {...*} params - Query parameters
                 * @returns {Promise<object>} Result with changes and lastInsertRowid
                 */
                async run(...params) {
                    try {
                        // For INSERT statements, try to get the returning id
                        let execSql = pgSql;
                        const isInsert = pgSql.trim().toUpperCase().startsWith('INSERT');
                        if (isInsert && !pgSql.toUpperCase().includes('RETURNING')) {
                            execSql = pgSql.replace(/;?\s*$/, ' RETURNING id');
                        }

                        const result = await database.query(execSql, params);
                        return {
                            changes: result.rowCount,
                            lastInsertRowid: result.rows[0]?.id || 0
                        };
                    } catch (err) {
                        console.error('Database error in run:', err.message, 'SQL:', pgSql);
                        throw err;
                    }
                }
            };
        },

        /**
         * Execute raw SQL.
         *
         * @param {string} sql - SQL to execute
         * @returns {Promise<void>}
         */
        async exec(sql) {
            await database.query(sql);
        }
    };
}

/**
 * Create a wrapper for a transaction client.
 *
 * @param {pg.PoolClient} client - Transaction client
 * @returns {object} Wrapped client with prepare method
 */
function createClientWrapper(client) {
    return {
        prepare(sql) {
            const pgSql = convertPlaceholders(sql);

            return {
                async get(...params) {
                    const result = await client.query(pgSql, params);
                    return result.rows[0];
                },
                async all(...params) {
                    const result = await client.query(pgSql, params);
                    return result.rows;
                },
                async run(...params) {
                    let execSql = pgSql;
                    const isInsert = pgSql.trim().toUpperCase().startsWith('INSERT');
                    if (isInsert && !pgSql.toUpperCase().includes('RETURNING')) {
                        execSql = pgSql.replace(/;?\s*$/, ' RETURNING id');
                    }
                    const result = await client.query(execSql, params);
                    return {
                        changes: result.rowCount,
                        lastInsertRowid: result.rows[0]?.id || 0
                    };
                }
            };
        }
    };
}

/**
 * Convert ? placeholders to PostgreSQL $1, $2, etc.
 *
 * @param {string} sql - SQL with ? placeholders
 * @returns {string} SQL with $n placeholders
 */
function convertPlaceholders(sql) {
    let index = 0;
    return sql.replace(/\?/g, () => `$${++index}`);
}

/**
 * Create all database tables.
 *
 * @param {pg.PoolClient} client - Database client
 */
async function createTables(client) {
    // Users table
    await client.query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email TEXT UNIQUE,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT,
            avatar_url TEXT DEFAULT '/avatars/default.png',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login_at TIMESTAMP,
            is_guest BOOLEAN DEFAULT FALSE,
            email_verified BOOLEAN DEFAULT FALSE,
            overall_xp INTEGER DEFAULT 0,
            overall_level INTEGER DEFAULT 1,
            current_streak INTEGER DEFAULT 0,
            longest_streak INTEGER DEFAULT 0,
            last_played_date DATE,
            settings_json TEXT DEFAULT '{}',
            pending_email TEXT,
            pending_email_token TEXT,
            pending_email_expires TIMESTAMP,
            last_active_at TIMESTAMP
        )
    `);

    // User category stats table
    await client.query(`
        CREATE TABLE IF NOT EXISTS user_category_stats (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            category TEXT NOT NULL CHECK(category IN ('flags', 'capitals', 'maps', 'languages', 'trivia')),
            xp INTEGER DEFAULT 0,
            level INTEGER DEFAULT 1,
            games_played INTEGER DEFAULT 0,
            total_correct INTEGER DEFAULT 0,
            total_questions INTEGER DEFAULT 0,
            high_score INTEGER DEFAULT 0,
            average_time_ms INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, category)
        )
    `);

    // User fact progress (for spaced repetition)
    await client.query(`
        CREATE TABLE IF NOT EXISTS user_fact_progress (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            fact_type TEXT NOT NULL,
            fact_id INTEGER NOT NULL,
            times_seen INTEGER DEFAULT 0,
            times_correct INTEGER DEFAULT 0,
            times_wrong INTEGER DEFAULT 0,
            last_seen_at TIMESTAMP,
            next_review_at TIMESTAMP,
            ease_factor REAL DEFAULT 2.5,
            interval_days INTEGER DEFAULT 1,
            mastery_level INTEGER DEFAULT 0,
            UNIQUE(user_id, fact_type, fact_id)
        )
    `);

    // Game sessions table
    await client.query(`
        CREATE TABLE IF NOT EXISTS game_sessions (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            game_type TEXT NOT NULL,
            game_mode TEXT DEFAULT 'solo',
            score INTEGER DEFAULT 0,
            xp_earned INTEGER DEFAULT 0,
            correct_count INTEGER DEFAULT 0,
            total_questions INTEGER DEFAULT 10,
            average_time_ms INTEGER DEFAULT 0,
            started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            completed_at TIMESTAMP,
            difficulty_level TEXT DEFAULT 'medium',
            region_filter TEXT,
            is_offline_sync BOOLEAN DEFAULT FALSE
        )
    `);

    // Game answers table
    await client.query(`
        CREATE TABLE IF NOT EXISTS game_answers (
            id SERIAL PRIMARY KEY,
            session_id INTEGER NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
            question_index INTEGER NOT NULL,
            question_data_json TEXT NOT NULL,
            user_answer TEXT,
            correct_answer TEXT NOT NULL,
            is_correct BOOLEAN DEFAULT FALSE,
            time_ms INTEGER DEFAULT 0
        )
    `);

    // Multiplayer matches table
    await client.query(`
        CREATE TABLE IF NOT EXISTS multiplayer_matches (
            id SERIAL PRIMARY KEY,
            challenger_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            opponent_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            game_type TEXT NOT NULL,
            status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'active', 'completed', 'cancelled')),
            challenger_score INTEGER DEFAULT 0,
            opponent_score INTEGER DEFAULT 0,
            winner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            started_at TIMESTAMP,
            completed_at TIMESTAMP
        )
    `);

    // Multiplayer answers table
    await client.query(`
        CREATE TABLE IF NOT EXISTS multiplayer_answers (
            id SERIAL PRIMARY KEY,
            match_id INTEGER NOT NULL REFERENCES multiplayer_matches(id) ON DELETE CASCADE,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            question_index INTEGER NOT NULL,
            question_data_json TEXT NOT NULL,
            user_answer TEXT,
            correct_answer TEXT NOT NULL,
            is_correct BOOLEAN DEFAULT FALSE,
            time_ms INTEGER DEFAULT 0,
            answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Friendships table
    await client.query(`
        CREATE TABLE IF NOT EXISTS friendships (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            friend_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'blocked')),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            accepted_at TIMESTAMP,
            UNIQUE(user_id, friend_id)
        )
    `);

    // Activity feed table
    await client.query(`
        CREATE TABLE IF NOT EXISTS activity_feed (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            activity_type TEXT NOT NULL,
            target_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            data_json TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Achievements table
    await client.query(`
        CREATE TABLE IF NOT EXISTS achievements (
            id SERIAL PRIMARY KEY,
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
    await client.query(`
        CREATE TABLE IF NOT EXISTS user_achievements (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            achievement_id INTEGER NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
            progress INTEGER DEFAULT 0,
            unlocked_at TIMESTAMP,
            UNIQUE(user_id, achievement_id)
        )
    `);

    // Daily challenges table
    await client.query(`
        CREATE TABLE IF NOT EXISTS daily_challenges (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            date DATE NOT NULL,
            challenge_type TEXT NOT NULL,
            target_value INTEGER NOT NULL,
            current_value INTEGER DEFAULT 0,
            is_completed BOOLEAN DEFAULT FALSE,
            xp_reward INTEGER DEFAULT 50,
            UNIQUE(user_id, date, challenge_type)
        )
    `);

    // Notifications table
    await client.query(`
        CREATE TABLE IF NOT EXISTS notifications (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            type TEXT NOT NULL,
            title TEXT NOT NULL,
            body TEXT,
            data_json TEXT,
            is_read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Leaderboard snapshots table
    await client.query(`
        CREATE TABLE IF NOT EXISTS leaderboard_snapshots (
            id SERIAL PRIMARY KEY,
            leaderboard_type TEXT NOT NULL,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            score INTEGER NOT NULL,
            rank INTEGER NOT NULL,
            period_start DATE,
            period_end DATE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Countries table
    await client.query(`
        CREATE TABLE IF NOT EXISTS countries (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            code TEXT NOT NULL UNIQUE,
            continent TEXT NOT NULL,
            region TEXT,
            population INTEGER,
            capital_id INTEGER
        )
    `);

    // Capitals table
    await client.query(`
        CREATE TABLE IF NOT EXISTS capitals (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            country_id INTEGER NOT NULL REFERENCES countries(id) ON DELETE CASCADE
        )
    `);

    // Flags table
    await client.query(`
        CREATE TABLE IF NOT EXISTS flags (
            id SERIAL PRIMARY KEY,
            country_id INTEGER NOT NULL UNIQUE REFERENCES countries(id) ON DELETE CASCADE,
            image_url TEXT NOT NULL
        )
    `);

    // Languages table
    await client.query(`
        CREATE TABLE IF NOT EXISTS languages (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL UNIQUE
        )
    `);

    // Country-Languages junction table
    await client.query(`
        CREATE TABLE IF NOT EXISTS country_languages (
            country_id INTEGER NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
            language_id INTEGER NOT NULL REFERENCES languages(id) ON DELETE CASCADE,
            is_official BOOLEAN DEFAULT TRUE,
            PRIMARY KEY (country_id, language_id)
        )
    `);

    // Trivia facts table
    await client.query(`
        CREATE TABLE IF NOT EXISTS trivia_facts (
            id SERIAL PRIMARY KEY,
            category TEXT NOT NULL,
            question TEXT NOT NULL,
            answer TEXT NOT NULL,
            difficulty TEXT DEFAULT 'medium' CHECK(difficulty IN ('easy', 'medium', 'hard')),
            region TEXT
        )
    `);

    // Refresh tokens table
    await client.query(`
        CREATE TABLE IF NOT EXISTS refresh_tokens (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            token TEXT NOT NULL UNIQUE,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Password reset tokens table
    await client.query(`
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            token TEXT NOT NULL UNIQUE,
            expires_at TIMESTAMP NOT NULL,
            used BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Create indexes for performance
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_game_sessions_user ON game_sessions(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_game_sessions_type ON game_sessions(game_type)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_friendships_user ON friendships(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_friendships_friend ON friendships(friend_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_activity_feed_user ON activity_feed(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_user_fact_progress_user ON user_fact_progress(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_multiplayer_challenger ON multiplayer_matches(challenger_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_multiplayer_opponent ON multiplayer_matches(opponent_id)');
}

/**
 * Close the database connection pool.
 *
 * @returns {Promise<void>}
 */
export async function closeDatabase() {
    if (pool) {
        await pool.end();
        pool = null;
    }
}

export default { initDatabase, getDb, closeDatabase };
