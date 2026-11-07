# HustleHub+ API image.
#
# Hardening choices (OWASP, 2024f; Docker, Inc., n.d.b):
#  - multi-stage build: only production dependencies reach the final image, so it is smaller and
#    has fewer packages for an attacker to abuse;
#  - the process runs as the unprivileged "node" user, not root;
#  - a HEALTHCHECK lets Docker and Docker Compose see whether the API is really serving requests;
#  - .dockerignore keeps .env files, private keys and tests out of the image.
FROM node:24-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:24-alpine AS runner
ENV NODE_ENV=production
# openssl is needed only for scripts/generateCert.js below.
RUN apk upgrade --no-cache \
    && apk add --no-cache openssl \
    && rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx
WORKDIR /app
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node . .
RUN mkdir -p logs certs && chown -R node:node logs certs
USER node
# TLS credentials are generated on the host (or CI runner) and mounted at runtime.
# Do not generate a private key in an image layer: every image consumer could extract it.
# The application and seed-admin commands use node directly; npm/npx are not needed at runtime.
EXPOSE 5443
HEALTHCHECK --interval=15s --timeout=5s --start-period=25s --retries=5 \
  CMD node -e "require('https').get({host:'127.0.0.1',port:process.env.PORT||5443,path:'/health',rejectUnauthorized:false},r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"
CMD ["node", "src/server.js"]
