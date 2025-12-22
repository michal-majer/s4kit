import { createAuthClient } from 'better-auth/react';
import { organizationClient } from 'better-auth/client/plugins';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const authClient = createAuthClient({
  baseURL: API_URL,
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
