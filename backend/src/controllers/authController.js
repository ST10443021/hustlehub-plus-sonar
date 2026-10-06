const authService = require('../services/authService');
const { logEvent } = require('../utils/eventLogger');
const userRepository = require('../repositories/userRepository');

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
  logEvent('user_registered', { userId: user.id, role: user.role });

  res.status(201).json({
    status: 'success',
    message: 'User registered successfully.',
    data: { user },
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const { token, user } = await authService.loginUser({ email, password });
  logEvent('user_login', { userId: user.id, role: user.role });

  res.status(200).json({
    status: 'success',
    message: 'Login successful.',
    data: { token, user, expiresAt: require('jsonwebtoken').decode(token).exp * 1000 },
  });
});

/** Example protected endpoint used to demonstrate JWT-guarded routes (Jones, Bradley & Sakimura, 2015). */
const getProfile = asyncHandler(async (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Token verified - protected resource accessed.',
    data: { user: userRepository.toPublicUser(await userRepository.findById(req.user.id)), expiresAt: req.authExpiresAt },
  });
});

module.exports = { register, login, getProfile };
