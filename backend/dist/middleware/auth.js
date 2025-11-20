import { findById } from '../repositories/user.repository.js';
import { asyncHandler } from '../utils/async-handler.js';
import { verifyAccessToken } from '../utils/jwt.js';
const requireAuthHandler = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
        ? authHeader.split(' ')[1]
        : req.cookies?.accessToken;
    if (!token) {
        return res.status(401).json({ status: 'error', message: 'Authentication required' });
    }
    try {
        const payload = verifyAccessToken(token);
        const user = await findById(payload.sub);
        if (!user) {
            return res.status(401).json({ status: 'error', message: 'User not found' });
        }
        req.user = {
            id: user.userId,
            role: user.role,
            name: user.name,
            email: user.email
        };
        return next();
    }
    catch {
        return res.status(401).json({ status: 'error', message: 'Invalid token' });
    }
};
export const requireAuth = asyncHandler(requireAuthHandler);
export const requireRoles = (roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ status: 'error', message: 'Forbidden' });
        }
        return next();
    };
};
