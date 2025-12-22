import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/nav/sidebar';
import { AuthProvider } from '@/components/providers/auth-provider';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

async function getSession() {
  try {
    const cookieStore = await cookies();
    const headersList = await headers();

    // Forward cookies to the backend for session validation
    const cookieHeader = cookieStore.getAll()
      .map(c => `${c.name}=${c.value}`)
      .join('; ');

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

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session?.user) {
    redirect('/login');
  }

  // Get organization info - for now use a default if not set
  const organizationId = session.session?.activeOrganizationId || '';
  const organizationName = 'Default Organization'; // TODO: Fetch from API
  const userRole = 'owner'; // TODO: Fetch from membership

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
