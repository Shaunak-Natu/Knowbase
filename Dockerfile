# ── Stage 1: Build React client ───────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app/client

# Copy manifests first (better layer caching)
COPY client/package*.json ./

# Install ALL deps (including devDeps like vite) — no cache flags, clean network
RUN npm ci --legacy-peer-deps

# Copy source and build
COPY client/ ./

# Give Vite extra memory in case the server is low on RAM
RUN NODE_OPTIONS="--max-old-space-size=2048" npm run build


# ── Stage 2: Production server ────────────────────────────────────────────────
FROM node:20-alpine AS production

# dumb-init: proper PID-1 / signal handling
RUN apk add --no-cache dumb-init

WORKDIR /app

# Install server prod deps only
COPY package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps

# Copy server source
COPY server/ ./server/

# Copy built React SPA from builder stage
COPY --from=builder /app/client/dist ./client/dist

# Create volume mount points and fix ownership
RUN mkdir -p /app/data /app/uploads && \
    chown -R node:node /app

USER node

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server/index.js"]
