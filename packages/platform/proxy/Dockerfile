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

# Install curl for health checks
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Copy built application
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/packages/platform/proxy ./packages/platform/proxy
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/tsconfig.json ./

WORKDIR /app/packages/platform/proxy

# Set environment variables
ENV NODE_ENV=production
# Default to CF standard port 8080, can be overridden
ENV PORT=8080

# Expose port (CF uses 8080)
EXPOSE 8080

# Health check using PORT variable for CF compatibility
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:${PORT}/health/live || exit 1

# Start the application
CMD ["bun", "run", "src/index.ts"]
