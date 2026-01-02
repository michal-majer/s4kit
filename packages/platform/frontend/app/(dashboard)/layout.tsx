import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/nav/sidebar';
import { AuthProvider } from '@/components/providers/auth-provider';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

async function getCookieHeader() {
  const cookieStore = await cookies();
  return cookieStore.getAll()
    .map(c => `${c.name}=${c.value}`)
    .join('; ');
}

async function getSession() {
  try {
    const cookieHeader = await getCookieHeader();

    const res = await fetch(`${API_URL}/api/auth/get-session`, {
      headers: {
        Cookie: cookieHeader,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error('Failed to get session:', error);
    return null;
  }
}

async function getOrganization() {
  try {
    const cookieHeader = await getCookieHeader();

    const res = await fetch(`${API_URL}/admin/organization`, {
      headers: {
        Cookie: cookieHeader,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      return null;
    }

    return await res.json();
  } catch (error) {
    console.error('Failed to get organization:', error);
    return null;
  }
}

async function getCurrentUserMembership() {
  try {
    const cookieHeader = await getCookieHeader();

    const res = await fetch(`${API_URL}/admin/me`, {
      headers: {
        Cookie: cookieHeader,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      return null;
    }

    return await res.json();
  } catch (error) {
    console.error('Failed to get current user membership:', error);
    return null;
  }
}

async function getOnboardingStatus() {
  try {
    const cookieHeader = await getCookieHeader();

    const res = await fetch(`${API_URL}/admin/onboarding`, {
      headers: {
        Cookie: cookieHeader,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      // If we can't fetch onboarding status, assume complete to avoid blocking
      return { completed: true };
    }

    return await res.json();
  } catch (error) {
    console.error('Failed to get onboarding status:', error);
    // If we can't fetch onboarding status, assume complete to avoid blocking
    return { completed: true };
  }
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, organization, membership, onboarding] = await Promise.all([
    getSession(),
    getOrganization(),
    getCurrentUserMembership(),
    getOnboardingStatus(),
  ]);

  if (!session?.user) {
    redirect('/login');
  }

  // Check if user has no organization (invited user who hasn't accepted yet)
  if (!organization && !membership) {
    // User has no organization - they might have pending invitations
    redirect('/no-organization');
  }

  // Redirect to onboarding if not completed
  if (!onboarding?.completed) {
    redirect('/onboarding');
  }

  const organizationId = organization?.id || session.session?.activeOrganizationId || '';
  const organizationName = organization?.name || 'Organization';
  const userRole = membership?.role || 'developer';

  return (
    <AuthProvider
      user={session.user}
      organizationId={organizationId}
      organizationName={organizationName}
      userRole={userRole as 'owner' | 'admin' | 'developer'}
    >
      <div className="flex h-screen bg-muted/30">
        <Sidebar user={session.user} />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </AuthProvider>
  );
}
