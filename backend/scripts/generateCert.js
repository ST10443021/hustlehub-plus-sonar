// Generates a local, self-signed SSL certificate for development HTTPS.
// so that TLS is enforced even in local/dev environments (Mozilla, 2026).
// NOT for production use - production deployments (Part 3) will use a
// certificate from a trusted CA (e.g. Let's Encrypt) behind the DevSecOps
// pipeline's reverse proxy / hosting provider.
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const certsDir = path.resolve(__dirname, '..', 'certs');
if (!fs.existsSync(certsDir)) fs.mkdirSync(certsDir, { recursive: true });

const keyPath = path.join(certsDir, 'key.pem');
const certPath = path.join(certsDir, 'cert.pem');

const cmd = `openssl req -x509 -newkey rsa:2048 -keyout "${keyPath}" -out "${certPath}" ` +
  `-days 365 -nodes -subj "/C=ZA/ST=Gauteng/L=Johannesburg/O=HustleHubPlus/OU=Dev/CN=localhost"`;

try {
  execSync(cmd, { stdio: 'inherit' });
  // eslint-disable-next-line no-console
  console.log(`\nSelf-signed certificate generated:\n  ${keyPath}\n  ${certPath}`);
} catch (err) {
  console.error('Certificate generation failed. Ensure OpenSSL is installed and on your PATH.');
  process.exit(1);
}
