const ResponseFormatter = require('../utils/responseFormatter');

/**
 * Global error handler middleware
 */
function errorHandler(err, req, res, next) {
  console.error('Error:', err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json(
      ResponseFormatter.error(messages.join(', '), 'VALIDATION_ERROR')
    );
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json(
      ResponseFormatter.error('Invalid ID format', 'INVALID_ID')
    );
  }

  // MongoDB duplicate key error
  if (err.code === 11000) {
    return res.status(409).json(
      ResponseFormatter.error('Duplicate entry', 'DUPLICATE_KEY')
    );
  }

  // Default error
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json(
    ResponseFormatter.error(message, err.code || 'SERVER_ERROR')
  );
}

module.exports = errorHandler;
