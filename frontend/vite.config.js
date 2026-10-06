import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { securityHeaders } from './securityHeaders.js';
const proxy = { '/api': { target: 'https://localhost:5443', changeOrigin: true, secure: false } };
export default defineConfig({
  plugins: [react()],
  server: { proxy, headers: securityHeaders(true) },
  preview: { proxy, headers: securityHeaders(false) },
  test: { environment: 'jsdom', globals: true, setupFiles: './src/setupTests.js' },
});
