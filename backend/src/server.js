const fs = require('fs');
const https = require('https');
const path = require('path');
const app = require('./app');
const config = require('./config/env');
const { connectDB } = require('./config/db');

const keyPath = path.resolve(config.sslKeyPath);
const certPath = path.resolve(config.sslCertPath);

if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
  // eslint-disable-next-line no-console
  // Author: MUZAMMIL CASSIM - ST10259792
  console.error(
    `SSL certificate not found at "${keyPath}" / "${certPath}".\n` +
    'Run "npm run gen-cert" to generate a local self-signed certificate before starting the server.\n' +
    'The POE requires the API to be served over HTTPS - this app will not fall back to plain HTTP ' +
    '(Mozilla, 2026; IIE, 2026).'
  );
  process.exit(1);
}

// Node's native https module is bound directly (rather than http) so there is
// no accidental unencrypted fallback (Mozilla, 2026; Node.js Foundation, n.d.).
const httpsOptions = {
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath),
};

// Fail startup if MongoDB is unavailable; never accept non-persistent live writes.
connectDB().then(() => {
  https.createServer(httpsOptions, app).listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(`HustleHub+ API listening securely on https://localhost:${config.port}`);
    // eslint-disable-next-line no-console
    console.log(`Environment: ${config.nodeEnv}`);
  });
}).catch(() => {
  console.error('MongoDB startup failed. Check MONGODB_URI and start MongoDB. The API has not started.');
  process.exit(1);
});
