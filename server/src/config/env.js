// Centralised, validated access to environment configuration.
// Failing fast here means the app never starts in a half-configured,
// insecure state (e.g. with a missing JWT secret) (Jones, Bradley & Sakimura, 2015),
// following Node.js's recommended pattern for environment-driven configuration
// (Node.js Foundation, n.d.).

// Author : SYED MUHAMMAD HAMZA KAZMI - ST10443021
require('dotenv').config();

const required = ['JWT_SECRET'];
const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  // eslint-disable-next-line no-console
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

module.exports = {
  port: parseInt(process.env.PORT, 10) || 5443,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  sslKeyPath: process.env.SSL_KEY_PATH || './certs/key.pem',
  sslCertPath: process.env.SSL_CERT_PATH || './certs/cert.pem',
  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12,
};
