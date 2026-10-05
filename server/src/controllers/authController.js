const authService = require('../services/authService');

/**
 * Wraps an async Express handler so thrown errors (including rejected
 * promises from bcrypt/jwt) are forwarded to the centralised error
 * handler instead of crashing the process or leaking an unhandled
 * rejection stack trace to the client.
 * Author: BLAKE GODFREY - ST10435415
 */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const register = asyncHandler(async (req, res) => {
  const { email, password, role } = req.body;
  const user = await authService.registerUser({ email, password, role });

  res.status(201).json({
    status: 'success',
    message: 'User registered successfully.',
    data: { user },
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const { token, user } = await authService.loginUser({ email, password });

  res.status(200).json({
    status: 'success',
    message: 'Login successful.',
    data: { token, user },
  });
});

/** Example protected endpoint used to demonstrate JWT-guarded routes (Jones, Bradley & Sakimura, 2015). */
const getProfile = asyncHandler(async (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Token verified - protected resource accessed.',
    data: { user: req.user },
  });
});

module.exports = { register, login, getProfile };
