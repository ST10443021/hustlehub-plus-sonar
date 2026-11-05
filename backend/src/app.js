const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const xssClean = require('xss-clean');

const authRoutes = require('./routes/authRoutes');
const gigRoutes = require('./routes/gigRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const incomeRoutes = require('./routes/incomeRoutes');
const adminRoutes = require('./routes/adminRoutes');
const { globalLimiter } = require('./middleware/rateLimiters');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const { requestLogger } = require('./utils/eventLogger');
const config = require('./config/env');
const path = require('path');
const fs = require('fs');

const app = express();

// Trust the first proxy hop (the nginx reverse proxy in the Docker Compose stack).
// Author: MUZAMMIL CASSIM - ST10259792
app.set('trust proxy', config.trustProxy);

// --- Security middleware stack ---
// Layered "defence in depth" pipeline, per OWASP's Top 10 guidance (OWASP, 2021).
app.use(
  helmet({
    // Explicit Content Security Policy, required for Part 2 (IIE, 2026b), configured
    // per Mozilla/MDN's CSP guidance (Mozilla, 2026b) and OWASP's recommendation to
    // default-deny and allow-list only what the application actually needs (OWASP, 2021).
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // 'unsafe-inline' only for the React build's injected styles
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginResourcePolicy: { policy: 'same-site' },
  })
); // sets secure HTTP headers (HSTS, X-Content-Type-Options, CSP, etc.) (OWASP, 2021)

// CORS is restricted to the known frontend origin(s) rather than left wildcard, since
// the frontend now sends an Authorization bearer token with cross-origin requests and
// a wildcard origin combined with credentials is an OWASP-flagged misconfiguration (OWASP, 2021).
app.use(cors({ origin: config.corsOrigins, credentials: false }));

app.use(express.json({ limit: '10kb' })); // small body limit mitigates payload-based DoS (OWASP, 2021)
app.use(mongoSanitize()); // strips NoSQL operator injection payloads, now directly relevant with MongoDB/Mongoose live (OWASP, 2024b; MongoDB, Inc., n.d.a)
app.use(xssClean()); // sanitises user input against reflected XSS payloads (OWASP, 2024b)

// Global rate limiter (defence-in-depth on top of the stricter per-route limiters on the
// auth and booking endpoints specifically named as "sensitive" in the POE brief) (OWASP, 2021; IIE, 2026b).
app.use(globalLimiter);

// Human-readable access log for the console; structured, searchable events come from requestLogger below.
// Health checks run every few seconds, so they are left out of the access log to keep it readable.
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev', { skip: (req) => req.path === '/health' || req.path === '/api/health' }));

// Request IDs and structured security/business events, also shipped to the cloud log platform
// when configured (IIE, 2026c; OWASP, 2024d).
app.use(requestLogger);

// --- Routes ---
const health = (req, res) => res.status(200).json({ status: 'success', message: 'HustleHub+ API is running.' });
app.get('/health', health);
app.get('/api/health', health); // also reachable through the nginx proxy, used by the CI pipeline and Docker checks
app.use('/api/auth', authRoutes);
app.use('/api/gigs', gigRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/income', incomeRoutes);
app.use('/api/admin', adminRoutes);

// Built React pages share the API's HTTPS origin and Helmet/CSP headers.
const frontendDist = path.resolve(__dirname, '../../frontend/dist');
if (config.nodeEnv !== 'test' && fs.existsSync(path.join(frontendDist, 'index.html'))) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path === '/api' || req.path.startsWith('/api/') || !req.accepts('html')) return next();
    return res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// --- Error handling (must be registered last) ---
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
