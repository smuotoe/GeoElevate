import { Router } from 'express';
import { getDb } from '../models/database.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '../middleware/auth.js';

const router = Router();

/**
 * Register a new user.
 * POST /api/auth/register
 */
router.post('/register', async (req, res, next) => {
    try {
        const { email, username, password } = req.body;

        if (!email || !username || !password) {
            return res.status(400).json({
                error: { message: 'Email, username, and password are required' }
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                error: { message: 'Invalid email format' }
            });
        }

        // Validate password (min 8 chars, at least 1 letter and 1 number)
        if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
            return res.status(400).json({
                error: { message: 'Password must be at least 8 characters with at least one letter and one number' }
            });
        }

        const db = getDb();

        // Check if email or username already exists
        const existingUser = db.prepare(
            'SELECT id FROM users WHERE email = ? OR username = ?'
        ).get(email.toLowerCase(), username);

        if (existingUser) {
            return res.status(409).json({
                error: { message: 'Email or username already exists' }
            });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Create user
        const result = db.prepare(`
            INSERT INTO users (email, username, password_hash)
            VALUES (?, ?, ?)
        `).run(email.toLowerCase(), username, passwordHash);

        const userId = result.lastInsertRowid;

        // Initialize category stats for the new user
        const categories = ['flags', 'capitals', 'maps', 'languages', 'trivia'];
        const insertCategoryStats = db.prepare(`
            INSERT INTO user_category_stats (user_id, category)
            VALUES (?, ?)
        `);

        for (const category of categories) {
            insertCategoryStats.run(userId, category);
        }

        // Generate tokens
        const accessToken = generateAccessToken(userId);
        const refreshToken = generateRefreshToken(userId);

        // Store refresh token
        storeRefreshToken(db, userId, refreshToken);

        // Set httpOnly cookie for refresh token
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });

        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: userId,
                email: email.toLowerCase(),
                username
            },
            accessToken
        });
    } catch (err) {
        next(err);
    }
});

/**
 * Login user.
 * POST /api/auth/login
 */
router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: { message: 'Email and password are required' }
            });
        }

        const db = getDb();

        // Find user
        const user = db.prepare(
            'SELECT * FROM users WHERE email = ?'
        ).get(email.toLowerCase());

        // Generic error message to prevent user enumeration
        const invalidCredentialsError = { error: { message: 'Invalid email or password' } };

        if (!user) {
            return res.status(401).json(invalidCredentialsError);
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json(invalidCredentialsError);
        }

        // Update last login
        db.prepare('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

        // Generate tokens
        const accessToken = generateAccessToken(user.id);
        const refreshToken = generateRefreshToken(user.id);

        // Store refresh token
        storeRefreshToken(db, user.id, refreshToken);

        // Set httpOnly cookie for refresh token
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });

        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                avatar_url: user.avatar_url,
                overall_xp: user.overall_xp,
                overall_level: user.overall_level,
                current_streak: user.current_streak
            },
            accessToken
        });
    } catch (err) {
        next(err);
    }
});

/**
 * Logout user.
 * POST /api/auth/logout
 */
router.post('/logout', authenticate, (req, res, next) => {
    try {
        const db = getDb();
        const refreshToken = req.cookies.refreshToken;

        if (refreshToken) {
            // Remove refresh token from database
            db.prepare('DELETE FROM refresh_tokens WHERE token = ?').run(refreshToken);
        }

        // Clear cookie
        res.clearCookie('refreshToken');

        res.json({ message: 'Logout successful' });
    } catch (err) {
        next(err);
    }
});

/**
 * Refresh access token.
 * POST /api/auth/refresh
 */
router.post('/refresh', (req, res, next) => {
    try {
        const refreshToken = req.cookies.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({
                error: { message: 'Refresh token required' }
            });
        }

        const db = getDb();

        // Verify refresh token exists and is valid
        const storedToken = db.prepare(
            'SELECT * FROM refresh_tokens WHERE token = ? AND expires_at > CURRENT_TIMESTAMP'
        ).get(refreshToken);

        if (!storedToken) {
            return res.status(401).json({
                error: { message: 'Invalid or expired refresh token' }
            });
        }

        // Verify JWT
        try {
            const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

            // Generate new access token
            const accessToken = generateAccessToken(decoded.userId);

            res.json({ accessToken });
        } catch {
            return res.status(401).json({
                error: { message: 'Invalid refresh token' }
            });
        }
    } catch (err) {
        next(err);
    }
});

/**
 * Get current user.
 * GET /api/auth/me
 */
router.get('/me', authenticate, (req, res, next) => {
    try {
        const db = getDb();

        const user = db.prepare(`
            SELECT id, email, username, avatar_url, created_at, is_guest,
                   overall_xp, overall_level, current_streak, longest_streak,
                   last_played_date, settings_json
            FROM users WHERE id = ?
        `).get(req.userId);

        if (!user) {
            return res.status(404).json({
                error: { message: 'User not found' }
            });
        }

        // Get category stats
        const categoryStats = db.prepare(`
            SELECT category, xp, level, games_played, total_correct, total_questions,
                   high_score, average_time_ms
            FROM user_category_stats WHERE user_id = ?
        `).all(req.userId);

        res.json({
            user: {
                ...user,
                settings: JSON.parse(user.settings_json || '{}'),
                categoryStats
            }
        });
    } catch (err) {
        next(err);
    }
});

/**
 * Request password reset.
 * POST /api/auth/forgot-password
 */
router.post('/forgot-password', (req, res, next) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                error: { message: 'Email is required' }
            });
        }

        // Always return success message to prevent email enumeration
        // In production, send actual reset email here

        res.json({
            message: 'If an account exists with that email, a password reset link has been sent'
        });
    } catch (err) {
        next(err);
    }
});

/**
 * Reset password with token.
 * POST /api/auth/reset-password
 */
router.post('/reset-password', async (req, res, next) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({
                error: { message: 'Token and new password are required' }
            });
        }

        // Validate password
        if (newPassword.length < 8 || !/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
            return res.status(400).json({
                error: { message: 'Password must be at least 8 characters with at least one letter and one number' }
            });
        }

        // In production, verify reset token and update password
        // For now, return success
        res.json({ message: 'Password reset successful' });
    } catch (err) {
        next(err);
    }
});

/**
 * Generate access token.
 *
 * @param {number} userId - The user ID
 * @returns {string} The access token
 */
function generateAccessToken(userId) {
    return jwt.sign(
        { userId },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );
}

/**
 * Generate refresh token.
 *
 * @param {number} userId - The user ID
 * @returns {string} The refresh token
 */
function generateRefreshToken(userId) {
    return jwt.sign(
        { userId, tokenId: uuidv4() },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
    );
}

/**
 * Store refresh token in database.
 *
 * @param {Database} db - The database instance
 * @param {number} userId - The user ID
 * @param {string} token - The refresh token
 */
function storeRefreshToken(db, userId, token) {
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    db.prepare(`
        INSERT INTO refresh_tokens (user_id, token, expires_at)
        VALUES (?, ?, ?)
    `).run(userId, token, expiresAt.toISOString());
}

export default router;
