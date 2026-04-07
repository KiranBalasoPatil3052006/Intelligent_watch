const { body, validationResult } = require('express-validator');
const ResponseFormatter = require('../utils/responseFormatter');

/**
 * Validation middleware factory
 */
function validate(validations) {
  return async (req, res, next) => {
    for (const validation of validations) {
      const result = await validation.run(req);
      if (!result.isEmpty()) break;
    }

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    return res.status(400).json(
      ResponseFormatter.error(
        'Validation failed',
        'VALIDATION_ERROR',
        errors.array().map(e => ({ field: e.path, message: e.msg }))
      )
    );
  };
}

/**
 * Voice processing validations
 */
const voiceValidations = [
  body('userId').notEmpty().withMessage('userId is required'),
  body('text').notEmpty().withMessage('text is required')
];

/**
 * Task validations
 */
const taskValidations = [
  body('userId').notEmpty().withMessage('userId is required'),
  body('title').notEmpty().withMessage('title is required'),
  body('date').isISO8601().withMessage('date must be a valid ISO 8601 date')
];

/**
 * Health setting validations
 */
const healthValidations = [
  body('userId').notEmpty().withMessage('userId is required')
];

module.exports = {
  validate,
  voiceValidations,
  taskValidations,
  healthValidations
};
