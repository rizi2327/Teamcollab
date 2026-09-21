# server/Dockerfile
# Simple single-stage build — this is a plain Node/Express API, no build step needed.

FROM node:18-alpine

WORKDIR /app

# Install dependencies first so Docker can cache this layer when only source changes
COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# Uploaded files (Feature 7.1) live here — mounted as a volume in docker-compose
# so they survive container restarts/rebuilds
RUN mkdir -p uploads/tasks

EXPOSE 5000

# Basic container-level health check hitting the /health endpoint from index.js
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "index.js"]