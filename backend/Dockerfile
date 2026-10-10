# Multi-stage build keeps the final image to production dependencies only,
# which reduces both image size and attack surface (OWASP, 2021) - full
# containerisation lands in Part 3, but the backend is made container-ready
# from Part 2 onward so later work only has to wire up the compose stack.
FROM node:24-alpine AS base
WORKDIR /app
COPY package*.json ./

FROM base AS deps
RUN npm ci --omit=dev

FROM base AS runner
ENV NODE_ENV=production
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Bakes in a container-local self-signed certificate so the image is
# runnable standalone for local/demo purposes without a manual setup step;
# a real deployment would instead mount a CA-issued certificate at these
# same paths (Mozilla, 2026a) - see README for the production note.
RUN node scripts/generateCert.js
EXPOSE 5443
CMD ["node", "src/server.js"]
