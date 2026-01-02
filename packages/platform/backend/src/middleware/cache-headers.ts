import { createMiddleware } from 'hono/factory';

/**
 * Add cache headers for read endpoints
 * Uses stale-while-revalidate pattern for better UX
 */
export const cacheHeaders = (maxAge: number = 0, staleWhileRevalidate: number = 60) => {
  return createMiddleware(async (c, next) => {
    await next();

    // Only cache successful GET responses
    if (c.req.method !== 'GET' || c.res.status !== 200) {
      return;
    }

    // Don't override if already set
    if (c.res.headers.get('Cache-Control')) {
      return;
    }

    // Use private cache (user-specific data)
    c.res.headers.set(
      'Cache-Control',
      `private, max-age=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`
    );
  });
};

/**
 * Prevent caching for sensitive endpoints
 */
export const noCache = createMiddleware(async (c, next) => {
  await next();
  c.res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
});
