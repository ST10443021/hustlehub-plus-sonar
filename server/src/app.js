const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xssClean = require('xss-clean');

const authRoutes = require('./routes/authRoutes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const config = require('./config/env');

const app = express();

// Trust the first proxy hop (relevant once deployed behind a reverse proxy / load balancer in Part 3).

//Author: MUZAMMIL CASSIM - ST10259792Author: MUZAMMIL CASSIM - ST10259792
app.set('trust proxy', 1);

// --- Security middleware stack ---
// Layered "defence in depth" pipeline, per OWASP's Top 10 guidance (OWASP, 2021).
app.use(helmet()); // sets secure HTTP headers (HSTS, X-Content-Type-Options, etc.) (OWASP, 2021)
app.use(cors({ origin: config.nodeEnv === 'production' ? [] : '*' })); // tightened per-environment (OWASP, 2021)
app.use(express.json({ limit: '10kb' })); // small body limit mitigates payload-based DoS (OWASP, 2021)
app.use(mongoSanitize()); // strips NoSQL operator injection payloads (forward-compatible with Part 2's MongoDB layer) (OWASP, 2024b; MongoDB, Inc., n.d.)
app.use(xssClean()); // sanitises user input against reflected XSS payloads (OWASP, 2024b)

// Global rate limiter (defence-in-depth on top of the stricter per-route limiter on auth endpoints) (OWASP, 2021).
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));

// Structured request logging (dev console; Part 3 wires this to a persistent log store)
// via Node.js's standard module ecosystem (Node.js Foundation, n.d.).
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));

// --- Routes ---
app.get('/health', (req, res) => res.status(200).json({ status: 'success', message: 'HustleHub+ API is running.' }));
app.use('/api/auth', authRoutes);

// --- Error handling (must be registered last) ---
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
