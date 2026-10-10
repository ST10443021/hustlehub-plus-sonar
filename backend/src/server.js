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
    'Run "npm run gen-cert" to generate the local certificate, then "npm run trust-cert" so browsers trust it.\n' +
    'The POE requires the API to be served over HTTPS - this app will not fall back to plain HTTP ' +
    '(Mozilla, 2026a; IIE, 2026b).'
  );
  process.exit(1);
}

// Browsers only show a padlock when the certificate was issued by a CA they trust, and
// "npm run gen-cert" is what creates that CA. An older plain self-signed certificate will
// always be labelled "Not secure" (Mozilla, 2026a; Cooper et al., 2008).
if (!fs.existsSync(path.join(path.dirname(certPath), 'rootCA.pem'))) {
  console.warn(
    'WARNING: certs/rootCA.pem is missing, so this is an old self-signed certificate that browsers will always\n' +
    'mark "Not secure". Run "npm run gen-cert" then "npm run trust-cert", and restart the browser.'
  );
}

// Node's native https module is bound directly (rather than http) so there is
// no accidental unencrypted fallback (Mozilla, 2026a; Node.js Foundation, n.d.).
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
    // eslint-disable-next-line no-console
    console.log('Browser says "Not secure"? Run "npm run gen-cert" then "npm run trust-cert" once, then fully restart the browser (Mozilla, 2026a).');
  });
}).catch(() => {
  console.error('MongoDB startup failed. Check MONGODB_URI and start MongoDB. The API has not started.');
  process.exit(1);
});
