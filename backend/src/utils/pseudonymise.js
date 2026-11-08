// Turns an identifier such as an e-mail address into a short, stable pseudonym for the event log.
//
// Failed sign-ins used to be logged with the raw e-mail address. That is personal information under
// POPIA (Republic of South Africa, 2013), and people sometimes type a password into the e-mail box, so
// the raw value could leak a credential into the log (OWASP, 2024d). A keyed hash (HMAC-SHA-256) keeps
// the log useful, because the same address always gives the same pseudonym and repeated attempts can
// still be grouped, but the address itself cannot be read back or looked up with a precomputed table
// without the key (OWASP, 2024a). The key is derived from JWT_SECRET with a fixed label, so the signing
// secret itself is never used directly as an HMAC key for another purpose.
const crypto = require('crypto');
const config = require('../config/env');

let derivedKey = null;

function getKey() {
  if (!derivedKey) {
    derivedKey = crypto.createHmac('sha256', config.jwtSecret).update('hustlehub-log-pseudonym-v1').digest();
  }
  return derivedKey;
}

/** 16 hex characters (64 bits): enough to correlate events, far too short to be a usable credential. */
function pseudonymise(value) {
  return crypto.createHmac('sha256', getKey()).update(String(value).trim().toLowerCase()).digest('hex').slice(0, 16);
}

module.exports = { pseudonymise };
