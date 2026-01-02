import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { setServerCookies, clearServerCookies, AuthError } from './api';

/**
 * Helper to wrap server-side API calls with cookie forwarding.
 * Use this in server components to ensure authentication works.
 * Automatically redirects to login on 401 errors.
 *
 * @example
 * const systems = await withServerCookies(() => api.systems.list());
 */
export async function withServerCookies<T>(fn: () => Promise<T>): Promise<T> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll()
    .map(c => `${c.name}=${c.value}`)
    .join('; ');

  setServerCookies(cookieHeader);
  try {
    return await fn();
  } catch (error) {
    // Redirect to login on auth errors (e.g., session expired/revoked)
    if (error instanceof AuthError) {
      redirect('/login');
    }
    throw error;
  } finally {
    clearServerCookies();
  }
}

/**
 * Get the cookie header for manual API calls.
 * Use this when you need more control over the API call.
 */
export async function getServerCookieHeader(): Promise<string> {
  const cookieStore = await cookies();
  return cookieStore.getAll()
    .map(c => `${c.name}=${c.value}`)
    .join('; ');
}
