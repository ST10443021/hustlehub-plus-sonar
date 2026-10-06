// CSP must be on the HTML document, not only the API's JSON responses.
export function securityHeaders(development = false) {
  const script = development ? "'self' 'unsafe-inline'" : "'self'";
  const connect = development ? "'self' ws://localhost:* ws://127.0.0.1:*" : "'self'";
  return {
    'Content-Security-Policy': `default-src 'self'; script-src ${script}; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src ${connect}; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  };
}
