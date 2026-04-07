/**
 * Extract userId from request
 * Simple auth - userId passed in headers or body
 */
function authMiddleware(req, res, next) {
  // Get userId from header first, then body
  const userId = req.headers['x-user-id'] || req.body?.userId || req.query?.userId;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'userId is required'
    });
  }

  // Attach userId to request
  req.userId = userId;
  next();
}

module.exports = authMiddleware;
