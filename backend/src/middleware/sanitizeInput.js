// Input sanitiser: escapes "<" in every string of the request body and query string.
//
// This replaces the "xss-clean" package, which is no longer maintained and, because it serialised the
// whole body, also rewrote passwords that contained "<". Escaping "<" as
// "&lt;" means a stored value can never open an HTML element if it is ever rendered as markup by
// mistake (OWASP, 2024h).
//
// This is defence in depth, NOT the main cross-site-scripting control. The real controls are output
// encoding (React renders every value as text) and the Content Security Policy that forbids inline
// and third-party scripts (OWASP, 2024h; Mozilla, 2026b). Passwords are never altered, because they are
// hashed and must reach bcrypt exactly as typed (OWASP, 2024a).
const MAX_DEPTH = 8;
const UNTOUCHED_KEYS = new Set(['password']);

function clean(value, depth = 0) {
  if (typeof value === 'string') return value.replace(/</g, '&lt;');
  if (value === null || typeof value !== 'object') return value;
  // The API has no legitimately deep JSON, so anything nested deeper than MAX_DEPTH is discarded.
  if (depth >= MAX_DEPTH) return null;
  if (Array.isArray(value)) return value.map((item) => clean(item, depth + 1));
  // Object.fromEntries creates plain own properties, so a "__proto__" key cannot alter a prototype.
  return Object.fromEntries(
    Object.entries(value).map(([key, inner]) => [key, UNTOUCHED_KEYS.has(key) ? inner : clean(inner, depth + 1)])
  );
}

function sanitizeInput(req, res, next) {
  if (req.body && typeof req.body === 'object') req.body = clean(req.body);
  if (req.query && typeof req.query === 'object') req.query = clean(req.query);
  next();
}

module.exports = { sanitizeInput, clean };
