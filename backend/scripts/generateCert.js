// Generates the local HTTPS certificates used for development.
//
// Why two certificates: a lone self-signed certificate can never be trusted by a
// browser, so Chrome/Edge keep showing "Not secure" (Mozilla, 2026a). Instead this
// script makes a small local Certificate Authority (CA) and uses it to sign the
// localhost server certificate, the same approach used by the mkcert tool
// (Valsorda, n.d.). Once "npm run trust-cert" adds the CA to your computer, the
// padlock appears. The server certificate carries a Subject Alternative Name (SAN)
// because modern browsers ignore the Common Name when checking hostnames
// (Saint-Andre and Salz, 2023; Cooper et al., 2008).
//
// The files are created with OpenSSL (OpenSSL Project, n.d.), are for LOCAL
// DEVELOPMENT ONLY, and are git-ignored so private keys are never committed
// (OWASP, 2021). Production deployments use a certificate from a trusted
// CA such as Let's Encrypt instead (Let's Encrypt, n.d.).
//
// Usage: npm run gen-cert            (reuses an existing CA so trust stays valid)
//        npm run gen-cert -- --force (creates a brand-new CA and certificate)
/* eslint-disable security/detect-non-literal-fs-filename --
   Paths are fixed file names inside the repository's certs folder; the script takes no user input. */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const certsDir = path.resolve(__dirname, '..', 'certs');
const force = process.argv.includes('--force');
const caKey = path.join(certsDir, 'rootCA-key.pem');
const caCert = path.join(certsDir, 'rootCA.pem');
const caSerial = path.join(certsDir, 'rootCA.srl');
const keyPath = path.join(certsDir, 'key.pem');
const certPath = path.join(certsDir, 'cert.pem');
const csrPath = path.join(certsDir, 'server.csr');
const extPath = path.join(certsDir, 'server.ext');

// Hostnames/IPs the browser may use. "backend" is the Docker Compose service name.
const SAN = 'DNS:localhost,DNS:backend,IP:127.0.0.1,IP:::1';
const CA_NAME = 'HustleHub+ Local Development CA';

// execFileSync passes arguments directly (no shell), so paths cannot be injected (OWASP, 2021).
const openssl = (args) => execFileSync('openssl', args, { stdio: 'pipe' });

try {
  if (!fs.existsSync(certsDir)) fs.mkdirSync(certsDir, { recursive: true });

  if (force || !fs.existsSync(caKey) || !fs.existsSync(caCert)) {
    openssl([
      'req', '-x509', '-new', '-nodes', '-newkey', 'rsa:2048', '-sha256', '-days', '3650',
      '-keyout', caKey, '-out', caCert,
      // In an OpenSSL subject string "+" separates attributes, so a literal "+" must be escaped.
      '-subj', `/C=ZA/ST=Gauteng/L=Johannesburg/O=HustleHubPlus/OU=Local Development/CN=${CA_NAME.replace('+', '\\+')}`,
      '-addext', 'basicConstraints=critical,CA:TRUE',
      '-addext', 'keyUsage=critical,keyCertSign,cRLSign',
    ]);
    console.log(`Created local CA: ${caCert}`);
  } else {
    console.log(`Reusing existing local CA: ${caCert}`);
  }

  // Server certificate request, then signed by the local CA with the SAN extension.
  openssl(['req', '-new', '-nodes', '-newkey', 'rsa:2048', '-keyout', keyPath, '-out', csrPath,
    '-subj', '/C=ZA/ST=Gauteng/L=Johannesburg/O=HustleHubPlus/OU=Dev/CN=localhost']);
  fs.writeFileSync(extPath, [
    'authorityKeyIdentifier=keyid,issuer',
    'basicConstraints=critical,CA:FALSE',
    'keyUsage=critical,digitalSignature,keyEncipherment',
    'extendedKeyUsage=serverAuth',
    `subjectAltName=${SAN}`,
    '',
  ].join('\n'));
  openssl(['x509', '-req', '-in', csrPath, '-CA', caCert, '-CAkey', caKey, '-CAserial', caSerial, '-CAcreateserial',
    '-out', certPath, '-days', '825', '-sha256', '-extfile', extPath]);

  // Prove the chain is valid before telling the developer it worked.
  openssl(['verify', '-CAfile', caCert, certPath]);
  console.log(`Created server certificate: ${certPath}`);
  console.log('\nNext step - remove the "Not secure" warning by trusting the local CA:');
  console.log('  npm run trust-cert');
  console.log('Then fully close and reopen your browser.');
} catch (err) {
  console.error('Certificate generation failed. Ensure OpenSSL 1.1.1 or newer is installed and on your PATH.');
  if (err.stderr) console.error(String(err.stderr));
  process.exit(1);
} finally {
  for (const tmp of [csrPath, extPath]) { try { fs.unlinkSync(tmp); } catch (e) { /* already gone */ } }
}
