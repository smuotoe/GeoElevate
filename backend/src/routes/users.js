import { Router } from 'express';
import { getDb } from '../models/database.js';
import { authenticate } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Avatar upload configuration
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const AVATARS_DIR = path.join(__dirname, '../../public/avatars');

/**
 * Get user by ID.
 * GET /api/users/:id
 */
router.get('/:id', authenticate, (req, res, next) => {
    try {
        const { id } = req.params;
        const db = getDb();

        const user = db.prepare(`
            SELECT id, username, avatar_url, overall_xp, overall_level,
                   current_streak, longest_streak, created_at, updated_at
            FROM users WHERE id = ?
        `).get(id);

        if (!user) {
            return res.status(404).json({
                error: { message: 'User not found' }
            });
        }

        res.json({ user });
    } catch (err) {
        next(err);
    }
});

/**
 * Update user.
 * PATCH /api/users/:id
 *
 * Supports optimistic concurrency control via `expected_updated_at` field.
 * If provided, the update will only succeed if the record hasn't been
 * modified since that timestamp.
 */
router.patch('/:id', authenticate, (req, res, next) => {
    try {
        const { id } = req.params;

        // Can only update own profile
        if (parseInt(id) !== req.userId) {
            return res.status(403).json({
                error: { message: 'Cannot update another user\'s profile' }
            });
        }

        const { username, avatar_url, expected_updated_at } = req.body;
        const db = getDb();

        // Check for concurrent modification if expected_updated_at is provided
        if (expected_updated_at) {
            const current = db.prepare(
                'SELECT updated_at FROM users WHERE id = ?'
            ).get(id);

            if (current && current.updated_at !== expected_updated_at) {
                return res.status(409).json({
                    error: {
                        message: 'This record has been modified by another user. Please refresh and try again.',
                        code: 'CONCURRENT_MODIFICATION',
                        current_updated_at: current.updated_at
                    }
                });
            }
        }

        const updates = [];
        const values = [];

        if (username) {
            updates.push('username = ?');
            values.push(username);
        }
        if (avatar_url) {
            updates.push('avatar_url = ?');
            values.push(avatar_url);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                error: { message: 'No fields to update' }
            });
        }

        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);

        db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);

        const user = db.prepare(
            'SELECT id, username, avatar_url, updated_at FROM users WHERE id = ?'
        ).get(id);

        res.json({ user });
    } catch (err) {
        next(err);
    }
});

/**
 * Delete user account.
 * DELETE /api/users/:id
 */
router.delete('/:id', authenticate, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { password } = req.body;

        // Can only delete own account
        if (parseInt(id) !== req.userId) {
            return res.status(403).json({
                error: { message: 'Cannot delete another user\'s account' }
            });
        }

        if (!password) {
            return res.status(400).json({
                error: { message: 'Password confirmation required' }
            });
        }

        const db = getDb();
        const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(id);

        if (!user) {
            return res.status(404).json({
                error: { message: 'User not found' }
            });
        }

        // Verify password
        const isValid = await bcrypt.compare(password, user.password_hash);

        if (!isValid) {
            return res.status(401).json({
                error: { message: 'Invalid password' }
            });
        }

        // Delete user (cascades to related tables)
        db.prepare('DELETE FROM users WHERE id = ?').run(id);

        res.json({ message: 'Account deleted successfully' });
    } catch (err) {
        next(err);
    }
});

/**
 * Get user stats.
 * GET /api/users/:id/stats
 */
router.get('/:id/stats', authenticate, (req, res, next) => {
    try {
        const { id } = req.params;
        const db = getDb();

        const stats = db.prepare(`
            SELECT category, xp, level, games_played, total_correct, total_questions,
                   high_score, average_time_ms
            FROM user_category_stats WHERE user_id = ?
        `).all(id);

        const overall = db.prepare(`
            SELECT overall_xp, overall_level, current_streak, longest_streak
            FROM users WHERE id = ?
        `).get(id);

        res.json({ stats, overall });
    } catch (err) {
        next(err);
    }
});

/**
 * Get user achievements.
 * GET /api/users/:id/achievements
 */
router.get('/:id/achievements', authenticate, (req, res, next) => {
    try {
        const { id } = req.params;
        const db = getDb();

        const achievements = db.prepare(`
            SELECT a.*, ua.progress, ua.unlocked_at
            FROM achievements a
            LEFT JOIN user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = ?
        `).all(id);

        res.json({ achievements });
    } catch (err) {
        next(err);
    }
});

/**
 * Get user game history.
 * GET /api/users/:id/game-history
 */
router.get('/:id/game-history', authenticate, (req, res, next) => {
    try {
        const { id } = req.params;
        const { limit = 20, offset = 0 } = req.query;
        const db = getDb();

        const games = db.prepare(`
            SELECT id, game_type, game_mode, score, xp_earned, correct_count,
                   total_questions, average_time_ms, started_at, completed_at,
                   difficulty_level, region_filter
            FROM game_sessions
            WHERE user_id = ?
            ORDER BY started_at DESC
            LIMIT ? OFFSET ?
        `).all(id, parseInt(limit), parseInt(offset));

        const total = db.prepare(
            'SELECT COUNT(*) as count FROM game_sessions WHERE user_id = ?'
        ).get(id);

        res.json({ games, total: total.count });
    } catch (err) {
        next(err);
    }
});

/**
 * Upload user avatar.
 * POST /api/users/:id/avatar
 * Expects multipart/form-data with 'avatar' field
 */
router.post('/:id/avatar', authenticate, async (req, res, next) => {
    try {
        const { id } = req.params;

        // Can only update own avatar
        if (parseInt(id) !== req.userId) {
            return res.status(403).json({
                error: { message: 'Cannot update another user\'s avatar' }
            });
        }

        // Check content type
        const contentType = req.headers['content-type'] || '';
        if (!contentType.includes('multipart/form-data')) {
            return res.status(400).json({
                error: { message: 'Content-Type must be multipart/form-data' }
            });
        }

        // Parse multipart data manually (simplified for base64 approach)
        // For production, use multer or busboy
        const chunks = [];
        let totalSize = 0;

        req.on('data', (chunk) => {
            totalSize += chunk.length;
            if (totalSize > MAX_FILE_SIZE) {
                req.destroy();
                return res.status(400).json({
                    error: { message: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` }
                });
            }
            chunks.push(chunk);
        });

        req.on('end', async () => {
            try {
                const body = Buffer.concat(chunks).toString();

                // Extract boundary from content-type
                const boundaryMatch = contentType.match(/boundary=(.+)/);
                if (!boundaryMatch) {
                    return res.status(400).json({
                        error: { message: 'Invalid multipart data' }
                    });
                }

                const boundary = boundaryMatch[1];
                const parts = body.split(`--${boundary}`);

                // Find the file part
                let fileData = null;
                let fileName = null;
                let mimeType = null;

                for (const part of parts) {
                    if (part.includes('filename=')) {
                        const nameMatch = part.match(/filename="([^"]+)"/);
                        const typeMatch = part.match(/Content-Type:\s*([^\r\n]+)/i);

                        if (nameMatch) fileName = nameMatch[1];
                        if (typeMatch) mimeType = typeMatch[1].trim();

                        // Extract binary data after headers
                        const headerEnd = part.indexOf('\r\n\r\n');
                        if (headerEnd !== -1) {
                            fileData = part.slice(headerEnd + 4);
                            // Remove trailing boundary markers
                            fileData = fileData.replace(/\r\n--$/, '').replace(/--\r\n$/, '').trim();
                        }
                        break;
                    }
                }

                if (!fileData || !fileName) {
                    return res.status(400).json({
                        error: { message: 'No file uploaded' }
                    });
                }

                // Validate file type
                if (!mimeType || !ALLOWED_TYPES.includes(mimeType)) {
                    return res.status(400).json({
                        error: { message: `Invalid file type. Allowed types: ${ALLOWED_TYPES.map(t => t.split('/')[1]).join(', ')}` }
                    });
                }

                // Ensure avatars directory exists
                if (!fs.existsSync(AVATARS_DIR)) {
                    fs.mkdirSync(AVATARS_DIR, { recursive: true });
                }

                // Generate unique filename
                const ext = mimeType.split('/')[1].replace('jpeg', 'jpg');
                const avatarFileName = `${id}_${Date.now()}.${ext}`;
                const avatarPath = path.join(AVATARS_DIR, avatarFileName);

                // Write file
                fs.writeFileSync(avatarPath, fileData, 'binary');

                // Update user's avatar_url in database
                const avatarUrl = `/avatars/${avatarFileName}`;
                const db = getDb();
                db.prepare('UPDATE users SET avatar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
                    .run(avatarUrl, id);

                res.json({
                    message: 'Avatar uploaded successfully',
                    avatar_url: avatarUrl
                });
            } catch (parseErr) {
                next(parseErr);
            }
        });

        req.on('error', (err) => {
            next(err);
        });
    } catch (err) {
        next(err);
    }
});

export default router;
