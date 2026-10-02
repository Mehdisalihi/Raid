import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('🚨 FATAL: JWT_SECRET environment variable is not set. Please add it to your .env file.');
}

/**
 * Auth Middleware — Extracts userId from JWT token and attaches it to req.userId
 * All protected routes will have access to req.userId for data isolation.
 */
export default function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        if (!decoded?.userId) {
            return res.status(401).json({ error: 'Invalid token: missing userId' });
        }

        req.userId = decoded.userId;
        req.userRole = decoded.role;
        next();
    } catch {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

