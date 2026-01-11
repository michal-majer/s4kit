import { createMiddleware } from 'hono/factory';

/**
 * Security headers middleware
 * Adds recommended security headers to all responses
 */
export const securityHeaders = createMiddleware(async (c, next) => {
  await next();

  // Prevent MIME type sniffing
  c.header('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking (less relevant for API, but good practice)
  c.header('X-Frame-Options', 'DENY');

  // Referrer policy - don't leak referrer to other origins
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');

  // HSTS - enforce HTTPS (only in production)
  if (process.env.NODE_ENV === 'production') {
    c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
});
