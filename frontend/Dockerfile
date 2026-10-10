# Builds the React app and serves the static output with a minimal, pinned
# nginx image - keeping the runtime image free of Node.js/npm entirely,
# which again reduces attack surface for the shipped container (OWASP, 2021).
FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

FROM nginx:1.27-alpine AS runner
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
# 80 only redirects to HTTPS on 443 (see nginx.conf; Mozilla, 2026a).
EXPOSE 80 443
