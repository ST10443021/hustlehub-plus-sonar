# HustleHub+ web image: builds the React app, then serves the static files with nginx.
#
# The final stage uses the unprivileged nginx image, so the web server runs as a non-root user and
# listens on ports above 1024 (8080 redirects to HTTPS on 8443). The Node.js toolchain never reaches
# the final image, which keeps the attack surface small (OWASP, 2024f; Docker, Inc., n.d.b).
FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.28-alpine AS runner
# The base image runs as the non-root "nginx" user, so switch to root only for the package upgrade.
# This picks up fixed nginx, OpenSSL and brotli packages even if the base tag has not been rebuilt yet.
USER root
RUN apk upgrade --no-cache
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
USER nginx
EXPOSE 8080 8443
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=5 \
  CMD wget -q --spider http://127.0.0.1:8080/healthz || exit 1