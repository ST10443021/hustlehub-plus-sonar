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

// The browser talks to Vite over HTTPS; Vite forwards /api to the HTTPS backend. `secure: false`
// only relaxes verification of this dev-only server-to-server hop (Vite, n.d.).
const proxy = { '/api': { target: 'https://localhost:5443', changeOrigin: true, secure: false } };
export default defineConfig({
  plugins: [react()],
  server: { https, proxy, headers: securityHeaders(true) },
  preview: { https, proxy, headers: securityHeaders(false) },
  test: { environment: 'jsdom', globals: true, setupFiles: './src/setupTests.js' },
});
