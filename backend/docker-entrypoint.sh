#!/bin/sh
# Container entrypoint for the HustleHub+ API.
#
# Docker Compose mounts a locally trusted certificate at certs/key.pem and certs/cert.pem, and a real
# deployment would mount a CA-issued one there (Let's Encrypt, n.d.). If neither exists, for example
# when the image is started on its own for a demo, a throw-away certificate is generated HERE, at
# start-up, so no private key is ever stored in an image layer (OWASP, 2024f; Docker, Inc., n.d.d).
# The temporary CA key is deleted as soon as the server certificate has been signed.
set -e

if [ ! -s "${SSL_KEY_PATH:-./certs/key.pem}" ] || [ ! -s "${SSL_CERT_PATH:-./certs/cert.pem}" ]; then
  echo "No certificate is mounted; generating a throw-away certificate for this container (demo use only)."
  node scripts/generateCert.js > /dev/null
  rm -f certs/rootCA-key.pem certs/rootCA.srl
fi

# "exec" makes node PID 1, so docker stop (SIGTERM) reaches the server and the log buffer is flushed.
exec node src/server.js
