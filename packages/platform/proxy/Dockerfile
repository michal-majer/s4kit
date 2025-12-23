# Build stage
FROM oven/bun:1.3 AS builder

WORKDIR /app

# Copy package files
COPY package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/platform/proxy/package.json ./packages/platform/proxy/

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source files
COPY packages/shared ./packages/shared
COPY packages/platform/proxy ./packages/platform/proxy
COPY tsconfig.json ./

# Build (if needed)
WORKDIR /app/packages/platform/proxy

# Production stage
FROM oven/bun:1.3-slim

WORKDIR /app

# Copy built application
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/packages/platform/proxy ./packages/platform/proxy
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/tsconfig.json ./

WORKDIR /app/packages/platform/proxy

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3002

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3002/health/ready || exit 1

# Start the application
CMD ["bun", "run", "src/index.ts"]
