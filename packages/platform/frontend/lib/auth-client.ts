import { createAuthClient } from 'better-auth/react';
import { organizationClient } from 'better-auth/client/plugins';

// Use proxy path for client-side requests to avoid cross-site cookie issues
// Requests to /backend/* are proxied to the actual backend via next.config.ts rewrites
// For SSR/build, use the direct backend URL
const getAuthBaseURL = () => {
  if (typeof window === 'undefined') {
    // Server-side: use direct backend URL
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  }
  // Client-side: use absolute URL with proxy path (better-auth requires absolute URL)
  return `${window.location.origin}/backend`;
};

export const authClient = createAuthClient({
  baseURL: getAuthBaseURL(),
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
