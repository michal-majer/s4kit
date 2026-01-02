# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install bun for faster installation
RUN npm install -g bun

# Build arguments for Next.js public env vars
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Copy package files
COPY package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/platform/frontend/package.json ./packages/platform/frontend/

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source files
COPY packages/shared ./packages/shared
COPY packages/platform/frontend ./packages/platform/frontend
COPY tsconfig.json ./

# Build the Next.js application
WORKDIR /app/packages/platform/frontend
RUN bun run build

# Production stage
FROM node:22-alpine AS runner

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder /app/packages/platform/frontend/.next/standalone ./
COPY --from=builder /app/packages/platform/frontend/.next/static ./packages/platform/frontend/.next/static
COPY --from=builder /app/packages/platform/frontend/public ./packages/platform/frontend/public

# Set ownership
RUN chown -R nextjs:nodejs /app

USER nextjs

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/ || exit 1

# Start the application
CMD ["node", "packages/platform/frontend/server.js"]
