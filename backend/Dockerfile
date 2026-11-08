# HustleHub+ API image.
#
# Hardening choices (OWASP, 2024f; Docker, Inc., n.d.b):
#  - multi-stage build: only production dependencies reach the final image, so it is smaller and
#    has fewer packages for an attacker to abuse;
#  - the process runs as the unprivileged "node" user, not root;
#  - a HEALTHCHECK lets Docker and Docker Compose see whether the API is really serving requests;
#  - .dockerignore keeps .env files, private keys and tests out of the image;
#  - NO private key of any kind is created while the image is built. An earlier version ran the
#    certificate script at build time, which left the local CA's private key inside an image layer
#    (a secret that anyone with the image could extract and use to sign certificates the team's
#    machines trust). Certificates now come from the host (mounted read-only by Docker Compose, or a
#    CA-issued certificate in production) and the entrypoint only makes a throw-away certificate at
#    start-up when none is mounted (Mozilla, 2026a; Let's Encrypt, n.d.; Docker, Inc., n.d.d).
FROM node:25-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:25-alpine AS runner
ENV NODE_ENV=production
# openssl is needed only by scripts/generateCert.js, which the entrypoint runs when no certificate is mounted.
RUN apk add --no-cache openssl
WORKDIR /app
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node . .
# Strip Windows line endings from the entrypoint so it also runs when the repository was checked out on Windows.
RUN sed -i 's/\r$//' /app/docker-entrypoint.sh && mkdir -p logs certs && chown -R node:node logs certs
USER node
EXPOSE 5443
HEALTHCHECK --interval=15s --timeout=5s --start-period=25s --retries=5 \
  CMD node -e "require('https').get({host:'127.0.0.1',port:process.env.PORT||5443,path:'/health',rejectUnauthorized:false},r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"
# Run through "sh" so the script does not need the executable bit (a Windows checkout does not keep it).
ENTRYPOINT ["sh", "/app/docker-entrypoint.sh"]
