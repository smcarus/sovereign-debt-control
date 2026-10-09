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
RUN npm ci --legacy-peer-deps || npm install --legacy-peer-deps

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
RUN npm ci --omit=dev --legacy-peer-deps || npm install --omit=dev --legacy-peer-deps

# Copy built frontend assets from builder stage
COPY --chown=node:node --from=builder /app/dist ./dist

# Copy lightweight production static server script
COPY --chown=node:node docker-server.cjs ./server.cjs

# Non-root user for sovereign compliance & security isolation
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "server.cjs"]
