const { body, param, query, validationResult } = require('express-validator');
const userRepository = require('../repositories/userRepository');
const config = require('../config/env');

function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({
    status: 'error', message: 'Validation failed.',
    errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
  });
  return next();
}

function allowedFields(fields, requireChange = false) {
  return (req, res, next) => {
    const keys = Object.keys(req.body || {});
    if (keys.some((key) => !fields.includes(key))) return res.status(400).json({
      status: 'error', message: 'This request contains fields that cannot be changed.',
    });
    if (requireChange && keys.length === 0) return res.status(400).json({ status: 'error', message: 'Supply at least one gig detail to change.' });
    return next();
  };
}

function validId(value) {
  if (typeof value !== 'string') return false;
  const mongoId = /^[a-f0-9]{24}$/i.test(value);
  const testId = config.nodeEnv === 'test' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value);
  return mongoId || testId;
}

const registerValidationRules = [
  allowedFields(['email', 'password', 'role']),
  body('email').isString().withMessage('Email must be text.').bail().trim().isEmail().withMessage('Enter a valid email address.').normalizeEmail().isLength({ max: 254 }),
  body('password').isString().withMessage('Password must be text.').bail()
    .isLength({ min: 8, max: 72 }).withMessage('Password must be between 8 and 72 characters.')
    .custom((value) => Buffer.byteLength(value, 'utf8') <= 72).withMessage('Password is too long.')
    .matches(/[a-z]/).withMessage('Password needs a lowercase letter.')
    .matches(/[A-Z]/).withMessage('Password needs an uppercase letter.')
    .matches(/[0-9]/).withMessage('Password needs a number.'),
  body('role').optional().isString().bail().isIn(userRepository.PUBLIC_ROLES).withMessage('Choose client or freelancer.'),
  handleValidationErrors,
];
const loginValidationRules = [
  allowedFields(['email', 'password']),
  body('email').isString().bail().trim().isEmail().withMessage('Enter a valid email address.').normalizeEmail(),
  body('password').isString().bail().notEmpty().withMessage('Enter your password.').isLength({ max: 128 }),
  handleValidationErrors,
];
const textRule = (name, min, max, optional = false) => {
  let rule = body(name);
  if (optional) rule = rule.optional();
  // Global XSS sanitisation plus React's text rendering protects these strings.
  // HTML-escaping here would double-encode normal text every time it is edited.
  return rule.isString().withMessage(`${name} must be text.`).bail().trim()
    .isLength({ min, max }).withMessage(`${name} must be between ${min} and ${max} characters.`);
};
const priceRule = (optional = false) => {
  let rule = body('price');
  if (optional) rule = rule.optional();
  return rule.custom((value) => typeof value === 'number' || typeof value === 'string').withMessage('Enter a valid price.').bail()
    .notEmpty().withMessage('Price is required.').bail()
    .isFloat({ min: 0, max: 1000000 }).withMessage('Price must be between R0 and R1,000,000.').bail()
    .custom((value) => Math.abs(Number(value) * 100 - Math.round(Number(value) * 100)) < 0.000001)
    .withMessage('Price may have at most two decimal places.').toFloat();
};
const gigFields = ['title', 'description', 'category', 'price', 'isActive'];
const gigValidationRules = [
  allowedFields(gigFields.filter((f) => f !== 'isActive')),
  textRule('title', 3, 120), textRule('description', 10, 2000), textRule('category', 2, 60), priceRule(),
  handleValidationErrors,
];
const gigUpdateValidationRules = [
  allowedFields(gigFields, true),
  param('id').custom(validId).withMessage('Invalid gig ID.'),
  textRule('title', 3, 120, true), textRule('description', 10, 2000, true), textRule('category', 2, 60, true), priceRule(true),
  body('isActive').optional().isBoolean().withMessage('isActive must be true or false.').toBoolean(),
  handleValidationErrors,
];
const gigIdValidationRules = [param('id').custom(validId).withMessage('Invalid gig ID.'), handleValidationErrors];
const browseValidationRules = [query('category').optional().isString().bail().trim().isLength({ min: 2, max: 60 }).withMessage('Invalid category.'), handleValidationErrors];
const bookingValidationRules = [
  allowedFields(['gigId']), body('gigId').custom(validId).withMessage('Choose a valid gig.'), handleValidationErrors,
];
// ?limit= for the admin listings: a whole number from 1 to 200 (OWASP, 2024b).
const adminListQueryRules = [
  query('limit').optional().isInt({ min: 1, max: 200 }).withMessage('limit must be a whole number from 1 to 200.').toInt(),
  handleValidationErrors,
];

module.exports = { adminListQueryRules, registerValidationRules, loginValidationRules, gigValidationRules, gigUpdateValidationRules, gigIdValidationRules, browseValidationRules, bookingValidationRules };
