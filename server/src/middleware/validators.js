const { body, validationResult } = require('express-validator');
const userModel = require('../models/userModel');

/**
 * Runs after the rule chains below and turns any validation failures
 * into a single, consistent 400 response. Field-level details are safe
 * to return here because they describe the *client's* malformed input,
 * not internal system state.
 * Author: SYED MUHAMMAD HAMZA KAZMI - ST10443021
 */
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed.',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  return next();
}

// Registration input contract, following OWASP's allow-list-first approach to
// input validation (OWASP, 2024b).
// - email: normalised + syntactically validated (also mitigates header/log injection)
// - password: minimum strength policy (length + character classes) (OWASP, 2024a)
// - role: restricted to a fixed allow-list, never trusted blindly from the client (OWASP, 2021)
const registerValidationRules = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('A valid email address is required.')
    .normalizeEmail()
    .isLength({ max: 254 }).withMessage('Email is too long.'),

  body('password')
    .notEmpty().withMessage('Password is required.')
    .isLength({ min: 8, max: 128 }).withMessage('Password must be between 8 and 128 characters.')
    .matches(/[a-z]/).withMessage('Password must contain a lowercase letter.')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter.')
    .matches(/[0-9]/).withMessage('Password must contain a number.'),

  body('role')
    .optional()
    .trim()
    .isIn(userModel.VALID_ROLES).withMessage(`Role must be one of: ${userModel.VALID_ROLES.join(', ')}.`),

  handleValidationErrors,
];

const loginValidationRules = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('A valid email address is required.')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required.')
    .isLength({ max: 128 }).withMessage('Invalid credentials.'),

  handleValidationErrors,
];

module.exports = {
  registerValidationRules,
  loginValidationRules,
};
