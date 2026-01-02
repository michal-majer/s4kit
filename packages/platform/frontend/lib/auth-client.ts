import { createAuthClient } from 'better-auth/react';
import { organizationClient } from 'better-auth/client/plugins';

// Use proxy path to avoid cross-site cookie issues
// Requests to /backend/* are proxied to the actual backend via next.config.ts rewrites
const AUTH_BASE_URL = '/backend';

export const authClient = createAuthClient({
  baseURL: AUTH_BASE_URL,
  plugins: [organizationClient()],
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
} = authClient;

// Re-export for organization functionality
export const {
  organization,
  useActiveOrganization,
  useListOrganizations,
} = authClient;

// Helper to check if user is authenticated
export async function isAuthenticated(): Promise<boolean> {
  try {
    const result = await getSession();
    return !!result?.data?.user;
  } catch {
    return false;
  }
}
