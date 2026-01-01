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

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, organization, membership] = await Promise.all([
    getSession(),
    getOrganization(),
    getCurrentUserMembership(),
  ]);

  if (!session?.user) {
    redirect('/login');
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
