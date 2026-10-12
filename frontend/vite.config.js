import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { securityHeaders } from './securityHeaders.js';

// Serve the dev/preview pages over HTTPS with the same locally trusted certificate the
// API uses, so the browser shows a padlock instead of "Not secure". Vite's server.https
// takes the options object passed to https.createServer() (Vite, n.d.). Create the
// certificate with "npm run gen-cert" in backend/ (Valsorda, n.d.).
const certDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../backend/certs');
const keyFile = path.join(certDir, 'key.pem');
const certFile = path.join(certDir, 'cert.pem');
const https = fs.existsSync(keyFile) && fs.existsSync(certFile)
  ? { key: fs.readFileSync(keyFile), cert: fs.readFileSync(certFile) }
  : undefined;
if (!https && process.env.VITEST === undefined) {
  console.warn('No HTTPS certificate found in backend/certs - run "npm run gen-cert" there. Falling back to HTTP, which browsers label "Not secure".');
}

// The dev server forwards /api to the HTTPS backend, so the target port must match the backend's
// PORT. It is read from backend/.env (default 5443) so a changed PORT cannot silently break the
// proxy, and API_PROXY_TARGET overrides it, for example https://localhost:5000 (Vite, n.d.).
function backendTarget() {
  if (process.env.API_PROXY_TARGET) return process.env.API_PROXY_TARGET;
  let port = '5443';
  try {
    const match = fs.readFileSync(path.resolve(certDir, '../.env'), 'utf8').match(/^\s*PORT\s*=\s*(\d+)\s*$/m);
    if (match) port = match[1];
  } catch (err) { /* no .env yet: use the default port */ }
  return `https://localhost:${port}`;
}

// The browser talks to Vite over HTTPS; Vite forwards /api to the HTTPS backend. `secure: false`
// only relaxes verification of this dev-only server-to-server hop (Vite, n.d.).
const proxy = { '/api': { target: backendTarget(), changeOrigin: true, secure: false } };
export default defineConfig({
  plugins: [react()],
  server: { https, proxy, headers: securityHeaders(true) },
  preview: { https, proxy, headers: securityHeaders(false) },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.js',
    // Limit competing jsdom workers on slower development machines.
    maxWorkers: 2,
    testTimeout: 15000,
  },
});
