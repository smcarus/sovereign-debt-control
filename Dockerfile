# syntax=docker/dockerfile:1
# -----------------------------------------------------------------------------
# Production Multi-Stage Dockerfile for Sovereign Fiscal & Debt Control Tower
# -----------------------------------------------------------------------------

# Stage 1: Build the React + TypeScript frontend bundle
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json* ./

# Install dependencies cleanly
RUN npm ci || npm install

# Copy application source code
COPY . .

# Build production assets
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 2: Production runtime server
# -----------------------------------------------------------------------------
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies only
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm install --omit=dev

# Copy built frontend assets from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts 2>/dev/null || true

# Copy lightweight production static server script
COPY docker-server.cjs ./server.cjs

# Non-root user for sovereign compliance & security isolation
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "server.cjs"]
