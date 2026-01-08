/**
 * Rate limiting middleware for API endpoints.
 * Uses in-memory storage for simplicity.
 */

// Store for rate limiting: IP/userId -> { count, resetTime }
const rateLimits = new Map();

// Default settings
const DEFAULT_WINDOW_MS = 1000; // 1 second
const DEFAULT_MAX_REQUESTS = 10; // 10 requests per second

/**
 * Clean up expired rate limit entries.
 */
function cleanup() {
    const now = Date.now();
    for (const [key, limit] of rateLimits) {
        if (now > limit.resetTime + 60000) {
            rateLimits.delete(key);
        }
    }
}

// Run cleanup every minute
setInterval(cleanup, 60000);

/**
 * Create a rate limiting middleware.
 *
 * @param {object} options - Rate limit options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Maximum requests per window
 * @param {string} options.message - Error message when rate limited
 * @param {function} options.keyGenerator - Function to generate rate limit key
 * @returns {function} Express middleware
 */
export function rateLimit(options = {}) {
    const {
        windowMs = DEFAULT_WINDOW_MS,
        max = DEFAULT_MAX_REQUESTS,
        message = 'Too many requests. Please slow down.',
        keyGenerator = (req) => req.userId || req.ip || 'anonymous'
    } = options;

    return (req, res, next) => {
        const key = keyGenerator(req);
        const now = Date.now();
        const limit = rateLimits.get(key);

        if (!limit || now > limit.resetTime) {
            // Start new window
            rateLimits.set(key, { count: 1, resetTime: now + windowMs });
            return next();
        }

        if (limit.count >= max) {
            return res.status(429).json({
                error: {
                    message,
                    retryAfter: Math.ceil((limit.resetTime - now) / 1000)
                }
            });
        }

        limit.count++;
        next();
    };
}

/**
 * Rate limiter specifically for game answer submissions.
 * More restrictive than general API rate limiting.
 */
export const gameAnswerRateLimit = rateLimit({
    windowMs: 1000, // 1 second window
    max: 5, // Max 5 answer submissions per second
    message: 'Too many answer submissions. Please slow down.',
    keyGenerator: (req) => `answer-${req.userId || req.ip}`
});

/**
 * Rate limiter for authentication endpoints.
 * Prevents brute force attacks.
 */
export const authRateLimit = rateLimit({
    windowMs: 60000, // 1 minute window
    max: 10, // Max 10 auth attempts per minute
    message: 'Too many authentication attempts. Please try again later.',
    keyGenerator: (req) => `auth-${req.ip}`
});

/**
 * Rate limiter for general API endpoints.
 */
export const apiRateLimit = rateLimit({
    windowMs: 1000, // 1 second window
    max: 20, // Max 20 requests per second
    message: 'Too many requests. Please slow down.',
    keyGenerator: (req) => `api-${req.userId || req.ip}`
});

export default rateLimit;
