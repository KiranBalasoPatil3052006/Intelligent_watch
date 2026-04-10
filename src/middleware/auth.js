/**
 * Auth middleware — Supports JWT tokens AND legacy X-User-Id header
 *
 * Priority:
 * 1. JWT Bearer token in Authorization header
 * 2. X-User-Id header
 * 3. userId in body or query
 *
 * If none found, falls back to 'default_user' so the app never crashes with 401
 */
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'intelligent_watch_secret_key_2024_production';

function authMiddleware(req, res, next) {
  let userId = null;

  // 1. Check for JWT Bearer token
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      userId = decoded.userId || decoded.email || decoded.id;
      req.userId = userId;
      req.user = decoded;
      return next();
    } catch (err) {
      // Token invalid — fall through to other methods
      console.warn('Invalid JWT token:', err.message);
    }
  }

  // 2. Check X-User-Id header
  userId = req.headers['x-user-id'];

  // 3. Check body or query
  if (!userId) {
    userId = req.body?.userId || req.query?.userId;
  }

  // 4. Fallback to default user (so app doesn't crash)
  if (!userId) {
    userId = 'default_user';
  }

  req.userId = userId;
  next();
}

/**
 * Strict auth — requires valid JWT or user ID (returns 401 if missing)
 */
function strictAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.userId = decoded.userId || decoded.email || decoded.id;
      req.user = decoded;
      return next();
    } catch (err) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid or expired token',
      });
    }
  }

  // Fallback to X-User-Id
  const userId = req.headers['x-user-id'] || req.body?.userId || req.query?.userId;
  if (!userId) {
    return res.status(401).json({
      status: 'error',
      message: 'Authentication required',
    });
  }

  req.userId = userId;
  next();
}

module.exports = authMiddleware;
module.exports.strict = strictAuth;
