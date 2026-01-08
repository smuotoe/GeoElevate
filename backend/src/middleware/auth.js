import jwt from 'jsonwebtoken';

// Default JWT secret for development
const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-geo-elevate-2024';

/**
 * Authentication middleware.
 * Verifies JWT token from Authorization header.
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 */
export function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            error: { message: 'Authentication required' }
        });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: { message: 'Token expired', code: 'TOKEN_EXPIRED' }
            });
        }
        return res.status(401).json({
            error: { message: 'Invalid token' }
        });
    }
}

/**
 * Optional authentication middleware.
 * Sets userId if valid token provided, but doesn't require it.
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 */
export function optionalAuthenticate(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        req.userId = null;
        return next();
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
    } catch {
        req.userId = null;
    }

    next();
}

export default { authenticate, optionalAuthenticate };
