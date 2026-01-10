import { Router } from 'express';
import { getDb } from '../models/database.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '../middleware/auth.js';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-geo-elevate-2024';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-geo-elevate-2024';

/**
 * Register a new user.
 * POST /api/auth/register
 */
router.post('/register', async (req, res, next) => {
    try {
        const { email: rawEmail, username: rawUsername, password } = req.body;

        const email = rawEmail?.trim();
        const username = rawUsername?.trim();

        if (!email || !username || !password) {
            return res.status(400).json({
                error: { message: 'Email, username, and password are required' }
            });
        }

        if (username.length < 3) {
            return res.status(400).json({
                error: { message: 'Username must be at least 3 characters' }
            });
        }

        if (username.length > 20) {
            return res.status(400).json({
                error: { message: 'Username must be at most 20 characters' }
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                error: { message: 'Invalid email format' }
            });
        }

        if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
            return res.status(400).json({
                error: { message: 'Password must be at least 8 characters with at least one letter and one number' }
            });
        }

        const db = getDb();

        const existingUser = await db.prepare(
            'SELECT id FROM users WHERE email = ? OR username = ?'
        ).get(email.toLowerCase(), username);

        if (existingUser) {
            return res.status(409).json({
                error: { message: 'Email or username already exists' }
            });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const result = await db.prepare(`
            INSERT INTO users (email, username, password_hash)
            VALUES (?, ?, ?)
        `).run(email.toLowerCase(), username, passwordHash);

        const userId = result.lastInsertRowid;

        const categories = ['flags', 'capitals', 'maps', 'languages', 'trivia'];
        for (const category of categories) {
            await db.prepare(`
                INSERT INTO user_category_stats (user_id, category)
                VALUES (?, ?)
            `).run(userId, category);
        }

        const accessToken = generateAccessToken(userId);
        const refreshToken = generateRefreshToken(userId);

        await storeRefreshToken(db, userId, refreshToken);

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000
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

        const user = await db.prepare(
            'SELECT * FROM users WHERE email = ?'
        ).get(email.toLowerCase());

        const invalidCredentialsError = { error: { message: 'Invalid email or password' } };

        const dummyHash = '$2a$10$dummyhashdummyhashdummyhashdummyhashdummyhashdu';
        const passwordToCompare = user ? user.password_hash : dummyHash;

        const isValidPassword = await bcrypt.compare(password, passwordToCompare);

        if (!user || !isValidPassword) {
            return res.status(401).json(invalidCredentialsError);
        }

        await db.prepare('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

        const accessToken = generateAccessToken(user.id);
        const refreshToken = generateRefreshToken(user.id);

        await storeRefreshToken(db, user.id, refreshToken);

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000
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
router.post('/logout', authenticate, async (req, res, next) => {
    try {
        const db = getDb();
        const refreshToken = req.cookies.refreshToken;

        if (refreshToken) {
            await db.prepare('DELETE FROM refresh_tokens WHERE token = ?').run(refreshToken);
        }

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
router.post('/refresh', async (req, res, next) => {
    try {
        const refreshToken = req.cookies.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({
                error: { message: 'Refresh token required' }
            });
        }

        const db = getDb();

        const storedToken = await db.prepare(
            'SELECT * FROM refresh_tokens WHERE token = ? AND expires_at > CURRENT_TIMESTAMP'
        ).get(refreshToken);

        if (!storedToken) {
            return res.status(401).json({
                error: { message: 'Invalid or expired refresh token' }
            });
        }

        try {
            const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
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
router.get('/me', authenticate, async (req, res, next) => {
    try {
        const db = getDb();

        const user = await db.prepare(`
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

        const categoryStats = await db.prepare(`
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
router.post('/forgot-password', async (req, res, next) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                error: { message: 'Email is required' }
            });
        }

        const db = getDb();

        const user = await db.prepare(
            'SELECT id, email FROM users WHERE email = ?'
        ).get(email.toLowerCase());

        if (user) {
            const resetToken = uuidv4();
            const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

            await db.prepare(
                'UPDATE password_reset_tokens SET used = true WHERE user_id = ? AND used = false'
            ).run(user.id);

            await db.prepare(`
                INSERT INTO password_reset_tokens (user_id, token, expires_at)
                VALUES (?, ?, ?)
            `).run(user.id, resetToken, expiresAt.toISOString());

            const resetLink = `http://localhost:5174/reset-password?token=${resetToken}`;
            console.log('='.repeat(60));
            console.log('PASSWORD RESET LINK (Development Mode)');
            console.log(`Email: ${user.email}`);
            console.log(`Link: ${resetLink}`);
            console.log(`Expires: ${expiresAt.toISOString()}`);
            console.log('='.repeat(60));
        }

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

        if (newPassword.length < 8 || !/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
            return res.status(400).json({
                error: { message: 'Password must be at least 8 characters with at least one letter and one number' }
            });
        }

        const db = getDb();

        const resetToken = await db.prepare(`
            SELECT prt.*, u.email
            FROM password_reset_tokens prt
            JOIN users u ON u.id = prt.user_id
            WHERE prt.token = ?
            AND prt.used = false
            AND prt.expires_at > CURRENT_TIMESTAMP
        `).get(token);

        if (!resetToken) {
            return res.status(400).json({
                error: { message: 'Invalid or expired reset token' }
            });
        }

        const passwordHash = await bcrypt.hash(newPassword, 10);

        await db.prepare(
            'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        ).run(passwordHash, resetToken.user_id);

        await db.prepare(
            'UPDATE password_reset_tokens SET used = true WHERE id = ?'
        ).run(resetToken.id);

        await db.prepare(
            'DELETE FROM refresh_tokens WHERE user_id = ?'
        ).run(resetToken.user_id);

        console.log(`Password reset successful for user: ${resetToken.email}`);

        res.json({ message: 'Password reset successful. You can now login with your new password.' });
    } catch (err) {
        next(err);
    }
});

/**
 * Verify reset token validity.
 * GET /api/auth/verify-reset-token
 */
router.get('/verify-reset-token', async (req, res, next) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).json({
                error: { message: 'Token is required' }
            });
        }

        const db = getDb();

        const resetToken = await db.prepare(`
            SELECT prt.id, prt.expires_at, u.email
            FROM password_reset_tokens prt
            JOIN users u ON u.id = prt.user_id
            WHERE prt.token = ?
            AND prt.used = false
            AND prt.expires_at > CURRENT_TIMESTAMP
        `).get(token);

        if (!resetToken) {
            return res.status(400).json({
                valid: false,
                error: { message: 'Invalid or expired reset token' }
            });
        }

        res.json({
            valid: true,
            email: resetToken.email,
            expiresAt: resetToken.expires_at
        });
    } catch (err) {
        next(err);
    }
});

/**
 * Request email change.
 * POST /api/auth/change-email
 */
router.post('/change-email', authenticate, async (req, res, next) => {
    try {
        const { newEmail, password } = req.body;

        if (!newEmail || !password) {
            return res.status(400).json({
                error: { message: 'New email and current password are required' }
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newEmail)) {
            return res.status(400).json({
                error: { message: 'Invalid email format' }
            });
        }

        const db = getDb();

        const user = await db.prepare(
            'SELECT id, email, password_hash FROM users WHERE id = ?'
        ).get(req.userId);

        if (!user) {
            return res.status(404).json({
                error: { message: 'User not found' }
            });
        }

        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({
                error: { message: 'Current password is incorrect' }
            });
        }

        if (newEmail.toLowerCase() === user.email.toLowerCase()) {
            return res.status(400).json({
                error: { message: 'New email must be different from current email' }
            });
        }

        const existingEmail = await db.prepare(
            'SELECT id FROM users WHERE email = ? AND id != ?'
        ).get(newEmail.toLowerCase(), req.userId);

        if (existingEmail) {
            return res.status(409).json({
                error: { message: 'Email address is already in use' }
            });
        }

        const verificationToken = uuidv4();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await db.prepare(`
            UPDATE users
            SET pending_email = ?, pending_email_token = ?, pending_email_expires = ?
            WHERE id = ?
        `).run(newEmail.toLowerCase(), verificationToken, expiresAt.toISOString(), req.userId);

        const verificationLink = `http://localhost:5173/verify-email?token=${verificationToken}`;
        console.log('='.repeat(60));
        console.log('EMAIL CHANGE VERIFICATION LINK (Development Mode)');
        console.log(`Current Email: ${user.email}`);
        console.log(`New Email: ${newEmail.toLowerCase()}`);
        console.log(`Link: ${verificationLink}`);
        console.log(`Expires: ${expiresAt.toISOString()}`);
        console.log('='.repeat(60));

        res.json({
            message: 'Verification email sent. Please check your new email address to confirm the change.',
            pendingEmail: newEmail.toLowerCase()
        });
    } catch (err) {
        next(err);
    }
});

/**
 * Verify email change.
 * POST /api/auth/verify-email-change
 */
router.post('/verify-email-change', async (req, res, next) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({
                error: { message: 'Verification token is required' }
            });
        }

        const db = getDb();

        const user = await db.prepare(`
            SELECT id, email, pending_email, pending_email_token, pending_email_expires
            FROM users
            WHERE pending_email_token = ?
            AND pending_email_expires > CURRENT_TIMESTAMP
        `).get(token);

        if (!user || !user.pending_email) {
            return res.status(400).json({
                error: { message: 'Invalid or expired verification token' }
            });
        }

        await db.prepare(`
            UPDATE users
            SET email = ?, pending_email = NULL, pending_email_token = NULL, pending_email_expires = NULL, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(user.pending_email, user.id);

        console.log(`Email changed successfully: ${user.email} -> ${user.pending_email}`);

        res.json({
            message: 'Email changed successfully',
            newEmail: user.pending_email
        });
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
        JWT_SECRET,
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
        JWT_REFRESH_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
    );
}

/**
 * Store refresh token in database.
 *
 * @param {object} db - The database instance
 * @param {number} userId - The user ID
 * @param {string} token - The refresh token
 */
async function storeRefreshToken(db, userId, token) {
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await db.prepare(`
        INSERT INTO refresh_tokens (user_id, token, expires_at)
        VALUES (?, ?, ?)
    `).run(userId, token, expiresAt.toISOString());
}

export default router;
