import { redirect } from 'next/navigation';
import { withServerCookies } from '@/lib/server-api';
import { api } from '@/lib/api';

export default async function SettingsPage() {
  const currentUser = await withServerCookies(() => api.me.get());

  // Redirect to appropriate settings page based on role
  if (currentUser.role === 'owner') {
    redirect('/settings/organization');
  } else {
    redirect('/settings/profile');
  }
}
