// Adds the HustleHub+ local development CA to the operating system trust
// store so Chrome, Edge and Safari show a padlock for https://localhost
// instead of "Not secure" (Mozilla, 2026a). Browsers only trust a certificate
// whose issuing CA is in a store they use (Cooper et al., 2008). The CA only
// signs the localhost certificate made by "npm run gen-cert"; remove it with
// "npm run trust-cert -- --remove". Windows uses certutil (Microsoft, n.d.c).
// Arguments go straight to execFileSync with no shell, so paths cannot be
// injected (OWASP, 2021).
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const caCert = path.resolve(__dirname, '..', 'certs', 'rootCA.pem');
const remove = process.argv.includes('--remove');

if (!fs.existsSync(caCert)) {
  console.error('certs/rootCA.pem not found. Run "npm run gen-cert" first.');
  process.exit(1);
}

const run = (cmd, args) => execFileSync(cmd, args, { stdio: 'inherit' });

try {
  if (process.platform === 'win32') {
    // Current-user "Root" store: no administrator rights needed, but Windows
    // shows a confirmation dialog - choose Yes (Microsoft, n.d.c).
    if (remove) run('certutil', ['-user', '-delstore', 'Root', 'HustleHub+ Local Development CA']);
    else run('certutil', ['-user', '-addstore', '-f', 'Root', caCert]);
  } else if (process.platform === 'darwin') {
    const keychain = path.join(os.homedir(), 'Library', 'Keychains', 'login.keychain-db');
    if (remove) run('security', ['remove-trusted-cert', caCert]);
    else run('security', ['add-trusted-cert', '-r', 'trustRoot', '-k', keychain, caCert]);
  } else {
    console.log('Linux: browsers use their own certificate store. For Chrome/Edge run:');
    console.log(`  certutil -d sql:$HOME/.pki/nssdb -A -t "C,," -n "HustleHub+ Local Development CA" -i "${caCert}"`);
    console.log('(certutil comes from the libnss3-tools package.)');
    process.exit(0);
  }
  console.log(remove
    ? '\nLocal CA removed.'
    : '\nLocal CA trusted. Fully close and reopen your browser, then visit https://localhost:5443.');
  console.log('Firefox keeps its own store: set security.enterprise_roots.enabled to true in about:config, or import certs/rootCA.pem under Settings > Privacy & Security > Certificates.');
} catch (err) {
  console.error('Could not update the trust store automatically. Import certs/rootCA.pem manually (see README, "Removing the Not secure warning").');
  process.exit(1);
}
